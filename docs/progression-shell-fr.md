# RentaLoc — Project Gap Analysis and Roadmap

> **Canonical remaining-work tracker.** Update this file when work starts or finishes; do not create a second roadmap, TODO, or backlog unless this document links to it.

Last audited: **2026-08-10**

Baseline audited revision: `e481d2c` (`main`); high-priority implementation evidence below reflects the 2026-08-08 working tree.

Audit scope: repository source, PRD, README, Git history, tests, PWA assets, and the GitHub issue/PR tracker for `fouratmt/rentaloc`.

## Status and priority legend

| Value | Meaning |
| --- | --- |
| Completed | Present in the current repository and checked during this audit. |
| In progress | Implementation is actively underway and has an identifiable owner/branch/issue. |
| Missing | Not implemented, incomplete, or not meeting the stated requirement. |
| Investigation | A decision or external verification is required before implementation. |
| Deferred | Explicitly outside the committed near-term scope. |
| High | Correctness, misleading financial output, accessibility, data loss, or release-safety risk. |
| Medium | Important product value, maintainability, resilience, or operational quality. |
| Low | Useful enhancement with limited near-term risk. |

## Executive summary

RentaLoc is a functional static PWA with a separated domain engine, runtime schema, dated ruleset, bounded/versioned persistence, robust validation, accessible dialog/live-region patterns, and pull-request CI. The current `just check` command passes 34 tests and enforces 90% line, 95% function, and 70% branch coverage thresholds.

The 2026-08-08 implementation pass completed **15 of the 17 High-priority items**. No known High-priority engineering change remains unimplemented. Two independent evidence gates are still open and block describing the calculator as fully validated:

1. **TQ-02:** a qualified French tax professional must independently approve the golden fiscal/reference fixtures.
2. **UX-04:** human screen-reader passes are required with NVDA and VoiceOver; the engineering/browser audit and remediations are complete.

The remaining Medium/Low roadmap is unchanged except where the High-priority work supplied part of its foundation. The app remains a simplified screening tool and must not be presented as tax, legal, or investment advice.

## Verified completed baseline

| Area | Status | Evidence / current capability |
| --- | --- | --- |
| Acquisition, rent, expenses, financing, and vacancy model | Completed | Pure calculations in `src/domain.js`, driven by the form in `app.html` and controller in `src/app.js`. |
| Mortgage amortization for a selected loan year | Completed | Monthly schedule supplies interest, principal repaid, opening balance, and closing balance. |
| Simplified tax modes | Completed | LMNP réel, micro-BIC, micro-foncier, régime réel foncier, and manual annual tax paths exist. |
| Recoverable expenses and TEOM | Completed | Recoveries are capped and adjusted for vacancy; tests cover under- and over-provisioning. |
| Outputs and interpretation | Completed | Yields, cash flow, cash invested, return on cash, DSCR, break-even rents, score, equations, and help text are rendered. |
| Scoring and warnings | Completed | Financial score, qualitative risk score, DPE caps, and hard-warning panel are implemented. |
| Sensitivity analysis | Completed | Fixed optimistic, base, and stress scenarios are shown. |
| Local project persistence | Completed | Version-2 envelopes under `rentaloc-projects-v1` validate/migrate data, bound names/counts, preserve rejected raw data for recovery, and surface storage errors. |
| Copy summary | Completed | Clipboard output includes rule scope, simplified-tax disclaimer, and the same generated warnings shown in the UI. |
| Responsive French UI | Completed, manual AT pending | Rendered 320 px reflow, touch-target, contrast, focus, validation, dialog, and live-region checks pass; see `docs/accessibility-audit.md` for NVDA/VoiceOver blockers. |
| Dedicated landing and application pages | Completed | Implemented 2026-08-10: `index.html` is the marketing/FAQ entry point; `app.html` contains the simulator and calculation guide. Navigation, install behavior, manifest start URL, tests, and offline fallbacks cover both routes. |
| PWA and offline shell | Completed, unverified | Manifest, icons, install help, service-worker registration, and app-shell cache exist; update/offline integration tests are missing. |
| Privacy-preserving local calculation | Completed | No server calls, analytics SDKs, or third-party runtime dependencies were found; project values remain in the browser. |
| Runtime schema and module boundaries | Completed | Rules, schema, pure domain logic, persistence, and DOM control are separated and documented in `docs/architecture.md`. |
| Basic automated checks | Completed | `just check` runs syntax, 34 tests, structural/schema/accessibility/app-shell checks, rule expiry, and coverage gates; GitHub Actions runs it on pull requests and `main`. |
| Dated fiscal/regulatory rules and source ledger | Completed | Ruleset `2026.1` in `src/rules.js`; official sources, scope, review date, and responsible role in `docs/fiscal-rules.md`. Professional fixture approval remains tracked by TQ-02. |

