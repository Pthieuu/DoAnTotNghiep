"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/icon";
import VrmAvatar from "@/components/vrm-avatar";

type InterviewQuestion = { text: string; translation: string; focus: string; cvEvidence?: string | null };
type InterviewSession = { id: string; title: string; company: string | null; level: string | null; questions: InterviewQuestion[] };

export default function InterviewRoomClient({ session }: { session: InterviewSession | null }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);

  if (!session || session.questions.length === 0) {
    return <section className="mx-auto max-w-2xl rounded-2xl border border-surface-container bg-white p-6 shadow-sm sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-xl bg-secondary-fixed text-primary"><Icon name="videocam" /></span>
      <h1 className="mt-4 text-xl font-bold text-primary">Chưa có buổi phỏng vấn để bắt đầu</h1>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">Hãy thiết lập buổi luyện tập và tạo bộ câu hỏi trước.</p>
      <Link href="/interview-setup" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary">Thiết lập buổi phỏng vấn <Icon name="arrow_forward" /></Link>
    </section>;
  }

  const question = session.questions[questionIndex];
  const questionCount = session.questions.length;

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full flex-col space-y-4 bg-surface p-4 lg:h-[calc(100vh-48px)] lg:min-h-0 lg:overflow-hidden lg:p-6">
      <InterviewHeader session={session} current={questionIndex + 1} total={questionCount} />
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
        <div className="relative flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-surface-container bg-white shadow-sm">
          <div className="relative flex-1 overflow-hidden bg-[#edf3fb]">
            <VrmAvatar state="idle" className="absolute inset-0 h-full min-h-0 rounded-none" />
            <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-primary/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              Câu {questionIndex + 1} / {questionCount}
            </div>
            <CandidateCamera />
            <div className="absolute bottom-4 left-4 z-10 flex max-w-2xl flex-col items-start">
              <div className="rounded-2xl border border-white/10 bg-primary/85 p-3 text-left shadow-lg backdrop-blur-md lg:p-4">
                <p lang="ja" className="text-base font-medium leading-relaxed text-white lg:text-lg">{question.text}</p>
                {showTranslation && <p className="mt-2 text-sm text-secondary-fixed lg:text-base">{question.translation}</p>}
                <button type="button" onClick={() => setShowTranslation((value) => !value)} className="mt-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20">
                  {showTranslation ? "Ẩn bản dịch" : "Xem bản dịch tiếng Việt"}
                </button>
              </div>
            </div>
          </div>
          <InterviewControls
            current={questionIndex + 1}
            total={questionCount}
            onPrevious={() => { setQuestionIndex((index) => Math.max(0, index - 1)); setShowTranslation(false); }}
            onNext={() => { setQuestionIndex((index) => Math.min(questionCount - 1, index + 1)); setShowTranslation(false); }}
          />
        </div>

        <InterviewSidePanel session={session} question={question} current={questionIndex + 1} className="h-64 shrink-0 lg:h-auto lg:w-[360px]" />
      </div>
      <InterviewProgress current={questionIndex + 1} total={questionCount} />
    </div>
  );
}

function InterviewHeader({ session, current, total }: { session: InterviewSession; current: number; total: number }) {
  return <header className="flex shrink-0 items-center justify-between gap-4">
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-bold text-primary">{session.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-semibold tracking-wide text-on-primary">Luyện phỏng vấn tiếng Nhật</span>
        {session.company && <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">{session.company}</span>}
        {session.level && <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">JLPT {session.level}</span>}
      </div>
    </div>
    <span className="shrink-0 rounded-lg border border-surface-container bg-white px-3 py-2 text-xs font-semibold tabular-nums text-primary">{current} / {total}</span>
  </header>;
}

function CandidateCamera() {
  return <div className="absolute right-4 top-4 z-10 flex h-24 w-32 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-white/30 bg-surface-container-highest text-on-surface-variant shadow-xl lg:right-6 lg:top-6 lg:h-32 lg:w-48">
    <Icon name="person" />
    <span className="absolute bottom-1.5 left-2 rounded bg-primary/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">あなた / You</span>
  </div>;
}

function InterviewControls({ current, total, onPrevious, onNext }: { current: number; total: number; onPrevious: () => void; onNext: () => void }) {
  return <div className="flex h-16 shrink-0 items-center justify-between border-t border-surface-container bg-white px-4 lg:h-20 lg:px-6">
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary"><Icon name="arrow_forward" className="rotate-180" />Thoát</Link>
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrevious} disabled={current === 1} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"><Icon name="chevron_right" className="rotate-180" />Câu trước</button>
      <button type="button" onClick={onNext} disabled={current === total} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40">Câu tiếp theo<Icon name="chevron_right" /></button>
    </div>
  </div>;
}

function InterviewSidePanel({ session, question, current, className = "" }: { session: InterviewSession; question: InterviewQuestion; current: number; className?: string }) {
  return <aside className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-surface-container bg-white shadow-sm ${className}`}>
    <div className="flex shrink-0 items-center gap-2 border-b border-surface-container bg-surface-container-lowest px-4 py-3">
      <Icon name="analytics" className="text-secondary" />
      <h2 className="font-semibold text-primary">Hướng dẫn phỏng vấn</h2>
    </div>
    <div className="flex-1 space-y-5 overflow-y-auto p-4">
      <section className="rounded-xl border border-primary-fixed-dim bg-primary-fixed p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">Câu {current}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-primary">{question.focus}</p>
        {session.level && <span className="mt-3 inline-flex rounded bg-white/60 px-2 py-1 text-[10px] font-semibold text-primary-fixed-variant">JLPT {session.level}</span>}
      </section>
      {question.cvEvidence && <section>
        <h3 className="mb-2 text-xs font-semibold text-primary">Thông tin liên quan trong CV</h3>
        <blockquote className="border-l-2 border-secondary pl-3 text-xs leading-5 text-on-surface-variant">“{question.cvEvidence}”</blockquote>
      </section>}
      <section>
        <h3 className="mb-2 text-xs font-semibold text-primary">Gợi ý trả lời</h3>
        <ul className="list-disc space-y-2 pl-4 text-xs leading-5 text-on-surface-variant">
          <li>Nêu rõ vai trò và phần việc bạn trực tiếp đảm nhận.</li>
          <li>Đưa ra ví dụ cụ thể; không cần nhận công việc của cả nhóm.</li>
          <li>Kết thúc bằng điều bạn học được hoặc kết quả đạt được.</li>
        </ul>
      </section>
      <p className="rounded-lg bg-surface-container-low p-3 text-[11px] leading-5 text-on-surface-variant">Hãy thử trả lời thành tiếng bằng tiếng Nhật trước khi chuyển sang câu tiếp theo.</p>
    </div>
  </aside>;
}

function InterviewProgress({ current, total }: { current: number; total: number }) {
  const progress = Math.round((current / total) * 100);
  return <div className="shrink-0 pb-2 pt-1">
    <div className="mb-1 flex items-center justify-between px-1 text-xs font-medium text-on-surface-variant"><span>Câu {current} / {total}</span><span>{progress}%</span></div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
  </div>;
}
