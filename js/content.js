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

const es = () => getLang() === 'es';
const pct = (v) => `${fmtNum(v, v < 10 ? 1 : 0)} %`;
const tempShort = (v, ext) => {
  if (ext === 'bottom') return t('bottom_scale').replace(/\s*\(.*\)/, '');
  if (ext === 'top') return t('top_scale').replace(/\s*\(.*\)/, '');
  return `${fmtNum(Math.round(v))} °C`;
};

AIR.summaryText = (st, place) => {
  if (st.empty) return t('quiet_here');
  return es()
    ? `${place}: en promedio unos ${fmtNum(Math.round(st.mean))} °C (aprox.), desde ${tempShort(st.min, st.minBottom && 'bottom')} hasta ${tempShort(st.max, st.maxTop && 'top')}.`
    : `${place}: about ${fmtNum(Math.round(st.mean))} °C on average (approx.), from ${tempShort(st.min, st.minBottom && 'bottom')} to ${tempShort(st.max, st.maxTop && 'top')}.`;
};
AIR.compareRows = (st) => {
  if (st.empty) return null;
  return [
    [es() ? 'Media' : 'Mean', `${fmtNum(Math.round(st.mean))} °C (${t('approx')})`],
    [es() ? 'Máximo' : 'Maximum', tempShort(st.max, st.maxTop && 'top')],
    [es() ? 'Mínimo' : 'Minimum', tempShort(st.min, st.minBottom && 'bottom')],
    [es() ? '% del país sobre 30 °C' : '% of the country above 30 °C', pct(st.pctAbove30)],
    [es() ? '% bajo 0 °C' : '% below 0 °C', pct(st.pctBelow0)],
  ];
};

// ---------------------------------------------------------------------------------
// Night lights (trend)
// ---------------------------------------------------------------------------------
const STRENGTH = (s) => (s >= 0.66 ? 'level_high' : s >= 0.33 ? 'level_medium' : 'level_low');

