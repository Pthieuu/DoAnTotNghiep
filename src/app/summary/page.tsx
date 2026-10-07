import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import SummaryClient from "./client-page";
import { createClient } from "@/lib/supabase/server";

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
  const { data: session, error } = await supabase.from("interview_sessions")
    .select("id, title, status, summary_json")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !session) redirect("/dashboard");

  // If not summarized yet but completed, or we just want to load it
  // The client component will handle calling the summary API if summary_json is null
  
  return (
    <DashboardShell user={user} activePage="Dashboard">
      <SummaryClient 
        sessionId={session.id} 
        title={session.title} 
        initialSummary={session.summary_json} 
        status={session.status} 
      />
    </DashboardShell>
  );
}
