// Text content per layer (EN/ES): simple phrase, value, sound description, facts,
// "why it matters" and "why it sounds this way". Every fact lists the source used to
// verify it (also shown in About & methods). Facts that could not be verified are not here.
import { t, L, fmtNum, getLang } from './i18n.js';

const ICONS = {
  air: '<path d="M12 3a2.5 2.5 0 0 0-2.5 2.5v8.2a4.5 4.5 0 1 0 5 0V5.5A2.5 2.5 0 0 0 12 3z"/><circle cx="12" cy="17.5" r="2" fill="currentColor"/>',
  lights: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  ocean: '<path d="M2 8c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 13c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 18c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/>',
  aero: '<circle cx="6" cy="8" r="1.6"/><circle cx="12" cy="5" r="1.2"/><circle cx="17" cy="9" r="2"/><circle cx="9" cy="14" r="2.2"/><circle cx="16" cy="16" r="1.4"/><circle cx="5" cy="19" r="1.2"/><circle cx="12" cy="20" r="1"/>',
  forest: '<path d="M12 2l5 8h-3l4 6h-5v5h-2v-5H6l4-6H7z"/>',
  lightning: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  latest: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export function icon(id, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[id] || ''}</svg>`;
}

/** Card text for each layer. */
export const CARDS = {
  air: { en: 'How warm or cold the air is near the ground.', es: 'Qué tan cálido o frío está el aire cerca del suelo.' },
  lights: { en: 'Where night lights grew or faded, 2012 to 2023.', es: 'Dónde crecieron o se apagaron las luces de noche, de 2012 a 2023.' },
  ocean: { en: 'Swirling currents that carry heat around the planet.', es: 'Corrientes que giran y llevan calor por todo el planeta.' },
  aero: { en: 'Dust, smoke, sea salt and tiny particles in the air.', es: 'Polvo, humo, sal marina y partículas diminutas en el aire.' },
  forest: { en: 'How tall forests are, measured by a laser in space.', es: 'Qué tan altos son los bosques, medidos con un láser desde el espacio.' },
  lightning: { en: 'Where lightning flashes, seen from the space station.', es: 'Dónde caen rayos, vistos desde la estación espacial.' },
};

const TYPE_KEY = { measured: 'type_measured', trend: 'type_trend', category: 'type_category', density: 'type_density' };
export function typeLabel(type) { return t(TYPE_KEY[type]); }

// ---------------------------------------------------------------------------------
// Air temperature
// ---------------------------------------------------------------------------------

function tempValue(s) {
  if (s.extreme === 'bottom') return t('bottom_scale');
  if (s.extreme === 'top') return t('top_scale');
  const v = `${fmtNum(Math.round(s.t))} °C (${t('approx')})`;
  return s.nearTop ? `${v}, ${t('near_top')}` : v;
}

const AIR_PHRASES = [
  { max: -40, en: 'Extremely cold here, at the bottom of the scale.', es: 'Aquí hace un frío extremo, en el límite inferior de la escala.' },
  { max: -30, en: 'Extremely cold here.', es: 'Aquí hace un frío extremo.' },
  { max: -10, en: 'Very cold here.', es: 'Aquí hace mucho frío.' },
  { max: 5, en: 'Cold here.', es: 'Aquí hace frío.' },
  { max: 15, en: 'Cool here.', es: 'Aquí está fresco.' },
  { max: 25, en: 'Pleasant here.', es: 'Aquí el clima es agradable.' },
  { max: 35, en: 'Hot here.', es: 'Aquí hace calor.' },
  { max: Infinity, en: 'Very hot here.', es: 'Aquí hace mucho calor.' },
];

/** True if the point is on or just off Peru's coast (Humboldt Current area). */
export function onPeruCoast(lat, lon) {
  if (lat > -3.5 || lat < -18.5) return false;
  // the coastline runs roughly from (-4, -81.3) to (-18.3, -70.4)
  const f = (lat + 4) / (-18.3 + 4);
  const coastLon = -81.3 + f * (-70.4 + 81.3);
  return lon > coastLon - 3 && lon < coastLon + 1.2;
}

export const AIR = {
  phrase(s) {
    if (!s.hasData) return t('quiet_here');
    if (s.extreme === 'bottom') return L(AIR_PHRASES[0]);
    return L(AIR_PHRASES.find((p) => s.t < p.max) || AIR_PHRASES[AIR_PHRASES.length - 1]);
  },
  value(s) { return s.hasData ? tempValue(s) : t('no_data'); },
  shortValue(s) {
    if (!s.hasData) return '';
    if (s.extreme === 'bottom') return t('bottom_scale');
    if (s.extreme === 'top') return t('top_scale');
    return `${fmtNum(Math.round(s.t))} °C`;
  },
  sound(s) {
    if (!s.hasData) return getLang() === 'es' ? 'Silencio.' : 'Silence.';
    const es = getLang() === 'es';
    if (s.extreme === 'bottom') return es ? 'La nota más grave: frío extremo.' : 'Lowest note: extreme cold.';
    if (s.extreme === 'top') return es ? 'La nota más aguda con campana: calor extremo.' : 'Highest note with a bell: extreme heat.';
    if (s.t < -10) return es ? 'Nota grave: mucho frío.' : 'Low note: very cold.';
    if (s.t < 5) return es ? 'Nota medio grave: frío.' : 'Low-middle note: cold.';
    if (s.t < 15) return es ? 'Nota media: fresco.' : 'Middle note: cool.';
    if (s.t < 25) return es ? 'Nota medio aguda: agradable.' : 'Middle-high note: pleasant.';
    if (s.t < 35) return es ? 'Nota aguda y brillante: calor.' : 'High bright note: hot.';
    return es ? 'Nota muy aguda y brillante: mucho calor.' : 'Very high bright note: very hot.';
  },
  range() {
    return getLang() === 'es'
      ? '−40 °C a +40 °C. Los colores más allá de la barra se indican como "o menos" / "o más".'
      : '−40 °C to +40 °C. Colors beyond the bar are reported as "or colder" / "or more".';
  },
  source() {
    return getLang() === 'es'
      ? 'NASA SVS 5147 · modelo GEOS-FP (Global Modeling and Assimilation Office de NASA). Temperatura del aire a 2 m.'
      : 'NASA SVS 5147 · GEOS-FP model (NASA Global Modeling and Assimilation Office). Air temperature at 2 m.';
  },
  date(meta) {
    const lbl = meta ? meta.frame_label : '';
    return getLang() === 'es'
      ? `${lbl}, resultado del modelo (las horas más recientes de cada corrida son un pronóstico de corto plazo)`
      : `${lbl}, model output (the newest hours of each model run are a short-range forecast)`;
  },
  scaleLabel(s) {
    if (s.extreme === 'bottom') return t('bottom_scale').replace(/\s*\(.*\)/, '');
    if (s.extreme === 'top') return t('top_scale').replace(/\s*\(.*\)/, '');
    return `${fmtNum(Math.round(s.t))} °C`;
  },
  credit: {
    en: 'Image: NASA Scientific Visualization Studio (SVS 5147), visualizer Joseph V. Ardizzone. Data: NASA GMAO GEOS-FP model.',
    es: 'Imagen: NASA Scientific Visualization Studio (SVS 5147), visualizador Joseph V. Ardizzone. Datos: modelo GEOS-FP de NASA GMAO.',
  },
  whyMatters: {
    en: 'As the planet warms, scientists track heat waves and how they affect human health.',
    es: 'Mientras el planeta se calienta, los científicos vigilan las olas de calor y cómo afectan la salud.',
  },
  whySounds(s) {
    const es = getLang() === 'es';
    const base = es ? 'Cada color del mapa se convierte en la temperatura que indica la barra oficial de NASA: frío = grave, calor = agudo.'
      : "Each map color becomes the temperature on NASA's official color bar: cold = low, hot = high.";
    if (!s || !s.hasData) return base;
    let p;
    if (onPeruCoast(s.lat, s.lon)) {
      p = es ? 'La fría corriente de Humboldt mantiene la costa del Perú más fresca que otros lugares tropicales.'
        : "The cold Humboldt Current keeps Peru's coast cooler than other tropical places.";
    } else if (Math.abs(s.lat) >= 60) {
      p = es ? 'Cerca de los polos el Sol calienta poco, así que el aire suele estar muy frío.'
        : 'Near the poles the Sun is weak, so the air is usually very cold.';
    } else if (Math.abs(s.lat) <= 23.5) {
      p = es ? 'Cerca del ecuador el Sol está alto todo el año, así que el aire suele ser cálido, salvo en las montañas altas.'
        : 'Near the equator the Sun is high all year, so the air is usually warm, except on high mountains.';
    } else {
      p = es ? 'En latitudes medias la temperatura cambia mucho con las estaciones, el día y la noche.'
        : 'In the mid-latitudes, temperature changes a lot with the seasons and with day and night.';
    }
    return `${base} ${p}`;
  },
  facts: [
    { when: (s) => s.t <= -10, en: '−18 °C is about the temperature of a home freezer.', es: '−18 °C es más o menos la temperatura de un congelador de casa.',
      src: 'USDA FSIS, "Freezing and Food Safety" (0 °F = −18 °C)' },
    { en: 'This map shows air about 2 meters above the ground, roughly head height.', es: 'Este mapa muestra el aire a unos 2 metros del suelo, más o menos a la altura de la cabeza.',
      src: 'NASA SVS 5147 page ("2 meters (about 6 feet) above Earth\'s surface"); color bar label T2M' },
    { when: (s) => s.t >= 25, en: 'Your body temperature is about 37 °C.', es: 'La temperatura de tu cuerpo es de unos 37 °C.', src: 'Standard human physiology' },
    { when: (s) => s.t >= -10 && s.t <= 10, en: 'Water freezes at 0 °C.', es: 'El agua se congela a 0 °C.', src: 'Celsius scale definition (sea-level pressure)' },
    { en: 'The map comes from a computer model that blends millions of weather observations.', es: 'El mapa viene de un modelo informático que combina millones de observaciones del tiempo.',
      src: 'NASA SVS 5147 page ("combines millions of weather observations with a predictive model")' },
    { en: 'Day and night make the temperature change; this shows one moment.', es: 'El día y la noche cambian la temperatura; este mapa muestra un solo momento.', src: 'Model snapshot for one hour' },
    { local: true, when: (s) => onPeruCoast(s.lat, s.lon), en: 'Lima is in the tropics, but cold water from the Humboldt Current cools its air and wraps the coast in fog and low clouds.',
      es: 'Lima está en el trópico, pero el agua fría de la corriente de Humboldt enfría su aire y cubre la costa de neblina y nubes bajas.',
      src: 'NASA Earth Observatory, "At the Intersection of Coastal Peru and a Cloud Bank" (2015) and "Foggy Peruvian Valleys" (2015)' },
  ],
};

// ---------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------

export const CONTENT = { air: AIR };

const factIndex = {};
/** Rotate through the facts that apply to this sample. */
export function nextFact(layerId, s) {
  const c = CONTENT[layerId];
  if (!c || !c.facts) return null;
  const ok = c.facts.filter((f) => !f.when || (s && s.hasData && f.when(s)));
  if (!ok.length) return null;
  // prefer place-specific facts the first time they apply
  const i = (factIndex[layerId] = ((factIndex[layerId] ?? -1) + 1) % ok.length);
  const special = ok.find((f) => f.local);
  if (special && !special.shown) { special.shown = true; return special; }
  return ok[i];
}