export const LIGHTS = {
  phrase(s) {
    if (s.kind === 'more') return es() ? 'Aquí brillan más luces que en 2012.' : 'More lights shine here than in 2012.';
    if (s.kind === 'less') return es() ? 'Aquí brillan menos luces que en 2012.' : 'Fewer lights shine here than in 2012.';
    return es() ? 'Aquí no se detecta un cambio de luces.' : 'No change detected in lights here.';
  },
  value(s) {
    if (s.kind === 'none') return es() ? 'Sin cambio detectado' : 'No change detected';
    const what = s.kind === 'more' ? (es() ? 'más luz' : 'more light') : (es() ? 'menos luz' : 'less light');
    return `${what}. ${t('relative_strength', { level: t(STRENGTH(s.strength)) })}`;
  },
  shortValue() { return ''; },
  sound(s) {
    if (s.kind === 'more') return es() ? 'Dos notas que suben: más luz.' : 'Two rising notes: more light.';
    if (s.kind === 'less') return es() ? 'Dos notas que bajan: menos luz.' : 'Two falling notes: less light.';
    return es() ? 'Silencio: sin cambio detectado.' : 'Silence: no change detected.';
  },
  scaleLabel(s) {
    const lv = s.strength >= 0.9 ? 2 : s.strength >= 0.5 ? 1 : 0;
    const more = [['A little more light', 'Un poco más de luz'], ['More light', 'Más luz'], ['Much more light', 'Mucha más luz']];
    const less = [['A little less light', 'Un poco menos de luz'], ['Less light', 'Menos luz'], ['Much less light', 'Mucha menos luz']];
    const pair = (s.kind === 'more' ? more : less)[lv];
    return es() ? pair[1] : pair[0];
  },
  range() { return es() ? 'De "menos luz" a "más luz" (sin escala numérica).' : 'From "less light" to "more light" (no numeric scale).'; },
  source() {
    return es() ? 'NASA SVS 5276 · Black Marble (Suomi NPP, sensor VIIRS). Cambio de la intensidad de las luces de 2012 a 2023.'
      : 'NASA SVS 5276 · Black Marble (Suomi NPP, VIIRS sensor). Change in lighting intensity from 2012 to 2023.';
  },
  date() { return es() ? 'Cambio entre 2012 y 2023 (promedios anuales)' : 'Change between 2012 and 2023 (annual averages)'; },
  credit: {
    en: 'Image: NASA Scientific Visualization Studio (SVS 5276), visualizer Kel Elkins. Science team: Zhuosen Wang, Miguel Román, Ranjay Shrestha, Srija Chakraborty, Virginia Kalb. Data: Black Marble, Suomi NPP VIIRS.',
    es: 'Imagen: NASA Scientific Visualization Studio (SVS 5276), visualizador Kel Elkins. Equipo científico: Zhuosen Wang, Miguel Román, Ranjay Shrestha, Srija Chakraborty, Virginia Kalb. Datos: Black Marble, Suomi NPP VIIRS.',
  },
  whyMatters: {
    en: 'Night-light maps show how cities and communities grow and change, and help guide more sustainable choices.',
    es: 'Los mapas de luces nocturnas muestran cómo crecen y cambian las ciudades y comunidades, y ayudan a tomar decisiones más sostenibles.',
  },
  whySounds(s) {
    const base = es() ? 'Púrpura en el mapa = más luz (notas que suben); naranja = menos luz (notas que bajan). El silencio significa "sin cambio detectado", no "sin dato".'
      : 'Purple on the map = more light (rising notes); orange = less light (falling notes). Silence means "no change detected", not "no data".';
    return base;
  },
  facts: [
    { en: "Satellites can see Earth's lights at night; this data set is called Black Marble.", es: 'Los satélites ven las luces de la Tierra de noche; estos datos se llaman Black Marble.', src: 'NASA SVS 5276 page' },
    { en: 'Purple means more light than in 2012; orange means less.', es: 'El púrpura significa más luz que en 2012; el naranja, menos.', src: 'NASA SVS 5276 color bar and description' },
    { en: 'The map compares 2012 with 2023, eleven years apart.', es: 'El mapa compara 2012 con 2023, once años después.', src: 'NASA SVS 5276 page' },
    { en: 'Lights show where people live, work and build.', es: 'Las luces muestran dónde la gente vive, trabaja y construye.', src: 'NASA SVS 5276 ("urban growth, infrastructure development")' },
  ],
  summaryText(st, place) {
    if (st.empty) return t('quiet_here');
    if (st.net === 'few') return `${place}: ${t('few_changes')}.`;
    const netTxt = { more: es() ? 'más luz que menos' : 'more light than less', less: es() ? 'menos luz que más' : 'less light than more', similar: es() ? 'cambios parecidos en ambos sentidos' : 'similar changes both ways' }[st.net];
    return es() ? `${place}: ${pct(st.pctMore)} del área con más luz y ${pct(st.pctLess)} con menos luz; en total, ${netTxt}.`
      : `${place}: ${pct(st.pctMore)} of the area with more light and ${pct(st.pctLess)} with less light; overall, ${netTxt}.`;
  },
  compareRows(st) {
    if (st.empty) return null;
    const net = st.net === 'few' ? t('few_changes') : { more: es() ? 'Más luz' : 'More light', less: es() ? 'Menos luz' : 'Less light', similar: es() ? 'Parecido' : 'Similar' }[st.net];
    return [
      [es() ? '% del país con más luz' : '% of the country with more light', pct(st.pctMore)],
      [es() ? '% con menos luz' : '% with less light', pct(st.pctLess)],
      [es() ? 'Cambio neto' : 'Net change', net],
    ];
  },
};

