alter table public.candidate_profiles
  add column if not exists industries jsonb not null default '[]'::jsonb,
  add column if not exists languages jsonb not null default '[]'::jsonb,
  add column if not exists education_experience jsonb not null default '[]'::jsonb,
  add column if not exists technical_skills jsonb not null default '[]'::jsonb;
