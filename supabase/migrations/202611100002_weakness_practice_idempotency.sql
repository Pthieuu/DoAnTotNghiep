begin;

alter table public.interview_sessions
  add column practice_idempotency_key text,
  add column practice_context jsonb,
  add constraint interview_sessions_practice_key_check check (
    practice_idempotency_key is null
    or (source_session_id is not null and practice_idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$')
  ),
  add constraint interview_sessions_practice_snapshot_check check (
    practice_context is null
    or (source_session_id is not null and jsonb_typeof(practice_context) = 'object')
  );

create unique index interview_sessions_practice_idempotency_idx
  on public.interview_sessions (user_id, practice_idempotency_key)
  where practice_idempotency_key is not null;

commit;
