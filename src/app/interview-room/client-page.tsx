"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Icon from "@/components/icon";

type AIState = "speaking" | "listening" | "thinking";

export default function InterviewRoomClient() {
  const [aiState, setAiState] = useState<AIState>("speaking");
  const [showTranslation, setShowTranslation] = useState(false);
  const [micActive, setMicActive] = useState(false);

  // Mock interval to switch AI states for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setAiState((prev) => {
        if (prev === "speaking") return "listening";
        if (prev === "listening") return "thinking";
        return "speaking";
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen w-full bg-surface space-y-4 p-4 lg:p-6 overflow-auto">
      <InterviewHeader />

      <div className="flex flex-col gap-6 flex-1">
        {/* Main Content: AI Interviewer */}
        <div className="h-[60vh] lg:h-[75vh] flex flex-col bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden relative shrink-0">
          <AIInterviewer aiState={aiState} showTranslation={showTranslation} onToggleTranslation={() => setShowTranslation(!showTranslation)} />
          <CandidateCamera />
          <InterviewControls micActive={micActive} onToggleMic={() => setMicActive(!micActive)} />
        </div>

        {/* Bottom Panel */}
        <div className="w-full flex flex-col gap-4">
          <InterviewSidePanel />
        </div>
      </div>
      
      <InterviewProgress />
    </div>
  );
}

function InterviewHeader() {
  return (
    <div className="flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-headline-md font-bold text-primary">Interview Room</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary text-[10px] font-semibold tracking-wide">
            AI Japanese Interview Practice
          </span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-semibold">
            N3–N2
          </span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-semibold">
            Practice Mode
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-surface-container shadow-sm shrink-0">
        <Icon name="history" />
        <span className="text-label-lg font-semibold tabular-nums text-primary">12:43 / 20:00</span>
      </div>
    </div>
  );
}

