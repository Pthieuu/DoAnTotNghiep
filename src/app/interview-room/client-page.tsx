"use client";

import React, { useState, useEffect, useRef } from "react";
import Icon from "@/components/icon";
import VrmAvatar from "@/components/vrm-avatar";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AIState = "idle" | "speaking" | "listening" | "thinking";

type StoredQuestion = { text: string; translation: string; focus?: string };
type StoredTurn = { question: StoredQuestion; answer: string; score?: number; feedback?: string };
type RoomSession = { 
  id: string; title: string; company: string | null; level: string | null; 
  interviewType: string; interviewLanguage: string;
  total: number; currentQuestion: StoredQuestion | null; turns: StoredTurn[]; 
  completed: boolean; loadError?: "session" | "answers" 
};

export default function InterviewRoomClient({ session }: { session: RoomSession | null }) {
  const router = useRouter();
  const [aiState, setAiState] = useState<AIState>("idle");
  const [showTranslation, setShowTranslation] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { speak, cancel: cancelSpeak, isSpeaking } = useSpeechSynthesis();
  const { transcript, isListening, startListening, stopListening, resetTranscript, error: micError } = useSpeechRecognition(session?.interviewLanguage || "vi");

  // Keep track of current state
  const currentQuestionIndex = session ? session.turns.length : 0;
  const isCompleted = session?.completed;
  
  useEffect(() => {
    if (session?.loadError) {
      setError("Không thể tải dữ liệu phỏng vấn. Vui lòng thử lại.");
    }
  }, [session]);

  // Handle AI speaking state
  useEffect(() => {
    if (isSpeaking) {
      setAiState("speaking");
    } else if (aiState === "speaking") {
      setAiState("idle");
    }
  }, [isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-read first question when entering
  const hasSpokenRef = useRef(false);
  useEffect(() => {
    if (session?.currentQuestion && !isCompleted && !hasSpokenRef.current && !session.loadError) {
      hasSpokenRef.current = true;
      speak(session.currentQuestion.text, session.interviewLanguage || "vi");
    }
  }, [session, isCompleted, speak]);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      // Cancel AI speech if user interrupts
      cancelSpeak();
      startListening();
      setAiState("listening");
    }
  };

  const submitAnswer = async () => {
    if (!session || !session.currentQuestion || !transcript.trim()) return;
    
    stopListening();
    setAiState("thinking");
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/interviews/${session.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          answer: transcript.trim()
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi gửi câu trả lời.");
      }

      resetTranscript();
      
      if (data.completed) {
        router.refresh();
        router.push(`/summary?sessionId=${session.id}`);
      } else {
        router.refresh(); // Reload to get the new session data with feedback
        hasSpokenRef.current = false; // Reset to allow auto-speaking the next question
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setAiState("idle");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return <div className="p-8 text-center text-on-surface-variant">Đang tải phòng phỏng vấn...</div>;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] w-full bg-surface space-y-4 p-4 lg:p-6 overflow-hidden">
      <InterviewHeader session={session} currentQuestionIndex={currentQuestionIndex} />

      {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium">{error}</div>}
      {micError && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium">{micError}</div>}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Main Content: AI Interviewer */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden relative shrink-0">
          <AIInterviewer
            aiState={aiState}
            question={session.currentQuestion}
            showTranslation={showTranslation}
            onToggleTranslation={() => setShowTranslation(!showTranslation)}
            isCompleted={!!isCompleted}
          />
          <CandidateCamera />
          <InterviewControls
            isCompleted={!!isCompleted}
            micActive={isListening}
            onToggleMic={toggleMic}
            transcript={transcript}
            isSubmitting={isSubmitting}
            onSubmit={submitAnswer}
            sessionId={session.id}
          />
        </div>

        {/* Bottom Panel / Side Panel */}
        <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
          <InterviewSidePanel session={session} transcript={transcript} />
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
  isCompleted
}: {
  aiState: AIState;
  question: StoredQuestion | null;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  isCompleted: boolean;
}) {
  return (
    <div className="relative flex-1 flex flex-col bg-surface-container-lowest overflow-hidden min-h-[300px]">
      {/* AI Status */}
      <div className="absolute top-4 left-4 z-10">
        <AIStatus aiState={aiState} />
      </div>

      {/* Avatar Area */}
      <div className="flex-1 relative bg-[#edf3fb] flex items-center justify-center">
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
              <button
                onClick={onToggleTranslation}
                className="mt-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs font-medium transition-colors"
              >
                {showTranslation ? "Ẩn bản dịch" : "Hiện bản dịch"}
              </button>
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
  sessionId
}: {
  isCompleted: boolean;
  micActive: boolean;
  onToggleMic: () => void;
  transcript: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  sessionId: string;
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
      <div className="flex-1 w-full flex items-center gap-1 lg:gap-3 justify-center sm:justify-start">
        {/* Placeholder for future tools */}
      </div>

      <div className="flex flex-col items-center justify-center shrink-0 w-48 gap-1">
        <button
          onClick={onToggleMic}
          disabled={isSubmitting}
          className={`p-4 rounded-full transition-all duration-300 flex items-center justify-center transform hover:scale-105 disabled:opacity-50 disabled:scale-100 ${micActive ? "bg-error text-white shadow-lg shadow-error/30" : "bg-primary text-white shadow-md hover:bg-primary-container hover:text-primary"}`}
        >
          <Icon name="mic" className={micActive ? "animate-pulse" : ""} />
        </button>
        <span
          className={`text-[10px] font-medium transition-colors ${micActive ? "text-error" : "text-on-surface-variant"}`}
        >
          {micActive ? "Đang thu âm (Bấm để dừng)" : "Bấm để trả lời"}
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

function InterviewSidePanel({ session, transcript }: { session: RoomSession, transcript: string }) {
  const currentQ = session.currentQuestion;
  const turns = session.turns;
  const lastTurn = turns[turns.length - 1];

  return (
    <div className="flex-1 flex flex-col bg-white border border-surface-container rounded-2xl shadow-sm overflow-hidden h-full max-h-[75vh]">
      <div className="px-4 py-3 border-b border-surface-container bg-surface-container-lowest shrink-0 flex items-center gap-2">
        <Icon name="analytics" className="text-secondary" />
        <h2 className="text-title font-semibold text-primary">
          Live Assistant
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
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
              <Icon name="check_circle" className="text-[16px]" /> Điểm câu trước: <span className="text-lg">{lastTurn.score}/10</span>
            </h3>
            <div className="space-y-2 text-sm text-emerald-900">
              <p className="font-medium bg-white/50 p-2 rounded-lg">"{lastTurn.answer}"</p>
              <div className="pt-2 border-t border-emerald-200/50">
                <p><strong>Nhận xét:</strong> {lastTurn.feedback}</p>
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
