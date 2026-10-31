# Forecast and display update — validation

This validation record covers the changes prepared for v0.8.24, based on main `623c618` / release v0.8.23.

## Scope

| Issue | Implemented in this branch | Remaining verification or work |
| --- | --- | --- |
| #39 | Optional hourly and daily/twice-daily weather entities; per-source capabilities and unit conversion; immediate reload and stale-response protection; no hourly/daily cross-substitution | Real BOM installation verification |
| #33 | Independent rainfall unit selector and numerical conversion; automatic rain units follow explicit metric/imperial settings | Provider-specific confirmation welcome |
| #34 | Native drag payload, WebKit selection suppression, accessible up/down buttons and focus preservation | Actual macOS Companion app verification; Windows WebKit is not the app |
| #35 | Font scale 0.7–1.5 in YAML/editor; default 1; responsive typography scales without zooming the map | Check the reporter's preferred dashboard width/density |
| #36 | Optional date columns with daytime above nighttime, local-date grouping, empty missing-period slots, and scrolling | Independent ordering of current conditions, summary, hourly list and daily cards is not implemented |

## Existing pull requests

- #37 by MYanello was reused through an attributed cherry-pick of `6849452c35373c596cfed6cf3acfc6383b866e31`. It prevents null/blank values from becoming zero and preserves an available high or low. The GitHub PR itself was not merged or closed.
- #32 (Swedish localization) remains separate. Both changes touch CSS in the generated asset; rebuild the bundle when integrating them.
- #38 (remaining-hourly average as daily primary temperature) remains separate because it changes the meaning of that value. It touches the forecast slot now extracted to `_renderForecastSlot`; integration needs review, especially for day/night forecasts.

## Completed locally

- `npm run build:check`: generated bundle matches the committed source/build output.
- `npm test`: existing behavior regressions, #37 regressions, and new issue regressions pass.
- `npm run check`: source, distributable, and compatibility-loader syntax passes. The repository has no separate lint script.
- `git diff --check`: no whitespace errors.
- `npm audit --audit-level=high`: zero vulnerabilities across the six audited packages.
- `npm run test:browser` with installed Chrome and Playwright WebKit on Windows: both pass.
- Browser checks cover separate-source rendering and conversion, absent forecast types, source switching, paired geometry and scrolling, font scaling, mouse click and Enter reordering, native drag/drop, and editor field persistence.
- Twelve width/scale combinations per browser: widths 240, 360, 720, 1200; scales 0.7, 1, 1.5. Pair alignment and horizontal scroll access checked. This is not a claim that all text at maximum scale fits every narrow layout without truncation.
- Chromium and WebKit fixture screenshots were visually inspected. No uncaught page errors were reported.

## Not tested or performed during pre-release validation

- No live Home Assistant, BOM account, or macOS Companion session was used.
- Existing radar regression assertions passed, but live NOAA/BOM/OSM network imagery was not retested for this display/forecast update.
- No deployment, merge, release, issue closure, or Home Assistant configuration change.

The reproducible fixture is `tests/issue-browser.html`; `npm run test:browser` writes screenshots and a JSON result matrix to ignored `test-results/`. See README development instructions for browser installation.

Home Assistant weather capability and unit reference: https://contributors.home-assistant.io/core/entities/weather/
