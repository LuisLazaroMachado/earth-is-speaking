// Stage 1 entry point: air temperature on the flat map (replaced by main.js in stage 2).
import { engine } from './core/audio.js';
import { playSample } from './core/instruments.js';
import { LAYERS } from './core/layers.js';
import { MapView } from './views/mapView.js';
import { speak } from './core/speech.js';

const layer = LAYERS.air;
const $ = (id) => document.getElementById(id);

function tempText(s) {
  if (!s.hasData) return 'No data at this point (it is quiet here).';
  if (s.extreme === 'bottom') return '−40 °C or colder (bottom of the scale)';
  if (s.extreme === 'top') return '40 °C or more (top of the scale)';
  const t = Math.round(s.t);
  return `${t < 0 ? '−' : ''}${Math.abs(t)} °C (approx.)${s.nearTop ? ', near the top of the scale' : ''}`;
}

function soundText(s) {
  if (!s.hasData) return 'Silence.';
  if (s.norm < 0.3) return 'Low note: cold.';
  if (s.norm < 0.6) return 'Middle note: mild.';
  return s.extreme === 'top' ? 'High bright note with a bell: very hot.' : 'High bright note: hot.';
}

function show(s) {
  $('value').textContent = `${s.lat.toFixed(1)}°, ${s.lon.toFixed(1)}°: ${tempText(s)}`;
  $('sound').textContent = soundText(s);
}

const view = new MapView($('map'), {
  onPress(lat, lon) {
    engine.stopAll();
    const s = layer.sample(lat, lon);
    playSample(engine, s);
    show(s);
  },
  onTap(lat, lon) { view.setTemp({ lat, lon }); },
  onDragStart() { engine.releaseAll(0.05); },
  onDrag(lat, lon) {
    const s = layer.sample(lat, lon);
    playSample(engine, s, { dur: 0.35, gain: 0.8 });
    show(s);
  },
  onDragEnd() { engine.releaseAll(0.2); },
  onCursor(lat, lon) {
    const s = layer.sample(lat, lon);
    playSample(engine, s, { dur: 0.4 });
    show(s);
  },
  onActivate(lat, lon) {
    engine.stopAll();
    const s = layer.sample(lat, lon);
    playSample(engine, s);
    show(s);
    view.setTemp({ lat, lon });
  },
});

$('play').addEventListener('click', togglePause);
$('stop').addEventListener('click', () => { engine.stopAll(); engine.resume(); $('play').textContent = 'Pause'; });
$('vol').addEventListener('input', (e) => engine.setVolume(e.target.value / 100));
$('scale').addEventListener('click', hearScale);

function togglePause() {
  engine.ensure();
  if (engine.paused) { engine.resume(); $('play').textContent = 'Pause'; }
  else { engine.pause(); $('play').textContent = 'Play'; }
}

function hearScale() {
  engine.ensure();
  engine.stopAll();
  const steps = layer.scaleSteps().map((s, i) => ({
    at: i * 1400,
    fn: () => {
      playSample(engine, s, { dur: 1.1 });
      const label = tempText(s).replace(' (approx.)', '');
      $('value').textContent = `Scale: ${label}`;
      speak(label, 'en');
    },
  }));
  engine.sequence(steps, { tail: 1200 });
}

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); togglePause(); }
  else if (e.key === 's' || e.key === 'S') { engine.stopAll(); }
  else if (e.key === '[') { $('vol').value = Math.max(0, +$('vol').value - 10); engine.setVolume($('vol').value / 100); }
  else if (e.key === ']') { $('vol').value = Math.min(100, +$('vol').value + 10); engine.setVolume($('vol').value / 100); }
});

(async () => {
  await layer.load();
  await view.setImage(layer.image);
  $('date').textContent = `Data: NASA SVS 5147, GEOS-FP model output for ${layer.meta.frame_label} (the newest hours of this model run are a short-range forecast).`;
})();
