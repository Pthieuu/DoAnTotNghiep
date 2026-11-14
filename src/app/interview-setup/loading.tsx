import DashboardShell from "@/components/dashboard-shell";

export default function InterviewSetupLoading() {
  return (
    <DashboardShell activePage="Interview Setup">
      <div className="flex w-full flex-col space-y-6" role="status" aria-busy="true" aria-label="Đang nạp cấu hình phỏng vấn">
        <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-5 text-indigo-900 shadow-xs">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">Đang nạp cấu hình phỏng vấn...</p>
            <p className="text-xs text-slate-600">Chuẩn bị thông tin CV và thiết lập câu hỏi.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
          <div className="h-6 w-52 rounded bg-slate-200 animate-pulse" />
          <div className="space-y-4">
            <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-28 w-full rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-12 w-48 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
