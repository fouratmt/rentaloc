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
  [["index.html", landingHtml], ["app.html", appHtml]].forEach(([name, html]) => {
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
  ["app.html", "src/install.js", "src/rules.js", "src/schema.js", "src/domain.js", "src/storage.js"].forEach((asset) => {
    assert.ok(assets.includes(asset), `${asset} is missing from the offline shell`);
  });
});

test("ruleset sources are documented and the review deadline has not expired", () => {
  assert.ok(Date.parse(RULESET.reviewDue) >= Date.now(), `Ruleset review expired on ${RULESET.reviewDue}`);
  RULESET.sources.forEach((source) => {
    assert.ok(sourceLedger.includes(source.url), `${source.id} is missing from the source ledger`);
  });
  assert.ok(sourceLedger.includes(RULESET.version));
});
