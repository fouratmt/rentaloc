# ADR 0001: Client-only architecture and local persistence

- Status: Accepted
- Date: 2026-08-10

## Context

RentaLoc handles sensitive financial assumptions but does not require accounts, collaboration, or cross-device synchronization for its current screening use case.

## Decision

Keep calculation, validation, saved projects, and recovery data in the browser. Serve immutable static assets and use bounded, versioned `localStorage` persistence. Do not transmit simulation values or add a backend implicitly.

## Consequences

The app remains inexpensive, offline-capable, and privacy-preserving, but storage is device/profile-specific and can be cleared by the browser. Portability must use explicit user-controlled export/import. Accounts, sync, or collaboration require a superseding ADR with authentication, retention, deletion, threat-model, and operating-cost decisions.
