# AI Japanese Interview Trainer

Minimal Next.js foundation using the App Router, TypeScript, Tailwind CSS, and ESLint.

## Development

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

## Checks

```sh
npm run lint
npm run build
npm run typecheck
```

The build generates Next.js type declarations. Run it before checking types on a fresh checkout.

To serve the production build, run `npm start` after `npm run build`.

In the initialization environment, Turbopack's worker port was blocked. The production build was verified with `npm run build -- --webpack`. If your environment has the same restriction, use that command for builds and `npm run dev -- --webpack` for development.

## Initialization

This project was initialized manually in the repository root with these commands:

```sh
npm init -y
npm install next@latest react@latest react-dom@latest
npm install -D typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest tailwindcss@latest @tailwindcss/postcss@latest postcss@latest eslint@9 eslint-config-next@latest
npm install -D eslint@latest
npm install -D typescript@~6.0.3 @types/node@^24
npm install -D eslint@9
```

The package scripts, TypeScript, ESLint, and PostCSS configuration, root layout, global CSS, and placeholder homepage were then created manually. Exact resolved dependency versions are recorded in `package-lock.json`.

TypeScript 6.0 and ESLint 9 satisfy the peer requirements of Next.js's lint tooling. npm marks ESLint 9 as deprecated; ESLint 10 was checked but is outside the peer ranges of several bundled plugins.

## Screens and authentication

- `/`: Aizuchi.AI landing page.
- `/login`: email/password sign-in and registration through Supabase Auth.
- `/dashboard`: protected workspace showing the authenticated name/email and interview sessions saved for that account in Supabase. New accounts see an empty state until sessions are stored.

See [Supabase setup](docs/supabase-setup.md) to create a project, configure `.env.local`, and enable confirmation emails. Auth endpoints use Next.js Route Handlers. Google/GitHub login and password recovery are not connected yet.

Apply the SQL migrations in `supabase/migrations/` in timestamp order in your Supabase SQL Editor. The interview setup flow requires the session migration `202609290001_create_interview_sessions.sql`, the CV migrations `202609300001_create_candidate_cvs.sql` and `202609300002_extend_candidate_cvs.sql`, and `202609300003_extend_interview_sessions.sql`. The last migration adds interview setup fields, a CV snapshot, and generated questions. The authenticated account needs a confirmed CV before it can create an interview.

Interview question generation uses the configured server-side AI provider. It treats JD skills as job requirements rather than claims about the candidate; questions about specific past experience need a matching quote from the confirmed CV, and leaked AI instructions are rejected. With the default `CV_AI_PROVIDER=ollama`, install and run Ollama, then pull the model configured in `OLLAMA_MODEL` (default `qwen3:4b`). Alternatively set `CV_AI_PROVIDER=openai`, provide a valid `OPENAI_API_KEY`, and optionally choose `OPENAI_INTERVIEW_MODEL` (defaults to `OPENAI_CV_MODEL`, then `gpt-4o-mini`). Restart Next.js after changing `.env.local`. These local Ollama requirements can differ across team members' machines; OpenAI requires API access and may incur usage charges. Do not commit `.env.local` or API keys.

The setup page creates and saves interview sessions and questions. The generated question list is currently previewed there; loading the saved session inside Interview Room is the next implementation step.

Without Supabase configuration, the login page shows setup instructions and protected pages redirect to login. The application can still be built without credentials.
