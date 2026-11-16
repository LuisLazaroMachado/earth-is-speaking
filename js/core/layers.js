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

export const LAYERS = { air, lights, ocean, aero };
export const LAYER_ORDER = ['air', 'lights', 'ocean', 'aero'];
