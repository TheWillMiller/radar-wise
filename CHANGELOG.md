# Changelog

## 0.5.0

### Added

- Added dew point support as a fifth detail tile beside humidity, wind, sunrise, and sunset.
- Added automatic dew point detection from common weather entity attributes.
- Added optional `dew_point_entity` support and a visual editor picker for dedicated dew point sensors.

### Changed

- Renamed the project, card picker entry, HACS metadata, install filename, docs, and examples to RadarWise.
- Changed the primary card type to `custom:radarwise-card` and the install file to `radarwise-card.js`.
- Kept the previous custom card element names registered as hidden runtime aliases so existing dashboards keep rendering during the rename transition.
- Updated README, HACS submission notes, and tester templates for the `v0.5.0` release.

## 0.4.1

### Changed

- Updated release-facing documentation for the expanded visual editor, layout controls, and radar alert behavior.
- Added current README screenshots for weather source/radar setup, display/layout controls, radar location controls, and radar alert popups.
- Aligned the card runtime version and package version with the `v0.4.1` release.

## 0.4.0

### Added

- Added visual layout tiles for `auto`, `wide_panel`, `stacked`, `radar_bottom`, and `compact`.
- Added drag-and-drop panel ordering for clock/timeline, current weather, and radar panels.
- Added panel width controls and a reset button for custom dashboard proportions.
- Added `stack_below` so users can force vertical layout below a chosen card width.
- Added optional `timeline_autoscroll` for long hourly/forecast lists.
- Added the `radar_bottom` layout for wide radar below weather content.

### Changed

- Expanded the visual editor display section to expose more layout and forecast controls without YAML.
- Improved wide and Sections-dashboard tuning for users who want the card to fit landscape tablets and wall panels.

## 0.3.7

### Added

- Added card language support for Auto, English, French, Spanish, German, and Portuguese.
- Added a visual editor language selector.
- Localized the main card labels, date/day labels, radar controls, alert labels, condition text, and forecast summary.

### Changed

- Reworked the forecast summary from playful/comical wording to a calmer conversational weather forecast style.

## 0.3.6

### Added

- Added an optional playful forecast summary ticker under the date.
- Added a visual editor toggle and YAML option: `show_forecast_summary`.
- The summary is generated from existing Home Assistant forecast data, including high/low, condition, and precipitation probability when available.

### Changed

- Forecast summary motion pauses on hover and respects reduced-motion settings.

## 0.3.5

### Fixed

- Fixed NWS alert details not opening reliably when tapping the red radar marker.
- Made the on-map NWS alert chip clickable and keyboard-accessible so it opens the alert details directly.
- Added a larger invisible touch target around the red alert marker for wall panels and mobile browsers.
- Added minimal Leaflet popup styling so alert details render clearly without depending on external popup CSS.
- Added the required Weather.gov User-Agent header to NWS alert requests.

## 0.3.4

### Changed

- Added an on-map alert chip when US NWS alerts are active so the red radar marker is clearly identified.
- Updated the radar footer to show active alert counts with a cleaner separator.
- Documented that the red radar dot represents an active NWS alert marker and the dark dot represents the radar center.

## 0.3.3

### Added

- Added an optional current temperature entity override for users whose local sensor is more accurate than the selected weather provider.
- Added precipitation probability and amount display to forecast-list rows and daily/twice-daily forecast cards when the provider exposes those fields.
- Documented that the blue forecast-list bars show relative temperature across the visible rows.

### Fixed

- Filtered the new temperature selector to temperature-like entities instead of unrelated sensors.
- Improved stat tile wrapping so humidity, wind, sunrise, and sunset text stays inside its background box on narrow portrait tablets.

## 0.3.2

### Added

- Added Environment Canada radar provider using the public MSC GeoMet `RADAR_1KM_RRAI` WMS layer.
- Canada now auto-selects Environment Canada radar instead of RainViewer.
- RainViewer remains available as an optional global radar provider.

### Fixed

- Twice-daily-only weather providers continue to use the forecast fallback list added in `0.3.1`.

## 0.3.1

### Added

- Added visual editor controls for forecast card count.
- Added visual editor toggles to show or hide the hourly/forecast list and daily forecast cards.

### Fixed

- Made `wide_panel` visibly honor the selected layout inside narrow Home Assistant editor previews.
- Connected `forecast_count` to rendered daily/twice-daily forecast cards.

## 0.3.0

### Changed

- Promoted RadarWise from beta-tagged releases to a clean public release version.
- Updated documentation, install examples, issue templates, and HACS notes to use `v0.3.0`.
- Replaced active beta wording with public-release support language.

### Notes

- Existing `v0.2.0-beta.*` releases remain in the changelog for history.
- RadarWise still welcomes provider and region reports, especially for non-US radar and forecast behavior.

## 0.2.0-beta.11

### Changed

- `wide_panel` layout now forces a denser horizontal layout for wider dashboard cards.
- Stacked and narrow layouts now place clock/date first, current weather and daily forecast second, and the forecast list below.
- Auto layout now waits until a narrower container before switching out of the horizontal dashboard layout.

### Fixed

- Added twice-daily and daily fallback content for providers that do not expose hourly forecasts.
- Added radar resize observation so the map can recover after Home Assistant edit/save layout changes without requiring a manual refresh.

## 0.2.0-beta.10

### Added

- Added a `layout` option with `auto`, `wide_panel`, `stacked`, and `compact` modes.
- Added the layout selector to the visual editor.

### Fixed

- Improved Home Assistant Sections dashboard behavior by increasing default grid height and adding safer stacked/compact layouts.
- Fixed radar initialization when multiple RadarWise cards or editor previews load Leaflet at the same time.
- Added more radar size retries after dashboard save/reload so the map is less likely to stay blank.
- Allowed hourly rows to stretch to fill available height when only a few rows are shown.
- Reduced current-temperature clipping risk in short landscape cards.

