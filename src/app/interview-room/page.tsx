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

type StoredQuestion = { text: string; translation: string; focus?: string };
type StoredTurn = { question: StoredQuestion; answer: string; score?: number; feedback?: string };
type RoomSession = {
  id: string; title: string; company: string | null; level: string | null;
  interviewType: string; interviewLanguage: string;
  total: number; currentQuestion: StoredQuestion | null; turns: StoredTurn[];
  completed: boolean; loadError?: "session" | "answers"
};

export default async function InterviewRoomPage({ searchParams }: PageProps<"/interview-room">) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { sessionId } = await searchParams;
  const supabase = await createClient();
  let session: RoomSession | null = null;
  if (typeof sessionId === "string" && sessionId.length <= 64) {
    const { data, error: sessionError } = await supabase.from("interview_sessions")
      .select("id,title,company,level,status,questions,interview_type,interview_language")
      .eq("id", sessionId).eq("user_id", user.id).maybeSingle();
    if (sessionError) {
      session = { id: sessionId, title: "Interview Room", company: null, level: null, interviewType: "mixed", interviewLanguage: "vi", total: 0, currentQuestion: null, turns: [], completed: false, loadError: "session" };
    } else if (data && Array.isArray(data.questions)) {
      const { data: answerRows, error: answerError } = await supabase.from("interview_answers")
        .select("question_index,answer,score,feedback")
        .eq("session_id", sessionId)
        .order("question_index", { ascending: true });
      const questions = data.questions as StoredQuestion[];
      if (answerError) {
        session = { id: data.id, title: data.title, company: data.company, level: data.level, interviewType: data.interview_type || "mixed", interviewLanguage: data.interview_language || "vi", total: questions.length, currentQuestion: null, turns: [], completed: false, loadError: "answers" };
      } else {
        const answers = answerRows || [];
        const publicQuestion = (question: StoredQuestion): StoredQuestion => ({ text: question.text, translation: question.translation, focus: question.focus });
        const turns = answers.flatMap((item) => questions[item.question_index] ? [{ question: publicQuestion(questions[item.question_index]), answer: item.answer, score: item.score, feedback: item.feedback }] : []);
        const completed = data.status === "completed";
        const currentIndex = answers.length;
        session = {
          id: data.id,
          title: data.title,
          company: data.company,
          level: data.level,
          interviewType: data.interview_type || "mixed",
          interviewLanguage: data.interview_language || "vi",
          total: questions.length,
          currentQuestion: completed || !questions[currentIndex] ? null : publicQuestion(questions[currentIndex]),
          turns,
          completed,
        };
      }
    }
  }

  return (
    <DashboardShell user={user} activePage="Interview Room">
      <InterviewRoomClient key={session?.id || "no-session"} session={session} />
    </DashboardShell>
  );
}
