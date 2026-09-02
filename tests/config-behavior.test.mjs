global.window = {
  customCards: [],
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  requestAnimationFrame: () => 1
};

const registry = new Map();

global.customElements = {
  get: (name) => registry.get(name),
  define: (name, cls) => registry.set(name, cls)
};

class TestElement {
  constructor({ id = "", action = "", textContent = "", title = "", ariaLabel = "" } = {}) {
    this.id = id;
    this.dataset = action ? { radarAction: action } : {};
    this.textContent = textContent;
    this.title = title;
    this.hidden = false;
    this.isConnected = true;
    this.attributes = new Map();
    this.listeners = new Map();
    if (ariaLabel) this.attributes.set("aria-label", ariaLabel);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  click() {
    this.listeners.get("click")?.({ stopPropagation() {} });
    this.onclick?.({ stopPropagation() {} });
  }

  change() {
    this.listeners.get("change")?.({ target: this });
    this.onchange?.({ target: this });
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  getBoundingClientRect() {
    return this.rect || { width: 800, height: 500 };
  }
}

function createTestShadowRoot() {
  let innerHTML = "";
  let elements = new Map();
  let radarButtons = [];
  return {
    get innerHTML() {
      return innerHTML;
    },
    set innerHTML(value) {
      innerHTML = String(value);
      elements = new Map();
      radarButtons = [];

      if (innerHTML.includes('id="rmap"')) {
        elements.set("rmap", new TestElement({ id: "rmap" }));
      }
      const labelText = innerHTML.match(/id="radar-lbl">([^<]*)<\/div>/)?.[1];
      if (labelText !== undefined) {
        elements.set("radar-lbl", new TestElement({ id: "radar-lbl", textContent: labelText }));
      }
      if (innerHTML.includes('id="radar-alert"')) {
        elements.set("radar-alert", new TestElement({ id: "radar-alert" }));
      }
      const languageSelect = innerHTML.match(/<select id="language">([\s\S]*?)<\/select>/)?.[1];
      if (languageSelect !== undefined) {
        const selected = languageSelect.match(/<option value="([^"]+)"[^>]*selected/)?.[1] || "auto";
        const language = new TestElement({ id: "language" });
        language.value = selected;
        elements.set("language", language);
      }

      for (const match of innerHTML.matchAll(/<button[^>]*data-radar-action="([^"]+)"[^>]*title="([^"]*)"[^>]*aria-label="([^"]*)"[^>]*>([^<]*)<\/button>/g)) {
        radarButtons.push(new TestElement({
          action: match[1],
          title: match[2],
          ariaLabel: match[3],
          textContent: match[4]
        }));
      }
    },
    getElementById: (id) => elements.get(id) || null,
    querySelector: (selector) => {
      const action = selector.match(/^\[data-radar-action="([^"]+)"\]$/)?.[1];
      if (action) return radarButtons.find((button) => button.dataset.radarAction === action) || null;
      const id = selector.match(/^#(.+)$/)?.[1];
      return id ? elements.get(id) || null : null;
    },
    querySelectorAll: (selector) => selector === "[data-radar-action]" ? radarButtons : []
  };
}

global.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = createTestShadowRoot();
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

function createRegisteredCard({
  config = {},
  locale = { language: "en" },
  hassConfig = { unit_system: { temperature: "°C" } },
  states = {},
  connection,
  hassOverrides = {}
} = {}) {
  const card = new RadarWiseCard();
  card.setConfig({ type: "custom:radarwise-card", ...config });
  const hass = { locale, config: hassConfig, states, ...hassOverrides };
  if (connection !== undefined) hass.connection = connection;
  card.hass = hass;
  return card;
}

function renderRegisteredCard(options) {
  return createRegisteredCard(options).shadowRoot.innerHTML;
}

{
  const card = createRegisteredCard({
    config: {
      entity: "weather.forecast_home",
      language: "sv",
      content_mode: "essentials",
      show_radar: false,
      show_environment: false,
      show_animations: false
    },
    states: {
      "weather.forecast_home": {
        state: "sunny",
        attributes: { temperature: 18, temperature_unit: "°C" }
      }
    }
  });

  assert(
    card.shadowRoot.innerHTML.includes("Aktuellt väder"),
    "explicit language: sv should render the Swedish current-weather label"
  );
}

{
  const baseConfig = {
    language: "sv",
    show_radar: false,
    show_environment: false,
    show_timeline: false,
    show_forecast: false,
    show_forecast_summary: false,
    show_animations: false
  };
  const hassConfig = { unit_system: { temperature: "°C", wind_speed: "m/s" } };

  const setupCard = createRegisteredCard({ config: baseConfig, hassConfig });
  const unavailableCard = createRegisteredCard({
    config: { ...baseConfig, entity: "weather.forecast_home" },
    hassConfig
  });
  const currentCard = createRegisteredCard({
    config: { ...baseConfig, entity: "weather.forecast_home" },
    hassConfig,
    states: {
      "weather.forecast_home": {
        state: "sunny",
        last_updated: "2026-09-02T08:00:00Z",
        attributes: {
          temperature: 18,
          temperature_unit: "°C",
          apparent_temperature: 17,
          humidity: 72,
          dew_point: 12,
          wind_speed: 4,
          wind_speed_unit: "m/s"
        }
      },
      "sun.sun": {
        state: "above_horizon",
        attributes: {
          next_rising: "2026-09-03T04:02:00Z",
          next_setting: "2026-09-02T17:43:00Z"
        }
      }
    }
  });

  const rendered = `${setupCard.shadowRoot.innerHTML}\n${unavailableCard.shadowRoot.innerHTML}\n${currentCard.shadowRoot.innerHTML}`;
  const expected = [
    "Välj en väderentitet",
    "Anslut en väderentitet i Home Assistant",
    "Öppna kortredigeraren för att slutföra konfigurationen",
    "Väntar på aktuella väderdata",
    "Uppdaterad",
    "Luftfuktighet",
    "Daggpunkt",
    "Upplevd temperatur",
    "Vind",
    "Soluppgång",
    "Solnedgång"
  ];
  const missing = expected.filter((value) => !rendered.includes(value));
  assert(
    missing.length === 0,
    `Swedish setup, status, and current-weather surfaces should render the approved wording; missing: ${missing.join(", ")}`
  );
}

{
  const conditions = [
    ["sunny", "Soligt"],
    ["clear-night", "Klart"],
    ["partlycloudy", "Växlande molnighet"],
    ["cloudy", "Molnigt"],
    ["rainy", "Regn"],
    ["pouring", "Ösregn"],
    ["lightning", "Åska"],
    ["lightning-rainy", "Åska och regn"],
    ["snowy", "Snö"],
    ["snowy-rainy", "Snöblandat regn"],
    ["fog", "Dimma"],
    ["windy", "Blåsigt"],
    ["windy-variant", "Blåsigt och molnigt"],
    ["unavailable", "inte tillgängligt"]
  ];
  const missing = [];

  for (const [condition, expected] of conditions) {
    const card = createRegisteredCard({
      config: {
        entity: "weather.forecast_home",
        language: "sv",
        show_radar: false,
        show_environment: false,
        show_timeline: false,
        show_forecast: false,
        show_animations: false
      },
      states: {
        "weather.forecast_home": {
          state: condition,
          attributes: { temperature: 18, temperature_unit: "°C" }
        }
      }
    });
    if (!card.shadowRoot.innerHTML.includes(expected)) missing.push(`${condition} → ${expected}`);
  }

  assert(
    missing.length === 0,
    `Swedish weather conditions should render the approved wording; missing: ${missing.join(", ")}`
  );
}

{
  const baseState = {
    state: "sunny",
    attributes: {
      temperature: 18,
      temperature_unit: "°C",
      supported_features: 7
    }
  };
  const forecasts = {
    hourly: [
      {
        datetime: "2026-09-02T10:00:00+02:00",
        condition: "sunny",
        temperature: 18,
        precipitation_probability: 20
      }
    ],
    daily: [
      {
        datetime: "2026-09-02T12:00:00+02:00",
        condition: "sunny",
        temperature: 19,
        templow: 8,
        precipitation_probability: 20
      },
      {
        datetime: "2026-09-03T12:00:00+02:00",
        condition: "partlycloudy",
        temperature: 16,
        precipitation_probability: 40
      }
    ],
    twice_daily: [
      {
        datetime: "2026-09-02T08:00:00+02:00",
        is_daytime: true,
        condition: "sunny",
        temperature: 19,
        precipitation_probability: 20
      },
      {
        datetime: "2026-09-02T20:00:00+02:00",
        is_daytime: false,
        condition: "clear-night",
        temperature: 8,
        precipitation_probability: 30
      },
      {
        datetime: "2026-09-03T08:00:00+02:00",
        is_daytime: true,
        condition: "partlycloudy",
        temperature: 16,
        precipitation_probability: 40
      }
    ]
  };

  async function renderForecast(config = {}, availableForecasts = forecasts, weatherState = baseState) {
    const card = createRegisteredCard({
      config: {
        entity: "weather.forecast_home",
        language: "sv",
        show_radar: false,
        show_environment: false,
        show_animations: false,
        ...config
      },
      states: { "weather.forecast_home": weatherState },
      connection: {
        sendMessagePromise: async ({ service_data: { type } }) => ({
          service_response: {
            "weather.forecast_home": { forecast: availableForecasts[type] || [] }
          }
        })
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    return card.shadowRoot.innerHTML;
  }

  const full = await renderForecast();
  const daily = await renderForecast(
    { forecast_mode: "daily" },
    { daily: forecasts.daily },
    { ...baseState, attributes: { ...baseState.attributes, supported_features: 1 } }
  );
  const empty = await renderForecast({}, { hourly: [], daily: [], twice_daily: [] });
  const rendered = `${full}\n${daily}\n${empty}`;
  const expected = [
    "Prognos",
    "Dagligen",
    "Varje timme",
    "Dag",
    "Natt",
    "Väntar på prognosdata från Home Assistant.",
    "Relativ temperatur inom de synliga prognosraderna",
    "Prognos: just nu soligt",
    "med som högst 19°",
    "och 40 % risk för nederbörd",
    "I natt blir det klart",
    "med som lägst 8°",
    "I morgon blir det växlande molnighet",
    "omkring 16°"
  ];
  const missing = expected.filter((value) => value === "Dag"
    ? !rendered.includes(">Dag<")
    : !rendered.includes(value));
  assert(
    missing.length === 0,
    `Swedish forecast surfaces should render the approved wording; missing: ${missing.join(", ")}`
  );
}

{
  function renderEnvironment(config, states) {
    return renderRegisteredCard({
      config: {
        entity: "weather.forecast_home",
        language: "sv",
        environment_source: "sensors",
        show_radar: false,
        show_timeline: false,
        show_forecast: false,
        show_forecast_summary: false,
        show_animations: false,
        ...config
      },
      states: {
        "weather.forecast_home": {
          state: "sunny",
          attributes: { temperature: 18, temperature_unit: "°C" }
        },
        ...states
      }
    });
  }

  const rendered = [];
  for (const [state, severity] of [
    [25, "Bra"],
    [75, "Måttlig"],
    [125, "Ohälsosam för känsliga grupper"],
    [175, "Ohälsosam"],
    [250, "Mycket ohälsosam"],
    [350, "Farlig"]
  ]) {
    rendered.push(renderEnvironment(
      { air_quality_entity: "sensor.air_quality_aqi" },
      {
        "sensor.air_quality_aqi": {
          state: String(state),
          attributes: { friendly_name: "Air Quality AQI", unit_of_measurement: "AQI" }
        }
      }
    ));
    rendered.push(severity);
  }

  for (const [configKey, entityId, expectedLabel] of [
    ["pollen_entity", "sensor.pollen", "Pollen"],
    ["tree_pollen_entity", "sensor.tree_pollen", "Trädpollen"],
    ["grass_pollen_entity", "sensor.grass_pollen", "Gräspollen"],
    ["weed_pollen_entity", "sensor.weed_pollen", "Örtpollen"],
    ["mold_pollen_entity", "sensor.mold_pollen", "Mögelsporer"]
  ]) {
    rendered.push(renderEnvironment(
      { [configKey]: entityId },
      { [entityId]: { state: "Low", attributes: { friendly_name: entityId } } }
    ));
    rendered.push(expectedLabel);
  }

  for (const [state, severity] of [
    [1, "Låg"],
    [3, "Måttlig"],
    [6, "Hög"],
    [9, "Mycket hög"],
    [12, "Extrem"]
  ]) {
    rendered.push(renderEnvironment(
      { uv_index_entity: "sensor.uv_index" },
      {
        "sensor.uv_index": {
          state: String(state),
          attributes: { friendly_name: "UV Index", device_class: "uv_index" }
        }
      }
    ));
    rendered.push(severity);
  }

  const output = rendered.filter((_, index) => index % 2 === 0).join("\n");
  const expected = [
    "Luftkvalitet",
    "UV-index",
    "Pollen",
    "Trädpollen",
    "Gräspollen",
    "Örtpollen",
    "Mögelsporer",
    "Bra",
    "Låg",
    "Måttlig",
    "Hög",
    "Mycket hög",
    "Ohälsosam för känsliga grupper",
    "Ohälsosam",
    "Mycket ohälsosam",
    "Farlig",
    "Extrem"
  ];
  const missing = expected.filter((value) => !output.includes(value));
  assert(
    missing.length === 0,
    `Swedish environment surfaces should render the approved wording; missing: ${missing.join(", ")}`
  );
}

{
  function createLeafletBoundary({ failMap = false } = {}) {
    class Layer {
      constructor(url = "", options = {}) {
        this.url = url;
        this.options = options;
      }
      addTo() { return this; }
      remove() {}
      setOpacity() {}
      on() { return this; }
      bindPopup(html) { this.popup = html; return this; }
      openPopup() { globalThis.__radarWisePopup = this.popup || ""; return this; }
    }
    class WmsLayer extends Layer {}
    WmsLayer.extend = () => class extends WmsLayer {};
    Layer.WMS = WmsLayer;
    Layer.extend = () => class extends Layer {};

    const tileLayer = (url, options) => new Layer(url, options);
    tileLayer.wms = (url, options) => new WmsLayer(url, options);
    return {
      TileLayer: Layer,
      tileLayer,
      map: () => {
        if (failMap) throw new Error("map unavailable");
        return { invalidateSize() {}, on() {}, remove() {} };
      },
      circleMarker: () => new Layer(),
      layerGroup: () => new Layer(),
      geoJSON: () => new Layer()
    };
  }

  const weatherState = {
    "weather.forecast_home": {
      state: "sunny",
      attributes: { temperature: 18, temperature_unit: "°C" }
    }
  };
  const baseHass = {
    locale: { language: "en" },
    config: { latitude: 59.33, longitude: 18.07, unit_system: { temperature: "°C" } },
    states: weatherState
  };
  const savedFetch = global.fetch;
  const savedLeaflet = window.L;
  const savedRequestAnimationFrame = window.requestAnimationFrame;
  const savedSetTimeout = window.setTimeout;

  async function createRadar(config = {}, { fetchImpl, failMap = false, zeroSize = false, immediateTimers = false } = {}) {
    const frames = [];
    window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
    window.setTimeout = immediateTimers ? ((callback) => { callback(); return 1; }) : (() => 1);
    window.L = createLeafletBoundary({ failMap });
    global.fetch = fetchImpl || (async () => ({ ok: true, json: async () => ({}) }));

    const card = createRegisteredCard({
      config: {
        entity: "weather.forecast_home",
        language: "sv",
        content_mode: "radar",
        radar_provider: "rainviewer",
        show_environment: false,
        show_animations: false,
        ...config
      },
      locale: baseHass.locale,
      hassConfig: baseHass.config,
      states: baseHass.states
    });
    if (zeroSize) card.shadowRoot.getElementById("rmap").rect = { width: 0, height: 0 };
    return { card, runRadar: async () => {
      frames.at(-1)?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    } };
  }

  const initial = await createRadar();
  const initialMarkup = initial.card.shadowRoot.innerHTML;
  const playButton = initial.card.shadowRoot.querySelector('[data-radar-action="play"]');
  playButton.click();
  const playLabel = playButton.getAttribute("aria-label");

  const waiting = await createRadar({}, { zeroSize: true, immediateTimers: true });
  await waiting.runRadar();

  const unavailable = await createRadar({}, { failMap: true });
  await unavailable.runRadar();

  const noRainViewerFrames = await createRadar({}, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ radar: { past: [] } }) })
  });
  await noRainViewerFrames.runRadar();

  const current = await createRadar({ country: "ca", radar_provider: "envcanada", radar_timeline: "latest" });
  await current.runRadar();
  const loop = await createRadar({ country: "ca", radar_provider: "envcanada", radar_timeline: "loop" });
  await loop.runRadar();

  const rainViewerData = {
    host: "https://tilecache.example",
    radar: {
      past: [{ time: 1788332400, path: "/past/1" }, { time: 1788333000, path: "/past/2" }],
      nowcast: [{ time: 1788333600, path: "/future/1" }]
    }
  };
  const future = await createRadar({ country: "global", radar_timeline: "future" }, {
    fetchImpl: async () => ({ ok: true, json: async () => rainViewerData })
  });
  await future.runRadar();

  function alertFetch(features) {
    return async (url) => ({
      ok: true,
      json: async () => String(url).includes("rainviewer") ? rainViewerData : { features }
    });
  }
  globalThis.__radarWisePopup = "";
  const singleAlert = await createRadar({ country: "us", radar_timeline: "latest" }, {
    fetchImpl: alertFetch([{ properties: {}, geometry: null }])
  });
  await singleAlert.runRadar();
  const singleAlertElement = singleAlert.card.shadowRoot.getElementById("radar-alert");
  singleAlertElement.click();

  const pluralAlert = await createRadar({ country: "us", radar_timeline: "latest" }, {
    fetchImpl: alertFetch([
      { properties: { headline: "Provider headline" }, geometry: null },
      { properties: {}, geometry: null }
    ])
  });
  await pluralAlert.runRadar();
  const pluralAlertElement = pluralAlert.card.shadowRoot.getElementById("radar-alert");

  const swedishPluralAlert = await createRadar({ country: "us", radar_timeline: "latest" }, {
    fetchImpl: alertFetch([
      { properties: {}, geometry: null },
      { properties: {}, geometry: null }
    ])
  });
  await swedishPluralAlert.runRadar();

  const englishPluralAlert = await createRadar({ country: "us", radar_timeline: "latest", language: "en" }, {
    fetchImpl: alertFetch([
      { properties: {}, geometry: null },
      { properties: {}, geometry: null }
    ])
  });
  await englishPluralAlert.runRadar();

  const activeWarningTitles = [
    singleAlertElement.title,
    swedishPluralAlert.card.shadowRoot.getElementById("radar-alert").title,
    englishPluralAlert.card.shadowRoot.getElementById("radar-alert").title,
    pluralAlertElement.title
  ];
  const expectedActiveWarningTitles = [
    "1 aktiv vädervarning",
    "2 aktiva vädervarningar",
    "2 active weather alerts",
    "Provider headline"
  ];
  assert(
    JSON.stringify(activeWarningTitles) === JSON.stringify(expectedActiveWarningTitles),
    `active-warning titles should use the Swedish singular and plural, preserve the English fallback, and leave provider headlines unchanged; expected ${JSON.stringify(expectedActiveWarningTitles)}, got ${JSON.stringify(activeWarningTitles)}`
  );

  const output = [
    initialMarkup,
    playLabel,
    waiting.card.shadowRoot.getElementById("radar-lbl").textContent,
    unavailable.card.shadowRoot.getElementById("radar-lbl").textContent,
    noRainViewerFrames.card.shadowRoot.getElementById("radar-lbl").textContent,
    current.card.shadowRoot.getElementById("radar-lbl").textContent,
    loop.card.shadowRoot.getElementById("radar-lbl").textContent,
    future.card.shadowRoot.getElementById("radar-lbl").textContent,
    singleAlertElement.title,
    singleAlertElement.textContent,
    pluralAlertElement.textContent,
    globalThis.__radarWisePopup
  ].join("\n");
  const expected = [
    "Radarbilden laddas...",
    "Radarbilden är inte tillgänglig",
    "Väntar på kontrollpanelens layout för radarbilden",
    "Radarbild från RainViewer är inte tillgänglig",
    "aktuell radarbild",
    "radaranimering",
    "framtida radarbild",
    "Föregående radarbild",
    "Nästa radarbild",
    "Pausa radaranimeringen",
    "Spela upp radaranimeringen",
    "Vädervarning",
    "aktiv vädervarning",
    "NWS-varning – tryck för detaljer",
    "NWS-varningar – tryck för detaljer",
    "Allvarlighetsgrad",
    "Okänd"
  ];
  const missing = expected.filter((value) => !output.includes(value));
  assert(
    missing.length === 0,
    `Swedish radar, alert, and accessibility surfaces should render the approved wording; missing: ${missing.join(", ")}`
  );

  global.fetch = savedFetch;
  window.L = savedLeaflet;
  window.requestAnimationFrame = savedRequestAnimationFrame;
  window.setTimeout = savedSetTimeout;
}

