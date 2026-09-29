create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  company text check (company is null or char_length(company) <= 160),
  level text check (level is null or char_length(level) <= 20),
  score integer check (score is null or score between 0 and 100),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint completed_session_has_timestamp check (status <> 'completed' or completed_at is not null)
);

create index if not exists interview_sessions_user_completed_idx
  on public.interview_sessions (user_id, completed_at desc nulls last);

alter table public.interview_sessions enable row level security;

create policy "Users can read their own interview sessions"
  on public.interview_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own interview sessions"
  on public.interview_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own interview sessions"
  on public.interview_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own interview sessions"
  on public.interview_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.interview_sessions to authenticated;
