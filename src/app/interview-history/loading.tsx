import DashboardShell from "@/components/dashboard-shell";

export default function InterviewHistoryLoading() {
  return (
    <DashboardShell activePage="Interview History">
      <div
        className="flex w-full flex-col space-y-space-lg"
        role="status"
        aria-busy="true"
        aria-label="Loading interview history"
      >
        {/* Header Skeleton */}
        <header className="rounded-xl border border-surface-container bg-surface-container-lowest p-6 shadow-sm">
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">Interview History</h1>
            <p className="text-sm text-on-surface-variant">
              Your detailed mock interview history, rubric evaluations, and AI reports.
            </p>
          </div>
        </header>

        {/* Loading Notice Banner */}
        <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-5 text-indigo-900 shadow-xs">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">Loading interview history...</p>
            <p className="text-xs text-slate-600">Aggregating interview sessions and grading results from the database.</p>
          </div>
        </div>

        {/* Table Skeleton */}
        <section className="rounded-xl border border-surface-container bg-surface-container-lowest p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-4">
            <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 w-20 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-surface-container/60 py-3">
                <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                <div className="h-4 w-44 rounded bg-slate-200 animate-pulse" />
                <div className="h-4 w-16 rounded bg-slate-100 animate-pulse" />
                <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                <div className="h-6 w-24 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-8 w-24 rounded-lg bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
