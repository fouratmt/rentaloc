# Release and rollback runbook

RentaLoc's canonical production URL is <https://fourat.dev/rentaloc/> on GitHub Pages. The repository also provides portable Docker packaging and an optional Cloudflare deployment path:

- `Dockerfile` is the canonical self-hosted runtime artifact. It serves the unchanged static PWA through non-root Nginx.
- `.github/workflows/deploy.yml` deploys the staged static files to the managed Cloudflare Pages project `rentaloc`. Set the repository variable `CLOUDFLARE_PAGES_ENABLED=true` to enable automatic deployments. Non-`main` pushes are previews and `main` is production; manual dispatch also remains available.

No container registry, Kubernetes workload, VM/container production host, or automated image publication is configured yet. Do not describe the Docker image as deployed until one of those paths is selected and verified.

## GitHub Pages custom domain

The `/rentaloc/` project path inherits the custom domain of the account's root
site, `fouratmt/fouratmt.github.io`.

1. In that root repository's Settings → Pages, enable GitHub Pages with the
   **GitHub Actions** source, matching its existing Hugo deployment workflow.
2. Set its custom domain to `fourat.dev` and enable HTTPS when available. Keep
   the DNS origin pointed at GitHub Pages; the current domain uses Cloudflare
   as a proxy. Use Cloudflare **Full (strict)** once GitHub's certificate is
   issued. While that certificate is provisioning, **Full** can establish an
   encrypted origin connection; **Flexible** loops when GitHub enforces HTTPS.
   Purge cached `/rentaloc/` responses after changing the domain or SSL mode.
3. Run the root repository's **Deploy Hugo site to Pages** workflow after
   enabling Pages and saving the domain.
4. Keep RentaLoc's own custom-domain field empty. Setting `fourat.dev` directly
   on `rentaloc` would assign the domain root instead of the required project
   path. Do not add a `CNAME` file to this repository.
5. If `PRODUCTION_URL` is set in RentaLoc's Actions variables, set it to
   `https://fourat.dev/rentaloc`; otherwise the health workflow uses that URL
   by default. Verify both `/rentaloc/` and `/rentaloc/app.html`, then run
   **Production health**.

See [GitHub's custom-domain inheritance documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages#using-a-custom-domain-across-multiple-repositories).

## Local production-equivalent container

```sh
docker compose up --build --detach
docker compose ps
curl --fail http://127.0.0.1:8000/app.html
docker compose down
```

Use `RENTALOC_PORT` to change the published port. `npm run check:container` performs the isolated build/runtime smoke test used by CI. The container expects TLS termination and canonical-host redirects from its deployment platform or reverse proxy.

## Optional Cloudflare and repository setup

1. Create the `rentaloc` Cloudflare Pages project with Direct Upload.
2. Add `CLOUDFLARE_ACCOUNT_ID` and a least-privilege `CLOUDFLARE_API_TOKEN` with Pages edit access as GitHub Actions secrets.
3. Create GitHub environments named `preview` and `production`. Protect `production` with a required human reviewer and restrict it to `main`.
4. Add the production custom domain in Cloudflare, enable HTTPS, and record the canonical URL in the README and release record.
5. Add the full canonical base URL, including any project path and without a trailing slash, as the GitHub Actions repository variable `PRODUCTION_URL`. The health workflow defaults to `https://fourat.dev/rentaloc`. Its `github-pages` profile checks the public shell and manifest MIME; GitHub Pages does not apply `_headers` and does not supply custom CSP/nosniff headers. For Cloudflare or another host with those headers, set `PRODUCTION_HEALTH_PROFILE=strict`. Container CI always verifies Nginx security headers.
6. Enable the repository Dependency graph under Settings → Advanced Security so the Dependency Review workflow can compare pull requests. Review the temporary development-only audit exception in `docs/dependency-audit.md`.
7. Set `CLOUDFLARE_PAGES_ENABLED=true` only after Cloudflare setup and the fiscal approval requirements are complete. Leave it unset for local-only deployments.
8. Make CI, container, browser, security, deployment, and production-health checks required/owned. GitHub workflow failure notifications are the initial uptime alert; assign an operational owner. Disable any second Cloudflare Git integration so only the audited workflow deploys.

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
