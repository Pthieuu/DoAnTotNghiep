"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/icon";
import VrmAvatar from "@/components/vrm-avatar";

type InterviewQuestion = { text: string; translation: string };
type InterviewTurn = { question: InterviewQuestion; answer: string };
type InterviewSession = {
  id: string;
  title: string;
  company: string | null;
  level: string | null;
  total: number;
  currentQuestion: InterviewQuestion | null;
  turns: InterviewTurn[];
  completed: boolean;
  loadError?: "session" | "answers";
};

export default function InterviewRoomClient({ session }: { session: InterviewSession | null }) {
  const [turns, setTurns] = useState(session?.turns || []);
  const [currentQuestion, setCurrentQuestion] = useState(session?.currentQuestion || null);
  const [answer, setAnswer] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(session?.completed || false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speakQuestion() {
    if (!currentQuestion || !window.speechSynthesis) {
      setError("Trình duyệt này chưa hỗ trợ phát giọng nói. Bạn vẫn có thể đọc câu hỏi trên màn hình.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => setAiSpeaking(false);
    utterance.onerror = () => setAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !currentQuestion || busy || !answer.trim()) return;
    setBusy(true);
    setError("");
    try {
      window.speechSynthesis?.cancel();
      setAiSpeaking(false);
      const response = await fetch(`/api/interviews/${encodeURIComponent(session.id)}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: turns.length, answer: answer.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không gửi được câu trả lời.");
      setTurns((previous) => [...previous, { question: currentQuestion, answer: answer.trim() }]);
      setAnswer("");
      setShowTranslation(false);
      if (result.completed) {
        setCurrentQuestion(null);
        setCompleted(true);
      } else {
        setCurrentQuestion(result.nextQuestion);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được câu trả lời. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return <section className="mx-auto max-w-2xl rounded-2xl border border-surface-container bg-white p-6 shadow-sm sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-xl bg-secondary-fixed text-primary"><Icon name="videocam" /></span>
      <h1 className="mt-4 text-xl font-bold text-primary">Chưa có buổi phỏng vấn để bắt đầu</h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">Hãy thiết lập buổi luyện tập trước.</p>
      <Link href="/interview-setup" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary">Thiết lập buổi phỏng vấn <Icon name="arrow_forward" /></Link>
    </section>;
  }

  if (session.loadError) {
    const migration = session.loadError === "answers" ? "202609300004_create_interview_answers.sql" : "202609300003_extend_interview_sessions.sql";
    return <section role="alert" className="mx-auto max-w-2xl rounded-2xl border border-error/20 bg-white p-6 shadow-sm"><h1 className="text-lg font-bold text-primary">Không tải được buổi phỏng vấn</h1><p className="mt-2 text-sm text-on-surface-variant">Cơ sở dữ liệu có thể chưa được cập nhật cho luồng phỏng vấn này. Hãy nhờ quản lý dự án chạy migration <code className="rounded bg-surface-container px-1.5 py-0.5">{migration}</code> trong Supabase, sau đó tải lại trang.</p><Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low"><Icon name="arrow_forward" className="rotate-180" />Về trang chính</Link></section>;
  }

  const visibleQuestionNumber = completed ? session.total : Math.min(turns.length + 1, session.total);
  const progress = Math.round((visibleQuestionNumber / Math.max(session.total, 1)) * 100);
  return <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col gap-4 bg-surface p-4 lg:h-[calc(100vh-48px)] lg:min-h-0 lg:overflow-hidden lg:p-6">
    <header className="flex shrink-0 items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold text-primary">{session.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-semibold tracking-wide text-on-primary">Phỏng vấn tiếng Nhật</span>
          {session.company && <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">{session.company}</span>}
          {session.level && <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">JLPT {session.level}</span>}
        </div>
      </div>
      <div className="w-28 shrink-0"><div className="mb-1 flex justify-between text-[10px] font-medium text-on-surface-variant"><span>Câu hỏi</span><span>{visibleQuestionNumber}/{session.total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div></div>
    </header>

    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-h-[650px] flex-col overflow-hidden rounded-2xl border border-surface-container bg-white shadow-sm lg:min-h-0">
        <div className="relative min-h-[300px] flex-1 overflow-hidden bg-[#edf3fb]">
          <VrmAvatar state={aiSpeaking ? "speaking" : "idle"} className="absolute inset-0 h-full min-h-0 rounded-none" />
          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-primary/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">面接官 / Interviewer</div>
          <div className="absolute bottom-4 left-4 right-4 z-10 sm:right-auto sm:max-w-2xl">
            {currentQuestion ? <div aria-live="polite" aria-atomic="true" className="rounded-2xl border border-white/10 bg-primary/85 p-4 text-left shadow-lg backdrop-blur-md">
              <p lang="ja" className="text-base font-medium leading-relaxed text-white lg:text-lg">{currentQuestion.text}</p>
              {showTranslation && <p className="mt-2 text-sm text-secondary-fixed">{currentQuestion.translation}</p>}
              <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={speakQuestion} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"><Icon name="volume_up" />Nghe câu hỏi</button><button type="button" onClick={() => setShowTranslation((value) => !value)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20">{showTranslation ? "Ẩn bản dịch" : "Xem bản dịch"}</button></div>
            </div> : <div className="rounded-2xl bg-primary/85 p-4 text-white shadow-lg"><p className="font-semibold">Cảm ơn bạn. Buổi phỏng vấn đã kết thúc.</p><p className="mt-1 text-sm text-white/80">Bạn đã trả lời tất cả câu hỏi.</p></div>}
          </div>
        </div>

        {currentQuestion && <form onSubmit={submitAnswer} className="shrink-0 space-y-3 border-t border-surface-container p-4 lg:p-5">
          <label htmlFor="interview-answer" className="block text-sm font-semibold text-primary">Câu trả lời của bạn</label>
          <textarea id="interview-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={10000} rows={4} required placeholder="Trả lời bằng tiếng Nhật…" className="w-full resize-y rounded-xl border border-outline-variant bg-white p-3 text-sm text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20" />
          {error && <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">{error}</p>}
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] text-on-surface-variant">{answer.length.toLocaleString("vi-VN")} / 10.000</span><button type="submit" disabled={busy || !answer.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-secondary disabled:cursor-wait disabled:opacity-50">{busy ? "Đang gửi…" : "Gửi câu trả lời"}<Icon name="arrow_forward" /></button></div>
        </form>}
        {!currentQuestion && <div className="flex shrink-0 justify-end border-t border-surface-container p-4"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary">Về trang chính <Icon name="arrow_forward" /></Link></div>}
      </section>

      <aside className="flex min-h-64 flex-col overflow-hidden rounded-2xl border border-surface-container bg-white shadow-sm lg:min-h-0">
        <div className="flex shrink-0 items-center gap-2 border-b border-surface-container px-4 py-3"><Icon name="forum" className="text-secondary" /><h2 className="font-semibold text-primary">Cuộc trò chuyện</h2></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {turns.length === 0 && <p className="text-xs leading-5 text-on-surface-variant">Nhà tuyển dụng sẽ hỏi từng câu. Hãy trả lời để tiếp tục cuộc trò chuyện.</p>}
          {turns.map((turn, index) => <div key={index} className="space-y-2 border-b border-surface-container pb-4 last:border-0">
            <div className="flex flex-col items-start gap-1"><span className="text-[10px] font-semibold text-secondary">面接官</span><p lang="ja" className="max-w-[95%] rounded-2xl rounded-tl-sm bg-surface-container-low px-3 py-2 text-xs leading-5 text-on-surface">{turn.question.text}</p></div>
            <div className="flex flex-col items-end gap-1"><span className="text-[10px] font-semibold text-primary">Bạn</span><p className="max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-xs leading-5 text-white">{turn.answer}</p></div>
          </div>)}
          {completed && <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">Cuộc trò chuyện đã hoàn tất.</p>}
        </div>
      </aside>
    </div>
  </div>;
}