// ---------------------------------------------------------------------------------
// Ocean currents (trend) - never degC, never speed
// ---------------------------------------------------------------------------------
export const OCEAN = {
  phrase(s) {
    if (!s.hasData) return es() ? 'Esto es tierra. Los sonidos del océano están en el agua.' : 'This is land. Ocean sounds are on the water.';
    if (s.level === 'strong') return es() ? 'Aquí hay líneas de corriente intensas, de color cálido.' : 'Strong, warm-colored current lines here.';
    if (s.level === 'medium') return es() ? 'Aquí hay líneas de corriente moderadas.' : 'Moderate current lines here.';
    return es() ? 'Aquí hay pocas líneas de corriente; el agua se ve tranquila en esta imagen.' : 'Few current lines here; the water looks calm in this picture.';
  },
  value(s) {
    if (!s.hasData) return es() ? 'Tierra o hielo (silencio)' : 'Land or ice (silent)';
    const lv = { strong: 'level_high', medium: 'level_medium', weak: 'level_low' }[s.level];
    return `${t('relative_strength', { level: t(lv) })} (${es() ? 'índice de líneas de corriente' : 'current-line index'} ${Math.round(s.intensity * 100)}/100)`;
  },
  shortValue() { return ''; },
  sound(s) {
    if (!s.hasData) return es() ? 'Silencio: tierra.' : 'Silence: land.';
    if (s.level === 'strong') return es() ? 'Colchón sonoro brillante y fuerte: líneas intensas.' : 'Bright, loud pad: strong current lines.';
    if (s.level === 'medium') return es() ? 'Colchón sonoro medio.' : 'Medium pad.';
    return es() ? 'Colchón sonoro grave y suave: agua tranquila.' : 'Low, soft pad: calm water.';
  },
  scaleLabel(s) {
    const n = Math.round(s.intensity * 100);
    return es() ? `Índice ${n} de 100` : `Index ${n} of 100`;
  },
  range() { return es() ? 'Índice relativo de 0 a 100 (sin °C ni velocidad).' : 'Relative index from 0 to 100 (no degC, no speed).'; },
  source() {
    return es() ? 'NASA SVS 5479 · modelo ECCO-2 (NASA/JPL, MIT), años 2021–2023, versión coloreada por temperatura sin barra publicada.'
      : 'NASA SVS 5479 · ECCO-2 model (NASA/JPL, MIT), years 2021–2023, temperature-colored version with no published color bar.';
  },
  date(meta) { return `${meta ? meta.frame_label : ''} (${es() ? 'fotograma del modelo' : 'model frame'})`; },
  credit: {
    en: 'Image: NASA Scientific Visualization Studio (SVS 5479), visualizers Greg Shirah and Horace Mitchell, scientist Atousa Saberi. Data: ECCO2 (NASA/JPL, MIT), Blue Marble Next Generation, ETOPO (NOAA).',
    es: 'Imagen: NASA Scientific Visualization Studio (SVS 5479), visualizadores Greg Shirah y Horace Mitchell, científica Atousa Saberi. Datos: ECCO2 (NASA/JPL, MIT), Blue Marble Next Generation, ETOPO (NOAA).',
  },
  whyMatters: {
    en: 'Understanding currents helps scientists understand how heat moves through the ocean and shapes our climate.',
    es: 'Entender las corrientes ayuda a saber cómo se mueve el calor en el océano y cómo moldea el clima.',
  },
  whySounds(s) {
    const base = es() ? 'Las líneas de corriente más cálidas y brillantes suenan más fuerte y más agudas. La tierra queda en silencio.'
      : 'Warmer-colored, brighter current lines = stronger sound. Land stays silent.';
    if (s && s.hasData && onPeruCoast(s.lat, s.lon)) {
      return `${base} ${es() ? 'Frente al Perú corre la fría corriente de Humboldt, que sube agua fría y rica en nutrientes.' : 'Off Peru runs the cold Humboldt Current, which brings cold water up to the surface.'}`;
    }
    return `${base} ${es() ? 'Las corrientes más fuertes suelen correr por el lado oeste de los océanos, como la del Golfo, Kuroshio o Agulhas.' : 'The strongest currents usually run along the western side of ocean basins, like the Gulf Stream, Kuroshio or Agulhas.'}`;
  },
  facts: [
    { en: 'The Gulf Stream can flow at up to about 9 kilometers per hour (2.5 meters per second) at the surface.', es: 'La Corriente del Golfo puede fluir hasta a unos 9 kilómetros por hora (2,5 metros por segundo) en la superficie.',
      src: 'NOAA Ocean Service, "How fast is the Gulf Stream?" (maximum about 9 km/h, 5.6 mph)' },
    { en: 'Agulhas rings, giant swirls of warm water, can last more than 2 years.', es: 'Los anillos de Agulhas, enormes remolinos de agua cálida, pueden durar más de 2 años.',
      src: 'Satellite-altimetry studies: average crossing of the South Atlantic about 3.5 years; one ring tracked as a coherent body for about 2 years (Froyland et al. 2015, "Studying an Agulhas ring’s long-term pathway and decay with finite-time coherent sets")' },
    { en: 'Ocean currents carry heat around the planet.', es: 'Las corrientes del océano llevan calor por todo el planeta.', src: 'NASA SVS 5479 (Gulf Stream carries heat to northern latitudes)' },
    { en: 'These swirls come from a model that uses spacecraft and buoy observations.', es: 'Estos remolinos salen de un modelo que usa observaciones de naves y boyas.',
      src: 'NASA SVS 5479 ("observations from spacecraft, buoys, and other in situ measurements")' },
    { local: true, when: (s) => onPeruCoast(s.lat, s.lon), en: 'The Humboldt Current flows along the west coast of South America carrying cold water.',
      es: 'La corriente de Humboldt recorre la costa oeste de Sudamérica llevando agua fría.',
      src: 'NASA Earth Observatory, "At the Intersection of Coastal Peru and a Cloud Bank" (2015)' },
  ],
  summaryText(st, place) {
    if (st.noCoast || st.empty) return t('no_coast');
    return es() ? `${place} (aguas costeras): índice de líneas de corriente ${Math.round(st.index)} de 100; ${pct(st.pctStrong)} con líneas intensas.`
      : `${place} (coastal waters): current-line index ${Math.round(st.index)} of 100; ${pct(st.pctStrong)} with strong current lines.`;
  },
  compareRows(st) {
    if (st.noCoast || st.empty) return [[es() ? 'Aguas costeras' : 'Coastal waters', t('no_coast')]];
    return [
      [es() ? 'Índice de líneas de corriente 0–100 (aguas costeras)' : 'Current-line index 0–100 (coastal waters)', String(Math.round(st.index))],
      [es() ? '% de aguas costeras con líneas intensas' : '% of coastal waters with strong current lines', pct(st.pctStrong)],
    ];
  },
};

