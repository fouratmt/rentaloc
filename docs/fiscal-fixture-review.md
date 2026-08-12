# Fiscal fixture approval

Production release is blocked until a qualified French tax or accounting professional independently approves the fiscal reference scenarios in `tests/fixtures/reference-scenarios.json`.

## Required reviewer work

The reviewer must calculate expected results independently of `src/domain.js`, using a dated workbook or written calculation. At minimum, the evidence must cover:

- LMNP réel, including deductible expenses, interest, borrower insurance, and capped depreciation;
- long-term and classified-tourism Micro-BIC thresholds and abatements;
- unclassified-tourism Micro-BIC at, below, and above the €15,000 threshold;
- micro-foncier and simplified régime réel foncier;
- 2024/2025 consecutive-threshold behavior for 2026 eligibility;
- furnished/non-professional and unfurnished social-contribution rates;
- rounding and acceptable numeric tolerances.

The evidence must not be produced by copying application output. Store the workbook or signed review in an access-controlled release record and put a durable issue, document, or checksum reference in `evidence`; do not commit a reviewer's personal contact information.

## Recording approval

After discrepancies are resolved, update `professionalApproval`:

```json
{
  "status": "approved",
  "reviewerName": "Reviewer or firm name",
  "reviewerRole": "French chartered accountant / qualified tax reviewer",
  "reviewedOn": "YYYY-MM-DD",
  "evidence": "Durable review-record reference",
  "notes": "Scope, exceptions, and tolerance notes"
}
```

Run `npm run check:fiscal-approval`. This validates that approval metadata exists; it does not replace review of the underlying evidence.

Any change to fiscal rules, tax formulas, eligibility, fixture expectations, or the dated ruleset resets the status to `pending` until reapproval.
