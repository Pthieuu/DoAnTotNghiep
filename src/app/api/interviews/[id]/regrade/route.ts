import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { evaluateAnswer } from "@/lib/interview-evaluation";
import { querySessionWithPractice } from "@/lib/interview-session-query";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GeminiUnavailableError } from "@/lib/gemini-retry";

type Question = { text: string; focus?: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { questionIndex?: unknown } | null;
  if (!body || !Number.isInteger(body.questionIndex) || (body.questionIndex as number) < 0) return json({ error: "Invalid question index." }, 400);
  const index = body.questionIndex as number;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in." }, 401);
    const { data: session, error: sessionError } = await querySessionWithPractice(
      columns => supabase.from("interview_sessions").select(columns).eq("id", id).eq("user_id", user.id).maybeSingle(),
      "id,questions,cv_snapshot,interview_type,question_count,target_role,job_description,interview_language",
    );
    if (sessionError || !session || !Array.isArray(session.questions)) return json({ error: "Interview session not found." }, 404);
    const question = (session.questions as Question[])[index];
    if (!question?.text) return json({ error: "Question not found." }, 404);
    const { data: answer, error: answerError } = await supabase.from("interview_answers")
      .select("answer,score,rubric_json").eq("session_id", id).eq("question_index", index).maybeSingle();
    if (answerError || !answer) return json({ error: "Saved answer not found." }, 404);
    if (answer.score !== null) {
      return json({ error: "This answer already has a grade." }, 409);
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      console.error("Interview regrade configuration missing", { sessionId: id, missingServiceKey: !serviceKey, missingSupabaseUrl: !supabaseUrl });
      return json({ error: "Chức năng chấm lại chưa được cấu hình: thiếu SUPABASE_SERVICE_ROLE_KEY trên server." }, 503);
    }
    const graded = await evaluateAnswer({
      cvText: session.cv_snapshot ? JSON.stringify(session.cv_snapshot) : "",
      targetRole: session.target_role, jobDescription: session.job_description,
      language: session.interview_language || "ja", interviewType: session.interview_type || "mixed",
      question: question.text, questionType: question.focus || "behavioral",
      userAnswer: answer.answer, questionIndex: index,
      totalQuestions: session.question_count || session.questions.length,
    });
    if (!graded.rubric) return json({ error: "AI still could not produce a valid grade. Please try again later." }, 503);
    const admin = createAdminClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: saved, error: saveError } = await admin.rpc("save_regraded_interview_answer", {
      p_session_id: id, p_question_index: index, p_expected_answer: answer.answer,
      p_score: graded.score, p_rubric: graded.rubric, p_feedback: graded.feedback, p_suggestion: graded.suggestion,
    });
    if (saveError) {
      console.error("Interview regrade save failed", { sessionId: id, questionIndex: index, code: saveError.code, message: saveError.message });
      return json({ error: "Could not save the new grade. Check that the regrade migration was applied." }, 500);
    }
    if (saved !== true) {
      const { data: current, error: currentError } = await supabase.from("interview_answers")
        .select("answer,score,rubric_json").eq("session_id", id).eq("question_index", index).maybeSingle();
      if (currentError || !current || current.answer !== answer.answer || current.score !== null) {
        return json({ error: "This answer changed or was graded by another request. Reload the page." }, 409);
      }
      // Older deployments may still have the first version of the RPC, which
      // rejects unscored rows containing a valid but incomplete rubric.
      console.warn("Regrade RPC rejected an unchanged unscored answer", {
        sessionId: id, questionIndex: index, hasRubric: current.rubric_json !== null,
      });
      return json({ error: "Database chưa cập nhật quy tắc chấm lại. Hãy áp dụng migration 202611260002_retry_all_unscored_answers.sql rồi thử lại." }, 409);
    }
    return json({ score: graded.score, rubric: graded.rubric });
  } catch (error) {
    console.error("Interview regrade failed", { sessionId: id, questionIndex: index, error: error instanceof Error ? error.message : "unknown" });
    if (error instanceof GeminiUnavailableError) return json({ error: error.message }, 503);
    if (error instanceof Error && error.message === "AI đang giới hạn yêu cầu. Đợi một chút rồi thử lại.") {
      return json({ error: error.message }, 429);
    }
    return json({ error: "Could not regrade this answer. Please try again later." }, 503);
  }
}
