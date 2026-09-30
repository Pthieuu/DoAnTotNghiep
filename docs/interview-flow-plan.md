# Interview flow MVP

## Current state

- CV upload, extraction, editing, and confirmation are implemented in `src/components/cv-workspace.tsx` and `/api/cv`.
- A confirmed CV stores structured data in `candidate_cvs.confirmed_data`.
- `interview_sessions` already exists, but currently stores only title, company, level, score, status, and timestamps.
- Interview Room currently shows a sample question and cycles AI states on a timer. It does not load a session or use CV data.

## MVP decisions

An interview setup should collect:

| Field | Required | Default / behavior |
|---|---|---|
| Confirmed CV | Yes | Use the signed-in user's current confirmed CV. |
| Target role | Yes | Candidate enters a role title; also used as the session title. |
| Company | No | Optional context for question generation. |
| Job description | No | Optional pasted text, capped at 12,000 characters. |
| Interview language | Yes | Japanese for the first MVP. |
| Japanese level | Yes | N3 by default; allow N5 through N1. |
| Question count | Yes | 6 by default; allow 4, 6, or 8. |

The setup creates a persisted interview session and a fixed question list before navigating to Interview Room. The room loads that session by ID. Question generation must use only claims in the confirmed CV, and should combine those claims with role/company/JD context without inventing candidate experience.

## Delivery steps

### Step 1 — Scope and data contract

- Agree on MVP setup fields and defaults (listed above).
- Keep CV as a required prerequisite and use only `confirmed_data`.
- Record how session configuration and generated questions will be stored.
- Done when the setup payload, validation rules, and persistence plan are documented.

### Step 2 — Interview setup screen (implemented)

- Added `/interview-setup`, reachable from dashboard actions, the workspace header, profile, and navigation.
- The server loads only the signed-in user's confirmed CV; the page links to My CV when none is available.
- The form validates the required role and limits, and collects optional company/JD, JLPT level, and question count.
- The form validates role, company and JD limits and collects the selected JLPT level and question count.
- Setup currently confirms valid values locally; saving the session is Step 3.
- Done when valid input can be submitted and invalid/missing CV is handled clearly.

### Step 3 — Session persistence and question generation (implemented)

- Extend session persistence for role, language, question count, JD, CV snapshot, and generated questions.
- Add an authenticated route that verifies CV ownership and confirmation, validates input, generates questions, then saves the session.
- Show the saved questions after successful creation and useful errors on failure.
- Apply the new Supabase migration before using this flow against the database.
- Added `202609300003_extend_interview_sessions.sql` for role, language, question count, JD, CV reference/snapshot, and generated questions.
- Added authenticated `POST /api/interviews`; it verifies the user's confirmed CV, validates setup values, creates questions with the configured Ollama/OpenAI provider, then saves the session.
- The setup form waits for the request and shows the saved questions on success; failures show actionable errors. Interview Room loading by session ID remains Step 4.
- Question generation must treat JD skills as requirements rather than candidate experience. Specific past-experience questions require a verbatim CV evidence quote; leaked AI instructions and unsupported project/experience premises are rejected before saving.
- Done when a created session can be fetched with its original config and question list.

### Step 4 — Connect Interview Room

- Navigate to `/interview-room?sessionId=...` after successful creation.
- Load and authorize the session; show its generated question, language/level, and progress.
- Replace the mock timer state and hard-coded sample question with session-driven state.
- Done when refresh preserves the session and next/previous question controls work.

### Step 5 — Capture answers

- Start with text answers and save each against its session question.
- Add draft/save states and resume behavior.
- Done when answers survive refresh and remain attached to the right question.

### Step 6 — Feedback and completion

- Complete/cancel a session and persist completion status.
- Generate feedback from the question, answer, and rubric; show a summary page.
- Done when completed sessions have reviewable feedback and score.

### Step 7 — Voice and avatar integration

- Drive avatar speaking/listening/thinking from real interaction events.
- Add question playback, mic capture/transcription, and mute/repeat controls as separate increments.
- Done when UI state follows actual audio events and text-answer fallback remains available.

## Persistence direction

Prefer a migration that extends `interview_sessions` with setup fields and immutable `cv_snapshot` / `questions` JSONB values for the first MVP. Add a normalized answers table (or question answer column) when implementing Step 5. Keep row-level security scoped to the owning user. Revisit normalized question/session tables if question analytics or independent edits become necessary.

## Next implementation boundary

Steps 1–3 are implemented in separate commits. Step 4 is the next task: load an owned session in Interview Room and replace the demo question/state with persisted session data. Apply the database migration and configure an AI provider as described in README before exercising session creation locally.