{
  const RealDate = Date;
  const fixedNow = "2026-09-03T10:15:00Z";
  global.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [fixedNow]));
    }
    static now() { return new RealDate(fixedNow).getTime(); }
  };

  const card = createRegisteredCard({
    config: {
      entity: "weather.forecast_home",
      language: "sv",
      time_format: "12",
      time_zone_mode: "custom",
      time_zone: "UTC",
      show_radar: false,
      show_environment: false,
      show_timeline: false,
      show_forecast: false,
      show_forecast_summary: false,
      show_animations: false
    },
    locale: { language: "en", time_format: "24" },
    states: {
      "weather.forecast_home": {
        state: "sunny",
        attributes: { temperature: 18, temperature_unit: "°C" }
      },
      "sun.sun": {
        state: "above_horizon",
        attributes: {
          next_rising: "2026-09-03T06:00:00Z",
          next_setting: "2026-09-03T18:00:00Z"
        }
      }
    }
  });
  const rendered = card.shadowRoot.innerHTML;
  global.Date = RealDate;

  const expected = ["torsdag 3 september 2026", "6:00 fm", "6:00 em"];
  const missing = expected.filter((value) => !rendered.includes(value));
  assert(
    missing.length === 0,
    `Swedish dates and explicitly selected 12-hour time should render with the resolved locale; missing: ${missing.join(", ")}`
  );
}

