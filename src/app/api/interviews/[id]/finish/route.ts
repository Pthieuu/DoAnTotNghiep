import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

type AnswerRow = { question_index: number; answer: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;

  try {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json({ error: "Invalid interview session ID." }, 400);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Please sign in to end interview session." }, 401);

    const findSession = () => supabase.from("interview_sessions").select("id,status,questions")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    const { data: session, error: sessionError } = await findSession();
    if (sessionError) return json({ error: "Could not load interview session." }, 500);
    if (!session) return json({ error: "Interview session not found." }, 404);
    if (!["in_progress", "completed"].includes(session.status)) return json({ error: "This interview session cannot be ended." }, 409);
    if (!Array.isArray(session.questions) || !session.questions.length) return json({ error: "Invalid question data." }, 409);

    const { data: rows, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer").eq("session_id", id).order("question_index", { ascending: true });
    if (answersError) return json({ error: "Could not load saved answers." }, 500);
    const answers = (rows ?? []) as AnswerRow[];
    if (!answers.length) return json({ error: "You must submit at least one answer before viewing results." }, 409);
    if (new Set(answers.map(answer => answer.question_index)).size !== answers.length
      || answers.some(answer => !Number.isInteger(answer.question_index) || answer.question_index < 0
        || answer.question_index >= session.questions.length || typeof answer.answer !== "string" || !answer.answer.trim())) {
      return json({ error: "Invalid answer data to end session." }, 409);
    }

    if (session.status === "in_progress") {
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase.from("interview_sessions")
        .update({ status: "completed", completed_at: now, updated_at: now, summary_json: null, score: null })
        .eq("id", id).eq("user_id", user.id).eq("status", "in_progress").select("id").maybeSingle();
      if (updateError) return json({ error: "Could not end interview session. Please try again." }, 500);
      if (!updated) {
        const current = await findSession();
        if (current.error) return json({ error: "Could not confirm interview session status." }, 500);
        if (current.data?.status !== "completed") return json({ error: "Session status has changed. Please reload the page." }, 409);
      }
    }

    return json({ completed: true, sessionId: session.id, answeredCount: answers.length, plannedCount: session.questions.length });
  } catch (error) {
    console.error("Interview finish failed", error);
    return json({ error: "End session service is temporarily unavailable." }, 503);
  }
}
