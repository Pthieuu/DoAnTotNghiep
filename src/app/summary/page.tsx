import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import SummaryClient, { type QuestionBreakdownItem } from "./client-page";
import { createClient } from "@/lib/supabase/server";
import { getWeaknessPracticeSession } from "@/lib/weakness-practice";
import { querySessionWithPractice } from "@/lib/interview-session-query";
import type { RubricResult } from "@/lib/interview-rubric";
import type { SummaryResult } from "@/lib/interview-summary";

function provisionalAverage(answers: Array<{ score?: number | null; rubric?: RubricResult | null }>): number | null {
  const scores = answers
    .map((a) => {
      if (a.rubric && typeof a.rubric.totalScore === "number" && Number.isFinite(a.rubric.totalScore)) {
        return a.rubric.totalScore;
      }
      if (typeof a.score === "number" && Number.isFinite(a.score) && a.score >= 0 && a.score <= 10) {
        return a.score * 10;
      }
      return null;
    })
    .filter((value): value is number => value !== null);
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interview Summary | Aizuchi.AI",
  description: "AI Interview summary and feedback.",
};

export default async function SummaryPage({ searchParams }: { searchParams: Promise<{ sessionId?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { sessionId } = await searchParams;
  if (!sessionId) redirect("/dashboard");

  const supabase = await createClient();
  const { data: session, error, practiceAvailable } = await querySessionWithPractice(
    columns => supabase.from("interview_sessions").select(columns)
      .eq("id", sessionId).eq("user_id", user.id).maybeSingle(),
    "id,title,status,summary_json,self_introduction,questions",
  );

  if (error || !session) redirect("/dashboard");

  let answerRows: Array<{
    question_index: number;
    question_text: string | null;
    answer: string;
    score: number | null;
    feedback: string | null;
    suggestion?: string | null;
    rubric_json?: RubricResult | null;
  }> = [];
  try {
    const res = await supabase
      .from("interview_answers")
      .select("question_index,question_text,answer,score,feedback,suggestion,rubric_json")
      .eq("session_id", session.id)
      .order("question_index", { ascending: true });
    if (Array.isArray(res?.data)) answerRows = res.data;
  } catch {
    // Breakdown is supplementary; summary still renders if answer rows fail to load.
  }

  const sessionQuestions = Array.isArray(session.questions) ? (session.questions as Array<{ text?: string }>) : [];
  const questionBreakdown: QuestionBreakdownItem[] = answerRows.map((row) => ({
    questionIndex: row.question_index,
    questionText: row.question_text || sessionQuestions[row.question_index]?.text || `Question ${row.question_index + 1}`,
    answer: row.answer,
    score: row.score,
    feedback: row.feedback || "",
    suggestion: row.suggestion ?? null,
    rubric: row.rubric_json ?? null,
  }));

  let initialSummary = (session.summary_json as SummaryResult | null) ?? null;
  if (initialSummary && initialSummary.totalScore === null && questionBreakdown.length > 0) {
    const provisionalTotal = provisionalAverage(
      questionBreakdown.map((item) => ({ score: item.score, rubric: item.rubric }))
    );
    if (provisionalTotal !== null) {
      initialSummary = {
        ...initialSummary,
        totalScore: provisionalTotal,
        provisional: true,
      };
    }
  }

  const practice = getWeaknessPracticeSession(session.source_session_id, session.selected_criteria);

  return (
    <DashboardShell user={user} activePage="Dashboard">
      <SummaryClient
        key={session.id}
        sessionId={session.id}
        title={session.title}
        initialSummary={initialSummary}
        introduction={session.self_introduction}
        status={session.status}
        practice={practice}
        practiceAvailable={practiceAvailable}
        questionBreakdown={questionBreakdown}
      />
    </DashboardShell>
  );
}
