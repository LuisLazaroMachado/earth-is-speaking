// My Earth Song: permanent markers (up to 100, mixed layers), an accessible list, a playlist
// in three modes, share links (the whole list lives in the URL fragment: no accounts, no
// server), sound postcards that can be answered with a second place, and a WAV download.
import { createOfflineEngine, encodeWav } from './core/audio.js';

export const MAX_MARKERS = 100;
const NAME_MAX = 24;
const r2 = (x) => Math.round(x * 100) / 100;
const clean = (s) => String(s || '').replace(/[\u0000-\u001f]/g, '').slice(0, NAME_MAX);

/** Parse the URL fragment: #v=1&lang=..&m=layer,lat,lon,name;...&p=layer,lat,lon,name|... */
export function parseHash(hash, validLayers) {
  const out = { markers: [], postcard: [], lang: null };
  if (!hash || hash.length < 2) return out;
  let params;
  try { params = new URLSearchParams(hash.replace(/^#/, '')); } catch (e) { return out; }
  if (params.get('v') !== '1') return out;
  const lang = params.get('lang');
  if (lang === 'en' || lang === 'es') out.lang = lang;
  const one = (txt) => {
    const [layer, la, lo, ...rest] = txt.split(',');
    const lat = Number(la);
    const lon = Number(lo);
    if (!validLayers.includes(layer) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    let name = '';
    try { name = decodeURIComponent(rest.join(',')); } catch (e) { name = ''; }
    return { layer, lat, lon, name: clean(name) };
  };
  (params.get('m') || '').split(';').filter(Boolean).slice(0, MAX_MARKERS).forEach((x) => { const m = one(x); if (m) out.markers.push(m); });
  (params.get('p') || '').split('|').filter(Boolean).slice(0, 2).forEach((x) => { const m = one(x); if (m) out.postcard.push(m); });
  return out;
}

const enc = (m) => `${m.layer},${r2(m.lat)},${r2(m.lon)},${encodeURIComponent(clean(m.name))}`;

export function createSong(api) {
  const { $, t, L, LAYERS, engine, playSample, announce, say, getLang, state } = api;
  const song = { markers: [], playing: null, postcardFrom: null };

  const sampleOf = (m) => LAYERS[m.layer].sample(m.lat, m.lon);
  const ready = (m) => !!LAYERS[m.layer].grid;
  const phraseOf = (m) => (ready(m) ? api.CONTENT[m.layer].phrase(sampleOf(m)) : '');

  function autoName(m) {
    if (LAYERS[m.layer].view === 'global') return clean(api.layerName(m.layer));
    const name = api.placeOf(sampleOf(m))
      .replace(/^(near|cerca de) /i, '')
      .replace(/[()]/g, '')
      .replace(/(\d+)\.\d°/g, '$1°')
      .replace(/° ([NSEWO])/g, '°$1');
    return clean(name);
  }

  // ---- URL ----------------------------------------------------------------------
  function baseUrl() { return `${location.origin}${location.pathname}`; }
  function listHash() {
    if (!song.markers.length) return '';
    return `v=1&lang=${getLang()}&m=${song.markers.map(enc).join(';')}`;
  }
  function syncUrl() {
    const h = listHash();
    try { history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search); } catch (e) { /* file:// */ }
  }

  // ---- markers --------------------------------------------------------------------
  function add(m) {
    if (song.markers.length >= MAX_MARKERS) { announce(t('marker_max')); return false; }
    const marker = { layer: m.layer, lat: m.lat, lon: m.lon, name: clean(m.name) || '' };
    if (!marker.name) marker.name = autoName(marker);
    song.markers.push(marker);
    render();
    syncUrl();
    if (state.audioOnly) engine.tick();
    announce(t('marker_added', { n: song.markers.length, name: marker.name }));
    return true;
  }

  function remove(i) {
    const [m] = song.markers.splice(i, 1);
    render();
    syncUrl();
    announce(t('marker_deleted', { name: m.name }));
    const rows = $('song-list').querySelectorAll('li');
    const next = rows[Math.min(i, rows.length - 1)];
    (next ? next.querySelector('button') : $('song-play')).focus();
  }

  function rename(i, name) {
    song.markers[i].name = clean(name) || song.markers[i].name;
    render();
    syncUrl();
  }

  /** Markers drawn on the current view: flat-map markers on every flat layer, global ones only on their own picture. */
  function updateMap() {
    const cur = api.layer();
    const list = [];
    song.markers.forEach((m, i) => {
      const global = LAYERS[m.layer].view === 'global';
      if ((cur.view === 'global') ? (m.layer === cur.id) : !global) list.push({ lat: m.lat, lon: m.lon, n: i + 1 });
    });
    api.view.setMarkers(list);
  }

  // ---- list rendering ------------------------------------------------------------
  function render() {
    $('btn-song').textContent = t('my_song_count', { n: song.markers.length });
    const missing = song.markers.filter((m) => !ready(m));
    if (missing.length) loadLayers(missing).then(render).catch(() => {});
    updateMap();
    const ol = $('song-list');
    ol.innerHTML = '';
    $('song-empty').hidden = song.markers.length > 0;
    ['song-play', 'song-share', 'song-download'].forEach((id) => { $(id).disabled = !song.markers.length; });
    song.markers.forEach((m, i) => {
      const li = document.createElement('li');
      li.className = 'song-row';
      const label = t('marker_row', { n: i + 1, total: song.markers.length, name: m.name, phrase: phraseOf(m), layer: api.layerName(m.layer) });
      li.setAttribute('aria-label', label);
      const txt = document.createElement('p');
      txt.className = 'song-text';
      txt.innerHTML = `<span class="song-num" aria-hidden="true">${i + 1}</span> <strong></strong><br><span class="song-sub"></span>`;
      txt.querySelector('strong').textContent = m.name;
      txt.querySelector('.song-sub').textContent = `${api.layerName(m.layer)} · ${phraseOf(m)}`;
      const acts = document.createElement('div');
      acts.className = 'song-acts';
      const mk = (key, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary btn-small';
        b.innerHTML = `${t(key)}<span class="sr-only">: ${t('marker_n', { n: i + 1 })}, ${m.name.replace(/[<>&]/g, '')}</span>`;
        b.addEventListener('click', fn);
        acts.appendChild(b);
      };
      mk('play', () => playOne(i));
      mk('rename', () => startRename(li, i));
      mk('delete', () => remove(i));
      li.append(txt, acts);
      ol.appendChild(li);
    });
  }

  function startRename(li, i) {
    const m = song.markers[i];
    li.innerHTML = '';
    const lab = document.createElement('label');
    lab.textContent = t('name_label');
    lab.htmlFor = `rename-${i}`;
    const inp = document.createElement('input');
    inp.id = `rename-${i}`;
    inp.type = 'text';
    inp.maxLength = NAME_MAX;
    inp.value = m.name;
    inp.className = 'rename-input';
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn btn-small';
    save.textContent = t('save');
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-secondary btn-small';
    cancel.textContent = t('cancel');
    const done = (ok) => {
      if (ok) rename(i, inp.value); else render();
      const row = $('song-list').querySelectorAll('li')[i];
      if (row) row.querySelector('button').focus();
    };
    save.addEventListener('click', () => done(true));
    cancel.addEventListener('click', () => done(false));
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); done(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
    });
    const wrap = document.createElement('div');
    wrap.className = 'song-acts';
    wrap.append(save, cancel);
    li.append(lab, inp, wrap);
    inp.focus();
    inp.select();
  }

  // ---- playback --------------------------------------------------------------------
  async function loadLayers(list) {
    await Promise.all([...new Set(list.map((m) => m.layer))].map((id) => LAYERS[id].load()));
  }

  async function playOne(i) {
    const m = song.markers[i];
    await loadLayers([m]);
    if (api.layer().id !== m.layer) await api.selectLayer(m.layer, { quiet: true });
    api.goTo(m.lat, m.lon, { placeText: m.name });
    announce(`${t('marker_n', { n: i + 1 })}: ${m.name}. ${phraseOf(m)}`);
  }

  function order(mode) {
    const list = song.markers.map((m, i) => ({ ...m, i }));
    if (mode === 'lr') list.sort((a, b) => a.lon - b.lon);
    return list;
  }

  async function playAll() {
    if (!song.markers.length) return;
    engine.ensure();
    engine.stopAll();
    const mode = document.querySelector('input[name="song-mode"]:checked').value;
    const list = order(mode);
    await loadLayers(list);
    const steps = [];
    const status = $('song-status');
    if (mode === 'chord') {
      for (let g = 0; g * 8 < list.length; g++) {
        const group = list.slice(g * 8, g * 8 + 8);
        steps.push({ at: g * 3200, fn: () => {
          status.textContent = t('playing_group', { a: g * 8 + 1, b: g * 8 + group.length });
          group.forEach((m) => playSample(engine, sampleOf(m), { dur: 3, gain: 0.55 }));
        } });
      }
    } else {
      list.forEach((m, k) => steps.push({ at: k * 1500, fn: () => {
        status.textContent = t('playing_marker', { n: m.i + 1, name: m.name });
        playSample(engine, sampleOf(m), { dur: 1.4 });
      } }));
    }
    announce(t('playlist_start', { n: list.length }));
    engine.sequence(steps, { tail: mode === 'chord' ? 3200 : 1500, onEnd: () => { status.textContent = t('song_done'); announce(t('song_done')); } });
  }

  // ---- sharing -------------------------------------------------------------------
  async function copy(url) {
    $('share-out').hidden = false;
    $('share-url').value = url;
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { ok = false; }
    $('share-msg').textContent = ok ? t('link_copied') : t('link_ready');
    announce(ok ? t('link_copied') : t('link_ready'));
    if (!ok) { $('share-url').focus(); $('share-url').select(); }
  }

  function shareList() { syncUrl(); copy(`${baseUrl()}#${listHash()}`); }

  /** Share the current place (temporary marker) as a sound postcard; when answering a
   *  postcard, the link holds the original place and yours. */
  function sharePlace() {
    const cur = api.currentPlace();
    if (!cur) { announce(t('no_temp')); return; }
    const mine = { ...cur, name: cur.name || autoName(cur) };
    const places = song.postcardFrom ? [song.postcardFrom, mine] : [mine];
    copy(`${baseUrl()}#v=1&lang=${getLang()}&p=${places.map(enc).join('|')}`);
  }

  async function renderWav() {
    if (!song.markers.length) return;
    const mode = document.querySelector('input[name="song-mode"]:checked').value;
    const list = order(mode);
    await loadLayers(list);
    $('song-status').textContent = t('rendering');
    announce(t('rendering'));
    const total = mode === 'chord' ? Math.ceil(list.length / 8) * 3.2 + 1 : list.length * 1.5 + 1.5;
    const off = createOfflineEngine(total, Math.max(0.3, engine.volume));
    if (mode === 'chord') {
      for (let g = 0; g * 8 < list.length; g++) list.slice(g * 8, g * 8 + 8).forEach((m) => playSample(off, sampleOf(m), { delay: g * 3.2, dur: 3, gain: 0.55 }));
    } else list.forEach((m, k) => playSample(off, sampleOf(m), { delay: k * 1.5, dur: 1.4 }));
    const buf = await off.ctx.startRendering();
    const wav = encodeWav(buf);
    download(wav, 'earth-is-speaking-song.wav');
    const credits = creditsText(list);
    setTimeout(() => download(new Blob([credits], { type: 'text/plain;charset=utf-8' }), 'earth-is-speaking-credits.txt'), 600);
    $('song-status').textContent = t('download_ready');
    announce(t('download_ready'));
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  function creditsText(list) {
    const ids = [...new Set(list.map((m) => m.layer))];
    const lines = [
      'Earth Is Speaking - My Earth Song',
      'Independent project made for the NASA Space Apps Challenge 2026. Not endorsed by NASA.',
      '',
      'Markers:',
      ...list.map((m, k) => `${k + 1}. ${m.name} - ${L({ en: api.layerName(m.layer), es: api.layerName(m.layer) })} (${r2(m.lat)}, ${r2(m.lon)})`),
      '',
      'Data and images:',
      ...ids.map((id) => `- ${api.CONTENT[id].source()} ${L(api.CONTENT[id].credit)}`),
      '- Borders: Natural Earth (public domain).',
      '',
      `Listen again: ${baseUrl()}#${listHash()}`,
    ];
    return lines.join('\r\n');
  }

  // ---- panel -----------------------------------------------------------------------
  function open() {
    $('song').hidden = false;
    $('panel').classList.add('song-open', 'open');
    render();
    $('song-h').focus();
  }
  function close() {
    $('song').hidden = true;
    $('panel').classList.remove('song-open');
    $('btn-song').focus();
  }

  $('btn-song').addEventListener('click', () => ($('song').hidden ? open() : close()));
  $('song-close').addEventListener('click', close);
  $('song-play').addEventListener('click', playAll);
  $('song-share').addEventListener('click', shareList);
  $('song-download').addEventListener('click', () => renderWav().catch((e) => { console.error(e); announce(t('img_error')); }));
  $('btn-add-marker').addEventListener('click', () => {
    const cur = api.currentPlace();
    if (!cur) { announce(t('no_temp')); return; }
    add(cur);
  });
  $('btn-share-place').addEventListener('click', sharePlace);

  return { song, add, render, updateMap, playAll, open, close, syncUrl, sharePlace };
}
