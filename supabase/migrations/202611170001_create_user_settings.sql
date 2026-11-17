create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_jlpt text not null default 'N3' check (default_jlpt in ('N5', 'N4', 'N3', 'N2', 'N1')),
  interview_lang text not null default 'ja' check (interview_lang in ('ja', 'vi')),
  eval_framework text not null default 'STAR' check (eval_framework in ('PREP', 'STAR')),
  ai_voice text not null default 'Kore' check (ai_voice in ('Kore', 'Aoede', 'Puck', 'Charon', 'Fenrir')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon, authenticated;
grant select on public.user_settings to authenticated;
grant insert (user_id, default_jlpt, interview_lang, eval_framework, ai_voice),
  update (user_id, default_jlpt, interview_lang, eval_framework, ai_voice)
  on public.user_settings to authenticated;

create policy "Users read own settings" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create own settings" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own settings" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.set_user_settings_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_user_settings_updated_at();
