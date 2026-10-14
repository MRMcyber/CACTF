# CACTF

CACTF is an intentionally vulnerable web security training lab. Its 16 challenges
total 160 points. The SQL injection, XSS, IDOR, weak JWT secret, negative transfers,
and replayable WELCOME10 promo code are deliberate challenge behavior.

## Run locally

Use Node.js 24 and install dependencies with `npm ci`. Copy `.env.example` to
`.env.local` and supply your Neon Postgres connection string. The app loads that
file locally; deployed environments use `DATABASE_URL` from their environment.

- `npm start` starts the app on port 3000 and adds runtime tables if needed.
- `npm run migrate` adds session, avatar, and captured-flag tables without changing
  existing players, balances, bios, or flags.
- `npm run seed` **resets the users and flags**. Use it only for a new/disposable
  database, never to repair an existing deployment.
- `npm test` checks session persistence, multipart uploads, and error handling.
- `npm run verify -- http://localhost:3000` exercises all 16 challenges with
  temporary test accounts and removes those accounts afterward. It requires
  database access to the same database used by the target app.

## Deployment

The Vercel project `cactf` deploys the `main` branch of `MRMcyber/CACTF`.
Configure `DATABASE_URL` in Vercel before deploying. Views and training assets are
included by `vercel.json`; avatars, sessions, and scoreboard progress are stored
in Postgres so they persist across function instances and logins.

Avatar uploads accept PNG, JPEG, GIF, or WebP up to 2 MB. The avatar traversal
challenge remains available through `/profile/avatar?f=../../traversal_flag.txt`.
The simulated invoice `.env` and metadata responses contain training values.
