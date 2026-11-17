import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { evaluateAnswer } from "@/lib/interview-evaluation";
import { GeminiUnavailableError } from "@/lib/gemini-retry";
import { getWeaknessPracticeSession } from "@/lib/weakness-practice";
import { querySessionWithPractice } from "@/lib/interview-session-query";

type Question = { text: string; translation: string; focus?: string };
type AnswerRow = { question_index: number; answer: string; score?: number };

export const maxDuration = 150; // Allow enough time for AI evaluation

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { questionIndex?: unknown; answer?: unknown } | null;
  const questionIndex = body?.questionIndex;
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (!body || !Number.isInteger(questionIndex) || (questionIndex as number) < 0 || !answer || answer.length > 10000) {
    return json({ error: "Invalid answer. Content must be between 1 and 10,000 characters." }, 400);
  }
  const index = questionIndex as number;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to save answer." }, 401);

    const { data: session, error: sessionError } = await querySessionWithPractice(
      columns => supabase.from("interview_sessions").select(columns)
        .eq("id", id).eq("user_id", user.id).maybeSingle(),
      "id,status,questions,cv_snapshot,interview_type,question_count,target_role,job_description,interview_language",
    );
    if (sessionError) return json({ error: "Could not load interview session." }, 500);
    if (!session || !Array.isArray(session.questions)) return json({ error: "Interview session not found." }, 404);
    const practice = getWeaknessPracticeSession(session.source_session_id, session.selected_criteria);
    if (session.source_session_id && !practice) return json({ error: "Invalid practice session target." }, 409);
    const practiceMetadata = practice ? { practice } : {};
    const questions = session.questions as Question[];
    if (index >= questions.length) return json({ error: "This question does not exist in the interview session." }, 400);

    const { data: previousAnswers, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer,score")
      .eq("session_id", id)
      .order("question_index", { ascending: true });
    if (answersError) {
      return json({ error: "Could not load saved answers." }, 500);
    }
    const answers = (previousAnswers || []) as AnswerRow[];
    const existing = answers.find((item) => item.question_index === index);
    if (index < answers.length) {
      if (!existing || existing.answer !== answer) return json({ error: "This answer has already been submitted. Please continue with the current question." }, 409);
      if (session.status === "completed") return json({ completed: true, answeredCount: questions.length, ...practiceMetadata });
      return json({ error: "This answer has already been saved. Please reload the page to continue." }, 409);
    } else if (index !== answers.length) {
      return json({ error: "Please answer the interview questions in sequence." }, 409);
    } else {
      if (session.status !== "in_progress") return json({ error: "This interview session has ended." }, 409);
      
      // AI Evaluation
      const cvText = session.cv_snapshot ? JSON.stringify(session.cv_snapshot) : "";
      const interviewType = session.interview_type || "mixed";
      const currentQuestion = questions[index];
      const questionType = currentQuestion.focus || "behavioral";
      
      let evaluationResult;
      try {
        evaluationResult = await evaluateAnswer({
          cvText,
          targetRole: session.target_role,
          jobDescription: session.job_description,
          language: session.interview_language || "ja",
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
        return json({ error: evalError instanceof Error ? evalError.message : "AI evaluation error." }, evalError instanceof GeminiUnavailableError ? 503 : 500);
      }

      const { error: insertError } = await supabase.from("interview_answers").insert({ 
        session_id: id, 
        question_index: index, 
        answer,
        score: evaluationResult.score,
        rubric_json: evaluationResult.rubric,
        feedback: evaluationResult.feedback,
        suggestion: evaluationResult.suggestion,
        question_text: currentQuestion.text,
        question_type: questionType
      });
      if (insertError) {
        console.error("Interview answer save failed", { code: insertError.code, message: insertError.message });
        return json({ error: "Could not save answer. Please try submitting again." }, 500);
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
      if (completeError) return json({ error: "Answer saved, but could not complete interview session. Please reload the page." }, 500);
      return json({ completed: true, answeredCount: questions.length, ...practiceMetadata });
    }

    const nextQuestion = questions[nextIndex];
    return json({ completed: false, answeredCount: nextIndex, nextQuestion: { text: nextQuestion.text, translation: nextQuestion.translation }, ...practiceMetadata });
  } catch (err) {
    console.error("API Answers Error:", err);
    return json({ error: "Answer service is temporarily unavailable." }, 503);
  }
}