## Functional and product gaps

| ID | Work item | Status | Priority | Rationale | Dependencies / blockers |
| --- | --- | --- | --- | --- | --- |
| FG-01 | Correct and govern 2026 fiscal eligibility rules: €83,600 long-term/classified threshold, €15,000 unclassified-tourist threshold, prior two-year receipts, consecutive crossings, and first-two-year handling. | Completed | High | Eligibility now uses explicit 2024/2025 household receipts for 2026; a current-year crossing warns about future eligibility instead of incorrectly rejecting the current regime. | Implemented 2026-08-08 in `src/rules.js`, `src/schema.js`, and `src/domain.js` with boundary tests. Professional approval is isolated to TQ-02. |
| FG-02 | Make fiscal and regulatory context explicit: simulation tax year, metropolitan France vs overseas, long-term vs tourist-specific DPE/rent rules, household status, and rule “last verified” date. | Completed | High | The UI and copied result identify 2026 income, France métropolitaine, ruleset `2026.1`, source-check date, simplified-estimate disclaimer, and tourist/overseas scope limits. | Implemented 2026-08-08. Sources and annual-review ownership are in `docs/fiscal-rules.md`; other jurisdictions require a future scoped ruleset. |
| FG-03 | Include the main warnings and the tax/regulatory disclaimer in copied or shared summaries, as required by PRD section 14. | Completed | High | Copied output now uses the domain warning generator and carries rule scope plus a professional-confirmation disclaimer. | Implemented 2026-08-08 in `src/domain.js`/`src/app.js`; covered by unit and rendered clipboard checks. |
| FG-04 | Complete validation: enforce JS-side maximums for tax, interest, insurance, management, and GLI rates; validate all select enums and persisted values; handle non-finite/extreme values; and explicitly report an unresolved break-even search. | Completed | High | The runtime schema validates every numeric/enum field independently of HTML, storage rejects invalid projects, and break-even non-convergence is a blocking calculation issue. | Implemented 2026-08-08 in `src/schema.js`, `src/domain.js`, and `src/storage.js`; exhaustive max/enum, extreme, and non-convergence tests added. |
| FG-05 | Add field-level validation with `aria-invalid`, linked error text, focus to the first error, and disabled/clearly unavailable save/copy actions while invalid. | Completed | High | Invalid fields receive visible linked messages, the summary is focusable, attempted save routes to the first error, and save/copy are exposed as unavailable until correction. | Implemented and browser-checked 2026-08-08 in `src/app.js`/`src/styles.css`; manual screen-reader confirmation remains under UX-04. |
| FG-06 | Make dependent fields contextual: hide or disable loan inputs for cash purchases; show only compatible tax regimes; hide tourist usage for unfurnished rentals; and show manual/depreciation/social fields only when used. | Missing | Medium | The current form invites contradictory combinations, then reports errors after the fact. It also implies that some ignored fields affect the result. | FG-04 schema and a decision on whether to auto-convert or ask before changing a tax mode. |
| FG-07 | Add true comparison of saved projects with normalized metrics, warnings, assumptions, sorting, and a clear selected baseline. | Missing | Medium | The app saves multiple projects but cannot perform the “save and compare” V2 flow described in the PRD. | Stable persisted schema (TR-01); product design for comparable assumptions. |
| FG-08 | Add project backup and portability: export/import JSON, schema versioning, “delete all,” and recovery messaging for corrupt/quota-exceeded storage. | In progress | Medium | Schema versioning, recovery copies, and corrupt/quota messaging now exist, but users still lack export/import and bulk deletion. | TR-01 foundation is complete; import validation/security review and file UX remain. |
| FG-09 | Protect unsaved work before reset, new project, loading another project, delete, navigation, or app update; make dirty state visually explicit. | Missing | Medium | A long simulation can be discarded without confirmation. The status text only detects edits to an already loaded save and does not block destructive transitions. | Central state model (TA-01); UX decision on autosave versus confirmation. |
| FG-10 | Support the alternative input modes promised by the PRD: notary fees as amount or rate, down payment as amount or percentage, borrower insurance as rate or monthly amount, and maintenance as amount or percentage. | Missing | Medium | Users often know one representation but not the other; manual conversion increases friction and error risk. | Define conversion precedence and persist both mode and normalized value. |
| FG-11 | Expand sensitivity analysis into user-editable scenarios and/or a two-variable matrix; explain which inputs change and surface warnings per scenario. | Missing | Medium | Three fixed cases are useful but cannot answer common negotiation and rate-change questions. Invalid base inputs also currently still yield scenario ratings. | Scenario model, validation reuse, and comparison UI. |
| FG-12 | Add the currently absent expected annual rent-increase input, then add long-horizon analysis: rent/expense indexation, full amortization table, capital appreciation, resale costs/tax, ten-year cash flows, NPV/IRR, and exit scenarios. | Missing | Medium | The one-year stabilized view cannot measure total return or timing risk. The PRD defines the rent-increase field and explicitly lists the projection features for V2. | Agree conservative defaults; isolate from V1 so uncertain appreciation does not dominate the verdict. |
| FG-13 | Deepen tax modeling: actual amortization components, carried deficits/depreciation, progressive tax effects, LMP/professional social contributions, SCI, and side-by-side furnished/unfurnished regimes. | Missing | Medium | The present model is intentionally simplified and can only triage, not optimize or file taxes. | Professional review, dated test cases, and a clear boundary between estimate and advice. |
| FG-14 | Add local-market and regulatory context: city-level rent/vacancy assumptions, rent-control checks, DPE renovation estimator, and tourist-rental constraints. | Missing | Medium | User-entered demand and rent can be unrealistic or unlawful, which can overwhelm otherwise correct arithmetic. | Reliable data sources, licensing/caching policy, location input, and ongoing data maintenance. |
| FG-15 | Export a readable report (PDF/print) and add Web Share with clipboard fallback; consider shareable URL state only after a privacy review. | Missing | Medium | Clipboard-only output is awkward for advisors and project comparisons. URL state could expose sensitive assumptions if designed carelessly. | FG-03 warning completeness; print design; privacy decision. |
| FG-16 | Add the PRD's passive-investment/ETF opportunity-cost comparison. | Missing | Low | It helps users compare real estate with the alternative use of their cash, but depends on assumptions outside the core property model. | Define fees, taxes, volatility treatment, horizon, and non-advisory wording. |
| FG-17 | Add English and a localization system for labels, help, number formats, and legal assumptions. | Missing | Low | Multilingual support is a stated V2 idea, but all text is currently embedded in HTML/JS. | Content extraction and locale-specific legal scope. |
| FG-18 | Decide whether to instrument privacy-preserving product events from PRD section 19. | Investigation | Low | Completion, scenario-change, and copy events would validate usefulness, but analytics are optional and must never include exact financial inputs. | Privacy policy, consent/legal basis, event schema, retention, and vendor decision. |

