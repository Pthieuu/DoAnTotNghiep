begin;
alter table public.user_settings
  add column email_reminders boolean not null default false,
  add column reminder_frequency text not null default 'weekly'
    check (reminder_frequency in ('daily', 'weekly'));
grant insert (email_reminders, reminder_frequency), update (email_reminders, reminder_frequency)
  on public.user_settings to authenticated;

-- Remove practice links and sessions in one transaction, with caller RLS applied.
create function public.delete_own_interview_history()
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update public.interview_sessions
    set source_session_id = null, selected_criteria = '{}'::text[]
    where user_id = auth.uid() and source_session_id is not null;
  delete from public.interview_sessions where user_id = auth.uid();
end;
$$;
revoke all on function public.delete_own_interview_history() from public, anon;
grant execute on function public.delete_own_interview_history() to authenticated;
commit;
