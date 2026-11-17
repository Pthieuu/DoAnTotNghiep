import Link from "next/link";
import type { PracticeCriterionProgress, PracticeProgressSample, WeaknessPracticeProgress } from "@/lib/weakness-practice-progress";

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const reasons = {
  insufficient_data: "Insufficient assessed answers in both sessions.",
  rubric_version_mismatch: "Sessions were evaluated using different rubric versions.",
  scope_mismatch: "Sessions have different evaluation configurations.",
};

function Sample({ sample }: { sample: PracticeProgressSample }) {
  return (
    <>
      <span className="font-semibold text-primary">
        {sample.averageLevel === null ? "—" : `${numberFormat.format(sample.averageLevel)}/4`}
      </span>
      <span className="mt-1 block text-xs text-on-surface-variant">
        {sample.assessedAnswers} answers assessed
        {sample.excludedAnswers > 0 ? `; ${sample.excludedAnswers} excluded` : ""}
      </span>
    </>
  );
}

function Change({ criterion }: { criterion: PracticeCriterionProgress }) {
  if (criterion.delta === null)
    return (
      <>
        <span className="font-medium text-on-surface-variant">Cannot compare</span>
        {criterion.reason && <span className="mt-1 block text-xs text-on-surface-variant">{reasons[criterion.reason]}</span>}
      </>
    );
  const delta = criterion.delta;
  return (
    <span
      className={`font-semibold ${
        delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-on-surface-variant"
      }`}
    >
      {delta > 0 ? `+${numberFormat.format(delta)} Improvement` : delta < 0 ? `${numberFormat.format(delta)} Decline` : "No change"}
    </span>
  );
}

export default function WeaknessPracticeProgressReport({ progress }: { progress: WeaknessPracticeProgress }) {
  return (
    <section aria-label="Weakness Practice Progress" className="rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">Weakness Practice Results</h2>
        <Link
          href={`/summary?sessionId=${progress.sourceSessionId}`}
          className="text-sm font-semibold text-primary underline underline-offset-4"
        >
          View source session
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="mb-3 text-left text-on-surface-variant">
            Average level for each target criterion on a 0–4 scale.
          </caption>
          <thead className="border-b border-surface-container text-primary">
            <tr>
              <th scope="col" className="p-3 font-semibold">Criterion</th>
              <th scope="col" className="p-3 font-semibold">Source Session</th>
              <th scope="col" className="p-3 font-semibold">Practice Session</th>
              <th scope="col" className="p-3 font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {progress.criteria.map((criterion) => (
              <tr key={criterion.criterionId}>
                <th scope="row" className="p-3 font-medium text-primary">
                  {criterion.name}
                </th>
                <td className="p-3 align-top">
                  <Sample sample={criterion.source} />
                </td>
                <td className="p-3 align-top">
                  <Sample sample={criterion.practice} />
                </td>
                <td className="p-3 align-top">
                  <Change criterion={criterion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-relaxed text-on-surface-variant">{progress.comparisonNote}</p>
    </section>
  );
}
