// Earth Is Speaking - app entry point. Wires the core (layers, sound, text) to the views
// and the interface. The core only ever receives latitude/longitude.
import { engine } from './core/audio.js';
import { playSample } from './core/instruments.js';
import { LAYERS } from './core/layers.js';
import { MapView } from './views/mapView.js';
import { speak, lastUtterance, cancelSpeech, speechAvailable } from './core/speech.js';
import { initLang, setLang, getLang, t, L, applyI18n, onLangChange, fmtLatLon } from './i18n.js';
import { CONTENT, CARDS, icon, typeLabel, nextFact } from './content.js';
import { PLACES, nearestCity } from './data/places.js';
import { store } from './store.js';
import { shortcutsHTML, howToHTML, aboutHTML } from './ui/docs.js';
import geo, { norm } from './core/geo.js';
import { summarize } from './core/stats.js';
import { combobox } from './ui/combobox.js';
import { STOPS, findNear, hottestIn } from './journey.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const CARD_ORDER = ['air', 'lights', 'ocean', 'aero', 'forest', 'lightning'];
const NAME_KEY = { air: 'layer_air', lights: 'layer_lights', ocean: 'layer_ocean', aero: 'layer_aero', forest: 'layer_forest', lightning: 'layer_light' };
const TYPE = { air: 'measured', lights: 'trend', ocean: 'trend', aero: 'category', forest: 'trend', lightning: 'density' };
const CARD_IMG = { air: 'data/cards/air.jpg', latest: 'data/cards/latest.jpg', lights: 'data/cards/lights.jpg',
  ocean: 'data/cards/ocean.jpg', aero: 'data/cards/aero.jpg', forest: 'data/cards/forest.jpg', lightning: 'data/cards/lightning.jpg' };
const SWEEP_MS = { slow: 32000, normal: 16000, fast: 8000 };
const GAP = { slow: 1.6, normal: 1, fast: 0.6 };

const state = {
  screen: 'welcome',
  layerId: 'air',
  latest: false,
  speed: store.get('speed', 'normal'),
  last: null, // last sample shown in the panel
  fact: null,
};

export const layerName = (id) => t(NAME_KEY[id]);
const layer = () => LAYERS[state.layerId];
const content = () => CONTENT[state.layerId];

// ---------------------------------------------------------------------------------
// Announcements (aria-live, 300 ms debounce so screen readers are not flooded)
// ---------------------------------------------------------------------------------
let liveTimer = null;
export function announce(text) {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    const live = $('live');
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  }, 300);
}

// ---------------------------------------------------------------------------------
// Place names (lat/lon only)
// ---------------------------------------------------------------------------------
export function placeLabel(lat, lon) {
  const country = geo.countryAt(lat, lon);
  const near = nearestCity(lat, lon, 150);
  if (near) return t('near', { place: L(near.place) }) + (country && L(country) !== L(near.place) ? `, ${L(country)}` : '');
  if (country) return L(country);
  const c = fmtLatLon(lat, lon);
  if (geo.ready && !geo.isLand(lat, lon)) return t('ocean_at', c);
  return t('coords', c);
}

/** Place text for a sample: global views never have a place. */
export function placeOf(s) {
  if (LAYERS[s.layer] && LAYERS[s.layer].view === 'global') return t('global_no_place');
  return placeLabel(s.lat, s.lon);
}

/** True when a sample makes a sound in its layer. */
export function audible(s) {
  if (!s || !s.hasData) return false;
  if (s.layer === 'lights') return s.kind === 'more' || s.kind === 'less';
  if (s.layer === 'aero') return !!s.cat;
  if (s.layer === 'lightning') return s.density > 0;
  return true;
}

// ---------------------------------------------------------------------------------
// Map view
// ---------------------------------------------------------------------------------
const view = new MapView($('map'), {
  onPress(lat, lon) {
    engine.stopAll();
    hideSummary();
    const s = layer().sample(lat, lon);
    playSample(engine, s);
    feedback(s);
    present(s, { announceIt: true });
  },
  onTap(lat, lon) { view.setTemp({ lat, lon }); },
  onDragStart() { engine.releaseAll(0.05); },
  onDrag(lat, lon) {
    const s = layer().sample(lat, lon);
    playSample(engine, s, { dur: 0.35, gain: 0.8 });
    feedback(s);
    present(s, { announceIt: false, rotateFact: false });
  },
  onDragEnd() {
    engine.releaseAll(0.2);
    if (state.last) announce(summaryLine(state.last));
  },
  onHover(lat, lon) {
    const s = layer().sample(lat, lon);
    playSample(engine, s, { dur: 0.3, gain: 0.5 });
  },
  onCursor(lat, lon) {
    engine.releaseAll(0.05);
    const s = layer().sample(lat, lon);
    playSample(engine, s, { dur: 0.45 });
    feedback(s);
    present(s, { announceIt: true, rotateFact: false });
  },
  onActivate(lat, lon) {
    engine.stopAll();
    hideSummary();
    const s = layer().sample(lat, lon);
    playSample(engine, s);
    feedback(s);
    view.setTemp({ lat, lon });
    present(s, { announceIt: true });
  },
});

