"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icon";
import WeaknessPracticePanel from "@/components/weakness-practice-panel";
import WeaknessPracticeProgressReport from "@/components/weakness-practice-progress";
import type { WeaknessPracticeSession } from "@/lib/weakness-practice";

import type { SummaryResult } from "@/lib/interview-summary";
import type { RubricResult } from "@/lib/interview-rubric";

export type QuestionBreakdownItem = {
  questionIndex: number;
  questionText: string;
  answer: string;
  score: number | null;
  feedback: string;
  suggestion?: string | null;
  rubric?: RubricResult | null;
};

export default function SummaryClient({
  sessionId,
  title,
  initialSummary,
  introduction,
  status,
  practice = null,
  practiceAvailable = true,
  questionBreakdown = [],
}: {
  sessionId: string;
  title: string;
  initialSummary: SummaryResult | null;
  introduction?: string | null;
  status: string;
  practice?: WeaknessPracticeSession | null;
  practiceAvailable?: boolean;
  questionBreakdown?: QuestionBreakdownItem[];
}) {
  const [summary, setSummary] = useState<SummaryResult | null>(initialSummary);
  const needsRefresh = status === "completed" && (!initialSummary || practice !== null);
  const [loading, setLoading] = useState(needsRefresh);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (needsRefresh) {
      const generateSummary = async () => {
        try {
          const res = await fetch(`/api/interviews/${sessionId}/summary`, {
            method: "POST",
            signal: controller.signal,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "An error occurred while generating the summary.");
          if (!controller.signal.aborted) setSummary(data.summary);
        } catch (err) {
          if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      };
      void generateSummary();
    }
    return () => controller.abort();
  }, [sessionId, needsRefresh, attempt]);

  function retrySummary() {
    setError("");
    setLoading(true);
    setAttempt(current => current + 1);
  }

  if (status !== "completed") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-surface-container max-w-md">
          <Icon name="info" className="text-4xl text-secondary mb-4 block mx-auto" />
          <h2 className="text-xl font-bold text-primary mb-2">Interview Incomplete</h2>
          <p className="text-on-surface-variant mb-6">This interview session has not finished yet, so no summary is available.</p>
          <Link href={`/interview-room?sessionId=${sessionId}`} className="px-6 py-2.5 bg-primary text-white hover:bg-secondary rounded-lg font-semibold transition-colors inline-block">
            Resume Interview
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Icon name="autorenew" className="text-4xl text-primary animate-spin mb-4 mx-auto block" />
          <h2 className="text-xl font-bold text-primary mb-2">Analyzing Results</h2>
          <p className="text-on-surface-variant">AI is calculating your scores and generating feedback...</p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-error-container text-on-error-container p-6 rounded-2xl">
          <h2 className="font-bold text-lg mb-2">Unable to generate summary</h2>
          <p>{error}</p>
          <button type="button" onClick={retrySummary} className="mt-4 mr-3 rounded-lg bg-primary px-4 py-2 font-semibold text-white">Retry Summary</button>
          <Link href="/dashboard" className="mt-4 inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!summary) return null;
  const progress = practice && (loading || error) ? undefined : summary.practiceProgress;

  const scoreColor = summary.totalScore === null ? "text-on-surface-variant" : (summary.totalScore ?? 0) >= 80 ? "text-emerald-600" : (summary.totalScore ?? 0) >= 65 ? "text-blue-600" : (summary.totalScore ?? 0) >= 50 ? "text-amber-600" : "text-error";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Interview Results</h1>
        <p className="text-on-surface-variant text-lg">{title}</p>
        {practice && !progress && <Link href={`/summary?sessionId=${practice.sourceSessionId}`} className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-4">View source session</Link>}
      </div>

      {introduction && <details className="rounded-xl border border-surface-container bg-white p-4 text-sm"><summary>Self-introduction · Not graded</summary><p className="mt-2 whitespace-pre-wrap">{introduction}</p></details>}
      {loading && <p role="status" className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">Updating practice progress...</p>}
      {error && <div role="alert" className="rounded-xl bg-error-container p-4 text-sm text-on-error-container space-y-2">
        <p>{error}</p>
        <button type="button" onClick={retrySummary} className="font-semibold underline underline-offset-4">Retry updating progress</button>
      </div>}
      {progress && <WeaknessPracticeProgressReport progress={progress} />}
      {summary.completionScope && <section aria-label="Summary Scope" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <h2 className="font-semibold">Interview ended early</h2>
        <p>Answered {summary.completionScope.answeredCount} of {summary.completionScope.plannedCount} questions. Summary reflects only submitted questions: {summary.completionScope.questionNumbers.join(", ")}.</p>
        <p>Unanswered questions were not graded and not penalized as 0. Displayed score is provisional for the submitted portion.</p>
      </section>}

      <div className="bg-white rounded-3xl p-8 border border-surface-container shadow-sm flex flex-col md:flex-row items-center gap-8 md:gap-16 justify-center">
        <div className="text-center">
          <div className="relative size-40 md:size-48 flex items-center justify-center mx-auto">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-container-high" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${((summary.totalScore ?? 0) / 100) * 283} 283`} className={`${scoreColor} transition-all duration-1000 ease-out`} />
            </svg>
            <div className="relative flex flex-col items-center">
              <span className={`text-5xl md:text-6xl font-black ${scoreColor}`}>{summary.totalScore ?? "—"}</span>
              <span className="text-sm font-semibold text-on-surface-variant">/ 100</span>
              {summary.provisional && <span className="text-sm text-amber-700">Provisional Score</span>}
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container">
            <div className="flex items-center gap-3 mb-2">
              <div className={`size-10 rounded-full flex items-center justify-center font-bold text-lg ${scoreColor} bg-opacity-10 bg-current`}>
                {["A", "B", "C", "D"].includes(summary.grade) ? summary.grade : "—"}
              </div>
              <div>
                <h3 className="font-bold text-primary text-lg">Grade: {summary.grade}</h3>
                <p className="text-sm text-on-surface-variant">
                  {summary.totalScore === null ? 'Insufficient data in the same scope to calculate overall score. View individual question details.' :
                   summary.provisional ? 'Not all criteria assessed; check evaluation scope per question.' :
                   summary.grade === 'A' ? 'Great performance within the assessed scope.' :
                   summary.grade === 'B' ? 'Good job. Solid foundation with a few areas for improvement.' :
                   summary.grade === 'C' ? 'Needs improvement. Review the feedback and suggestions below.' :
                   'Needs more practice. Keep training to build confidence!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-on-surface-variant">Practice scores do not predict actual interview outcomes. Only compare practice sessions with identical evaluation scope.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 h-full">
          <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <Icon name="thumb_up" /> Strengths
          </h3>
          <ul className="space-y-3">
            {summary.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-emerald-800">
                <Icon name="check_circle" className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 h-full">
          <h3 className="text-lg font-bold text-rose-900 mb-4 flex items-center gap-2">
            <Icon name="trending_down" /> Areas for Improvement
          </h3>
          <ul className="space-y-3">
            {summary.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-rose-800">
                <Icon name="error" className="shrink-0 mt-0.5 text-rose-600" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
        <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Icon name="psychology" /> AI Interviewer Recommendations
        </h3>
        <ul className="space-y-4">
          {summary.improvementTips.map((tip, i) => (
            <li key={i} className="flex gap-3">
              <div className="size-6 shrink-0 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-xs mt-0.5">{i + 1}</div>
              <span className="text-indigo-900 font-medium leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {questionBreakdown.length > 0 && (
        <section aria-label="Per-Question Score Breakdown" className="bg-white rounded-2xl p-6 border border-surface-container shadow-xs space-y-5">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <Icon name="list_alt" /> Question-by-Question Score &amp; Detailed Reasons
          </h3>
          <div className="space-y-4">
            {questionBreakdown.map((item) => {
              const qScore = item.rubric?.totalScore ?? (typeof item.score === "number" ? Math.round(item.score * 10) : null);
              return (
                <div key={item.questionIndex} className="rounded-xl border border-surface-container bg-surface-container-lowest p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary">Question {item.questionIndex + 1}</span>
                      <p className="text-sm font-semibold text-primary">{item.questionText}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      qScore === null ? "bg-surface-container text-on-surface-variant" :
                      qScore >= 80 ? "bg-emerald-100 text-emerald-800" :
                      qScore >= 50 ? "bg-amber-100 text-amber-800" :
                      "bg-rose-100 text-rose-800"
                    }`}>
                      {qScore === null ? "Not scored" : `${qScore} / 100`}
                    </span>
                  </div>

                  {item.answer && (
                    <div className="rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">
                      <span className="font-semibold text-primary">Your Answer: </span>
                      <span>{item.answer}</span>
                    </div>
                  )}

                  {item.rubric?.criteria && item.rubric.criteria.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                      {item.rubric.criteria.map((c) => (
                        <li key={c.id} className="flex items-start gap-2 text-on-surface-variant">
                          <span className="font-mono font-bold text-primary shrink-0 w-10">{c.id}</span>
                          <span className="shrink-0 font-semibold text-secondary w-16">
                            {c.status === "scored" ? `${c.level}/4` : c.status === "not_applicable" ? "N/A" : "Missing"}
                          </span>
                          <span>{c.reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : item.feedback ? (
                    <p className="text-xs text-on-surface-variant whitespace-pre-line">{item.feedback}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {practiceAvailable
        ? <WeaknessPracticePanel key={sessionId} sessionId={sessionId} continuePractice={practice !== null || !!progress} />
        : <p role="status" className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">Weakness practice is currently unavailable. You can still review your interview results and individual questions.</p>}

      <div className="flex flex-wrap justify-center gap-4 pt-4">
        <Link href="/dashboard" className="px-6 py-3 bg-white border border-surface-container text-primary hover:bg-surface-container rounded-xl font-semibold transition-colors flex items-center gap-2">
          Back to Dashboard
        </Link>
        <Link href={`/interview-room/history/${sessionId}`} className="px-6 py-3 bg-primary text-white hover:bg-secondary rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-md">
          <Icon name="list_alt" /> View Question Details
        </Link>
      </div>
    </div>
  );
}
