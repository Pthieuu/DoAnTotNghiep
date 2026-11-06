"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { applyCorrections, rescoreCv, parseHandoff, HANDOFF_PREFIX, type CvCorrection, type CvHandoff } from "@/lib/cv-checker/virtual-cv";
import type { CvCheckerReport, IssueSeverity } from "@/lib/cv-checker";
import { getScoreTier } from "@/lib/cv-checker/config/score-tier";

function ScoreProgressRing({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(score);
  const current = useRef(score);
  useEffect(() => {
    const start = performance.now();
    const from = current.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame: number;
    const animate = (now: number) => {
      const progress = reduced ? 1 : Math.min(1, (now - start) / 650);
      current.current = from + (score - from) * (1 - Math.pow(1 - progress, 3));
      setDisplayed(Math.round(current.current));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  const tier = getScoreTier(score);

  const size = 104; // 96 - 112px range
  const strokeWidth = 8;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * displayed) / 100;

  return (
    <div className="flex flex-col items-center shrink-0">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Điểm tham khảo ${score} trên 100`}
        title={`Điểm tham khảo ${score}/100`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={tier.trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress Stroke */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={tier.ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
          <span className={`text-3xl font-extrabold tracking-tight ${tier.scoreTextClass}`}>
            {displayed}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 -mt-1">
            /100
          </span>
        </div>
      </div>
      <span
        className="text-[11px] font-medium text-slate-500 mt-1.5 tracking-wide text-center"
        title="Điểm tham khảo dựa trên mức độ hoàn thiện CV"
      >
        Điểm tham khảo
      </span>
    </div>
  );
}

const SEVERITY_CONFIG: Record<
  IssueSeverity,
  { label: string; bg: string; text: string; border: string; badge: string }
> = {
  critical: {
    label: "Cần sửa gấp",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  major: {
    label: "Cần lưu ý",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  minor: {
    label: "Gợi ý hoàn thiện",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
  },
  manual_check: {
    label: "Lưu ý kiểm tra",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

const severityOrder: IssueSeverity[] = ["critical", "major", "minor", "manual_check"];
const actionClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

export default function CvCheckerReportWorkspace({ report, onReset }: { report: CvCheckerReport; onReset: () => void }) {
  const issues = Object.values(report.sections).flatMap((section) =>
    section.issues.map((issue, index) => ({ ...issue, key: `${section.key}-${issue.id}-${index}` }))
  ).sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
  const important = issues.filter((issue) => issue.severity === "critical" || issue.severity === "major");
  const improvements = issues.filter((issue) => issue.severity === "minor" || issue.severity === "manual_check");
  const [activeTab, setActiveTab] = useState<"important" | "improvement">(important.length ? "important" : "improvement");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const router = useRouter();
  const [corrections, setCorrections] = useState<Record<string, CvCorrection>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState("");
  const resolved = new Set(Object.keys(corrections));
  const virtualCv = report.virtualCv ? applyCorrections(report.virtualCv, corrections) : null;
  const liveReport = rescoreCv(report, corrections);
  const [copyMessage, setCopyMessage] = useState("");
  const copyRequest = useRef(0);
  const selected = issues.find((issue) => issue.key === selectedKey);
  const visibleIssues = activeTab === "important" ? important : improvements;
  const tier = getScoreTier(liveReport.overallScore);
  const tabs = [{ key: "important", label: "Lỗi quan trọng", count: important.length }, { key: "improvement", label: "Cần cải thiện", count: improvements.length }] as const;

  const ready = issues.length === 0 || resolved.size === issues.length || (important.length > 0 && important.every((issue) => resolved.has(issue.key)));
  function completeIssue() {
    if (!selected) return;
    setActionError("");
    if (resolved.has(selected.key)) {
      setCorrections((old) => { const next = { ...old }; delete next[selected.key]; return next; });
      return;
    }
    const text = (drafts[selected.key] ?? selected.rewriteSampleJa ?? "").trim();
    if (!text) { setActionError("Hãy nhập nội dung đã chỉnh sửa hoặc ghi chú việc bạn đã thực hiện."); return; }
    if (!virtualCv) { setActionError("Hãy kiểm tra lại CV để lấy đầy đủ dữ liệu gốc trước khi chỉnh sửa."); return; }
    setCorrections((old) => ({ ...old, [selected.key]: { section: selected.section, text, sourceQuote: selected.sourceQuoteJa } }));
  }
  function startInterview() {
    if (!virtualCv) return;
    try {
      const id = crypto.randomUUID();
      const handoff: CvHandoff = { version: 1, fileName: report.metadata.fileName, cv: virtualCv, company: report.metadata.companyName || "", role: report.metadata.targetRole || "" };
      if (!parseHandoff(handoff)) { setActionError("CV quá dài hoặc thiếu nội dung gốc để chuyển tiếp. Hãy kiểm tra lại tệp CV."); return; }
      sessionStorage.setItem(HANDOFF_PREFIX + id, JSON.stringify(handoff));
      router.push(`/interview-setup?cvDraft=${id}`);
    } catch { setActionError("Không lưu được CV chuyển tiếp. Hãy cho phép lưu trữ trong trình duyệt rồi thử lại."); }
  }

  function changeTab(tab: typeof activeTab) {
    setActiveTab(tab);
    setSelectedKey(null);
    setCopyMessage("");
    copyRequest.current += 1;
  }

  async function copySample() {
    if (!selected?.rewriteSampleJa) return;
    const request = ++copyRequest.current;
    try {
      await navigator.clipboard.writeText(selected.rewriteSampleJa);
      if (request === copyRequest.current) setCopyMessage("Đã sao chép câu mẫu tiếng Nhật.");
    } catch {
      if (request === copyRequest.current) setCopyMessage("Không thể sao chép tự động. Hãy chọn câu mẫu và sao chép thủ công.");
    }
  }

  return (
    <div className="space-y-8 rounded-2xl bg-slate-50 p-3 sm:p-6">
      <section aria-labelledby="report-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
          <h2 id="report-heading" className="text-sm font-semibold text-slate-700">Kết quả đánh giá CV</h2>
          <button type="button" onClick={onReset} className={`${actionClass} border border-slate-200 text-slate-600 hover:bg-slate-50`}>Kiểm tra CV khác</button>
        </div>
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:p-7">
          <div className={`flex shrink-0 flex-col items-center gap-3 self-start rounded-2xl border p-5 sm:w-44 ${tier.badgeClass}`}>
            <ScoreProgressRing score={liveReport.overallScore} />
            <span className="text-center text-sm font-semibold">{tier.label}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{report.metadata.fileType.toUpperCase()}</span><span>{(report.metadata.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span></div>
            <h3 className="break-words text-xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere] sm:text-2xl">{report.metadata.fileName}</h3>
            {report.metadata.companyName && <p className="text-sm text-slate-500">Ứng tuyển: {report.metadata.companyName}</p>}
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-600">{resolved.size ? `Đã cập nhật ${resolved.size} góp ý vào CV ảo. Điểm ban đầu: ${report.overallScore}/100; điểm tham khảo sau chỉnh sửa: ${liveReport.overallScore}/100.` : report.summaryVi}</p>
          </div>
        </div>
      </section>

      {report.topPrioritiesVi.length > 0 && <section aria-labelledby="priorities-heading">
        <div className="mb-4"><h2 id="priorities-heading" className="text-lg font-bold text-slate-900">{Math.min(3, report.topPrioritiesVi.length)} việc cần ưu tiên chỉnh sửa ngay</h2><p className="mt-1 text-sm text-slate-500">Bắt đầu từng bước trước khi đi vào các góp ý chi tiết.</p></div>
        <div className="grid items-start gap-4 md:grid-cols-3">
          {report.topPrioritiesVi.slice(0, 3).map((priority, index) => <PriorityCard key={index} priority={priority} step={index + 1} />)}
        </div>
      </section>}

      <section aria-labelledby="issues-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="issues-heading" className="text-lg font-bold text-slate-900">Góp ý chi tiết <span className="font-normal text-slate-400">({issues.length})</span></h2><p className="mt-1 text-sm text-slate-500">Mở từng mục để xem hiện trạng, lý do và cách chỉnh sửa.</p></div><p role="status" className="text-xs text-slate-500">Đã đánh dấu sửa {resolved.size}/{issues.length}</p></div>
        <div role="tablist" aria-label="Nhóm góp ý CV" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
          {tabs.map((tab, index) => <button key={tab.key} type="button" role="tab" id={`tab-${tab.key}`} aria-selected={activeTab === tab.key} aria-controls="issues-panel" tabIndex={activeTab === tab.key ? 0 : -1} onClick={() => changeTab(tab.key)} onKeyDown={(event) => {
            let nextIndex: number;
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") nextIndex = 1 - index;
            else if (event.key === "Home") nextIndex = 0;
            else if (event.key === "End") nextIndex = 1;
            else return;
            event.preventDefault();
            changeTab(tabs[nextIndex].key);
            document.getElementById(`tab-${tabs[nextIndex].key}`)?.focus();
          }} className={`${actionClass} flex-1 whitespace-nowrap ${activeTab === tab.key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>{tab.label} ({tab.count})</button>)}
        </div>
        <div role="tabpanel" id="issues-panel" aria-labelledby={`tab-${activeTab}`} tabIndex={0} className="space-y-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          {visibleIssues.map((issue) => {
            const expanded = selected?.key === issue.key;
            return <article key={issue.key} className={`overflow-hidden rounded-2xl border bg-white ${expanded ? "border-indigo-200 shadow-sm" : "border-slate-200"}`}>
              <h3><button type="button" id={`trigger-${issue.key}`} aria-expanded={expanded} aria-controls={`detail-${issue.key}`} onClick={() => { setSelectedKey(expanded ? null : issue.key); setCopyMessage(""); copyRequest.current += 1; }} className="flex w-full items-center gap-4 p-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:p-5">
                <span className="min-w-0 flex-1"><span className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${resolved.has(issue.key) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : SEVERITY_CONFIG[issue.severity].badge}`}>{resolved.has(issue.key) ? "Đã hoàn thành ✓" : SEVERITY_CONFIG[issue.severity].label}</span><span className="text-xs font-normal text-slate-500">{report.sections[issue.section].titleVi}</span></span><span className="block text-sm font-semibold leading-6 text-slate-900">{issue.title}</span></span>
                <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-full text-lg ${expanded ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{expanded ? "−" : "+"}</span>
              </button></h3>
              <div id={`detail-${issue.key}`} role="region" aria-labelledby={`trigger-${issue.key}`} hidden={!expanded}>
                {expanded && selected && <div className="border-t border-slate-100">
              <div className="space-y-6 p-5 text-sm leading-7 text-slate-600 [overflow-wrap:anywhere] sm:p-7">
                <section><h3 className="mb-2 font-semibold text-slate-900">Hiện trạng</h3><p className="whitespace-pre-wrap">{selected.problemVi}</p></section>
                {selected.sourceQuoteJa && <details className="rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-medium text-slate-700">Xem trích đoạn trong CV</summary><blockquote lang="ja" className="mt-3 whitespace-pre-wrap border-l-2 border-slate-300 pl-4">{selected.sourceQuoteJa}</blockquote></details>}
                <section className="rounded-2xl bg-amber-50/70 p-5"><h3 className="mb-2 font-semibold text-amber-900">Vì sao cần sửa · Góc nhìn nhà tuyển dụng Nhật Bản</h3><p className="whitespace-pre-wrap text-amber-950">{selected.whyWrongVi}</p></section>
                <section><h3 className="mb-2 font-semibold text-slate-900">Gợi ý điều chỉnh</h3><p className="whitespace-pre-wrap">{selected.solutionVi}</p></section>
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-indigo-950">Câu mẫu tiếng Nhật tham khảo</h3>{selected.rewriteSampleJa && <button type="button" onClick={() => void copySample()} className={`${actionClass} bg-white text-indigo-700 shadow-sm hover:bg-indigo-100`}>Sao chép</button>}</div>
                  {selected.rewriteSampleJa ? <><p lang="ja" className="select-text whitespace-pre-wrap rounded-xl border border-indigo-100 bg-white p-4 leading-8 text-slate-800">{selected.rewriteSampleJa}</p><p className="mt-3 text-xs leading-5 text-indigo-700">Điều chỉnh câu mẫu theo kinh nghiệm thực tế của bạn trước khi đưa vào CV.</p></> : <p className="text-slate-500">Góp ý này không có câu mẫu tiếng Nhật. Hãy áp dụng hướng dẫn điều chỉnh ở trên.</p>}
                  <p role="status" aria-live="polite" className="mt-2 text-xs text-indigo-800">{copyMessage}</p>
                </section>
                <section>
                  <label htmlFor="correction-text" className="font-semibold text-slate-900">Nội dung đã chỉnh sửa để đưa vào CV ảo</label>
                  <textarea id="correction-text" rows={5} maxLength={12000} disabled={resolved.has(selected.key)} value={drafts[selected.key] ?? selected.rewriteSampleJa ?? ""} onChange={(event) => setDrafts((old) => ({ ...old, [selected.key]: event.target.value }))} placeholder="Nhập nội dung thực tế đã sửa; với lỗi hình thức, ghi rõ việc đã thực hiện." className="mt-2 w-full rounded-xl border border-indigo-200 bg-white p-4 leading-7 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50" />
                  <p className="mt-2 text-xs text-slate-500">Xác nhận nội dung đúng với kinh nghiệm của bạn trước khi đánh dấu. Với 自己PR và 志望動機 không có trích đoạn gốc, nhập toàn bộ đoạn thay thế. Hoàn tác để chỉnh sửa lại.</p>
                </section>
              </div>

                  <div className="border-t border-slate-100 p-5 sm:px-7">
                    <button type="button" aria-pressed={resolved.has(selected.key)} onClick={completeIssue} className={`${actionClass} ${resolved.has(selected.key) ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{resolved.has(selected.key) ? "Đã hoàn thành ✓ · Hoàn tác" : "Đánh dấu đã sửa"}</button>
                  </div>
                </div>}
              </div>
            </article>;
          })}
          {!visibleIssues.length && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{issues.length ? "Không có góp ý trong nhóm này." : "Không có vấn đề được ghi nhận trong CV."}</p>}
        </div>
        <p className="text-xs leading-5 text-slate-500">Điểm được cập nhật theo các góp ý bạn xác nhận đã sửa, chưa được AI thẩm định lại. Nội dung được lưu vào CV ảo để luyện phỏng vấn; tệp gốc không thay đổi.</p>
      </section>
          <details className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-800">Đánh giá từng phần</summary>
            <div className="mt-5 divide-y divide-slate-100">{Object.values(liveReport.sections).map((section) => <div key={section.key} className="py-3"><div className="flex justify-between gap-4"><h3 className="font-medium text-slate-800">{section.titleVi} <span lang="ja" className="text-xs text-slate-500">{section.titleJa}</span></h3><span className="shrink-0 font-semibold text-indigo-700">{section.score}/100</span></div><p className="mt-1 text-xs leading-6">{section.evaluationVi}</p></div>)}</div>
          </details>

      {actionError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{actionError}</p>}
      {ready && virtualCv && <section className="rounded-2xl bg-indigo-600 p-6 text-white shadow-sm" aria-label="Tiếp tục luyện phỏng vấn">
        <h2 className="text-lg font-bold">{resolved.size === issues.length ? "CV của bạn đã hoàn thiện!" : "Bạn đã hoàn thành các lỗi quan trọng!"}</h2>
        <p className="mt-2 text-sm leading-6 text-indigo-100">Đưa dữ liệu các phần vừa sửa sang phòng luyện phỏng vấn ngay?</p>
        <button type="button" onClick={startInterview} className={`${actionClass} mt-4 bg-white text-indigo-700 hover:bg-indigo-50`}>Bắt đầu phỏng vấn thử với CV này ➔</button>
      </section>}
    </div>
  );
}

function PriorityCard({ priority, step }: { priority: string; step: number }) {
  const [expanded, setExpanded] = useState(false);
  // Priorities are plain text from the report, with no issue ID to link to a rewrite.
  const parts = priority.trim().split(/\n+/).filter(Boolean);
  const firstLine = parts[0] || "Xem góp ý ưu tiên";
  const title = firstLine.split(/(?<=[.!?。])\s+|:\s+/)[0];
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <span className="mb-4 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Bước {step}</span>
    <h3 className="line-clamp-2 text-sm font-bold leading-6 text-slate-900" title={title}>{title}</h3>
    <div id={`priority-${step}`} className={`mt-3 space-y-2 text-sm leading-6 text-slate-600 ${expanded ? "" : "line-clamp-3"}`}>{parts.map((part, index) => <p key={index}>{part}</p>)}</div>
    <button type="button" aria-expanded={expanded} aria-controls={`priority-${step}`} onClick={() => setExpanded(!expanded)} className={`${actionClass} mt-3 px-0 text-indigo-700 hover:text-indigo-900`}>{expanded ? "Thu gọn ↑" : "Xem đầy đủ ↓"}</button>
  </article>;
}