{
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  function renderLocalized(config, hass, browserLanguage = "en-US") {
    Object.defineProperty(globalThis, "navigator", {
      value: { language: browserLanguage },
      configurable: true
    });
    return renderRegisteredCard({
      config: {
        entity: "weather.forecast_home",
        content_mode: "essentials",
        show_radar: false,
        show_environment: false,
        show_animations: false,
        ...config
      },
      locale: hass.locale ?? null,
      states: {
        "weather.forecast_home": {
          state: "sunny",
          attributes: { temperature: 18, temperature_unit: "°C" }
        }
      },
      hassOverrides: hass
    });
  }

  const cases = [
    ["Home Assistant sv", renderLocalized({ language: "auto" }, { locale: { language: "sv" } }), "Aktuellt väder"],
    ["Home Assistant sv-SE", renderLocalized({ language: "auto" }, { locale: { language: "sv-SE" } }), "Aktuellt väder"],
    ["browser sv-FI fallback", renderLocalized({ language: "auto" }, {}, "sv-FI"), "Aktuellt väder"],
    ["legacy Home Assistant language", renderLocalized({ language: "auto" }, { language: "sv" }), "Aktuellt väder"],
    ["Home Assistant locale precedence", renderLocalized({ language: "auto" }, { locale: { language: "fr" }, language: "sv" }, "sv-FI"), "Météo actuelle"],
    ["legacy forecast language migration", renderLocalized({ forecast_summary_language: "sv" }, { locale: { language: "en" } }), "Aktuellt väder"],
    ["unsupported locale fallback", renderLocalized({ language: "auto" }, { locale: { language: "zz-ZZ" } }, "sv-FI"), "Current Weather"]
  ];
  for (const [language, expected] of [
    ["en", "Current Weather"],
    ["fr", "Météo actuelle"],
    ["es", "Tiempo actual"],
    ["de", "Aktuelles Wetter"],
    ["pt", "Tempo atual"],
    ["nl", "Huidig weer"]
  ]) {
    cases.push([`${language} rendered regression`, renderLocalized({ language }, { locale: { language: "sv" } }), expected]);
  }

  if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
  else delete globalThis.navigator;

  const missing = cases
    .filter(([, rendered, expected]) => !rendered.includes(expected))
    .map(([name, , expected]) => `${name} → ${expected}`);
  assert(
    missing.length === 0,
    `language selection, precedence, migration, and existing output should remain compatible; missing: ${missing.join(", ")}`
  );
}

