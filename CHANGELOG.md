# Changelog

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
