alter table public.user_settings
  add column question_count integer not null default 6
  check (question_count in (4, 6, 8, 10));

grant insert (question_count), update (question_count)
  on public.user_settings to authenticated;