## 0.2.0-beta.9

### Fixed

- Fixed Home Assistant visual editor dropdowns closing immediately in Chrome by avoiding unnecessary editor re-renders while entity data is unchanged.

## 0.2.0-beta.8

### Added

- Added subtle built-in weather icon animations for sun, moon, clouds, rain, snow, fog, and thunder conditions.
- Added a visual editor toggle and YAML option to disable animations with `show_animations: false`.

### Changed

- Forecast and hourly items now ease into place for a more polished wall-panel feel.
- Animations respect browser/device reduced-motion preferences automatically.

## 0.2.0-beta.7

### Changed

- Increased wide-panel card height slightly to prioritize wall-panel readability.
- Significantly increased clock/date, current condition, forecast, hourly, and stat typography.
- Enlarged forecast icons, forecast temperatures, and stat tiles for easier reading from across the room.

## 0.2.0-beta.6

### Fixed

- Replaced dashboard-level configuration errors with an in-card setup state when no weather entity is selected.
- Improved wall-panel readability by increasing date, forecast, hourly, and stat text sizes.
- Enlarged forecast cards and stat rows to use vertical space more effectively in the wide-panel layout.

## 0.2.0-beta.5

### Fixed

- Filtered the humidity entity picker so battery, ink, vacuum brush lifespan, and other generic percent sensors are no longer offered as humidity choices.
- Ignored already-configured humidity fallback entities unless they actually look like humidity sensors.
- Normalized stale current `*-night` weather states to daytime display conditions when `sun.sun` is above the horizon.

## 0.2.0-beta.4

### Changed

- Removed the visible left-column title/region header from the rendered card for a cleaner wide-panel look.

### Fixed

- Fixed `clear-night` and night partly-cloudy conditions rendering with daytime sun icons.

## 0.2.0-beta.3

### Fixed

- Added explicit 15-minute forecast refresh so hourly and daily forecast data updates even if the Home Assistant state object does not change often.
- Recreated and cleaned up card timers correctly across dashboard add/remove cycles.
- Added repository checkout to the HACS validation workflow.
- Added GeoJSON accept headers for NWS alert requests while keeping the card frontend-only.
- Escaped Home Assistant entity names and editor values before rendering visual editor HTML.

### Changed

- Documented the dashed `custom:radar-wise-card` registration as an intentional YAML-only legacy alias.

## 0.2.0-beta.2

### Added

- Added optional `humidity_entity` support for weather entities that do not expose humidity.
- Added a visual editor humidity entity picker.
- Added radar timeline modes: recent loop, current frame, and future if the provider exposes future frames.
- Added US NWS active warning overlay support.
- Added a visual editor toggle for the warning overlay.

### Changed

- NOAA future radar now falls back to the current radar frame because the NOAA radar image service used by RadarWise is observed/current radar.

## 0.2.0-beta.1

### Added

- Added radar playback controls for pause/play, previous frame, and next frame.
- Added radar style options: standard, high contrast, and soft.
- Added basemap options: light, dark, and OpenStreetMap street map.
- Added radar loop speed configuration.
- Added visual editor controls for the new radar options.

### Fixed

- Fixed hourly rows being clipped in the compact public-beta layout.
- Changed the default hourly row count from 8 to 5 so the default card fits cleanly.
- Made larger hourly row counts scroll within the left rail instead of cropping text.

## 0.1.0-beta.4

### Fixed

- Fixed Leaflet radar rendering inside the RadarWise shadow DOM by embedding the required Leaflet layout styles in the card.
- Restored wide-card proportions to more closely match the original RadarWise HTML dashboard.
- Kept radar as a true right-side panel on wide dashboards instead of switching too early to a bottom row.
- Tuned daily forecast, center, and left-column spacing to better match the original RadarWise card.

## 0.1.0-beta.3

### Fixed

- Fixed auto-height dashboards growing the RadarWise card far beyond the intended height.
- Added explicit grid sizing defaults for Home Assistant section dashboards.
- Reworked card height so the desktop/tablet layout is bounded while narrow/mobile cards can still stack naturally.
- Removed large Leaflet map minimum heights that could inflate dashboard layout.
- Delayed radar initialization until the map container has a real rendered size.
- Added additional Leaflet size invalidation passes so radar tiles stay visible after Home Assistant layout changes.

## 0.1.0-beta.2

### Fixed

- Fixed the visual editor/card picker script failure caused by registering the same custom element class under two tag names.
- Added a clearer card picker name: **RadarWise Weather**.
- Improved dashboard-column layout by using card/container width breakpoints instead of only viewport width.
- Fixed narrow card overflow when radar is hidden or the card is placed in a smaller dashboard column.

## 0.1.0-beta.1

### Added

- Added the first RadarWise beta custom card.
- Added Home Assistant visual editor support.
- Added RadarWise and Home Assistant theme modes.
- Added US, Canada, UK, and global region choices.
- Added US NOAA radar support.
- Added RainViewer global radar support for Canada, UK, and other non-US dashboards.
- Added automatic unit handling for Fahrenheit and Celsius weather entities.
- Added hidden YAML-only debug panel.
- Added HACS validation and frontend syntax-check workflows.

### Changed

- RadarWise is a dashboard/custom card, not a custom integration.
- Weather data comes from existing Home Assistant `weather` entities.
- API keys are not stored in dashboard YAML.

### Known Issues

- RadarWise provider behavior may vary by region and Home Assistant weather integration.
- Canada and UK weather support depends on the user's Home Assistant weather entity.
- RainViewer is a no-key global radar option for personal/community use and may have service/coverage limits.