{
  const editor = new RadarWiseCardEditor();
  editor.setConfig(RadarWiseCard.getStubConfig());
  editor.hass = { states: {} };
  const language = editor.shadowRoot.querySelector("#language");
  const exposesSwedish = editor.shadowRoot.innerHTML.includes(">Svenska</option>");
  language.value = "sv";
  language.change();

  assert(
    exposesSwedish && editor.lastEvent?.detail?.config?.language === "sv",
    "the visual editor should list Svenska and emit language: sv through its public change event"
  );
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
  editor._setValue("theme_mode", "dark");
  assert(editor._config.theme_mode === "dark", "editor should store the RadarWise Dark theme preference");
  editor._setValue("time_zone_mode", "custom");
  editor._setValue("time_zone", "America/Toronto");
  assert(editor._config.time_zone_mode === "custom", "editor should store the time zone source");
  assert(editor._config.time_zone === "America/Toronto", "editor should store the custom IANA time zone");
  assert(editor.shadowRoot.innerHTML.includes('id="forecast_mode"'), "visual editor should render the forecast mode selector");
  assert(editor.shadowRoot.innerHTML.includes('value="dark"'), "visual editor should render the RadarWise Dark theme option");
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

  assert(createCard({ latitude: 33.688, longitude: -78.886 })._noaaLayerName() === "conus:conus_bref_qcd", "NOAA radar should use quality-controlled CONUS base reflectivity for Myrtle Beach");
  assert(createCard({ latitude: 61.2181, longitude: -149.9003 })._noaaLayerName() === "alaska:alaska_bref_qcd", "NOAA radar should preserve Alaska coverage");
  assert(createCard({ latitude: 52.9, longitude: 172.5 })._noaaLayerName() === "alaska:alaska_bref_qcd", "NOAA radar should preserve Aleutian coverage across the antimeridian");
  assert(createCard({ latitude: 21.3099, longitude: -157.8581 })._noaaLayerName() === "hawaii:hawaii_bref_qcd", "NOAA radar should preserve Hawaii coverage");
  assert(createCard({ latitude: 13.4443, longitude: 144.7937 })._noaaLayerName() === "guam:guam_bref_qcd", "NOAA radar should preserve Guam coverage");
  assert(createCard({ latitude: 18.2208, longitude: -66.5901 })._noaaLayerName() === "carib:carib_bref_qcd", "NOAA radar should preserve Caribbean coverage");
}

