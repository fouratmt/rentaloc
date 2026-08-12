# Release and rollback runbook

The production target is a Cloudflare Pages project named `rentaloc`. `.github/workflows/deploy.yml` publishes an exact staged static artifact through Wrangler: non-`main` branch pushes are previews and `main` is production. Cloudflare Pages reads `_headers` from the artifact to apply the repository-owned security and cache policy.

## One-time repository and host setup

1. Create the `rentaloc` Cloudflare Pages project with Direct Upload.
2. Add `CLOUDFLARE_ACCOUNT_ID` and a least-privilege `CLOUDFLARE_API_TOKEN` with Pages edit access as GitHub Actions secrets.
3. Create GitHub environments named `preview` and `production`. Protect `production` with a required human reviewer and restrict it to `main`.
4. Add the production custom domain in Cloudflare, enable HTTPS, and record the canonical URL in the README and release record.
5. Add the canonical origin, without a trailing slash, as the GitHub Actions repository variable `PRODUCTION_URL`. Scheduled health checks deliberately fail until this is configured.
6. Make CI, browser checks, security scans, deployment, and production-health checks required/owned. GitHub workflow failure notifications are the initial uptime alert; assign an operational owner. Disable any second Cloudflare Git integration so only the audited GitHub workflow deploys.

## Release checklist

1. Confirm `main` is clean and identify the exact commit to release.
2. Run `npm ci` followed by `npm run release:check` with Node 22. This includes unit/integration/browser tests and the fiscal-approval gate.
3. Confirm `npm run check:fiscal-approval` passes and inspect the linked independent review evidence rather than trusting metadata alone.
4. Review schema, score-policy, manifest, and service-worker cache versions. Increment the cache version whenever a changed asset could otherwise remain stale.
5. Serve the candidate locally and smoke-test landing → simulator, valid/invalid calculation, save/load/delete, copy/export/share where present, offline reload, keyboard dialogs, and a 320 px viewport.
6. Push the candidate to a non-`main` branch. The deployment workflow verifies the public shell, manifest MIME type, and critical headers using GET requests with no financial data; manually verify HTML/service-worker revalidation, navigation, installability, and the remaining preview checklist.
7. Merge the exact reviewed commit to `main`; approve the protected production environment only after all gates pass.
8. Run production smoke tests without entering sensitive real-world values and record the release commit, time, operator, results, and known limitations.

## Rollback triggers

Rollback is preferred when production shows incorrect calculations, data loss/corruption, a broken application shell, inaccessible core flows, unintended data transmission, or a security-header/cache regression that cannot be safely corrected immediately.

## Rollback procedure

1. Identify the last known-good release commit and preserve diagnostics that contain no user financial data.
2. Use Cloudflare Pages rollback to promote the last known-good deployment, or dispatch the deployment workflow at that commit; do not rewrite Git history.
3. Ensure its service-worker cache name differs from the faulty release when cached assets changed.
4. Verify landing and simulator navigation, a default calculation, local-save compatibility, and offline reload in a fresh browser profile.
5. Document the incident, affected release, rollback commit, validation evidence, and required follow-up in the changelog or linked issue.

If a persistence migration is not backward-compatible, do not roll back blindly. Ship a forward fix or compatibility migration and preserve rejected data through the recovery mechanism.
