# MVP readiness audit — 2026-08-12

## Verdict at audit time

**Not Ready**, but close. Confidence: **90%**.

The core simulator was functional, well-tested, responsive, offline-capable, and suitable for a client-only MVP architecture. Three P0 findings prevented release:

1. saving project 51 silently evicted the oldest saved simulation;
2. fiscal reference fixtures lacked qualified independent approval;
3. no reproducible production host, artifact, security-header policy, or deployment workflow existed.

## Evidence collected

The numerical counts below describe the audit-time baseline, not the current expanded suite. Current verification results are recorded in CI/output and summarized in the disposition sections.

- `npm run check` passed with 63 tests, 93.73% measured line coverage, 100% function coverage, and 77.97% branch coverage across the measured rules/schema/domain/storage modules.
- `npm run test:e2e` passed six Chromium journeys: first calculation/save, comparison, 320 px reflow, install guidance, offline landing/app navigation, and controlled service-worker activation.
- Rendered desktop inspection showed no console warnings or errors.
- Current official sources were checked for the key 2026 micro-fiscal thresholds, furnished social-contribution rate, and DPE rental restriction dates.
- No committed runtime secrets, third-party runtime scripts, analytics, server API, authentication system, or outbound financial-data path was found.

## P0 findings and disposition

### P0-1 — silent saved-project eviction

At audit time `src/app.js` prepended a new project and applied `.slice(0, MAX_PROJECTS)`, silently deleting the oldest project on save 51.

Disposition implemented after the audit:

- the UI refuses a new project when the 50-project limit is reached;
- the repository rejects over-limit and invalid candidate arrays without writing;
- save/delete operations are transactional in memory and preserve the prior list on storage failure;
- quota and failed-delete messages no longer promise unavailable export or report false success;
- regression tests cover project 51, repository over-limit writes, quota failure, and failed deletion.

### P0-2 — independent fiscal approval

Official constants appeared current, but the original fixtures were generic arithmetic cases and had `professionalApproval: pending`. That was not sufficient evidence for a consequential French rental-tax calculator.

Disposition implemented after the audit:

- `tests/fixtures/reference-scenarios.json` contains structured approval metadata and simplified cases for every supported automatic tax regime;
- `docs/fiscal-fixture-review.md` defines reviewer scope and evidence requirements;
- `npm run check:fiscal-approval` and the production workflow fail closed until a qualified reviewer records approval.

Residual external blocker: a qualified French tax/accounting professional must still perform and record the independent review. Code cannot truthfully complete that sign-off.

### P0-3 — reproducible production deployment

The repository had CI and a host-neutral runbook but no selected host, deploy artifact, repository-owned HTTP headers, or promotion path.

Disposition implemented after the audit:

- Cloudflare Pages Direct Upload is the production target;
- `scripts/stage-static-site.sh` creates the exact static artifact;
- `_headers` defines CSP, framing, HSTS, referrer, permissions, MIME-sniffing, and cache rules;
- `.github/workflows/deploy.yml` validates and deploys branch previews, while production additionally requires fiscal approval;
- `docs/release-runbook.md` defines one-time setup, preview, production approval, smoke testing, and rollback.

Residual external setup: repository/Cloudflare owners must create the Pages project, add least-privilege secrets, protect the GitHub production environment, and configure the production domain.

Post-audit runtime update:

- `Dockerfile` packages the unchanged static PWA in pinned Nginx, running as the unprivileged `nginx` user on port 8080;
- `compose.yaml` provides a read-only, capability-dropped local/self-hosted runtime with a health check;
- Nginx owns container security/cache/MIME behavior while `_headers` remains the Cloudflare equivalent;
- `npm run check:container` and CI build and smoke-test the image;
- there is no container registry or production container host yet, so Cloudflare Pages remains the configured deployment path.

## P1 — important but not launch-blocking

- [x] Added strict ≤1 MiB JSON export/import, explicit replacement confirmation, and bulk deletion.
- [ ] Complete manual NVDA, macOS/iOS VoiceOver, keyboard-only, and 200% zoom evidence; the repository protocol remains in `docs/accessibility-audit.md`.
- [~] Chromium plus desktop/mobile WebKit now cover storage, native dialogs, clipboard outcome, and installation guidance. Physical Safari/iOS offline/install evidence remains in `docs/browser-compatibility-evidence.md`.
- [x] Saved-project persistence is tested across a real browser reload.
- [x] Advanced fiscal and expense inputs use summarized progressive disclosure with validation-safe focus routing.
- [~] A moderated usability protocol and pass criteria exist in `docs/usability-test-plan.md`; the human sessions remain to be run.
- [~] Deployment and hourly GET-only health checks are implemented; activation requires the production URL variable and an alert owner.

## P2 — intentionally postponed

- Accounts, backend sync, authentication, and database infrastructure.
- English localization.
- Alternative amount/percentage input modes.
- Editable sensitivity matrices and long-horizon projections.
- Full tax optimization, SCI, carried deficits, exact LMP, or filing advice.
- Market-data/listing/mortgage APIs.
- PDF/Web Share/shareable URLs and ETF comparisons.
- Product analytics and extensive observability.

## Security and data integrity assessment

Positive baseline:

- calculations and saved inputs remain client-side;
- runtime schema/domain validation protects against manipulated controls;
- persisted strings are bounded and escaped before dynamic rendering;
- malformed storage is preserved under a recovery key;
- the service worker is same-origin, versioned, update-controlled, and tested;
- secret scanning, dependency review, CodeQL, Dependabot, and npm audit are configured.

Remaining risks are incomplete human accessibility/physical Safari/usability evidence and production settings that must be verified after the first preview deployment. Users can now explicitly export local data, but they remain responsible for protecting the financial assumptions in that file.

## Minimum release checklist

- [x] Prevent silent project eviction and false persistence success.
- [x] Add regression tests for project-cap and storage-failure paths.
- [x] Define qualified fiscal review evidence and an enforceable production gate.
- [ ] Obtain and record qualified approval of the fiscal fixtures.
- [x] Select a production host and define a reproducible exact-artifact workflow.
- [x] Define repository-owned security and cache headers.
- [x] Add a reproducible, non-root Docker runtime and container smoke gate.
- [ ] Configure Cloudflare/GitHub secrets, environments, domain, and branch protections.
- [ ] Create a clean release commit and obtain green CI/security/deployment checks.
- [ ] Verify preview headers, MIME types, caching, privacy boundary, installability, and complete user journey.
- [ ] Approve production promotion and record the production smoke test.

This report is a point-in-time release assessment. The canonical ongoing backlog remains `docs/progression-shell-fr.md`.
