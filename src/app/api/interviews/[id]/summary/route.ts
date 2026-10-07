import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { generateSummary, type SummaryResult } from "@/lib/interview-summary";

type Question = { text: string; translation: string; focus?: string };
type AnswerRow = { question_index: number; answer: string; score: number; feedback: string };

export const maxDuration = 80;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;

  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập để xem tổng kết." }, 401);

    const { data: session, error: sessionError } = await supabase.from("interview_sessions")
      .select("id,status,questions,title,interview_type,question_count,summary_json")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    
    if (sessionError) return json({ error: "Không thể tải buổi phỏng vấn." }, 500);
    if (!session || !Array.isArray(session.questions)) return json({ error: "Không tìm thấy buổi phỏng vấn." }, 404);
    
    // If it's already summarized, return it.
    if (session.summary_json) {
      return json({ summary: session.summary_json }, 200);
    }

    if (session.status !== "completed") {
      return json({ error: "Buổi phỏng vấn chưa kết thúc." }, 400);
    }

    const { data: previousAnswers, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer,score,feedback")
      .eq("session_id", id)
      .order("question_index", { ascending: true });
      
    if (answersError) {
      return json({ error: "Không thể tải dữ liệu câu trả lời." }, 500);
    }
    
    const answers = (previousAnswers || []) as AnswerRow[];
    const questions = session.questions as Question[];

    if (answers.length === 0) {
      return json({ error: "Không có câu trả lời nào để tổng kết." }, 400);
    }

    // Prepare data for summary generation
    const answersInput = answers.map((a) => {
      const q = questions[a.question_index];
      return {
        question: q.text,
        question_type: q.focus || "behavioral",
        answer: a.answer,
        score: a.score,
        feedback: a.feedback
      };
    });

    let summaryResult: SummaryResult;
    try {
      summaryResult = await generateSummary({
        sessionTitle: session.title,
        interviewType: session.interview_type || "mixed",
        totalQuestions: session.question_count || questions.length,
        answers: answersInput
      });
    } catch (err) {
      console.error("Summary generation failed", err);
      return json({ error: err instanceof Error ? err.message : "Lỗi tổng kết AI." }, 500);
    }

    // Save summary to database
    // Note: the original score column expects integer 0-100.
    const overallScore = Math.round(summaryResult.totalScore);
    const { error: updateError } = await supabase.from("interview_sessions")
      .update({ 
        summary_json: summaryResult,
        score: overallScore
      })
      .eq("id", id);
      
    if (updateError) {
      console.error("Interview summary save failed", { code: updateError.code, message: updateError.message });
      return json({ error: "Không lưu được bản tổng kết. Vui lòng thử lại." }, 500);
    }

    return json({ summary: summaryResult }, 200);
  } catch (err) {
    console.error("API Summary Error:", err);
    return json({ error: "Dịch vụ tổng kết tạm thời không khả dụng." }, 503);
  }
}
