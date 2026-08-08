global.window = {
  customCards: [],
  setInterval: () => 1,
  clearInterval: () => {}
};

const registry = new Map();

global.customElements = {
  get: (name) => registry.get(name),
  define: (name, cls) => registry.set(name, cls)
};

global.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => []
    };
    return this.shadowRoot;
  }

  setAttribute() {}
  toggleAttribute() {}
  dispatchEvent(event) {
    this.lastEvent = event;
    return true;
  }
};

global.CustomEvent = class {
  constructor(type, options = {}) {
    this.type = type;
    Object.assign(this, options);
  }
};

await import(`file:///${process.cwd().replace(/\\/g, "/")}/radarwise-card.js`);

const RadarWiseCard = registry.get("radarwise-card");
const RadarWiseCardEditor = registry.get("radarwise-card-editor");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

{
  const editor = new RadarWiseCardEditor();
  editor._config = RadarWiseCard.getStubConfig();
  editor._setValue("show_wind", false);

  assert(editor._config.show_wind === false, "editor should store a disabled detail tile");
  assert(editor._config.content_mode === "custom", "detail visibility changes should select custom content mode");
  assert(editor.lastEvent?.detail?.config?.show_wind === false, "editor should dispatch the updated detail visibility");

  editor._setValue("content_mode", "full");
  for (const key of ["show_humidity", "show_dew_point", "show_wind", "show_sunrise", "show_sunset"]) {
    assert(editor._config[key] === true, `full content mode should restore ${key}`);
  }

  editor._setValue("forecast_mode", "daily");
  assert(editor._config.forecast_mode === "daily", "editor should store the forecast-card preference");
  editor._setValue("time_zone_mode", "custom");
  editor._setValue("time_zone", "America/Toronto");
  assert(editor._config.time_zone_mode === "custom", "editor should store the time zone source");
  assert(editor._config.time_zone === "America/Toronto", "editor should store the custom IANA time zone");
  assert(editor.shadowRoot.innerHTML.includes('id="forecast_mode"'), "visual editor should render the forecast mode selector");
  assert(editor.shadowRoot.innerHTML.includes('id="time_zone_mode"'), "visual editor should render the time zone source selector");
  assert(editor.shadowRoot.innerHTML.includes('id="time_zone"'), "visual editor should render the custom time zone input");
  assert(editor.shadowRoot.innerHTML.includes('id="show_humidity"'), "visual editor should render the built-in detail switches");
}

function createCard(config = {}) {
  const card = new RadarWiseCard();
  card._config = card._normalizeConfig(config);
  return card;
}

{
  const stub = RadarWiseCard.getStubConfig();
  assert(!Object.hasOwn(stub, "latitude"), "new-card config should not override the Home Assistant latitude");
  assert(!Object.hasOwn(stub, "longitude"), "new-card config should not override the Home Assistant longitude");

  const homeLocationCard = createCard();
  homeLocationCard._hass = { config: { latitude: 40.7128, longitude: -74.006 } };
  const homeLocation = homeLocationCard._latLon();
  assert(homeLocation.lat === 40.7128, "radar should default to the Home Assistant latitude");
  assert(homeLocation.lon === -74.006, "radar should default to the Home Assistant longitude");

  const overrideCard = createCard({ latitude: 34.0522, longitude: -118.2437 });
  overrideCard._hass = { config: { latitude: 40.7128, longitude: -74.006 } };
  const overrideLocation = overrideCard._latLon();
  assert(overrideLocation.lat === 34.0522, "an explicit radar latitude should override the Home Assistant latitude");
  assert(overrideLocation.lon === -118.2437, "an explicit radar longitude should override the Home Assistant longitude");
}

{
  const card = createCard();
  assert(card._config.forecast_mode === "auto", "forecast mode should default to auto");
  assert(card._config.time_zone_mode === "browser", "time zone mode should default to browser for backward compatibility");
  assert(card._config.time_zone === "", "custom time zone should default to blank");
  for (const key of ["show_humidity", "show_dew_point", "show_wind", "show_sunrise", "show_sunset"]) {
    assert(card._config[key] === true, `${key} should default to visible`);
  }
}

