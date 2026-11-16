// Spoken prompts with the browser's speech synthesis. Every spoken text is also shown
// on screen by the caller (for deaf and hard-of-hearing users).

let enabled = true;
let lastSpoken = '';

export function setSpeechEnabled(v) { enabled = v; if (!v) cancelSpeech(); }
export function speechAvailable() { return 'speechSynthesis' in window; }
export function lastUtterance() { return lastSpoken; }

function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.slice(0, 2);
  return voices.find((v) => v.lang === lang) || voices.find((v) => v.lang && v.lang.startsWith(base)) || null;
}

/** Speak text in 'en' or 'es'. Interrupts the previous utterance. Resolves when done. */
export function speak(text, lang = 'en', { interrupt = true, rate = 1 } = {}) {
  lastSpoken = text;
  if (!enabled || !speechAvailable() || !text) return Promise.resolve();
  const synth = window.speechSynthesis;
  if (interrupt) synth.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-ES' : 'en-US';
    const v = pickVoice(u.lang);
    if (v) u.voice = v;
    u.rate = rate;
    u.onend = resolve;
    u.onerror = resolve;
    synth.speak(u);
  });
}

export function cancelSpeech() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}

if (speechAvailable()) window.speechSynthesis.getVoices(); // warm up the voice list