// ---------------------------------------------------------------------------------
// Information panel
// ---------------------------------------------------------------------------------
function summaryLine(s) {
  const c = CONTENT[s.layer];
  const v = c.shortValue ? c.shortValue(s) : '';
  return `${state.placeText || placeOf(s)}. ${c.phrase(s)}${v ? ' ' + v + '.' : ''}`;
}

function hideSummary() { $('p-summary').hidden = true; state.summary = null; }
function showSummary(place, st) {
  state.summary = { place, st };
  const c = content();
  $('p-summary').hidden = false;
  $('p-summary-h').textContent = t('summary_of', { place: L(place) });
  $('p-summary-text').textContent = c.summaryText(st, L(place));
}

function present(s, { announceIt = true, rotateFact = true, placeText = null } = {}) {
  state.last = s;
  state.placeText = placeText;
  const c = CONTENT[s.layer];
  $('p-icon').innerHTML = icon(s.layer);
  $('p-phrase').textContent = c.phrase(s);
  $('p-phrase').removeAttribute('data-i18n');
  $('p-place').textContent = placeText || placeOf(s);
  if (rotateFact || !state.fact) state.fact = nextFact(s.layer, s);
  $('p-dyk').hidden = !state.fact;
  $('p-fact').textContent = state.fact ? L(state.fact) : '';
  $('d-value').textContent = c.value(s);
  $('d-sounds').textContent = c.whySounds(s);
  $('sound-desc').textContent = c.sound(s);
  if (announceIt) announce(summaryLine(s));
}

function renderLayerInfo() {
  const c = content();
  const meta = layer().meta;
  $('d-range').textContent = c.range();
  $('d-date').textContent = c.date(meta);
  $('d-source').textContent = c.source();
  $('d-type').textContent = typeLabel(TYPE[state.layerId]);
  $('d-matters').textContent = L(c.whyMatters);
  $('map-credit').textContent = L(c.credit);
  $('map').setAttribute('aria-label', t('map_label', { layer: layerName(state.layerId) }));
  $('stage-h').textContent = layerName(state.layerId);
  const vs = $('view-switch');
  const global = layer().view === 'global';
  vs.setAttribute('aria-label', global ? t('view_global') : t('view_map'));
  vs.innerHTML = `<span>${global ? t('view_global') : t('view_map')}</span>`;
  document.querySelector('.zoom').hidden = global;
  $('map-help').textContent = global ? `${t('global_hint')} ${t('map_help')}` : t('map_help');
  const banner = $('latest-banner');
  banner.hidden = !state.latest;
  if (state.latest && meta) banner.textContent = `${t('latest_label')}: ${meta.frame_label}`;
}

function resetPanel() {
  state.last = null;
  state.fact = null;
  $('p-icon').innerHTML = icon(state.layerId);
  $('p-phrase').textContent = t('panel_empty');
  $('p-place').textContent = '';
  $('p-dyk').hidden = true;
  $('d-value').textContent = '—';
  $('d-sounds').textContent = content().whySounds(null);
  $('sound-desc').textContent = '';
}

// ---------------------------------------------------------------------------------
// Layer cards
// ---------------------------------------------------------------------------------
function renderCards() {
  const ul = $('cards');
  ul.innerHTML = '';
  ['latest', ...CARD_ORDER].forEach((id, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (id === 'latest' ? ' latest' : '');
    b.dataset.layer = id;
    const ready = id === 'latest' || !!LAYERS[id];
    const name = id === 'latest' ? t('latest') : layerName(id);
    const badge = id === 'latest' ? t('layer_air') : (ready ? `${t('type_label')}: ${typeLabel(TYPE[id])}` : t('soon'));
    const desc = id === 'latest' ? t('latest_desc') : L(CARDS[id]);
    const img = CARD_IMG[id];
    b.innerHTML = `${img ? `<span class="card-bg" style="background-image:url('${img}')" aria-hidden="true"></span>` : ''}
      ${icon(id === 'latest' ? 'latest' : id)}
      <span class="card-name">${name}${id !== 'latest' ? `<span class="sr-only">, ${i}</span>` : ''}</span>
      <span class="card-badge">${badge}</span>
      <span class="card-desc">${desc}</span>
      ${img ? '<span class="card-credit" aria-hidden="true">NASA SVS</span>' : ''}`;
    if (!ready) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', () => {
      if (id === 'latest') selectLayer('air', { latest: true });
      else selectLayer(id);
    });
    li.appendChild(b);
    ul.appendChild(li);
  });
  markCurrentCard();
}

