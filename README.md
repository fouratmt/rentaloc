# RentaLoc

RentaLoc is a static installable PWA for quickly assessing the profitability of a rental property project in France.

## Features

- Simulates acquisition costs, rent, expenses, financing, taxes, and risk factors.
- Automatically calculates cash flow, yields, break-even rent, and the overall score.
- Saves multiple simulations locally in the browser.
- Includes an in-app guide for formulas and calculation assumptions.
- Works offline after the first load through the service worker.

## Product Notes

- The public app name is `RentaLoc`.
- PWA metadata lives in `site.webmanifest`.
- Saved simulations use the `rentaloc-projects-v1` local storage key.
- Calculation data stays client-side.

## Structure

- `index.html`: application structure.
- `src/app.js`: calculation logic, local persistence, and interactions.
- `src/styles.css`: responsive layout.
- `site.webmanifest`: PWA installation metadata.
- `sw.js`: offline app cache.
- `assets/icons/`: installation icons.

## Local Checks

The project has no build step.

```sh
just check
just serve
```

Then open `http://localhost:8000`.
