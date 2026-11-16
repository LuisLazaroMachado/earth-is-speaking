// Layer registry. The core works only with latitude/longitude: every layer exposes
// sample(lat, lon) and never sees screen pixels.
import { loadGrid, cellOf } from './grid.js';

function makeLayer(def) {
  return {
    meta: null,
    grid: null,
    async load() {
      if (this.grid) return;
      const [grid, meta] = await Promise.all([loadGrid(this.gridUrl), fetch(this.metaUrl).then((r) => r.json())]);
      this.grid = grid;
      this.meta = meta;
    },
    ...def,
  };
}

// ---------------------------------------------------------------------------------
// 1. Air temperature (Measured, approx.)
// ---------------------------------------------------------------------------------
const air = makeLayer({
  id: 'air', num: 1, type: 'measured', place: true, globe: true, view: 'map',
  image: 'data/air/map.jpg', texture: 'data/air/texture.jpg',
  gridUrl: 'data/air/grid.png', metaUrl: 'data/air/meta.json',

  decode(code) {
    if (code === 0) return { hasData: false };
    if (code === 1) return { hasData: true, t: -40, extreme: 'bottom', norm: 0 };
    if (code === 255) return { hasData: true, t: 40, extreme: 'top', norm: 1 };
    const t = (code - 2) / 2 - 40;
    return { hasData: true, t, extreme: null, norm: (t + 40) / 80, nearTop: t >= 37 };
  },
  sample(lat, lon) {
    const c = cellOf(this.grid, lat, lon);
    return { layer: 'air', lat, lon, ...this.decode(this.grid.data[c.i]) };
  },
  scaleSteps() {
    const out = [];
    for (let t = -40; t <= 40; t += 10) {
      const code = t === -40 ? 1 : t === 40 ? 255 : 2 + (t + 40) * 2;
      out.push({ layer: 'air', lat: 0, lon: 0, ...this.decode(code) });
    }
    return out;
  },
});

// ---------------------------------------------------------------------------------
// 2. Night lights change 2012 -> 2023 (Trend)
// ---------------------------------------------------------------------------------
const lights = makeLayer({
  id: 'lights', num: 2, type: 'trend', place: true, globe: true, view: 'map',
  image: 'data/lights/map.jpg',
  gridUrl: 'data/lights/grid.png', metaUrl: 'data/lights/meta.json',

  decode(code) {
    if (code === 0) return { hasData: true, kind: 'none', strength: 0 };
    if (code < 128) return { hasData: true, kind: 'less', strength: (code - 1) / 126 };
    return { hasData: true, kind: 'more', strength: (code - 128) / 127 };
  },
  sample(lat, lon) {
    const c = cellOf(this.grid, lat, lon);
    return { layer: 'lights', lat, lon, ...this.decode(this.grid.data[c.i]) };
  },
  scaleSteps() {
    return [['less', 1], ['less', 0.6], ['less', 0.25], ['more', 0.25], ['more', 0.6], ['more', 1]]
      .map(([kind, strength]) => ({ layer: 'lights', lat: 0, lon: 0, hasData: true, kind, strength }));
  },
});

// ---------------------------------------------------------------------------------
// 3. Ocean currents (Trend) - current-line index, no degC, no speed
// ---------------------------------------------------------------------------------
const ocean = makeLayer({
  id: 'ocean', num: 3, type: 'trend', place: true, coastal: true, globe: true, view: 'map',
  image: 'data/ocean/map.jpg',
  gridUrl: 'data/ocean/grid.png', metaUrl: 'data/ocean/meta.json',

  decode(code) {
    if (code === 0) return { hasData: false, land: true };
    const intensity = (code - 1) / 254;
    return { hasData: true, intensity, level: intensity >= 0.5 ? 'strong' : intensity >= 0.2 ? 'medium' : 'weak' };
  },
  sample(lat, lon) {
    const c = cellOf(this.grid, lat, lon);
    return { layer: 'ocean', lat, lon, ...this.decode(this.grid.data[c.i]) };
  },
  scaleSteps() {
    return [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 1].map((i) => ({ layer: 'ocean', lat: 0, lon: 0, hasData: true,
      intensity: i, level: i >= 0.5 ? 'strong' : i >= 0.2 ? 'medium' : 'weak' }));
  },
});