## UX and accessibility gaps

| ID | Work item | Status | Priority | Rationale | Dependencies / blockers |
| --- | --- | --- | --- | --- | --- |
| UX-01 | Make both overlays fully accessible: trap focus, mark the background inert, restore focus reliably, provide an accessible dialog description, and test Escape/backdrop behavior. | Completed | High | Both overlays now use native modal `dialog`, named/described relationships, focused close controls, platform focus containment/background inertness, backdrop handling, and invoker focus restoration. | Implemented and rendered-browser checked 2026-08-08. Human Escape/AT confirmation remains in the UX-04 matrix. |
| UX-02 | Reduce noisy live announcements. Announce only concise status/result changes rather than the full results column on every keystroke. | Completed | High | The results column is no longer live; one atomic polite status announces only rating, score, and after-tax monthly cash flow after committed changes. | Implemented and rendered-browser checked 2026-08-08; NVDA/VoiceOver quality confirmation remains UX-04. |
| UX-03 | Make help available without hover and connect it semantically to fields/metrics (`aria-describedby` or visible helper text). | Missing | Medium | CSS pseudo-element tooltips are difficult on touch and their content is not reliably exposed as descriptions. | Content prioritization; avoid adding visual clutter to the long form. |
| UX-04 | Conduct keyboard, screen-reader, contrast, zoom/reflow, touch-target, reduced-motion, and 320 px layout audits; remediate findings. | In progress | High | Engineering/browser checks now pass: no 320 px overflow, ≥44 px targets, rendered contrast thresholds, reduced motion, focus restoration, linked errors, and concise live status. Findings were remediated and recorded. | Blocked on human NVDA + Windows and VoiceOver + Safari/iOS passes. Exact checklist and evidence: `docs/accessibility-audit.md`. Automated axe/E2E expansion remains TQ-05/TQ-06. |
| UX-05 | Run short moderated usability tests on first-time entry, tax-mode selection, result interpretation, save/load, install, and mobile completion. | Missing | Medium | The current UX was built from the PRD but has not been validated with target users. | Recruit representative French first-time/individual investors; define success criteria. |
| UX-06 | Add offline/update status and a controlled “new version available” refresh flow. | Missing | Medium | `skipWaiting()` can replace the worker without explaining stale/open UI state, and users cannot tell whether they are offline. | Service-worker lifecycle tests (TR-02) and unsaved-work protection (FG-09). |
| UX-07 | Improve public-site metadata if organic/social discovery matters: canonical URL, absolute Open Graph URL/image, `og:url`, sitemap/robots, and structured-data decision. | Investigation | Low | Current metadata is a good baseline, but relative social image URLs and no canonical can produce inconsistent previews/indexing. | Confirm production hostname and SEO goals. |
| UX-08 | Rework progressive disclosure for the long form: keep core assumptions visible, collapse genuinely advanced expense/tax/risk inputs, summarize hidden values, and preserve direct keyboard access. | Missing | Medium | Only the combined tax/risk section is collapsible; the dense form can obscure the minimum path to a useful first result. | UX-05 research and FG-06 contextual-field behavior. |

