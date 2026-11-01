# Rebuild verification

Recorded November 1, 2026. Resolution Pal is live at https://resolutionpal.com. Domain cutover began at 18:47 UTC; HTTPS and redirects were verified around 18:50 UTC, followed by a complete production journey and aggregate-usage check.

## Passed locally

- TypeScript and 43 unit/regression tests, including budget reservation/reconciliation, billing rejection, input validation, calendar boundaries, and browser-storage exhaustion.
- A Node 24 production build and dependency audit (zero reported vulnerabilities).
- The final application commit `bf78dfcb324934e43f052d5c8a541234a5844cc8` passed local production build and TypeScript checks. Recent CI checks passed in 32 and 27 seconds.
- Desktop landing-page inspection and a 390px mobile reflection/result inspection.
- Required-answer validation moves focus to the error; advancing updates the question and progress.
- Refresh restores the current reflection step and text answers. Clear confirmation resets the draft.
- A hand-written synthetic result renders all sections and dates, survives refresh, shows successful copy feedback, and can be cleared. This fixture did not call the AI provider and has been removed from the application source.
- Mobile save/privacy disclosure remains visible; working copy and export controls use readable sizes.
- A real Chrome journey generated personalized questions and a balcony-plant sketching plan. The first week used 20 of 30 available minutes and the weekly routine used 30 of 30. The finished result survived refresh and reopening the page.
- Funded writing and walking smoke checks passed after fixing time-accounting instructions and bounded retry feedback. The final run completed in 4.98 and 4.53 seconds, respectively; first-week totals were 30/30 and 40/60 minutes and recurring totals were 30/30 and 60/60. Manual review confirmed that the task descriptions matched the displayed durations. Both passed on the first attempt, costing $0.008578 combined with no unsettled reservations.
- The funded checks exposed a real failure: plans could add preparation/reflection beyond the user's time allowance, and identical retry instructions could repeat the error. Validation remains strict; retries now identify the rejected budget constraint, and each reservation includes the added feedback. Regression tests cover both time budgets.

## Passed on the hosted preview

- Preview: https://resolutionpal-2026.onrender.com. The application release verified at launch was commit `bf78dfcb324934e43f052d5c8a541234a5844cc8`, deployment `dep-dbjofndg1s2s73875ep0`.
- Render service: [`srv-dbjnjs67bikc7381c7rg`](https://dashboard.render.com/web/srv-dbjnjs67bikc7381c7rg). Its first deployment, `dep-dbjnjsm7bikc7381ca80`, ran commit `646553d140afed1aa09f1610567d85017cd33c4d`.
- An initial real hosted reading journey used a January 1, 2027 start and a 45-minute weekly allowance. It generated two contextual follow-up questions and a personalized plan whose weekly routine used 35 of the available 45 minutes. The finished result persisted after browser refresh.
- Provider measurements for that journey: follow-up generation 1.553 seconds, plan generation 3.080 seconds, and $0.004067 recorded cost.
- `npm run metrics` showed identical aggregate totals and recorded cost, with zero held reservations, before and after an actual Render restart. The running instance changed from `k5z69` to `r9j27`, confirming that verification crossed a restart rather than merely refreshing the metrics display.
- Render's workspace build-pipeline settings show a $0 monthly spending limit for extra build minutes. The deployed service and disk have a $7.25/month baseline; the application limits AI usage to $15/month and $5/day.
- The deployed `/api/health` returned `{"status":"ready"}` in Chrome. Hosted `robots.txt` excludes the form, plan, and API paths, and the sitemap lists the production homepage and privacy URLs.
- Direct HTTPS checks returned 200 for the homepage and health endpoint, 400 for malformed plan JSON, and 403 for an unrelated request origin. Responses included `nosniff`, `X-Frame-Options: DENY`, and `strict-origin-when-cross-origin`; API responses used `Cache-Control: no-store`. These rejection checks made no AI calls.
- The full copied plan text was verified by pasting it into a native application, rather than relying only on copy-success feedback.
- The custom date picker committed January 8, 2027 with Enter. That date persisted through navigation and reload. A newly generated reading plan used 40 of 45 minutes for both the first week and recurring routine.
- The native Chrome PDF export contained three complete pages in semantic order. Text extraction and visual inspection of all three rendered pages confirmed the January 8 start, 45-minute allowance, and milestones of February 7, March 9, and April 8. No text was clipped or overlapping, and “Skip to content” was absent. Chrome's normal print headers, footers, and page numbers remained visible.
- A brief 502 occurred during deployment, then the service recovered with the browser draft preserved. This verifies recovery from that observed deployment interruption, not every possible provider/network failure.
- Automatic deployment is working: Render marked deployments of `289f24f` and `bf78dfc` as `Trigger: Auto-Deploy`. The earlier assumption that this service required manual deployment because it was created through the public repository flow was incorrect.
- During the observed preview activity, memory was approximately 20% of the 512 MB limit. CPU was usually near zero with brief spikes below 20%. These are light-use observations, not a load test.

## Domain baseline and completed cutover

Before cutover, Google Public DNS returned `A resolutionpal.com → 216.24.57.1` and `CNAME www.resolutionpal.com → resolutionpal.onrender.com`, with approximately 30-minute TTLs. The apex had no AAAA answer. Nameservers were `dns1.registrar-servers.com` and `dns2.registrar-servers.com`. Both domains were attached to the legacy Render service, with issued certificates and `www` redirecting to the apex.

Authenticated Namecheap inspection confirmed the original `A @ → 216.24.57.1` and `CNAME www → resolutionpal.onrender.com`, both with Auto TTL. Email forwarding used SPF `v=spf1 include:spf.efwd.registrar-servers.com ~all`. DNSSEC and Dynamic DNS were off and were not changed.

Cutover began at 18:47 UTC. Both custom domains were removed from the legacy Render service and added to the new service. Namecheap's `www` CNAME was changed to `resolutionpal-2026.onrender.com` with a one-minute TTL. The apex and mail records were left unchanged. Render subsequently showed both domains as Verified with Certificate Issued.

The legacy service now shows “Suspended by you” and has no custom domains. It can be resumed, but its broken application is not a functional rollback target.

## Passed on the production domain

- Around 18:50 UTC, `https://resolutionpal.com/api/health` returned HTTP 200 with `{"status":"ready"}`. `https://www.resolutionpal.com` returned 301 to `https://resolutionpal.com/`, and `http://resolutionpal.com` returned 301 to the HTTPS apex. Both production hostnames had issued certificates.
- A fresh writing journey on the production domain used a November 1, 2026 start and 30 minutes per week. It generated two contextual follow-ups; personalized plan generation took 2.940 seconds. The first week used 30/30 minutes and the recurring routine used 24/30. Milestones were December 1, December 31, and January 30, 2027.
- The production result survived refresh. Its full copied contents were verified through a native paste. The production print check showed three complete pages in semantic order, without the skip link.
- The production sample plan and answers were cleared through the native confirmation; a fresh blank start was then shown. The preview sample was also cleared, and remained cleared after refresh.
- At 18:52:07 UTC, aggregate metrics showed three successful follow-up requests and three successful plans. Recorded latency totals were 5,415 ms for follow-ups and 9,913 ms for plans. Settled cost was $0.011994 with zero held reservations.

## Limits of this verification

- No load test was performed; the resource observations above reflect light launch testing.
- Provider-failure UI was not deliberately forced on the live service. Automated failure-path tests and the observed deployment interruption provide separate, bounded evidence.
- No launch posts or promotional messages were sent. The prepared launch material remains a draft.

See the [release runbook](release-runbook.md) for future deployment, recovery, and monitoring steps.
