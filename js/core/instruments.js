// Sound rules for each layer: value -> note -> timbre. Fixed rules, no randomness except
// the small rhythm jitter in lightning (added in a later stage).
import { MIDI, midiToFreq, quantize } from './audio.js';

/** Default length of a single tap, in seconds. */
export const TAP_SECONDS = { air: 2.5, lights: 1.2, ocean: 3.0, aero: 2.5, forest: 2.5, lightning: 2.5 };

/**
 * Play the sound for a sample. Returns true if something sounds, false for silence.
 * opts.dur overrides the length (drag, sweep and playlist use shorter notes).
 * opts.gain scales the voice (sweep arpeggios are softer).
 */
export function playSample(engine, s, opts = {}) {
  if (!s || !s.hasData || !engine.ensure()) return false;
  const fn = INSTRUMENTS[s.layer];
  if (!fn) return false;
  const t0 = engine.now + (opts.delay || 0) + 0.005;
  const dur = opts.dur || TAP_SECONDS[s.layer] || 2.5;
  return fn(engine, s, t0, dur, opts.gain ?? 1) !== false;
}

const INSTRUMENTS = {
  // Forest height (trend): low = soft low hum on C2, tall = high bell (C4..C6); blended.
  forest(e, s, t0, dur, g) {
    const h = Math.max(0, Math.min(1, s.height));
    const v = e.voice(t0, dur);
    v.out.gain.value = 1;
    const hum = e.ctx.createGain();
    hum.connect(v.out);
    v.nodes.push(hum);
    e.env(hum.gain, t0, dur, { attack: 0.08, decay: 0.3, peak: 0.5 * (1 - h) * g + 0.04, sustain: 0.85, release: Math.min(0.4, dur * 0.4) });
    const lp = e.filter('lowpass', 220, 0.5, hum);
    v.nodes.push(lp);
    v.sources.push(e.osc('sine', midiToFreq(MIDI.C2), t0, t0 + dur, lp));
    v.sources.push(e.osc('triangle', midiToFreq(MIDI.C2), t0, t0 + dur, lp, 4));
    if (h > 0.05) {
      const f = midiToFreq(quantize(h, MIDI.C4, MIDI.C6));
      bell(e, v, f, t0, Math.min(1.6, dur), 0.32 * h * g + 0.03);
      if (dur > 2) bell(e, v, f, t0 + 1.2, Math.min(1.2, dur - 1.2), 0.22 * h * g + 0.02);
    }
    return true;
  },

  // Lightning (density and rhythm): one percussion hit per event cluster, 1..8 hits per
  // second by density, with a small random timing variation. Zero density = silence.
  lightning(e, s, t0, dur, g) {
    const d = Math.max(0, Math.min(1, s.density));
    if (d <= 0) return false;
    const rate = 1 + 7 * d;
    const v = e.voice(t0, dur);
    v.out.gain.value = 1;
    let t = t0;
    while (t < t0 + dur - 0.1) {
      const hit = e.ctx.createGain();
      hit.connect(v.out);
      v.nodes.push(hit);
      e.perc(hit.gain, t, 0.55 * g, 0.04);
      const bp = e.filter('bandpass', 800, 1.2, hit);
      v.nodes.push(bp);
      v.sources.push(e.noise(t, t + 0.08, bp));
      const thump = e.ctx.createGain();
      thump.connect(v.out);
      v.nodes.push(thump);
      e.perc(thump.gain, t, 0.6 * g, 0.12);
      v.sources.push(e.osc('sine', 80, t, t + 0.16, thump));
      t += (1 / rate) * (0.85 + Math.random() * 0.3);
    }
    return true;
  },

  // Air temperature: -40..+40 degC -> pentatonic C3..C6 (cold = low, hot = high).
  air(e, s, t0, dur, g) {
    const midi = quantize(s.norm, MIDI.C3, MIDI.C6);
    const f = midiToFreq(midi);
    const v = e.voice(t0, dur);
    e.env(v.out.gain, t0, dur, { attack: 0.015, decay: 0.4, peak: 0.42 * g, sustain: 0.55, release: Math.min(0.35, dur * 0.4) });
    v.sources.push(e.osc('triangle', f, t0, t0 + dur, v.out));
    const sineG = e.gain(0.6, v.out);
    v.nodes.push(sineG);
    v.sources.push(e.osc('sine', f, t0, t0 + dur, sineG));
    if (s.extreme === 'top') bell(e, v, f * 2, t0, Math.min(dur, 1.5), 0.25 * g);
    return true;
  },

  // Night lights (trend): more light = rising interval C5 -> G5, less light = falling G4 -> C4.
  lights(e, s, t0, dur, g) {
    if (s.kind !== 'more' && s.kind !== 'less') return false;
    const [a, b] = s.kind === 'more' ? [MIDI.C5, MIDI.G5] : [MIDI.G4, MIDI.C4];
    const vol = (0.2 + 0.8 * Math.max(0, Math.min(1, s.strength))) * 0.45 * g;
    const half = dur * 0.5;
    [[a, t0, half + 0.05], [b, t0 + half, dur - half]].forEach(([m, t, d]) => {
      const v = e.voice(t, d);
      e.env(v.out.gain, t, d, { attack: 0.03, decay: 0.2, peak: vol, sustain: 0.7, release: Math.min(0.25, d * 0.4) });
      v.sources.push(e.osc('sine', midiToFreq(m), t, t + d, v.out));
    });
    return true;
  },

  // Ocean currents (trend): intensity -> note C3..C4, volume 15-60 %, low-pass 300-3000 Hz.
  ocean(e, s, t0, dur, g) {
    const i = Math.max(0, Math.min(1, s.intensity));
    const midi = quantize(i, MIDI.C3, MIDI.C4);
    const f = midiToFreq(midi);
    const v = e.voice(t0, dur);
    const vol = (0.15 + 0.45 * i) * 0.8 * g;
    e.env(v.out.gain, t0, dur, { attack: Math.min(0.4, dur * 0.35), decay: 0.3, peak: vol, sustain: 0.85, release: Math.min(0.6, dur * 0.35) });
    const lp = e.filter('lowpass', 300 * Math.pow(10, i), 0.8, v.out);
    v.nodes.push(lp);
    v.sources.push(e.osc('triangle', f, t0, t0 + dur, lp, -8));
    v.sources.push(e.osc('triangle', f, t0, t0 + dur, lp, +8));
    return true;
  },

  // Aerosols (category): one instrument per type; volume from relative intensity.
  aero(e, s, t0, dur, g) {
    const parts = (s.mix && s.mix.length ? s.mix : [{ cat: s.cat, share: 1 }]).filter((p) => p.cat);
    if (!parts.length) return false;
    const vol = (0.25 + 0.75 * Math.max(0, Math.min(1, s.intensity))) * g / Math.sqrt(parts.length);
    parts.forEach((p) => AERO[p.cat] && AERO[p.cat](e, t0, dur, vol));
    return true;
  },
};

