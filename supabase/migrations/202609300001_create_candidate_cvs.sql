create table if not exists public.candidate_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_size bigint not null check (file_size between 1 and 15728640),
  status text not null default 'processing' check (status in ('processing', 'parsed', 'confirmed', 'error')),
  error_message text,
  extracted_data jsonb,
  confirmed_data jsonb,
  extraction_notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidate_cvs_user_created_idx on public.candidate_cvs(user_id, created_at desc);
alter table public.candidate_cvs enable row level security;
create policy "Users can manage their own CVs" on public.candidate_cvs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.candidate_cvs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-cvs', 'candidate-cvs', false, 15728640,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = 15728640,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users manage files in their own CV folder" on storage.objects for all to authenticated
  using (bucket_id = 'candidate-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'candidate-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
