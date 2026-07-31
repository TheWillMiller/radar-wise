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
  assert(editor.shadowRoot.innerHTML.includes('id="forecast_mode"'), "visual editor should render the forecast mode selector");
  assert(editor.shadowRoot.innerHTML.includes('id="show_humidity"'), "visual editor should render the built-in detail switches");
}

function createCard(config = {}) {
  const card = new RadarWiseCard();
  card._config = card._normalizeConfig(config);
  return card;
}

{
  const card = createCard();
  assert(card._config.forecast_mode === "auto", "forecast mode should default to auto");
  for (const key of ["show_humidity", "show_dew_point", "show_wind", "show_sunrise", "show_sunset"]) {
    assert(card._config[key] === true, `${key} should default to visible`);
  }
}

{
  const hourly = [{ source: "hourly" }];
  const daily = [{ source: "daily" }];
  const twiceDaily = [{ source: "twice_daily" }];

  assert(createCard()._mainForecastPeriods(hourly, daily, twiceDaily) === twiceDaily, "auto mode should preserve twice-daily-first behavior");
  assert(createCard({ forecast_mode: "daily" })._mainForecastPeriods(hourly, daily, twiceDaily) === daily, "daily mode should prefer daily forecasts");
  assert(createCard({ forecast_mode: "twice_daily" })._mainForecastPeriods(hourly, daily, twiceDaily) === twiceDaily, "twice-daily mode should prefer twice-daily forecasts");
  assert(createCard({ forecast_mode: "daily" })._mainForecastPeriods(hourly, [], twiceDaily) === twiceDaily, "daily mode should fall back to twice-daily forecasts");
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

console.log("RadarWise configuration behavior tests passed");
