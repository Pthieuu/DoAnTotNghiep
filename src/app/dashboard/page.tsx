import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardPractice from "@/components/dashboard-practice";
import { DashboardHero, DashboardAnalytics, DashboardContext } from "@/components/dashboard-overview";
import { loadDashboardPractice } from "@/lib/dashboard-practice";
import { loadDashboardData, type DashboardSession } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard | Aizuchi.AI", description: "Your interview practice and progress." };

const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
const statuses: Record<string, string> = { completed: "Đã hoàn thành", in_progress: "Đang luyện", cancelled: "Đã hủy" };

function historyScore(session: DashboardSession) {
  const summary = session.summary_json;
  if (summary && typeof summary === "object" && "provisional" in summary && summary.provisional === true) {
    return "totalScore" in summary && typeof summary.totalScore === "number" && Number.isFinite(summary.totalScore)
      && summary.totalScore >= 0 && summary.totalScore <= 100 ? `${summary.totalScore}/100 (tạm tính)` : "Chưa đánh giá";
  }
  return typeof session.score === "number" && Number.isFinite(session.score) && session.score >= 0 && session.score <= 100
    ? `${session.score}/100` : "Chưa đánh giá";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const [data, practiceData, params] = await Promise.all([
    loadDashboardData(supabase, user.id), loadDashboardPractice(supabase, user.id), searchParams,
  ]);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(data.sessions.length / pageSize));
  const requestedPage = typeof params.historyPage === "string" ? Number(params.historyPage) : 1;
  const historyPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1;
  const startIndex = (historyPage - 1) * pageSize;
  const visibleSessions = data.sessions.slice(startIndex, startIndex + pageSize);
  function historyHref(page: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "historyPage" || value === undefined) continue;
      for (const entry of Array.isArray(value) ? value : [value]) query.append(key, entry);
    }
    query.set("historyPage", String(page));
    return `/dashboard?${query.toString()}#history`;
  }

  return <DashboardShell user={user}>
    <div className="flex w-full flex-col space-y-space-lg">
      <DashboardHero user={user} data={data} />
      {data.errors.length > 0 && <div role="alert" className="rounded-xl bg-error-container p-4 text-sm text-on-error-container"><ul className="list-inside list-disc space-y-1">{data.errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
      <DashboardAnalytics data={data} />
      <DashboardPractice key={practiceData.session?.id || "no-practice"} data={practiceData} />
      <DashboardContext data={data} />
      <section id="history" aria-labelledby="interview-history-heading" className="min-w-0 scroll-mt-24 rounded-xl border border-surface-container bg-surface-container-lowest p-5 shadow-sm">
        <h2 id="interview-history-heading" className="text-lg font-bold text-primary">Recent Interviews &amp; AI Reports</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Lịch sử phỏng vấn và kết quả được lưu trong tài khoản của bạn.</p>
        <div className="mt-4 overflow-x-auto">
          <table aria-label="Recent mock interview history" className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-container-low text-xs text-on-surface-variant"><tr>
              <th scope="col" className="p-3">Ngày / giờ</th><th scope="col" className="p-3">Vị trí / công ty</th><th scope="col" className="p-3">JLPT</th><th scope="col" className="p-3">Điểm</th><th scope="col" className="p-3">Trạng thái</th><th scope="col" className="p-3 text-right">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-surface-container">{visibleSessions.map(session => {
              const timestamp = session.completed_at || session.created_at;
              const date = timestamp ? new Date(timestamp) : null;
              return <tr key={session.id} className="hover:bg-surface">
                <td className="whitespace-nowrap p-3 text-on-surface-variant">{date && !Number.isNaN(date.getTime()) ? dateFormat.format(date) : "Chưa rõ"}</td>
                <td className="p-3"><p className="font-semibold text-primary">{session.title}</p><p className="mt-1 text-xs text-on-surface-variant">{session.company || "Chưa cung cấp công ty"}</p></td>
                <td className="p-3">{session.level || "Chưa chọn"}</td>
                <td className="whitespace-nowrap p-3 font-semibold text-primary">{historyScore(session)}</td>
                <td className="p-3"><span className="whitespace-nowrap rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-primary">{statuses[session.status] || session.status}</span></td>
                <td className="p-3 text-right">{session.status === "completed"
                  ? <Link href={`/summary?sessionId=${session.id}`} className="inline-block whitespace-nowrap rounded-lg bg-surface-container px-3 py-2 font-semibold text-primary hover:bg-secondary hover:text-white">Xem kết quả</Link>
                  : session.status === "in_progress" ? <Link href={`/interview-room?sessionId=${session.id}`} className="inline-block whitespace-nowrap rounded-lg bg-primary px-3 py-2 font-semibold text-white">Tiếp tục</Link> : <span className="text-on-surface-variant">—</span>}</td>
              </tr>;
            })}</tbody>
          </table>
          {data.sessionsError ? <p role="alert" className="py-6 text-center text-sm text-error">Không tải được lịch sử phỏng vấn.</p> : data.sessions.length === 0 && <p className="py-8 text-center text-sm text-on-surface-variant">Chưa có phiên phỏng vấn. Bắt đầu một phiên mới để theo dõi tiến độ.</p>}
        </div>
        {!data.sessionsError && data.sessions.length > pageSize && <nav aria-label="Interview history pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-surface-container pt-4 text-sm">
          <p className="text-on-surface-variant">{startIndex + 1}–{Math.min(startIndex + pageSize, data.sessions.length)} / {data.sessions.length} phiên</p>
          <div className="flex items-center gap-3">
            {historyPage > 1 ? <Link href={historyHref(historyPage - 1)} className="rounded-lg border border-surface-container px-3 py-2 font-medium text-primary">Trước</Link> : <span aria-disabled="true" className="text-on-surface-variant opacity-40">Trước</span>}
            <span aria-live="polite">Trang {historyPage} / {pageCount}</span>
            {historyPage < pageCount ? <Link href={historyHref(historyPage + 1)} className="rounded-lg bg-primary px-3 py-2 font-medium text-white">Sau</Link> : <span aria-disabled="true" className="text-on-surface-variant opacity-40">Sau</span>}
          </div>
        </nav>}
      </section>
    </div>
  </DashboardShell>;
}
