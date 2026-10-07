# Development dependency audit

`npm run audit:dependencies` enforces the CI audit threshold of high severity.
Registry failures, malformed reports, critical findings, and new high findings
block CI. Use `npm audit` to inspect the complete report, including lower severities.

## Temporary exception: GHSA-vfj7-8cjw-p6xm

- Package: `braces`, through Markdownlint and Stylelint glob tooling.
- Advisory: <https://github.com/advisories/GHSA-vfj7-8cjw-p6xm>.
- Reviewed: 2026-10-07. Expiry: 2026-11-06 (UTC).
- Upstream has no patched release as of the review date.
- Trigger: recursive parsing of attacker-supplied, deeply nested glob patterns.
- Exposure here: development tooling receives fixed, repository-owned glob
  patterns from `package.json` and `.markdownlint-cli2.jsonc`. User simulation
  inputs never reach these tools. The deployed static site/container contains
  no npm development dependencies.
- Scope: only this advisory and only when every affected installed package is
  marked development-only in the lockfile. New advisories on `braces` still fail.
- Follow-up: remove this exception once upstream publishes a patch. The gate
  automatically fails after the expiry date if the vulnerability remains.

Keep glob configuration repository-owned; accepting external glob patterns would
invalidate this exception. Do not replace the audit with `--omit=dev` or ignore all
findings on transitive lint dependencies.
