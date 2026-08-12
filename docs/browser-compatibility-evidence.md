# Browser compatibility evidence

Automated matrix: Chromium desktop, Playwright WebKit desktop, and Playwright WebKit with an iPhone 13 profile.

The matrix exercises calculation, validation, local persistence across reload, comparison, strict JSON export/import,
bulk deletion, responsive flow, native dialog dismissal/focus restoration, clipboard success/failure messaging, and
install guidance. Service-worker lifecycle/offline automation remains Chromium-only because Playwright's deterministic
worker controls are not a substitute for real Safari/iOS behavior.

## Required real-device completion

| Platform              | Version | Date | Reviewer | Storage/reload | Dialogs | Clipboard | Install | Offline reopen | Result / notes      |
| --------------------- | ------- | ---- | -------- | -------------- | ------- | --------- | ------- | -------------- | ------------------- |
| Safari on macOS       | Pending | —    | —        | —              | —       | —         | —       | —              | Human pass required |
| Safari on current iOS | Pending | —    | —        | —              | —       | —         | —       | —              | Human pass required |

For each row, use a fresh profile, save and reload a uniquely named simulation, dismiss both dialogs with platform-native
controls, copy a summary, install/add to the home screen, enter airplane mode, reopen both landing and simulator, then
restore connectivity. Record only versions and outcomes; never commit simulation values or exported files.
