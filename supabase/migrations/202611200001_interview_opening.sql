-- Keep the unscored opening separate from interview_answers and question_count.
-- Existing session ownership RLS also protects this field.
alter table public.interview_sessions
  add column if not exists self_introduction text;
-- PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS; allow SQL Editor reruns.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.interview_sessions'::regclass
      and conname = 'interview_sessions_introduction_length'
  ) then
    alter table public.interview_sessions
      add constraint interview_sessions_introduction_length
      check (self_introduction is null or char_length(btrim(self_introduction)) between 1 and 10000);
  end if;
end;
$$;
