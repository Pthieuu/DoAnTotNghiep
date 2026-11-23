"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/icon";
import VrmAvatar from "@/components/vrm-avatar";
import { useGeminiLiveInterview } from "@/hooks/useGeminiLiveInterview";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RubricDetails from "@/components/rubric-details";
import type { RubricResult } from "@/lib/interview-rubric";
import type { WeaknessPracticeSession } from "@/lib/weakness-practice";
import WeaknessPracticeGoals from "@/components/weakness-practice-goals";

type AIState = "idle" | "speaking" | "listening" | "thinking";

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

function checkAndCleanFinishPhrase(text: string): { finished: boolean; cleanText: string; matchedPhrase: string } {
  const trimmed = text.trim();
  if (!trimmed) return { finished: false, cleanText: "", matchedPhrase: "" };

  const endPatterns = [
    { regex: /[\s,.]*(?:that'?s\s+all|i'?m\s+done)[\s.!,?]*$/i, phrase: "That's all" },
    { regex: /[\s,.]*(?:これで)?以上(?:です|になります)[\s.!,?]*$/i, phrase: "以上です" },
    { regex: /[\s,.]*(?:dạ\s+)?(?:tôi|em|mình)\s+xin\s+hết(?:\s*ạ)?[\s.!,?]*$/i, phrase: "Tôi xin hết" },
    { regex: /[\s,.]*(?:dạ\s+)?xin\s+hết(?:\s*ạ)?[\s.!,?]*$/i, phrase: "Xin hết" },
    { regex: /[\s,.]*(?:dạ\s+)?(?:tôi|em|mình)\s+đã\s+trả\s+lời\s+xong(?:\s*ạ)?[\s.!,?]*$/i, phrase: "Tôi đã trả lời xong" },
    { regex: /[\s,.]*(?:dạ\s+)?(?:tôi|em|mình)\s+xin\s+kết\s+thúc(?:\s+câu\s+trả\s+lời)?(?:\s*ạ)?[\s.!,?]*$/i, phrase: "Tôi xin kết thúc" },
  ];

  for (const { regex, phrase } of endPatterns) {
    if (regex.test(trimmed)) {
      const match = trimmed.match(regex);
      const cleaned = trimmed.replace(regex, "").trim();
      return {
        finished: true,
        cleanText: cleaned || trimmed,
        matchedPhrase: match ? match[0].replace(/^[\s,.]+/, "").replace(/[\s,.]+$/, "") : phrase,
      };
    }
  }

  return { finished: false, cleanText: trimmed, matchedPhrase: "" };
}

export default function InterviewRoomClient({ session }: { session: RoomSession | null }) {
  // Keep the input preference while each turn remounts to reset drafts and audio.
  const [textMode, setTextMode] = useState(false);
  return <InterviewRoomTurn key={session ? `${session.id}:${session.turns.length}:${session.opening}:${session.completed}` : "no-session"} session={session} initialTextMode={textMode} onTextModeChange={setTextMode} />;
}