// ---------------------------------------------------------------------------------
// 4. Aerosols (Category)
// ---------------------------------------------------------------------------------
export const AERO_CATS = [null, 'blackcarbon', 'dust', 'seasalt', 'sulfate'];
const aero = makeLayer({
  id: 'aero', num: 4, type: 'category', place: true, globe: true, view: 'map',
  image: 'data/aero/map.jpg',
  gridUrl: 'data/aero/grid.png', metaUrl: 'data/aero/meta.json',

  sample(lat, lon) {
    const c = cellOf(this.grid, lat, lon);
    const j = c.i * 4;
    const ch = this.grid.channels;
    const main = AERO_CATS[ch[j]];
    const second = AERO_CATS[ch[j + 1]];
    const intensity = ch[j + 2] ? (ch[j + 2] - 1) / 254 : 0;
    const mix = main ? [{ cat: main }, ...(second ? [{ cat: second }] : [])] : [];
    return { layer: 'aero', lat, lon, hasData: true, cat: main, second, mix, intensity };
  },
  scaleSteps() {
    return ['dust', 'seasalt', 'blackcarbon', 'sulfate'].map((cat) => ({ layer: 'aero', lat: 0, lon: 0, hasData: true,
      cat, second: null, mix: [{ cat }], intensity: 0.8 }));
  },
});

// ---------------------------------------------------------------------------------
// 5-6. Global views: globes already rendered by NASA with a fixed camera. There is no
// latitude/longitude here. The map view passes picture positions using the same two
// numbers it uses for lat/lon (u = (lon + 180) / 360, v = (90 - lat) / 180), so the
// input code is shared; these layers never report a place or coordinates.
// ---------------------------------------------------------------------------------
function pictureCell(grid, lat, lon) {
  const u = Math.min(0.9999, Math.max(0, (lon + 180) / 360));
  const v = Math.min(0.9999, Math.max(0, (90 - lat) / 180));
  return Math.floor(v * grid.height) * grid.width + Math.floor(u * grid.width);
}
const GLOBAL_SWEEP_LATS = [0.25, 0.42, 0.58, 0.75].map((v) => 90 - v * 180); // rows at 25/42/58/75 % height

const forest = makeLayer({
  id: 'forest', num: 5, type: 'trend', place: false, globe: false, view: 'global', aspect: 16 / 9,
  image: 'data/forest/view.jpg', sweepLats: GLOBAL_SWEEP_LATS,
  gridUrl: 'data/forest/grid.png', metaUrl: 'data/forest/meta.json',
  decode(code) {
    if (code === 0) return { hasData: false };
    const height = (code - 1) / 254;
    return { hasData: true, height, level: height >= 0.5 ? 'tall' : height >= 0.2 ? 'medium' : 'low' };
  },
  sample(lat, lon) { return { layer: 'forest', lat, lon, ...this.decode(this.grid.data[pictureCell(this.grid, lat, lon)]) }; },
  scaleSteps() {
    return [0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1].map((h) => ({ layer: 'forest', lat: 0, lon: 0, hasData: true,
      height: h, level: h >= 0.5 ? 'tall' : h >= 0.2 ? 'medium' : 'low' }));
  },
});

const lightning = makeLayer({
  id: 'lightning', num: 6, type: 'density', place: false, globe: false, view: 'global', aspect: 16 / 9,
  image: 'data/lightning/view.jpg', sweepLats: GLOBAL_SWEEP_LATS,
  gridUrl: 'data/lightning/grid.png', metaUrl: 'data/lightning/meta.json',
  decode(code) {
    if (code === 0) return { hasData: true, density: 0, level: 'none' };
    const density = (code - 1) / 254;
    return { hasData: true, density, level: density >= 0.4 ? 'many' : 'some' };
  },
  sample(lat, lon) { return { layer: 'lightning', lat, lon, ...this.decode(this.grid.data[pictureCell(this.grid, lat, lon)]) }; },
  scaleSteps() {
    return [0.02, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((d) => ({ layer: 'lightning', lat: 0, lon: 0, hasData: true,
      density: d, level: d >= 0.4 ? 'many' : 'some' }));
  },
});

export const LAYERS = { air, lights, ocean, aero, forest, lightning };
export const LAYER_ORDER = ['air', 'lights', 'ocean', 'aero', 'forest', 'lightning'];
