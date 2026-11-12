import type { createClient } from "./supabase/server";
import { validateCv, type CvData } from "./cv-schema";
import { CRITERIA, RUBRIC_VERSION, type CriterionId } from "./interview-rubric";

export const DASHBOARD_RECENT_LIMIT = 20;
export const DASHBOARD_HISTORY_PAGE_SIZE = 5;

export type DashboardSession = {
  id: string; title: string; company: string | null; level: string | null;
  score: number | null; status: string; completed_at: string | null; created_at: string;
  target_role: string | null; job_description: string | null; interview_language: string | null;
  interview_type: string | null; question_count: number; summary_json: unknown;
};
export type DashboardProfile = {
  full_name: string | null; target: string | null; jlpt_level: string | null;
  industries: unknown; languages: unknown; technical_skills: unknown;
};
export type DashboardCv = { id: string; file_name: string; status: string; confirmed_data: unknown; updated_at: string };
export type DashboardAnswer = { session_id: string; question_index: number; answer: string; rubric_json: unknown };
export type DashboardSkill = { id: CriterionId; name: string; percent: number | null; assessedAnswers: number };
export type DashboardData = {
  profile: DashboardProfile | null;
  cv: DashboardCv | null;
  confirmedCv: CvData | null;
  sessions: DashboardSession[];
  latest: DashboardSession | null;
  completedCount: number | null;
  skills: DashboardSkill[];
  skillSession: DashboardSession | null;
  averageScore: number | null;
  scoredCount: number;
  scores: DashboardSession[];
  trend: number | null;
  errors: string[];
  sessionsError: boolean;
  history: { page: number; pageSize: number; totalCount: number | null };
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function criterionLevels(row: DashboardAnswer): { levels: Map<CriterionId, number>; legacy: boolean } {
  const levels = new Map<CriterionId, number>();
  const rubric = row.rubric_json;
  const legacy = rubric === null;
  if (!record(rubric) || rubric.version !== RUBRIC_VERSION || !Array.isArray(rubric.criteria) || !row.answer?.trim()) return { levels, legacy };
  const seen = new Set<CriterionId>();
  for (const criterion of rubric.criteria) {
    if (!record(criterion)) continue;
    const definition = CRITERIA.find(item => item.id === criterion.id);
    if (!definition) continue;
    const { id } = definition;
    if (seen.has(id)) { levels.delete(id); continue; }
    seen.add(id);
    const { status, level, reason, evidence } = criterion;
    if (status !== "scored" || typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > 4
      || typeof reason !== "string" || !reason.trim() || typeof evidence !== "string"
      || (level > 0 && !evidence.trim()) || (evidence && !row.answer.includes(evidence))) continue;
    levels.set(id, level);
  }
  return { levels, legacy };
}

type SessionAssessment = {
  storedCount: number; validCount: number; legacy: boolean; fullyScored: boolean;
  totals: Map<CriterionId, { sum: number; count: number }>;
};

function assessSessions(sessions: readonly DashboardSession[], answers: readonly DashboardAnswer[]) {
  const grouped = new Map(sessions.map(session => [session.id, {
    session, storedCount: 0, rows: new Map<number, DashboardAnswer | null>(),
  }]));
  for (const answer of answers) {
    const group = grouped.get(answer.session_id);
    if (!group) continue;
    group.storedCount++;
    group.rows.set(answer.question_index, group.rows.has(answer.question_index) ? null : answer);
  }
  const assessments = new Map<string, SessionAssessment>();
  for (const [id, group] of grouped) {
    const assessment: SessionAssessment = { storedCount: group.storedCount, validCount: 0, legacy: true, fullyScored: true, totals: new Map() };
    for (const [index, row] of group.rows) {
      if (!row || !Number.isInteger(index) || index < 0 || index >= group.session.question_count) continue;
      assessment.validCount++;
      const parsed = criterionLevels(row);
      assessment.legacy &&= parsed.legacy;
      assessment.fullyScored &&= parsed.levels.size === CRITERIA.length;
      for (const [criterionId, level] of parsed.levels) {
        const total = assessment.totals.get(criterionId) ?? { sum: 0, count: 0 };
        total.sum += level;
        total.count++;
        assessment.totals.set(criterionId, total);
      }
    }
    assessments.set(id, assessment);
  }
  return assessments;
}

function scoreScope(session: DashboardSession, assessment: SessionAssessment): string | null {
  if (typeof session.score !== "number" || !Number.isFinite(session.score) || session.score < 0 || session.score > 100) return null;
  if (record(session.summary_json) && (session.summary_json.provisional === true || session.summary_json.completionScope)) return null;
  if (assessment.validCount !== assessment.storedCount) return null;
  if (!assessment.legacy && (assessment.validCount !== session.question_count || !assessment.fullyScored)) return null;
  return JSON.stringify([assessment.legacy ? "legacy" : RUBRIC_VERSION, session.interview_language, session.level,
    session.interview_type, session.target_role || session.title, session.job_description]);
}

export function buildDashboardData(input: {
  profile: DashboardProfile | null; cv: DashboardCv | null; sessions: DashboardSession[];
  answers: DashboardAnswer[]; errors?: string[]; sessionsError?: boolean; answersError?: boolean;
  recentCompleted?: DashboardSession[]; latest?: DashboardSession | null; completedCount?: number | null;
  history?: DashboardData["history"];
}): DashboardData {
  const sessions = [...input.sessions].sort((a, b) => (b.completed_at || b.created_at || "").localeCompare(a.completed_at || a.created_at || "") || b.id.localeCompare(a.id));
  const completed = sessions.filter(session => session.status === "completed");
  const recent = (input.recentCompleted ?? completed).slice(0, DASHBOARD_RECENT_LIMIT);
  const latest = input.latest !== undefined ? input.latest : sessions.reduce<DashboardSession | null>((current, session) =>
    !current || (session.created_at || "") > (current.created_at || "") ? session : current, null);
  const skillSession = recent[0] ?? null;
  const assessments = assessSessions(recent, input.answersError ? [] : input.answers);
  const skillTotals = skillSession && !input.answersError ? assessments.get(skillSession.id)?.totals : undefined;
  const skills = CRITERIA.map(({ id, name }): DashboardSkill => {
    const total = skillTotals?.get(id);
    return { id, name, assessedAnswers: total?.count ?? 0, percent: total ? Math.round(total.sum / total.count * 25) : null };
  });
  const eligible = input.answersError ? [] : recent.flatMap(session => {
    const scope = scoreScope(session, assessments.get(session.id)!);
    return scope ? [{ session, scope }] : [];
  });
  const comparable = eligible.filter(item => item.scope === eligible[0]?.scope).map(item => item.session);
  const scores = comparable.slice(0, 5).reverse();
  return {
    profile: input.profile, cv: input.cv,
    confirmedCv: input.cv?.status === "confirmed" && validateCv(input.cv.confirmed_data) ? input.cv.confirmed_data : null,
    sessions, latest, completedCount: input.completedCount !== undefined ? input.completedCount : input.sessionsError ? null : completed.length, skills, skillSession,
    averageScore: comparable.length ? Math.round(comparable.reduce((sum, session) => sum + session.score!, 0) / comparable.length) : null,
    scoredCount: comparable.length, scores,
    trend: scores.length >= 2 ? scores.at(-1)!.score! - scores[0].score! : null,
    errors: input.errors ?? [], sessionsError: input.sessionsError ?? false,
    history: input.history ?? { page: 1, pageSize: DASHBOARD_HISTORY_PAGE_SIZE, totalCount: sessions.length },
  };
}

const SESSION_COLUMNS = "id,title,company,level,score,status,completed_at,created_at,target_role,job_description,interview_language,interview_type,question_count,summary_json";
const HISTORY_COLUMNS = "id,title,company,level,score,status,completed_at,created_at,summary_json";

export async function loadDashboardData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestedPage: unknown = "1",
): Promise<DashboardData> {
  const results = await Promise.allSettled([
    supabase.from("candidate_profiles").select("full_name,target,jlpt_level,industries,languages,technical_skills").eq("user_id", userId).maybeSingle(),
    supabase.from("candidate_cvs").select("id,file_name,status,confirmed_data,updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("interview_sessions").select(SESSION_COLUMNS, { count: "exact" }).eq("user_id", userId).eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).limit(DASHBOARD_RECENT_LIMIT),
    supabase.from("interview_sessions").select(SESSION_COLUMNS).eq("user_id", userId)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const errors: string[] = [];
  const labels = ["hồ sơ cá nhân", "CV", "tổng số phiên phỏng vấn", "thống kê phiên hoàn thành", "ngữ cảnh phỏng vấn gần nhất"];
  const values = results.map((result, index) => {
    if (result.status === "rejected" || result.value.error) {
      errors.push(`Không tải được ${labels[index]}. Vui lòng tải lại trang.`);
      return null;
    }
    return result.value;
  });
  const totalCount = values[2]?.count ?? null;
  const completedCount = values[3]?.count ?? null;
  const pageCount = Math.max(1, Math.ceil((totalCount ?? 0) / DASHBOARD_HISTORY_PAGE_SIZE));
  const parsedPage = typeof requestedPage === "string" ? Number(requestedPage) : NaN;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, pageCount) : 1;
  const from = (page - 1) * DASHBOARD_HISTORY_PAGE_SIZE;
  const recent = (values[3]?.data ?? []) as DashboardSession[];
  const ids = recent.map(session => session.id);
  let historyError = false;
  let answersError = false;
  const [historyResult, answersResult] = await Promise.allSettled([
    totalCount === 0 ? Promise.resolve({ data: [], error: null })
      : supabase.from("interview_sessions").select(HISTORY_COLUMNS).eq("user_id", userId)
        .order("completed_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
        .range(from, from + DASHBOARD_HISTORY_PAGE_SIZE - 1),
    ids.length ? supabase.from("interview_answers").select("session_id,question_index,answer,rubric_json").in("session_id", ids)
      .limit(DASHBOARD_RECENT_LIMIT * 15) : Promise.resolve({ data: [], error: null }),
  ]);
  let sessions: DashboardSession[] = [];
  let answers: DashboardAnswer[] = [];
  if (historyResult.status === "rejected" || historyResult.value.error) {
    historyError = true;
    errors.push("Không tải được lịch sử phỏng vấn. Vui lòng tải lại trang.");
  } else sessions = (historyResult.value.data ?? []) as DashboardSession[];
  if (answersResult.status === "rejected" || answersResult.value.error) {
    answersError = true;
    errors.push("Không tải được rubric chấm điểm. Các chỉ số kỹ năng tạm thời chưa hiển thị.");
  } else answers = (answersResult.value.data ?? []) as DashboardAnswer[];

  return buildDashboardData({
    profile: (values[0]?.data ?? null) as DashboardProfile | null,
    cv: (values[1]?.data ?? null) as DashboardCv | null,
    latest: (values[4]?.data ?? null) as DashboardSession | null,
    sessions, recentCompleted: recent, completedCount, answers, errors, answersError,
    sessionsError: historyError || !values[2],
    history: { page, pageSize: DASHBOARD_HISTORY_PAGE_SIZE, totalCount },
  });
}
