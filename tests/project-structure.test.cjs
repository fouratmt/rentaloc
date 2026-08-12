const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const landingHtml = read("index.html");
const appHtml = read("app.html");
const appScript = read("src/app.js");
const styles = read("src/styles.css");
const serviceWorker = read("sw.js");
const sourceLedger = read("docs/fiscal-rules.md");
const packageJson = JSON.parse(read("package.json"));
const { RULESET } = require("../src/rules.js");
const { defaults } = require("../src/schema.js");

test("landing and app pages are separated and link to each other", () => {
  assert.match(landingHtml, /href="app\.html"/);
  assert.match(landingHtml, /class="landing-hero"/);
  assert.doesNotMatch(landingHtml, /data-field=/);
  assert.doesNotMatch(landingHtml, /src="src\/app\.js"/);
  assert.match(appHtml, /id="simulateur"/);
  assert.match(appHtml, /href="index\.html"/);
  assert.doesNotMatch(appHtml, /class="landing-hero"/);
  assert.doesNotMatch(appHtml, /id="faq"/);
});

test("each HTML page has unique ids and valid local script references", () => {
  [
    ["index.html", landingHtml],
    ["app.html", appHtml],
  ].forEach(([name, html]) => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${name} contains duplicate ids`);
    const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(scripts.includes("src/install.js"), `${name} is missing the shared install controller`);
    scripts.forEach((script) => assert.ok(fs.existsSync(path.join(root, script)), `${script} is missing`));
  });
});

test("every simulation schema field has exactly one labeled form control", () => {
  const labelBlocks = [...appHtml.matchAll(/<label(?:\s[^>]*)?>([\s\S]*?)<\/label>/g)].map((match) => match[1]);
  const labeledFields = labelBlocks.flatMap((block) =>
    [...block.matchAll(/data-field="([^"]+)"/g)].map((match) => match[1]),
  );
  assert.deepEqual([...labeledFields].sort(), Object.keys(defaults).sort());
});

test("the primary diagnostic exposes the debt-coverage indicator", () => {
  assert.match(appHtml, /<span>Couverture du crédit<\/span>\s*<strong id="debtCoverageRatio">/);
  assert.match(appScript, /setDebtCoverageText\(document\.querySelector\("#debtCoverageRatio"\), metrics\)/);
});

test("dialogs and live announcements use focused accessible patterns", () => {
  assert.match(appHtml, /<dialog[^>]+id="helpOverlay"[^>]+aria-describedby="helpDescription"/);
  assert.match(appHtml, /class="help-subtitle" id="helpDescription"/);
  assert.match(appHtml, /<dialog[^>]+id="installOverlay"[^>]+aria-describedby="installDescription"/);
  assert.match(landingHtml, /<dialog[^>]+id="installOverlay"[^>]+aria-describedby="installDescription"/);
  assert.doesNotMatch(appHtml, /class="results-column"[^>]+aria-live/);
  assert.match(appHtml, /id="resultStatus"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
  assert.match(appHtml, /id="validationPanel"[^>]+tabindex="-1"/);
  assert.match(styles, /\.sr-only\s*\{[\s\S]*?clip:\s*rect\(0, 0, 0, 0\)/);
  assert.match(styles, /\.help-section code\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
  [landingHtml, appHtml].forEach((html) => {
    assert.match(html, /id="networkStatus"[^>]+role="status"/);
    assert.match(html, /id="updateButton"[^>]+hidden/);
  });
});

test("manifest and service-worker app-shell assets are valid", () => {
  const manifest = JSON.parse(read("site.webmanifest"));
  assert.equal(manifest.name, "RentaLoc");
  assert.equal(manifest.start_url, "./app.html");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  const shellBlock = serviceWorker.match(/const coreAppShell = \[([\s\S]*?)\];/)?.[1] || "";
  const assets = [...shellBlock.matchAll(/"\.\/([^"]+)"/g)].map((match) => match[1]);
  assets.forEach((asset) => {
    const filePath = asset.split("?")[0];
    assert.ok(fs.existsSync(path.join(root, filePath)), `${filePath} is missing from disk`);
  });
  ["app.html", "src/install.js", "src/rules.js", "src/schema.js", "src/domain.js", "src/storage.js"].forEach(
    (asset) => {
      assert.ok(assets.includes(asset), `${asset} is missing from the offline shell`);
    },
  );
});

test("ruleset sources are documented and the review deadline has not expired", () => {
  assert.ok(Date.parse(RULESET.reviewDue) >= Date.now(), `Ruleset review expired on ${RULESET.reviewDue}`);
  RULESET.sources.forEach((source) => {
    assert.ok(sourceLedger.includes(source.url), `${source.id} is missing from the source ledger`);
  });
  assert.ok(sourceLedger.includes(RULESET.version));
});

test("the contributor toolchain is pinned and available without just", () => {
  assert.equal(read(".node-version").trim(), "22");
  assert.equal(packageJson.engines.node, ">=22");
  assert.match(packageJson.scripts.check, /check:syntax/);
  assert.match(packageJson.scripts.check, /lint/);
  assert.match(packageJson.scripts.check, /format:check/);
  assert.match(packageJson.scripts.lint, /lint:js/);
  assert.match(packageJson.scripts.test, /--test-coverage-lines=90/);
  assert.match(packageJson.scripts.serve, /python3 -m http\.server/);
});

test("contribution and release procedures cover consequential changes", () => {
  const contributing = read("CONTRIBUTING.md");
  const releaseRunbook = read("docs/release-runbook.md");
  assert.match(contributing, /Definition of done/);
  assert.match(contributing, /reference fixtures/i);
  assert.match(contributing, /qualified French tax professional/i);
  assert.match(releaseRunbook, /Release checklist/);
  assert.match(releaseRunbook, /Rollback procedure/);
  assert.match(releaseRunbook, /service-worker cache/i);
  assert.match(releaseRunbook, /Cloudflare Pages/);
  assert.match(releaseRunbook, /check:fiscal-approval/);
});

test("production deployment is gated and supplies static security headers", () => {
  const deploy = read(".github/workflows/deploy.yml");
  const headers = read("_headers");
  const approvalCheck = read("scripts/check-fiscal-approval.cjs");
  const stagingScript = read("scripts/stage-static-site.sh");

  assert.match(deploy, /npm run check:fiscal-approval/);
  assert.match(deploy, /cloudflare\/wrangler-action@v3/);
  assert.match(deploy, /pages deploy dist --project-name=rentaloc/);
  assert.match(headers, /Content-Security-Policy:/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /Strict-Transport-Security:/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /\/sw\.js[\s\S]*max-age=0, must-revalidate/);
  assert.match(approvalCheck, /production release is blocked/i);
  ["index.html", "app.html", "site.webmanifest", "sw.js", "_headers"].forEach((asset) =>
    assert.match(stagingScript, new RegExp(asset.replace(".", "\\."))),
  );
});

test("major architectural choices have accepted ADRs", () => {
  const adrIndex = read("docs/adr/README.md");
  ["0001", "0002", "0003", "0004", "0005"].forEach((id) => assert.match(adrIndex, new RegExp(id)));
  [
    "docs/adr/0001-client-only-local-persistence.md",
    "docs/adr/0002-simplified-tax-estimates.md",
    "docs/adr/0003-versioned-score-policy.md",
    "docs/adr/0004-no-product-analytics-by-default.md",
    "docs/adr/0005-external-data-acceptance-gate.md",
  ].forEach((filePath) => {
    const adr = read(filePath);
    assert.match(adr, /Status: Accepted/);
    assert.match(adr, /## Consequences/);
  });
});

test("dynamic saved-project HTML is escaped and threat-modeled", () => {
  const threatModel = read("docs/threat-model.md");
  assert.match(appScript, /escapeHtml\(project\.id\)/);
  assert.match(appScript, /escapeHtml\(project\.name\)/);
  assert.match(threatModel, /Stored\/reflected script injection/);
  assert.match(threatModel, /Service worker\/cache/);
  assert.match(threatModel, /Import\/export\/share/);
});

test("both product pages expose privacy, retention, and non-advisory notices", () => {
  [landingHtml, appHtml].forEach((html) => {
    assert.match(html, /id="confidentialite"/);
    assert.match(html, /stockage local/);
    assert.match(html, /pas un conseil fiscal,[\s\S]*juridique ou[\s\S]*d'investissement/);
    assert.match(html, /href="#confidentialite"/);
  });
  assert.match(appHtml, /50 simulations/);
  assert.match(appHtml, /exportez un JSON/i);
  assert.match(landingHtml, /export JSON explicite/i);
});

test("CI scans secrets, dependencies, and JavaScript code", () => {
  const ci = read(".github/workflows/ci.yml");
  const security = read(".github/workflows/security.yml");
  const dependabot = read(".github/dependabot.yml");
  assert.match(ci, /npm audit --audit-level=high/);
  assert.match(security, /gitleaks\/gitleaks-action@v3/);
  assert.match(security, /actions\/dependency-review-action@v4/);
  assert.match(security, /github\/codeql-action\/init@v4/);
  assert.match(security, /languages: javascript-typescript/);
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
});

test("browser E2E checks are pinned and run in CI", () => {
  const ci = read(".github/workflows/ci.yml");
  const playwrightConfig = read("playwright.config.cjs");
  assert.equal(packageJson.devDependencies["@playwright/test"], "1.62.1");
  assert.match(packageJson.scripts["test:e2e"], /playwright test/);
  assert.match(ci, /playwright install --with-deps chromium/);
  assert.match(ci, /npm run test:e2e/);
  assert.match(playwrightConfig, /serviceWorkers: "allow"/);
});
