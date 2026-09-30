alter table public.interview_sessions
  add column if not exists target_role text,
  add column if not exists interview_language text not null default 'ja',
  add column if not exists question_count integer not null default 6,
  add column if not exists job_description text,
  add column if not exists cv_id uuid references public.candidate_cvs(id) on delete set null,
  add column if not exists cv_snapshot jsonb,
  add column if not exists questions jsonb not null default '[]'::jsonb;

alter table public.interview_sessions
  drop constraint if exists interview_sessions_target_role_check,
  drop constraint if exists interview_sessions_interview_language_check,
  drop constraint if exists interview_sessions_question_count_check,
  add constraint interview_sessions_target_role_check check (target_role is null or char_length(target_role) between 1 and 160),
  add constraint interview_sessions_interview_language_check check (interview_language in ('ja')),
  add constraint interview_sessions_question_count_check check (question_count in (4, 6, 8));

update public.interview_sessions set target_role = title where target_role is null;
