import type { createClient } from "./supabase/server";
import type { DashboardSession } from "./dashboard-data";

export const HISTORY_PAGE_SIZE = 10;

export type HistoryFilter = "all" | "completed" | "in_progress" | "cancelled";

export type InterviewHistoryData = {
  sessions: DashboardSession[];
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  filter: HistoryFilter;
  counts: {
    all: number;
    completed: number;
    in_progress: number;
    cancelled: number;
  };
  error: string | null;
};

export function historyScore(session: DashboardSession): string {
  const summary = session.summary_json;
  if (summary && typeof summary === "object" && "provisional" in summary && summary.provisional === true) {
    return "totalScore" in summary && typeof summary.totalScore === "number" && Number.isFinite(summary.totalScore)
      && summary.totalScore >= 0 && summary.totalScore <= 100 ? `${summary.totalScore}/100 (provisional)` : "Not assessed";
  }
  return typeof session.score === "number" && Number.isFinite(session.score) && session.score >= 0 && session.score <= 100
    ? `${session.score}/100` : "Not assessed";
}

const HISTORY_COLUMNS = "id,title,company,level,score,status,completed_at,created_at,summary_json,interview_type,interview_language,question_count";

export async function loadInterviewHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  options?: { page?: unknown; filter?: unknown; pageSize?: number }
): Promise<InterviewHistoryData> {
  const pageSize = options?.pageSize ?? HISTORY_PAGE_SIZE;
  const rawFilter = typeof options?.filter === "string" ? options.filter.toLowerCase().trim() : "all";
  const filter: HistoryFilter = ["completed", "in_progress", "cancelled"].includes(rawFilter)
    ? (rawFilter as HistoryFilter)
    : "all";

  try {
    const [allCountRes, completedRes, inProgressRes, cancelledRes] = await Promise.all([
      supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
      supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "in_progress"),
      supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "cancelled"),
    ]);

    const counts = {
      all: allCountRes.count ?? 0,
      completed: completedRes.count ?? 0,
      in_progress: inProgressRes.count ?? 0,
      cancelled: cancelledRes.count ?? 0,
    };

    const filteredCount = filter === "all" ? counts.all : counts[filter];
    const pageCount = Math.max(1, Math.ceil(filteredCount / pageSize));
    const parsedPage = typeof options?.page === "string" ? Number(options.page) : NaN;
    const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, pageCount) : 1;
    const from = (page - 1) * pageSize;

    if (filteredCount === 0) {
      return {
        sessions: [],
        totalCount: counts.all,
        filteredCount: 0,
        page: 1,
        pageSize,
        pageCount: 1,
        filter,
        counts,
        error: null,
      };
    }

    let query = supabase.from("interview_sessions").select(HISTORY_COLUMNS).eq("user_id", userId);
    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    query = query
      .order("completed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1);

    const { data: rows, error } = await query;
    if (error) {
      return {
        sessions: [],
        totalCount: counts.all,
        filteredCount,
        page,
        pageSize,
        pageCount,
        filter,
        counts,
        error: "Unable to load interview sessions. Please refresh the page.",
      };
    }

    return {
      sessions: (rows ?? []) as DashboardSession[],
      totalCount: counts.all,
      filteredCount,
      page,
      pageSize,
      pageCount,
      filter,
      counts,
      error: null,
    };
  } catch {
    return {
      sessions: [],
      totalCount: 0,
      filteredCount: 0,
      page: 1,
      pageSize,
      pageCount: 1,
      filter,
      counts: { all: 0, completed: 0, in_progress: 0, cancelled: 0 },
      error: "Interview history service is temporarily unavailable. Please try again later.",
    };
  }
}