function markCurrentCard() {
  document.querySelectorAll('.card').forEach((b) => {
    const cur = state.latest ? b.dataset.layer === 'latest' : b.dataset.layer === state.layerId;
    if (cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
}

export async function selectLayer(id, { latest = false, quiet = false, keepRuns = false } = {}) {
  const L1 = LAYERS[id];
  if (!L1) { announce(`${layerName(id)}. ${t('layer_soon')}`); return false; }
  if (keepRuns) engine.releaseAll(0.1); else engine.stopAll();
  const wasGlobal = layer().view === 'global';
  state.layerId = id;
  state.latest = latest;
  markCurrentCard();
  await L1.load();
  const isGlobal = L1.view === 'global';
  if (isGlobal !== wasGlobal || view.global !== isGlobal) {
    view.setGlobal(isGlobal);
    view.setTemp(null);
    view.setCursor(0, 0);
    state.last = null;
    state.summary = null;
  }
  const ok = await view.setImage(L1.image);
  $('map-error').hidden = ok;
  renderLayerInfo();
  if (state.last) {
    const s = L1.sample(state.last.lat, state.last.lon);
    state.fact = null;
    present(s, { announceIt: false, placeText: state.placeText });
  } else resetPanel();
  if (state.summary && L1.place) {
    const pl = state.summary.place;
    showSummary(pl, summarize(L1, geo.pixelsOf(pl.id, { coastal: !!L1.coastal })));
  } else hideSummary();
  if (!quiet) announce(t('layer_now', { layer: layerName(id) }) + (latest && L1.meta ? `. ${t('latest_label')}: ${L1.meta.frame_label}` : ''));
  return true;
}

// ---------------------------------------------------------------------------------
// Controls: play/pause, stop, volume, speed, scale, sweep, test sound, surprise
// ---------------------------------------------------------------------------------
function updatePlayButton() {
  const b = $('btn-play');
  b.textContent = engine.paused ? t('play') : t('pause');
  b.setAttribute('aria-pressed', engine.paused ? 'true' : 'false');
}

export function togglePause() {
  engine.ensure();
  if (engine.paused) {
    engine.resume();
    if (speechAvailable()) window.speechSynthesis.resume();
    announce(t('resumed'));
  } else {
    engine.pause();
    if (speechAvailable()) window.speechSynthesis.pause();
    announce(t('paused'));
  }
  updatePlayButton();
}

export function stopAll() {
  engine.stopAll();
  cancelSpeech();
  engine.resume();
  if (journey.active) endJourney(false);
  view.setSweep(null);
  updatePlayButton();
  announce(t('stopped'));
}

function setVolume(v, say = false) {
  const vol = Math.max(0, Math.min(100, Math.round(v)));
  $('vol').value = vol;
  engine.setVolume(vol / 100);
  store.set('volume', vol);
  if (say) announce(t('volume_now', { v: vol }));
}

/** A cancellable async run registered with the engine so Stop cancels it. */
function startRun() {
  const run = { cancelled: false, cancel() { this.cancelled = true; } };
  engine.sequences.add(run);
  return run;
}
async function waitWhilePaused(run) { while (engine.paused && !run.cancelled) await sleep(100); }

export async function hearScale() {
  if (!engine.ensure()) return;
  engine.stopAll();
  cancelSpeech();
  const L1 = layer();
  const c = content();
  const run = startRun();
  for (const s of L1.scaleSteps()) {
    await waitWhilePaused(run);
    if (run.cancelled) break;
    const label = c.scaleLabel(s);
    $('sound-desc').textContent = t('scale_now', { label });
    await Promise.race([speak(label, getLang()), sleep(2500)]);
    if (run.cancelled) break;
    playSample(engine, s, { dur: 1.0 });
    await sleep(1150 * GAP[state.speed]);
  }
  engine.sequences.delete(run);
}

export function landscapeSweep() {
  if (!engine.ensure()) return;
  engine.stopAll();
  const total = SWEEP_MS[state.speed];
  const cols = 64;
  const colMs = total / cols;
  const L1 = layer();
  const lats = L1.sweepLats || [60, 20, -20, -60];
  const steps = [];
  for (let c = 0; c < cols; c++) {
    const lon = -180 + ((c + 0.5) * 360) / cols;
    steps.push({ at: c * colMs, fn: () => {
      view.setSweep(lon);
      lats.forEach((lat, k) => {
        const s = L1.sample(lat, lon);
        playSample(engine, s, { delay: k * 0.06, dur: Math.max(0.25, colMs / 1000 + 0.05), gain: 0.65 });
      });
    } });
  }
  announce(t('sweep_start'));
  engine.sequence(steps, { tail: colMs + 300, onEnd: () => { view.setSweep(null); announce(t('sweep_end')); } });
}

export function testSound() {
  if (!engine.ensure()) return;
  engine.stopAll();
  const n = 16; // C3..C6 pentatonic, about 5 seconds
  const steps = [];
  for (let i = 0; i < n; i++) {
    steps.push({ at: i * 310, fn: () => playSample(engine, { layer: 'air', hasData: true, norm: i / (n - 1), t: 0 }, { dur: 0.5 }) });
  }
  engine.sequence(steps, { tail: 600 });
}

export function goTo(lat, lon, { full = true, placeText = null } = {}) {
  engine.stopAll();
  view.setCursor(lat, lon);
  view.setTemp({ lat, lon });
  const s = layer().sample(lat, lon);
  playSample(engine, s, full ? {} : { dur: 0.6 });
  present(s, { announceIt: false, placeText });
  return s;
}

// ---------------------------------------------------------------------------------
// Places: search, country sweep and summary, compare
// ---------------------------------------------------------------------------------
const kindLabel = (k) => t(k === 'country' ? 'kind_country' : k === 'city' ? 'kind_city' : 'kind_zone');
const esc = (x) => String(x).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function searchPlaces(q, { countriesOnly = false } = {}) {
  const n = norm(q);
  if (!n) return [];
  const out = [];
  const score = (names) => {
    let best = 0;
    for (const nm of names) {
      const v = norm(nm);
      if (!v) continue;
      if (v === n) best = Math.max(best, 4);
      else if (v.startsWith(n)) best = Math.max(best, 3);
      else if (v.split(/[\s(,-]+/).some((w) => w.startsWith(n))) best = Math.max(best, 2);
      else if (n.length >= 3 && v.includes(n)) best = Math.max(best, 1);
    }
    return best;
  };
  geo.countries.forEach((c) => {
    const sc = score([c.en, c.es, c.iso]);
    if (sc) out.push({ sc: sc + 0.5, label: L(c), sub: kindLabel('country'), kind: 'country', data: c });
  });
  if (!countriesOnly) {
    PLACES.forEach((p) => {
      const sc = score([p.en, p.es, ...(p.alias || [])]);
      if (sc) {
        const country = geo.countryAt(p.lat, p.lon);
        out.push({ sc, label: L(p), sub: `${kindLabel(p.kind)}${country && p.kind === 'city' ? ' · ' + L(country) : ''}`, kind: p.kind, data: p });
      }
    });
  }
  return out.sort((a, b) => b.sc - a.sc || a.label.localeCompare(b.label));
}

/** Global-view layers cannot be heard by place: say so and offer another layer. */
function offerOtherLayer(item) {
  engine.stopAll();
  $('p-summary').hidden = false;
  $('p-summary-h').textContent = t('no_place_layer');
  const p = $('p-summary-text');
  p.textContent = '';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-small';
  b.textContent = `${t('other_layer')}: ${item.label} (${layerName('air')})`;
  b.addEventListener('click', async () => { await selectLayer('air'); choosePlace(item); });
  p.appendChild(b);
  state.summary = null;
  announce(`${t('no_place_layer')} ${t('other_layer')}.`);
}

export async function choosePlace(item) {
  engine.ensure();
  if (layer().view === 'global') { offerOtherLayer(item); return null; }
  if (item.kind === 'country') return hearCountry(item.data);
  const p = item.data;
  hideSummary();
  view.setOutline(null);
  const d = Math.max(3, (p.r / 111) * 3);
  view.fitBounds(p.lon - d * 1.5, p.lat - d, p.lon + d * 1.5, p.lat + d);
  const s = goTo(p.lat, p.lon, { placeText: p.kind === 'city' ? t('small_area', { place: L(p) }) : L(p) });
  announce(`${t('voice_going', { place: L(p) })}. ${summaryLine(s)}`);
  return s;
}

/** Play up to 24 area-uniform points of a country (west to east), then its summary. */
export async function hearCountry(country, { fly = true } = {}) {
  const L1 = layer();
  engine.ensure();
  engine.stopAll();
  if (!L1.place) { announce(t('no_place_layer')); return null; }
  const outlines = await geo.loadOutlines();
  view.setOutline(outlines[country.id]);
  if (fly) {
    const [a, b, c, d] = country.bbox;
    if (c - a > 180) view.resetView(); else view.fitBounds(a, b, c, d);
  }
  const coastal = !!L1.coastal;
  const pixels = geo.pixelsOf(country.id, { coastal });
  if (coastal && !pixels.length) {
    const st = { noCoast: true, empty: true };
    showSummary(country, st);
    $('sound-desc').textContent = t('no_coast');
    announce(`${L(country)}. ${t('no_coast')}`);
    return st;
  }
  const st = summarize(L1, pixels);
  const small = country.px <= 2;
  const pts = geo.samplePoints(pixels, 24);
  const gap = 400 * GAP[state.speed];
  announce(t('listening_to', { place: L(country) }));
  const placeText = small ? t('small_area', { place: L(country) }) : L(country);
  const steps = pts.map((p, i) => ({ at: i * gap, fn: () => {
    view.setCursor(p.lat, p.lon);
    const s = L1.sample(p.lat, p.lon);
    playSample(engine, s, { dur: Math.max(0.35, gap / 1000 + 0.05) });
    present(s, { announceIt: false, rotateFact: i === 0, placeText });
  } }));
  engine.sequence(steps, { tail: gap + 200, onEnd: () => {
    showSummary(country, st);
    announce(content().summaryText(st, placeText));
  } });
  return st;
}

function initSearch() {
  combobox({
    input: $('search'), list: $('search-list'),
    search: (q) => searchPlaces(q),
    onSelect: choosePlace,
    onStatus: (n) => { $('search-status').textContent = n ? t('results', { n }) : t('search_none'); },
  });
  const picks = { a: null, b: null };
  ['a', 'b'].forEach((k) => combobox({
    input: $(`cmp-${k}`), list: $(`cmp-${k}-list`),
    search: (q) => searchPlaces(q, { countriesOnly: true }),
    onSelect: (it) => { picks[k] = it.data; renderCompare(picks); },
  }));
  state.picks = picks;
}

function renderCompare(picks = state.picks) {
  const box = $('cmp-result');
  const L1 = layer();
  if (!L1.place || !CONTENT[state.layerId].compareRows) { box.innerHTML = `<p>${esc(t('layer_no_compare'))}</p>`; return; }
  if (!picks || !picks.a || !picks.b) { box.innerHTML = `<p>${esc(t('compare_need'))}</p>`; return; }
  const c = content();
  const cols = [picks.a, picks.b].map((country) => {
    const st = summarize(L1, geo.pixelsOf(country.id, { coastal: !!L1.coastal }));
    const stFixed = L1.coastal && !geo.pixelsOf(country.id, { coastal: true }).length ? { noCoast: true, empty: true } : st;
    return { country, st: stFixed, rows: c.compareRows(stFixed) || [] };
  });
  const head = cols.map((col, i) => `<th scope="col">${esc(L(col.country))}
      <p class="cmp-phrase">${esc(c.summaryText(col.st, L(col.country)))}</p>
      <button type="button" class="btn btn-small" data-listen="${i}">${esc(t('listen'))}<span class="sr-only"> ${esc(L(col.country))}</span></button></th>`).join('');
  const nRows = Math.max(1, ...cols.map((col) => col.rows.length));
  let body = '';
  for (let r = 0; r < nRows; r++) {
    const row = cols[0].rows[r] || cols[1].rows[r];
    if (!row) continue;
    body += `<tr><th scope="row">${esc(row[0])}</th>${cols.map((col) => `<td>${esc(col.rows[r] ? col.rows[r][1] : '—')}</td>`).join('')}</tr>`;
  }
  box.innerHTML = `<table class="cmp-table"><caption class="sr-only">${esc(t('compare'))}: ${esc(layerName(state.layerId))}</caption>
    <thead><tr><th scope="col">${esc(layerName(state.layerId))}</th>${head}</tr></thead><tbody>${body}</tbody></table>`;
  box.querySelectorAll('[data-listen]').forEach((b) => b.addEventListener('click', () => hearCountry(cols[+b.dataset.listen].country)));
}


function surprise() {
  engine.ensure();
  const L1 = layer();
  if (L1.view === 'global') {
    for (let i = 0; i < 400; i++) {
      const lat = 80 - Math.random() * 160;
      const lon = -170 + Math.random() * 340;
      if (audible(L1.sample(lat, lon))) {
        const s = goTo(lat, lon);
        announce(`${t('global_no_place')}. ${content().phrase(s)}`);
        return;
      }
    }
    announce(t('quiet_here'));
    return;
  }
  const ok = PLACES.filter((p) => audible(L1.sample(p.lat, p.lon)));
  if (!ok.length) { announce(t('quiet_here')); return; }
  const p = ok[Math.floor(Math.random() * ok.length)];
  hideSummary();
  view.setOutline(null);
  view.fitBounds(p.lon - 6, p.lat - 4, p.lon + 6, p.lat + 4);
  const s = goTo(p.lat, p.lon, { placeText: L(p) });
  const msg = `${t('voice_surprise', { place: L(p) })} ${content().phrase(s)}`;
  announce(msg);
}

// ---------------------------------------------------------------------------------
// Spoken helpers: Where am I? (W), read panel (I), repeat (R)
// ---------------------------------------------------------------------------------
function whereAmI() {
  const s = state.last;
  const text = s
    ? `${placeLabel(s.lat, s.lon)}. ${layerName(state.layerId)}. ${content().value(s)}.`
    : `${layerName(state.layerId)}. ${t('panel_empty')}`;
  speak(text, getLang());
  announce(text);
}

function readPanel() {
  const parts = [layerName(state.layerId)];
  if (state.last) {
    parts.push($('p-phrase').textContent, $('p-place').textContent);
    if (state.fact) parts.push(`${t('did_you_know')} ${L(state.fact)}`);
    parts.push(`${t('value')}: ${$('d-value').textContent}`);
  } else parts.push(t('panel_empty'));
  parts.push(`${t('range')}: ${$('d-range').textContent}`, `${t('date')}: ${$('d-date').textContent}`,
    `${t('source')}: ${$('d-source').textContent}`, `${t('type_label')}: ${$('d-type').textContent}`,
    `${t('why_matters')}: ${$('d-matters').textContent}`, `${t('why_sounds')}: ${$('d-sounds').textContent}`);
  speak(parts.join('. '), getLang());
}

// ---------------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------------
let lastFocus = null;
function openDialog(id) {
  const d = $(id);
  lastFocus = document.activeElement;
  renderDialog(id);
  d.showModal();
}
function renderDialog(id) {
  if (id === 'dlg-how') $('dlg-how-body').innerHTML = howToHTML();
  if (id === 'dlg-help') $('dlg-help-body').innerHTML = shortcutsHTML();
  if (id === 'dlg-about') {
    const metas = {};
    Object.values(LAYERS).forEach((l) => { metas[l.id] = l.meta; });
    $('dlg-about-body').innerHTML = aboutHTML(metas);
    Promise.all(Object.values(LAYERS).map((l) => l.load())).then(() => {
      Object.values(LAYERS).forEach((l) => { metas[l.id] = l.meta; });
      if ($(id).open) $('dlg-about-body').innerHTML = aboutHTML(metas);
    }).catch(() => {});
  }
  if (id === 'dlg-compare') renderCompare();
}
document.querySelectorAll('dialog').forEach((d) => {
  d.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === d) d.close();
    if (e.target.closest('[data-action="scale"]')) hearScale();
  });
  d.addEventListener('close', () => { if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); });
});