{
  const beforeDstJump = new Date("2026-03-08T06:30:00Z");
  const afterDstJump = new Date("2026-03-08T07:30:00Z");
  const card = createCard({
    time_format: "24",
    time_zone_mode: "custom",
    time_zone: "America/New_York"
  });

  assert(card._clockTime(beforeDstJump) === "01:30", "custom time zone should format the pre-DST clock time");
  assert(card._clockTime(afterDstJump) === "03:30", "custom time zone should honor the DST jump");
  assert(card._shortTime(afterDstJump) === "03:30", "custom time zone should apply to compact timestamps");
  assert(card._hour(afterDstJump) === "03:00", "custom time zone should apply to hourly forecast labels");
}

{
  const card = createCard({
    time_format: "12",
    time_zone_mode: "custom",
    time_zone: "America/Los_Angeles"
  });
  const utcSaturday = new Date("2026-08-01T02:30:00Z");

  assert(card._clockTime(utcSaturday) === "7:30", "custom time zone should apply to the main clock");
  assert(card._clockAmPm(utcSaturday) === "PM", "custom time zone should apply to AM/PM");
  assert(card._dayName(utcSaturday) === "Fri", "custom time zone should preserve the local day across UTC midnight");
  assert(card._longDate(utcSaturday).includes("July 31, 2026"), "custom time zone should preserve the local calendar date across UTC midnight");
}

{
  const card = createCard({ time_format: "24", time_zone_mode: "home_assistant" });
  card._hass = { config: { time_zone: "Europe/London" }, locale: {} };

  assert(card._clockTime(new Date("2026-07-31T12:00:00Z")) === "13:00", "Home Assistant mode should use the configured server time zone in summer");
  assert(card._clockTime(new Date("2026-12-31T12:00:00Z")) === "12:00", "Home Assistant mode should use the configured server time zone in winter");
}

{
  const invalid = createCard({ time_zone_mode: "custom", time_zone: "Not/A_Zone" });
  assert(invalid._resolvedTimeZone() === undefined, "invalid custom time zones should safely fall back to browser time");
  assert(invalid._shortTime("2026-07-31T12:00:00Z") !== "--", "invalid custom time zones should not break timestamp rendering");
  assert(createCard({ time_zone_mode: "invalid" })._config.time_zone_mode === "browser", "invalid time zone modes should normalize to browser");
}

{
  const hourly = [{ source: "hourly" }];
  const daily = [{ source: "daily" }];
  const twiceDaily = [
    {
      datetime: "2026-08-06T06:00:00-07:00",
      is_daytime: true,
      condition: "sunny",
      temperature: 82,
      precipitation_probability: 10
    },
    {
      datetime: "2026-08-06T18:00:00-07:00",
      is_daytime: false,
      condition: "clear-night",
      temperature: 63,
      precipitation_probability: 40
    },
    {
      datetime: "2026-08-07T06:00:00-07:00",
      is_daytime: true,
      condition: "partlycloudy",
      temperature: 79,
      precipitation_probability: 20
    },
    {
      datetime: "2026-08-07T18:00:00-07:00",
      is_daytime: false,
      condition: "rainy",
      temperature: 61,
      precipitation_probability: 55
    }
  ];

  assert(createCard()._mainForecastPeriods(hourly, daily, twiceDaily) === twiceDaily, "auto mode should preserve twice-daily-first behavior");
  assert(createCard({ forecast_mode: "daily" })._mainForecastPeriods(hourly, daily, twiceDaily) === daily, "daily mode should prefer daily forecasts");
  assert(createCard({ forecast_mode: "twice_daily" })._mainForecastPeriods(hourly, daily, twiceDaily) === twiceDaily, "twice-daily mode should prefer twice-daily forecasts");
  const synthesized = createCard({
    forecast_mode: "daily",
    time_zone_mode: "custom",
    time_zone: "America/Los_Angeles"
  })._mainForecastPeriods(hourly, [], twiceDaily);
  assert(synthesized.length === 2, `daily mode should combine day/night periods by local date, got ${synthesized.length}`);
  assert(synthesized[0].temperature === 82 && synthesized[0].templow === 63, "combined daily periods should use the daytime high and nighttime low");
  assert(synthesized[0].condition === "sunny", "combined daily periods should use the daytime condition");
  assert(synthesized[0].precipitation_probability === 40, "combined daily periods should preserve the greatest precipitation chance");
  assert(synthesized[0].is_daytime === undefined, "combined daily periods should not render day/night labels");
  assert(synthesized[1].temperature === 79 && synthesized[1].templow === 61, "daily grouping should remain correct across UTC date boundaries");

  const incomplete = createCard({
    forecast_mode: "daily",
    time_zone_mode: "custom",
    time_zone: "America/Los_Angeles"
  })._mainForecastPeriods(hourly, [], twiceDaily.slice(1));
  assert(incomplete.length === 2, "daily mode should retain an incomplete leading night instead of dropping current forecast data");
  assert(incomplete[0].temperature === 63 && incomplete[0].templow === undefined, "an incomplete night should remain usable without showing a misleading high/low range");
  assert(createCard({ forecast_mode: "invalid" })._config.forecast_mode === "auto", "invalid forecast modes should normalize to auto");
}

