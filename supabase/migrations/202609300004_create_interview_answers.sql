create table if not exists public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  answer text not null check (char_length(btrim(answer)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_answers_session_question_unique unique (session_id, question_index)
);

create index if not exists interview_answers_session_order_idx
  on public.interview_answers (session_id, question_index);

alter table public.interview_answers enable row level security;

create policy "Users can read answers for their own interview sessions"
  on public.interview_answers for select to authenticated
  using (exists (
    select 1 from public.interview_sessions
    where interview_sessions.id = interview_answers.session_id
      and interview_sessions.user_id = (select auth.uid())
  ));

create policy "Users can create answers for their own interview sessions"
  on public.interview_answers for insert to authenticated
  with check (exists (
    select 1 from public.interview_sessions
    where interview_sessions.id = interview_answers.session_id
      and interview_sessions.user_id = (select auth.uid())
      and interview_sessions.status = 'in_progress'
  ));

create policy "Users can update answers for their own interview sessions"
  on public.interview_answers for update to authenticated
  using (exists (
    select 1 from public.interview_sessions
    where interview_sessions.id = interview_answers.session_id
      and interview_sessions.user_id = (select auth.uid())
      and interview_sessions.status = 'in_progress'
  ))
  with check (exists (
    select 1 from public.interview_sessions
    where interview_sessions.id = interview_answers.session_id
      and interview_sessions.user_id = (select auth.uid())
      and interview_sessions.status = 'in_progress'
  ));

grant select, insert, update on public.interview_answers to authenticated;
