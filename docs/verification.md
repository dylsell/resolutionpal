# Rebuild verification

Recorded November 1, 2026. Local and hosted-preview verification is recorded below. The existing domain cutover remains pending.

## Passed locally

- TypeScript and 43 unit/regression tests, including budget reservation/reconciliation, billing rejection, input validation, calendar boundaries, and browser-storage exhaustion.
- A Node 24 production build and dependency audit (zero reported vulnerabilities).
- Desktop landing-page inspection and a 390px mobile reflection/result inspection.
- Required-answer validation moves focus to the error; advancing updates the question and progress.
- Refresh restores the current reflection step and text answers. Clear confirmation resets the draft.
- A hand-written synthetic result renders all sections and dates, survives refresh, shows successful copy feedback, and can be cleared. This fixture did not call the AI provider and has been removed from the application source.
- Mobile save/privacy disclosure remains visible; working copy and export controls use readable sizes.
- A real Chrome journey generated personalized questions and a balcony-plant sketching plan. The first week used 20 of 30 available minutes and the weekly routine used 30 of 30. The finished result survived refresh and reopening the page.
- Funded writing and walking smoke checks passed after fixing time-accounting instructions and bounded retry feedback. The final run completed in 4.98 and 4.53 seconds, respectively; first-week totals were 30/30 and 40/60 minutes and recurring totals were 30/30 and 60/60. Manual review confirmed that the task descriptions matched the displayed durations. Both passed on the first attempt, costing $0.008578 combined with no unsettled reservations.
- The funded checks exposed a real failure: plans could add preparation/reflection beyond the user's time allowance, and identical retry instructions could repeat the error. Validation remains strict; retries now identify the rejected budget constraint, and each reservation includes the added feedback. Regression tests cover both time budgets.

## Passed on the hosted preview

- Preview: https://resolutionpal-2026.onrender.com, running commit `646553d140afed1aa09f1610567d85017cd33c4d`.
- Render service: [`srv-dbjnjs67bikc7381c7rg`](https://dashboard.render.com/web/srv-dbjnjs67bikc7381c7rg). First deployment: `dep-dbjnjsm7bikc7381ca80`.
- A real hosted reading journey used a January 1, 2027 start and a 45-minute weekly allowance. It generated two contextual follow-up questions and a personalized plan whose weekly routine used 35 of the available 45 minutes. The finished result persisted after browser refresh.
- Provider measurements for that journey: follow-up generation 1.553 seconds, plan generation 3.080 seconds, and $0.004067 recorded cost.
- `npm run metrics` showed identical aggregate totals and recorded cost, with zero held reservations, before and after an actual Render restart. The running instance changed from `k5z69` to `r9j27`, confirming that verification crossed a restart rather than merely refreshing the metrics display.
- Render's workspace build-pipeline settings show a $0 monthly spending limit for extra build minutes. The deployed service and disk have a $7.25/month baseline; the application limits AI usage to $15/month and $5/day.
- The deployed `/api/health` returned `{"status":"ready"}` in Chrome. Hosted `robots.txt` excludes the form, plan, and API paths, and the sitemap lists the production homepage and privacy URLs.

## Domain baseline

Google Public DNS returned `A resolutionpal.com → 216.24.57.1` and `CNAME www.resolutionpal.com → resolutionpal.onrender.com`, with approximately 30-minute TTLs. The apex had no AAAA answer. Nameservers are `dns1.registrar-servers.com` and `dns2.registrar-servers.com`. Both domains remain attached to the legacy Render service, with issued certificates and `www` redirecting to the apex. Namecheap is signed out, so the registrar's complete record list has not yet been inspected or changed.

## Still required before domain cutover

- Hosted error recovery and the custom-date-picker interaction. The reading journey verifies the January 1 choice; it does not establish that the custom-date picker works.
- Copy contents and printed/PDF output inspected in a regular browser. Chrome and the embedded browser both showed successful copy feedback, but the automation's virtual clipboard returned no content. Native print/dialog inspection was blocked by the locked Mac. Do not treat either export as fully verified.
- Production origin, apex/`www` routing, TLS, canonical redirect, and a fresh completed plan on the real domain.

See the [release runbook](release-runbook.md) for execution details. The existing domain has not been changed by this rebuild.
