const fs = require("node:fs");
const path = require("node:path");

const fixturePath = path.join(__dirname, "..", "tests", "fixtures", "reference-scenarios.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const approval = fixture.provenance?.professionalApproval;
const requiredText = ["reviewerName", "reviewerRole", "reviewedOn", "evidence"];
const missing = requiredText.filter((field) => typeof approval?.[field] !== "string" || !approval[field].trim());
const reviewedOn = Date.parse(approval?.reviewedOn || "");
const requiredScenarios = [
  "LMNP real simplified cash purchase",
  "long-term Micro-BIC cash purchase",
  "classified tourism Micro-BIC cash purchase",
  "unclassified tourism Micro-BIC cash purchase",
  "micro-foncier cash purchase",
  "real property-income cash purchase",
  "long-term Micro-BIC one prior-year threshold crossing remains eligible",
  "long-term Micro-BIC two consecutive threshold crossings are rejected",
  "unclassified tourism Micro-BIC two consecutive threshold crossings are rejected",
];
const scenarioNames = new Set((fixture.scenarios || []).map(({ name }) => name));
const missingScenarios = requiredScenarios.filter((name) => !scenarioNames.has(name));

if (
  approval?.status !== "approved" ||
  missing.length > 0 ||
  !Number.isFinite(reviewedOn) ||
  missingScenarios.length > 0
) {
  process.stderr.write(
    [
      "Fiscal reference approval is incomplete; production release is blocked.",
      "A qualified French tax/accounting reviewer must independently validate the fixtures.",
      `Update ${path.relative(process.cwd(), fixturePath)} following docs/fiscal-fixture-review.md.`,
    ].join("\n") + "\n",
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Fiscal fixtures approved by ${approval.reviewerName} (${approval.reviewerRole}) on ${approval.reviewedOn}.\n`,
  );
}