// ---------------------------------------------------------------------------------
// Aerosols (category)
// ---------------------------------------------------------------------------------
export const AERO_NAMES = {
  dust: { en: 'Dust', es: 'Polvo' }, blackcarbon: { en: 'Black carbon (smoke)', es: 'Carbono negro (humo)' },
  seasalt: { en: 'Sea salt', es: 'Sal marina' }, sulfate: { en: 'Sulfate', es: 'Sulfato' },
};
const AERO_PHRASE = {
  dust: { en: 'Desert dust travels here.', es: 'El polvo del desierto viaja hasta aquí.' },
  blackcarbon: { en: 'Smoke from fires reaches here.', es: 'El humo de los incendios llega hasta aquí.' },
  seasalt: { en: 'Ocean spray and salt float here.', es: 'Aquí flotan la brisa y la sal del mar.' },
  sulfate: { en: 'Tiny particles from pollution or volcanoes float here.', es: 'Aquí flotan partículas diminutas de contaminación o volcanes.' },
};
const AERO_SOUND = {
  dust: { en: 'warm low pad', es: 'colchón grave y cálido' }, seasalt: { en: 'soft airy texture', es: 'textura suave de aire' },
  blackcarbon: { en: 'low pulsing marimba', es: 'marimba grave que pulsa' }, sulfate: { en: 'small bells', es: 'campanitas' },
};

