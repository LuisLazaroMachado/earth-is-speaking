// Voice questions and commands with the Web Speech API (designed for Google Chrome; the
// microphone button is hidden where speech recognition does not exist). Chrome sends the
// audio to a Google cloud service; the microphone is only used after the user presses the
// button (stated in About & methods > Privacy).
import { norm } from './core/geo.js';

const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
export const voiceSupported = () => !!Rec;

/** Listen once. Resolves to an array of transcripts (best first), or [] on silence/error. */
export function listenOnce(lang, timeoutMs = 9000) {
  return new Promise((resolve) => {
    if (!Rec) { resolve([]); return; }
    let done = false;
    const rec = new Rec();
    rec.lang = lang === 'es' ? 'es-ES' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 4;
    const finish = (v) => { if (!done) { done = true; clearTimeout(timer); try { rec.abort(); } catch (e) { /* ended */ } resolve(v); } };
    rec.onresult = (e) => {
      const r = e.results[0];
      const out = [];
      for (let i = 0; i < r.length; i++) out.push(r[i].transcript);
      finish(out);
    };
    rec.onerror = () => finish([]);
    rec.onend = () => finish([]);
    const timer = setTimeout(() => finish([]), timeoutMs);
    try { rec.start(); } catch (e) { finish([]); }
  });
}

// Commands in both languages (accents removed before matching).
const COMMANDS = [
  ['audioonly', /^(audio[- ]?only( mode)?|modo solo audio|solo audio)$/],
  ['journey', /^(start the journey|journey|empezar el recorrido|recorrido|empieza el recorrido)$/],
  ['play', /^(play|resume|continue|reproducir|reproduce|continuar|sigue)$/],
  ['pause', /^(pause|pausa|pausar)$/],
  ['stop', /^(stop|detener|deten|para|parar|alto)$/],
  ['louder', /^(louder|volume up|mas fuerte|sube el volumen|subir volumen)$/],
  ['quieter', /^(quieter|softer|volume down|mas suave|mas bajo|baja el volumen|bajar volumen)$/],
  ['repeat', /^(repeat|say again|repetir|repite|otra vez)$/],
  ['where', /^(where am i|donde estoy)\??$/],
  ['read', /^(read the data|read data|read the panel|lee los datos|leer los datos|lee el panel)$/],
  ['help', /^(help|ayuda|comandos|commands)$/],
  ['surprise', /^(surprise me|sorprendeme|sorpresa)$/],
  ['nextlayer', /^(next layer|siguiente capa)$/],
  ['prevlayer', /^(previous layer|capa anterior)$/],
  ['scale', /^(hear the scale|escuchar la escala|la escala|scale)$/],
  ['sweep', /^(landscape sweep|sweep|barrido( del paisaje)?)$/],
];

const LAYER_WORDS = [
  ['air', /\b(air temperature|temperature|temperatura( del aire)?|calor|frio)\b/],
  ['lights', /\b(night lights|lights|luces( nocturnas)?)\b/],
  ['ocean', /\b(ocean( currents)?|currents|corrientes( del oceano)?|oceano)\b/],
  ['aero', /\b(aerosols?|aerosoles|polvo|dust)\b/],
  ['forest', /\b(forest( height)?|trees|bosques?|arboles|altura del bosque)\b/],
  ['lightning', /\b(lightning|storms|rayos|tormentas)\b/],
];

const PLACE_PREFIX = /^(i want to (hear|listen to)|let me hear|take me to|go to|play|quiero (escuchar|oir)|llevame a|vamos a|ve a|escuchar)\s+/;

/**
 * Turn a transcript into an action: {type: 'command', name} | {type: 'layer', id} |
 * {type: 'place', text}.
 */
export function parseUtterance(raw) {
  const s = norm(raw).replace(/[.,!¡¿?]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  for (const [name, re] of COMMANDS) if (re.test(s)) return { type: 'command', name };
  const pm = s.match(PLACE_PREFIX);
  if (pm) return { type: 'place', text: s.slice(pm[0].length) };
  for (const [id, re] of LAYER_WORDS) if (re.test(s) && s.split(' ').length <= 4) return { type: 'layer', id };
  return { type: 'place', text: s };
}

export const VOICE_HELP = {
  en: 'Say a place, like Lima or Japan. Or say: surprise me, play, pause, stop, louder, quieter, repeat, where am I, read the data, next layer, previous layer, a layer name, hear the scale, or start the journey.',
  es: 'Di un lugar, como Lima o Japón. O di: sorpréndeme, reproducir, pausa, detener, más fuerte, más suave, repetir, dónde estoy, lee los datos, siguiente capa, capa anterior, el nombre de una capa, escuchar la escala o empezar el recorrido.',
};
