/*
 * WeatherWise Card
 * Home Assistant weather dashboard card with forecasts and optional radar.
 */

const CARD_VERSION = "0.2.0-beta.1";
const CARD_TYPES = ["weatherwise-card", "weather-wise-card"];

const WEATHERWISE_COUNTRIES = {
  us: "United States",
  ca: "Canada",
  uk: "United Kingdom",
  global: "Global / other"
};

const WEATHERWISE_RADAR = {
  auto: "Auto",
  noaa: "US NOAA radar",
  rainviewer: "RainViewer global radar",
  none: "No radar"
};

const WEATHERWISE_RADAR_STYLES = {
  standard: "Standard",
  vivid: "High contrast",
  soft: "Soft"
};

const WEATHERWISE_BASEMAPS = {
  light: "Light map",
  dark: "Dark map",
  osm: "Street map"
};

class WeatherWiseCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:weatherwise-card",
      entity: "weather.home",
      title: "Local Weather",
      country: "us",
      radar_provider: "auto",
      theme_mode: "weatherwise",
      units: "auto",
      hourly_count: 5,
      show_radar: true,
      radar_controls: true,
      radar_style: "standard",
      radar_basemap: "light",
      latitude: 33.688,
      longitude: -78.886,
      grid_options: {
        rows: "full",
        columns: 18
      }
    };
  }

  static getConfigElement() {
    return document.createElement("weatherwise-card-editor");
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._forecasts = { hourly: [], daily: [], twice_daily: [] };
    this._forecastEntity = null;
    this._lastForecastLoad = 0;
    this._lastRenderKey = "";
    this._clockTimer = window.setInterval(() => this._updateClock(), 1000);
    this._radarTimer = null;
    this._radarReloadTimer = null;
    this._radarMap = null;
    this._radarLayers = [];
    this._radarIndex = 0;
    this._radarPlaying = true;
    this._radarLabelText = "radar loop";
    this._radarProviderRendered = "";
  }

  connectedCallback() {
    this._updateClock();
  }

  disconnectedCallback() {
    window.clearInterval(this._clockTimer);
    this._teardownRadar();
  }

  setConfig(config) {
    const normalized = this._normalizeConfig(config || {});
    if (!normalized.entity) {
      throw new Error("WeatherWise requires a weather entity.");
    }
    const previous = this._config || {};
    this._config = normalized;
    this.setAttribute("theme-mode", this._config.theme_mode);
    if (
      previous.entity !== this._config.entity ||
      previous.country !== this._config.country ||
      previous.radar_provider !== this._config.radar_provider ||
      previous.radar_style !== this._config.radar_style ||
      previous.radar_basemap !== this._config.radar_basemap ||
      previous.latitude !== this._config.latitude ||
      previous.longitude !== this._config.longitude ||
      previous.show_radar !== this._config.show_radar
    ) {
      this._teardownRadar();
    }
    this._lastRenderKey = "";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const entityId = this._config.entity;
    const now = Date.now();
    if (entityId && this._forecastEntity !== entityId) {
      this._forecasts = { hourly: [], daily: [], twice_daily: [] };
      this._forecastEntity = entityId;
      this._lastForecastLoad = 0;
      this._lastRenderKey = "";
    }
    if (entityId && now - this._lastForecastLoad > 5 * 60 * 1000) {
      this._lastForecastLoad = now;
      this._loadForecasts(entityId);
    }
    const key = this._renderKey();
    if (key !== this._lastRenderKey) {
      this._lastRenderKey = key;
      this._render();
    }
  }

  getCardSize() {
    return this._config.show_radar === false ? 5 : 8;
  }

  getGridOptions() {
    return {
      rows: 5,
      columns: 18,
      min_rows: 4,
      min_columns: 8
    };
  }

  _normalizeConfig(config) {
    const country = String(config.country || "us").toLowerCase();
    const radarProvider = String(config.radar_provider || "auto").toLowerCase();
    const themeMode = String(config.theme_mode || "weatherwise").toLowerCase() === "auto" ? "auto" : "weatherwise";
    const units = ["auto", "imperial", "metric"].includes(String(config.units || "auto").toLowerCase())
      ? String(config.units || "auto").toLowerCase()
      : "auto";
    const radarStyle = String(config.radar_style || "standard").toLowerCase();
    const radarBasemap = String(config.radar_basemap || "light").toLowerCase();
    return {
      title: "Local Weather",
      country: WEATHERWISE_COUNTRIES[country] ? country : "global",
      radar_provider: WEATHERWISE_RADAR[radarProvider] ? radarProvider : "auto",
      theme_mode: themeMode,
      units,
      hourly_count: 5,
      show_radar: true,
      show_map_controls: true,
      radar_controls: true,
      radar_style: "standard",
      radar_basemap: "light",
      radar_zoom: 7,
      radar_speed: 700,
      debug: { enabled: false, panel: false },
      ...config,
      radar_style: WEATHERWISE_RADAR_STYLES[radarStyle] ? radarStyle : "standard",
      radar_basemap: WEATHERWISE_BASEMAPS[radarBasemap] ? radarBasemap : "light",
      latitude: this._numberOr(config.latitude, undefined),
      longitude: this._numberOr(config.longitude, undefined),
      hourly_count: Math.max(1, Math.min(24, Number(config.hourly_count) || 5)),
      show_radar: config.show_radar !== false,
      show_map_controls: config.show_map_controls !== false,
      radar_controls: config.radar_controls !== false,
      radar_speed: Math.max(300, Math.min(3000, Number(config.radar_speed) || 700))
    };
  }

  _renderKey() {
    const stateObj = this._hass?.states?.[this._config.entity];
    const attrs = stateObj?.attributes || {};
    return JSON.stringify({
      entity: this._config.entity,
      state: stateObj?.state,
      updated: stateObj?.last_updated,
      temp: attrs.temperature,
      humidity: attrs.humidity,
      wind: attrs.wind_speed,
      bearing: attrs.wind_bearing,
      forecast: [
        this._forecasts.hourly?.length || 0,
        this._forecasts.daily?.length || 0,
        this._forecasts.twice_daily?.length || 0
      ],
      config: [
        this._config.title,
        this._config.country,
        this._config.radar_provider,
        this._config.radar_style,
        this._config.radar_basemap,
        this._config.theme_mode,
        this._config.units,
        this._config.show_radar,
        this._config.radar_controls,
        this._config.hourly_count
      ]
    });
  }

  async _loadForecasts(entityId) {
    if (!this._hass?.connection?.sendMessagePromise) return;
    const types = ["hourly", "daily", "twice_daily"];
    const entries = await Promise.all(types.map(async (type) => {
      try {
        const response = await this._hass.connection.sendMessagePromise({
          type: "call_service",
          domain: "weather",
          service: "get_forecasts",
          service_data: { type },
          target: { entity_id: entityId },
          return_response: true
        });
        return [type, this._extractForecast(response, entityId)];
      } catch (err) {
        return [type, []];
      }
    }));
    this._forecasts = Object.fromEntries(entries);
    this._lastRenderKey = "";
    this._render();
  }

  _extractForecast(response, entityId) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.forecast)) return response.forecast;
    const serviceResponse = response.service_response || response.response || response;
    const byEntity = serviceResponse?.[entityId] || Object.values(serviceResponse || {})[0];
    return Array.isArray(byEntity?.forecast) ? byEntity.forecast : [];
  }

  _render() {
    if (!this.shadowRoot || !this._config.entity) return;
    const stateObj = this._hass?.states?.[this._config.entity];
    const attrs = stateObj?.attributes || {};
    const condition = stateObj?.state || "unavailable";
    const title = this._config.title || attrs.friendly_name || "Local Weather";
    const units = this._unitContext(attrs);
    const temp = this._displayTemp(attrs.temperature, units);
    const humidity = this._formatNumber(attrs.humidity);
    const wind = this._formatWind(attrs, units);
    const hourly = this._forecasts.hourly || [];
    const daily = this._forecasts.daily || [];
    const twiceDaily = this._forecasts.twice_daily || [];
    const mainPeriods = twiceDaily.length ? twiceDaily : daily.length ? daily : hourly;
    const hiLo = this._formatHiLo(daily, hourly, units);
    const sun = this._hass?.states?.["sun.sun"]?.attributes || {};
    const now = new Date();
    const unavailable = !stateObj || condition === "unavailable" || condition === "unknown";
    const provider = this._resolvedRadarProvider();

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        <div class="card-outer">
          <div class="card-grid ${this._config.show_radar && provider !== "none" ? "" : "no-radar"}">
            <section class="left">
              <div class="header">
                <div class="title">${this._escape(title)}</div>
                <div class="subtitle">${this._escape(WEATHERWISE_COUNTRIES[this._config.country])}</div>
              </div>
              <div class="clock-row">
                <div class="clock-time" id="clock-time">${this._clockTime(now)}</div>
                <div class="clock-ampm" id="clock-ampm">${now.getHours() >= 12 ? "PM" : "AM"}</div>
              </div>
              <div class="clock-date" id="clock-date">${this._longDate(now)}</div>
              <div class="section-title">Hourly</div>
              <div class="hourly-left">${this._renderHourly(hourly, units)}</div>
            </section>
            <section class="center">
              <div class="current-row">
                <div class="current-icon">${this._icon(condition, 62)}</div>
                <div class="cond-block">
                  <div class="current-label">Current Weather</div>
                  <div class="cond-name">${unavailable ? "Connect weather in Home Assistant" : this._titleCase(condition)}</div>
                  <div class="updated-note">${unavailable ? "Waiting for live weather data" : `Updated ${this._shortTime(now)}`}</div>
                </div>
                <div class="temp-block">
                  <div class="temp-now">${temp}</div>
                  <div class="temp-hilo">${hiLo}</div>
                </div>
              </div>
              <div class="daily-strip">${this._renderDaily(mainPeriods, units)}</div>
              <div class="stats-row">
                ${this._stat("humidity", "Humidity", `${humidity}%`)}
                ${this._stat("wind", "Wind", wind)}
                ${this._stat("sunrise", "Sunrise", this._shortTime(sun.next_rising))}
                ${this._stat("sunset", "Sunset", this._shortTime(sun.next_setting))}
              </div>
              ${this._renderDebug({ stateObj, hourly, daily, twiceDaily, provider, units })}
            </section>
            ${this._config.show_radar && provider !== "none" ? `
              <section class="right">
                <div id="rmap"></div>
                ${this._config.radar_controls === false ? "" : `
                  <div class="radar-controls" aria-label="Radar playback controls">
                    <button type="button" data-radar-action="prev" title="Previous radar frame" aria-label="Previous radar frame">&lt;</button>
                    <button type="button" data-radar-action="play" title="Pause radar loop" aria-label="Pause radar loop">||</button>
                    <button type="button" data-radar-action="next" title="Next radar frame" aria-label="Next radar frame">&gt;</button>
                  </div>
                `}
                <div class="radar-lbl" id="radar-lbl">Radar loading...</div>
              </section>
            ` : ""}
          </div>
        </div>
      </ha-card>
    `;

    if (this._config.show_radar && provider !== "none") {
      this._teardownRadar();
      this._radarProviderRendered = provider;
      this._wireRadarControls();
      window.requestAnimationFrame(() => this._scheduleRadarInit(provider));
    }
    this._updateClock();
  }

  _wireRadarControls() {
    this.shadowRoot?.querySelectorAll("[data-radar-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const action = button.dataset.radarAction;
        if (action === "play") this._toggleRadarPlayback();
        if (action === "prev") this._stepRadar(-1);
        if (action === "next") this._stepRadar(1);
      });
    });
  }

  _scheduleRadarInit(provider) {
    const holder = this.shadowRoot?.getElementById("rmap");
    if (!holder) return;
    const rect = holder.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) {
      window.setTimeout(() => this._scheduleRadarInit(provider), 250);
      return;
    }
    this._initRadar(provider);
  }

  _renderDebug(data) {
    const debug = this._config.debug;
    if (!debug || debug.enabled !== true || debug.panel !== true) return "";
    const rows = [
      ["Version", CARD_VERSION],
      ["Entity", this._config.entity],
      ["Country", this._config.country],
      ["Radar", data.provider],
      ["Units", data.units.temperatureUnit],
      ["Hourly count", data.hourly.length],
      ["Daily count", data.daily.length],
      ["Twice daily count", data.twiceDaily.length],
      ["State", data.stateObj?.state || "missing"]
    ];
    return `
      <details class="debug-panel">
        <summary>Debug</summary>
        ${rows.map(([key, value]) => `<div class="debug-row"><span>${key}</span><code>${this._escape(value)}</code></div>`).join("")}
      </details>
    `;
  }

  _updateClock() {
    const now = new Date();
    const time = this.shadowRoot?.getElementById("clock-time");
    const ampm = this.shadowRoot?.getElementById("clock-ampm");
    const date = this.shadowRoot?.getElementById("clock-date");
    if (time) time.textContent = this._clockTime(now);
    if (ampm) ampm.textContent = now.getHours() >= 12 ? "PM" : "AM";
    if (date) date.textContent = this._longDate(now);
  }

  _renderHourly(hours, units) {
    if (!hours.length) return `<div class="loading-note">Waiting for hourly forecast.</div>`;
    const slice = hours.slice(0, Number(this._config.hourly_count) || 5);
    const temps = slice.map((item) => this._tempValue(item.temperature, units)).filter(Number.isFinite);
    const min = temps.length ? Math.min(...temps) : 0;
    const max = temps.length ? Math.max(...temps) : 10;
    const range = Math.max(max - min, 4);
    return slice.map((item) => {
      const temp = this._tempValue(item.temperature, units);
      const pct = Number.isFinite(temp) ? Math.max(12, Math.round(((temp - min) / range) * 80 + 12)) : 12;
      return `
        <div class="hour-row">
          <div class="hour-time-left">${this._hour(item.datetime)}</div>
          <div class="hour-icon-left">${this._icon(item.condition || item.state, 23)}</div>
          <div class="hour-temp-left">${this._displayTemp(item.temperature, units, false)}</div>
          <div class="hour-bar-wrap"><div class="hour-bar-fill" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join("");
  }

  _renderDaily(periods, units) {
    if (!periods.length) return `<div class="loading-note">Waiting for Home Assistant forecast data.</div>`;
    return periods.slice(0, 5).map((item) => {
      const period = item.is_daytime === undefined ? "" : item.is_daytime ? "Day" : "Night";
      return `
        <div class="fc-slot">
          <div>
            <div class="fc-day">${this._dayName(item.datetime)}</div>
            <div class="fc-period">${period}</div>
          </div>
          <div class="fc-icon">${this._icon(item.condition || item.state, 48)}</div>
          <div class="fc-temp">${this._displayTemp(item.temperature, units, false)}</div>
        </div>
      `;
    }).join("");
  }

  _stat(kind, label, value) {
    const icons = {
      humidity: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3s6 6.1 6 11a6 6 0 1 1-12 0c0-4.9 6-11 6-11Z" fill="#65b8df"/><path d="M9.2 16.4c.7 1.3 1.8 2 3.4 2" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>`,
      wind: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 8h10.4a3 3 0 1 0-2.6-4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3 13h15.4a3 3 0 1 1-2.6 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
      sunrise: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 15a5 5 0 0 1 10 0" fill="#fbbf24"/><path d="M12 4v4M5 11l3 1M19 11l-3 1" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/></svg>`,
      sunset: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 15a5 5 0 0 1 10 0" fill="#f59e0b"/><path d="M12 8V4M5 11l3 1M19 11l-3 1" stroke="#7c3aed" stroke-width="2" stroke-linecap="round"/></svg>`
    };
    return `<div class="stat"><div class="stat-ico" aria-hidden="true">${icons[kind]}</div><div><div class="stat-lbl">${label}</div><div class="stat-val">${this._escape(value || "--")}</div></div></div>`;
  }

  async _initRadar(provider) {
    const holder = this.shadowRoot?.getElementById("rmap");
    if (!holder || this._radarMap) return;
    await this._loadLeaflet();
    if (!window.L || !holder.isConnected) return;
    const { lat, lon } = this._latLon();
    this._radarMap = window.L.map(holder, {
      center: [lat, lon],
      zoom: Number(this._config.radar_zoom) || 7,
      zoomControl: this._config.show_map_controls !== false,
      attributionControl: true
    });
    const basemap = this._basemap();
    window.L.tileLayer(basemap.url, basemap.options).addTo(this._radarMap);
    window.L.circleMarker([lat, lon], {
      radius: 5,
      color: "#1a3a50",
      fillColor: "#1a3a50",
      fillOpacity: 1,
      weight: 2
    }).addTo(this._radarMap);
    this._radarMap.invalidateSize();
    window.setTimeout(() => this._radarMap?.invalidateSize(), 250);
    window.setTimeout(() => this._radarMap?.invalidateSize(), 1000);
    await this._loadRadarLoop(provider);
    this._radarMap.on("moveend zoomend", () => {
      window.clearTimeout(this._radarReloadTimer);
      this._radarReloadTimer = window.setTimeout(() => this._loadRadarLoop(provider), 500);
    });
  }

  _teardownRadar() {
    window.clearInterval(this._radarTimer);
    window.clearTimeout(this._radarReloadTimer);
    this._radarLayers.forEach((item) => item.layer?.remove?.());
    this._radarLayers = [];
    this._radarIndex = 0;
    if (this._radarMap) {
      this._radarMap.remove();
      this._radarMap = null;
    }
  }

  async _loadLeaflet() {
    if (window.L) return;
    if (!document.querySelector("link[data-weatherwise-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.weatherwiseLeaflet = "true";
      document.head.appendChild(link);
    }
    if (!document.querySelector("script[data-weatherwise-leaflet]")) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.dataset.weatherwiseLeaflet = "true";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }

  _resolvedRadarProvider() {
    if (this._config.show_radar === false) return "none";
    if (this._config.radar_provider === "none") return "none";
    if (this._config.radar_provider === "noaa") return "noaa";
    if (this._config.radar_provider === "rainviewer") return "rainviewer";
    return this._config.country === "us" ? "noaa" : "rainviewer";
  }

  async _loadRadarLoop(provider) {
    if (!this._radarMap || !window.L) return;
    if (provider === "rainviewer") {
      await this._loadRainViewerLoop();
      return;
    }
    await this._loadNoaaLoop();
  }

  async _loadRainViewerLoop() {
    const label = this.shadowRoot?.getElementById("radar-lbl");
    try {
      const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      const data = await response.json();
      const frames = data?.radar?.past || [];
      const host = data?.host || "https://tilecache.rainviewer.com";
      if (!frames.length) throw new Error("No RainViewer frames");
      this._radarLabelText = "RainViewer radar";
      this._replaceRadarLayers(frames.slice(-12).map((frame, index, list) => ({
        time: new Date(frame.time * 1000),
        layer: window.L.tileLayer(`${host}${frame.path}/256/{z}/{x}/{y}/${this._rainViewerColor()}/1_1.png`, {
          opacity: index === list.length - 1 ? this._radarOpacity() : 0,
          zIndex: 20,
          attribution: "Radar &copy; RainViewer"
        })
      })));
      if (label) label.textContent = `${this._shortTime(this._radarLayers[this._radarLayers.length - 1].time)} RainViewer radar`;
      this._animateRadar("RainViewer radar");
    } catch (err) {
      if (label) label.textContent = "RainViewer radar unavailable";
    }
  }

  async _loadNoaaLoop() {
    const frames = this._noaaFrames();
    this._radarLabelText = "NOAA radar loop";
    this._replaceRadarLayers(frames.map((frameTime, index) => ({
      time: frameTime,
      layer: window.L.imageOverlay(this._noaaUrl(frameTime), this._radarMap.getBounds(), {
        opacity: index === frames.length - 1 ? this._radarOpacity() : 0,
        zIndex: 20,
        interactive: false
      })
    })));
    const label = this.shadowRoot?.getElementById("radar-lbl");
    if (label) label.textContent = `${this._shortTime(frames.at(-1))} NOAA radar loop`;
    this._animateRadar("NOAA radar loop");
  }

  _replaceRadarLayers(layers) {
    window.clearInterval(this._radarTimer);
    this._radarLayers.forEach((item) => item.layer?.remove?.());
    this._radarLayers = layers;
    this._radarIndex = Math.max(0, layers.length - 1);
    this._radarLayers.forEach((item) => item.layer.addTo(this._radarMap));
    this._showRadarFrame(this._radarIndex);
  }

  _animateRadar(labelText) {
    this._radarLabelText = labelText;
    this._radarTimer = window.setInterval(() => {
      if (!this._radarPlaying) return;
      this._stepRadar(1, false);
    }, this._config.radar_speed || 700);
    this._updateRadarPlayButton();
  }

  _toggleRadarPlayback() {
    this._radarPlaying = !this._radarPlaying;
    this._updateRadarPlayButton();
  }

  _updateRadarPlayButton() {
    const button = this.shadowRoot?.querySelector('[data-radar-action="play"]');
    if (!button) return;
    button.textContent = this._radarPlaying ? "||" : ">";
    button.title = this._radarPlaying ? "Pause radar loop" : "Play radar loop";
    button.setAttribute("aria-label", button.title);
  }

  _stepRadar(delta, pause = true) {
    if (!this._radarLayers.length) return;
    if (pause) {
      this._radarPlaying = false;
      this._updateRadarPlayButton();
    }
    this._radarIndex = (this._radarIndex + delta + this._radarLayers.length) % this._radarLayers.length;
    this._showRadarFrame(this._radarIndex);
  }

  _showRadarFrame(index) {
    if (!this._radarLayers.length) return;
    this._radarLayers.forEach((item, layerIndex) => item.layer.setOpacity(layerIndex === index ? this._radarOpacity() : 0));
    const active = this._radarLayers[index];
    const label = this.shadowRoot?.getElementById("radar-lbl");
    if (label && active) label.textContent = `${this._shortTime(active.time)} ${this._radarLabelText}`;
  }

  _noaaFrames() {
    const stepMs = 5 * 60 * 1000;
    const roundedNow = Math.floor(Date.now() / stepMs) * stepMs;
    return Array.from({ length: 12 }, (_, i) => new Date(roundedNow - (11 - i) * stepMs));
  }

  _noaaUrl(frameTime) {
    const bounds = this._radarMap.getBounds();
    const size = this._radarMap.getSize();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const service = "https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer";
    return `${service}/exportImage?bbox=${encodeURIComponent([sw.lng, sw.lat, ne.lng, ne.lat].join(","))}&bboxSR=4326&imageSR=4326&size=${Math.max(256, Math.round(size.x))},${Math.max(256, Math.round(size.y))}&format=png32&transparent=true&f=image&time=${frameTime.getTime()}&_=${Date.now()}`;
  }

  _radarOpacity() {
    const values = { standard: 0.76, vivid: 0.9, soft: 0.58 };
    return values[this._config.radar_style] ?? values.standard;
  }

  _rainViewerColor() {
    const values = { standard: 2, vivid: 4, soft: 1 };
    return values[this._config.radar_style] ?? values.standard;
  }

  _basemap() {
    const basemaps = {
      dark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        options: { subdomains: "abcd", maxZoom: 19, attribution: "&copy; OpenStreetMap &copy; CARTO" }
      },
      osm: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        options: { maxZoom: 19, attribution: "&copy; OpenStreetMap" }
      },
      light: {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        options: { subdomains: "abcd", maxZoom: 19, attribution: "&copy; OpenStreetMap &copy; CARTO" }
      }
    };
    return basemaps[this._config.radar_basemap] || basemaps.light;
  }

  _unitContext(attrs) {
    const nativeTemp = attrs.temperature_unit || attrs.native_temperature_unit || this._hass?.config?.unit_system?.temperature || "°F";
    const target = this._config.units === "metric" ? "°C" : this._config.units === "imperial" ? "°F" : nativeTemp;
    return {
      sourceTemperatureUnit: nativeTemp,
      temperatureUnit: target,
      windSpeedUnit: attrs.wind_speed_unit || (target === "°C" ? "km/h" : "mph")
    };
  }

  _tempValue(value, units) {
    const number = this._numberOr(value, NaN);
    if (!Number.isFinite(number)) return NaN;
    if (units.sourceTemperatureUnit === units.temperatureUnit) return number;
    if (units.sourceTemperatureUnit === "°F" && units.temperatureUnit === "°C") return (number - 32) * 5 / 9;
    if (units.sourceTemperatureUnit === "°C" && units.temperatureUnit === "°F") return (number * 9 / 5) + 32;
    return number;
  }

  _displayTemp(value, units, includeUnit = true) {
    const number = this._tempValue(value, units);
    const rounded = Number.isFinite(number) ? String(Math.round(number)) : "--";
    return `${rounded}°${includeUnit ? units.temperatureUnit.replace("°", "") : ""}`;
  }

  _formatHiLo(daily, hourly, units) {
    let hi = this._tempValue(daily?.[0]?.temperature ?? daily?.[0]?.high_temperature, units);
    let lo = this._tempValue(daily?.[0]?.templow ?? daily?.[0]?.low_temperature, units);
    if ((!Number.isFinite(hi) || !Number.isFinite(lo)) && hourly.length) {
      const next24 = hourly.slice(0, 24).map((item) => this._tempValue(item.temperature, units)).filter(Number.isFinite);
      if (next24.length) {
        hi = Math.max(...next24);
        lo = Math.min(...next24);
      }
    }
    return `${Number.isFinite(hi) ? Math.round(hi) : "--"}° / ${Number.isFinite(lo) ? Math.round(lo) : "--"}°`;
  }

  _formatWind(attrs, units) {
    const speed = this._formatNumber(attrs.wind_speed);
    const bearing = Number(attrs.wind_bearing);
    const dir = Number.isFinite(bearing) ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(bearing / 45) % 8] : "";
    return `${dir ? `${dir} ` : ""}${speed} ${attrs.wind_speed_unit || units.windSpeedUnit}`;
  }

  _latLon() {
    return {
      lat: this._numberOr(this._config.latitude, this._numberOr(this._hass?.config?.latitude, 0)),
      lon: this._numberOr(this._config.longitude, this._numberOr(this._hass?.config?.longitude, 0))
    };
  }

  _numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  _formatNumber(value) {
    const number = this._numberOr(value, NaN);
    return Number.isFinite(number) ? String(Math.round(number)) : "--";
  }

  _clockTime(date) {
    return `${(date.getHours() % 12) || 12}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  _shortTime(dateLike) {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return "--";
    return `${(date.getHours() % 12) || 12}:${String(date.getMinutes()).padStart(2, "0")} ${date.getHours() >= 12 ? "PM" : "AM"}`;
  }

  _hour(dateLike) {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return "--";
    return `${(date.getHours() % 12) || 12} ${date.getHours() >= 12 ? "PM" : "AM"}`;
  }

  _dayName(dateLike) {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return "--";
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  }

  _longDate(date) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  _titleCase(text) {
    const raw = String(text || "--");
    const fixed = raw.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
    const overrides = {
      partlycloudy: "Partly Cloudy",
      partly_cloudy: "Partly Cloudy",
      mostlycloudy: "Mostly Cloudy",
      mostly_cloudy: "Mostly Cloudy",
      clear_night: "Clear Night"
    };
    return overrides[raw.toLowerCase()] || fixed.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  _escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  _icon(condition, size = 36) {
    const c = String(condition || "").toLowerCase().replace(/[-_]/g, " ");
    if (c.includes("lightning") || c.includes("thunder")) return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><ellipse cx="22" cy="15" rx="11" ry="8" fill="#94a3b8"/><ellipse cx="14" cy="18" rx="9" ry="6" fill="#cbd5e1"/><polygon points="22,22 16,34 21,31 17,41 28,27 22,30" fill="#fbbf24"/><line x1="14" y1="28" x2="12" y2="34" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/><line x1="27" y1="28" x2="25" y2="34" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/></svg>`;
    if (c.includes("rain") || c.includes("shower") || c.includes("drizzle")) return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><ellipse cx="22" cy="14" rx="11" ry="8" fill="#94a3b8"/><ellipse cx="14" cy="17" rx="9" ry="6" fill="#cbd5e1"/><line x1="14" y1="26" x2="12" y2="33" stroke="#38bdf8" stroke-width="2.3" stroke-linecap="round"/><line x1="20" y1="26" x2="18" y2="33" stroke="#38bdf8" stroke-width="2.3" stroke-linecap="round"/><line x1="26" y1="26" x2="24" y2="33" stroke="#38bdf8" stroke-width="2.3" stroke-linecap="round"/></svg>`;
    if (c.includes("snow") || c.includes("sleet") || c.includes("hail")) return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><ellipse cx="22" cy="14" rx="11" ry="8" fill="#94a3b8"/><ellipse cx="14" cy="17" rx="9" ry="6" fill="#cbd5e1"/><text x="10" y="34" font-size="13" fill="#93c5fd">*</text><text x="23" y="34" font-size="13" fill="#93c5fd">*</text></svg>`;
    if (c.includes("sunny") || c.includes("clear")) return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="8.5" fill="#fbbf24"/><g stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"><line x1="20" y1="4" x2="20" y2="8"/><line x1="20" y1="32" x2="20" y2="36"/><line x1="4" y1="20" x2="8" y2="20"/><line x1="32" y1="20" x2="36" y2="20"/></g></svg>`;
    if (c.includes("partly") || c.includes("mostly cloudy") || c.includes("mostlycloudy")) return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><circle cx="14" cy="19" r="7" fill="#fbbf24"/><ellipse cx="26" cy="22" rx="11" ry="8" fill="#94a3b8"/><ellipse cx="18" cy="25" rx="9" ry="7" fill="#cbd5e1"/></svg>`;
    if (c.includes("fog") || c.includes("mist")) return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><line x1="8" y1="16" x2="32" y2="16" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><line x1="6" y1="22" x2="34" y2="22" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="28" x2="30" y2="28" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/></svg>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><ellipse cx="23" cy="17" rx="12" ry="9" fill="#94a3b8"/><ellipse cx="14" cy="21" rx="9" ry="7" fill="#cbd5e1"/></svg>`;
  }

  _styles() {
    return `
      :host{--ww-wave:#2a7a94;--ww-wave-dark:#1a5f72;--ww-gold:#e8b84b;--ww-text:#0a1e28;--ww-muted:#1e4d5e;--ww-panel:rgba(255,255,255,0.35);--ww-line:rgba(42,122,148,0.20);display:block;color:var(--ww-text);font-family:var(--ha-font-family-body,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,Arial,sans-serif)}
      :host([theme-mode="auto"]){--ww-wave:var(--primary-color,#2a7a94);--ww-wave-dark:var(--accent-color,var(--primary-color,#1a5f72));--ww-gold:var(--warning-color,#e8b84b);--ww-text:var(--primary-text-color,#0a1e28);--ww-muted:var(--secondary-text-color,#1e4d5e);--ww-panel:color-mix(in srgb,var(--card-background-color,#fff) 76%,transparent);--ww-line:color-mix(in srgb,var(--primary-color,#2a7a94) 30%,transparent)}
      ha-card{background:transparent!important;box-shadow:none!important;border-radius:22px!important;overflow:hidden}
      *{box-sizing:border-box}
      .card-outer{container-type:inline-size;background:rgba(232,246,250,0.74);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:22px;border:1px solid rgba(255,255,255,0.42);box-shadow:0 4px 28px rgba(0,0,0,0.10);position:relative;overflow:hidden}
      :host([theme-mode="auto"]) .card-outer{background:linear-gradient(135deg,color-mix(in srgb,var(--card-background-color,#fff) 88%,transparent),color-mix(in srgb,var(--primary-color,#2a7a94) 14%,var(--card-background-color,#fff)))}
      .card-outer::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--ww-wave) 62%,transparent),transparent)}
      .card-grid{display:grid;grid-template-columns:minmax(300px,24%) minmax(560px,1fr) minmax(430px,32%);height:var(--weatherwise-card-height,clamp(386px,20cqw,440px));min-height:0;max-height:var(--weatherwise-card-max-height,480px)}
      .card-grid.no-radar{grid-template-columns:minmax(260px,34%) minmax(0,1fr)}
      .left{min-width:0;display:flex;flex-direction:column;padding:12px 22px 10px;background:linear-gradient(90deg,rgba(255,255,255,0.20),rgba(255,255,255,0.08));border-right:1px solid rgba(255,255,255,0.22);overflow:hidden}
      .header{display:flex;align-items:baseline;gap:10px;margin-bottom:5px;flex-wrap:wrap}
      .title{font-size:28px;font-weight:800;color:var(--ww-text);white-space:nowrap;letter-spacing:0}
      .subtitle{font-size:13px;color:var(--ww-muted);letter-spacing:.05em;text-transform:uppercase;font-weight:650;white-space:nowrap}
      .clock-row{display:flex;align-items:baseline;gap:8px;line-height:1}
      .clock-time{font-size:64px;font-weight:500;color:var(--ww-text);letter-spacing:0}
      .clock-ampm{font-size:18px;font-weight:750;color:var(--ww-muted)}
      .clock-date{font-size:14px;color:var(--ww-muted);font-weight:750;margin-top:7px;margin-bottom:10px}
      .section-title,.current-label{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ww-muted);font-weight:750;white-space:nowrap}
      .hourly-left{display:flex;flex:1;min-height:0;flex-direction:column;gap:7px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;padding-bottom:2px}
      .hourly-left::-webkit-scrollbar{display:none}
      .hour-row{display:grid;grid-template-columns:48px 24px 42px 1fr;align-items:center;gap:8px;min-height:28px;padding:3px 8px;border-radius:10px;background:var(--ww-panel);border:1px solid var(--ww-line)}
      .hour-time-left{font-size:12px;color:var(--ww-muted);font-weight:750;text-transform:uppercase}
      .hour-icon-left{width:23px;height:23px;display:flex;align-items:center;justify-content:center}
      .hour-temp-left{font-size:13px;font-weight:800;color:var(--ww-text);text-align:right}
      .hour-bar-wrap{height:7px;border-radius:999px;background:rgba(18,59,83,0.10);position:relative;overflow:hidden}
      .hour-bar-fill{position:absolute;top:0;left:0;height:100%;border-radius:999px;background:linear-gradient(90deg,#58b7c7,var(--ww-wave))}
      .center{min-width:0;display:flex;flex-direction:column;padding:18px 24px;border-right:1px solid rgba(255,255,255,0.22);overflow:hidden}
      .current-row{display:flex;align-items:center;gap:16px;margin-bottom:10px;min-width:0;overflow:hidden}
      .current-icon{width:62px;height:62px;flex-shrink:0;display:grid;place-items:center}
      .cond-block{flex:1;min-width:0}
      .cond-name{font-size:28px;font-weight:720;color:var(--ww-text);line-height:1.05;overflow-wrap:anywhere}
      .updated-note{font-size:11px;color:var(--ww-muted);font-weight:750;margin-top:5px;text-transform:uppercase;letter-spacing:.04em}
      .temp-block{text-align:right;flex-shrink:0;min-width:max-content}
      .temp-now{font-size:52px;font-weight:750;color:var(--ww-text);line-height:1;letter-spacing:0}
      .temp-hilo{font-size:16px;color:var(--ww-muted);font-weight:700;margin-top:8px}
      .daily-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;min-height:140px;max-height:166px;margin-bottom:8px;flex:1}
      .fc-slot{display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:8px 6px;background:var(--ww-panel);border-radius:14px;border:1px solid var(--ww-line);min-width:0}
      .fc-day{font-size:16px;font-weight:720;color:var(--ww-text);text-transform:uppercase;line-height:1.05;text-align:center}
      .fc-period{font-size:11px;font-weight:800;color:var(--ww-muted);text-transform:uppercase;letter-spacing:.045em;margin-top:2px;min-height:13px;line-height:1.05;text-align:center}
      .fc-icon{width:50px;height:50px;margin:2px 0 1px;display:flex;align-items:center;justify-content:center}
      .fc-icon svg{width:46px;height:46px}
      .fc-temp{font-size:34px;font-weight:800;color:var(--ww-text);letter-spacing:0;line-height:.95}
      .stats-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:5px;flex-shrink:0}
      .stat{background:var(--ww-panel);border:1px solid var(--ww-line);border-radius:12px;padding:7px 10px;display:flex;align-items:center;gap:9px;min-height:50px;min-width:0}
      .stat-ico{width:21px;height:21px;flex:0 0 21px;color:var(--ww-wave)}
      .stat-ico svg{width:21px;height:21px}
      .stat-lbl{font-size:9px;color:var(--ww-muted);font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
      .stat-val{font-size:14px;font-weight:800;color:var(--ww-text);white-space:nowrap}
      .right{min-width:0;position:relative;overflow:hidden;border-radius:0 22px 22px 0}
      #rmap{width:100%;height:100%;min-height:0}
      .leaflet-container{height:100%;width:100%;position:relative;overflow:hidden;outline-offset:1px;background:#d7dee2;font-family:inherit;font-size:12px;line-height:1.5;z-index:0}
      .leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}
      .leaflet-container img.leaflet-tile,.leaflet-container img.leaflet-image-layer{max-width:none!important;max-height:none!important}
      .leaflet-tile{filter:inherit;visibility:hidden}
      .leaflet-tile-loaded{visibility:inherit}
      .leaflet-map-pane canvas{z-index:100}
      .leaflet-map-pane svg{z-index:200}
      .leaflet-tile-pane{z-index:200}
      .leaflet-overlay-pane{z-index:400}
      .leaflet-marker-pane{z-index:600}
      .leaflet-tooltip-pane{z-index:650}
      .leaflet-popup-pane{z-index:700}
      .leaflet-control{position:relative;z-index:800;pointer-events:auto;float:left;clear:both}
      .leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}
      .leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}
      .leaflet-control-zoom{margin-left:10px;margin-top:10px}
      .leaflet-control-zoom a{display:block;text-align:center;text-decoration:none}
      .leaflet-control-attribution{position:absolute;right:0;bottom:0;margin:0;padding:0 5px}
      .radar-lbl{position:absolute;bottom:10px;left:12px;font-size:12px;color:rgba(10,30,46,0.76);background:rgba(255,255,255,0.78);border:1px solid rgba(255,255,255,0.55);padding:4px 10px;border-radius:99px;font-weight:800;z-index:1000;pointer-events:none}
      .radar-controls{position:absolute;top:10px;right:10px;display:flex;gap:6px;z-index:1001}
      .radar-controls button{width:31px;height:31px;border:1px solid rgba(255,255,255,.62);border-radius:999px;background:rgba(255,255,255,.78);color:#0a1e2e;box-shadow:0 2px 10px rgba(10,30,46,.12);font:800 15px/1 var(--ha-font-family-body,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif);display:grid;place-items:center;cursor:pointer;padding:0}
      .radar-controls button:hover{background:rgba(255,255,255,.94)}
      .leaflet-control-zoom{border:0!important;box-shadow:0 2px 12px rgba(10,30,46,.13)!important}
      .leaflet-control-zoom a{width:34px!important;height:34px!important;line-height:31px!important;color:#0a1e2e!important;background:rgba(255,255,255,.82)!important;border-color:rgba(10,30,46,.10)!important;font-weight:650!important}
      .leaflet-control-attribution{background:rgba(255,255,255,.70)!important;color:rgba(10,30,46,.72)!important}
      .loading-note{font-size:12px;color:var(--ww-muted);font-weight:800;opacity:.8;padding:10px}
      .daily-strip>.loading-note{grid-column:1 / -1;align-self:center}
      .debug-panel{margin-top:10px;background:var(--ww-panel);border:1px solid var(--ww-line);border-radius:12px;padding:8px;font-size:12px;color:var(--ww-muted)}
      .debug-row{display:flex;justify-content:space-between;gap:12px;padding:3px 0}
      .debug-row code{color:var(--ww-text)}
      @container(max-width:1500px){.card-grid{grid-template-columns:minmax(300px,24%) minmax(560px,1fr) minmax(430px,32%)}.left{padding:12px 18px 10px}.center{padding:16px 20px}.clock-time{font-size:58px}.temp-now{font-size:46px}.cond-name{font-size:25px}.daily-strip{min-height:130px;max-height:150px}.hour-row{grid-template-columns:44px 22px 34px 1fr;gap:6px}.stat{padding:6px 8px;gap:7px}}
      @container(max-width:1180px){.card-grid{grid-template-columns:minmax(250px,30%) minmax(0,1fr);height:var(--weatherwise-card-height,clamp(520px,52cqw,620px))}.center{border-right:0}.right{grid-column:1 / -1;height:220px;border-top:1px solid rgba(255,255,255,0.28);border-radius:0 0 22px 22px}#rmap{height:220px}.daily-strip{min-height:150px;max-height:none}}
      @container(max-width:720px){.card-grid,.card-grid.no-radar{display:flex;flex-direction:column;height:auto;max-height:none}.left,.center{border-right:0;overflow:visible}.clock-time{font-size:48px}.current-row{align-items:flex-start;gap:12px;flex-wrap:wrap}.temp-block{text-align:left}.daily-strip{grid-template-columns:repeat(3,minmax(0,1fr));max-height:none}.stats-row{grid-template-columns:repeat(2,minmax(0,1fr))}.right,#rmap{height:300px;min-height:300px}.title{font-size:24px}}
      @media(max-width:760px){.card-grid,.card-grid.no-radar{display:flex;flex-direction:column;height:auto;max-height:none}.left,.center{border-right:0;overflow:visible}.clock-time{font-size:48px}.current-row{align-items:flex-start;gap:12px;flex-wrap:wrap}.temp-block{text-align:left}.daily-strip{grid-template-columns:repeat(3,minmax(0,1fr));max-height:none}.stats-row{grid-template-columns:repeat(2,minmax(0,1fr))}.right,#rmap{height:300px;min-height:300px}.title{font-size:24px}}
    `;
  }
}

class WeatherWiseCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this._config = { ...WeatherWiseCard.getStubConfig(), ...(config || {}) };
    this._render();
  }

  _weatherEntities() {
    return Object.entries(this._hass?.states || {})
      .filter(([entityId]) => entityId.startsWith("weather."))
      .sort(([a], [b]) => a.localeCompare(b));
  }

  _setValue(key, value) {
    const numberKeys = ["latitude", "longitude", "hourly_count", "radar_zoom", "radar_speed"];
    const booleanKeys = ["show_radar", "show_map_controls", "radar_controls"];
    let nextValue = value;
    if (numberKeys.includes(key)) nextValue = value === "" ? undefined : Number(value);
    if (booleanKeys.includes(key)) nextValue = Boolean(value);
    this._config = { ...this._config, [key]: nextValue };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
    this._render();
  }

  _render() {
    if (!this.shadowRoot) return;
    const config = this._config || {};
    const entities = this._weatherEntities();
    const hasConfiguredEntity = entities.some(([entityId]) => entityId === config.entity);
    const configuredOption = config.entity && !hasConfiguredEntity
      ? `<option value="${config.entity}" selected>${config.entity}</option>`
      : "";
    const weatherOptions = entities.map(([entityId, state]) => {
      const name = state.attributes?.friendly_name || entityId;
      return `<option value="${entityId}" ${config.entity === entityId ? "selected" : ""}>${name} (${entityId})</option>`;
    }).join("");
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;font-family:var(--ha-font-family-body,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif);color:var(--primary-text-color,#0a1e28)}
        .editor{display:grid;gap:14px}
        .section{border:1px solid var(--divider-color,rgba(0,0,0,.12));border-radius:12px;padding:12px;background:var(--card-background-color,#fff)}
        .section-title{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--secondary-text-color,#536b75);margin-bottom:10px}
        label{display:grid;gap:5px;font-size:13px;font-weight:700;color:var(--secondary-text-color,#536b75)}
        input,select{width:100%;box-sizing:border-box;border:1px solid var(--divider-color,rgba(0,0,0,.18));border-radius:8px;padding:9px 10px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#0a1e28);font:inherit}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .hint{font-size:12px;line-height:1.4;color:var(--secondary-text-color,#536b75);margin-top:8px}
        .check{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--primary-text-color,#0a1e28)}
        .check input{width:auto}
        @media(max-width:600px){.grid{grid-template-columns:1fr}}
      </style>
      <div class="editor">
        <div class="section">
          <div class="section-title">Weather source</div>
          <label>Weather entity
            <select id="entity">
              <option value="">Choose a weather entity</option>
              ${configuredOption}
              ${weatherOptions}
            </select>
          </label>
          <div class="hint">WeatherWise reads an existing Home Assistant weather entity and calls Home Assistant's forecast service. This keeps API keys out of dashboard YAML.</div>
        </div>
        <div class="section">
          <div class="section-title">Region and radar</div>
          <div class="grid">
            <label>Country / region
              <select id="country">
                ${Object.entries(WEATHERWISE_COUNTRIES).map(([value, label]) => `<option value="${value}" ${config.country === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label>Radar provider
              <select id="radar_provider">
                ${Object.entries(WEATHERWISE_RADAR).map(([value, label]) => `<option value="${value}" ${config.radar_provider === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label>Radar style
              <select id="radar_style">
                ${Object.entries(WEATHERWISE_RADAR_STYLES).map(([value, label]) => `<option value="${value}" ${config.radar_style === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label>Map style
              <select id="radar_basemap">
                ${Object.entries(WEATHERWISE_BASEMAPS).map(([value, label]) => `<option value="${value}" ${config.radar_basemap === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="hint">Auto uses NOAA radar for the United States and RainViewer global radar for Canada, the UK, and other regions. Radar style changes overlay contrast/opacity. Map style changes the base map under the radar.</div>
        </div>
        <div class="section">
          <div class="section-title">Display</div>
          <div class="grid">
            <label>Title <input id="title" value="${config.title || ""}" placeholder="Local Weather"></label>
            <label>Units
              <select id="units">
                <option value="auto" ${config.units !== "imperial" && config.units !== "metric" ? "selected" : ""}>Auto from weather entity</option>
                <option value="imperial" ${config.units === "imperial" ? "selected" : ""}>Imperial</option>
                <option value="metric" ${config.units === "metric" ? "selected" : ""}>Metric</option>
              </select>
            </label>
            <label>Theme
              <select id="theme_mode">
                <option value="weatherwise" ${config.theme_mode !== "auto" ? "selected" : ""}>WeatherWise</option>
                <option value="auto" ${config.theme_mode === "auto" ? "selected" : ""}>Home Assistant theme</option>
              </select>
            </label>
            <label>Hourly rows <input id="hourly_count" type="number" min="1" max="24" value="${config.hourly_count || 5}"></label>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Radar location</div>
          <div class="grid">
            <label>Latitude <input id="latitude" type="number" step="0.0001" value="${config.latitude ?? ""}"></label>
            <label>Longitude <input id="longitude" type="number" step="0.0001" value="${config.longitude ?? ""}"></label>
            <label>Radar zoom <input id="radar_zoom" type="number" min="3" max="12" value="${config.radar_zoom || 7}"></label>
            <label>Loop speed <input id="radar_speed" type="number" min="300" max="3000" step="100" value="${config.radar_speed || 700}"></label>
          </div>
          <label class="check"><input id="show_radar" type="checkbox" ${config.show_radar === false ? "" : "checked"}> Show radar panel</label>
          <label class="check"><input id="show_map_controls" type="checkbox" ${config.show_map_controls === false ? "" : "checked"}> Show map controls</label>
          <label class="check"><input id="radar_controls" type="checkbox" ${config.radar_controls === false ? "" : "checked"}> Show radar playback controls</label>
          <div class="hint">Latitude and longitude control only the radar center. They do not change the selected weather entity.</div>
        </div>
      </div>
    `;
    ["entity", "country", "radar_provider", "radar_style", "radar_basemap", "title", "units", "theme_mode", "latitude", "longitude", "hourly_count", "radar_zoom", "radar_speed"].forEach((id) => {
      this.shadowRoot.getElementById(id)?.addEventListener("change", (event) => this._setValue(id, event.target.value));
    });
    ["show_radar", "show_map_controls", "radar_controls"].forEach((id) => {
      this.shadowRoot.getElementById(id)?.addEventListener("change", (event) => this._setValue(id, event.target.checked));
    });
  }
}

class WeatherWiseDashedCard extends WeatherWiseCard {}
class WeatherWiseDashedCardEditor extends WeatherWiseCardEditor {}

if (!customElements.get(CARD_TYPES[0])) customElements.define(CARD_TYPES[0], WeatherWiseCard);
if (!customElements.get(CARD_TYPES[1])) customElements.define(CARD_TYPES[1], WeatherWiseDashedCard);
if (!customElements.get("weatherwise-card-editor")) customElements.define("weatherwise-card-editor", WeatherWiseCardEditor);
if (!customElements.get("weather-wise-card-editor")) customElements.define("weather-wise-card-editor", WeatherWiseDashedCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "weatherwise-card",
  name: "WeatherWise Weather",
  description: "Weather dashboard card with forecasts, theme support, and optional radar.",
  documentationURL: "https://github.com/TheWillMiller/weather-wise",
  preview: true
});

console.info(
  `%c WEATHERWISE-CARD %c v${CARD_VERSION} `,
  "background:#0d3a5c;color:#7ecbca;font-weight:bold;padding:2px 4px;border-radius:3px 0 0 3px",
  "background:#7ecbca;color:#0d3a5c;font-weight:bold;padding:2px 4px;border-radius:0 3px 3px 0"
);