export const AEROC = {
  phrase(s) {
    if (!s.cat) return es() ? 'En esta imagen se muestran pocas partículas aquí.' : 'Few particles are shown here in this picture.';
    const main = L(AERO_PHRASE[s.cat]);
    return s.second ? `${main} ${L(AERO_PHRASE[s.second])}` : main;
  },
  value(s) {
    if (!s.cat) return es() ? 'Ninguna categoría' : 'No category';
    const names = [s.cat, s.second].filter(Boolean).map((c) => L(AERO_NAMES[c])).join(' + ');
    const lv = s.intensity >= 0.66 ? 'level_high' : s.intensity >= 0.33 ? 'level_medium' : 'level_low';
    return `${names}. ${t('relative_strength', { level: t(lv) })}`;
  },
  shortValue(s) { return s.cat ? [s.cat, s.second].filter(Boolean).map((c) => L(AERO_NAMES[c])).join(' + ') : ''; },
  sound(s) {
    if (!s.cat) return es() ? 'Silencio.' : 'Silence.';
    return [s.cat, s.second].filter(Boolean).map((c) => `${L(AERO_NAMES[c])}: ${L(AERO_SOUND[c])}`).join(' · ');
  },
  scaleLabel(s) { return L(AERO_NAMES[s.cat]); },
  range() { return es() ? 'Cuatro categorías: carbono negro, polvo, sal marina y sulfato. Intensidad relativa, sin unidad.' : 'Four categories: black carbon, dust, sea salt and sulfate. Relative intensity, no unit.'; },
  source() { return es() ? 'NASA SVS 5669 · modelo GEOS (NASA GMAO), GEOS Aerosols 2025.' : 'NASA SVS 5669 · GEOS model (NASA GMAO), GEOS Aerosols 2025.'; },
  date() { return es() ? '19 ago 2025, 20:00 UTC (un solo momento)' : '19 Aug 2025, 20:00 UTC (a single moment)'; },
  credit: {
    en: 'Image: NASA Scientific Visualization Studio and NASA GMAO (SVS 5669), visualizers Joseph V. Ardizzone and Helen-Nicole Kostis, scientist Lesley Ott. Model: GEOS.',
    es: 'Imagen: NASA Scientific Visualization Studio y NASA GMAO (SVS 5669), visualizadores Joseph V. Ardizzone y Helen-Nicole Kostis, científica Lesley Ott. Modelo: GEOS.',
  },
  whyMatters: {
    en: 'Aerosols affect the air we breathe and how far we can see, even far from where they started. Tracking them helps communities prepare.',
    es: 'Los aerosoles afectan el aire que respiramos y qué tan lejos vemos, incluso lejos de donde nacen. Seguirlos ayuda a las comunidades a prepararse.',
  },
  whySounds() {
    return es() ? 'Cada tipo de partícula tiene su instrumento: polvo = colchón grave, sal marina = aire suave, humo = marimba grave, sulfato = campanitas. Donde los colores se mezclan, pueden sonar dos.'
      : 'Each particle type has its own instrument: dust = low pad, sea salt = soft air, smoke = low marimba, sulfate = small bells. Where colors mix, two can sound.';
  },
  facts: [
    { en: 'Aerosols are tiny particles floating in the air that can travel thousands of miles.', es: 'Los aerosoles son partículas diminutas en el aire que pueden viajar miles de kilómetros.', src: 'NASA SVS 5669 page' },
    { en: 'Dust from the Sahara can cross the Atlantic Ocean.', es: 'El polvo del Sahara puede cruzar el océano Atlántico.', src: 'NASA SVS 5669 page' },
    { en: 'Strong winds over the ocean lift sea salt into the air; the swirl here is Hurricane Erin (August 2025).', es: 'Los vientos fuertes sobre el océano levantan sal marina; el remolino de la imagen es el huracán Erin (agosto de 2025).', src: 'NASA SVS 5669 page' },
    { en: 'Volcanoes such as Kilauea and Etna release sulfate particles.', es: 'Volcanes como el Kilauea y el Etna liberan partículas de sulfato.', src: 'NASA SVS 5669 page' },
    { en: 'On this day, smoke from fires in southern Africa drifted over the Atlantic.', es: 'Ese día, el humo de incendios del sur de África cruzó el Atlántico.', src: 'NASA SVS 5669 page (seasonal agricultural burning)' },
  ],
  summaryText(st, place) {
    if (st.empty) return t('quiet_here');
    if (!st.dominant) return `${place}: ${es() ? 'en esta imagen se muestran pocas partículas.' : 'few particles are shown in this picture.'}`;
    const parts = ['dust', 'seasalt', 'blackcarbon', 'sulfate'].filter((c) => st.share[c] >= 1)
      .map((c) => `${L(AERO_NAMES[c]).toLowerCase()} ${pct(st.share[c])}`).join(', ');
    return es() ? `${place}: domina ${L(AERO_NAMES[st.dominant]).toLowerCase()} (${parts}).` : `${place}: mostly ${L(AERO_NAMES[st.dominant]).toLowerCase()} (${parts}).`;
  },
  compareRows(st) {
    if (st.empty) return null;
    return [
      [es() ? 'Tipo dominante' : 'Dominant type', st.dominant ? L(AERO_NAMES[st.dominant]) : (es() ? 'Ninguno' : 'None')],
      ...['dust', 'seasalt', 'blackcarbon', 'sulfate'].map((c) => [`% ${L(AERO_NAMES[c]).toLowerCase()}`, pct(st.share[c])]),
    ];
  },
};

