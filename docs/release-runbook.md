# Release and rollback runbook

RentaLoc has one portable runtime package and one currently configured deployment path:

- `Dockerfile` is the canonical self-hosted runtime artifact. It serves the unchanged static PWA through non-root Nginx.
- `.github/workflows/deploy.yml` deploys the staged static files to the managed Cloudflare Pages project `rentaloc`. Non-`main` pushes are previews and `main` is production.

No container registry, Kubernetes workload, VM/container production host, or automated image publication is configured yet. Do not describe the Docker image as deployed until one of those paths is selected and verified.

## Local production-equivalent container

```sh
docker compose up --build --detach
docker compose ps
curl --fail http://127.0.0.1:8000/app.html
docker compose down
```

Use `RENTALOC_PORT` to change the published port. `npm run check:container` performs the isolated build/runtime smoke test used by CI. The container expects TLS termination and canonical-host redirects from its deployment platform or reverse proxy.

## One-time Cloudflare and repository setup

1. Create the `rentaloc` Cloudflare Pages project with Direct Upload.
2. Add `CLOUDFLARE_ACCOUNT_ID` and a least-privilege `CLOUDFLARE_API_TOKEN` with Pages edit access as GitHub Actions secrets.
3. Create GitHub environments named `preview` and `production`. Protect `production` with a required human reviewer and restrict it to `main`.
4. Add the production custom domain in Cloudflare, enable HTTPS, and record the canonical URL in the README and release record.
5. Add the canonical origin, without a trailing slash, as the GitHub Actions repository variable `PRODUCTION_URL`. Scheduled health checks deliberately fail until this is configured.
6. Make CI, container, browser, security, deployment, and production-health checks required/owned. GitHub workflow failure notifications are the initial uptime alert; assign an operational owner. Disable any second Cloudflare Git integration so only the audited workflow deploys.

## Release checklist

1. Confirm `main` is clean and identify the exact commit to release.
2. Run `npm ci`, `npm run check`, `npm run check:container`, `npm run test:e2e`, and `npm run check:fiscal-approval` with Node 22 and Docker available.
3. Inspect the independent fiscal review evidence rather than trusting fixture metadata alone.
4. Review schema, score-policy, manifest, Nginx/Cloudflare header parity, and service-worker cache versions. Increment the cache version whenever changed assets could otherwise remain stale.
5. Smoke-test the Docker candidate: landing → simulator, valid/invalid calculation, save/load/delete, JSON export/import, clipboard, offline reload, keyboard dialogs, and a 320 px viewport.
6. Push the candidate to a non-`main` branch. The Cloudflare deployment workflow verifies the public shell, manifest MIME type, and critical headers using GET requests with no financial data; manually verify HTML/service-worker revalidation, navigation, installability, and the remaining preview checklist.
7. Merge the exact reviewed commit to `main`; approve the protected production environment only after all gates pass.
8. Run production smoke tests without real financial values and record the release commit, image/build revision if applicable, time, operator, results, and known limitations.

## Container publication checklist

Before deploying the image outside local/CI use:

1. Select a registry and deployment platform and document ownership, authentication, TLS, log retention, patch cadence, resource limits, and rollback behavior.
2. Build from the reviewed commit with `BUILD_REVISION=<git-sha>`; publish an immutable content digest, not only a mutable tag.
3. Scan the final image and generate/store an SBOM through the chosen platform.
4. Preserve the existing non-root, read-only, dropped-capability runtime settings.
5. Verify health, security headers, manifest MIME, service-worker scope/cache, and no outbound financial-data path on the public origin.

## Rollback triggers

Rollback is preferred when production shows incorrect calculations, data loss/corruption, a broken application shell, inaccessible core flows, unintended data transmission, or a security/header/cache regression that cannot be safely corrected immediately.

## Rollback procedure

1. Identify the last known-good release commit or immutable image digest and preserve diagnostics that contain no user financial data.
2. For Cloudflare, promote the last known-good Pages deployment or dispatch the deployment workflow at that commit. For a future container host, redeploy the recorded digest. Do not rewrite Git history.
3. Ensure the service-worker cache name differs from the faulty release when cached assets changed.
4. Verify landing and simulator navigation, default calculation, local-save compatibility, headers, health, and offline reload in a fresh browser profile.
5. Document the incident, affected release, rollback commit/digest, validation evidence, and required follow-up.

If a persistence migration is not backward-compatible, do not roll back blindly. Ship a forward fix or compatibility migration and preserve rejected data through the recovery mechanism.
