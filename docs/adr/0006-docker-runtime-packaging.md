# ADR 0006: Docker runtime packaging

Date: 2026-08-12
Status: Accepted

## Context

RentaLoc is a static, client-only PWA, but its previous local runtime depended on a contributor's Python server and its managed deployment used Cloudflare-specific static configuration. A portable artifact was needed for reproducible local, CI, and future self-hosted operation without turning the application into a server-side product.

## Decision

Package the committed browser assets in a digest-pinned Nginx Alpine image. Run Nginx as its unprivileged user on port 8080. Keep container files immutable at runtime, expose a health check, and configure CSP, privacy, MIME, service-worker, and cache headers in Nginx.

Use Compose for local production-equivalent operation with a read-only root filesystem, a bounded `/tmp` tmpfs, all capabilities dropped, and `no-new-privileges`. Keep TLS, HSTS, canonical-host redirects, certificates, and public routing at the deployment platform or reverse proxy.

The image is the canonical portable runtime package. Cloudflare Pages remains the configured managed-static deployment until an image registry and container host are explicitly selected. Containerization does not add a backend, account system, remote persistence, analytics, or financial-data API.

## Consequences

- Local and CI environments can build and exercise the same Nginx runtime and headers.
- Runtime changes require the container smoke gate and parity review with Cloudflare `_headers`.
- The base image must be deliberately updated and rescanned; digest pinning prevents silent base changes.
- Container access logs use method and normalized path only, omitting query strings, referrers, and user agents.
- A future public container deployment still requires a registry/host decision, TLS, immutable digest promotion, image scanning/SBOM, ownership, and rollback configuration.
