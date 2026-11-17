"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CriterionId } from "@/lib/interview-rubric";
import type { WeaknessPracticeTarget } from "@/lib/weakness-practice";

export default function WeaknessPracticePanel({
  sessionId,
  continuePractice = false,
  initialSelectedCriteria = [],
}: {
  sessionId: string;
  continuePractice?: boolean;
  initialSelectedCriteria?: readonly CriterionId[];
}) {
  const router = useRouter();
  const headingId = useId();
  const [targets, setTargets] = useState<WeaknessPracticeTarget[] | null>(null);
  const [selected, setSelected] = useState<CriterionId[]>(() => [...new Set(initialSelectedCriteria)]);
  const [loadError, setLoadError] = useState("");
  const [createError, setCreateError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const submittingRef = useRef(false);
  const keysRef = useRef(new Map<string, string>());

  useEffect(() => {
    const controller = new AbortController();
    async function loadTargets() {
      try {
        const response = await fetch(`/api/interviews/${sessionId}/weaknesses`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load practice targets.");
        if (!Array.isArray(data.weaknesses)) throw new Error("Invalid weakness targets list. Please try again.");
        if (!controller.signal.aborted) setTargets(data.weaknesses);
      } catch (error) {
        if (!controller.signal.aborted)
          setLoadError(error instanceof Error ? error.message : "Unable to load weakness targets.");
      }
    }
    void loadTargets();
    return () => controller.abort();
  }, [sessionId, loadAttempt]);

  function toggleCriterion(id: CriterionId) {
    if (submittingRef.current) return;
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
    setCreateError("");
  }

  async function startPractice() {
    if (submittingRef.current || !targets) return;
    const selectedCriteria = targets
      .filter((target) => selected.includes(target.criterionId))
      .map((target) => target.criterionId);
    if (!selectedCriteria.length) return;
    submittingRef.current = true;
    setIsCreating(true);
    setCreateError("");
    try {
      const signature = `${sessionId}:${[...selectedCriteria].sort().join(",")}`;
      let idempotencyKey = keysRef.current.get(signature);
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        keysRef.current.set(signature, idempotencyKey);
      }
      const response = await fetch(`/api/interviews/${sessionId}/practice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCriteria, idempotencyKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create practice session. Please try again.");
      if (typeof data.sessionId !== "string" || !data.sessionId)
        throw new Error("Did not receive a practice session ID. Please try again.");
      router.push(`/interview-room?sessionId=${encodeURIComponent(data.sessionId)}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create practice session.");
      setIsCreating(false);
      submittingRef.current = false;
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={isCreating || (!targets && !loadError)}
      className="rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6 space-y-4"
    >
      <div>
        <h2 id={headingId} className="text-lg font-bold text-primary">
          {continuePractice ? "Continue Improving Weaknesses" : "Practice Weaknesses"}
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Select target criteria to generate a 4-question drill based on this interview.
        </p>
      </div>

      {!targets && !loadError && (
        <p role="status" className="text-sm text-on-surface-variant">
          Loading practice targets...
        </p>
      )}
      {loadError && (
        <div role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container space-y-2">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoadError("");
              setLoadAttempt((current) => current + 1);
            }}
            className="font-semibold underline underline-offset-4"
          >
            Reload targets
          </button>
        </div>
      )}

      {targets && targets.length > 0 && (
        <fieldset disabled={isCreating} className="space-y-3">
          <legend className="mb-3 text-sm font-semibold text-primary">Select one or more practice targets</legend>
          {targets.map((target) => (
            <div key={target.criterionId} className="rounded-xl border border-surface-container p-4 space-y-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  value={target.criterionId}
                  checked={selected.includes(target.criterionId)}
                  onChange={() => toggleCriterion(target.criterionId)}
                  className="mt-1 size-4 shrink-0 accent-indigo-700"
                />
                <span>
                  <span className="block font-semibold text-primary">{target.name}</span>
                  <span className="mt-1 block text-sm text-on-surface-variant">{target.suggestion}</span>
                </span>
              </label>
              <details className="pl-7 text-sm text-on-surface-variant">
                <summary className="cursor-pointer">
                  View evidence from {target.sources.length} questions needing improvement
                </summary>
                <ul className="mt-2 space-y-2">
                  {target.sources.map((source) => (
                    <li key={source.questionIndex}>
                      <p className="font-medium">
                        Question {source.questionIndex + 1}: {source.question} — level {source.level}/4
                      </p>
                      <p>{source.reason}</p>
                      {source.evidence && (
                        <blockquote className="mt-1 border-l-2 border-indigo-200 pl-3 whitespace-pre-wrap">
                          {source.evidence}
                        </blockquote>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </fieldset>
      )}

      {targets?.length === 0 && (
        <div className="rounded-xl bg-surface p-4 text-sm text-on-surface-variant space-y-2">
          <p>
            No criteria at level 0–2/4 with sufficient data to practice from this session. Unassessed criteria are not considered weaknesses.
          </p>
          <Link
            href="/interview-setup"
            className="inline-block font-semibold text-primary underline underline-offset-4"
          >
            Start New Interview
          </Link>
        </div>
      )}
      {createError && (
        <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">
          {createError} Your selection is saved to retry.
        </p>
      )}
      {targets && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isCreating || !targets.some((target) => selected.includes(target.criterionId))}
            onClick={() => void startPractice()}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating
              ? "Creating practice drill..."
              : createError
              ? "Retry creating drill"
              : continuePractice
              ? "Continue Practice"
              : "Start Practice"}
          </button>
          <p role="status" className="text-sm text-on-surface-variant">
            {isCreating ? "AI is preparing 4 questions. Please wait." : `Selected ${selected.length} criteria.`}
          </p>
        </div>
      )}
    </section>
  );
}