{
  const card = createCard();
  assert(card._config.forecast_mode === "auto", "forecast mode should default to auto");
  assert(card._config.theme_mode === "radarwise", "theme mode should default to RadarWise");
  assert(card._config.time_zone_mode === "browser", "time zone mode should default to browser for backward compatibility");
  assert(card._config.time_zone === "", "custom time zone should default to blank");
  for (const key of ["show_humidity", "show_dew_point", "show_wind", "show_sunrise", "show_sunset"]) {
    assert(card._config[key] === true, `${key} should default to visible`);
  }
}

{
  const card = createCard();
  const imperial = card._unitContext({ temperature_unit: "°F" });
  const metric = createCard({ units: "metric" })._unitContext({ temperature_unit: "°F" });
  assert(card._apparentTemperature({ apparent_temperature: 84 }, imperial) === "84°F", "Home Assistant apparent_temperature should render as feels-like temperature");
  assert(card._apparentTemperature({ native_apparent_temperature: 84 }, metric) === "29°C", "native apparent temperature should convert to the selected display units");
  assert(card._apparentTemperature({ feels_like: 81 }, imperial) === "81°F", "common feels_like aliases should remain compatible");
  assert(card._apparentTemperature({}, imperial) === "", "feels-like temperature should be omitted when the provider does not supply it");
}

