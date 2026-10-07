-- Add interview_type to interview_sessions (technical / behavioral / mixed)
alter table public.interview_sessions
  add column if not exists interview_type text not null default 'mixed'
    check (interview_type in ('technical', 'behavioral', 'mixed'));

-- Add summary_json to store final summary data
alter table public.interview_sessions
  add column if not exists summary_json jsonb;

-- Relax question_count constraint to allow 5, 10, 15 (Vietnamese practice)
alter table public.interview_sessions
  drop constraint if exists interview_sessions_question_count_check;
alter table public.interview_sessions
  add constraint interview_sessions_question_count_check
    check (question_count in (4, 5, 6, 8, 10, 15));

-- Allow Vietnamese interview language
alter table public.interview_sessions
  drop constraint if exists interview_sessions_interview_language_check;
alter table public.interview_sessions
  add constraint interview_sessions_interview_language_check
    check (interview_language in ('ja', 'vi'));

-- Add evaluation columns to interview_answers
alter table public.interview_answers
  add column if not exists question_type text check (question_type is null or question_type in ('technical', 'behavioral')),
  add column if not exists question_text text,
  add column if not exists score float check (score is null or (score >= 0 and score <= 10)),
  add column if not exists feedback text,
  add column if not exists suggestion text;
