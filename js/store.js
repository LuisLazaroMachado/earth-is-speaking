// Per-viewer preferences in localStorage (language, volume, mode). Every access is wrapped
// in try/catch: storage can be blocked, and the app must work without it.
const PREFIX = 'eis.';

export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  },
};
