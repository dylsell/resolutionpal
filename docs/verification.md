# Rebuild verification

Recorded November 1, 2026. This is pre-deployment evidence, not a production launch report.

## Passed locally

- TypeScript and 41 unit/regression tests, including budget reservation/reconciliation, billing rejection, input validation, calendar boundaries, and browser-storage exhaustion.
- A Node 24 production build and dependency audit (zero reported vulnerabilities).
- Desktop landing-page inspection and a 390px mobile reflection/result inspection.
- Required-answer validation moves focus to the error; advancing updates the question and progress.
- Refresh restores the current reflection step and text answers. Clear confirmation resets the draft.
- A hand-written synthetic result renders all sections and dates, survives refresh, shows successful copy feedback, and can be cleared. This fixture did not call the AI provider and has been removed from the application source.
- Mobile save/privacy disclosure remains visible; working copy and export controls use readable sizes.

## Still required before domain cutover

- Real generation with funded OpenAI credit. The existing project returned `credit_balance_exhausted`; a valid key or healthy model lookup is insufficient.
- A complete happy path on the deployed Render preview, including error recovery and refresh/resume.
- Copy contents and printed/PDF output inspected in a regular browser. The embedded-browser copy control showed success, but its clipboard inspection returned no content; print opened a native operation that could not be inspected while the host was locked. Do not treat either as fully verified export evidence.
- SQLite counters verified after a real deployed restart/redeploy.
- Production origin, apex/`www` routing, TLS, canonical redirect, and a fresh completed plan on the real domain.

See the [release runbook](release-runbook.md) for execution details. The existing domain has not been changed by this rebuild.