## Technical gaps

### Architecture and maintainability

| ID | Work item | Status | Priority | Rationale | Dependencies / blockers |
| --- | --- | --- | --- | --- | --- |
| TA-01 | Split the 1,362-line `src/app.js` into pure domain calculations, rule/config tables, validation, persistence, state, and DOM controllers. | Completed | High | Financial logic now lives in a directly importable pure domain module; rules, schema, and persistence are separate, while `app.js` is limited to browser/controller work. | Implemented 2026-08-08 without a build step; boundaries and dependency direction are documented in `docs/architecture.md`. |
| TA-02 | Define a versioned, typed simulation schema with defaults, units, enums, normalization, and migrations. TypeScript is optional; runtime validation is required. | Completed | High | Schema version 2 centralizes defaults, numeric constraints, enums, normalization, and runtime validation; storage envelope version 2 migrates legacy arrays. | Implemented 2026-08-08 with build-free runtime JavaScript. Import/export remains FG-08 rather than part of this schema foundation. |
| TA-03 | Replace duplicated/embedded rule constants with dated configuration and a source ledger. Add an expiry/review reminder for annual fiscal rules. | Completed | High | Ruleset `2026.1` centralizes fiscal/DPE thresholds, source metadata, effective scope, and a 2027-01-31 review deadline. | Implemented 2026-08-07 in `src/rules.js`; CO-01 now enforces expiry in CI. Professional approval of reference fixtures remains TQ-02. |
| TA-04 | Separate financial score policy from calculation output and version the score rubric. | In progress | Medium | Score tables are separated in `src/rules.js` and travel with ruleset `2026.1`, but saved projects do not yet snapshot a dedicated score-policy version. | User research or expert calibration; add a distinct score version before changing weights and preserve it in saved projects. |
| TA-05 | Establish ADRs for major choices: client-only architecture, local storage, simplified taxation, scoring, analytics, and any future external data source. | Missing | Low | Architectural intent currently lives implicitly across PRD and code. | Start when the first material architecture change is accepted. |

### Testing and quality assurance

