import type { SummaryResult } from "./interview-summary";

type SessionQueryError = { code?: string; message?: string };
type SessionQueryResult<T> = { data: T | null; error: SessionQueryError | null };

type InterviewSessionRow = {
  id: string;
  title: string;
  status: string;
  company: string | null;
  level: string | null;
  questions: unknown;
  cv_snapshot: unknown;
  interview_type: string | null;
  interview_language: string | null;
  target_role: string | null;
  job_description: string | null;
  question_count: number | null;
  summary_json: SummaryResult | null;
  source_session_id?: string | null;
  selected_criteria?: unknown;
};

export async function querySessionWithPractice(
  query: (columns: string) => PromiseLike<SessionQueryResult<unknown>>,
  columns: string,
): Promise<SessionQueryResult<InterviewSessionRow> & { practiceAvailable: boolean }> {
  const result = await query(`${columns},source_session_id,selected_criteria`);
  if (result.error && ["42703", "PGRST204"].includes(result.error.code ?? "")
    && /\b(source_session_id|selected_criteria)\b/.test(result.error.message ?? "")) {
    const fallback = await query(columns);
    return { ...fallback, data: fallback.data as InterviewSessionRow | null, practiceAvailable: false };
  }
  return { ...result, data: result.data as InterviewSessionRow | null, practiceAvailable: !result.error };
}
