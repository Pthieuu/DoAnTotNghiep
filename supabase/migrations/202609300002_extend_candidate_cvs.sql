alter table public.candidate_cvs
  add column if not exists edited_data jsonb,
  add column if not exists source text not null default 'upload';

alter table public.candidate_cvs
  drop constraint if exists candidate_cvs_file_size_check,
  drop constraint if exists candidate_cvs_source_check,
  drop constraint if exists candidate_cvs_storage_source_check;

alter table public.candidate_cvs
  alter column file_path drop not null,
  alter column file_size drop not null,
  add constraint candidate_cvs_source_check check (source in ('upload', 'manual')),
  add constraint candidate_cvs_storage_source_check check (
    (source = 'manual' and file_path is null and file_size is null)
    or (source = 'upload' and file_path is not null and file_size between 1 and 15728640)
  );
