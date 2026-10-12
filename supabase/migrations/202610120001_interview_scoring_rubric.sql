-- Additive only: historical answers retain null and their original scores.
alter table public.interview_answers
  add column if not exists rubric_json jsonb;
