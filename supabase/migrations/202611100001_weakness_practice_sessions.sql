begin;

create function public.valid_weakness_practice_criteria(criteria text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(criteria) between 1 and 5
    and array_ndims(criteria) = 1
    and criteria <@ array['C01', 'C02', 'C03', 'C04', 'C05']::text[]
    and cardinality(criteria) = (select count(distinct item) from unnest(criteria) as item);
$$;

alter table public.interview_sessions
  add column source_session_id uuid,
  add column selected_criteria text[] not null default '{}'::text[],
  add constraint interview_sessions_id_user_unique unique (id, user_id),
  add constraint interview_sessions_practice_source_owner_fk
    foreign key (source_session_id, user_id)
    references public.interview_sessions (id, user_id)
    on delete restrict,
  add constraint interview_sessions_practice_source_not_self
    check (source_session_id is null or source_session_id <> id),
  add constraint interview_sessions_practice_context_check
    check (
      (source_session_id is null and cardinality(selected_criteria) = 0)
      or (source_session_id is not null and public.valid_weakness_practice_criteria(selected_criteria))
    );

create index interview_sessions_practice_source_idx
  on public.interview_sessions (source_session_id, user_id)
  where source_session_id is not null;

commit;
