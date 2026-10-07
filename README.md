# RentaLoc

RentaLoc is a static installable PWA for quickly assessing the profitability of a rental property project in France.

## Features

- Simulates acquisition costs, rent, expenses, financing, taxes, and risk factors.
- Automatically calculates cash flow, yields, break-even rent, and the overall score.
- Saves multiple simulations locally, compares them, and supports explicit JSON backup/restore and bulk deletion.
- Includes an in-app guide for formulas and calculation assumptions.
- Works offline after the first load through the service worker.
- Ships as a hardened, non-root Nginx container for reproducible local or self-hosted operation.

## Product Notes

- The public app name is `RentaLoc`.
- PWA metadata lives in `site.webmanifest`.
- Saved simulations use the `rentaloc-projects-v1` local storage key. The current envelope is version 2 and legacy arrays are migrated on load.
- Calculation and saved-project data stays client-side; the application has no analytics or server API.
- Fiscal results use the dated `2026.1` ruleset for 2026 income in metropolitan France. They are simplified estimates, not tax or investment advice.
- The canonical status, gap analysis, and remaining-work roadmap is [`docs/progression-shell-fr.md`](docs/progression-shell-fr.md).
- Official rule sources and review dates are in [`docs/fiscal-rules.md`](docs/fiscal-rules.md).
- Module boundaries and data flow are documented in [`docs/architecture.md`](docs/architecture.md).
- Contribution/review rules and release operations are documented in [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/release-runbook.md`](docs/release-runbook.md).
- Major architectural choices are indexed in [`docs/adr/README.md`](docs/adr/README.md).
- Trust boundaries and security review triggers are documented in [`docs/threat-model.md`](docs/threat-model.md).
- The latest MVP release audit is [`docs/mvp-readiness-audit-2026-08-12.md`](docs/mvp-readiness-audit-2026-08-12.md).
- The public app is hosted on [GitHub Pages](https://fouratmt.github.io/rentaloc/). Docker is the portable runtime package; Cloudflare Pages deployment is optional and opt-in. Production approval and rollback are documented in [`docs/release-runbook.md`](docs/release-runbook.md). `npm run release:check` deliberately fails until the fiscal fixtures have qualified professional approval.

## Structure

- `index.html`: public landing page, product explanation, FAQ, and calls to action.
- `app.html`: dedicated simulator workspace, results, project portfolio, and calculation guide.
- `src/rules.js`: dated fiscal, regulatory, validation, and score configuration.
- `src/schema.js`: versioned simulation defaults, enums, units, normalization, and runtime validation.
- `src/domain.js`: pure financial calculations, tax estimates, scoring, warnings, and copied summaries.
- `src/storage.js`: bounded, migrated, recoverable local project repository and strict portable-file codec.
- `src/install.js`: shared PWA registration, install prompt, and install-dialog behavior for both pages.
- `src/app.js`: simulator DOM rendering, user interactions, accessibility state, and controller logic.
- `src/styles.css`: responsive layout.
- `site.webmanifest`: PWA installation metadata.
- `sw.js`: offline app cache.
- `Dockerfile`, `compose.yaml`, and `docker/nginx.conf`: production container, local orchestration, security headers, cache rules, and health check.
- `assets/icons/`: installation icons.
- `tests/`: domain, schema, persistence, accessibility-structure, manifest, and app-shell checks.

## Run with Docker

Docker 29+ with Compose is the shortest path to the production-equivalent runtime:

```sh
docker compose up --build --detach
docker compose ps
```

Open `http://localhost:8000` or `http://localhost:8000/app.html`. Change the host port with `RENTALOC_PORT=8080 docker compose up --build --detach`. Stop it with `docker compose down`.

The image serves only committed static assets, listens on container port 8080 as the unprivileged `nginx` user, exposes a Docker health check, and is run by Compose with a read-only filesystem, all Linux capabilities dropped, and `no-new-privileges`. TLS/HSTS must terminate at the platform or reverse proxy; the container supplies the remaining security and cache headers. Access logs omit query strings, referrers, and user agents.

`npm run check:container` builds the image, starts an isolated container on `127.0.0.1:18080`, verifies shell content, manifest MIME type, security headers, and non-root configuration, then removes the test container.

## Contributor checks

The browser application itself still has no compile/bundle step or server-side runtime. Contributor tooling supports Node.js 22 or newer (pinned in `.node-version`); Python 3.11+ is used only by the lightweight local/E2E server. `just` 1.25+ is optional.

```sh
npm install
npm run check
npm run serve
npm run test:e2e:install # once per machine
npm run test:e2e
npm run check:container
```

The committed lockfile must be updated whenever development tooling is added or changed. Contributors with `just` can run the equivalent commands:

```sh
just check
just check-container
just serve
```

Then open `http://localhost:8000` for the landing page or `http://localhost:8000/app.html` for the simulator.

`npm run check` and `just check` perform JavaScript syntax checks, Node tests, schema/HTML/manifest/accessibility smoke checks, app-shell validation, fiscal-rule expiry checks, and coverage gates (90% lines, 95% functions, 70% branches). The same verification runs in GitHub Actions for pull requests and pushes to `main`.

`npm run test:e2e` starts a deterministic local server and runs Chromium, desktop WebKit, and iPhone-profile WebKit. It covers calculation, validation, persistence across reload, project comparison/capacity, JSON portability, dialogs, clipboard feedback, 320 px reflow, and install guidance. Offline navigation and real waiting-worker activation run in Chromium; the required physical Safari/iOS matrix is tracked in [`docs/browser-compatibility-evidence.md`](docs/browser-compatibility-evidence.md). Browser artifacts are retained locally only on failure and are ignored by Git.

`npm run release:check` adds the browser suite and the qualified fiscal-fixture approval gate. It is expected to fail until the external approval described in [`docs/fiscal-fixture-review.md`](docs/fiscal-fixture-review.md) is recorded. Cloudflare Pages previews run on branch pushes only after `CLOUDFLARE_PAGES_ENABLED=true` and the required secrets/environments are configured; production from `main` additionally requires that approval. Scheduled public health checks default to GitHub Pages and explicitly account for its lack of custom CSP/nosniff response headers. See [`docs/dependency-audit.md`](docs/dependency-audit.md) for the expiring development-only audit exception.

Development-only quality tools are pinned in `package-lock.json`: ESLint for JavaScript, Stylelint for CSS, html-validate for HTML, markdownlint for Markdown, and Prettier for consistent formatting. Run `npm run lint`, `npm run format:check`, or `npm run format` directly when working on a specific quality concern.

The UI targets current evergreen browsers. Clipboard, install prompts, and service-worker behavior degrade when their browser APIs are unavailable. The completed rendered audit and remaining manual screen-reader checks are recorded in [`docs/accessibility-audit.md`](docs/accessibility-audit.md).
