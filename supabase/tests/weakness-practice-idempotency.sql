begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');

insert into public.interview_sessions (id, user_id, title) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Source'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Other source');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

insert into public.interview_sessions (user_id, title, source_session_id, selected_criteria, practice_idempotency_key, practice_context)
values ('00000000-0000-4000-8000-000000000001', 'Practice',
  '10000000-0000-4000-8000-000000000001', array['C01'], 'request-key-1', '{"rubricVersion":"1.1"}');

do $$
begin
  begin
    insert into public.interview_sessions (user_id, title, source_session_id, selected_criteria, practice_idempotency_key)
    values ('00000000-0000-4000-8000-000000000001', 'Duplicate',
      '10000000-0000-4000-8000-000000000001', array['C02'], 'request-key-1');
    raise exception 'Duplicate idempotency key was accepted';
  exception when unique_violation then null;
  end;

  begin
    insert into public.interview_sessions (user_id, title, practice_idempotency_key)
    values ('00000000-0000-4000-8000-000000000001', 'Invalid', 'request-key-2');
    raise exception 'Idempotency key without a source was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.interview_sessions (user_id, title, source_session_id, selected_criteria, practice_context)
    values ('00000000-0000-4000-8000-000000000001', 'Invalid context',
      '10000000-0000-4000-8000-000000000001', array['C01'], '[]');
    raise exception 'Non-object practice context was accepted';
  exception when check_violation then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);

insert into public.interview_sessions (user_id, title, source_session_id, selected_criteria, practice_idempotency_key)
values ('00000000-0000-4000-8000-000000000002', 'Other practice',
  '10000000-0000-4000-8000-000000000002', array['C01'], 'request-key-1');

rollback;
