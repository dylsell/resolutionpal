# Rebuild verification

Recorded November 1, 2026. This is pre-deployment evidence, not a production launch report.

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

## Still required before domain cutover

- A complete happy path on the deployed Render preview, including error recovery and refresh/resume.
- Copy contents and printed/PDF output inspected in a regular browser. Chrome and the embedded browser both showed successful copy feedback, but the automation's virtual clipboard returned no content. Native print/dialog inspection was blocked by the locked Mac. Do not treat either export as fully verified.
- SQLite counters verified after a real deployed restart/redeploy.
- Production origin, apex/`www` routing, TLS, canonical redirect, and a fresh completed plan on the real domain.

See the [release runbook](release-runbook.md) for execution details. The existing domain has not been changed by this rebuild.
