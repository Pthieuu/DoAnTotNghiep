alter table public.user_settings
  add column speech_voice_uri text not null default '' check (char_length(speech_voice_uri) <= 512),
  add column speech_rate numeric not null default 1 check (speech_rate in (0.5, 0.75, 1, 1.25, 1.5)),
  add column live_transcript boolean not null default true,
  add column vocabulary_hints boolean not null default true;

grant insert (speech_voice_uri, speech_rate, live_transcript, vocabulary_hints),
  update (speech_voice_uri, speech_rate, live_transcript, vocabulary_hints)
  on public.user_settings to authenticated;
