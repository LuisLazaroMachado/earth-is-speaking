// Area statistics for a set of pixels (a country or its coastal waters).
// Every mean and percentage is weighted by cos(latitude): on an equirectangular map the
// pixels near the poles cover less surface. Max and min are not weighted.

export const FEW_CHANGES_PCT = 1; // night lights: below 1 % of the area -> "few changes detected"

export function summarize(layer, pixels) {
  let W = 0;
  const id = layer.id;
  if (id === 'air') {
    let sw = 0, sum = 0, above30 = 0, below0 = 0;
    let max = -Infinity, min = Infinity, maxTop = false, minBottom = false;
    for (const p of pixels) {
      W += p.w;
      const s = layer.sample(p.lat, p.lon);
      if (!s.hasData) continue;
      sw += p.w;
      sum += s.t * p.w;
      if (s.t > 30 || s.extreme === 'top') above30 += p.w;
      if (s.t < 0) below0 += p.w;
      if (s.t > max || (s.extreme === 'top')) { max = s.t; maxTop = maxTop || s.extreme === 'top'; }
      if (s.t < min || (s.extreme === 'bottom')) { min = s.t; minBottom = minBottom || s.extreme === 'bottom'; }
    }
    if (!sw) return { layer: id, empty: true };
    return { layer: id, mean: sum / sw, max, min, maxTop, minBottom,
      pctAbove30: (above30 / sw) * 100, pctBelow0: (below0 / sw) * 100, coverage: sw / W, n: pixels.length };
  }
  if (id === 'lights') {
    let more = 0, less = 0;
    for (const p of pixels) {
      W += p.w;
      const s = layer.sample(p.lat, p.lon);
      if (s.kind === 'more') more += p.w; else if (s.kind === 'less') less += p.w;
    }
    if (!W) return { layer: id, empty: true };
    const pctMore = (more / W) * 100;
    const pctLess = (less / W) * 100;
    let net;
    if (pctMore + pctLess < FEW_CHANGES_PCT) net = 'few';
    else if (pctMore > pctLess * 1.5) net = 'more';
    else if (pctLess > pctMore * 1.5) net = 'less';
    else net = 'similar';
    return { layer: id, pctMore, pctLess, net, n: pixels.length };
  }
  if (id === 'ocean') {
    let sw = 0, sum = 0, strong = 0;
    for (const p of pixels) {
      W += p.w;
      const s = layer.sample(p.lat, p.lon);
      if (!s.hasData) continue;
      sw += p.w;
      sum += s.intensity * p.w;
      if (s.intensity >= 0.5) strong += p.w;
    }
    if (!sw) return { layer: id, empty: true, noCoast: true };
    return { layer: id, index: (sum / sw) * 100, pctStrong: (strong / sw) * 100, n: pixels.length };
  }
  if (id === 'aero') {
    const share = { blackcarbon: 0, dust: 0, seasalt: 0, sulfate: 0, none: 0 };
    for (const p of pixels) {
      W += p.w;
      const s = layer.sample(p.lat, p.lon);
      share[s.cat || 'none'] += p.w;
    }
    if (!W) return { layer: id, empty: true };
    Object.keys(share).forEach((k) => { share[k] = (share[k] / W) * 100; });
    const cats = ['blackcarbon', 'dust', 'seasalt', 'sulfate'];
    const dom = cats.reduce((a, b) => (share[b] > share[a] ? b : a));
    return { layer: id, share, dominant: share[dom] > 0 ? dom : null, n: pixels.length };
  }
  return { layer: id, empty: true };
}
