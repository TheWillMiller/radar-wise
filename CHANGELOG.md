# Changelog

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
- Fixed radar initialization when multiple WeatherWise cards or editor previews load Leaflet at the same time.
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

- Documented the dashed `custom:weather-wise-card` registration as an intentional YAML-only legacy alias.

## 0.2.0-beta.2

### Added

- Added optional `humidity_entity` support for weather entities that do not expose humidity.
- Added a visual editor humidity entity picker.
- Added radar timeline modes: recent loop, current frame, and future if the provider exposes future frames.
- Added US NWS active warning overlay support.
- Added a visual editor toggle for the warning overlay.

### Changed

- NOAA future radar now falls back to the current radar frame because the NOAA radar image service used by WeatherWise is observed/current radar.

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

- Fixed Leaflet radar rendering inside the WeatherWise shadow DOM by embedding the required Leaflet layout styles in the card.
- Restored wide-card proportions to more closely match the original WeatherWise HTML dashboard.
- Kept radar as a true right-side panel on wide dashboards instead of switching too early to a bottom row.
- Tuned daily forecast, center, and left-column spacing to better match the original WeatherWise card.

## 0.1.0-beta.3

### Fixed

- Fixed auto-height dashboards growing the WeatherWise card far beyond the intended height.
- Added explicit grid sizing defaults for Home Assistant section dashboards.
- Reworked card height so the desktop/tablet layout is bounded while narrow/mobile cards can still stack naturally.
- Removed large Leaflet map minimum heights that could inflate dashboard layout.
- Delayed radar initialization until the map container has a real rendered size.
- Added additional Leaflet size invalidation passes so radar tiles stay visible after Home Assistant layout changes.

## 0.1.0-beta.2

### Fixed

- Fixed the visual editor/card picker script failure caused by registering the same custom element class under two tag names.
- Added a clearer card picker name: **WeatherWise Weather**.
- Improved dashboard-column layout by using card/container width breakpoints instead of only viewport width.
- Fixed narrow card overflow when radar is hidden or the card is placed in a smaller dashboard column.

## 0.1.0-beta.1

### Added

- Added the first WeatherWise beta custom card.
- Added Home Assistant visual editor support.
- Added WeatherWise and Home Assistant theme modes.
- Added US, Canada, UK, and global region choices.
- Added US NOAA radar support.
- Added RainViewer global radar support for Canada, UK, and other non-US dashboards.
- Added automatic unit handling for Fahrenheit and Celsius weather entities.
- Added hidden YAML-only debug panel.
- Added HACS validation and frontend syntax-check workflows.

### Changed

- WeatherWise is a dashboard/custom card, not a custom integration.
- Weather data comes from existing Home Assistant `weather` entities.
- API keys are not stored in dashboard YAML.

### Known Issues

- WeatherWise is early beta software.
- Canada and UK weather support depends on the user's Home Assistant weather entity.
- RainViewer is a no-key global radar option for personal/community use and may have service/coverage limits.
