import type { createClient } from "./supabase/server";
import { querySessionWithPractice } from "./interview-session-query";
import { identifyWeaknesses, type WeaknessPracticeTarget } from "./weakness-practice";

export type DashboardPracticeData = {
  session: { id: string; title: string } | null;
  targets: WeaknessPracticeTarget[];
  practiceAvailable: boolean;
  error: string | null;
};

export async function loadDashboardPractice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<DashboardPracticeData> {
  const empty: DashboardPracticeData = { session: null, targets: [], practiceAvailable: false, error: null };
  try {
    const { data: session, error, practiceAvailable } = await querySessionWithPractice(
      columns => supabase.from("interview_sessions").select(columns)
        .eq("user_id", userId).eq("status", "completed")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false }).limit(1).maybeSingle(),
      "id,title,questions",
    );
    if (error) return { ...empty, error: "Failed to load practice recommendations. Please try again." };
    if (!session) return empty;
    const source = { id: session.id, title: session.title };
    const { data: rows, error: answersError } = await supabase.from("interview_answers")
      .select("question_index,answer,rubric_json").eq("session_id", session.id)
      .order("question_index", { ascending: true });
    if (answersError) return { session: source, targets: [], practiceAvailable, error: "Failed to load scoring data for practice recommendations." };
    const questions: unknown[] = Array.isArray(session.questions) ? session.questions : [];
    const targets = identifyWeaknesses((rows ?? []).map(row => {
      const question = questions[row.question_index];
      return {
        questionIndex: row.question_index,
        question: question && typeof question === "object" && "text" in question && typeof question.text === "string" ? question.text : "",
        answer: typeof row.answer === "string" ? row.answer : "",
        rubric: row.rubric_json,
      };
    })).sort((a, b) => Math.min(...a.sources.map(source => source.level)) - Math.min(...b.sources.map(source => source.level))
      || a.criterionId.localeCompare(b.criterionId));
    return { session: source, targets, practiceAvailable, error: null };
  } catch {
    return { ...empty, error: "Practice recommendation service is temporarily unavailable. Please try again." };
  }
}