| ID | Work item | Status | Priority | Rationale | Dependencies / blockers |
| --- | --- | --- | --- | --- | --- |
| TQ-01 | Build a calculation test matrix for every tax mode, threshold boundary, score boundary, warning, cash purchase, zero-rate loan, final loan year, extreme vacancy/fees, invalid values, and break-even convergence. | Completed | High | The suite now covers all five tax modes, 2026 threshold history, every schema enum/max, score boundaries, warnings, cash/loan edges, recoveries, extreme supported fees/vacancy, summary content, and convergence failure. | Implemented 2026-08-08; 34 total repository tests pass. Independently approved expected fiscal results remain TQ-02. |
| TQ-02 | Add golden/reference scenarios independently checked by an accountant or spreadsheet, including expected rounding and tolerances. | In progress | High | A fixture format and two deliberately simple independently reproducible arithmetic scenarios now run in CI, with provenance and tolerances documented. They are not yet professionally approved fiscal references. | **External blocker:** qualified French tax/finance reviewer must validate assumptions, expected values, and rounding and update `professionalApproval` from `pending` in `tests/fixtures/reference-scenarios.json`. |
| TQ-03 | Replace the test harness that slices `app.js` at `function renderMetrics` and executes it in `vm`. Import public calculation APIs directly. | Completed | High | Tests now `require("../src/domain.js")` and exercise public pure APIs; the source-slicing `vm` harness and browser stubs are gone. | Completed 2026-08-08 with TA-01. |
| TQ-04 | Add DOM/integration tests for form dependencies, validation, save/load/delete, dirty state, copied warnings, and malformed storage. | Missing | Medium | Domain/clipboard content and malformed storage now have unit checks, but the corresponding DOM user flows are not automated. | Lightweight DOM environment or browser runner. |
| TQ-05 | Add end-to-end browser tests for first simulation, responsive mobile flow, project comparison, install affordance where testable, offline reload, and service-worker update. | Missing | Medium | Syntax/unit tests cannot detect broken selectors, focus behavior, or caching regressions. | Browser automation and deterministic local server. |
| TQ-06 | Add automated accessibility, HTML, manifest, and link validation plus manual browser/a11y checklists. | In progress | Medium | CI now has structural accessibility/HTML/manifest/app-shell smoke and `docs/accessibility-audit.md` has a manual matrix; axe and link/standards validators are absent. | Add a browser runner/axe and define a supported browser matrix. |
| TQ-07 | Add coverage reporting and set risk-based thresholds for the domain engine and validation. | Completed | Medium | Node coverage is reported on every `just check` and CI enforces 90% lines, 95% functions, and 70% branches across rules/schema/domain/storage. | Completed 2026-08-08; keep thresholds risk-based and raise storage branch coverage as failure-path tests expand. |
| TQ-08 | Add formatter/linter rules for JavaScript, CSS, HTML, and Markdown. | Missing | Low | Consistency currently relies on manual discipline; large embedded templates are easy to break. | Choose tools compatible with the desired no-build runtime. |

### Data, reliability, performance, and browser support

| ID | Work item | Status | Priority | Rationale | Dependencies / blockers |
| --- | --- | --- | --- | --- | --- |
| TR-01 | Validate, bound, migrate, and recover `localStorage` data; limit project count/name size after parsing and surface read/write errors instead of silently returning an empty list. | Completed | High | Version-2 envelopes validate every project, cap 50 projects/80-character names, migrate legacy arrays, preserve rejected raw data under a recovery key, and surface read/quota errors. | Implemented 2026-08-08 in `src/storage.js` with migration, corruption, excess-data, and quota tests. User export/import remains FG-08. |
| TR-02 | Harden and test the service worker: partial precache failures, uncached offline requests, update activation, cache cleanup, scope/subpath hosting, and asset version changes. | Missing | Medium | Offline behavior is a product promise, but there are no worker integration tests or user-visible failure/update state. | Stable deployment target and E2E browser runner. |
| TR-03 | Define supported browsers/devices and graceful fallbacks for service workers, clipboard, install prompts, `crypto.randomUUID`, and modern JS methods. | In progress | Medium | The README now states an evergreen-browser target and the app has partial fallbacks, but exact versions/devices and cross-browser evidence are not defined. | Usage goals and cross-browser/assistive-technology test access. |
| TR-04 | Establish performance budgets and measure Lighthouse/Core Web Vitals on mobile. Optimize the 1.3 MB Open Graph image and app assets, and verify compression/cache headers in production. | Missing | Medium | The static shell is modest, but no measured budget or production-header verification exists. | Production URL/host access; representative low-end mobile test. |
| TR-05 | Add privacy-safe error diagnostics for storage, clipboard, service-worker registration/update, and uncaught JS failures. | Investigation | Medium | Failures are mostly swallowed or reduced to generic status text, making production regressions invisible. | Decide local-only diagnostics versus a remote service; never send financial values. |

