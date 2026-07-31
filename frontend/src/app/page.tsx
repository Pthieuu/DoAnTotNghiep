export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Graduation Project
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          AI Career Coach
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Nền tảng đánh giá CV, đối sánh với mô tả công việc và luyện phỏng vấn cá nhân hóa bằng AI.
        </p>
        <div className="mt-8 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          Frontend Next.js đã sẵn sàng
        </div>
      </section>
    </main>
  );
}
