// Countries, land and coastal waters (Natural Earth 1:50m), all through lat/lon.
// Rasters share the 2048x1024 equirectangular grid; outlines are loaded on demand.
import { loadGrid, cellOf, latLonOfCell } from './grid.js';

const geo = {
  ready: false,
  countries: [],
  byId: new Map(),
  labels: null,
  land: null,
  coast: null,
  outlines: null,
  _pix: null,
  _coastPix: null,

  async load() {
    if (this.ready) return;
    const [list, labels, land, coast] = await Promise.all([
      fetch('data/geo/countries.json').then((r) => r.json()),
      loadGrid('data/geo/countries.png'),
      loadGrid('data/geo/land.png'),
      loadGrid('data/geo/coast.png'),
    ]);
    this.countries = list;
    list.forEach((c) => this.byId.set(c.id, c));
    this.labels = labels;
    this.land = land;
    this.coast = coast;
    this.ready = true;
  },

  async loadOutlines() {
    if (!this.outlines) this.outlines = await fetch('data/geo/outlines.json').then((r) => r.json());
    return this.outlines;
  },

  countryAt(lat, lon) {
    if (!this.ready) return null;
    const id = this.labels.data[cellOf(this.labels, lat, lon).i];
    return id ? this.byId.get(id) : null;
  },

  isLand(lat, lon) {
    if (!this.ready) return true;
    return this.land.data[cellOf(this.land, lat, lon).i] > 0;
  },

  /** Coastal-water country (ocean pixels within ~300 km of a coast). */
  coastOf(lat, lon) {
    if (!this.ready) return null;
    const id = this.coast.data[cellOf(this.coast, lat, lon).i];
    return id ? this.byId.get(id) : null;
  },

  _index(grid) {
    const lists = new Map();
    const { width, height, data } = grid;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const id = data[y * width + x];
        if (!id) continue;
        let l = lists.get(id);
        if (!l) lists.set(id, (l = []));
        l.push(x, y);
      }
    }
    return lists;
  },

  /** Pixels of a country (or of its coastal waters) as [{lat, lon, w}], w = cos(lat). */
  pixelsOf(id, { coastal = false } = {}) {
    const grid = coastal ? this.coast : this.labels;
    const key = coastal ? '_coastPix' : '_pix';
    if (!this[key]) this[key] = this._index(grid);
    const flat = this[key].get(id) || [];
    const out = new Array(flat.length / 2);
    for (let i = 0, j = 0; i < flat.length; i += 2, j++) {
      const p = latLonOfCell(grid, flat[i], flat[i + 1]);
      out[j] = { lat: p.lat, lon: p.lon, w: Math.cos((p.lat * Math.PI) / 180) };
    }
    return out;
  },

  /**
   * Up to n points spread evenly by AREA over the pixels (cells weighted by cos(lat)),
   * ordered west to east. Uses a grid of cells over the bounding box and keeps, for the
   * n cells with most area, the pixel closest to each cell's weighted centre.
   */
  samplePoints(pixels, n = 24) {
    if (pixels.length <= n) return [...pixels].sort((a, b) => a.lon - b.lon);
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    pixels.forEach((p) => {
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon);
    });
    const midCos = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    const wKm = Math.max(1e-6, (maxLon - minLon) * midCos);
    const hKm = Math.max(1e-6, maxLat - minLat);
    let best = null;
    for (let k = 2; k <= 64; k++) {
      const cols = Math.max(1, Math.round(k * Math.sqrt(wKm / hKm)));
      const rows = Math.max(1, Math.round(k * Math.sqrt(hKm / wKm)));
      const cells = new Map();
      for (const p of pixels) {
        const cx = Math.min(cols - 1, Math.floor(((p.lon - minLon) / (maxLon - minLon || 1)) * cols));
        const cy = Math.min(rows - 1, Math.floor(((p.lat - minLat) / (maxLat - minLat || 1)) * rows));
        const key = cy * cols + cx;
        let c = cells.get(key);
        if (!c) cells.set(key, (c = { w: 0, lat: 0, lon: 0, pts: [] }));
        c.w += p.w; c.lat += p.lat * p.w; c.lon += p.lon * p.w; c.pts.push(p);
      }
      best = cells;
      if (cells.size >= n) break;
    }
    const chosen = [...best.values()].sort((a, b) => b.w - a.w).slice(0, n).map((c) => {
      const la = c.lat / c.w;
      const lo = c.lon / c.w;
      let bp = c.pts[0];
      let bd = Infinity;
      for (const p of c.pts) {
        const d = (p.lat - la) ** 2 + (p.lon - lo) ** 2;
        if (d < bd) { bd = d; bp = p; }
      }
      return bp;
    });
    return chosen.sort((a, b) => a.lon - b.lon);
  },
};

export default geo;

/** Remove accents and lowercase, for search. */
export function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
