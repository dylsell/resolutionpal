# Resolution Pal

Turn one meaningful resolution into a realistic first week and a 90-day path. A short guided reflection leads to two personalized follow-up questions and an actionable plan. No account is required.

The 2026 rebuild is live at [resolutionpal.com](https://resolutionpal.com). It uses Next.js, TypeScript, React, Tailwind, and the OpenAI Responses API. Production deploys from `rebuild-2026` to a dedicated Render Node service. The original Flask implementation remains in Git history, and its replaced service is suspended.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Fill in a funded `OPENAI_API_KEY` and a random `RATE_LIMIT_SECRET` in `.env.local`. Open http://localhost:3007. The interface and example plan can be explored without a key; personalized generation requires one.

```sh
npm run typecheck
npm test
npm run build
npm run start -- --port 3007
```

## Data and operating limits

- Drafts and finished plans stay in the visitor's browser. Clear them with **Clear my plan**. Browser storage is not encrypted and does not synchronize across devices.
- Answers are sent through the server to OpenAI to generate questions and plans. The server does not save those answers or plans; Responses requests use `store: false`. Provider processing policies still apply.
- SQLite stores aggregate events, cost reservations, and rate-limit counters. Keep it on a persistent disk in production. Its unavailability stops generation rather than silently resetting the allowance.
- The default AI allowance is $5 per UTC day and $15 per UTC month. Reservations include bounded retries and remain charged if the outcome is unknown. This is application accounting, not a guaranteed provider billing ceiling.
- Run a single service instance. This release does not support distributed counters, accounts, email reminders, or public personal-plan links.

## Server routes

| Route | Purpose |
| --- | --- |
| `POST /api/followups` | Validate reflection answers and produce two follow-up questions, with a prepared fallback when generation fails. |
| `POST /api/plan` | Validate completed answers and return a structured plan. |
| `POST /api/events` | Record an allowlisted aggregate event without goal text. |
| `GET /api/health` | Check readiness without an AI request. |

POST routes enforce same-origin access and bounded inputs. Request and result types are defined in `lib/types.ts`; clients should use those types instead of constructing a second schema.

## Deploy

Use the [release runbook](docs/release-runbook.md) for the existing production service, deployment checks, and rollback. Do not deploy this branch to the legacy Python service. The Blueprint intentionally omits custom domains so that a recreated service must pass preview validation before moving production routing. See the [verification record](docs/verification.md) for the shipped release and completed checks.

The deployed baseline is $7/month compute and $0.25/month for a 1 GB disk, with a $15 application AI allowance. Extra build spending is limited to $0. Bandwidth overages, taxes, and domain renewal are separate. See [Render pricing](https://render.com/pricing).

Run `npm run metrics` in the service's shell to inspect the current UTC day/month's reserved and settled AI allowance and the last seven days of aggregate events. The script opens `DATA_DIR/resolutionpal.sqlite3` read-only and does not display visitor identifiers. Locally it defaults to `./data`; pass `DATA_DIR` explicitly if your local override differs.

Background: [product and promotion history](docs/research.md). Launch material: [LinkedIn draft and demo storyboard](docs/launch.md).