// ---------------------------------------------------------------------------------
// Forest height (trend, global view)
// ---------------------------------------------------------------------------------
export const FOREST = {
  phrase(s) {
    if (!s.hasData) return es() ? 'Aquí no hay datos de bosque.' : 'No forest data here.';
    if (s.level === 'tall') return es() ? 'Aquí crecen árboles altos.' : 'Tall trees grow here.';
    if (s.level === 'medium') return es() ? 'Aquí hay bosque de altura media.' : 'Medium-height forest here.';
    return es() ? 'Aquí hay plantas bajas o huecos entre mediciones.' : 'Short plants or gaps between measurements here.';
  },
  value(s) {
    if (!s.hasData) return es() ? 'Océano o espacio (silencio)' : 'Ocean or space (silent)';
    const lv = { tall: 'level_high', medium: 'level_medium', low: 'level_low' }[s.level];
    const extra = s.level === 'low' ? (es() ? ' Vegetación baja o huecos entre las trazas de medición.' : ' Low vegetation or gaps between measurement tracks.') : '';
    return `${t('relative_strength', { level: t(lv) })}.${extra}`;
  },
  shortValue() { return ''; },
  sound(s) {
    if (!s.hasData) return es() ? 'Silencio.' : 'Silence.';
    if (s.level === 'tall') return es() ? 'Campana aguda: árboles altos.' : 'High bell: tall trees.';
    if (s.level === 'medium') return es() ? 'Campana media sobre un zumbido suave.' : 'Middle bell over a soft hum.';
    return es() ? 'Zumbido grave y suave: vegetación baja.' : 'Low soft hum: low vegetation.';
  },
  scaleLabel(s) {
    const lv = s.height >= 0.85 ? 3 : s.height >= 0.5 ? 2 : s.height >= 0.2 ? 1 : 0;
    const L4 = es() ? ['Vegetación baja', 'Bosque medio', 'Bosque alto', 'Árboles muy altos'] : ['Low vegetation', 'Medium forest', 'Tall forest', 'Very tall trees'];
    return L4[lv];
  },
  range() { return es() ? 'De vegetación baja a árboles altos (relativo, sin metros).' : 'From low vegetation to tall trees (relative, no meters).'; },
  source() {
    return es() ? 'NASA SVS 4950 · GEDI, láser (lidar) en la Estación Espacial Internacional. Barra de referencia: 0 a 50 m.'
      : 'NASA SVS 4950 · GEDI, a laser (lidar) on the International Space Station. Reference bar: 0 to 50 m.';
  },
  date() { return es() ? 'Alrededor de un año de mediciones de GEDI (2018–2020)' : 'About one year of GEDI measurements (2018–2020)'; },
  credit: {
    en: 'Image: NASA Scientific Visualization Studio (SVS 4950), visualizer Kel Elkins. Scientists: Temilola Fatoyinbo and Atticus Stovall. Data: GEDI.',
    es: 'Imagen: NASA Scientific Visualization Studio (SVS 4950), visualizador Kel Elkins. Científicos: Temilola Fatoyinbo y Atticus Stovall. Datos: GEDI.',
  },
  whyMatters: {
    en: 'Forest height helps scientists understand carbon and water cycles, biodiversity and habitat.',
    es: 'La altura del bosque ayuda a entender los ciclos del carbono y el agua, la biodiversidad y el hábitat.',
  },
  whySounds() {
    return es() ? 'Más claro en la imagen = árboles más altos = campana más aguda. Es un globo ya dibujado por NASA, iluminado y con alturas exageradas, así que solo se oye la altura relativa y no hay nombre de lugar.'
      : 'Lighter in the picture = taller trees = higher bell. This is a globe already drawn by NASA, lit and with exaggerated heights, so only relative height is heard and there are no place names.';
  },
  facts: [
    { en: 'GEDI is a laser (lidar) on the International Space Station that measures how tall plants are.', es: 'GEDI es un láser (lidar) en la Estación Espacial Internacional que mide la altura de las plantas.', src: 'NASA SVS 4950 page' },
    { en: 'Each GEDI laser fires 242 times per second, lighting a spot about 25 meters wide.', es: 'Cada láser de GEDI dispara 242 veces por segundo e ilumina un punto de unos 25 metros.', src: 'NASA SVS 4950 page; NASA Earthdata GEDI articles' },
    { en: 'Heights in this picture are exaggerated so you can see differences.', es: 'Las alturas de esta imagen están exageradas para ver las diferencias.', src: 'NASA SVS 4950 ("exaggerated to depict variation at this scale")' },
    { en: 'Brown and dark green are short vegetation; bright green and white are tall.', es: 'El marrón y el verde oscuro son vegetación baja; el verde claro y el blanco, alta.', src: 'NASA SVS 4950 page and color bar' },
  ],
};

