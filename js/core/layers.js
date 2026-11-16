// Layer registry. The core works only with latitude/longitude: every layer exposes
// sample(lat, lon) and never sees screen pixels.
import { loadGrid, cellOf } from './grid.js';

const air = {
  id: 'air',
  num: 1,
  type: 'measured',
  place: true, // can be searched by place
  globe: true,
  view: 'map',
  image: 'data/air/map.jpg',
  texture: 'data/air/texture.jpg',
  meta: null,
  grid: null,

  async load() {
    if (this.grid) return;
    const [grid, meta] = await Promise.all([
      loadGrid('data/air/grid.png'),
      fetch('data/air/meta.json').then((r) => r.json()),
    ]);
    this.grid = grid;
    this.meta = meta;
  },

  /** Decode one grid code into a temperature sample. */
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

  /** Steps for "Hear the scale": min to max, every 10 degC. */
  scaleSteps() {
    const out = [];
    for (let t = -40; t <= 40; t += 10) {
      const code = t === -40 ? 1 : t === 40 ? 255 : 2 + (t + 40) * 2;
      out.push({ layer: 'air', lat: 0, lon: 0, ...this.decode(code) });
    }
    return out;
  },
};

export const LAYERS = { air };
export const LAYER_ORDER = ['air'];
