// Share the lightweight custom-element harness and existing regression suite.
await import("./config-behavior.test.mjs");
const Card = customElements.get("radarwise-card");
const Editor = customElements.get("radarwise-card-editor");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const card = (config = {}) => {
  const instance = new Card();
  instance._config = instance._normalizeConfig({ entity: "weather.home", ...config });
  instance._render = () => {};
  return instance;
};

// #33: convert values, not just labels; per-period units override entity units.
for (const [config, attrs, item, expected] of [
  [{ units: "imperial" }, { precipitation_unit: "mm" }, { precipitation: 25.4 }, "1in"],
  [{ units: "metric" }, { precipitation_unit: "in" }, { precipitation: 1 }, "25.4mm"],
  [{ units: "metric", precipitation_unit: "in" }, { precipitation_unit: "mm" }, { precipitation: 1.1 }, "0.04in"],
  [{ units: "imperial", precipitation_unit: "mm" }, { precipitation_unit: "in" }, { precipitation: 1 }, "25.4mm"],
  [{ units: "auto" }, { precipitation_unit: "mm" }, { precipitation: 2 }, "2mm"],
  [{ precipitation_unit: "in" }, { precipitation_unit: "in" }, { precipitation: 25.4, precipitation_unit: "mm", precipitation_probability: 80 }, "80% / 1in"],
  [{ precipitation_unit: "mm" }, { precipitation_unit: "cm" }, { precipitation: 2 }, "20mm"],
  [{ precipitation_unit: "in" }, { precipitation_unit: "unknown" }, { precipitation: 2 }, "2unknown"],
  [{ precipitation_unit: "in" }, { precipitation_unit: "toString" }, { precipitation: 2 }, "2toString"],
  [{ units: "imperial" }, { precipitation_unit: "mm" }, { precipitation: 0 }, "0in"],
  [{ units: "imperial" }, { precipitation_unit: "mm" }, { precipitation_probability: 0 }, "0%"],
  [{ units: "imperial" }, { precipitation_unit: "mm" }, { precipitation: null, precipitation_probability: null }, ""],
  [{ units: "imperial" }, { precipitation_unit: "mm" }, {}, ""]
]) {
  const c = card(config);
  assert(c._formatPrecip(item, c._unitContext(attrs)) === expected, `precipitation: expected ${expected}`);
}
const mixed = card({ units: "metric", precipitation_unit: "in" });
assert(mixed._displayTemp(68, mixed._unitContext({ temperature_unit: "°F" })) === "20°C", "rain units must not affect temperature");

// #39: independent BOM entities and differing source units.
const calls = [];
const split = card({ hourly_entity: "weather.hourly", daily_entity: "weather.daily" });
const dailyPeriod = { datetime: "2026-10-31T12:00:00Z", temperature: 20, templow: 10, precipitation: 25.4 };
split._hass = {
  states: {
    "weather.home": { attributes: { temperature_unit: "°F", precipitation_unit: "in", supported_features: 0 } },
    "weather.hourly": { attributes: { temperature_unit: "°F", precipitation_unit: "in", supported_features: 2 } },
    "weather.daily": { attributes: { temperature_unit: "°C", precipitation_unit: "mm", supported_features: 1 } }
  },
  connection: { sendMessagePromise: async (message) => {
    calls.push(message);
    const id = message.target.entity_id;
    return { response: { [id]: { forecast: id === "weather.daily" ? [dailyPeriod] : [{ temperature: 70, precipitation: 1 }] } } };
  } }
};
await split._loadForecasts("weather.home");
assert(calls.map((m) => `${m.target.entity_id}:${m.service_data.type}`).join() === "weather.hourly:hourly,weather.daily:daily", "request only supported types from each selected entity");
assert(split._forecasts.daily[0].temperature === 68 && split._forecasts.daily[0].templow === 50, "convert separate daily entity temperatures to the main source units");
assert(split._forecasts.hourly[0].temperature === 70, "hourly source units stay independent");
assert(split._formatPrecip(split._forecasts.daily[0], split._unitContext(split._hass.states['weather.home'].attributes)) === "1in", "retain separate forecast precipitation units");
assert(dailyPeriod.temperature === 20 && dailyPeriod.precipitation_unit === undefined, "do not mutate HA responses");
for (const mode of ["auto", "daily", "twice_daily"]) {
  assert(card({ forecast_mode: mode })._mainForecastPeriods([{ temperature: 70 }], [], []).length === 0, "hourly periods must not masquerade as daily cards");
}
assert(split._extractForecast({ response: { "weather.other": { forecast: [dailyPeriod] } } }, "weather.daily").length === 0, "do not consume another entity's response");

