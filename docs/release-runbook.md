# Release runbook

Target: a complete usable journey on https://resolutionpal.com, within the agreed 12-hour launch window. This document describes operating steps; completed checks and current cutover status are recorded in [verification evidence](verification.md).

## 1. Establish access and preserve the old configuration

- Verify GitHub write access to `dylsell/resolutionpal`, the Render workspace, the Namecheap domain, and a funded OpenAI project key before spending the launch window on polish. Never paste secrets into issues, logs, commits, or this document.
- Keep the rebuild on `rebuild-2026`. The [legacy Render service](https://dashboard.render.com/web/srv-ct9loqbv2p9s738kqqvg) uses Python and `main`; do not point it at this branch. Before a future merge to `main`, disable the old service's automatic deploys or pin it to the preserved legacy revision.
- The legacy service is now suspended and has no custom domains. It remains resumable for historical inspection, but its application is not a working fallback.
- Record the legacy deployed commit, repository/branch, service URL, custom domains, and all existing DNS records in a private release note. In particular, retain MX/TXT records and the old `www` target.
- Record the baseline Git revision and preserve it with the legacy tag. Record the exact new release commit after checks pass.
- Verify a real generation request with the funded project. A valid key, successful model-list lookup, or healthy `/api/health` response does not establish available model credits. An `insufficient_quota` / `credit_balance_exhausted` response requires restoring project funding or supplying a funded project key before the real-generation launch gate can pass.

## 2. Deploy and verify the new preview

The new service is deployed at https://resolutionpal-2026.onrender.com ([Render service](https://dashboard.render.com/web/srv-dbjnjs67bikc7381c7rg)). The verified final application commit is `bf78dfcb324934e43f052d5c8a541234a5844cc8`, deployment `dep-dbjofndg1s2s73875ep0`. Render has automatically deployed commits `289f24f` and `bf78dfc`; its deployment UI explicitly showed `Trigger: Auto-Deploy`. The earlier manual-only assumption based on the service's creation flow was incorrect.

Treat every push to `rebuild-2026`, including documentation-only changes, as a possible live deployment. Confirm CI results and the deployed commit in Render. Check the live service's auto-deploy setting when changing release controls; observed automatic deployment alone does not establish that CI gating is enabled. Use manual deployment of a checked commit when necessary. See [verification evidence](verification.md) for real hosted journeys, exports, and the persistent-counter restart check.

For recreating the service through a connected Git provider, use `rebuild-2026` and the repository's `render.yaml`. The Blueprint specifies one paid Node service, one 1 GB persistent disk at `/var/data`, and gated auto-deploys. The current `0.5c-512mb` plan is the $7/month tier formerly named Starter. [Blueprint reference](https://render.com/docs/blueprint-spec), [compute plans](https://render.com/docs/compute-plans)

Keep the lockfile and CI workflow committed, and confirm the exact release commit's CI check passes. When configuring a replacement service, `checksPass` requires at least one detected check; if the initial service has not deployed, manually deploy the already-verified commit instead of weakening the gate. [Deploy and CI behavior](https://render.com/docs/deploys)

Set `OPENAI_API_KEY` privately and `APP_ORIGIN=https://resolutionpal.com`. The application also permits Render's automatic `RENDER_EXTERNAL_URL`, so the assigned preview hostname works before domain cutover without guessing it during creation. Set a random `RATE_LIMIT_SECRET` of at least 32 characters and keep it stable across redeploys; the Blueprint can generate this value when used. Keep `DATA_DIR=/var/data`, `AI_DAILY_BUDGET_USD=5`, and `AI_MONTHLY_BUDGET_USD=15`. Do not expose secrets with a `NEXT_PUBLIC_` prefix.

Build with `npm ci --include=dev && npm run build`; start with `npm run start -- --hostname 0.0.0.0 --port $PORT`. Configure health checks at `/api/health`. Do not run database initialization in the build or a pre-deploy command: the persistent disk is available to the running service. Disk-backed deployments briefly interrupt service and cannot scale to multiple instances. [Render disk constraints](https://render.com/docs/disks)

Verify on the actual preview:

- `/api/health` returns success without consuming model tokens. This checks runtime configuration and database access; successful real generation is a separate gate.
- A fresh browser can complete a real plan and copy/print it; refresh restores a draft and a finished result.
- Run `npm run metrics` in the service shell, record aggregate counters, restart or redeploy, and confirm they persist. The database path must remain `/var/data/resolutionpal.sqlite3`.
- Confirm runtime logs contain no answer bodies, generated plan content, API key, or raw IP address.
- Inspect Render's memory/error charts while generating. If the chosen tier cannot run dependably, stop and assess the budget before moving the domain.

The baseline is $7 compute + $0.25 disk + $15 AI allowance = $22.25/month, excluding variable hosting charges, tax, and domain renewal. Set extra build spend to zero where available and watch bandwidth usage. Application allowances are not provider billing guarantees. [Pricing](https://render.com/pricing), [build spending limits](https://render.com/docs/build-pipeline)

## 3. Release gates

Run `npm run typecheck`, `npm test`, and `npm run build` against the exact release commit. Then verify the following in a production build and repeat the happy path on the deployed preview:

| Scenario | Required result |
| --- | --- |
| Mobile and desktop, keyboard-only navigation | Every step is usable; visible focus, validation, and progress are clear. |
| Different goals and realistic time constraints | Results use the supplied answers and fit the time budget. |
| Back/edit, refresh, return visit, clear | Answers persist appropriately; clearing removes the saved draft and result. |
| Copy and browser print/PDF | A readable, complete plan is retained without interface clutter. |
| Start today, January 1, custom date | First week and 30/60/90-day milestones use the selected date. |
| Timeout or malformed AI response | Follow-ups can fall back; plan failure preserves input and offers retry. |
| Double-click or concurrent submissions | No accidental duplicate generation or budget overspend. |
| Exhausted allowance or unavailable counter storage | Generation stops with useful recovery copy; answers remain intact. |
| HTML-like user/model text | It appears as text, never executable markup. |
| Restart/redeploy | The service returns healthy and its durable counters remain intact. |

Exercise failure paths with mocks or isolated test databases. Never delete or alter the production quota database to simulate a reset.

For a local real-provider check on Node 24, run `node --env-file=.env.local --import=tsx scripts/smoke-ai.ts`. It uses invented writing/walking scenarios and its own temporary quota database, with a $0.50 allowance per run. Review the resulting synthetic plans as well as the automatic checks. This consumes provider credit separately from the production counters; unit tests and a passing build do not substitute for it. Do not include this funded check in the public CI workflow.

## 4. Domain cutover and future routing changes

Only cut over after preview gates pass. Keep the verified release commit and recorded routing details available.

Completed launch: cutover began November 1, 2026 at 18:47 UTC. Both domain associations moved to the new service, and Namecheap's `www` CNAME now targets `resolutionpal-2026.onrender.com` with a one-minute TTL. The apex `A @ → 216.24.57.1`, mail records, DNSSEC, and Dynamic DNS settings were unchanged. By approximately 18:50 UTC, both domains had issued certificates; HTTPS health returned 200, `www` redirected to the HTTPS apex, and HTTP redirected to HTTPS. A fresh production plan, exports, refresh, and clear flow subsequently passed. The legacy service is suspended with no custom domains. See [verification evidence](verification.md) for the recorded journey and aggregate costs.

For future routing changes, use this sequence rather than repeating the completed launch transfer:

1. Confirm the new service already has `APP_ORIGIN=https://resolutionpal.com`. The deployed application must recognize the production origin before it accepts production POST requests.
2. In Render, remove the apex and `www` domain associations from the legacy service as necessary, then attach `resolutionpal.com` to the new service. Render also adds `www` and redirects it to the apex. The exact dashboard transfer controls must be inspected at execution time; do not assume the move is atomic. [Custom domains](https://render.com/docs/custom-domains)
3. In Namecheap Advanced DNS, use Render's current displayed values. The documented apex is `A @ → 216.24.57.1`; `www` is a CNAME to the new service's assigned hostname. If the apex already uses the shared Render address, it need not change. Remove conflicting records only for those two hosts; preserve unrelated records. Use a low TTL where supported. [Namecheap DNS instructions](https://render.com/docs/configure-namecheap-dns)
4. Wait for Render domain verification and certificate issuance. Verify `https://resolutionpal.com`, `https://www.resolutionpal.com`, and HTTP-to-HTTPS behavior. Check valid certificates and a single canonical apex redirect without a loop.
5. In a new browser session on the real domain, generate a plan, copy it, print it, refresh, and clear it. Confirm no waking screen, mixed content, server errors, or cross-origin rejection.
6. Record the live service ID, preview hostname, commit, deployment ID, cutover time, and verification results privately. Promotion remains a separate action; no launch posts have been sent.

## 5. Recovery and observation

For an application regression, roll the new service back to its last verified new-app commit and keep the persistent disk. Do not erase reservations to restore availability; that would erase accounting for real spend. Preserve a SQLite-consistent backup before schema changes.

For a service-start or routing failure, restore the recorded domain association/DNS only if that destination is known to work. The old broken application is not a functional fallback. If no healthy release exists, use Render maintenance mode while repairing the new service; do not claim the product is available. [Render maintenance mode](https://render.com/docs/maintenance-mode)

Check production health, failures, latency, generation success, remaining allowance, and host resource use after cutover and again after the announcement. `npm run metrics` reports cost reservations and aggregate events without visitor identifiers. Latency events are totals in milliseconds; divide by the corresponding success/failure count to compute an average. Use aggregate data only. A small number of real journeys is more useful than repeatedly loading the landing page. If generation is disabled by its allowance, preserve existing browser plans and show clear availability messaging.

The launch check at 18:52:07 UTC recorded three follow-up successes, three plan successes, $0.011994 settled cost, and zero held reservations. No load test was performed, and provider-failure UI was not deliberately forced live. After any documentation-only push, confirm its automatic deployment returns healthy before considering the release work finished; the persistent-disk service can briefly interrupt traffic during that deploy.
