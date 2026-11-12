begin;

create index if not exists interview_sessions_user_completed_recent_idx
  on public.interview_sessions (user_id, completed_at desc nulls last, id desc)
  where status = 'completed';

create index if not exists interview_sessions_user_created_idx
  on public.interview_sessions (user_id, created_at desc, id desc);

commit;