// ---------------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------------
async function showExplorer({ focusMap = true } = {}) {
  engine.ensure();
  state.screen = 'explorer';
  $('welcome').hidden = true;
  $('explorer').hidden = false;
  $('skip-link').setAttribute('href', '#main');
  await selectLayer(state.layerId, { latest: state.latest, quiet: true });
  measureBar();
  view.resize();
  if (focusMap) $('map').focus();
  announce(`${layerName(state.layerId)}. ${t('map_help')}`);
}

// ---------------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------------
function syncLangButtons() {
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === getLang() ? 'true' : 'false'));
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
onLangChange(() => {
  syncLangButtons();
  renderCards();
  updatePlayButton();
  if (state.screen === 'explorer') {
    renderLayerInfo();
    if (state.last) present(state.last, { announceIt: false, rotateFact: false, placeText: state.placeText }); else resetPanel();
    if (state.summary) showSummary(state.summary.place, state.summary.st);
  }
  document.querySelectorAll('dialog[open]').forEach((d) => renderDialog(d.id));
  updateSheetText();
});

// ---------------------------------------------------------------------------------
// Mobile bottom sheet
// ---------------------------------------------------------------------------------
function updateSheetText() {
  const open = $('panel').classList.contains('open');
  $('sheet-handle-text').textContent = open ? t('close_panel') : t('open_panel');
  $('sheet-handle').setAttribute('aria-expanded', open ? 'true' : 'false');
}
$('sheet-handle').addEventListener('click', () => { $('panel').classList.toggle('open'); updateSheetText(); });
(() => {
  let startY = null;
  const h = $('sheet-handle');
  h.addEventListener('pointerdown', (e) => { startY = e.clientY; });
  h.addEventListener('pointerup', (e) => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    startY = null;
    if (Math.abs(dy) > 30) {
      e.preventDefault();
      $('panel').classList.toggle('open', dy < 0);
      updateSheetText();
    }
  });
})();
function measureBar() {
  const h = $('controlbar').getBoundingClientRect().height;
  document.documentElement.style.setProperty('--bar-h', `${Math.ceil(h)}px`);
  const top = document.querySelector('.topbar').getBoundingClientRect().height;
  document.documentElement.style.setProperty('--top-h', `${Math.ceil(top)}px`);
}
window.addEventListener('resize', measureBar);

