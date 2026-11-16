// Guided journey: narrated stops (text + voice, EN/ES), each with its layer, place and
// about 8-10 seconds of sound. Every stop looks for the nearest point that really sounds
// in its layer (data can change when the snapshot is refreshed); if there is none it says
// so honestly instead of forcing it.

/** Picture position (u, v in 0..1) -> the pseudo lat/lon the map view uses for global views. */
const pic = (u, v) => ({ lat: 90 - v * 180, lon: u * 360 - 180 });

export const STOPS = [
  {
    title: { en: 'Antarctica', es: 'La Antártida' },
    text: { en: 'We start at the bottom of the world. This is one of the coldest places on Earth.',
      es: 'Empezamos en el fondo del mundo. Este es uno de los lugares más fríos de la Tierra.' },
    parts: [{ layer: 'air', at: { lat: -80, lon: 60 }, find: (s) => s.hasData, radius: 6 }],
  },
  {
    title: { en: 'The Sahara', es: 'El Sahara' },
    text: { en: 'Now the desert. Listen how the sound climbs as the air gets hotter.',
      es: 'Ahora el desierto. Escucha cómo sube el sonido al calentarse el aire.' },
    // the hottest point of the Sahara and Sahel box in the current snapshot; the sound travels there from Antarctica
    parts: [{ layer: 'air', hottestIn: [12, 32, -15, 32], path: { lat: -80, lon: 60 } }],
  },
  {
    title: { en: 'Dust crossing the sea', es: 'Polvo que cruza el mar' },
    text: { en: 'Dust from the Sahara travels across the Atlantic Ocean.',
      es: 'El polvo del Sahara viaja por el océano Atlántico.' },
    parts: [{ layer: 'aero', at: { lat: 15, lon: -40 }, find: (s) => s.cat === 'dust', radius: 10 }],
  },
  {
    title: { en: 'The Gulf Stream', es: 'La Corriente del Golfo' },
    text: { en: 'A river inside the ocean. Strong current lines show where warm water flows.',
      es: 'Un río dentro del océano. Las líneas de corriente intensas muestran por dónde fluye el agua cálida.' },
    parts: [{ layer: 'ocean', at: { lat: 36, lon: -70 }, find: (s) => s.hasData && s.intensity >= 0.6, radius: 6 }],
  },
  {
    title: { en: "Along South America's west coast", es: 'Por la costa oeste de Sudamérica' },
    text: { en: 'Off Peru runs the cold Humboldt Current.', es: 'Frente a Perú corre la fría corriente de Humboldt.' },
    parts: [{ layer: 'ocean', at: { lat: -12, lon: -79 }, find: (s) => s.hasData, radius: 3, calmNote: true }],
  },
  {
    title: { en: 'Rainforest and storms', es: 'Selva y tormentas' },
    text: { en: "Tall trees in Africa's rainforests, and the storms that grow above them.",
      es: 'Árboles altos en las selvas de África y las tormentas que crecen sobre ellas.' },
    parts: [
      { layer: 'forest', at: pic(0.39, 0.47), find: (s) => s.hasData && s.level === 'tall', radius: 20 },
      { layer: 'lightning', at: pic(0.36, 0.42), find: (s) => s.density > 0.3, radius: 20 },
    ],
  },
  {
    title: { en: 'Cities at night', es: 'Ciudades de noche' },
    text: { en: 'Lights tell where people build. Purple shows places with more light than in 2012.',
      es: 'Las luces cuentan dónde construye la gente. El púrpura muestra lugares con más luz que en 2012.' },
    parts: [{ layer: 'lights', at: { lat: 35, lon: 105 }, find: (s) => s.kind === 'more', radius: 6 }],
  },
  {
    local: true,
    title: { en: 'Home: Lima, Peru', es: 'Casa: Lima, Perú' },
    text: { en: 'We end where this project was made: Lima, Peru, a desert city by the Pacific, wrapped in fog by the cold Humboldt Current. Its lights have grown since 2012.',
      es: 'Terminamos donde nació este proyecto: Lima, Perú, una ciudad en el desierto junto al Pacífico, envuelta en neblina por la fría corriente de Humboldt. Sus luces han crecido desde 2012.' },
    parts: [{ layer: 'lights', at: { lat: -12.05, lon: -77.04 }, find: (s) => s.kind === 'more', radius: 1, mustFind: true }],
  },
];

/** Nearest point (0.5 degree grid search) where pred(sample) is true, within radius degrees. */
export function findNear(layer, at, pred, radius) {
  const s0 = layer.sample(at.lat, at.lon);
  if (pred(s0)) return { lat: at.lat, lon: at.lon, s: s0 };
  let best = null;
  let bestD = Infinity;
  for (let dla = -radius; dla <= radius; dla += 0.5) {
    for (let dlo = -radius; dlo <= radius; dlo += 0.5) {
      const d = dla * dla + dlo * dlo;
      if (d >= bestD || d > radius * radius) continue;
      const lat = at.lat + dla;
      const lon = at.lon + dlo;
      if (lat > 89 || lat < -89 || lon > 180 || lon < -180) continue;
      const s = layer.sample(lat, lon);
      if (pred(s)) { best = { lat, lon, s }; bestD = d; }
    }
  }
  return best;
}

/** Hottest point inside [latMin, latMax, lonMin, lonMax]. */
export function hottestIn(layer, [la0, la1, lo0, lo1]) {
  let best = null;
  for (let lat = la0; lat <= la1; lat += 0.5) {
    for (let lon = lo0; lon <= lo1; lon += 0.5) {
      const s = layer.sample(lat, lon);
      if (s.hasData && (!best || s.t > best.s.t)) best = { lat, lon, s };
    }
  }
  return best;
}
