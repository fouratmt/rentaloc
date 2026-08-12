# ADR 0004: No product analytics by default

- Status: Accepted
- Date: 2026-08-10

## Context

Product events could inform usability decisions, but financial inputs and derived outputs are sensitive and the current app has no consent, vendor, retention, or monitoring owner.

## Decision

Do not ship remote product analytics or error telemetry by default. Local, ephemeral diagnostics may contain only technical categories and must not include form values, project names, copied summaries, or derived financial metrics.

## Consequences

Moderated research and privacy-safe local diagnostics are preferred until a documented need exists. Remote monitoring requires a superseding ADR that defines purpose, event schema, consent/legal basis, processor, region, retention, deletion, access, sampling, and alert ownership.