### Security and privacy

| ID | Work item | Status | Priority | Rationale | Dependencies / blockers |
| --- | --- | --- | --- | --- | --- |
| SP-01 | Define and verify production security headers: CSP, Referrer-Policy, X-Content-Type-Options, Permissions-Policy, HSTS, and framing policy. | Missing | Medium | The app has no third-party runtime code, which is a strong baseline, but repository files do not define deployment headers. | Hosting platform/config access and testing against the production URL. |
| SP-02 | Threat-model dynamic HTML, imported/saved data, clipboard/share output, service-worker cache, and future external data/analytics. | Missing | Medium | Current escaping is generally careful, but new import/share/data features will expand the attack surface. | Repeat on each new integration; add malicious persisted/imported-value tests. |
| SP-03 | Publish a concise privacy/data-retention explanation and a clear financial/tax disclaimer in the product, not only the README/methodology. | Missing | Medium | Users should know what is stored, how to erase/export it, and the limits of a simplified estimator before relying on the output. | Legal/content review; align with FG-08 and FG-18. |
| SP-04 | Add automated secret scanning and dependency/code scanning as applicable. | Missing | Low | There are currently no runtime dependencies, but repository and future supply-chain mistakes should be caught early. | CI; keep tooling proportional to the static app. |

### CI/CD, observability, and operations

| ID | Work item | Status | Priority | Rationale | Dependencies / blockers |
| --- | --- | --- | --- | --- | --- |
| CO-01 | Add CI for every pull request and `main`: project checks, schema/HTML/manifest validation, tests, coverage, accessibility smoke, rule expiry, and app-shell integrity. | Completed | High | `.github/workflows/ci.yml` runs `just check` with Node 22 on pull requests and `main`; checks cover syntax, 34 tests, structural a11y/schema/manifest/app-shell integrity, dated-source expiry, and coverage gates. | Implemented 2026-08-08. The original broad formatter/linter portion is deliberately tracked separately as Low-priority TQ-08 to preserve the dependency-free runtime. Branch protection still requires repository-admin configuration. |
| CO-02 | Document and automate deployment with preview, production promotion, rollback, cache/version handling, and post-deploy smoke tests. | Investigation | Medium | `.nojekyll` suggests static hosting, but no workflow or production target is defined in the repository. | Confirm whether GitHub Pages or another host is configured externally. |
| CO-03 | Define release/version/changelog practice and annual rule-review ownership. | In progress | Medium | Ruleset/schema/cache versions and annual rule owner/review date now exist, but release numbering, changelog, and rollback practice do not. | TA-04 dedicated score version and CO-02 deployment workflow. |
| CO-04 | Decide on privacy-preserving uptime, JS error, Web Vitals, and funnel monitoring with alerts and retention limits. | Investigation | Low | There is currently no production observability. Monitoring is useful only if it does not collect exact financial inputs. | Production URL, privacy decision, and an owner for alerts. |

### Documentation and developer experience

| ID | Work item | Status | Priority | Rationale | Dependencies / blockers |
| --- | --- | --- | --- | --- | --- |
| DD-01 | Expand the README with prerequisites/versions, first-run instructions, test strategy, browser support, deployment location, privacy behavior, and links to the PRD and this roadmap. | In progress | Medium | Prerequisites, first run, checks/coverage, module links, privacy, and provisional browser support are documented; the production deployment location and verified browser matrix are unknown. | Confirm production host and browser-support commitment. |
| DD-02 | Document architecture, module boundaries, calculation pipeline, units/rounding, persistence schema/migrations, and service-worker strategy. | Completed | Medium | `docs/architecture.md` records module dependencies, validation/calculation flow, units/rounding, envelope migration/recovery, cache strategy, and verification boundaries. | Completed 2026-08-08 alongside TA-01/TA-02/TR-01. |
| DD-03 | Maintain a dated official-source ledger for fiscal, social, CFE, DPE, rent-control, and scoring assumptions, with a review cadence and owner. | Completed | High | Financial/regulatory claims now have traceable sources, dates, scope limits, review procedure, and an owner role. | Implemented 2026-08-07 in `docs/fiscal-rules.md`; qualified fixture approval remains TQ-02. |
| DD-04 | Document contribution/review rules, definition of done, fixture update process, release checklist, and rollback/runbook. | Missing | Low | Repeatable engineering practice is absent even though the app handles consequential calculations. | CI/CD direction and project ownership. |
| DD-05 | Pin or document required tool versions (`node`, `just`, `python3`) and consider standard package scripts for contributors without `just`. | Missing | Low | “No build step” is simple, but environment expectations are implicit. | Decide the minimum Node/browser versions. |

