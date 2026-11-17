import DashboardShell from "@/components/dashboard-shell";

export default function PracticeLoading() {
  return (
    <DashboardShell activePage="Practice Weaknesses">
      <div className="flex w-full flex-col space-y-space-lg" role="status" aria-busy="true" aria-label="Đang tải dữ liệu luyện tập điểm yếu">
        {/* Header Skeleton */}
        <header className="rounded-xl border border-surface-container bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">Practice Weaknesses</h1>
            <p className="text-sm text-on-surface-variant">
              Luyện tập tập trung theo các tiêu chí cần cải thiện từ buổi phỏng vấn hoàn thành gần nhất của bạn.
            </p>
          </div>
        </header>

        {/* Prominent Loading Alert Banner */}
        <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-5 text-indigo-900 shadow-xs">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-bold text-primary">Đang nạp gợi ý luyện tập...</p>
            <p className="text-xs text-slate-600">
              Hệ thống đang đối soát dữ liệu rubric C01–C05 từ buổi phỏng vấn gần nhất để đề xuất các bài luyện phù hợp.
            </p>
          </div>
        </div>

        {/* Practice Cards Skeleton */}
        <div className="space-y-space-sm">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 gap-space-md md:grid-cols-3">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="flex flex-col rounded-xl border border-surface-container bg-surface-container-lowest p-space-md shadow-sm space-y-3"
              >
                <div className="h-3 w-36 rounded bg-slate-200 animate-pulse" />
                <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
                <div className="space-y-2 py-2">
                  <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
                  <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="mt-auto h-9 w-full rounded-lg bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