// ---------------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (state.screen !== 'explorer' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('dialog[open]')) return;
  if (e.target.matches('input[type="text"], input[type="search"], textarea, [contenteditable]')) return;
  const k = e.key;
  if (k === ' ') {
    if (e.target.closest('button, a, summary, input, select, label')) return;
    e.preventDefault();
    togglePause();
  } else if (k === 's' || k === 'S') stopAll();
  else if (k === '[') setVolume(+$('vol').value - 10, true);
  else if (k === ']') setVolume(+$('vol').value + 10, true);
  else if (k >= '1' && k <= '6') selectLayer(CARD_ORDER[+k - 1]);
  else if (k === 'h' || k === 'H') openDialog('dlg-help');
  else if (k === 'w' || k === 'W') whereAmI();
  else if (k === 'i' || k === 'I') readPanel();
  else if (k === 'r' || k === 'R') speak(lastUtterance(), getLang());
  else if (k === '/') { e.preventDefault(); $('search').focus(); }
  else if ((k === '+' || k === '=') && e.target !== $('map')) view.zoomBy(2);
  else if ((k === '-' || k === '_') && e.target !== $('map')) view.zoomBy(0.5);
});

// ---------------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------
// Options: hover preview, vibration (Android), visual sound pulse
// ---------------------------------------------------------------------------------
const opts = {
  hover: store.get('opt.hover', false),
  vibration: store.get('opt.vibration', true),
  pulse: store.get('opt.pulse', true),
};
const canVibrate = typeof navigator.vibrate === 'function';

