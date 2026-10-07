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
create table if not exists public.candidate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  katakana text not null default '' check (char_length(katakana) <= 120),
  phone text not null default '' check (char_length(phone) <= 40),
  summary text not null default '' check (char_length(summary) <= 3000),
  target text not null default '' check (char_length(target) <= 200),
  motivation text not null default '' check (char_length(motivation) <= 3000),
  jlpt_level text not null default 'N2' check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  employment_status text not null default 'student' check (employment_status in ('student', 'working')),
  updated_at timestamptz not null default now()
);

alter table public.candidate_profiles enable row level security;

create policy "Users can read their own candidate profile"
  on public.candidate_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own candidate profile"
  on public.candidate_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own candidate profile"
  on public.candidate_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.candidate_profiles to authenticated;
alter table public.candidate_profiles
  add column if not exists industries jsonb not null default '[]'::jsonb,
  add column if not exists languages jsonb not null default '[]'::jsonb,
  add column if not exists education_experience jsonb not null default '[]'::jsonb,
  add column if not exists technical_skills jsonb not null default '[]'::jsonb;
create table if not exists public.candidate_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_size bigint not null check (file_size between 1 and 15728640),
  status text not null default 'processing' check (status in ('processing', 'parsed', 'confirmed', 'error')),
  error_message text,
  extracted_data jsonb,
  confirmed_data jsonb,
  extraction_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidate_cvs_user_created_idx on public.candidate_cvs(user_id, created_at desc);
alter table public.candidate_cvs enable row level security;
create policy "Users can manage their own CVs" on public.candidate_cvs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.candidate_cvs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-cvs', 'candidate-cvs', false, 15728640,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = 15728640,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users manage files in their own CV folder" on storage.objects for all to authenticated
  using (bucket_id = 'candidate-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'candidate-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter table public.candidate_cvs
  add column if not exists edited_data jsonb,
  add column if not exists source text not null default 'upload';

alter table public.candidate_cvs
  drop constraint if exists candidate_cvs_file_size_check,
  drop constraint if exists candidate_cvs_source_check,
  drop constraint if exists candidate_cvs_storage_source_check;

alter table public.candidate_cvs
  alter column file_path drop not null,
  alter column file_size drop not null,
  add constraint candidate_cvs_source_check check (source in ('upload', 'manual')),
  add constraint candidate_cvs_storage_source_check check (
    (source = 'manual' and file_path is null and file_size is null)
    or (source = 'upload' and file_path is not null and file_size between 1 and 15728640)
  );
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
