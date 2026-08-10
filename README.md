# RentaLoc

RentaLoc is a static installable PWA for quickly assessing the profitability of a rental property project in France.

## Features

- Simulates acquisition costs, rent, expenses, financing, taxes, and risk factors.
- Automatically calculates cash flow, yields, break-even rent, and the overall score.
- Saves multiple simulations locally in the browser.
- Includes an in-app guide for formulas and calculation assumptions.
- Works offline after the first load through the service worker.

## Product Notes

- The public app name is `RentaLoc`.
- PWA metadata lives in `site.webmanifest`.
- Saved simulations use the `rentaloc-projects-v1` local storage key. The current envelope is version 2 and legacy arrays are migrated on load.
- Calculation and saved-project data stays client-side; the application has no analytics or server API.
- Fiscal results use the dated `2026.1` ruleset for 2026 income in metropolitan France. They are simplified estimates, not tax or investment advice.
- The canonical status, gap analysis, and remaining-work roadmap is [`docs/progression-shell-fr.md`](docs/progression-shell-fr.md).
- Official rule sources and review dates are in [`docs/fiscal-rules.md`](docs/fiscal-rules.md).
- Module boundaries and data flow are documented in [`docs/architecture.md`](docs/architecture.md).

## Structure

- `index.html`: public landing page, product explanation, FAQ, and calls to action.
- `app.html`: dedicated simulator workspace, results, project portfolio, and calculation guide.
- `src/rules.js`: dated fiscal, regulatory, validation, and score configuration.
- `src/schema.js`: versioned simulation defaults, enums, units, normalization, and runtime validation.
- `src/domain.js`: pure financial calculations, tax estimates, scoring, warnings, and copied summaries.
- `src/storage.js`: bounded, migrated, recoverable local project repository.
- `src/install.js`: shared PWA registration, install prompt, and install-dialog behavior for both pages.
- `src/app.js`: simulator DOM rendering, user interactions, accessibility state, and controller logic.
- `src/styles.css`: responsive layout.
- `site.webmanifest`: PWA installation metadata.
- `sw.js`: offline app cache.
- `assets/icons/`: installation icons.
- `tests/`: domain, schema, persistence, accessibility-structure, manifest, and app-shell checks.

## Local Checks

The project has no build step or runtime dependency. Local verification expects Node.js 22+, `just`, and Python 3 for the static server.

```sh
just check
just serve
```

Then open `http://localhost:8000` for the landing page or `http://localhost:8000/app.html` for the simulator.

`just check` performs JavaScript syntax checks, 34 Node tests, schema/HTML/manifest/accessibility smoke checks, app-shell validation, fiscal-rule expiry checks, and coverage gates (90% lines, 95% functions, 70% branches). The same command runs in GitHub Actions for pull requests and pushes to `main`.

The UI targets current evergreen browsers. Clipboard, install prompts, and service-worker behavior degrade when their browser APIs are unavailable. The completed rendered audit and remaining manual screen-reader checks are recorded in [`docs/accessibility-audit.md`](docs/accessibility-audit.md).