## Explicitly deferred / not currently committed

These were named as out of scope for V1. They should not be treated as missing release blockers unless product scope changes:

| Item | Status | Priority | Revisit when |
| --- | --- | --- | --- |
| User accounts and server-backed portfolio sync | Deferred | Low | Cross-device sync, collaboration, or paid plans justify backend/privacy complexity. |
| Bank API integrations | Deferred | Low | A clear user flow and regulated-data/security model exist. |
| Automatic property-listing import | Deferred | Low | Source permissions, data quality, and maintenance cost are understood. |
| Real-time mortgage-rate API | Deferred | Low | A reliable licensed provider and fallback policy are selected. |
| Automatic tax filing advice or legal-document generation | Deferred | Low | Qualified professional/legal ownership and compliance controls exist. |

## Recommended delivery order

### Phase 1 — Correctness and guardrails

- **Completed:** FG-01–FG-05, TA-01–TA-03, TQ-01, TQ-03, DD-03, and CO-01.
- **External approval pending:** TQ-02 golden/reference scenarios.

### Phase 2 — Trust, resilience, and usability

- **Completed:** UX-01 and UX-02; UX-04 engineering remediation is complete but manual NVDA/VoiceOver verification is blocked on reviewer/platform access.
- TR-01–TR-03: storage, service-worker, and browser reliability.
- FG-06, FG-08, FG-09: contextual fields, backup/import, and unsaved-work protection.
- SP-01–SP-03 and CO-02–CO-03: production hardening, privacy/disclaimer, deployment, and release versioning.

### Phase 3 — Product expansion

- FG-07, FG-10, FG-11, FG-15: comparison, flexible inputs, editable scenarios, and reports/share.
- FG-12–FG-14: projections, deeper taxation, and local/regulatory data.
- FG-16–FG-18: ETF comparison, localization, and optional privacy-safe analytics.

## Definition of done for backlog items

An item is not **Completed** until, where applicable:

- behavior and conservative fallbacks are documented;
- calculation changes have independent expected results and boundary tests;
- user flows include keyboard, mobile, invalid, empty, offline, and failure states;
- privacy/security implications are reviewed and no exact financial input is transmitted unintentionally;
- accessibility checks pass and manual checks are recorded;
- CI passes, documentation/source dates are updated, and the service-worker cache version is considered;
- this file is updated with the completion date and evidence (commit/issue/ADR).

## Assumptions and items requiring confirmation

- The baseline audit reflects repository revision `e481d2c`; completion evidence reflects the 2026-08-08 working tree. External production settings, GitHub branch protection/Pages configuration, traffic, private notes, and unlinked planning systems were not available in the repository.
- GitHub contained no issues and no open pull requests at audit time, so there was no remote backlog to consolidate.
- Official references were checked as of the audit date, but this document is not legal or tax advice. A qualified reviewer must approve fiscal/regulatory fixtures before release.
- Priority labels are audit recommendations, not delivery commitments. Product ownership, target launch date, and supported jurisdictions/browsers still need confirmation.
- “Completed, unverified” means code/assets exist but lack sufficient automated/manual proof; the corresponding test/reliability items remain open.
- Browser-rendered checks were performed at the normal 1280 px viewport and at 320×720. They do not substitute for human NVDA/VoiceOver testing or qualified fiscal review.
- The app is assumed to remain client-only in the near term. Accounts, sync, or external market data would require a new privacy, security, architecture, and operating-cost review.

## Maintenance rule

When work begins, change its status to **In progress** and link the owner plus issue/branch. When it finishes, move the essential capability into the completed baseline, record evidence, and remove or rewrite superseded gap rows. Review fiscal/regulatory sources at least annually and before every public release.
