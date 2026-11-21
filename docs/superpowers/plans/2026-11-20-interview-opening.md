# Interview opening implementation plan

Goal: implement the opening agreed in conversation: fixed Hiro greeting, self-introduction invitation, explicit submission, saved unscored introduction, then the original planned questions.

Architecture: nullable self_introduction on interview_sessions; separate idempotent introduction endpoint; server-derived opening stage shared by room and live-token. No introduction row in interview_answers, so progress, scoring and summaries retain original semantics. Existing sessions with answers bypass opening. Missing migration fails closed with a load error.

- [x] Add migration and shared opening copy/stage helper; test new, resumed and completed sessions and both interview languages.
- [x] Add authenticated introduction save endpoint with length validation, ownership checks, conditional write and retry handling. Gate first graded answer until introduction is saved.
- [x] Render opening in room and saved introduction in room history; add text entry for both phases. Key remount on introduction transition, preserve failed submissions, keep silence from advancing.
- [x] Derive Live greeting/prompt from stored state; reject stale clients; thank candidate before question 1. Keep AI from advancing itself.
- [x] Test APIs, rendering and transition behavior; run suite, typecheck, targeted lint and independent review.

Review focus: reload/reconnect; duplicate submits and other tabs; failed persistence; absent microphone; no extra graded question or accidental early finish.

Execution: implement inline on feat/interview-opening, following the user's request to execute the design already discussed. No remote database mutation or merge.

Review: preserved text preference in a stable parent across turn remounts; added visible thanks for text-only users. Saved introduction also renders on summary without entering scoring inputs. Migration prepared, not applied to remote Supabase.
