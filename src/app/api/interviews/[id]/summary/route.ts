import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { generateSummary, type SummaryResult } from "@/lib/interview-summary";

import type { RubricResult } from "@/lib/interview-rubric";
import { getWeaknessPracticeSession } from "@/lib/weakness-practice";
import { calculateWeaknessPracticeProgress, type PracticeProgressAnswer } from "@/lib/weakness-practice-progress";
import { querySessionWithPractice } from "@/lib/interview-session-query";

type Question = { text: string; translation: string; focus?: string };
type AnswerRow = { question_index: number; answer: string; score: number | null; rubric_json: RubricResult | null; feedback: string };

export const maxDuration = 80;

function toProgressAnswers(rows: Pick<AnswerRow, "question_index" | "answer" | "rubric_json">[], questionList: unknown): PracticeProgressAnswer[] {
  const questions: unknown[] = Array.isArray(questionList) ? questionList : [];
  return rows.map(row => {
    const question = questions[row.question_index];
    const hasQuestion = question && typeof question === "object" && "text" in question
      && typeof question.text === "string" && question.text.trim();
    return {
      questionIndex: row.question_index,
      answer: hasQuestion && typeof row.answer === "string" ? row.answer : "",
      rubric: row.rubric_json,
    };
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;

  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập để xem tổng kết." }, 401);

    const { data: session, error: sessionError } = await querySessionWithPractice(
      columns => supabase.from("interview_sessions").select(columns)
        .eq("id", id).eq("user_id", user.id).maybeSingle(),
      "id,status,questions,title,interview_type,interview_language,level,target_role,job_description,question_count,summary_json",
    );

    if (sessionError) return json({ error: "Không thể tải buổi phỏng vấn." }, 500);
    if (!session || !Array.isArray(session.questions)) return json({ error: "Không tìm thấy buổi phỏng vấn." }, 404);

    if (session.status !== "completed") {
      return json({ error: "Buổi phỏng vấn chưa kết thúc." }, 400);
    }

    const practice = getWeaknessPracticeSession(session.source_session_id, session.selected_criteria);
    if (session.source_session_id && !practice) return json({ error: "Mục tiêu phiên luyện tập không hợp lệ." }, 409);
    if (session.summary_json && !practice) return json({ summary: session.summary_json }, 200);

    const { data: previousAnswers, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer,score,feedback,rubric_json")
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

    if (answers.some(answer => !Number.isInteger(answer.question_index) || answer.question_index < 0
      || typeof questions[answer.question_index]?.text !== "string" || !questions[answer.question_index].text.trim())) {
      return json({ error: "Dữ liệu câu hỏi và câu trả lời không khớp." }, 500);
    }

    let practiceProgress: SummaryResult["practiceProgress"];
    if (practice) {
      const { data: source, error: sourceError } = await supabase.from("interview_sessions")
        .select("id,status,questions,interview_type,interview_language,level,target_role,job_description,title")
        .eq("id", practice.sourceSessionId).eq("user_id", user.id).maybeSingle();
      if (sourceError) return json({ error: "Không thể tải phiên nguồn để so sánh." }, 500);
      if (!source) return json({ error: "Không tìm thấy phiên nguồn để so sánh." }, 404);
      const { data: sourceAnswers, error: sourceAnswersError } = await supabase.from("interview_answers")
        .select("question_index,answer,rubric_json")
        .eq("session_id", source.id).order("question_index", { ascending: true });
      if (sourceAnswersError) return json({ error: "Không thể tải câu trả lời phiên nguồn để so sánh." }, 500);

      practiceProgress = calculateWeaknessPracticeProgress({
        sourceSessionId: source.id,
        selectedCriteria: practice.selectedCriteria,
        sourceAnswers: toProgressAnswers(sourceAnswers ?? [], source.questions),
        practiceAnswers: toProgressAnswers(answers, questions),
        scopeMatches: source.status === "completed"
          && ["ja", "vi"].includes(source.interview_language)
          && ["N5", "N4", "N3", "N2", "N1"].includes(source.level)
          && ["technical", "behavioral", "mixed"].includes(source.interview_type)
          && source.interview_language === session.interview_language
          && source.level === session.level
          && source.interview_type === session.interview_type
          && source.job_description === session.job_description
          && (source.target_role || source.title) === (session.target_role || session.title),
      });
    }

    const answersInput = answers.map((a) => {
      const q = questions[a.question_index];
      return {
        question: q.text,
        question_type: q.focus || "behavioral",
        answer: a.answer,
        score: a.score,
        rubric: a.rubric_json,
        feedback: a.feedback,
        ...(answers.length < questions.length ? { questionNumber: a.question_index + 1 } : {})
      };
    });

    let summaryResult: SummaryResult | null = session.summary_json;
    if (!summaryResult) {
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
    }
    if (practiceProgress) summaryResult = { ...summaryResult, practiceProgress };
    if (answers.length < questions.length) {
      summaryResult = {
        ...summaryResult,
        provisional: true,
        grade: "Chưa xếp loại",
        completionScope: {
          answeredCount: answers.length,
          plannedCount: questions.length,
          questionNumbers: answers.map(answer => answer.question_index + 1),
        },
      };
    }

    const overallScore = summaryResult.totalScore === null || summaryResult.provisional ? null : Math.round(summaryResult.totalScore);
    const { error: updateError } = await supabase.from("interview_sessions")
      .update({
        summary_json: summaryResult,
        score: overallScore
      })
      .eq("id", id).eq("user_id", user.id);

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