// ---------------------------------------------------------------------------------
// Lightning (density and rhythm, global view)
// ---------------------------------------------------------------------------------
export const LIGHTNING = {
  phrase(s) {
    if (s.level === 'many') return es() ? 'Aquí ocurren muchas tormentas.' : 'Many storms happen here.';
    if (s.level === 'some') return es() ? 'Aquí caen algunos rayos.' : 'Some lightning strikes here.';
    return es() ? 'No hay rayos aquí en esta imagen.' : 'No lightning events here in this picture.';
  },
  value(s) {
    if (s.level === 'none') return es() ? 'Sin eventos cerca' : 'No events nearby';
    const lv = s.density >= 0.66 ? 'level_high' : s.density >= 0.33 ? 'level_medium' : 'level_low';
    return `${es() ? 'Densidad de eventos' : 'Event density'}: ${t(lv)} (${Math.round(1 + 7 * s.density)} ${es() ? 'golpes por segundo' : 'hits per second'})`;
  },
  shortValue() { return ''; },
  sound(s) {
    if (s.level === 'none') return es() ? 'Silencio: sin rayos cerca.' : 'Silence: no lightning nearby.';
    return es() ? `Percusión, ${Math.round(1 + 7 * s.density)} golpes por segundo.` : `Percussion, ${Math.round(1 + 7 * s.density)} hits per second.`;
  },
  scaleLabel(s) {
    const n = Math.round(1 + 7 * s.density);
    return es() ? `${n} ${n === 1 ? 'golpe' : 'golpes'} por segundo` : `${n} ${n === 1 ? 'hit' : 'hits'} per second`;
  },
  range() { return es() ? 'De 1 a 8 golpes por segundo según cuántos rayos hay cerca (radio de 40 píxeles).' : 'From 1 to 8 hits per second, by how many lightning events are nearby (40-pixel radius).'; },
  source() {
    return es() ? 'NASA SVS 5011 · Lightning Imaging Sensor (LIS) en la Estación Espacial Internacional; datos del GHRC DAAC de NASA.'
      : 'NASA SVS 5011 · Lightning Imaging Sensor (LIS) on the International Space Station; data from NASA GHRC DAAC.';
  },
  date() { return es() ? 'Una ventana de 10 días entre enero de 2017 y julio de 2023' : 'One 10-day window between January 2017 and July 2023'; },
  credit: {
    en: 'Image: NASA Scientific Visualization Studio (SVS 5011), visualizers Michala Garrison, Greg Shirah, Kel Elkins and Alex Kekesi. Data: ISS LIS, NASA GHRC DAAC.',
    es: 'Imagen: NASA Scientific Visualization Studio (SVS 5011), visualizadores Michala Garrison, Greg Shirah, Kel Elkins y Alex Kekesi. Datos: ISS LIS, NASA GHRC DAAC.',
  },
  whyMatters: {
    en: 'Knowing where lightning happens helps scientists study storms and how lightning interacts with the atmosphere.',
    es: 'Saber dónde caen los rayos ayuda a estudiar las tormentas y cómo interactúa el rayo con la atmósfera.',
  },
  whySounds() {
    return es() ? 'Cada golpe de percusión representa rayos cercanos: más puntos amarillos alrededor = ritmo más rápido. Es un globo ya dibujado por NASA, así que no hay nombre de lugar.'
      : 'Each percussion hit stands for nearby lightning: more yellow dots around = faster rhythm. This is a globe already drawn by NASA, so there are no place names.';
  },
  facts: [
    { en: 'A sensor on the International Space Station detects lightning in tropical and mid-latitude regions.', es: 'Un sensor en la Estación Espacial Internacional detecta rayos en regiones tropicales y de latitudes medias.', src: 'NASA SVS 5011 page' },
    { en: 'Each yellow dot is a lightning event from a 10-day window between 2017 and 2023.', es: 'Cada punto amarillo es un rayo dentro de una ventana de 10 días entre 2017 y 2023.', src: 'NASA SVS 5011 ("a 10-day roving window", January 2017 to July 2023)' },
    { en: 'Lightning maps show where storms are common and how they change with the seasons.', es: 'Los mapas de rayos muestran dónde son comunes las tormentas y cómo cambian con las estaciones.', src: 'NASA SVS 5011 ("seasonal patterns of lightning")' },
  ],
};

// ---------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------

export const CONTENT = { air: AIR, lights: LIGHTS, ocean: OCEAN, aero: AEROC, forest: FOREST, lightning: LIGHTNING };

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
