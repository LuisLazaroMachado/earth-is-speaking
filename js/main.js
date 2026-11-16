// Earth Is Speaking - app entry point. Wires the core (layers, sound, text) to the views
// and the interface. The core only ever receives latitude/longitude.
import { engine } from './core/audio.js';
import { playSample } from './core/instruments.js';
import { LAYERS } from './core/layers.js';
import { MapView } from './views/mapView.js';
import { speak, lastUtterance, cancelSpeech } from './core/speech.js';
import { initLang, setLang, getLang, t, L, applyI18n, onLangChange, fmtLatLon } from './i18n.js';
import { CONTENT, CARDS, icon, typeLabel, nextFact } from './content.js';
import { PLACES, nearestCity } from './data/places.js';
import { store } from './store.js';
import { shortcutsHTML, howToHTML, aboutHTML } from './ui/docs.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const CARD_ORDER = ['air', 'lights', 'ocean', 'aero', 'forest', 'lightning'];
const NAME_KEY = { air: 'layer_air', lights: 'layer_lights', ocean: 'layer_ocean', aero: 'layer_aero', forest: 'layer_forest', lightning: 'layer_light' };
const TYPE = { air: 'measured', lights: 'trend', ocean: 'trend', aero: 'category', forest: 'trend', lightning: 'density' };
const CARD_IMG = { air: 'data/cards/air.jpg', latest: 'data/cards/latest.jpg' };
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
  const near = nearestCity(lat, lon, 150);
  if (near) return t('near', { place: L(near.place) });
  const c = fmtLatLon(lat, lon);
  return t('coords', c);
}

// ---------------------------------------------------------------------------------
// Map view
// ---------------------------------------------------------------------------------
const view = new MapView($('map'), {
  onPress(lat, lon) {
    engine.stopAll();
    const s = layer().sample(lat, lon);
    playSample(engine, s);
    present(s, { announceIt: true });
  },
  onTap(lat, lon) { view.setTemp({ lat, lon }); },
  onDragStart() { engine.releaseAll(0.05); },
  onDrag(lat, lon) {
    const s = layer().sample(lat, lon);
    playSample(engine, s, { dur: 0.35, gain: 0.8 });
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
    present(s, { announceIt: true, rotateFact: false });
  },
  onActivate(lat, lon) {
    engine.stopAll();
    const s = layer().sample(lat, lon);
    playSample(engine, s);
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
  return `${placeLabel(s.lat, s.lon)}. ${c.phrase(s)}${v ? ' ' + v + '.' : ''}`;
}

function present(s, { announceIt = true, rotateFact = true } = {}) {
  state.last = s;
  const c = CONTENT[s.layer];
  $('p-icon').innerHTML = icon(s.layer);
  $('p-phrase').textContent = c.phrase(s);
  $('p-phrase').removeAttribute('data-i18n');
  $('p-place').textContent = placeLabel(s.lat, s.lon);
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
  vs.setAttribute('aria-label', t('view_map'));
  vs.innerHTML = `<span>${t('view_map')}</span>`;
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

export async function selectLayer(id, { latest = false, quiet = false } = {}) {
  const L1 = LAYERS[id];
  if (!L1) { announce(`${layerName(id)}. ${t('layer_soon')}`); return false; }
  engine.stopAll();
  state.layerId = id;
  state.latest = latest;
  markCurrentCard();
  await L1.load();
  const ok = await view.setImage(L1.image);
  $('map-error').hidden = ok;
  renderLayerInfo();
  if (state.last) {
    const s = L1.sample(state.last.lat, state.last.lon);
    state.fact = null;
    present(s, { announceIt: false });
  } else resetPanel();
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
  if (engine.paused) { engine.resume(); announce(t('resumed')); } else { engine.pause(); announce(t('paused')); }
  updatePlayButton();
}

export function stopAll() {
  engine.stopAll();
  cancelSpeech();
  engine.resume();
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
  const lats = [60, 20, -20, -60];
  const L1 = layer();
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

export function goTo(lat, lon, { full = true } = {}) {
  engine.stopAll();
  view.setCursor(lat, lon);
  view.setTemp({ lat, lon });
  const s = layer().sample(lat, lon);
  playSample(engine, s, full ? {} : { dur: 0.6 });
  present(s, { announceIt: false });
  return s;
}

function surprise() {
  engine.ensure();
  const L1 = layer();
  const ok = PLACES.filter((p) => L1.sample(p.lat, p.lon).hasData);
  if (!ok.length) { announce(t('quiet_here')); return; }
  const p = ok[Math.floor(Math.random() * ok.length)];
  const s = goTo(p.lat, p.lon);
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
  if (id === 'dlg-about') $('dlg-about-body').innerHTML = aboutHTML(LAYERS.air.meta);
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
    if (state.last) present(state.last, { announceIt: false, rotateFact: false }); else resetPanel();
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
});

// ---------------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------------
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

// test hook for the headless checks
window.__eis = { state, engine, selectLayer, goTo, LAYERS };
