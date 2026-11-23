import type { RubricResult } from "@/lib/interview-rubric";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import InterviewRoomClient from "./client-page";
import { createClient } from "@/lib/supabase/server";
import { getWeaknessPracticeSession, type WeaknessPracticeSession } from "@/lib/weakness-practice";
import { querySessionWithPractice } from "@/lib/interview-session-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interview Room | Aizuchi.AI",
  description: "AI Japanese Interview Practice.",
};

import { interviewOpening, needsIntroduction } from "@/lib/interview-opening";

type StoredQuestion = { text: string; translation: string; focus?: string };
type StoredTurn = { question: StoredQuestion; answer: string; score?: number | null; feedback?: string; rubric?: RubricResult | null };
type RoomSession = {
  id: string; title: string; company: string | null; level: string | null;
  interviewType: string; interviewLanguage: string;
  total: number; currentQuestion: StoredQuestion | null; turns: StoredTurn[];
  introduction?: string | null; opening?: boolean;
  completed: boolean; loadError?: "session" | "answers";
  practice?: WeaknessPracticeSession | null;
};

export default async function InterviewRoomPage({ searchParams }: PageProps<"/interview-room">) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { sessionId } = await searchParams;
  const supabase = await createClient();
  let session: RoomSession | null = null;
  if (typeof sessionId === "string" && sessionId.length <= 64) {
    const { data, error: sessionError } = await querySessionWithPractice(
      columns => supabase.from("interview_sessions").select(columns)
        .eq("id", sessionId).eq("user_id", user.id).maybeSingle(),
      "id,title,company,level,status,questions,interview_type,interview_language,self_introduction",
    );
    if (sessionError) {
      session = { id: sessionId, title: "Interview Room", company: null, level: null, interviewType: "mixed", interviewLanguage: "vi", total: 0, currentQuestion: null, turns: [], completed: false, loadError: "session" };
    } else if (data && Array.isArray(data.questions)) {
      const practice = getWeaknessPracticeSession(data.source_session_id, data.selected_criteria);
      const { data: answerRows, error: answerError } = await supabase.from("interview_answers")
        .select("question_index,answer,score,feedback,rubric_json")
        .eq("session_id", sessionId)
        .order("question_index", { ascending: true });
      const questions = data.questions as StoredQuestion[];
      if (answerError) {
        session = { id: data.id, title: data.title, company: data.company, level: data.level, interviewType: data.interview_type || "mixed", interviewLanguage: data.interview_language || "vi", total: questions.length, currentQuestion: null, turns: [], completed: false, loadError: "answers", practice };
      } else {
        const answers = answerRows || [];
        const publicQuestion = (question: StoredQuestion): StoredQuestion => ({ text: question.text, translation: question.translation, focus: question.focus });
        const turns = answers.flatMap((item) => questions[item.question_index] ? [{ question: publicQuestion(questions[item.question_index]), answer: item.answer, score: item.score, feedback: item.feedback, rubric: item.rubric_json }] : []);
        const completed = data.status === "completed";
        const currentIndex = answers.length;
        const opening = needsIntroduction(data.status, answers.length, data.self_introduction);
        session = {
          opening, introduction: data.self_introduction,
          id: data.id,
          title: data.title,
          company: data.company,
          level: data.level,
          interviewType: data.interview_type || "mixed",
          interviewLanguage: data.interview_language || "vi",
          total: questions.length,
          currentQuestion: completed || !questions[currentIndex] ? null : opening ? interviewOpening(data.interview_language) : publicQuestion(questions[currentIndex]),
          turns,
          completed,
          practice,
        };
      }
    }
  }

  return (
    <DashboardShell user={user} activePage="Interview Room" hideSidebar={true}>
      <InterviewRoomClient key={session?.id ?? "no-session"} session={session} />
    </DashboardShell>
  );
}
