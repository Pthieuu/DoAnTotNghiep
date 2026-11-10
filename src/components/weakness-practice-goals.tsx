import Link from "next/link";
import { CRITERIA } from "@/lib/interview-rubric";
import type { WeaknessPracticeSession } from "@/lib/weakness-practice";

export default function WeaknessPracticeGoals({ practice }: { practice: WeaknessPracticeSession }) {
  return (
    <section aria-label="Mục tiêu luyện tập điểm yếu" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-indigo-900">Luyện tập điểm yếu</h2>
        <Link href={`/summary?sessionId=${practice.sourceSessionId}`} className="text-sm font-semibold text-indigo-800 underline underline-offset-4">
          Xem kết quả phiên nguồn
        </Link>
      </div>
      <ul className="flex flex-wrap gap-2">
        {CRITERIA.filter(criterion => practice.selectedCriteria.includes(criterion.id)).map(criterion => (
          <li key={criterion.id} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-900">
            {criterion.name}
          </li>
        ))}
      </ul>
      <p className="text-sm text-indigo-900">Tập trung cải thiện các mục tiêu trên. Câu trả lời vẫn được chấm đầy đủ 5 tiêu chí theo rubric chuẩn.</p>
    </section>
  );
}
