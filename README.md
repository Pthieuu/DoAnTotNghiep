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

## Screens

- `/`: Aizuchi.AI landing page.
- `/login`: mock login screen; Quick Demo opens the dashboard without authentication.
- `/dashboard`: responsive workspace based on the supplied dashboard HTML, using the shared Tailwind theme, local logo, and SVG icons. Includes sample KPIs, score history, skill breakdown, practice suggestions, target job/CV, and interview history.

Dashboard navigation scrolls to the corresponding sections. Interview, report, CV, and settings actions open demo previews. The N2/N1 selector changes the interview preview preset. All data is illustrative; authentication, AI, camera/microphone checks, uploads, and persistence are not connected.
