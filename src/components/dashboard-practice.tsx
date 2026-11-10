"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon";
import WeaknessPracticePanel from "@/components/weakness-practice-panel";
import type { CriterionId } from "@/lib/interview-rubric";
import type { DashboardPracticeData } from "@/lib/dashboard-practice";

export default function DashboardPractice({ data }: { data: DashboardPracticeData }) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [activeCriterion, setActiveCriterion] = useState<CriterionId | null>(null);
  const visibleTargets = showAll ? data.targets : data.targets.slice(0, 3);

  return (
    <section id="practice" aria-labelledby="recommended-practice-heading" className="scroll-mt-24 space-y-space-sm">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary p-1.5 text-on-primary"><Icon name="psychology" /></span>
          <div>
            <h2 id="recommended-practice-heading" className="font-headline-sm text-headline-sm font-bold text-primary">Recommended Practice</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Gợi ý từ buổi phỏng vấn hoàn thành gần nhất của bạn.</p>
          </div>
        </div>
        {data.targets.length > 3 && <button type="button" aria-expanded={showAll} aria-controls="recommended-practice-cards" onClick={() => setShowAll(current => !current)} className="flex items-center gap-1 font-label-md text-label-md font-semibold text-secondary hover:text-primary">
          {showAll ? "Thu gọn" : `View All (${data.targets.length})`}<Icon name="arrow_forward" />
        </button>}
      </div>

      {data.error ? <div role="alert" className="rounded-xl bg-error-container p-4 text-sm text-on-error-container space-y-2">
        <p>{data.error}</p>
        <button type="button" onClick={() => router.refresh()} className="inline-block font-semibold underline underline-offset-4">Tải lại gợi ý</button>
      </div> : !data.session ? <div className="rounded-xl bg-surface-container-low p-6 text-sm text-on-surface-variant space-y-3">
        <p>Hoàn thành một buổi phỏng vấn để nhận gợi ý luyện tập dựa trên câu trả lời của bạn.</p>
        <Link href="/interview-setup" className="inline-block font-semibold text-primary underline underline-offset-4">Bắt đầu phỏng vấn</Link>
      </div> : <>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-on-surface-variant">
          <p>Phiên nguồn: <span className="font-semibold text-primary">{data.session.title}</span></p>
          <Link href={`/summary?sessionId=${data.session.id}`} className="font-semibold text-secondary underline underline-offset-4">Xem kết quả phiên nguồn</Link>
        </div>
        {data.targets.length === 0 ? <p className="rounded-xl bg-surface-container-low p-6 text-sm text-on-surface-variant">Buổi phỏng vấn gần nhất chưa có tiêu chí mức 0–2/4 đủ dữ liệu để đề xuất luyện tập. Những tiêu chí chưa được chấm không được xem là điểm yếu.</p> : <>
          {!data.practiceAvailable && <p role="status" className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">Chức năng luyện tập điểm yếu chưa được kích hoạt. Bạn vẫn có thể xem gợi ý và kết quả phiên nguồn.</p>}
          <div id="recommended-practice-cards" className="grid grid-cols-1 gap-space-md md:grid-cols-3">
            {visibleTargets.map(target => (
              <article key={target.criterionId} className="flex flex-col rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-sm">
                <p className="text-xs font-semibold text-secondary">{target.sources.length} câu cần cải thiện · Mức thấp nhất {Math.min(...target.sources.map(source => source.level))}/4</p>
                <h3 className="mt-2 font-title text-title font-bold text-primary">{target.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-on-surface-variant">{target.suggestion}</p>
                <button type="button" disabled={!data.practiceAvailable} aria-expanded={activeCriterion === target.criterionId} aria-controls="dashboard-practice-setup" onClick={() => setActiveCriterion(target.criterionId)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50">Luyện: {target.name}</button>
              </article>
            ))}
          </div>
          {data.practiceAvailable && activeCriterion && <div id="dashboard-practice-setup"><WeaknessPracticePanel
            key={`${data.session.id}:${activeCriterion}`}
            sessionId={data.session.id}
            initialSelectedCriteria={[activeCriterion]}
          /></div>}
        </>}
      </>}
    </section>
  );
}
