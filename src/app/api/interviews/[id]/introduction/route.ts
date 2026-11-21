import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const body = await request.json().catch(() => null);
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (!answer || answer.length > 10000) return json({ error: "Introduction must be between 1 and 10,000 characters." }, 400);
  const { id } = await context.params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to save your introduction." }, 401);
    const { data: session, error } = await supabase.from("interview_sessions")
      .select("id,status,self_introduction").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) return json({ error: "Could not load opening. Check the interview opening migration." }, 500);
    if (!session) return json({ error: "Interview session not found." }, 404);
    if (session.self_introduction === answer) return json({ saved: true });
    if (session.status !== "in_progress" || session.self_introduction) return json({ error: "The opening has already ended. Please reload." }, 409);
    const { data: answers, error: answersError } = await supabase.from("interview_answers")
      .select("question_index").eq("session_id", id).limit(1);
    if (answersError) return json({ error: "Could not load interview progress." }, 500);
    if (answers?.length) return json({ error: "This interview has already started." }, 409);
    const { data: saved, error: saveError } = await supabase.from("interview_sessions")
      .update({ self_introduction: answer, updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", user.id).eq("status", "in_progress").is("self_introduction", null)
      .select("id").maybeSingle();
    if (saveError) return json({ error: "Could not save introduction. Please try again." }, 500);
    if (!saved) return json({ error: "Interview progress changed. Please reload." }, 409);
    return json({ saved: true });
  } catch {
    return json({ error: "Introduction service is temporarily unavailable." }, 503);
  }
}
