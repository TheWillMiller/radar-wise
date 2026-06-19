# RadarWise

Weather dashboard custom card for Home Assistant.

RadarWise shows current weather, hourly and daily forecasts, sunrise and sunset, wind, humidity, dew point, UV index, optional AQI/pollen tiles, and optional radar using existing Home Assistant entities.

It supports United States, Canada, Australia, United Kingdom, and global/other dashboard setups. US cards use NOAA radar by default. Canada uses Environment Canada radar by default. Australia uses native Bureau of Meteorology radar/map tiles by default. UK and global cards use RainViewer global radar by default.

If you are testing from New Zealand, Europe, or another region, please report which Home Assistant weather provider you use, whether hourly/daily forecasts appear, whether RainViewer radar loads, and any local radar or warning source RadarWise should support.

RadarWise is a public release. Weather provider behavior varies by region, so please report provider-specific layout, radar, or forecast quirks.

AQI, UV index, and pollen can use Home Assistant sensors/helpers or RadarWise's optional Open-Meteo source. Open-Meteo mode does not require an API key and uses the configured latitude/longitude.

## Support

RadarWise has no telemetry, ads, popups, tracking pixels, or in-card donation prompts.

If RadarWise helps your dashboard, you can support development here:

https://buymeacoffee.com/thewillmiller
