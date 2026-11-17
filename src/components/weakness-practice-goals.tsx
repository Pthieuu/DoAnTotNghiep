import Link from "next/link";
import { CRITERIA } from "@/lib/interview-rubric";
import type { WeaknessPracticeSession } from "@/lib/weakness-practice";

export default function WeaknessPracticeGoals({ practice }: { practice: WeaknessPracticeSession }) {
  return (
    <section aria-label="Weakness Practice Goals" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-indigo-900">Weakness Practice</h2>
        <Link href={`/summary?sessionId=${practice.sourceSessionId}`} className="text-sm font-semibold text-indigo-800 underline underline-offset-4">
          View source session results
        </Link>
      </div>
      <ul className="flex flex-wrap gap-2">
        {CRITERIA.filter(criterion => practice.selectedCriteria.includes(criterion.id)).map(criterion => (
          <li key={criterion.id} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-900">
            {criterion.name}
          </li>
        ))}
      </ul>
      <p className="text-sm text-indigo-900">Focus on improving the targeted areas above. Your answers will still be evaluated against all 5 standard rubric criteria.</p>
    </section>
  );
}
