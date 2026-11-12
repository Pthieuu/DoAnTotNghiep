import type { createClient } from "./supabase/server";
import { validateCv, type CvData } from "./cv-schema";
import { CRITERIA, RUBRIC_VERSION, type CriterionId } from "./interview-rubric";

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
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function criterionLevel(row: DashboardAnswer, id: CriterionId): number | null {
  const rubric = row.rubric_json;
  if (!record(rubric) || rubric.version !== RUBRIC_VERSION || !Array.isArray(rubric.criteria) || !row.answer?.trim()) return null;
  const matches = rubric.criteria.filter(record).filter(criterion => criterion.id === id);
  if (matches.length !== 1) return null;
  const { status, level, reason, evidence } = matches[0];
  if (status !== "scored" || typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > 4
    || typeof reason !== "string" || !reason.trim() || typeof evidence !== "string"
    || (level > 0 && !evidence.trim()) || (evidence && !row.answer.includes(evidence))) return null;
  return level;
}

function validRows(session: DashboardSession, answers: readonly DashboardAnswer[]) {
  const rows = answers.filter(answer => answer.session_id === session.id);
  const counts = new Map<number, number>();
  rows.forEach(row => counts.set(row.question_index, (counts.get(row.question_index) ?? 0) + 1));
  return rows.filter(row => Number.isInteger(row.question_index) && row.question_index >= 0
    && row.question_index < session.question_count && counts.get(row.question_index) === 1);
}

function scoreScope(session: DashboardSession, answers: readonly DashboardAnswer[]): string | null {
  if (typeof session.score !== "number" || !Number.isFinite(session.score) || session.score < 0 || session.score > 100) return null;
  if (record(session.summary_json) && (session.summary_json.provisional === true || session.summary_json.completionScope)) return null;
  const rows = validRows(session, answers);
  const storedRows = answers.filter(answer => answer.session_id === session.id);
  if (rows.length !== storedRows.length) return null;
  const legacy = !rows.length || rows.every(row => row.rubric_json === null);
  if (!legacy && (rows.length !== session.question_count || rows.some(row => CRITERIA.some(({ id }) => criterionLevel(row, id) === null)))) return null;
  return JSON.stringify([legacy ? "legacy" : RUBRIC_VERSION, session.interview_language, session.level,
    session.interview_type, session.target_role || session.title, session.job_description]);
}

export function buildDashboardData(input: {
  profile: DashboardProfile | null; cv: DashboardCv | null; sessions: DashboardSession[];
  answers: DashboardAnswer[]; errors?: string[]; sessionsError?: boolean; answersError?: boolean;
}): DashboardData {
  const sessions = [...input.sessions].sort((a, b) => (b.completed_at || b.created_at || "").localeCompare(a.completed_at || a.created_at || "") || b.id.localeCompare(a.id));
  const completed = sessions.filter(session => session.status === "completed");
  const recent = completed.slice(0, 20);
  const latest = [...sessions].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0] ?? null;
  const skillSession = recent[0] ?? null;
  const skillRows = skillSession && !input.answersError ? validRows(skillSession, input.answers) : [];
  const skills = CRITERIA.map(({ id, name }): DashboardSkill => {
    const levels = skillRows.map(row => criterionLevel(row, id)).filter((level): level is number => level !== null);
    return { id, name, assessedAnswers: levels.length, percent: levels.length ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length * 25) : null };
  });
  const eligible = input.answersError ? [] : recent.flatMap(session => {
    const scope = scoreScope(session, input.answers);
    return scope ? [{ session, scope }] : [];
  });
  const comparable = eligible.filter(item => item.scope === eligible[0]?.scope).map(item => item.session);
  const scores = comparable.slice(0, 5).reverse();
  return {
    profile: input.profile, cv: input.cv,
    confirmedCv: input.cv?.status === "confirmed" && validateCv(input.cv.confirmed_data) ? input.cv.confirmed_data : null,
    sessions, latest, completedCount: input.sessionsError ? null : completed.length, skills, skillSession,
    averageScore: comparable.length ? Math.round(comparable.reduce((sum, session) => sum + session.score!, 0) / comparable.length) : null,
    scoredCount: comparable.length, scores,
    trend: scores.length >= 2 ? scores.at(-1)!.score! - scores[0].score! : null,
    errors: input.errors ?? [], sessionsError: input.sessionsError ?? false,
  };
}

export async function loadDashboardData(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<DashboardData> {
  const results = await Promise.allSettled([
    supabase.from("candidate_profiles").select("full_name,target,jlpt_level,industries,languages,technical_skills").eq("user_id", userId).maybeSingle(),
    supabase.from("candidate_cvs").select("id,file_name,status,confirmed_data,updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("interview_sessions").select("id,title,company,level,score,status,completed_at,created_at,target_role,job_description,interview_language,interview_type,question_count,summary_json")
      .eq("user_id", userId).order("completed_at", { ascending: false, nullsFirst: false }),
  ]);
  const errors: string[] = [];
  const labels = ["hồ sơ cá nhân", "CV", "lịch sử phỏng vấn"];
  const failed = results.map((result, index) => {
    const error = result.status === "rejected" || result.value.error;
    if (error) errors.push(`Không tải được ${labels[index]}. Vui lòng tải lại trang.`);
    return !!error;
  });
  const data = results.map((result, index) => result.status === "fulfilled" && !failed[index] ? result.value.data : null);
  const sessions = (data[2] ?? []) as DashboardSession[];
  const ids = sessions.filter(session => session.status === "completed")
    .sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || "") || b.id.localeCompare(a.id)).slice(0, 20).map(session => session.id);
  let answers: DashboardAnswer[] = [];
  let answersError = false;
  if (ids.length) {
    try {
      const result = await supabase.from("interview_answers").select("session_id,question_index,answer,rubric_json").in("session_id", ids);
      if (result.error) throw new Error("Answers unavailable");
      answers = (result.data ?? []) as DashboardAnswer[];
    } catch {
      answersError = true;
      errors.push("Không tải được rubric chấm điểm. Các chỉ số kỹ năng tạm thời chưa hiển thị.");
    }
  }
  return buildDashboardData({ profile: data[0] as DashboardProfile | null, cv: data[1] as DashboardCv | null,
    sessions, answers, errors, sessionsError: failed[2], answersError });
}
