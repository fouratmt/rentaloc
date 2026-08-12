# RentaLoc threat model

Last reviewed: **2026-08-10**

## Scope and assets

RentaLoc is a client-only static PWA. Assets to protect are simulation values, project names, saved/recovery data, calculation integrity, copied/exported reports, and the integrity/availability of the offline shell. The app has no account, backend, analytics, or external runtime data source.

## Trust boundaries

| Boundary                       | Untrusted input                                        | Required controls                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Form → schema/domain           | DOM values and manipulated selects                     | Normalize known fields, validate finite/ranged numbers and enums, reject incompatible combinations before save/copy.                                                           |
| `localStorage` → app           | JSON, envelope metadata, project IDs/names/values      | Parse defensively, bound lengths/counts, validate schema, preserve rejected raw data, render text with escaping or `textContent`.                                              |
| Import/export/share            | User-selected files and operating-system share targets | Treat imports as hostile, validate the same versioned envelope/schema, cap size/count, require explicit user action, never embed raw values into executable markup or URLs.    |
| DOM rendering                  | Project names, IDs, warnings, generated labels         | Prefer `textContent`; where templates are used, escape every dynamic attribute/text value. Never use imported HTML.                                                            |
| Clipboard/Web Share            | Generated financial summary                            | Include only the explicit report, require a user gesture, show success/failure, and warn that the receiving app leaves RentaLoc’s local boundary.                              |
| Service worker/cache           | Network responses and cached app shell                 | Restrict handling to same-origin scope, cache only successful non-opaque responses, use versioned caches, clean old owned caches, and provide deterministic offline fallbacks. |
| Future external data/analytics | Third-party responses and outbound events              | Apply ADR 0004/0005; no simulation values in telemetry, validate/source/date data, handle stale/unavailable responses, and review CSP/connect destinations.                    |

## Principal threats and mitigations

- **Stored/reflected script injection:** malicious project names or IDs could enter template strings. Storage bounds strings and the project renderer escapes both values. New dynamic UI should use `textContent` by default. Tests assert malicious values stay inert and escaping remains in the render path.
- **Prototype/property injection:** imported or persisted objects may contain extra keys. Normalization reconstructs a new object from the schema’s known keys and fixed project properties.
- **Resource exhaustion:** oversized project arrays, names, IDs, numeric values, or files could freeze the page or exceed quota. Storage caps projects and field sizes; import rejects files over 1 MiB before parsing and revalidates the complete versioned envelope before any write.
- **Calculation manipulation:** DOM constraints can be bypassed. Runtime schema/domain validation, finite/range checks, enum checks, and calculation-issue gates protect save/copy and interpretation.
- **Sensitive-data disclosure:** URL state, analytics, console/error payloads, or automatic sharing could expose assumptions. None are enabled; export/share must be explicit and diagnostics must use technical categories only.
- **Cache poisoning/stale code:** a compromised same-origin response or partial update could mix versions. Same-origin scope checks, successful-response checks, cache versioning, controlled updates, and deployment headers reduce the risk; service-worker integration tests remain required by TR-02.
- **Data loss:** browser clearing, corruption, quota, destructive actions, or update refresh can discard work. Versioned recovery, explicit export/import, confirmation before replacement/bulk deletion, transactional writes, and dirty-state guards reduce this risk.

## Review triggers

Review this model whenever import/share, URL state, remote monitoring, a backend, external market data, new dynamic HTML, persistence migrations, or service-worker strategy changes. Security findings must update tests and the applicable ADR or roadmap row.