function applyOptions() {
  view.hoverEnabled = opts.hover && !state.audioOnly;
  $('opt-hover').checked = opts.hover;
  $('opt-hover').disabled = !!state.audioOnly;
  $('opt-vibration').checked = opts.vibration;
  $('opt-vibration-row').hidden = !canVibrate;
  $('opt-pulse').checked = opts.pulse;
}
['hover', 'vibration', 'pulse'].forEach((k) => {
  $(`opt-${k}`).addEventListener('change', (e) => { opts[k] = e.target.checked; store.set(`opt.${k}`, opts[k]); applyOptions(); });
});

/** Normalized 0..1 value of a sample (used for vibration length), or null when silent. */
function normOf(s) {
  if (!audible(s)) return null;
  switch (s.layer) {
    case 'air': return s.norm;
    case 'lights': return s.strength;
    case 'ocean': return s.intensity;
    case 'aero': return s.intensity;
    case 'forest': return s.height;
    case 'lightning': return s.density;
    default: return null;
  }
}

let pulsePoint = null;
/** Vibration (10-60 ms by value) and the visual pulse position for a played sample. */
function feedback(s) {
  pulsePoint = { lat: s.lat, lon: s.lon };
  const n = normOf(s);
  if (n === null || !opts.vibration || !canVibrate) return;
  try { navigator.vibrate(Math.round(10 + 50 * n)); } catch (e) { /* not allowed */ }
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
(function pulseLoop() {
  const el = $('pulse');
  const lvl = opts.pulse && pulsePoint ? engine.level() : 0;
  if (lvl > 0.02) {
    const r = view.canvas.getBoundingClientRect();
    const dpr = view.canvas.width / (r.width || 1);
    const { x, y } = view.toXY(pulsePoint.lat, pulsePoint.lon);
    el.style.left = `${x / dpr}px`;
    el.style.top = `${y / dpr}px`;
    el.style.opacity = String(Math.min(1, 0.35 + lvl));
    el.style.transform = reducedMotion.matches ? 'none' : `scale(${1 + lvl * 0.9})`;
    el.style.filter = reducedMotion.matches ? `brightness(${0.7 + lvl})` : 'none';
  } else el.style.opacity = '0';
  requestAnimationFrame(pulseLoop);
})();

// ---------------------------------------------------------------------------------
// Guided journey
// ---------------------------------------------------------------------------------
const journey = { active: false, i: 0, run: null };
const CALM = (s) => s.level === 'weak';

/** Wait ms of unpaused time; resolves false if the run was cancelled. */
async function pwait(ms, run) {
  let left = ms;
  while (left > 0) {
    if (run.cancelled) return false;
    await sleep(50);
    if (!engine.paused) left -= 50;
  }
  return !run.cancelled;
}

async function narrate(text, run) {
  if (!speechAvailable()) announce(text);
  const words = text.split(/\s+/).length;
  // wait for the voice (or a safe estimate if the browser never reports the end), and always
  // leave a minimum reading time for people who read the text instead of hearing it
  await Promise.all([
    Promise.race([speak(text, getLang()), pwait(1500 + words * 480, run)]),
    pwait(800 + words * 120, run),
  ]);
  return !run.cancelled;
}

function renderJourney() {
  const stop = STOPS[journey.i];
  $('journey').hidden = !journey.active;
  if (!journey.active) return;
  $('journey-step').textContent = t('journey_stop', { n: journey.i + 1, total: STOPS.length });
  $('journey-h').textContent = L(stop.title);
  $('journey-text').textContent = L(stop.text);
  $('j-back').disabled = journey.i === 0;
}

async function playPart(part, pt, run, seconds) {
  const L1 = LAYERS[part.layer];
  if (part.path) {
    const n = 12;
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1);
      const lat = part.path.lat + (pt.lat - part.path.lat) * f;
      const lon = part.path.lon + (pt.lon - part.path.lon) * f;
      const s = L1.sample(lat, lon);
      view.setCursor(lat, lon);
      playSample(engine, s, { dur: 0.6 });
      feedback(s);
      present(s, { announceIt: false, rotateFact: false });
      if (!(await pwait(650, run))) return false;
    }
    present(pt.s, { announceIt: false });
    view.setCursor(pt.lat, pt.lon);
    playSample(engine, pt.s);
    return pwait(2600, run);
  }
  const tap = { air: 2.5, lights: 1.2, ocean: 3, aero: 2.5, forest: 2.5, lightning: 2.5 }[part.layer] || 2.5;
  let left = seconds * 1000;
  while (left > 0) {
    playSample(engine, pt.s, { dur: tap });
    feedback(pt.s);
    const step = tap * 1000 + 350;
    if (!(await pwait(step, run))) return false;
    left -= step;
  }
  return true;
}