export function InterviewRoomTurn({ session, initialTextMode = false, onTextModeChange }: { session: RoomSession | null; initialTextMode?: boolean; onTextModeChange?: (value: boolean) => void }) {
  const router = useRouter();
  const [textAnswer, setTextAnswer] = useState("");
  const [textMode, setLocalTextMode] = useState(initialTextMode);
  const [showChat, setShowChat] = useState(true);
  const [isPip, setIsPip] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const setTextMode = useCallback((value: boolean) => {
    setLocalTextMode(value);
    onTextModeChange?.(value);
  }, [onTextModeChange]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFinishMessage, setAutoFinishMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [failedAnswer, setFailedAnswer] = useState<{ sessionId: string; index: number; text: string } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const finishingRef = useRef(false);
  const hasAutoStartedRef = useRef<number | null>(null);
  const autoSubmitTriggeredRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const live = useGeminiLiveInterview(session?.id, session?.turns.length ?? 0, session?.currentQuestion?.text);
  const transcript = textMode ? textAnswer : live.candidateTranscript;
  const isListening = live.state === "listening" || live.state === "speaking" || live.state === "connecting";

  // Keep track of current state
  const currentQuestionIndex = session ? session.turns.length : 0;
  const isCompleted = session?.completed;

  // Real-time interview timer using recursive setTimeout (works in vm test harnesses)
  useEffect(() => {
    if (isPaused || isCompleted || !session) return;
    if (typeof setTimeout === "undefined") return;
    let timerId: ReturnType<typeof setTimeout>;
    const tick = () => {
      setSecondsElapsed((prev) => prev + 1);
      timerId = setTimeout(tick, 1000);
    };
    timerId = setTimeout(tick, 1000);
    return () => clearTimeout(timerId);
  }, [isPaused, isCompleted, session]);

  const handlePause = useCallback(() => {
    live.stop();
    setIsPaused(true);
  }, [live]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    if (textMode) return;
    hasAutoStartedRef.current = currentQuestionIndex;
    void live.start().catch((err) => {
      console.warn("Resume speech was blocked or failed:", err);
    });
  }, [live, currentQuestionIndex, textMode]);

  const handleExitClick = useCallback(() => {
    live.stop();
    setFinishError("");
    setShowExitModal(true);
  }, [live]);

  const aiState: AIState = isPaused
    ? "idle"
    : isSubmitting
    ? "thinking"
    : live.state === "speaking"
      ? "speaking"
      : live.state === "listening" || live.state === "connecting"
        ? "listening"
        : "idle";

  // 1. Auto-read question on start or when advancing to next question
  useEffect(() => {
    if (textMode || !session || session.completed || !session.currentQuestion || isPaused || showExitModal || isFinishing) return;
    if (hasAutoStartedRef.current === currentQuestionIndex) return;

    const timer = setTimeout(() => {
      if (live.state === "idle" && !isSubmitting && !session.completed && !isPaused) {
        hasAutoStartedRef.current = currentQuestionIndex;
        void live.start().catch((err) => {
          console.warn("Autoplay was blocked by browser:", err);
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [textMode, session?.id, currentQuestionIndex, live.state, isSubmitting, session?.completed, session, live, isPaused, showExitModal, isFinishing]);

  const toggleMic = () => {
    setTextMode(false);
    if (isListening) {
      live.stop();
    } else {
      hasAutoStartedRef.current = currentQuestionIndex;
      void live.start();
    }
  };

  const submitAnswer = useCallback(async (customAnswer?: string) => {
    const answerToSend = (typeof customAnswer === "string" ? customAnswer : transcript).trim();
    if (!session || !session.currentQuestion || !answerToSend || isSubmittingRef.current || finishingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    live.stop();

    try {
      const res = await fetch(`/api/interviews/${session.id}/${session.opening ? "introduction" : "answers"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          answer: answerToSend
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "An error occurred while submitting your answer.");
      }

      if (session.opening && data.saved !== true) throw new Error("Could not confirm that your introduction was saved.");
      if (data.completed) {
        setFailedAnswer(null);
        router.refresh();
        router.push(`/summary?sessionId=${session.id}`);
      } else {
        setFailedAnswer(null);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setFailedAnswer({ sessionId: session.id, index: currentQuestionIndex, text: answerToSend });
      setError(err instanceof Error ? err.message : "An error occurred.");
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setAutoFinishMessage(null);
    }
  }, [session, transcript, currentQuestionIndex, live, router]);

  // 2. Automatically detect finish phrase to complete and submit answer
  useEffect(() => {
    if (textMode || isSubmitting || isSubmittingRef.current || autoSubmitTriggeredRef.current || isPaused || showExitModal || isFinishing) return;
    if (live.clarifying || live.state !== "listening" || !transcript.trim()) return;

    const { finished, cleanText, matchedPhrase } = checkAndCleanFinishPhrase(transcript);
    if (finished) {
      const timer = setTimeout(() => {
        autoSubmitTriggeredRef.current = true;
        live.stop();
        setAutoFinishMessage(`Detected "${matchedPhrase}" - Submitting answer...`);
        void submitAnswer(cleanText);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [textMode, transcript, live.state, isSubmitting, submitAnswer, live, isPaused, showExitModal, isFinishing]);

  async function finishSession() {
    if (!session || finishingRef.current || isSubmittingRef.current || isSubmitting) return;
    finishingRef.current = true;
    setIsFinishing(true);
    setFinishError("");
    live.stop();
    try {
      const response = await fetch(`/api/interviews/${session.id}/finish`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || data.completed !== true) throw new Error(data.error || "Could not finish the interview session.");
      router.push(`/summary?sessionId=${session.id}`);
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : "Could not finish the interview session.");
      setIsFinishing(false);
      finishingRef.current = false;
    }
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-surface-container m-4 shadow-sm">
        <div className="size-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-4">
          <Icon name="history" className="text-3xl" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">No Interview Session Selected</h2>
        <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
          Please start a new interview session or resume an existing one from the Dashboard.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/interview-setup"
            className="px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-secondary font-semibold transition-colors shadow-sm"
          >
            Create New Interview
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-surface-container hover:bg-surface-container text-on-surface font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentQ = session.currentQuestion;
  const turns = session.turns;
  const lastTurn = turns[turns.length - 1];

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] w-full bg-surface text-on-surface rounded-2xl p-3 sm:p-5 overflow-hidden relative space-y-4">
      {/* 1. Header with title, language, duration and live stopwatch */}
      <InterviewHeader
        session={session}
        currentQuestionIndex={currentQuestionIndex}
        isPaused={isPaused}
        secondsElapsed={secondsElapsed}
        onPause={handlePause}
        onResume={handleResume}
        onExit={handleExitClick}
      />

      {/* Notifications / alerts */}
      {session.opening && (
        <div className="rounded-xl bg-primary-fixed border border-primary-fixed-dim p-3.5 text-xs sm:text-sm text-primary shadow-xs flex items-start gap-2.5">
          <Icon name="info" className="text-primary mt-0.5 text-base shrink-0" />
          <div>
            <strong>Opening · Self-introduction</strong>
            <p className="text-on-surface-variant text-xs mt-0.5">This introduction is saved but not graded and does not count toward your {session.total} questions. Submit when you have finished; a pause will not advance the interview.</p>
          </div>
        </div>
      )}
      {session.introduction && session.turns.length === 0 && !session.completed && (
        <p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs sm:text-sm text-emerald-800 flex items-center gap-2 shadow-xs">
          <Icon name="check_circle" className="text-emerald-600 text-base" />
          <span>{session.interviewLanguage === "ja" ? "自己紹介ありがとうございます。それでは、最初の質問です。" : "Cảm ơn bạn đã giới thiệu. Chúng ta bắt đầu câu hỏi đầu tiên nhé."}</span>
        </p>
      )}
      {session.introduction && (
        <details className="rounded-xl border border-surface-container bg-white p-3.5 text-xs text-on-surface shadow-xs">
          <summary className="cursor-pointer font-medium text-primary hover:underline">Saved self-introduction · Not graded</summary>
          <p className="mt-2 whitespace-pre-wrap text-on-surface-variant pl-2 border-l border-surface-container">{session.introduction}</p>
        </details>
      )}
      {session.practice && <WeaknessPracticeGoals practice={session.practice} />}

      {(error || session.loadError) && (
        <div className="p-3 bg-error-container border border-rose-200 text-on-error-container rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs">
          <Icon name="error" className="text-rose-600 text-base" />
          <span>{error || "Unable to load interview data. Please try again."}</span>
        </div>
      )}
      {live.error && (
        <div className="p-3 bg-error-container border border-rose-200 text-on-error-container rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs">
          <Icon name="error" className="text-rose-600 text-base" />
          <span>{live.error}</span>
        </div>
      )}
      {failedAnswer?.sessionId === session.id && failedAnswer.index === currentQuestionIndex && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs sm:text-sm text-amber-900 space-y-2 shadow-xs">
          <p>Your submitted answer was preserved. You can resubmit it without re-recording.</p>
          <details><summary className="cursor-pointer text-amber-800 font-medium">View preserved answer</summary><p className="mt-2 whitespace-pre-wrap text-amber-950">{failedAnswer.text}</p></details>
          <button type="button" disabled={isSubmitting} onClick={() => void submitAnswer(failedAnswer.text)} className="rounded-lg bg-primary px-3 py-1.5 text-white disabled:opacity-50 font-semibold text-xs shadow-xs">
            {isSubmitting ? "Grading in progress, this may take up to 2 minutes…" : "Resubmit Preserved Answer"}
          </button>
        </div>
      )}

      {/* 2. Main Workspace: Video meeting grid + Right chat panel */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 items-stretch">
        {/* Left & Center: Video Meeting Area */}
        <div className={`flex-1 flex flex-col md:flex-row gap-4 min-h-[440px] lg:min-h-0 transition-all ${showChat ? "" : "w-full"}`}>
          {/* Main Stage: AI Interviewer (dominant flex-1) */}
          <AIInterviewer
            aiState={aiState}
            question={session.currentQuestion}
            isCompleted={!!isCompleted}
            onStartSpeech={() => {
              hasAutoStartedRef.current = currentQuestionIndex;
              void live.start();
            }}
          >
            {/* If in PiP mode, CandidateTile floats inside AIInterviewer */}
            {isPip && (
              <CandidateTile
                micActive={isListening}
                isPaused={isPaused}
                transcript={transcript}
                userDisplayName="Bạn"
                isPip={true}
                onTogglePip={() => setIsPip(false)}
              />
            )}
          </AIInterviewer>

          {/* Companion Column: Candidate Tile (Compact!) + STAR Tips */}
          {!isPip && (
            <div className="w-full md:w-60 lg:w-72 shrink-0 flex flex-col gap-3">
              <CandidateTile
                micActive={isListening}
                isPaused={isPaused}
                transcript={transcript}
                userDisplayName="Bạn"
                isPip={false}
                onTogglePip={() => setIsPip(true)}
              />

              {/* Answer Tips / STAR Method right below the candidate card */}
              {currentQ && (
                <div className="flex-1 rounded-2xl bg-white border border-surface-container p-3.5 text-xs space-y-2 text-primary shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between font-semibold pb-2 border-b border-surface-container">
                      <span className="flex items-center gap-1.5 text-primary">
                        <Icon name="lightbulb" className="text-secondary text-sm" />
                        <span>Gợi ý trả lời (STAR)</span>
                      </span>
                      <span className="bg-primary-fixed text-primary px-2 py-0.5 rounded text-[10px] font-bold">
                        {currentQ.focus === "technical" ? "Technical" : currentQ.focus === "behavioral" ? "Behavioral" : "General"}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-1.5 text-[11px] text-on-surface-variant leading-relaxed">
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-secondary shrink-0">S:</span>
                        <span>Situation - Bối cảnh &amp; dự án</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-secondary shrink-0">T:</span>
                        <span>Task - Nhiệm vụ được giao</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-secondary shrink-0">A:</span>
                        <span>Action - Cách giải quyết &amp; hành động</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-secondary shrink-0">R:</span>
                        <span>Result - Kết quả định lượng</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-container text-[10px] text-on-surface-variant flex items-center justify-between">
                    <span>Chuẩn STAR / PREP</span>
                    <span className="inline-flex items-center gap-1 text-secondary font-medium">
                      <Icon name="check_circle" className="text-xs" /> Đạt chuẩn Nhật
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side: Cuộc trò chuyện (Live Chat / Transcript Panel) */}
        {showChat && (
          <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col shrink-0 min-h-[380px] lg:min-h-0 animate-in fade-in duration-200">
            <div className="flex-1 flex flex-col bg-white border border-surface-container rounded-3xl shadow-sm overflow-hidden h-full max-h-[78vh]">
              {/* Panel Header */}
              <div className="px-4 py-3 border-b border-surface-container bg-surface-container-lowest shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="forum" className="text-secondary text-base" />
                  <h2 className="text-sm font-bold text-primary tracking-wide">
                    Cuộc trò chuyện (Conversation)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChat(false)}
                  aria-label="Close conversation panel"
                  className="size-7 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors"
                >
                  <Icon name="close" className="text-base" />
                </button>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* AI Current / Live Question */}
                {currentQ && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-secondary">
                      <Icon name="smart_toy" className="text-xs" />
                      <span>Hiro (AI)</span>
                    </div>
                    <div className="bg-surface-container-low border border-surface-container p-3.5 rounded-2xl rounded-tl-sm text-xs sm:text-sm text-on-surface shadow-xs leading-relaxed">
                      <p className="font-semibold text-primary">{currentQ.text}</p>
                      {currentQ.translation && (
                        <p className="mt-1 text-xs text-on-surface-variant italic">{currentQ.translation}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Interviwer Speech Transcript */}
                {live.interviewerTranscript && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
                      <Icon name="record_voice_over" className="text-xs text-secondary" />
                      <span>Live Interviewer Stream</span>
                    </div>
                    <div className="bg-surface-container-low border border-surface-container px-3 py-2 rounded-xl text-xs text-on-surface">
                      {live.interviewerTranscript}
                    </div>
                  </div>
                )}

                {/* Previous Answer Turn Feedback */}
                {lastTurn && (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 space-y-2 animate-in fade-in text-xs text-emerald-950 shadow-xs">
                    <div className="flex items-center justify-between font-semibold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <Icon name="check_circle" className="text-sm text-emerald-600" />
                        Previous Score:
                      </span>
                      <span className="text-sm font-bold">
                        {lastTurn.score == null ? "Not graded" : `${Math.round(lastTurn.score * 100) / 100}/10`}
                        {lastTurn.rubric?.provisional ? " (provisional)" : ""}
                      </span>
                    </div>
                    <p className="italic bg-white/70 p-2 rounded-lg border border-emerald-200/60 text-emerald-900">&ldquo;{lastTurn.answer}&rdquo;</p>
                    <div className="pt-1.5 border-t border-emerald-200/60 space-y-1">
                      <p><strong>Feedback:</strong> {lastTurn.feedback}</p>
                      {lastTurn.rubric && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-emerald-800 hover:underline font-medium">View Rubric Breakdown</summary>
                          <div className="mt-2 text-on-surface">
                            <RubricDetails rubric={lastTurn.rubric} />
                            <p className="mt-1 text-[11px] text-emerald-800">Practice: {lastTurn.rubric.practice}</p>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                )}

                {/* Current Live Answer Draft */}
                {transcript && (
                  <div className="space-y-1 ml-auto max-w-[90%]">
                    <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold text-primary">
                      <span>Bạn</span>
                      <Icon name="person" className="text-xs" />
                    </div>
                    <div className="bg-primary text-white p-3 rounded-2xl rounded-tr-sm text-xs sm:text-sm shadow-xs leading-relaxed whitespace-pre-wrap">
                      {transcript}
                    </div>
                  </div>
                )}

                {/* Answer Tips / STAR Method */}
                {currentQ && (
                  <div className="bg-primary-fixed border border-primary-fixed-dim rounded-xl p-3 text-xs space-y-2 text-primary shadow-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Icon name="lightbulb" className="text-sm" />
                        <span>Answer Tips</span>
                      </span>
                      <span className="bg-white/60 text-primary-fixed-variant px-2 py-0.5 rounded text-[10px]">
                        {currentQ.focus === "technical" ? "Technical" : currentQ.focus === "behavioral" ? "Behavioral" : "General"}
                      </span>
                    </div>
                    <ul className="text-[11px] text-on-surface-variant space-y-1 list-disc pl-4">
                      <li><strong>S</strong>ituation: Bối cảnh vấn đề</li>
                      <li><strong>T</strong>ask: Mục tiêu và vai trò của bạn</li>
                      <li><strong>A</strong>ction: Hành động cụ thể đã làm</li>
                      <li><strong>R</strong>esult: Kết quả định lượng đạt được</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Input / Control Footer inside chat */}
              {!session.completed && (
                <div className="border-t border-surface-container p-3 bg-white space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-primary">
                      <input
                        type="checkbox"
                        checked={textMode}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          live.stop();
                          setTextMode(event.target.checked);
                        }}
                        className="rounded border-surface-container text-primary"
                      />
                      <span>Type instead of speaking</span>
                    </label>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => live.setClarificationMode(!live.clarifying)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors border ${
                        live.clarifying ? "bg-amber-100 text-amber-900 border-amber-300" : "border-surface-container text-on-surface-variant hover:bg-surface-container hover:text-primary"
                      }`}
                    >
                      {live.clarifying ? "Clarifying..." : "Ask Clarification"}
                    </button>
                  </div>

                  {textMode && (
                    <div className="relative">
                      <label htmlFor="typed-answer" className="sr-only">{session.opening ? "Your self-introduction" : "Your answer"}</label>
                      <textarea
                        id="typed-answer"
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="Nhập câu trả lời... (Type answer here)"
                        maxLength={10000}
                        disabled={isSubmitting || isPaused}
                        rows={3}
                        className="w-full rounded-xl bg-surface border border-surface-container p-2.5 pr-10 text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary resize-none shadow-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Meeting Control Toolbar (Contains onSubmit/onSkip queried by tests) */}
      <InterviewControls
        opening={session.opening}
        clarifying={live.clarifying}
        isCompleted={!!isCompleted}
        isPaused={isPaused}
        micActive={isListening}
        showChat={showChat}
        onToggleMic={toggleMic}
        onToggleChat={() => setShowChat(!showChat)}
        onToggleClarify={() => live.setClarificationMode(!live.clarifying)}
        transcript={transcript}
        isSubmitting={isSubmitting}
        onSubmit={() => void submitAnswer()}
        onSkip={session.opening ? undefined : () => void submitAnswer("Candidate skipped this question.")}
        onExit={handleExitClick}
        sessionId={session.id}
        autoFinishMessage={autoFinishMessage}
      />

      {/* Progress Line */}
      <InterviewProgress current={currentQuestionIndex} total={session.total} />

      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-40 bg-surface/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="size-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-4 shadow-sm ring-2 ring-amber-300 animate-pulse">
            <Icon name="pause" className="text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-primary mb-2">Interview Paused</h3>
          <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
            Microphone is paused and your session is held at question {Math.min(currentQuestionIndex + 1, session.total)}. Take a break and click Resume when ready.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleResume}
              className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-secondary font-semibold transition-all shadow-md flex items-center gap-2"
            >
              <Icon name="play_arrow" />
              <span>Resume</span>
            </button>
            <button
              type="button"
              onClick={handleExitClick}
              className="px-5 py-2.5 rounded-xl border border-surface-container hover:bg-surface-container text-on-surface font-medium transition-colors flex items-center gap-2"
            >
              <Icon name="logout" className="text-sm" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white text-on-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-container space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Icon name="warning" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Pause &amp; Exit Interview?</h3>
                <p className="text-xs text-on-surface-variant">You are at question {Math.min(currentQuestionIndex + 1, session.total)} / {session.total}</p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              {session.turns.length > 0
                ? `You have completed ${session.turns.length} question(s). All previous answers have been saved automatically. You can resume anytime from the Dashboard.`
                : `You have not completed any questions yet. If you exit now, you can return and practice anytime from the Dashboard.`}
            </p>

            {session.turns.length > 0 && <p className="text-xs text-on-surface-variant">Ending early will summarize only the {session.turns.length}/{session.total} submitted question(s). Ongoing or unsubmitted answers will not be counted.</p>}
            {finishError && <p role="alert" className="rounded-lg bg-error-container p-3 text-xs text-on-error-container">{finishError}</p>}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  live.stop();
                  router.push("/dashboard");
                }}
                disabled={isFinishing}
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-white hover:bg-secondary font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Icon name="dashboard" />
                <span>Save Progress &amp; Go to Dashboard</span>
              </button>

              {session.turns.length > 0 && (
                <button
                  type="button"
                  onClick={() => void finishSession()}
                  disabled={isFinishing || isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-surface-container hover:bg-surface-container text-primary font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="assessment" />
                  <span>{isFinishing ? "Ending session..." : "End Early & View Results"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                disabled={isFinishing}
                className="w-full py-2 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container text-sm font-medium transition-colors"
              >
                Stay &amp; Continue Practice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InterviewHeader({
  session,
  currentQuestionIndex,
  isPaused,
  secondsElapsed,
  onPause,
  onResume,
  onExit,
}: {
  session: RoomSession;
  currentQuestionIndex: number;
  isPaused: boolean;
  secondsElapsed: number;
  onPause: () => void;
  onResume: () => void;
  onExit: () => void;
}) {
  const cleanTitle = session.title.replace(/^Interview\s*(Room|Session)?\s*[-:]?\s*/i, "");
  const roleDisplay = cleanTitle ? `Luyện tập phỏng vấn vị trí ${cleanTitle}` : session.title;
  const minutes = Math.floor(secondsElapsed / 60);
  const seconds = secondsElapsed % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex items-center justify-between shrink-0 flex-wrap gap-3 pb-2 border-b border-surface-container">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight flex items-center gap-2">
          <span>{roleDisplay}</span>
        </h1>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <Icon name="history" className="text-sm text-secondary" />
            <span>{session.total ? `${session.total * 3} phút` : "10 phút"}</span>
          </span>
          <span className="text-surface-container-highest">·</span>
          <span className="flex items-center gap-1.5">
            <Icon name="translate" className="text-sm text-secondary" />
            <span>{session.interviewLanguage === 'ja' ? 'Japanese' : 'English / Vietnamese'}</span>
          </span>
          <span className="text-surface-container-highest">·</span>
          <span className="flex items-center gap-1.5 text-secondary font-mono font-semibold">
            <Icon name="graphic_eq" className="text-sm text-secondary" />
            <span>{timeFormatted}</span>
          </span>
          <span className="text-surface-container-highest">·</span>
          <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
            {session.opening ? "Opening · Self-introduction" : `Question ${Math.min(currentQuestionIndex + 1, session.total)} / ${session.total}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isPaused ? onResume : onPause}
          disabled={session.completed}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-xs ${
            isPaused
              ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse"
              : "bg-white hover:bg-surface-container text-on-surface border-surface-container"
          }`}
          title={isPaused ? "Resume interview" : "Pause interview"}
        >
          <Icon name={isPaused ? "play_arrow" : "pause"} className="text-sm" />
          <span>{isPaused ? "Resume" : "Pause"}</span>
        </button>

        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all shadow-xs"
          title="Leave interview room"
        >
          <Icon name="logout" className="text-sm" />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
}

function AIInterviewer({
  aiState,
  question,
  isCompleted,
  onStartSpeech,
  children,
}: {
  aiState: AIState;
  question: StoredQuestion | null;
  isCompleted: boolean;
  onStartSpeech?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 min-h-[380px] sm:min-h-[440px] rounded-3xl bg-white border border-surface-container shadow-sm overflow-hidden flex flex-col justify-between p-4">
      {/* Background Atmosphere */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: "url('/interview-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/40" />

      {/* Top Badge: AI Status */}
      <div className="relative z-10 flex items-center justify-between">
        <AIStatus aiState={aiState} />
        {question && !isCompleted && aiState === "idle" && onStartSpeech && (
          <button
            onClick={onStartSpeech}
            className="px-3 py-1.5 bg-secondary text-on-secondary hover:bg-secondary/90 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Icon name="volume_up" className="text-xs" /> <span>Listen to AI question</span>
          </button>
        )}
      </div>

      {/* 3D Avatar Center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <VrmAvatar
          state={aiState === "idle" ? "idle" : aiState}
          className="h-full w-full min-h-0 rounded-none"
        />
      </div>

      {/* Bottom Left: AI Name Tag */}
      <div className="relative z-10 flex items-center justify-between pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-surface-container text-primary text-xs font-bold shadow-xs">
          <Icon name="smart_toy" className="text-secondary text-sm" />
          <span>Hiro (AI Interviewer)</span>
        </div>
      </div>

      {/* Optional PiP element */}
      {children}
    </div>
  );
}

function AIStatus({ aiState }: { aiState: AIState }) {
  const isSpeaking = aiState === "speaking";
  const isListening = aiState === "listening";
  const isThinking = aiState === "thinking";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/85 backdrop-blur-md text-white border border-white/20 shadow-sm transition-all duration-300">
      <div className="relative flex items-center justify-center size-2.5">
        {(isSpeaking || isListening) && (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isSpeaking ? "bg-[#a4f2e5]" : "bg-emerald-400"}`}></span>
        )}
        <span
          className={`relative inline-flex rounded-full size-2 transition-colors ${
            isSpeaking ? "bg-[#a4f2e5]" :
            isThinking ? "bg-[#f2caa4]" :
            isListening ? "bg-[#ffdad6]" :
            "bg-[#a4cbff]"
          }`}
        ></span>
      </div>
      <span className="text-xs font-semibold tracking-wide">
        {isSpeaking
          ? "AI Speaking"
          : isListening
            ? "Đang lắng nghe bạn (AI Listening...)"
            : isThinking
            ? "AI Thinking..."
            : "AI Ready"}
      </span>
      {isSpeaking && (
        <div className="flex gap-0.5 ml-1 h-3 items-end">
          <div className="w-[2px] bg-white h-full animate-pulse"></div>
          <div className="w-[2px] bg-white h-2/3 animate-pulse" style={{ animationDelay: "100ms" }}></div>
          <div className="w-[2px] bg-white h-1/2 animate-pulse" style={{ animationDelay: "200ms" }}></div>
          <div className="w-[2px] bg-white h-4/5 animate-pulse" style={{ animationDelay: "300ms" }}></div>
        </div>
      )}
    </div>
  );
}

function CandidateTile({
  micActive,
  isPaused,
  transcript,
  userDisplayName = "Bạn",
  isPip = false,
  onTogglePip,
}: {
  micActive: boolean;
  isPaused: boolean;
  transcript: string;
  userDisplayName?: string;
  isPip?: boolean;
  onTogglePip?: () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl bg-white border border-surface-container shadow-sm overflow-hidden flex flex-col justify-between p-3.5 transition-all ${
        isPip
          ? "absolute bottom-4 right-4 z-20 w-56 sm:w-64 h-36 sm:h-40 bg-white/95 backdrop-blur-md shadow-lg"
          : "w-full h-44 sm:h-48 shrink-0"
      }`}
    >
      {/* Background glow when speaking */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
          micActive && !isPaused
            ? "bg-radial from-emerald-500/10 via-transparent to-transparent opacity-100"
            : "opacity-0"
        }`}
      />

      {/* Top Status: Camera Off Notice (Chế độ âm thanh) + PiP toggle */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-medium border border-surface-container-high shadow-2xs">
          <span className="relative inline-flex items-center justify-center">
            <Icon name="videocam" className="text-xs text-on-surface-variant opacity-70" />
            <span className="absolute inset-0 flex items-center justify-center text-rose-500 font-bold text-[10px] select-none">/</span>
          </span>
          <span>Camera tắt (Audio only)</span>
        </div>

        {onTogglePip && (
          <button
            type="button"
            onClick={onTogglePip}
            title={isPip ? "Mở rộng sang khung bên" : "Thu nhỏ vào góc (PiP)"}
            className="size-6 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors"
          >
            <Icon name={isPip ? "open_in_new" : "tune"} className="text-xs" />
          </button>
        )}
      </div>

      {/* Center: Candidate Avatar with Audio Ripple */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          {/* Animated glow rings when speaking */}
          {micActive && !isPaused && (
            <>
              <span className="absolute size-24 sm:size-28 rounded-full bg-emerald-500/10 animate-ping opacity-50"></span>
              <span className="absolute size-20 sm:size-24 rounded-full border border-emerald-500/30 animate-pulse"></span>
            </>
          )}
          <div
            className={`size-16 sm:size-20 rounded-full bg-surface-container-low border-2 transition-all flex items-center justify-center shadow-xs ${
              micActive && !isPaused
                ? "border-emerald-500 ring-2 ring-emerald-500/20"
                : "border-surface-container-high"
            }`}
          >
            <Icon
              name="person"
              className={`text-3xl sm:text-4xl transition-colors ${
                micActive && !isPaused ? "text-emerald-600" : "text-primary"
              }`}
            />
          </div>
        </div>

        {/* Real-time Subtitle Preview if user is speaking */}
        {transcript && (
          <div className="mt-1.5 max-w-full px-2.5 py-0.5 rounded-xl bg-surface-container-lowest border border-surface-container text-center shadow-2xs animate-in fade-in">
            <p className="text-[11px] text-on-surface italic line-clamp-1 truncate">&ldquo;{transcript}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Bottom Left: Name Tag with Mic Status */}
      <div className="relative z-10 flex items-center justify-between pt-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md border border-surface-container text-primary text-xs font-bold shadow-2xs">
          <span
            className={`size-2 rounded-full ${
              micActive && !isPaused ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            }`}
          />
          <Icon
            name="mic"
            className={`text-xs ${
              micActive && !isPaused ? "text-emerald-600" : "text-rose-500 opacity-70"
            }`}
          />
          <span>{userDisplayName}</span>
        </div>
      </div>
    </div>
  );
}

function InterviewControls({
  opening,
  clarifying,
  isCompleted,
  isPaused,
  micActive,
  showChat,
  onToggleMic,
  onToggleChat,
  onToggleClarify,
  transcript,
  isSubmitting,
  onSubmit,
  onSkip,
  onExit,
  sessionId,
  autoFinishMessage,
}: {
  opening?: boolean;
  clarifying: boolean;
  isCompleted: boolean;
  isPaused?: boolean;
  micActive: boolean;
  showChat: boolean;
  onToggleMic: () => void;
  onToggleChat: () => void;
  onToggleClarify: () => void;
  transcript: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  onSkip?: () => void;
  onExit: () => void;
  sessionId: string;
  autoFinishMessage?: string | null;
}) {
  if (isCompleted) {
    return (
      <div className="shrink-0 h-16 bg-white border border-surface-container rounded-2xl flex items-center justify-center px-4 shadow-sm">
        <Link href={`/summary?sessionId=${sessionId}`} className="px-5 py-2 bg-primary text-white hover:bg-secondary rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-sm text-xs sm:text-sm">
          <span>View Score Summary</span> <Icon name="arrow_forward" className="text-sm" />
        </Link>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex flex-col items-center justify-center gap-2 pt-1 pb-1">
      {/* Toast message if auto finish triggered */}
      {autoFinishMessage && (
        <div className="whitespace-nowrap bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md animate-bounce flex items-center gap-1.5 z-20">
          <Icon name="check_circle" className="text-white text-sm" />
          <span>{autoFinishMessage}</span>
        </div>
      )}

      {/* Floating meeting action bar */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full bg-white/95 border border-surface-container shadow-md backdrop-blur-md flex-wrap justify-center">
        {/* 1. Mic toggle button */}
        <button
          type="button"
          onClick={onToggleMic}
          disabled={isSubmitting || isPaused}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all shadow-xs ${
            micActive
              ? "bg-primary text-white hover:bg-secondary"
              : "bg-surface-container hover:bg-surface-container-high text-on-surface"
          } disabled:opacity-50`}
          title={isPaused ? "Interview is paused" : "Toggle Microphone"}
        >
          <Icon name="mic" className={micActive ? "text-emerald-300 animate-pulse" : ""} />
          <span>{micActive ? "Đang bật mic" : "Bật mic"}</span>
        </button>

        {/* 2. Camera button (Disabled/Off, matching user requirement: không có bật cam) */}
        <button
          type="button"
          disabled
          aria-label="Camera đang tắt"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant border border-surface-container cursor-default opacity-85"
          title="Camera is disabled (Chế độ âm thanh)"
        >
          <span className="relative inline-flex items-center justify-center">
            <Icon name="videocam" className="text-sm text-on-surface-variant opacity-70" />
            <span className="absolute inset-0 flex items-center justify-center text-rose-500 font-bold text-xs select-none">/</span>
          </span>
          <span className="hidden sm:inline">Camera tắt</span>
        </button>

        {/* 3. Audio Clarification toggle */}
        <button
          type="button"
          onClick={onToggleClarify}
          disabled={isSubmitting || isPaused}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
            clarifying
              ? "bg-amber-100 text-amber-900 border border-amber-300"
              : "bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container"
          } disabled:opacity-50`}
          title="Ask AI to clarify terms or question"
        >
          <Icon name="help" className="text-sm" />
          <span className="hidden sm:inline">{clarifying ? "Đang hỏi lại" : "Hỏi lại (Clarify)"}</span>
        </button>

        {/* 4. Chat Toggle button */}
        <button
          type="button"
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
            showChat
              ? "bg-primary-fixed text-primary border border-primary-fixed-dim font-bold"
              : "bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container"
          }`}
          title="Toggle conversation panel"
        >
          <Icon name="forum" className="text-sm" />
          <span>{showChat ? "Ẩn cuộc trò chuyện" : "Xem cuộc trò chuyện"}</span>
        </button>

        {/* 5. End / Exit button */}
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-xs transition-all"
          title="Kết thúc phỏng vấn"
        >
          <Icon name="logout" className="text-sm" />
          <span>Exit</span>
        </button>

        {/* Submit action button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || isPaused || clarifying || !transcript.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-40"
          title="Submit Answer"
        >
          {isSubmitting ? (
            <>
              <Icon name="autorenew" className="animate-spin text-sm" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Icon name="send" className="text-sm" />
              <span>{opening ? "Save Introduction & Start Questions" : "Submit Answer"}</span>
            </>
          )}
        </button>

        {/* Skip button if available */}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting || isPaused || clarifying}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-on-surface-variant hover:text-primary transition-colors disabled:opacity-40"
            title="Skip this question"
          >
            <span>Skip question</span>
            <Icon name="arrow_forward" className="text-xs" />
          </button>
        )}
      </div>

      {/* Sub-hint below toolbar */}
      <p className="text-[11px] text-on-surface-variant text-center px-4">
        Giữ phím <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface border border-surface-container-high font-mono text-[10px]">Space</kbd> khi nói hoặc nói &ldquo;以上です&rdquo; / &ldquo;That&apos;s all&rdquo; để hoàn thành câu trả lời.
      </p>
    </div>
  );
}

function InterviewProgress({ current, total }: { current: number, total: number }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="shrink-0 pt-1 pb-1">
      <div className="flex justify-between items-center mb-1 text-[11px] text-on-surface-variant font-medium px-1">
        <span>Tiến độ phỏng vấn: {current} / {total} câu</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
