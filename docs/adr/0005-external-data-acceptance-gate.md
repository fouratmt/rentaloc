# ADR 0005: Acceptance gate for external data

- Status: Accepted
- Date: 2026-08-10

## Context

Market rents, vacancy, regulation, DPE work estimates, and mortgage rates can improve context but introduce licensing, freshness, availability, privacy, and operational risks.

## Decision

Do not integrate an external source until its license permits the intended use; geographic and temporal coverage are documented; update ownership and cache/failure behavior are defined; provenance and last-updated dates are visible; user-entered values remain distinguishable; and unavailable data degrades without blocking calculation.

## Consequences

External values are advisory context, never silently authoritative inputs. Each integration requires security/privacy review, deterministic fixtures, stale/unavailable tests, monitoring ownership, and a source-specific ADR or an update that supersedes this gate.
