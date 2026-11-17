export default function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Đang tải cài đặt" className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <span className="sr-only">Đang tải cài đặt…</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse space-y-6">
        <div className="h-6 w-56 rounded bg-slate-200" />
        <div className="grid gap-6 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <div key={item} className="space-y-3"><div className="h-4 w-32 rounded bg-slate-100" /><div className="h-12 rounded-lg bg-slate-100" /></div>)}
        </div>
        <div className="h-10 w-36 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
