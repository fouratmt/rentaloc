const assert = require("node:assert/strict");
const { test } = require("node:test");
const { evaluateAudit } = require("../scripts/audit-dependencies.cjs");

const url = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const now = Date.parse("2026-10-07T00:00:00Z");
const packages = { "node_modules/braces": { dev: true } };
function report(advisory = {}) {
  return {
    metadata: {},
    vulnerabilities: {
      braces: {
        nodes: ["node_modules/braces"],
        via: [{ name: "braces", title: "Nested patterns", url, severity: "high", ...advisory }],
      },
      micromatch: { nodes: [], via: ["braces"] },
    },
  };
}

test("audit accepts only the documented development-only advisory before expiry", () => {
  assert.deepEqual(evaluateAudit(report(), packages, now), { failures: [], accepted: [url] });
  assert.equal(evaluateAudit(report(), packages, Date.parse("2026-11-06")).failures.length, 1);
  assert.equal(evaluateAudit(report(), { "node_modules/braces": { dev: false } }, now).failures.length, 1);
  assert.equal(evaluateAudit(report(), {}, now).failures.length, 1);
  const emptyNodes = report();
  emptyNodes.vulnerabilities.braces.nodes = [];
  assert.equal(evaluateAudit(emptyNodes, packages, now).failures.length, 1);
});

test("new high and critical advisories fail even on an otherwise excepted package", () => {
  assert.equal(evaluateAudit(report({ url: "https://github.com/advisories/new" }), packages, now).failures.length, 1);
  assert.equal(evaluateAudit(report({ severity: "critical" }), packages, now).failures.length, 1);
  assert.equal(evaluateAudit(report({ name: "other" }), packages, now).failures.length, 1);
  assert.equal(evaluateAudit(report({ severity: "moderate" }), packages, now).failures.length, 0);
});

test("audit fails closed on unavailable and incomplete reports", () => {
  assert.throws(() => evaluateAudit({ error: { code: "ENETUNREACH" } }, packages, now), /complete/);
  assert.throws(() => evaluateAudit({ vulnerabilities: {} }, packages, now), /complete/);
  const incomplete = report();
  delete incomplete.vulnerabilities.braces;
  assert.throws(() => evaluateAudit(incomplete, packages, now), /Missing audit entry/);
});