async function goStop(i) {
  if (journey.run) journey.run.cancel();
  engine.stopAll();
  cancelSpeech();
  journey.i = i;
  journey.active = true;
  const run = startRun();
  journey.run = run;
  renderJourney();
  const stop = STOPS[i];
  for (let k = 0; k < stop.parts.length; k++) {
    const part = stop.parts[k];
    await selectLayer(part.layer, { quiet: true, keepRuns: true });
    if (run.cancelled) return;
    const L1 = LAYERS[part.layer];
    const pt = part.hottestIn ? hottestIn(L1, part.hottestIn) : findNear(L1, part.at, part.find, part.radius);
    hideSummary();
    view.setOutline(null);
    if (k === 0 && !(await narrateAt(stop, part, pt, run))) return;
    if (!pt) {
      if (!(await narrate(t('journey_none'), run))) return;
      continue;
    }
    if (part.calmNote && CALM(pt.s) && !(await narrate(t('journey_calm'), run))) return;
    if (!(await playPart(part, pt, run, stop.parts.length > 1 ? 5 : 8.5))) return;
  }
  engine.sequences.delete(run);
  if (!(await pwait(1200, run))) return;
  if (i < STOPS.length - 1) goStop(i + 1);
  else endJourney(true);
}

/** Move the view to the stop's point, show it, then speak the narration. */
async function narrateAt(stop, part, pt, run) {
  const L1 = LAYERS[part.layer];
  const target = pt || part.at || { lat: 0, lon: 0 };
  if (L1.view !== 'global') {
    if (part.path) view.resetView();
    else view.fitBounds(target.lon - 18, target.lat - 12, target.lon + 18, target.lat + 12);
  }
  view.setCursor(target.lat, target.lon);
  view.setTemp({ lat: target.lat, lon: target.lon });
  const s = pt ? pt.s : L1.sample(target.lat, target.lon);
  present(s, { announceIt: false });
  return narrate(`${L(stop.title)}. ${L(stop.text)}`, run);
}

