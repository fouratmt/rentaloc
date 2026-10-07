const { spawnSync } = require("node:child_process");
const lock = require("../package-lock.json");

// See docs/dependency-audit.md. This exception is limited to development-only
// glob tooling, one advisory, and a fixed expiry; all other findings fail closed.
const exception = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const expiresOn = Date.parse("2026-11-06T00:00:00Z");

function evaluateAudit(report, packages, now = Date.now()) {
  if (report.error || !report.vulnerabilities || !report.metadata) {
    throw new Error("npm audit did not return a complete vulnerability report.");
  }
  const failures = new Set();
  const accepted = new Set();
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    for (const advisory of vulnerability.via) {
      // String entries refer to another entry's advisory; inspect each actual
      // advisory instead of incorrectly ignoring every dependent package.
      if (typeof advisory === "string") {
        if (!report.vulnerabilities[advisory]) throw new Error(`Missing audit entry: ${advisory}`);
        continue;
      }
      if (advisory.severity !== "high" && advisory.severity !== "critical") continue;
      const developmentOnly =
        vulnerability.nodes.length > 0 && vulnerability.nodes.every((node) => packages[node]?.dev === true);
      if (
        advisory.url === exception &&
        advisory.name === "braces" &&
        advisory.severity === "high" &&
        developmentOnly &&
        now < expiresOn
      ) {
        accepted.add(advisory.url);
      } else {
        failures.add(`${advisory.name}: ${advisory.title} (${advisory.url})`);
      }
    }
  }
  return { failures: [...failures], accepted: [...accepted] };
}

if (require.main === module) {
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "--json"], {
    encoding: "utf8",
  });
  try {
    if (result.error || result.signal || ![0, 1].includes(result.status)) {
      throw result.error || new Error(`npm audit failed with status ${result.status}: ${result.stderr}`);
    }
    const { failures, accepted } = evaluateAudit(JSON.parse(result.stdout), lock.packages);
    for (const advisory of accepted) {
      console.log(`Temporary development-only exception, expires 2026-11-06: ${advisory}`);
    }
    for (const failure of failures) console.error(failure);
    process.exitCode = failures.length > 0 ? 1 : 0;
    if (failures.length === 0) console.log("Dependency audit passed at high severity.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { evaluateAudit };