{
  const card = createCard({
    show_humidity: false,
    show_dew_point: true,
    show_wind: false,
    show_sunrise: true,
    show_sunset: false
  });
  const tiles = card._weatherDetailTiles({
    text: { humidity: "Humidity", dewPoint: "Dew Point", wind: "Wind", sunrise: "Sunrise", sunset: "Sunset" },
    humidity: "70",
    dewPoint: "55 deg",
    wind: "8 mph",
    sun: { next_rising: "2026-07-31T10:00:00Z", next_setting: "2026-08-01T00:00:00Z" }
  }).filter(Boolean);
  const rendered = tiles.join("");

  assert(tiles.length === 2, `expected two visible built-in detail tiles, got ${tiles.length}`);
  assert(rendered.includes("Dew Point") && rendered.includes("Sunrise"), "enabled detail tiles should render");
  assert(!rendered.includes("Humidity") && !rendered.includes("Wind") && !rendered.includes("Sunset"), "disabled detail tiles should not render");
}

{
  const card = createCard();
  const expectedCategories = [
    ["Very Low", "low", 1],
    ["Low", "low", 1],
    ["Moderate", "moderate", 2],
    ["Medium", "moderate", 2],
    ["High", "high", 3],
    ["Very High", "veryHigh", 4],
    ["very_high", "veryHigh", 4],
    ["Extreme", "veryHigh", 4]
  ];
  for (const [value, key, rank] of expectedCategories) {
    const severity = card._pollenSeverity(value);
    assert(severity.key === key && severity.rank === rank, `${value} should map to ${key} pollen severity`);
  }

  assert(card._pollenSeverity("Very Low", 1).key === "low", "Google UPI 1 should map to low severity");
  assert(card._pollenSeverity("Very Low", 3).key === "moderate", "Google UPI 3 should map to moderate severity");
  assert(card._pollenSeverity("Very Low", 4).key === "high", "Google UPI 4 should map to high severity");
  assert(card._pollenSeverity("Very Low", 5).key === "veryHigh", "Google UPI 5 should map to very-high severity");
  assert(card._pollenSeverity(8).key === "veryHigh", "generic numeric pollen values should retain the concentration thresholds");
}

{
  const card = createCard({
    pollen_entity: "sensor.google_pollen",
    tree_pollen_entity: "sensor.google_tree_pollen",
    grass_pollen_entity: "sensor.google_grass_pollen"
  });
  card._hass = {
    states: {
      "sensor.google_pollen": { state: "Low", attributes: { friendly_name: "Google Pollen" } },
      "sensor.google_tree_pollen": { state: "Very Low", attributes: { friendly_name: "Google Tree Pollen", index_value: 1 } },
      "sensor.google_grass_pollen": { state: "Low", attributes: { friendly_name: "Google Grass Pollen", index_value: 2 } }
    }
  };

  const lowTile = card._sensorPollenTile();
  assert(lowTile.label === "Pollen", "a generic pollen entity should retain the summary label");
  assert(lowTile.note === "Low" && lowTile.level === "good", "Very Low pollen should not create a false high-pollen warning");

  card._hass.states["sensor.google_tree_pollen"] = {
    state: "Very Low",
    attributes: { friendly_name: "Google Tree Pollen", index_value: 4 }
  };
  const highTile = card._sensorPollenTile();
  assert(highTile.note === "Tree Pollen: High", "Google UPI should identify the strongest pollen source from index_value");
  assert(highTile.level === "unhealthy", "Google UPI 4 should apply the high-pollen tile level");
}

console.log("RadarWise configuration behavior tests passed");
