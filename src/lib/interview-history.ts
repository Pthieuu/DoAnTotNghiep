import type { createClient } from "./supabase/server";
import type { DashboardSession } from "./dashboard-data";
import type { RubricResult } from "./interview-rubric";

function provisionalAverage(answers: Array<{ score?: number | null; rubric?: RubricResult | null }>): number | null {
  const scores = answers
    .map((a) => {
      if (a.rubric && typeof a.rubric.totalScore === "number" && Number.isFinite(a.rubric.totalScore)) {
        return a.rubric.totalScore;
      }
      if (typeof a.score === "number" && Number.isFinite(a.score) && a.score >= 0 && a.score <= 10) {
        return a.score * 10;
      }
      return null;
    })
    .filter((value): value is number => value !== null);
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10;
}

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

    const sessions = (rows ?? []) as DashboardSession[];
    const missingIds = sessions
      .filter((s) => s.status === "completed" && historyScore(s) === "Not assessed")
      .map((s) => s.id);

    if (missingIds.length > 0) {
      const { data: answerRows } = await supabase
        .from("interview_answers")
        .select("session_id,score,rubric_json")
        .in("session_id", missingIds);

      if (answerRows && answerRows.length > 0) {
        const grouped = new Map<string, Array<{ score: number | null; rubric: RubricResult | null }>>();
        for (const row of answerRows as Array<{ session_id: string; score: number | null; rubric_json: RubricResult | null }>) {
          const list = grouped.get(row.session_id) ?? [];
          list.push({ score: row.score, rubric: row.rubric_json });
          grouped.set(row.session_id, list);
        }
        for (const session of sessions) {
          if (!missingIds.includes(session.id)) continue;
          const ans = grouped.get(session.id);
          if (!ans) continue;
          const avg = provisionalAverage(ans);
          if (avg !== null) {
            session.summary_json = {
              ...(session.summary_json && typeof session.summary_json === "object" ? session.summary_json : {}),
              provisional: true,
              totalScore: Math.round(avg),
            };
          }
        }
      }
    }

    return {
      sessions,
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
