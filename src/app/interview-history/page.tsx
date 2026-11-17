import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import Icon from "@/components/icon";
import {
  loadInterviewHistory,
  historyScore,
  type HistoryFilter,
} from "@/lib/interview-history";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interview History | Aizuchi.AI",
  description: "Your detailed mock interview history, rubric evaluations, and AI reports.",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

const statuses: Record<string, { label: string; className: string }> = {
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
};

export default async function InterviewHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const supabase = await createClient();
  const data = await loadInterviewHistory(supabase, user.id, {
    page: params.page,
    filter: params.filter,
  });

  const { page, pageSize, pageCount, filteredCount, filter, counts, sessions, error } = data;
  const startIndex = (page - 1) * pageSize;

  function buildPaginationHref(targetPage: number) {
    const query = new URLSearchParams();
    if (filter !== "all") query.set("filter", filter);
    query.set("page", String(targetPage));
    return `/interview-history?${query.toString()}`;
  }

  function buildFilterHref(targetFilter: HistoryFilter) {
    const query = new URLSearchParams();
    if (targetFilter !== "all") query.set("filter", targetFilter);
    return `/interview-history?${query.toString()}`;
  }

  const filterTabs: { id: HistoryFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "completed", label: "Completed", count: counts.completed },
    { id: "in_progress", label: "In Progress", count: counts.in_progress },
    { id: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  return (
    <DashboardShell user={user} activePage="Interview History">
      <div className="flex w-full flex-col space-y-space-lg">
        {/* Header Banner */}
        <header className="rounded-xl border border-surface-container bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Analytics &amp; History
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">
                Interview History &amp; AI Reports
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                Your detailed mock interview history, rubric evaluations, and AI reports.
              </p>
            </div>
            <Link
              href="/interview-setup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <Icon name="play_arrow" className="text-[18px]" />
              Start New Interview
            </Link>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="rounded-xl bg-error-container p-4 text-sm text-on-error-container">
            {error}
          </div>
        )}

        {/* Main Content Card */}
        <section
          aria-labelledby="history-list-heading"
          className="rounded-xl border border-surface-container bg-surface-container-lowest p-5 shadow-sm space-y-5"
        >
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container pb-4">
            <h2 id="history-list-heading" className="text-base font-bold text-primary">
              Interview Sessions ({counts.all})
            </h2>

            <nav aria-label="Filter interview status" className="flex flex-wrap gap-1.5 text-xs">
              {filterTabs.map((tab) => {
                const isSelected = filter === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={buildFilterHref(tab.id)}
                    aria-current={isSelected ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-white font-semibold"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table aria-label="Interview history table" className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-container-low text-xs text-on-surface-variant">
                <tr>
                  <th scope="col" className="p-3 font-semibold">Date / Time</th>
                  <th scope="col" className="p-3 font-semibold">Role &amp; Company</th>
                  <th scope="col" className="p-3 font-semibold">JLPT</th>
                  <th scope="col" className="p-3 font-semibold">Score</th>
                  <th scope="col" className="p-3 font-semibold">Status</th>
                  <th scope="col" className="p-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {sessions.map((session) => {
                  const timestamp = session.completed_at || session.created_at;
                  const date = timestamp ? new Date(timestamp) : null;
                  const statusConfig = statuses[session.status] || {
                    label: session.status,
                    className: "bg-slate-100 text-slate-600",
                  };

                  return (
                    <tr key={session.id} className="transition-colors hover:bg-surface">
                      <td className="whitespace-nowrap p-3 text-on-surface-variant">
                        {date && !Number.isNaN(date.getTime()) ? dateFormat.format(date) : "Unknown"}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-primary">{session.title}</p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {session.company || "Company not specified"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap p-3">
                        <span className="rounded-md bg-surface-container-low px-2 py-1 text-xs font-semibold text-primary">
                          {session.level || "Not set"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3 font-semibold text-primary">
                        {historyScore(session)}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">
                        {session.status === "completed" ? (
                          <Link
                            href={`/summary?sessionId=${session.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-secondary hover:text-white"
                          >
                            View Results
                            <Icon name="arrow_forward" className="text-[14px]" />
                          </Link>
                        ) : session.status === "in_progress" ? (
                          <Link
                            href={`/interview-room?sessionId=${session.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-secondary"
                          >
                            Resume
                            <Icon name="play_arrow" className="text-[14px]" />
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty State */}
            {!error && sessions.length === 0 && (
              <div className="py-12 text-center space-y-3">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-surface-container-low text-secondary">
                  <Icon name="history" className="text-2xl" />
                </span>
                <p className="text-sm font-semibold text-primary">
                  {filter === "all"
                    ? "No interview sessions recorded yet."
                    : `No interview sessions found with status "${filterTabs.find((t) => t.id === filter)?.label}".`}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Start a new mock interview session to practice and receive detailed AI feedback.
                </p>
                <div className="pt-2">
                  <Link
                    href="/interview-setup"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-secondary transition-colors"
                  >
                    <Icon name="play_arrow" className="text-[16px]" />
                    Start Interview
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {!error && filteredCount > pageSize && (
            <nav
              aria-label="Interview history pagination"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-container pt-4 text-sm"
            >
              <p className="text-xs text-on-surface-variant">
                {`Showing ${startIndex + 1}–${Math.min(startIndex + pageSize, filteredCount)} of ${filteredCount} sessions`}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={buildPaginationHref(page - 1)}
                    className="rounded-lg border border-surface-container px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-container transition-colors"
                  >
                    Previous
                  </Link>
                ) : (
                  <span aria-disabled="true" className="rounded-lg border border-surface-container/60 px-3 py-1.5 text-xs text-on-surface-variant/40 cursor-not-allowed">
                    Previous
                  </span>
                )}
                <span aria-live="polite" className="px-2 text-xs font-medium text-on-surface-variant">
                  {`Page ${page} of ${pageCount}`}
                </span>
                {page < pageCount ? (
                  <Link
                    href={buildPaginationHref(page + 1)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-secondary transition-colors"
                  >
                    Next
                  </Link>
                ) : (
                  <span aria-disabled="true" className="rounded-lg bg-primary/40 px-3 py-1.5 text-xs text-white/60 cursor-not-allowed">
                    Next
                  </span>
                )}
              </div>
            </nav>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
