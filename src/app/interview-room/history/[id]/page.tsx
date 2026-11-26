import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/icon";
import Link from "next/link";
import RubricDetails from "@/components/rubric-details";
import { isFailedGradingRubric, type RubricResult } from "@/lib/interview-rubric";
import RegradeButton from "./regrade-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interview Detail | Aizuchi.AI",
  description: "Detailed report of your interview session.",
};

type StoredQuestion = { text: string; translation: string; focus?: string };
type AnswerRow = { question_index: number; answer: string; score: number | null; rubric_json: RubricResult | null; feedback: string; suggestion: string | null };

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!id) redirect("/dashboard");

  const supabase = await createClient();
  const { data: session, error } = await supabase.from("interview_sessions")
    .select("id, title, status, questions, created_at, completed_at, score, summary_json")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !session) redirect("/dashboard");

  const { data: answerRows } = await supabase.from("interview_answers")
    .select("question_index, answer, score, feedback, suggestion, rubric_json")
    .eq("session_id", id)
    .order("question_index", { ascending: true });

  const questions = (session.questions || []) as StoredQuestion[];
  const answers = (answerRows || []) as AnswerRow[];

  return (
    <DashboardShell user={user} activePage="Dashboard">
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/summary?sessionId=${id}`} className="p-2 bg-surface-container hover:bg-surface-container-high rounded-full transition-colors text-primary">
            <Icon name="arrow_back" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">Answer Details</h1>
            <p className="text-on-surface-variant text-sm">
              {session.title} • {session.completed_at ? new Date(session.completed_at).toLocaleString('en-US') : 'In Progress'}
            </p>
          </div>
        </div>

        <div className="space-y-8 mt-8">
          {answers.map((ans, idx) => {
            const q = questions[ans.question_index];
            if (!q) return null;
            const gradingFailed = ans.score === null && (!ans.rubric_json || isFailedGradingRubric(ans.rubric_json));
            const canRetryGrading = ans.score === null;

            const scoreColor = gradingFailed ? "text-on-surface-variant bg-surface-container border-outline-variant" :
                              (ans.score ?? 0) >= 8 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                              (ans.score ?? 0) >= 6 ? "text-blue-600 bg-blue-50 border-blue-200" :
                              (ans.score ?? 0) >= 4 ? "text-amber-600 bg-amber-50 border-amber-200" :
                              "text-error bg-error-container border-error";

            return (
              <div key={idx} className="bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden">
                <div className="bg-surface-container-lowest p-5 border-b border-surface-container flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-xs font-bold text-secondary uppercase tracking-wider mb-1 block">
                      Question {ans.question_index + 1} • {q.focus === "technical" ? "Technical" : q.focus === "behavioral" ? "Behavioral" : "General"}
                    </span>
                    <h3 className="text-lg font-bold text-primary leading-relaxed">{q.text}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{q.translation}</p>
                  </div>
                  <div className={`shrink-0 flex items-center justify-center px-4 py-2 rounded-xl border font-bold text-xl ${scoreColor}`}>
                    {gradingFailed ? "Grading failed" : <>{ans.rubric_json?.provisional ? "Provisional: " : ""}{ans.score === null ? "Not graded" : `${Math.round(ans.score * 100) / 100} / 10`}</>}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {gradingFailed ? <p className="text-sm text-on-surface-variant">The answer was saved, but AI grading did not finish. This is not a judgment on your answer.</p> : ans.rubric_json && <RubricDetails rubric={ans.rubric_json} />}
                  {canRetryGrading && <RegradeButton sessionId={id} questionIndex={ans.question_index} />}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <Icon name="person" className="text-on-surface-variant" /> Your Answer
                    </h4>
                    <div className="bg-surface-container-lowest p-4 rounded-xl text-on-surface leading-relaxed text-sm">
                      {ans.answer}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <Icon name="psychology" className="text-indigo-600" /> AI Feedback
                    </h4>
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-900 leading-relaxed text-sm whitespace-pre-line">
                      {gradingFailed ? "AI grading did not finish. Retry grading to see feedback." : ans.feedback}
                    </div>
                  </div>

                  {ans.suggestion && (
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                        <Icon name="lightbulb" /> Improvement Suggestions
                      </h4>
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-900 leading-relaxed text-sm">
                        {ans.suggestion}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {answers.length === 0 && (
          <div className="text-center p-12 bg-white rounded-2xl border border-surface-container">
            <p className="text-on-surface-variant">No answers have been recorded yet.</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
