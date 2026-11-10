begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');

insert into public.interview_sessions (id, user_id, title) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Source'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Other source');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

insert into public.interview_sessions (id, user_id, title, source_session_id, selected_criteria)
values ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Practice',
  '10000000-0000-4000-8000-000000000001', array['C01', 'C03']);

do $$
declare
  invalid_criteria text[];
begin
  if exists (select 1 from public.interview_sessions where user_id = '00000000-0000-4000-8000-000000000002') then
    raise exception 'RLS exposed another user session';
  end if;

  begin
    update public.interview_sessions
      set source_session_id = '10000000-0000-4000-8000-000000000002'
      where id = '10000000-0000-4000-8000-000000000003';
    raise exception 'Cross-owner source update was accepted';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.interview_sessions (user_id, title, source_session_id, selected_criteria)
    values ('00000000-0000-4000-8000-000000000001', 'Invalid practice',
      '10000000-0000-4000-8000-000000000002', array['C01']);
    raise exception 'Cross-owner source insert was accepted';
  exception when foreign_key_violation then null;
  end;

  foreach invalid_criteria slice 1 in array array[
    array['C99', 'C01'], array['C01', 'C01'], array['C01', null]
  ] loop
    begin
      update public.interview_sessions set selected_criteria = invalid_criteria
        where id = '10000000-0000-4000-8000-000000000003';
      raise exception 'Invalid criteria were accepted: %', invalid_criteria;
    exception when check_violation then null;
    end;
  end loop;

  begin
    update public.interview_sessions set selected_criteria = '{}'
      where id = '10000000-0000-4000-8000-000000000003';
    raise exception 'Empty practice criteria were accepted';
  exception when check_violation then null;
  end;

  begin
    update public.interview_sessions set source_session_id = id
      where id = '10000000-0000-4000-8000-000000000003';
    raise exception 'Self-reference was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.interview_sessions set selected_criteria = array['C01']
      where id = '10000000-0000-4000-8000-000000000001';
    raise exception 'Criteria without a source were accepted';
  exception when check_violation then null;
  end;

  begin
    delete from public.interview_sessions where id = '10000000-0000-4000-8000-000000000001';
    raise exception 'A referenced source was deleted';
  exception when foreign_key_violation then null;
  end;
end;
$$;

reset role;

do $$
begin
  begin
    update public.interview_sessions set user_id = '00000000-0000-4000-8000-000000000002'
      where id = '10000000-0000-4000-8000-000000000001';
    raise exception 'Source ownership change broke the practice link';
  exception when foreign_key_violation then null;
  end;
end;
$$;

rollback;
