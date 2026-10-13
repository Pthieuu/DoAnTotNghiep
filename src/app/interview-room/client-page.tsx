"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/icon";
import VrmAvatar from "@/components/vrm-avatar";
import { useGeminiLiveInterview } from "@/hooks/useGeminiLiveInterview";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RubricDetails from "@/components/rubric-details";
import type { RubricResult } from "@/lib/interview-rubric";

type AIState = "idle" | "speaking" | "listening" | "thinking";

type StoredQuestion = { text: string; translation: string; focus?: string };

type StoredTurn = { question: StoredQuestion; answer: string; score?: number | null; feedback?: string; rubric?: RubricResult | null };
type RoomSession = { 
  id: string; title: string; company: string | null; level: string | null; 
  interviewType: string; interviewLanguage: string;
  total: number; currentQuestion: StoredQuestion | null; turns: StoredTurn[]; 
  completed: boolean; loadError?: "session" | "answers" 
};

function checkAndCleanFinishPhrase(text: string): { finished: boolean; cleanText: string; matchedPhrase: string } {
  const trimmed = text.trim();
  if (!trimmed) return { finished: false, cleanText: "", matchedPhrase: "" };

  const endPatterns = [
    { regex: /[\s,.]*(?:dạ\s+)?(?:tôi|em|mình)\s+xin\s+hết(?:\s*ạ)?[\s.!,?]*$/i, phrase: "Tôi xin hết" },
    { regex: /[\s,.]*(?:dạ\s+)?xin\s+hết(?:\s*ạ)?[\s.!,?]*$/i, phrase: "Xin hết" },
    { regex: /[\s,.]*(?:dạ\s+)?(?:tôi|em|mình)\s+đã\s+trả\s+lời\s+xong(?:\s*ạ)?[\s.!,?]*$/i, phrase: "Tôi đã trả lời xong" },
    { regex: /[\s,.]*(?:dạ\s+)?(?:tôi|em|mình)\s+xin\s+kết\s+thúc(?:\s+câu\s+trả\s+lời)?(?:\s*ạ)?[\s.!,?]*$/i, phrase: "Tôi xin kết thúc" },
    { regex: /[\s,.]*(?:これで)?以上(?:です|になります)[\s.!,?]*$/i, phrase: "以上です" },
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
  const router = useRouter();
  const [showTranslation, setShowTranslation] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFinishMessage, setAutoFinishMessage] = useState<string | null>(null);
  const [error, setError] = useState("");

  const live = useGeminiLiveInterview(session?.id, session?.turns.length ?? 0, session?.currentQuestion?.text);
  const transcript = live.candidateTranscript;
  const isListening = live.state === "listening" || live.state === "speaking" || live.state === "connecting";

  // Keep track of current state
  const currentQuestionIndex = session ? session.turns.length : 0;
  const isCompleted = session?.completed;
  
  const aiState: AIState = isSubmitting
    ? "thinking"
    : live.state === "speaking"
      ? "speaking"
      : live.state === "listening" || live.state === "connecting"
        ? "listening"
        : "idle";

  const hasAutoStartedRef = useRef<number | null>(null);
  const autoSubmitTriggeredRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Reset auto-finish flags when question changes
  useEffect(() => {
    autoSubmitTriggeredRef.current = false;
    isSubmittingRef.current = false;
    setAutoFinishMessage(null);
  }, [currentQuestionIndex]);

  // 1. Tự động đọc câu hỏi khi bắt đầu hoặc khi chuyển câu hỏi mới
  useEffect(() => {
    if (!session || session.completed || !session.currentQuestion) return;
    if (hasAutoStartedRef.current === currentQuestionIndex) return;

    const timer = setTimeout(() => {
      if (live.state === "idle" && !isSubmitting && !session.completed) {
        hasAutoStartedRef.current = currentQuestionIndex;
        void live.start().catch((err) => {
          console.warn("Autoplay was blocked by browser:", err);
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [session?.id, currentQuestionIndex, live.state, isSubmitting, session?.completed, session, live]);

  const toggleMic = () => {
    if (isListening) {
      live.stop();
    } else {
      hasAutoStartedRef.current = currentQuestionIndex;
      void live.start();
    }
  };

  const submitAnswer = useCallback(async (customAnswer?: string) => {
    const answerToSend = (typeof customAnswer === "string" ? customAnswer : transcript).trim();
    if (!session || !session.currentQuestion || !answerToSend || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    live.stop();

    try {
      const res = await fetch(`/api/interviews/${session.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          answer: answerToSend
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi gửi câu trả lời.");
      }

      if (data.completed) {
        router.refresh();
        router.push(`/summary?sessionId=${session.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setAutoFinishMessage(null);
    }
  }, [session, transcript, currentQuestionIndex, live, router]);

  // 2. Tự động nhận diện câu "Tôi xin hết" để kết thúc và gửi câu trả lời
  useEffect(() => {
    if (isSubmitting || isSubmittingRef.current || autoSubmitTriggeredRef.current) return;
    if (live.state !== "listening" || !transcript.trim()) return;

    const { finished, cleanText, matchedPhrase } = checkAndCleanFinishPhrase(transcript);
    if (finished) {
      autoSubmitTriggeredRef.current = true;
      live.stop();
      setAutoFinishMessage(`Đã nhận diện "${matchedPhrase}" - Đang gửi câu trả lời...`);
      void submitAnswer(cleanText);
    }
  }, [transcript, live.state, isSubmitting, submitAnswer, live]);

  if (!session) {
    return <div className="p-8 text-center text-on-surface-variant">Đang tải phòng phỏng vấn...</div>;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] w-full bg-surface space-y-4 p-4 lg:p-6 overflow-hidden">
      <InterviewHeader session={session} currentQuestionIndex={currentQuestionIndex} />

      {(error || session.loadError) && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium">{error || "Không thể tải dữ liệu phỏng vấn. Vui lòng thử lại."}</div>}
      {live.error && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium">{live.error}</div>}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Main Content: AI Interviewer */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden relative shrink-0">
          <AIInterviewer
            aiState={aiState}
            question={session.currentQuestion}
            showTranslation={showTranslation}
            onToggleTranslation={() => setShowTranslation(!showTranslation)}
            isCompleted={!!isCompleted}
            onStartSpeech={() => {
              hasAutoStartedRef.current = currentQuestionIndex;
              void live.start();
            }}
          />
          <InterviewControls
            isCompleted={!!isCompleted}
            micActive={isListening}
            onToggleMic={toggleMic}
            transcript={transcript}
            isSubmitting={isSubmitting}
            onSubmit={() => void submitAnswer()}
            onSkip={() => void submitAnswer("Ứng viên bỏ qua câu hỏi này.")}
            sessionId={session.id}
            autoFinishMessage={autoFinishMessage}
          />
        </div>

        {/* Bottom Panel / Side Panel */}
        <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
          <InterviewSidePanel session={session} transcript={transcript} interviewerTranscript={live.interviewerTranscript} />
        </div>
      </div>

      <InterviewProgress current={currentQuestionIndex} total={session.total} />
    </div>
  );
}

function InterviewHeader({ session, currentQuestionIndex }: { session: RoomSession; currentQuestionIndex: number }) {
  return (
    <div className="flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-headline-md font-bold text-primary">
          {session.title}
        </h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary text-[10px] font-semibold tracking-wide uppercase">
            {session.interviewType}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-semibold uppercase">
            {session.interviewLanguage === 'ja' ? 'Tiếng Nhật' : 'Tiếng Việt'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-semibold">
            Câu {Math.min(currentQuestionIndex + 1, session.total)} / {session.total}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-surface-container shadow-sm shrink-0">
        <Icon name="history" />
        <span className="text-label-lg font-semibold tabular-nums text-primary">
          Thực hành
        </span>
      </div>
    </div>
  );
}

function AIInterviewer({
  aiState,
  question,
  showTranslation,
  onToggleTranslation,
  isCompleted,
  onStartSpeech,
}: {
  aiState: AIState;
  question: StoredQuestion | null;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  isCompleted: boolean;
  onStartSpeech?: () => void;
}) {
  return (
    <div className="relative flex-1 flex flex-col bg-surface-container-lowest overflow-hidden min-h-[300px]">
      {/* AI Status */}
      <div className="absolute top-4 left-4 z-10">
        <AIStatus aiState={aiState} />
      </div>

      {/* Avatar Area */}
      <div 
        className="flex-1 relative flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/interview-bg.jpg')" }}
      >
        <VrmAvatar
          state={aiState === "idle" ? "idle" : aiState}
          className="absolute inset-0 h-full min-h-0 rounded-none"
        />
        {/* Subtitle Overlay */}
        {question && !isCompleted && (
          <div className="absolute bottom-4 left-4 z-10 flex max-w-2xl flex-col items-start animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="bg-primary/85 backdrop-blur-md rounded-2xl p-3 lg:p-4 text-left shadow-lg border border-white/10">
              <p className="text-white text-base lg:text-lg font-medium leading-relaxed">
                {question.text}
              </p>
              {showTranslation && (
                <p className="text-secondary-fixed mt-2 text-sm lg:text-base border-t border-white/20 pt-2">
                  {question.translation}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={onToggleTranslation}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs font-medium transition-colors"
                >
                  {showTranslation ? "Ẩn bản dịch" : "Hiện bản dịch"}
                </button>
                {aiState === "idle" && onStartSpeech && (
                  <button
                    onClick={onStartSpeech}
                    className="px-3 py-1.5 bg-secondary text-on-secondary hover:bg-secondary/90 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Icon name="volume_up" /> Nghe AI đọc câu hỏi
                  </button>
                )}
                {aiState === "listening" && (
                  <span className="text-[11px] text-white/90 bg-emerald-950/60 border border-emerald-400/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Nói <b>&quot;Tôi xin hết&quot;</b> để tự động kết thúc câu trả lời
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AIStatus({ aiState }: { aiState: AIState }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/80 backdrop-blur-md text-white border border-white/10 shadow-sm transition-all duration-300">
      <div className="relative flex items-center justify-center size-3">
        {aiState === "speaking" && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#a4f2e5] opacity-75 animate-ping"></span>
        )}
        <span
          className={`relative inline-flex rounded-full size-2 transition-colors ${
            aiState === "speaking" ? "bg-[#a4f2e5]" : 
            aiState === "thinking" ? "bg-[#f2caa4]" : 
            aiState === "listening" ? "bg-[#ffdad6]" :
            "bg-[#a4cbff]"
          }`}
        ></span>
      </div>
      <span className="text-label-sm font-semibold tracking-wide">
        {aiState === "speaking"
          ? "AI Đang nói"
          : aiState === "listening"
            ? "AI Đang nghe..."
            : aiState === "thinking"
            ? "AI Đang phân tích..."
            : "AI Sẵn sàng"}
      </span>
      {aiState === "speaking" && (
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

function CandidateCamera() {
  return (
    <div className="absolute bottom-[104px] right-6 w-32 h-24 lg:w-48 lg:h-32 bg-surface-container-highest rounded-xl border-2 border-white/20 shadow-xl overflow-hidden flex flex-col z-10">
      <div className="flex-1 flex items-center justify-center text-on-surface-variant bg-surface">
        <Icon name="person" />
      </div>
      <div className="absolute bottom-1.5 left-2 bg-primary/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium backdrop-blur-sm">
        Bạn
      </div>
    </div>
  );
}

function InterviewControls({
  isCompleted,
  micActive,
  onToggleMic,
  transcript,
  isSubmitting,
  onSubmit,
  sessionId,
  autoFinishMessage,
  onSkip,
}: {
  isCompleted: boolean;
  micActive: boolean;
  onToggleMic: () => void;
  transcript: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  onSkip?: () => void;
  sessionId: string;
  autoFinishMessage?: string | null;
}) {
  if (isCompleted) {
    return (
      <div className="shrink-0 h-20 bg-white border-t border-surface-container flex items-center justify-center px-4 lg:px-6">
        <Link href={`/summary?sessionId=${sessionId}`} className="px-6 py-2.5 bg-primary text-white hover:bg-secondary rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-md">
          Xem bảng tổng kết điểm <Icon name="arrow_forward" />
        </Link>
      </div>
    );
  }

  return (
    <div className="shrink-0 min-h-20 bg-white border-t border-surface-container flex flex-col sm:flex-row items-center justify-between px-4 py-2 sm:py-0 lg:px-6 gap-2">
      <div className="flex-1 w-full flex items-center gap-2 justify-center sm:justify-start">
        {onSkip && (
          <button
            onClick={onSkip}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg font-medium transition-colors flex items-center gap-1.5 border border-surface-container disabled:opacity-50"
            title="Bỏ qua câu hỏi này để chuyển ngay sang câu tiếp theo"
          >
            <span>Bỏ qua câu này</span>
            <Icon name="arrow_forward" className="text-xs" />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center justify-center shrink-0 w-64 gap-1 relative">
        {autoFinishMessage && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg animate-bounce flex items-center gap-1.5 z-20">
            <Icon name="check_circle" className="text-white text-sm" />
            <span>{autoFinishMessage}</span>
          </div>
        )}
        <button
          onClick={onToggleMic}
          disabled={isSubmitting}
          className={`p-4 rounded-full transition-all duration-300 flex items-center justify-center transform hover:scale-105 disabled:opacity-50 disabled:scale-100 ${
            autoFinishMessage
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 animate-pulse"
              : micActive
              ? "bg-error text-white shadow-lg shadow-error/30"
              : "bg-primary text-white shadow-md hover:bg-primary-container hover:text-primary"
          }`}
        >
          <Icon name="mic" className={micActive || autoFinishMessage ? "animate-pulse" : ""} />
        </button>
        <span
          className={`text-[10px] font-medium transition-colors text-center ${
            autoFinishMessage
              ? "text-emerald-600 font-bold"
              : micActive
              ? "text-error"
              : "text-on-surface-variant"
          }`}
        >
          {autoFinishMessage
            ? "Đang hoàn tất câu trả lời..."
            : micActive
            ? "Đang thu âm (Nói 'Tôi xin hết' để gửi)"
            : "Bấm để trả lời / nghe lại"}
        </span>
      </div>

      <div className="flex-1 w-full flex items-center justify-center sm:justify-end gap-1 lg:gap-3">
        <button 
          onClick={onSubmit}
          disabled={isSubmitting || !transcript.trim()}
          className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-surface-container disabled:text-on-surface-variant rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
        >
          {isSubmitting ? <><Icon name="autorenew" className="animate-spin" /> Gửi...</> : <><Icon name="send" /> Gửi câu trả lời</>}
        </button>
      </div>
    </div>
  );
}

function InterviewProgress({ current, total }: { current: number, total: number }) {
  const percentage = Math.round((current / total) * 100);
  return (
    <div className="shrink-0 pt-2 pb-2">
      <div className="flex justify-between items-center mb-1 text-label-sm text-on-surface-variant font-medium px-1">
        <span>Tiến độ: {current} / {total} câu</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function InterviewSidePanel({ session, transcript, interviewerTranscript }: { session: RoomSession, transcript: string, interviewerTranscript: string }) {
  const currentQ = session.currentQuestion;
  const turns = session.turns;
  const lastTurn = turns[turns.length - 1];

  return (
    <div className="flex-1 flex flex-col bg-white border border-surface-container rounded-2xl shadow-sm overflow-hidden h-full max-h-[75vh]">
      <div className="px-4 py-3 border-b border-surface-container bg-surface-container-lowest shrink-0 flex items-center gap-2">
        <Icon name="analytics" className="text-secondary" />
        <h2 className="text-title font-semibold text-primary">
          Hội thoại trực tiếp
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {interviewerTranscript && (
          <div>
            <h3 className="text-label-sm font-semibold text-secondary mb-3 flex items-center gap-1.5">
              <Icon name="record_voice_over" className="text-[14px]" /> Phỏng vấn viên
            </h3>
            <div className="bg-surface-container-low px-3 py-2 rounded-2xl rounded-tl-sm text-body-sm shadow-sm leading-relaxed">
              {interviewerTranscript}
            </div>
          </div>
        )}
        
        {/* Current Answer Draft */}
        {transcript && (
          <div>
            <h3 className="text-label-sm font-semibold text-primary mb-3 flex items-center gap-1.5">
              <Icon name="mic" className="text-[14px]" /> Đang trả lời...
            </h3>
            <div className="bg-primary text-white px-3 py-2 rounded-2xl rounded-tr-sm text-body-sm shadow-sm leading-relaxed">
              {transcript}
            </div>
          </div>
        )}

        {/* Previous Answer Feedback */}
        {lastTurn && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 animate-in fade-in">
            <h3 className="text-label-sm font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
              <Icon name="check_circle" className="text-[16px]" /> Điểm câu trước: <span className="text-lg">{lastTurn.score == null ? "Chưa chấm" : `${Math.round(lastTurn.score * 100) / 100}/10`}{lastTurn.rubric?.provisional ? " (tạm tính)" : ""}</span>
            </h3>
            <div className="space-y-2 text-sm text-emerald-900">
              <p className="font-medium bg-white/50 p-2 rounded-lg">&ldquo;{lastTurn.answer}&rdquo;</p>
              <div className="pt-2 border-t border-emerald-200/50">
                <p className="whitespace-pre-line"><strong>Nhận xét:</strong> {lastTurn.feedback}</p>
                {lastTurn.rubric && <details><summary className="cursor-pointer">Xem chi tiết tiêu chí</summary><RubricDetails rubric={lastTurn.rubric} /><p>Luyện lại: {lastTurn.rubric.practice}</p></details>}
              </div>
            </div>
          </div>
        )}

        {/* PREP Card */}
        {currentQ && (
          <div className="bg-primary-fixed border border-primary-fixed-dim rounded-xl p-4">
            <h3 className="text-label-sm font-semibold text-primary mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <Icon name="lightbulb" /> Gợi ý trả lời
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <span className="bg-white/50 text-primary-fixed-variant px-2 py-0.5 rounded text-[10px] font-semibold">
                  {currentQ.focus === "technical" ? "Kỹ thuật" : currentQ.focus === "behavioral" ? "Kỹ năng mềm" : "Chung"}
                </span>
              </div>
              <div className="bg-white/50 rounded-lg p-2.5 mt-2">
                <p className="text-[11px] font-semibold text-primary mb-1">
                  STAR Method Tips:
                </p>
                <ul className="text-[11px] text-on-surface-variant space-y-1 list-disc pl-4">
                  <li><strong>S</strong>ituation: Tình huống lúc đó</li>
                  <li><strong>T</strong>ask: Nhiệm vụ của bạn</li>
                  <li><strong>A</strong>ction: Hành động bạn đã làm</li>
                  <li><strong>R</strong>esult: Kết quả cụ thể</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