{
  const card = createCard();
  const pixels = { data: new Uint8ClampedArray([
    70, 102, 164, 255,
    92, 181, 198, 255,
    55, 214, 105, 255,
    240, 40, 20, 255,
    220, 70, 230, 255,
    255, 255, 255, 0
  ]) };
  assert(card._filterNoaaWeakEchoes(pixels) === 2, "classic NOAA radar should suppress gray/blue/cyan weak echoes");
  assert(pixels.data[3] === 0 && pixels.data[7] === 0, "weak NOAA echoes should become transparent");
  assert(pixels.data[11] === 255 && pixels.data[15] === 255 && pixels.data[19] === 255, "green, red, and magenta precipitation returns should remain visible");
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
  assert(createCard({ theme_mode: "dark" })._config.theme_mode === "dark", "RadarWise Dark theme should normalize correctly");
  assert(createCard({ theme_mode: "invalid" })._config.theme_mode === "radarwise", "invalid theme modes should normalize to RadarWise");
  assert(createCard({ theme_mode: "dark" })._styles().includes(':host([theme-mode="dark"])'), "RadarWise Dark should provide dedicated card styles");

  const basemaps = ["light", "dark", "osm"].map((kind) => createCard({ radar_basemap: kind })._basemap());
  assert(basemaps.every(({ url }) => url === "https://tile.openstreetmap.org/{z}/{x}/{y}.png"), "all non-BOM basemaps should use the keyless OpenStreetMap tile endpoint");
  assert(basemaps.every(({ url }) => !url.includes("cartocdn.com")), "basemaps must not use CARTO's API-key-watermarked raster endpoint");
  assert(basemaps.every(({ options }) => options.crossOrigin === true && options.attribution.includes("OpenStreetMap contributors")), "OpenStreetMap basemaps should retain browser-safe loading and visible attribution");
  assert(basemaps.every(({ options }) => options.referrerPolicy === "origin"), "OpenStreetMap basemaps should override Home Assistant's no-referrer policy with an origin-only referrer");
  assert(basemaps[0].options.className.includes("basemap-light"), "light basemap should receive the local RadarWise light treatment");
  assert(basemaps[1].options.className.includes("basemap-dark"), "dark basemap should receive the local RadarWise dark treatment");
  const basemapStyles = createCard()._styles();
  assert(basemapStyles.includes(".leaflet-layer.radarwise-basemap-light"), "card styles should include the local light basemap treatment");
  assert(basemapStyles.includes(".leaflet-layer.radarwise-basemap-dark"), "card styles should include the local dark basemap treatment");

  const iconCard = createCard();
  const iconCases = {
    sunny: "ww-sunny",
    "clear-night": "ww-clear-night",
    partlycloudy: "ww-partly",
    "partly-cloudy-night": "ww-partly-night",
    cloudy: "ww-cloudy",
    rainy: "ww-rainy",
    pouring: "ww-pouring",
    "lightning-rainy": "ww-thunder",
    snowy: "ww-snowy",
    "snowy-rainy": "ww-wintry",
    hail: "ww-hail",
    fog: "ww-foggy",
    windy: "ww-windy",
    exceptional: "ww-exceptional"
  };
  const iconMarkup = Object.entries(iconCases).map(([condition, expectedClass]) => {
    const markup = iconCard._icon(condition, 32);
    assert(markup.includes(`class="ww-icon ${expectedClass}"`), `${condition} should render its dedicated weather artwork`);
    assert(markup.includes('viewBox="0 0 64 64"') && markup.includes('aria-hidden="true"'), `${condition} icon should be scalable and decorative`);
    assert(!markup.includes("<text") && !markup.includes("<ellipse"), `${condition} icon should use the refined vector paths instead of text glyphs or flat ellipse clip art`);
    return markup;
  });
  const iconIds = iconMarkup.map((markup) => markup.match(/id="(wwi-\d+)-sun"/)?.[1]);
  assert(iconIds.every(Boolean) && new Set(iconIds).size === iconIds.length, "inline weather icons should use unique SVG definition IDs");
  const animationStyles = iconCard._styles();
  ["ww-sun-spin", "ww-cloud-drift", "ww-rain-fall", "ww-snow-float", "ww-bolt-flash", "ww-moon-float", "ww-fog-slide", "ww-wind-pulse"].forEach((animation) => {
    assert(animationStyles.includes(animation), `weather icon styles should include ${animation}`);
  });
  assert(animationStyles.includes("prefers-reduced-motion:reduce") && animationStyles.includes(".ww-wind"), "all weather motion, including wind, should respect reduced-motion preferences");
}