function bell(e, v, f, t0, dur, peak) {
  [[1, 1], [2.76, 0.35], [5.4, 0.15]].forEach(([ratio, amp]) => {
    const g = e.ctx.createGain();
    g.connect(v.out);
    v.nodes.push(g);
    e.perc(g.gain, t0, peak * amp, dur * (1 / ratio + 0.2));
    v.sources.push(e.osc('sine', f * ratio, t0, t0 + dur, g));
  });
}

const AERO = {
  // Dust: low warm pad on G2, low-pass 500 Hz.
  dust(e, t0, dur, vol) {
    const v = e.voice(t0, dur);
    e.env(v.out.gain, t0, dur, { attack: 0.25, decay: 0.3, peak: 0.55 * vol, sustain: 0.8, release: 0.5 });
    const lp = e.filter('lowpass', 500, 0.7, v.out);
    v.nodes.push(lp);
    const f = midiToFreq(MIDI.G2);
    v.sources.push(e.osc('sawtooth', f, t0, t0 + dur, lp, -6));
    v.sources.push(e.osc('triangle', f, t0, t0 + dur, lp, +6));
    v.sources.push(e.osc('sine', f * 2, t0, t0 + dur, lp));
  },
  // Sea salt: soft airy texture, noise band-passed between 2 and 4 kHz.
  seasalt(e, t0, dur, vol) {
    const v = e.voice(t0, dur);
    e.env(v.out.gain, t0, dur, { attack: 0.3, decay: 0.3, peak: 0.5 * vol, sustain: 0.8, release: 0.5 });
    const bp = e.filter('bandpass', 2830, 1.4, v.out);
    v.nodes.push(bp);
    v.sources.push(e.noise(t0, t0 + dur, bp));
  },
  // Black carbon: low pulsed marimba-like note on A2, 0.6 s decay, repeating.
  blackcarbon(e, t0, dur, vol) {
    const f = midiToFreq(MIDI.A2);
    const v = e.voice(t0, dur);
    v.out.gain.value = 1;
    for (let t = t0; t < t0 + dur - 0.2; t += 0.6) {
      [[1, 0.7], [4, 0.18], [9.2, 0.05]].forEach(([ratio, amp]) => {
        const g = e.ctx.createGain();
        g.connect(v.out);
        v.nodes.push(g);
        e.perc(g.gain, t, amp * vol, 0.6 / Math.sqrt(ratio));
        v.sources.push(e.osc('sine', f * ratio, t, t + 0.65, g));
      });
    }
  },
  // Sulfate: small glockenspiel-like bell on C6 and E6.
  sulfate(e, t0, dur, vol) {
    [[MIDI.C6, 0], [MIDI.E6, 0.75]].forEach(([m, off]) => {
      const t = t0 + off;
      if (t > t0 + dur - 0.3) return;
      const d = Math.min(1.5, t0 + dur - t);
      const v = e.voice(t, d);
      v.out.gain.value = 1;
      bell(e, v, midiToFreq(m), t, d, 0.3 * vol);
    });
  },
};
