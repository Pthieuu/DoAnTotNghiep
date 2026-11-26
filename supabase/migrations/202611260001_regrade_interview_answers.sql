-- Only the server's service role may replace a failed grade. The answer and
-- cached summary change in one transaction so reports cannot keep stale scores.
create or replace function public.save_regraded_interview_answer(
  p_session_id uuid,
  p_question_index integer,
  p_expected_answer text,
  p_score double precision,
  p_rubric jsonb,
  p_feedback text,
  p_suggestion text
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  changed integer;
begin
  if p_rubric is null or (p_score is not null and (p_score < 0 or p_score > 10)) then
    return false;
  end if;

  update public.interview_answers
  set score = p_score,
      rubric_json = p_rubric,
      feedback = p_feedback,
      suggestion = p_suggestion,
      updated_at = now()
  where session_id = p_session_id
    and question_index = p_question_index
    and answer = p_expected_answer
    and score is null
    and (
      rubric_json is null
      or rubric_json #>> '{criteria,0,reason}' = 'AI chưa trả về kết quả chấm hợp lệ.'
    );
  get diagnostics changed = row_count;
  if changed <> 1 then return false; end if;

  update public.interview_sessions
  set summary_json = null, score = null, updated_at = now()
  where id = p_session_id;
  -- Practice comparisons cache the source rubric inside their summaries.
  update public.interview_sessions
  set summary_json = null, score = null, updated_at = now()
  where source_session_id = p_session_id;
  return true;
end;
$$;

revoke all on function public.save_regraded_interview_answer(uuid, integer, text, double precision, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.save_regraded_interview_answer(uuid, integer, text, double precision, jsonb, text, text) to service_role;
