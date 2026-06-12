# WeatherWise

[![GitHub release](https://img.shields.io/github/v/release/TheWillMiller/weather-wise)](https://github.com/TheWillMiller/weather-wise/releases)
[![Validate](https://img.shields.io/github/actions/workflow/status/TheWillMiller/weather-wise/validate.yml?branch=main&label=validate)](https://github.com/TheWillMiller/weather-wise/actions/workflows/validate.yml)
[![GitHub stars](https://img.shields.io/github/stars/TheWillMiller/weather-wise?label=stars)](https://github.com/TheWillMiller/weather-wise/stargazers)

**Latest beta:** `v0.2.0-beta.1`

WeatherWise is a Home Assistant dashboard (Lovelace) custom card for current weather, hourly and daily forecasts, sunrise and sunset, wind, humidity, and optional radar. It follows the TideWise/RiverWise visual language while staying a dashboard card, not a backend integration.

![WeatherWise dashboard preview](https://raw.githubusercontent.com/TheWillMiller/weather-wise/main/docs/preview.png)

> **Beta notice:** WeatherWise is early beta software. Please expect occasional layout issues, provider-specific quirks, and missing-data fallbacks while testing.

## Region Support

WeatherWise gets weather data from an existing Home Assistant `weather` entity, so it can work anywhere Home Assistant has a weather provider.

| Region | Weather data | Radar |
| --- | --- | --- |
| United States | Any Home Assistant `weather` entity | NOAA radar by default, RainViewer optional |
| Canada | Any Home Assistant `weather` entity | RainViewer global radar by default |
| United Kingdom | Any Home Assistant `weather` entity | RainViewer global radar by default |
| Global / other | Any Home Assistant `weather` entity | RainViewer global radar by default |

WeatherWise does not ask for, store, or call private weather API keys from dashboard YAML.

RainViewer is used only as a no-key global radar option. Its public API is for personal, educational, and small community use and may have service or coverage limits.

## Features

- Custom Lovelace card: `custom:weatherwise-card`
- Legacy alias: `custom:weather-wise-card`
- Home Assistant visual editor
- Existing `weather` entity support
- Hourly forecast strip
- Daily or twice-daily forecast cards
- Fahrenheit and Celsius support
- WeatherWise built-in theme mode
- Home Assistant theme-aware mode with `theme_mode: auto`
- Optional radar panel
- US NOAA radar support
- RainViewer global radar support for Canada, UK, and other regions
- Radar playback controls: pause, previous frame, and next frame
- Radar style, basemap, and loop speed options
- Hidden YAML-only debug panel

## Installation

### Recommended: HACS Custom Repository

[![Open WeatherWise in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=TheWillMiller&repository=weather-wise&category=plugin)

WeatherWise is not yet listed in the default/searchable HACS store. Until it is accepted into the default HACS list, install it as a custom HACS repository.

1. Open **HACS** in Home Assistant.
2. Open the three-dot menu in the top right.
3. Choose **Custom repositories**.
4. Add this repository URL:

```text
https://github.com/TheWillMiller/weather-wise
```

5. For category, choose **Dashboard**.
6. Install **WeatherWise**.
7. Refresh Home Assistant.

A hard browser refresh is recommended after installing or updating:

- Windows/Linux: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

Then add the card from your dashboard editor:

1. Edit your dashboard.
2. Add a new card.
3. Search for **WeatherWise**.
4. Open the visual editor.
5. Choose a weather entity.
6. Choose the region/radar setup.
7. Save.

### Manual Install

1. Download or copy `weatherwise-card.js`.
2. Place it in your Home Assistant `www` directory.
3. Add it as a dashboard resource:

```yaml
url: /local/weatherwise-card.js
type: module
```

4. Refresh Home Assistant and hard-refresh your browser.
5. Add the card to a dashboard.

### Test From GitHub CDN

For quick testing before installing locally, you can add this dashboard resource:

```yaml
url: https://cdn.jsdelivr.net/gh/TheWillMiller/weather-wise@v0.2.0-beta.1/weatherwise-card.js
type: module
```

CDN testing is not the preferred long-term install method. HACS is recommended for normal use.

## Quick Start

```yaml
type: custom:weatherwise-card
entity: weather.home
title: Local Weather
country: us
radar_provider: auto
theme_mode: weatherwise
units: auto
latitude: 33.688
longitude: -78.886
grid_options:
  rows: full
  columns: 18
```

## Canada Example

```yaml
type: custom:weatherwise-card
entity: weather.home
title: Local Weather
country: ca
radar_provider: auto
theme_mode: weatherwise
units: metric
latitude: 43.6532
longitude: -79.3832
grid_options:
  rows: full
  columns: 18
```

## UK Example

```yaml
type: custom:weatherwise-card
entity: weather.home
title: Local Weather
country: uk
radar_provider: auto
theme_mode: auto
units: metric
latitude: 51.5072
longitude: -0.1276
grid_options:
  rows: full
  columns: 18
```

## Theme Support

WeatherWise defaults to its built-in glass styling:

```yaml
theme_mode: weatherwise
```

To make the card follow Home Assistant theme colors more closely, use:

```yaml
theme_mode: auto
```

The visual editor includes a **Theme** dropdown for this setting.

## Visual Editor

WeatherWise includes a Home Assistant visual editor. When adding the card from the dashboard editor, you can:

- Choose a Home Assistant weather entity
- Choose United States, Canada, United Kingdom, or global/other setup
- Choose automatic radar, NOAA radar, RainViewer radar, or no radar
- Choose radar style, map style, and radar loop speed
- Set title, units, hourly row count, and theme mode
- Set radar latitude/longitude and zoom
- Show or hide the radar panel
- Show or hide map controls
- Show or hide radar playback controls

## Configuration

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `type` | Yes |  | Use `custom:weatherwise-card`. The legacy `custom:weather-wise-card` alias also works. |
| `entity` | Yes |  | Home Assistant `weather` entity. |
| `title` | No | `Local Weather` | Card title. |
| `country` | No | `us` | Region hint: `us`, `ca`, `uk`, or `global`. |
| `radar_provider` | No | `auto` | `auto`, `noaa`, `rainviewer`, or `none`. |
| `theme_mode` | No | `weatherwise` | `weatherwise` or `auto`. |
| `units` | No | `auto` | `auto`, `imperial`, or `metric`. |
| `hourly_count` | No | `5` | Number of hourly forecast rows, 1-24. More rows can scroll inside compact cards. |
| `show_radar` | No | `true` | Show or hide the radar panel. |
| `show_map_controls` | No | `true` | Show or hide map zoom controls. |
| `radar_controls` | No | `true` | Show or hide radar playback controls. |
| `radar_style` | No | `standard` | Radar overlay style: `standard`, `vivid`, or `soft`. |
| `radar_basemap` | No | `light` | Map style: `light`, `dark`, or `osm`. |
| `radar_speed` | No | `700` | Radar loop speed in milliseconds, 300-3000. |
| `radar_zoom` | No | `7` | Initial radar zoom. |
| `latitude` | No | Home Assistant latitude | Radar center latitude. |
| `longitude` | No | Home Assistant longitude | Radar center longitude. |
| `debug` | No | disabled | Hidden troubleshooting object. Use `debug: { enabled: true, panel: true }` only when diagnosing data issues. |

## Hidden Debug Panel

For troubleshooting, WeatherWise includes a YAML-only debug panel. It is hidden from normal users and is not exposed in the visual editor.

```yaml
debug:
  enabled: true
  panel: true
```

Remove it after testing.

## Troubleshooting

### WeatherWise does not show in the card picker

1. Confirm WeatherWise is installed in HACS.
2. Hard-refresh the browser.
3. Restart Home Assistant if needed.
4. Check that the dashboard resource exists.
5. Open the browser console and look for WeatherWise errors.

### Forecast data unavailable

1. Verify the selected weather entity exists.
2. Confirm the entity supports Home Assistant forecast data.
3. Try another `weather` entity.
4. Check the browser console for forecast service errors.

### Radar unavailable

1. Check the selected radar provider.
2. Use `radar_provider: noaa` only for US radar.
3. Use `radar_provider: rainviewer` for Canada, UK, and global setups.
4. Confirm the dashboard browser can reach external map/radar tile services.

## Privacy

WeatherWise does not include telemetry, tracking pixels, external analytics, or phone-home behavior.

When radar is enabled, the browser viewing the dashboard loads map/radar tiles from the selected provider. The card does not send weather entity data to a WeatherWise server.

## Safety

WeatherWise is informational. It is not a life-safety, severe-weather warning, aviation, boating, or emergency tool.

Always check official local forecasts, warnings, alerts, and emergency information for safety-critical decisions.

## License

MIT License.

## Development

The distributable card is:

```text
weatherwise-card.js
```

Run the local syntax check before opening a pull request:

```bash
npm run check
```

For HACS default repository submission, WeatherWise is a dashboard/custom card. HACS validation/submission uses the `plugin` category internally for dashboard plugins.
