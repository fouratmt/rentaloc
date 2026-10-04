# Contributing to RentaLoc

RentaLoc produces consequential financial estimates. Changes should stay small, traceable, and conservative, especially when they affect taxation, financing, scoring, persistence, or offline behavior.

## Development workflow

1. Use Node 22 and run `npm install` from the repository root. Install Docker when changing runtime packaging or HTTP behavior.
2. Create a focused branch and describe the user-visible behavior or risk being addressed.
3. Add or update tests before treating the implementation as complete.
4. Run `npm run check`. Run `npm run check:container` for Docker, static-serving, header, MIME, or cache changes. Use `npm run format` only for files intentionally included in the change.
5. Update user documentation, the fiscal source ledger, and `docs/progression-shell-fr.md` when their claims or status change.

Do not mix unrelated refactoring with calculation or rule changes. Never add a network request containing simulation inputs without an explicit privacy and threat-model review.

## Review requirements

Every review should verify:

- input units, boundary behavior, rounding, and invalid states;
- keyboard and mobile behavior for UI changes;
- schema migration and recovery behavior for persisted-data changes;
- cache version and offline-shell impact for changed runtime assets;
- Docker non-root/read-only compatibility and parity between Nginx headers and Cloudflare `_headers` for runtime-serving changes;
- dated official sources and independent expected results for fiscal/regulatory changes;
- that copied, exported, shared, logged, or monitored data excludes unnecessary financial inputs.

Calculation or fiscal changes require a second reviewer. A qualified French tax professional must approve reference fixtures before they are presented as professionally validated.

## Definition of done

A change is done when the implementation, focused tests, relevant documentation, and roadmap evidence agree; `npm run check` passes; failure and accessibility states have been considered; and any required external approval is recorded rather than assumed. Production-dependent checks may remain explicit release blockers, but must not be silently marked complete.

## Updating reference fixtures

Reference scenarios live in `tests/fixtures/reference-scenarios.json`.

1. Record the source ruleset, independent workbook or calculation method, reviewer identity/role, review date, expected rounding, and tolerances.
2. Add the smallest scenario that proves the changed rule and boundary cases immediately around it.
3. Recalculate expected values independently of `src/domain.js`; never copy values from the implementation under test.
4. Run `npm test` and review the fixture diff separately from implementation changes.
5. Leave `professionalApproval.status` as `pending` until a qualified reviewer has explicitly approved it and supplied the metadata/evidence required by `docs/fiscal-fixture-review.md`.

Release and rollback operations are documented in `docs/release-runbook.md`.