export async function startJourney(from = 0) {
  engine.ensure();
  engine.resume();
  if (state.screen !== 'explorer') await showExplorer({ focusMap: false });
  $('journey').hidden = false;
  goStop(from);
  $('j-next').focus();
}

function endJourney(finished) {
  if (journey.run) journey.run.cancel();
  journey.active = false;
  renderJourney();
  if (finished) {
    speak(t('journey_done'), getLang());
    announce(t('journey_done'));
    $('map').focus();
  }
}

$('j-next').addEventListener('click', () => goStop(Math.min(STOPS.length - 1, journey.i + 1)));
$('j-back').addEventListener('click', () => goStop(Math.max(0, journey.i - 1)));
$('j-end').addEventListener('click', () => { engine.stopAll(); cancelSpeech(); endJourney(false); $('map').focus(); });
$('btn-journey').addEventListener('click', () => startJourney(0));
$('btn-journey2').addEventListener('click', () => startJourney(0));
$('btn-options').addEventListener('click', () => openDialog('dlg-options'));
onLangChange(() => renderJourney());
applyOptions();

$('btn-start').addEventListener('click', () => showExplorer());
$('btn-test').addEventListener('click', testSound);
$('btn-how').addEventListener('click', () => openDialog('dlg-how'));
$('btn-help').addEventListener('click', () => openDialog('dlg-help'));
$('btn-about').addEventListener('click', () => openDialog('dlg-about'));
$('btn-play').addEventListener('click', togglePause);
$('btn-stop').addEventListener('click', stopAll);
$('btn-scale').addEventListener('click', hearScale);
$('btn-sweep').addEventListener('click', landscapeSweep);
$('btn-surprise').addEventListener('click', surprise);
$('btn-compare').addEventListener('click', () => openDialog('dlg-compare'));
$('btn-zoom-in').addEventListener('click', () => view.zoomBy(2));
$('btn-zoom-out').addEventListener('click', () => view.zoomBy(0.5));
$('btn-zoom-reset').addEventListener('click', () => { view.resetView(); view.setOutline(null); });
$('vol').addEventListener('input', (e) => setVolume(+e.target.value));
document.querySelectorAll('input[name="speed"]').forEach((r) => {
  r.checked = r.value === state.speed;
  r.addEventListener('change', () => { state.speed = r.value; store.set('speed', r.value); });
});

// ---------------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------------
initLang();
applyI18n();
syncLangButtons();
setVolume(store.get('volume', 60));
renderCards();
updatePlayButton();
updateSheetText();
$('planet').style.backgroundImage = "url('data/air/texture.jpg')";
LAYERS.air.load().catch(() => {});
geo.load().then(initSearch).catch((e) => console.error(e));

// test hook for the headless checks
window.__eis = { state, engine, selectLayer, goTo, LAYERS, geo, hearCountry, summarize, searchPlaces };