function AIInterviewer({ aiState, showTranslation, onToggleTranslation }: { aiState: AIState, showTranslation: boolean, onToggleTranslation: () => void }) {
  return (
    <div className="relative flex-1 flex flex-col bg-surface-container-lowest">
      {/* AI Status */}
      <div className="absolute top-4 left-4 z-10">
        <AIStatus aiState={aiState} />
      </div>

      {/* Avatar Area */}
      <div className="flex-1 relative bg-surface-container overflow-hidden flex items-center justify-center">
        <Image 
          src="/japanese_interviewer.jpg" 
          alt="AI Interviewer"
          fill
          className={`object-cover transition-transform duration-700 ${aiState === "speaking" ? "scale-105" : "scale-100"}`}
          priority
        />
        {/* Subtitle Overlay */}
        <div className="absolute bottom-6 inset-x-0 flex flex-col items-center px-4 lg:px-12">
           <div className="bg-primary/80 backdrop-blur-md rounded-2xl p-4 lg:p-6 text-center max-w-3xl w-full shadow-lg border border-white/10">
             <p className="text-white text-headline-sm font-medium leading-relaxed">
               {aiState === "speaking" ? "「それでは、自己紹介をお願いします。」" : "..."}
             </p>
             {showTranslation && (
               <p className="text-secondary-fixed mt-3 text-body-lg">
                 "Trước tiên, hãy giới thiệu bản thân."
               </p>
             )}
             <button 
               onClick={onToggleTranslation}
               className="mt-4 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-label-sm font-medium transition-colors"
             >
               {showTranslation ? "Hide Vietnamese Translation" : "Show Vietnamese Translation"}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function AIStatus({ aiState }: { aiState: AIState }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/80 backdrop-blur-md text-white border border-white/10 shadow-sm">
      <div className="relative flex items-center justify-center size-3">
        {aiState === "speaking" && <span className="absolute inline-flex h-full w-full rounded-full bg-[#a4f2e5] opacity-75 animate-ping"></span>}
        <span className={`relative inline-flex rounded-full size-2 ${aiState === "speaking" ? "bg-[#a4f2e5]" : aiState === "thinking" ? "bg-[#f2caa4]" : "bg-[#a4cbff]"}`}></span>
      </div>
      <span className="text-label-sm font-semibold tracking-wide">
        {aiState === "speaking" ? "AI Speaking" : aiState === "listening" ? "Listening..." : "Thinking..."}
      </span>
      {aiState === "speaking" && (
        <div className="flex gap-0.5 ml-1 h-3 items-end">
          <div className="w-[2px] bg-white h-full animate-pulse"></div>
          <div className="w-[2px] bg-white h-2/3 animate-pulse" style={{ animationDelay: '100ms' }}></div>
          <div className="w-[2px] bg-white h-1/2 animate-pulse" style={{ animationDelay: '200ms' }}></div>
          <div className="w-[2px] bg-white h-4/5 animate-pulse" style={{ animationDelay: '300ms' }}></div>
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
        あなた / You
      </div>
    </div>
  );
}

function InterviewControls({ micActive, onToggleMic }: { micActive: boolean, onToggleMic: () => void }) {
  return (
    <div className="shrink-0 h-20 bg-white border-t border-surface-container flex items-center justify-between px-4 lg:px-6">
      <div className="flex-1 flex items-center gap-1 lg:gap-3">
        <button className="p-2.5 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Toggle Speaker">
          <Icon name="tune" />
        </button>
        <button className="p-2.5 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Repeat Question">
          <Icon name="autorenew" />
        </button>
        <button className="p-2.5 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors lg:hidden" title="Show Transcript">
          <Icon name="edit_document" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center shrink-0 w-32 lg:w-48 gap-1">
        <button 
          onClick={onToggleMic}
          className={`p-4 rounded-full transition-colors flex items-center justify-center ${micActive ? "bg-error text-white shadow-lg shadow-error/30" : "bg-primary text-white shadow-md hover:bg-primary-container"}`}
        >
          <Icon name="mic" />
        </button>
        <span className={`text-[10px] font-medium ${micActive ? "text-error" : "text-on-surface-variant"}`}>
          {micActive ? "Listening to you..." : "Click to answer"}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-end gap-1 lg:gap-3">
        <button className="p-2.5 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" title="Pause Interview">
          <Icon name="record_voice_over" />
        </button>
        <button className="px-3 lg:px-4 py-2 bg-error/10 text-error hover:bg-error hover:text-white rounded-lg font-semibold text-label-sm transition-colors border border-error/20 whitespace-nowrap">
          End Interview
        </button>
      </div>
    </div>
  );
}

function InterviewProgress() {
  return (
    <div className="shrink-0 pt-2 pb-4">
      <div className="flex justify-between items-center mb-1 text-label-sm text-on-surface-variant font-medium px-1">
        <span>Question 1 of 10</span>
        <span>10%</span>
      </div>
      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
        <div className="bg-primary h-full rounded-full transition-all" style={{ width: "10%" }}></div>
      </div>
    </div>
  );
}

function InterviewSidePanel() {
  return (
    <div className="flex-1 flex flex-col bg-white border border-surface-container rounded-2xl shadow-sm overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-surface-container bg-surface-container-lowest shrink-0 flex items-center gap-2">
        <Icon name="analytics" className="text-secondary" />
        <h2 className="text-title font-semibold text-primary">Live Interview</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* PREP Card */}
        <div className="bg-primary-fixed border border-primary-fixed-dim rounded-xl p-4">
          <h3 className="text-label-sm font-semibold text-primary mb-2 flex items-center gap-1.5 uppercase tracking-wide">
             <Icon name="lightbulb" /> Interview Guide
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-on-surface-variant mb-0.5">Current Question</p>
              <p className="text-body-md font-medium text-on-surface">Self Introduction</p>
            </div>
            <div className="flex gap-2">
              <span className="bg-white/50 text-primary-fixed-variant px-2 py-0.5 rounded text-[10px] font-semibold">Introduction</span>
              <span className="bg-white/50 text-primary-fixed-variant px-2 py-0.5 rounded text-[10px] font-semibold">N3–N2</span>
            </div>
            <div className="bg-white/50 rounded-lg p-2.5 mt-2">
              <p className="text-[10px] font-semibold text-primary mb-1">Tips:</p>
              <ul className="text-[11px] text-on-surface-variant space-y-1 list-disc pl-4">
                <li>Speak clearly</li>
                <li>Keep your answer concise</li>
                <li>Use polite Japanese (Keigo)</li>
                <li>Maintain confidence</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Live Transcript */}
        <div>
           <h3 className="text-label-sm font-semibold text-primary mb-3">Live Transcript</h3>
           <div className="space-y-4">
             <div className="flex flex-col gap-1 items-start">
               <span className="text-[10px] font-semibold text-secondary">AI Interviewer</span>
               <div className="bg-surface-container-low text-on-surface px-3 py-2 rounded-2xl rounded-tl-sm text-body-sm shadow-sm max-w-[90%] leading-relaxed">
                 それでは、自己紹介をお願いします。
               </div>
             </div>
             <div className="flex flex-col gap-1 items-end">
               <span className="text-[10px] font-semibold text-primary">You</span>
               <div className="bg-primary text-white px-3 py-2 rounded-2xl rounded-tr-sm text-body-sm shadow-sm max-w-[90%] leading-relaxed">
                 はい。こんにちは。私は...
               </div>
             </div>
           </div>
        </div>

        {/* AI Feedback */}
        <div>
           <h3 className="text-label-sm font-semibold text-primary mb-3">Real-time Feedback</h3>
           <div className="space-y-2">
             <FeedbackItem label="Japanese Grammar" status="Good" color="text-[#005049]" bg="bg-[#a4f2e5]" />
             <FeedbackItem label="Pronunciation" status="Good" color="text-[#005049]" bg="bg-[#a4f2e5]" />
             <FeedbackItem label="Answer Content" status="Needs improvement" color="text-[#93000a]" bg="bg-[#ffdad6]" />
             <FeedbackItem label="Confidence" status="Good" color="text-[#005049]" bg="bg-[#a4f2e5]" />
             <FeedbackItem label="Speaking Speed" status="Good" color="text-[#005049]" bg="bg-[#a4f2e5]" />
           </div>
        </div>

      </div>
    </div>
  );
}

function FeedbackItem({ label, status, color, bg }: { label: string, status: string, color: string, bg: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container">
      <span className="text-label-sm text-on-surface-variant font-medium">{label}</span>
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${color} ${bg}`}>
        {status}
      </span>
    </div>
  );
}
