# Fiscal and Regulatory Source Ledger

This ledger records the time-sensitive values used by RentaLoc. It is an engineering control, not tax or legal advice.

## Active ruleset

| Property               | Value                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruleset                | `2026.1`                                                                                                                                    |
| Income/simulation year | 2026                                                                                                                                        |
| Supported jurisdiction | France métropolitaine                                                                                                                       |
| Last source check      | 2026-08-07                                                                                                                                  |
| Mandatory review by    | 2027-01-31, and before every public release                                                                                                 |
| Responsible role       | RentaLoc maintainer                                                                                                                         |
| Professional approval  | Pending — a qualified French tax professional must approve reference fixtures before the estimate is described as professionally validated. |

Executable values and source metadata live in `src/rules.js`. CI must fail after the mandatory review date until the ruleset is reviewed.

## Official sources

| ID                          | Subject used by RentaLoc                                                                                        | Official source                                                                                                                                                                     | Official page date        | Checked    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------- |
| `micro-fiscal-2026`         | €83,600 long-term/classified and €15,000 unclassified-tourist thresholds; two-prior-year and new-activity rules | [Service Public Entreprendre — Régime fiscal de la micro-entreprise](https://entreprendre.service-public.gouv.fr/vosdroits/F23267)                                                  | Verified 2026-05-13       | 2026-08-07 |
| `furnished-income-2026`     | Furnished-rental regimes and 50%/30% abatements                                                                 | [Service Public — Revenus d'une location meublée](https://www.service-public.gouv.fr/particuliers/vosdroits/F32744)                                                                 | Verified 2026-04-15       | 2026-08-07 |
| `social-contributions-2026` | 18.6% furnished-rental social contributions where professional contributions do not apply                       | [impots.gouv.fr — Prélèvements sociaux d'un bien en location](https://www.impots.gouv.fr/particulier/questions/je-donne-un-bien-en-location-dois-je-payer-des-prelevements-sociaux) | No stable page date shown | 2026-08-07 |
| `furnished-cfe-2026`        | Registration and CFE exemptions, including the minimum-base exemption at receipts up to €5,000                  | [impots.gouv.fr — Les locations meublées](https://www.impots.gouv.fr/particulier/les-locations-meublees)                                                                            | Modified 2026-04-08       | 2026-08-07 |
| `dpe-rental-rules`          | Metropolitan long-term-rental restrictions for G (2025), F (2028), and E (2034)                                 | [Service Public — Diagnostic de performance énergétique](https://www.service-public.gouv.fr/particuliers/vosdroits/F16096)                                                          | No stable page date shown | 2026-08-07 |

## Deliberate scope limits

- The fiscal engine is a conservative, simplified first-pass estimate. It does not reproduce progressive income tax or prepare a return.
- DPE score caps model a metropolitan long-term residential lease. Tourist rentals, overseas territories, local authorization/registration, rent controls, and exceptions require separate verification.
- Professional social contributions, LMP, mixed activities, entities, non-residents, and unusual household situations must use the manual path after professional advice.
- Micro-BIC eligibility depends on prior-year receipts and activity age. The simulator must collect those facts instead of using only the current projection.

## Review procedure

1. Check every linked official page and its legal references.
2. Record changed effective dates, thresholds, abatements, exclusions, and transition rules.
3. Update `src/rules.js`, this ledger, UI scope text, and reference fixtures together.
4. Have a qualified reviewer approve the golden fiscal fixtures.
5. Run the full test suite and record the review in the roadmap/release notes.