// Keep the supported NWS twice-daily fallback and older single-entity configs.
const nws = card({ forecast_mode: "daily" });
const nwsCalls = [];
nws._hass = { states: { "weather.home": { attributes: { supported_features: 6 } } }, connection: { sendMessagePromise: async (m) => {
  nwsCalls.push(m);
  return { forecast: [{ datetime: "2026-10-31T12:00:00Z", temperature: 70, is_daytime: true }] };
} } };
await nws._loadForecasts("weather.home");
assert(nwsCalls.map((m) => m.service_data.type).join() === "hourly,twice_daily", "preserve single-entity NWS fallback");

// A failed source cannot replace the other source; responses from old config lose.
split._hass.connection.sendMessagePromise = async (m) => {
  if (m.service_data.type === "hourly") throw new Error("source unavailable");
  return { forecast: [dailyPeriod] };
};
await split._loadForecasts("weather.home");
assert(split._forecasts.hourly.length === 0 && split._forecasts.daily.length === 1, "partial failure preserves the successful type only");
const stale = card();
const pending = [];
stale._hass = { states: { "weather.home": { attributes: { supported_features: 1 } } }, connection: { sendMessagePromise: () => new Promise((resolve) => pending.push(resolve)) } };
const first = stale._loadForecasts("weather.home");
const second = stale._loadForecasts("weather.home");
pending[1]({ forecast: [{ temperature: 80 }] });
await second;
pending[0]({ forecast: [{ temperature: 40 }] });
await first;
assert(stale._forecasts.daily[0].temperature === 80, "late old requests cannot overwrite newer results");
const third = stale._loadForecasts("weather.home");
stale._config.daily_entity = "weather.changed";
pending[2]({ forecast: [{ temperature: 10 }] });
await third;
assert(stale._forecasts.daily[0].temperature === 80, "changed source invalidates in-flight response");
stale.setConfig({ entity: "weather.home", daily_entity: "weather.new", forecast_mode: "daily" });
assert(stale._forecasts.daily.length === 0 && pending.length > 3, "setConfig clears old data and starts new requests immediately");

// #35: defaults, numeric bounds, and editor serialization.
for (const [value, expected] of [[undefined, 1], ["0.8", 0.8], [0.2, 0.7], [2, 1.5], [Infinity, 1], ["invalid", 1], ["", 1]]) {
  assert(card({ font_scale: value })._config.font_scale === expected, `font scale normalization: ${value}`);
}
const editor = new Editor();
editor.setConfig({ entity: "weather.home", panel_order: ["clock", "weather", "radar"] });
editor._setValue("font_scale", "0.85");
assert(editor.lastEvent.detail.config.font_scale === 0.85, "editor emits numeric font scale");
for (const key of ["hourly_entity", "daily_entity", "precipitation_unit", "font_scale", "forecast_layout"]) {
  assert(editor.shadowRoot.innerHTML.includes(`id="${key}"`), `editor exposes ${key}`);
}

// #34: keyboard/click fallback reorders and saves, respects boundaries.
editor._movePanel("weather", -1);
assert(editor.lastEvent.detail.config.panel_order.join() === "weather,clock,radar", "up button emits config-changed");
editor._movePanel("weather", -1);
assert(editor._config.panel_order.join() === "weather,clock,radar", "cannot move before beginning");
editor._movePanel("weather", 1);
assert(editor._config.panel_order.join() === "clock,weather,radar", "down button restores order");
editor._movePanel("radar", 1);
assert(editor._config.panel_order.join() === "clock,weather,radar", "cannot move after end");
assert(editor.shadowRoot.innerHTML.includes('aria-label="Move Current Weather up"'), "accessible action labels");

// #36 (partial): local-date pairing, incomplete periods, and default compatibility.
const paired = card({ forecast_layout: "paired", time_zone_mode: "custom", time_zone: "America/Los_Angeles", forecast_count: 2 });
const periods = [
  { datetime: "2026-10-31T01:00:00Z", is_daytime: false, temperature: 50 },
  { datetime: "2026-10-31T17:00:00Z", is_daytime: true, temperature: 70 },
  { datetime: "2026-11-01T01:00:00Z", is_daytime: false, temperature: 52 },
  { datetime: "2026-11-01T17:00:00Z", is_daytime: true, temperature: 71 }
];
const days = paired._pairedForecastDays(periods);
assert(days.length === 2 && !days[0].day && days[0].night.temperature === 50, "leading night retains blank day slot in card timezone");
assert(days[1].day.temperature === 70 && days[1].night.temperature === 52, "same local date day and night share a column");
assert(paired._renderDaily(periods, paired._unitContext({})).includes('class="fc-empty"'), "missing periods reserve their row");
paired._config.forecast_count = 3;
assert(paired._pairedForecastDays(periods)[2].night === undefined, "trailing day retains its empty night slot");
assert(!card()._pairedForecast(periods), "existing sequential layout is unchanged by default");
assert(!paired._pairedForecast([{ datetime: "2026-10-31", temperature: 70 }]), "native daily forecast remains a single row");
console.log("RadarWise issue regressions passed (#33, #34, #35, #36 partial, #39)");
