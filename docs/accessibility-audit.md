# Accessibility Audit

Audit date: **2026-08-08**  
Target: **WCAG 2.2 AA**  
Status: **In progress — engineering remediation complete; manual NVDA and VoiceOver evidence remains required.**

## Completed checks

| Area | Result | Evidence |
| --- | --- | --- |
| Keyboard dialog flow | Pass in rendered browser check | Both overlays use native modal `dialog`; initial focus moves to **Fermer**, focus remains in the modal, close restores the invoking control, and backdrop handling is wired. Native Escape dismissal remains in the manual matrix below. |
| Background isolation | Pass by platform pattern | `showModal()` supplies modal focus containment and makes the rest of the document inert to interaction/assistive technology while open. |
| Dialog names and descriptions | Pass | Each dialog has `aria-labelledby` and `aria-describedby`; structural regression test included in `just check`. |
| Methodology guide reflow | Pass in rendered browser check | At 1280×720 the guide uses two balanced card columns; at 320×720 it collapses to one column. Long formulas wrap within their cards, the dialog has no horizontal overflow, and closing it restores focus to **Guide**. |
| Form errors | Pass | Invalid controls receive `aria-invalid`, linked visible error text through `aria-describedby`, a correction summary, and focus routing. Save/copy are clearly unavailable for invalid state. |
| Live updates | Pass | The results container is not live. A single atomic `role=status` region announces only the rating, score, and monthly after-tax cash flow after committed changes. |
| 320 px reflow | Pass | Rendered at 320×720: document width 312 px with no page-level horizontal overflow. Wide sensitivity data remains in its own horizontal container. This also exercises the WCAG reflow width used for high zoom. |
| Touch targets | Pass | All visible interactive controls checked at the mobile breakpoint measured at least 44×44 CSS px after remediation. |
| Text contrast | Pass for rendered opaque-color sample | A rendered DOM color audit found no normal text below 4.5:1 and no large text below 3:1 after correcting warning, negative-result, muted-caption, and CTA colors. |
| Reduced motion | Pass by static inspection | The reduced-motion media query disables smooth scrolling and reduces animation/transition duration. |
| Structural smoke | Pass | `tests/project-structure.test.cjs` checks dialog descriptions, live-region shape, schema/form linkage, unique IDs, manifest, app shell, and dated rule sources. |

## Findings remediated

- Replaced custom overlay sections with native modal dialogs and reliable focus restoration.
- Replaced the live results-column cascade with one concise polite status message.
- Added visible field errors with programmatic associations and invalid-action handling.
- Removed a 667 px decorative overflow at the 320 px breakpoint.
- Increased form controls, buttons, brand/footer links, and other interactive targets to at least 44 px.
- Darkened low-contrast warning and muted text; provided safe colors for negative values on dark surfaces and CTA eyebrow text.
- Added explicit focus-visible treatment for links and disclosure summaries.
- Restored the shared visually-hidden utility so status and install-helper text remain available to assistive technology without leaking into the visual layout.
- Reworked the methodology guide hierarchy, card layout, formula wrapping, and responsive close control to remove nested horizontal scrolling and improve scanability.

## Required manual completion matrix

These checks require human perception and real assistive-technology/browser combinations and therefore cannot be certified by DOM automation:

| Platform | Required flow | Blocker / pass condition |
| --- | --- | --- |
| NVDA + current Chrome or Firefox on Windows | Navigate headings/landmarks, complete representative fields, trigger/correct errors, hear a result update, open/dismiss both dialogs with Escape, save/load, and copy a summary | Requires access to Windows with NVDA and a human reviewer; no duplicated/noisy announcements, inaccessible background, or lost focus. |
| VoiceOver + Safari on macOS | Repeat the core simulator, invalid-state, dialog, disclosure, and copy flows using keyboard/VoiceOver commands | Requires a human screen-reader pass; labels, descriptions, reading order, and focus return must be understandable. |
| VoiceOver + Safari on iOS | Complete the core form at mobile width, use select controls and disclosures, inspect errors/results, and open/close dialogs | Requires a touch screen-reader pass; no focus traps, unreachable controls, or obscured content. |
| Keyboard-only browser pass | Tab/Shift+Tab through the full page, activate disclosures, verify Escape/backdrop behavior, and inspect focus visibility at 200% browser zoom | Requires a final human visual pass; focus order and indicator must remain clear. |

When all rows pass, record browser/AT versions, reviewer, date, and any exceptions here, then mark UX-04 completed in the canonical roadmap.

## Assumptions and limitations

- The color audit covers rendered text with an identifiable opaque ancestor background; it does not replace a design review of images, gradients, focus indicators, or every transient state.
- Native `dialog` behavior depends on current evergreen browser implementations; cross-browser fallback behavior remains tracked separately in TR-03.
- The audit did not introduce a browser-test dependency or axe runner. Automated end-to-end and axe coverage remains a medium-priority expansion under TQ-05/TQ-06.
