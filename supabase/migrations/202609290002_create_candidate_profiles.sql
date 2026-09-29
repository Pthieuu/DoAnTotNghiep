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
