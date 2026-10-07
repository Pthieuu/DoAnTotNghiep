import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { evaluateAnswer } from "@/lib/interview-evaluation";

type Question = { text: string; translation: string; focus?: string };
type AnswerRow = { question_index: number; answer: string; score?: number };

export const maxDuration = 60; // Allow enough time for AI evaluation

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { questionIndex?: unknown; answer?: unknown } | null;
  const questionIndex = body?.questionIndex;
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (!body || !Number.isInteger(questionIndex) || (questionIndex as number) < 0 || !answer || answer.length > 10000) {
    return json({ error: "Câu trả lời không hợp lệ. Nội dung cần có từ 1 đến 10.000 ký tự." }, 400);
  }
  const index = questionIndex as number;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập để lưu câu trả lời." }, 401);

    const { data: session, error: sessionError } = await supabase.from("interview_sessions")
      .select("id,status,questions,cv_snapshot,interview_type,question_count")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (sessionError) return json({ error: "Không thể tải buổi phỏng vấn." }, 500);
    if (!session || !Array.isArray(session.questions)) return json({ error: "Không tìm thấy buổi phỏng vấn." }, 404);
    const questions = session.questions as Question[];
    if (index >= questions.length) return json({ error: "Câu hỏi này không tồn tại trong buổi phỏng vấn." }, 400);

    const { data: previousAnswers, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer,score")
      .eq("session_id", id)
      .order("question_index", { ascending: true });
    if (answersError) {
      return json({ error: "Không thể tải các câu trả lời đã lưu." }, 500);
    }
    const answers = (previousAnswers || []) as AnswerRow[];
    const existing = answers.find((item) => item.question_index === index);
    if (index < answers.length) {
      if (!existing || existing.answer !== answer) return json({ error: "Câu trả lời này đã được gửi. Hãy tiếp tục với câu hỏi hiện tại." }, 409);
      if (session.status === "completed") return json({ completed: true, answeredCount: questions.length });
      return json({ error: "Câu trả lời này đã được lưu. Hãy tải lại trang để tiếp tục với câu hỏi hiện tại." }, 409);
    } else if (index !== answers.length) {
      return json({ error: "Hãy trả lời các câu hỏi theo thứ tự trong buổi phỏng vấn." }, 409);
    } else {
      if (session.status !== "in_progress") return json({ error: "Buổi phỏng vấn này đã kết thúc." }, 409);
      
      // AI Evaluation
      const cvText = session.cv_snapshot ? JSON.stringify(session.cv_snapshot) : "";
      const interviewType = session.interview_type || "mixed";
      const currentQuestion = questions[index];
      const questionType = currentQuestion.focus || "behavioral";
      
      let evaluationResult;
      try {
        evaluationResult = await evaluateAnswer({
          cvText,
          interviewType,
          question: currentQuestion.text,
          questionType,
          userAnswer: answer,
          questionIndex: index,
          totalQuestions: session.question_count || questions.length
        });
      } catch (evalError) {
        console.error("Evaluation failed", evalError);
        // Fallback or bubble up error
        return json({ error: evalError instanceof Error ? evalError.message : "Lỗi chấm điểm AI." }, 500);
      }

      const { error: insertError } = await supabase.from("interview_answers").insert({ 
        session_id: id, 
        question_index: index, 
        answer,
        score: evaluationResult.score,
        feedback: evaluationResult.feedback,
        suggestion: evaluationResult.suggestion,
        question_text: currentQuestion.text,
        question_type: questionType
      });
      if (insertError) {
        console.error("Interview answer save failed", { code: insertError.code, message: insertError.message });
        return json({ error: "Không lưu được câu trả lời. Hãy thử gửi lại." }, 500);
      }
    }

    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      // It was the last question, wait! The PRD says "API /summary -> AI tổng kết toàn bộ session"
      // We should probably just mark it as completed here, and the summary will be calculated later or fetched.
      // But we can do it asynchronously or right here.
      
      // Let's just update the status to completed for now.
      const { error: completeError } = await supabase.from("interview_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id).eq("user_id", user.id).eq("status", "in_progress")
        .select("id").maybeSingle();
      if (completeError) return json({ error: "Câu trả lời đã được lưu, nhưng không thể kết thúc buổi phỏng vấn. Hãy tải lại trang." }, 500);
      return json({ completed: true, answeredCount: questions.length });
    }

    const nextQuestion = questions[nextIndex];
    return json({ completed: false, answeredCount: nextIndex, nextQuestion: { text: nextQuestion.text, translation: nextQuestion.translation } });
  } catch (err) {
    console.error("API Answers Error:", err);
    return json({ error: "Dịch vụ câu trả lời tạm thời không khả dụng." }, 503);
  }
}
