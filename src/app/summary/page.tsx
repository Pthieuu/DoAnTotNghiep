import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import SummaryClient from "./client-page";
import { createClient } from "@/lib/supabase/server";
import { getWeaknessPracticeSession } from "@/lib/weakness-practice";
import { querySessionWithPractice } from "@/lib/interview-session-query";

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
    "id,title,status,summary_json",
  );

  if (error || !session) redirect("/dashboard");

  const practice = getWeaknessPracticeSession(session.source_session_id, session.selected_criteria);

  return (
    <DashboardShell user={user} activePage="Dashboard">
      <SummaryClient
        key={session.id}
        sessionId={session.id}
        title={session.title}
        initialSummary={session.summary_json}
        status={session.status}
        practice={practice}
        practiceAvailable={practiceAvailable}
      />
    </DashboardShell>
  );
}
