# ADR 0002: Bounded, dated, simplified tax estimates

- Status: Accepted
- Date: 2026-08-10

## Context

French rental taxation is household-specific and changes over time. A static screening tool cannot safely act as filing or optimization software.

## Decision

Tax calculations use an explicit dated ruleset, documented scope, conservative validation, official-source ledger, and visible/copyable disclaimer. Unsupported cases produce warnings or require manual tax input; they are not silently approximated as authoritative advice.

## Consequences

Every fiscal change needs dated sources, boundary tests, independently calculated reference values, and qualified review before professional validation is claimed. Deep tax modeling must remain separable from the core one-year screening verdict and may require a superseding ADR.