{
  const requested = [];
  const card = createCard({ forecast_mode: "daily" });
  card._render = () => {};
  card._hass = {
    states: {
      "weather.forecast_home": { attributes: { supported_features: 3 } }
    },
    connection: {
      sendMessagePromise: async (message) => {
        requested.push(message.service_data.type);
        return { service_response: { "weather.forecast_home": { forecast: [] } } };
      }
    }
  };

  assert(card._forecastTypesToLoad("weather.forecast_home").join(",") === "hourly,daily", "daily mode should only select advertised hourly and daily forecasts");
  await card._loadForecasts("weather.forecast_home");
  assert(requested.includes("hourly") && requested.includes("daily"), "daily mode should request the forecast types needed by the card");
  assert(!requested.includes("twice_daily"), "daily mode must not call twice-daily forecasts when the entity advertises daily and hourly only");
  assert(card._forecasts.twice_daily.length === 0, "unrequested forecast types should remain empty arrays");
}

{
  const card = createCard({ forecast_mode: "auto" });
  assert(card._forecastTypesToLoad("weather.forecast_home").join(",") === "hourly,daily,twice_daily", "auto mode should preserve all forecast fallbacks when capability metadata is unavailable");
  card._hass = { states: { "weather.forecast_home": { attributes: { supported_features: 3 } } } };
  assert(card._forecastTypesToLoad("weather.forecast_home").join(",") === "hourly,daily", "auto mode should not request forecast types absent from supported_features");
}

{
  const dailyCard = createCard({ forecast_mode: "daily" });
  dailyCard._hass = { states: { "weather.forecast_home": { attributes: { supported_features: 6 } } } };
  assert(dailyCard._forecastTypesToLoad("weather.forecast_home").join(",") === "hourly,twice_daily", "daily mode should use a supported twice-daily source when native daily forecasts are unavailable");
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
