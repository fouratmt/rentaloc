# RentaLoc Architecture

RentaLoc is a build-free, client-only static PWA. Financial inputs are processed locally and saved only in browser storage.

## Page boundaries

- `index.html` is the public landing page. It contains marketing content, feature explanations, the FAQ, and links into the simulator, but no financial form or domain scripts.
- `app.html` is the application workspace. It contains the simulator, saved projects, results, methodology, and calculation-guide dialog.
- Both pages load `src/install.js` so service-worker registration and the install experience remain consistent. The manifest starts installed sessions directly on `app.html`.

## Module boundaries

| Module           | Responsibility                                                                                                         | Browser global / Node export |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `src/rules.js`   | Dated rule values, scope metadata, source identifiers, validation limits, tax-mode configuration, and scoring policy   | `RentaLocRules`              |
| `src/schema.js`  | Schema version, defaults, units/constraints, enum definitions, normalization, and runtime shape validation             | `RentaLocSchema`             |
| `src/domain.js`  | Pure acquisition, operating, financing, tax, break-even, scoring, warning, and summary calculations                    | `RentaLocDomain`             |
| `src/storage.js` | Versioned local-project envelopes, strict import/export, legacy migration, limits, recovery, and error reporting       | `RentaLocStorage`            |
| `src/install.js` | Shared service-worker registration, install prompt, platform instructions, and install dialog                          | Browser initializer          |
| `src/app.js`     | Form reads/writes, rendering, focus and live-region behavior, project actions, clipboard, and calculation-guide dialog | Browser controller only      |

The calculation modules use a small UMD-style wrapper so the browser can load plain scripts while Node tests import the same public APIs directly. Dependencies flow in one direction: `rules` → `schema` → `domain`/`storage` → `app`. The install initializer is independent and is the only JavaScript loaded by the landing page.

## Calculation pipeline

1. The controller reads every `data-field` control and normalizes values with the schema defaults.
2. Runtime schema validation checks numeric finiteness/ranges, integer constraints, and every enum.
3. Domain validation adds cross-field rules such as compatible rental/tax modes and 2026 micro-BIC eligibility.
4. Only valid input is presented as a decision result. Invalid input gets linked inline errors, a summary panel, and unavailable save/copy actions.
5. `calculate` derives project cost, operating income, amortization, annual tax estimate, cash flows, yields, break-even rent, and versioned score output.
6. The same domain warning generator feeds both the visible warning panel and copied summary.

The controller also applies contextual form state before each calculation. Cash purchases disable loan-only fields; rental type constrains usage and fiscal options; and tax-specific controls are exposed only when their value participates in the selected calculation. Incompatible controlling changes are converted to conservative valid defaults and announced in the project status region.

Field and metric explanations are rendered as visible helper text and connected with `aria-describedby`. When validation fails, the controller retains the helper description and adds the field error ID, so assistive technology receives both context and correction.

Unsaved-work state is derived from a serialized snapshot of the active project identity, name, and normalized effective values. A successful save, load, reset, or new-project transition commits a new baseline. Dirty state is shown visually and guards destructive controls, browser navigation, and the cancelable service-worker update event.

Saved-project comparison remains a controller projection rather than persisted derived data. Each saved snapshot is normalized through the current schema and passed through the same validation, calculation, and warning functions as the active form. The user-selected baseline and sort order are transient UI state; this prevents stale metrics and avoids changing the storage envelope.

Money is represented as JavaScript numbers in euros. Rates entered by users are percentage points and are converted to decimals in the domain module. Display rounding uses French `Intl.NumberFormat`; calculations retain full floating-point precision. Break-even rent uses a bounded binary search and reports non-convergence as a blocking calculation issue.

## Persistence schema

The public storage key remains `rentaloc-projects-v1` for backward compatibility. Its current envelope is:

```json
{
  "version": 2,
  "simulationSchemaVersion": 2,
  "savedAt": "ISO-8601 timestamp",
  "projects": []
}
```

Legacy top-level arrays are migrated. On every load and save, project IDs, names, dates, counts, and simulation values are bounded and validated. Unreadable, unsupported, invalid, or excess source data is copied when possible to `rentaloc-projects-v1-recovery` before it is excluded. Storage/quota failures are returned to the controller as actionable status messages.

Portable JSON uses the same envelope and schema versions. Export normalizes the complete project set. Import caps the file at 1 MiB, rejects unknown versions or any invalid project before writing, and requires confirmation before transactionally replacing the portfolio. The current form is not embedded in URLs or sent to a server.

## PWA and cache strategy

Navigation and static assets use network-first requests with cached fallbacks. The service-worker cache is explicitly versioned, old RentaLoc caches are deleted on activation, and the app shell includes both HTML entry points plus every executable module. Precache tolerates optional asset failures but requires both offline documents. Offline navigation preserves route intent: landing requests fall back to `index.html`, while simulator requests fall back to `app.html`; uncached assets receive an explicit offline 503. A waiting worker activates only after the page sends `SKIP_WAITING`, allowing the UI to protect unsaved work. The stylesheet URL is versioned so visual fixes cannot be hidden by an older controlled page.

The shared install controller announces online/offline state and watches registrations for a waiting worker. It exposes refresh as an explicit button, dispatches the simulator's cancelable dirty-state guard, requests activation, and reloads only after `controllerchange` confirms that the new worker controls the page.

## Verification boundaries

`just check` syntax-checks every executable file, runs Node's test runner with coverage gates, validates schema-to-form coverage and app-shell assets, and fails when the fiscal review date expires. The pinned browser matrix covers Chromium and desktop/mobile WebKit; deterministic service-worker lifecycle coverage remains Chromium-only. Fiscal golden fixtures still require approval by a qualified French tax professional. Browser and assistive-technology evidence boundaries are tracked in `docs/browser-compatibility-evidence.md` and `docs/accessibility-audit.md`.
