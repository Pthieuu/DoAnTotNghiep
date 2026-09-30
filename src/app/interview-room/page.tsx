import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import InterviewRoomClient from "./client-page";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interview Room | Aizuchi.AI",
  description: "AI Japanese Interview Practice.",
};

type StoredQuestion = { text: string; translation: string; focus: string; cvEvidence?: string | null };
type StoredSession = { id: string; title: string; company: string | null; level: string | null; questions: StoredQuestion[] };

export default async function InterviewRoomPage({ searchParams }: PageProps<"/interview-room">) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { sessionId } = await searchParams;
  const supabase = await createClient();
  let session: StoredSession | null = null;
  if (typeof sessionId === "string" && sessionId.length <= 64) {
    const { data } = await supabase.from("interview_sessions")
      .select("id,title,company,level,questions")
      .eq("id", sessionId).eq("user_id", user.id).maybeSingle();
    if (data && Array.isArray(data.questions)) session = data as StoredSession;
  }

  return (
    <DashboardShell user={user} activePage="Interview Room">
      <InterviewRoomClient session={session} />
    </DashboardShell>
  );
}
