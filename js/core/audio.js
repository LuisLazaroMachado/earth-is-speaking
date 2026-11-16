// Audio engine: voices -> master gain (hard cap) -> compressor/limiter -> output.
// Nothing is created until the first user action (browsers also require this).

const PENTA = [0, 2, 4, 7, 9]; // C major pentatonic: C D E G A
export const MIDI = { C2: 36, G2: 43, A2: 45, C3: 48, C4: 60, G4: 67, C5: 72, G5: 79, C6: 84, E6: 88 };

export function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

/** All pentatonic MIDI notes between lo and hi (inclusive). */
export function scaleNotes(lo, hi) {
  const out = [];
  for (let m = lo; m <= hi; m++) if (PENTA.includes(((m % 12) + 12) % 12)) out.push(m);
  return out;
}

/** Map a 0..1 value to the nearest pentatonic note in [lo, hi]. */
export function quantize(norm, lo, hi) {
  const notes = scaleNotes(lo, hi);
  const n = Math.max(0, Math.min(1, norm));
  return notes[Math.round(n * (notes.length - 1))];
}

const FADE = 0.02; // 20 ms fades on every start and stop

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.6; // default 60 %
    this.maxVolume = 1.0; // hard cap on the master gain
    this.maxVoices = 8;
    this.voices = [];
    this.paused = false;
    this.sequences = new Set();
    this.onLevel = null;
  }

  get ready() { return !!this.ctx; }

  /** Create (or resume) the AudioContext. Call only from a user gesture. */
  ensure() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      const ctx = new C();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.knee.value = 6;
      this.comp.ratio.value = 14;
      this.comp.attack.value = 0.003;
      this.comp.release.value = 0.2;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.master.connect(this.comp);
      this.comp.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.noiseBuf = this._makeNoise(2);
    }
    if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();
    return this.ctx;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(this.maxVolume, v));
    if (this.ctx) this.master.gain.setTargetAtTime(this.volume, this.now, 0.02);
  }

  /** Current output level 0..1 (for the visual pulse). */
  level() {
    if (!this.analyser) return 0;
    const buf = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
    return Math.min(1, peak / 100);
  }

  /** A voice is one gain node that all its sources feed. Oldest voices are dropped past 8. */
  voice(t0, dur) {
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(this.master);
    const v = { out: g, sources: [], nodes: [g], end: t0 + dur };
    if (!this.offline) this.voices = this.voices.filter((x) => !x.killed && x.end > this.now);
    if (!this.offline) this.voices.push(v);
    while (this.voices.length > this.maxVoices) this.kill(this.voices[0]);
    if (!this.offline) { // offline renders keep every node until the render is done
      const ms = Math.max(0, (t0 + dur - this.now) * 1000) + 300;
      v.timer = setTimeout(() => this._remove(v), ms);
    }
    return v;
  }

  _remove(v) {
    const i = this.voices.indexOf(v);
    if (i >= 0) this.voices.splice(i, 1);
    v.nodes.forEach((n) => { try { n.disconnect(); } catch (e) { /* already gone */ } });
  }

  kill(v, fade = FADE) {
    if (!this.ctx || v.killed) return;
    v.killed = true;
    const t = this.now;
    const p = v.out.gain;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(0, t + fade);
    v.sources.forEach((s) => { try { s.stop(t + fade + 0.01); } catch (e) { /* not started */ } });
    clearTimeout(v.timer);
    setTimeout(() => this._remove(v), (fade + 0.05) * 1000);
  }

  /** Fade out every sounding voice (used on pointer release). */
  releaseAll(fade = 0.15) { [...this.voices].forEach((v) => this.kill(v, fade)); }

  /** Stop everything: voices and running sequences. */
  stopAll() {
    this.sequences.forEach((s) => s.cancel());
    this.sequences.clear();
    [...this.voices].forEach((v) => this.kill(v));
  }

  pause() {
    this.paused = true;
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    this.paused = false;
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** Short soft "tic" confirming a change of layer or place (audio-only mode). */
  tick() {
    if (!this.ensure()) return;
    const t0 = this.now + 0.005;
    const v = this.voice(t0, 0.08);
    this.perc(v.out.gain, t0, 0.18, 0.04);
    v.sources.push(this.osc('sine', 1760, t0, t0 + 0.08, v.out));
  }

  // ---- building blocks ----------------------------------------------------------

  osc(type, freq, t0, t1, dest, detuneCents = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detuneCents;
    o.connect(dest);
    o.start(t0);
    o.stop(t1 + 0.05);
    return o;
  }

  noise(t0, t1, dest) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    s.connect(dest);
    s.start(t0);
    s.stop(t1 + 0.05);
    return s;
  }

  gain(value, dest) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    g.connect(dest);
    return g;
  }

  filter(type, freq, q, dest) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(dest);
    return f;
  }

  /** Attack / decay / sustain / release envelope with 20 ms minimum fades. */
  env(param, t0, dur, { attack = 0.015, decay = 0.4, peak = 0.5, sustain = 0.6, release = 0.3 } = {}) {
    const a = Math.max(FADE, attack);
    const r = Math.max(FADE, Math.min(release, dur * 0.5));
    const holdEnd = Math.max(t0 + a, t0 + dur - r);
    param.setValueAtTime(0, t0);
    param.linearRampToValueAtTime(peak, t0 + a);
    const dEnd = Math.min(holdEnd, t0 + a + decay);
    param.linearRampToValueAtTime(peak * sustain, dEnd);
    param.setValueAtTime(peak * sustain, holdEnd);
    param.linearRampToValueAtTime(0, t0 + dur);
  }

  /** Percussive envelope: fast attack, exponential decay. */
  perc(param, t0, peak, decay) {
    param.setValueAtTime(0, t0);
    param.linearRampToValueAtTime(peak, t0 + FADE);
    param.exponentialRampToValueAtTime(0.0001, t0 + FADE + decay);
    param.setValueAtTime(0, t0 + FADE + decay + 0.01);
  }

  _makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- sequences (pausable timelines of callbacks) ------------------------------

  /**
   * Run steps [{at: ms, fn}] on a clock that stops while paused.
   * Returns a handle with cancel(). onEnd runs when the last step has fired.
   */
  sequence(steps, { onEnd, tail = 0 } = {}) {
    const sorted = [...steps].sort((a, b) => a.at - b.at);
    let elapsed = 0;
    let last = performance.now();
    let i = 0;
    let done = false;
    const total = (sorted.length ? sorted[sorted.length - 1].at : 0) + tail;
    const handle = {
      cancel: () => { done = true; clearInterval(iv); this.sequences.delete(handle); },
      get progress() { return total ? Math.min(1, elapsed / total) : 1; },
    };
    const tick = () => {
      const t = performance.now();
      if (!this.paused) elapsed += t - last;
      last = t;
      while (!done && i < sorted.length && sorted[i].at <= elapsed) {
        try { sorted[i].fn(); } catch (e) { console.error(e); }
        i++;
      }
      if (!done && i >= sorted.length && elapsed >= total) {
        handle.cancel();
        if (onEnd) onEnd();
      }
    };
    const iv = setInterval(tick, 15);
    this.sequences.add(handle);
    tick();
    return handle;
  }
}

/**
 * An engine that renders into an OfflineAudioContext (for "Download audio"). Same chain
 * (master gain, limiter); no voice limit, because every note is scheduled in advance.
 */
export function createOfflineEngine(seconds, volume = 0.6, sampleRate = 44100) {
  const e = new AudioEngine();
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate);
  e.ctx = ctx;
  e.maxVoices = Infinity;
  e.offline = true;
  e.master = ctx.createGain();
  e.master.gain.value = volume;
  e.comp = ctx.createDynamicsCompressor();
  e.comp.threshold.value = -14; e.comp.knee.value = 6; e.comp.ratio.value = 14;
  e.comp.attack.value = 0.003; e.comp.release.value = 0.2;
  e.master.connect(e.comp);
  e.comp.connect(ctx.destination);
  e.noiseBuf = e._makeNoise(2);
  e.ensure = () => ctx;
  return e;
}

/** Encode a mono AudioBuffer as a 16-bit PCM WAV Blob. */
export function encodeWav(buffer) {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + data.length * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]));
    out.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([out], { type: 'audio/wav' });
}

export const engine = new AudioEngine();
