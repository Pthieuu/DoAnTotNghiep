import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interview Detail | Aizuchi.AI",
  description: "Detailed report of your interview session.",
};

type StoredQuestion = { text: string; translation: string; focus?: string };
type AnswerRow = { question_index: number; answer: string; score: number; feedback: string; suggestion: string | null };

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
    .select("question_index, answer, score, feedback, suggestion")
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
            <h1 className="text-2xl font-bold text-primary">Chi tiết các câu trả lời</h1>
            <p className="text-on-surface-variant text-sm">
              {session.title} • {session.completed_at ? new Date(session.completed_at).toLocaleString('vi-VN') : 'Chưa hoàn thành'}
            </p>
          </div>
        </div>

        <div className="space-y-8 mt-8">
          {answers.map((ans, idx) => {
            const q = questions[ans.question_index];
            if (!q) return null;
            
            const scoreColor = ans.score >= 8 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : 
                              ans.score >= 6 ? "text-blue-600 bg-blue-50 border-blue-200" : 
                              ans.score >= 4 ? "text-amber-600 bg-amber-50 border-amber-200" : 
                              "text-error bg-error-container border-error";

            return (
              <div key={idx} className="bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden">
                <div className="bg-surface-container-lowest p-5 border-b border-surface-container flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-xs font-bold text-secondary uppercase tracking-wider mb-1 block">
                      Câu hỏi {ans.question_index + 1} • {q.focus === "technical" ? "Kỹ thuật" : q.focus === "behavioral" ? "Kỹ năng mềm" : "Chung"}
                    </span>
                    <h3 className="text-lg font-bold text-primary leading-relaxed">{q.text}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{q.translation}</p>
                  </div>
                  <div className={`shrink-0 flex items-center justify-center px-4 py-2 rounded-xl border font-bold text-xl ${scoreColor}`}>
                    {ans.score} / 10
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <Icon name="person" className="text-on-surface-variant" /> Câu trả lời của bạn
                    </h4>
                    <div className="bg-surface-container-lowest p-4 rounded-xl text-on-surface leading-relaxed text-sm">
                      {ans.answer}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <Icon name="psychology" className="text-indigo-600" /> Nhận xét từ AI
                    </h4>
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-900 leading-relaxed text-sm">
                      {ans.feedback}
                    </div>
                  </div>

                  {ans.suggestion && (
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                        <Icon name="lightbulb" /> Gợi ý cải thiện
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
            <p className="text-on-surface-variant">Chưa có câu trả lời nào được lưu.</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
