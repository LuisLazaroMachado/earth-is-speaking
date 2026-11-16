// Curated cities and zones (lat/lon in degrees, r = radius in km used for "near" and sampling).
// kind: 'city' or 'zone'. 'peru' marks places used by the local (Lima, Peru) features.
export const PLACES = [
  // From the brief
  { id: 'venice', en: 'Venice', es: 'Venecia', lat: 45.44, lon: 12.32, r: 10, kind: 'city' },
  { id: 'antarctica', en: 'Antarctica (interior)', es: 'Antártida (interior)', lat: -80, lon: 60, r: 600, kind: 'zone', alias: ['antarctica', 'antartida', 'south pole', 'polo sur'] },
  { id: 'sahara', en: 'Sahara', es: 'Sahara', lat: 23, lon: 12, r: 900, kind: 'zone', alias: ['sahara desert', 'desierto del sahara'] },
  { id: 'sahel', en: 'Sahel', es: 'Sahel', lat: 14, lon: 0, r: 600, kind: 'zone' },
  { id: 'amazon', en: 'Amazon rainforest', es: 'Selva amazónica', lat: -3, lon: -60, r: 800, kind: 'zone', alias: ['amazonia', 'amazonas', 'amazon'] },
  { id: 'congo', en: 'Congo rainforest', es: 'Selva del Congo', lat: -1, lon: 23, r: 600, kind: 'zone' },
  { id: 'siberia', en: 'Siberia', es: 'Siberia', lat: 62, lon: 100, r: 1200, kind: 'zone' },
  { id: 'himalayas', en: 'Himalayas', es: 'Himalaya', lat: 28, lon: 86, r: 500, kind: 'zone', alias: ['everest'] },
  { id: 'gbr', en: 'Great Barrier Reef', es: 'Gran Barrera de Coral', lat: -18, lon: 147, r: 400, kind: 'zone' },
  { id: 'greenland', en: 'Greenland', es: 'Groenlandia', lat: 72, lon: -40, r: 700, kind: 'zone' },
  { id: 'lima', en: 'Lima', es: 'Lima', lat: -12.05, lon: -77.04, r: 30, kind: 'city', peru: true },
  { id: 'humboldt', en: 'Humboldt Current (off Peru)', es: 'Corriente de Humboldt (frente a Perú)', lat: -12, lon: -79, r: 300, kind: 'zone', peru: true, alias: ['humboldt', 'corriente peruana', 'peru current'] },
  { id: 'tokyo', en: 'Tokyo', es: 'Tokio', lat: 35.68, lon: 139.69, r: 40, kind: 'city' },
  { id: 'cairo', en: 'Cairo', es: 'El Cairo', lat: 30.04, lon: 31.24, r: 30, kind: 'city' },
  { id: 'nairobi', en: 'Nairobi', es: 'Nairobi', lat: -1.29, lon: 36.82, r: 25, kind: 'city' },
  { id: 'capetown', en: 'Cape Town', es: 'Ciudad del Cabo', lat: -33.92, lon: 18.42, r: 25, kind: 'city' },
  { id: 'sydney', en: 'Sydney', es: 'Sídney', lat: -33.87, lon: 151.21, r: 30, kind: 'city' },
  { id: 'newyork', en: 'New York', es: 'Nueva York', lat: 40.71, lon: -74.01, r: 30, kind: 'city' },
  { id: 'mexicocity', en: 'Mexico City', es: 'Ciudad de México', lat: 19.43, lon: -99.13, r: 30, kind: 'city' },
  { id: 'saopaulo', en: 'São Paulo', es: 'São Paulo', lat: -23.55, lon: -46.63, r: 30, kind: 'city' },
  { id: 'buenosaires', en: 'Buenos Aires', es: 'Buenos Aires', lat: -34.60, lon: -58.38, r: 30, kind: 'city' },
  { id: 'london', en: 'London', es: 'Londres', lat: 51.51, lon: -0.13, r: 30, kind: 'city' },
  { id: 'paris', en: 'Paris', es: 'París', lat: 48.86, lon: 2.35, r: 20, kind: 'city' },
  { id: 'moscow', en: 'Moscow', es: 'Moscú', lat: 55.76, lon: 37.62, r: 30, kind: 'city' },
  { id: 'newdelhi', en: 'New Delhi', es: 'Nueva Delhi', lat: 28.61, lon: 77.21, r: 30, kind: 'city' },
  { id: 'beijing', en: 'Beijing', es: 'Pekín', lat: 39.90, lon: 116.40, r: 30, kind: 'city' },
  { id: 'dubai', en: 'Dubai', es: 'Dubái', lat: 25.20, lon: 55.27, r: 25, kind: 'city' },
  { id: 'reykjavik', en: 'Reykjavik', es: 'Reikiavik', lat: 64.15, lon: -21.94, r: 15, kind: 'city' },
  { id: 'gulfstream', en: 'Gulf Stream', es: 'Corriente del Golfo', lat: 36, lon: -70, r: 300, kind: 'zone' },
  { id: 'kuroshio', en: 'Kuroshio Current', es: 'Corriente de Kuroshio', lat: 32, lon: 135, r: 300, kind: 'zone', alias: ['kuroshio'] },
  { id: 'agulhas', en: 'Agulhas Current', es: 'Corriente de Agulhas', lat: -35, lon: 25, r: 300, kind: 'zone', alias: ['agulhas'] },
  { id: 'gulfmexico', en: 'Gulf of Mexico', es: 'Golfo de México', lat: 25, lon: -90, r: 500, kind: 'zone' },
  { id: 'dustroute', en: 'Saharan dust route', es: 'Ruta del polvo del Sahara', lat: 15, lon: -40, r: 800, kind: 'zone' },
  { id: 'victoria', en: 'Lake Victoria', es: 'Lago Victoria', lat: -1, lon: 33, r: 150, kind: 'zone' },
  { id: 'java', en: 'Java', es: 'Java', lat: -7.5, lon: 110, r: 300, kind: 'zone' },
  { id: 'etna', en: 'Mount Etna', es: 'Monte Etna', lat: 37.75, lon: 15, r: 15, kind: 'zone', alias: ['etna'] },
  { id: 'kilauea', en: 'Kilauea', es: 'Kilauea', lat: 19.42, lon: -155.29, r: 15, kind: 'zone' },
  // Peru (local focus)
  { id: 'cusco', en: 'Cusco', es: 'Cusco', lat: -13.53, lon: -71.97, r: 20, kind: 'city', peru: true, alias: ['cuzco'] },
  { id: 'arequipa', en: 'Arequipa', es: 'Arequipa', lat: -16.41, lon: -71.54, r: 20, kind: 'city', peru: true },
  { id: 'trujillo', en: 'Trujillo', es: 'Trujillo', lat: -8.11, lon: -79.03, r: 20, kind: 'city', peru: true },
  { id: 'piura', en: 'Piura', es: 'Piura', lat: -5.19, lon: -80.63, r: 20, kind: 'city', peru: true },
  { id: 'iquitos', en: 'Iquitos', es: 'Iquitos', lat: -3.75, lon: -73.25, r: 20, kind: 'city', peru: true },
  { id: 'puno', en: 'Puno', es: 'Puno', lat: -15.84, lon: -70.02, r: 15, kind: 'city', peru: true },
  { id: 'titicaca', en: 'Lake Titicaca', es: 'Lago Titicaca', lat: -15.9, lon: -69.4, r: 80, kind: 'zone', peru: true, alias: ['titicaca'] },
  { id: 'huascaran', en: 'Huascarán', es: 'Huascarán', lat: -9.12, lon: -77.60, r: 20, kind: 'zone', peru: true, alias: ['huascaran'] },
  { id: 'sechura', en: 'Sechura Desert', es: 'Desierto de Sechura', lat: -5.8, lon: -80.6, r: 100, kind: 'zone', peru: true, alias: ['sechura'] },
  // More cities so every continent is covered
  { id: 'losangeles', en: 'Los Angeles', es: 'Los Ángeles', lat: 34.05, lon: -118.24, r: 40, kind: 'city' },
  { id: 'chicago', en: 'Chicago', es: 'Chicago', lat: 41.88, lon: -87.63, r: 30, kind: 'city' },
  { id: 'toronto', en: 'Toronto', es: 'Toronto', lat: 43.65, lon: -79.38, r: 30, kind: 'city' },
  { id: 'anchorage', en: 'Anchorage', es: 'Anchorage', lat: 61.22, lon: -149.90, r: 20, kind: 'city' },
  { id: 'havana', en: 'Havana', es: 'La Habana', lat: 23.11, lon: -82.37, r: 20, kind: 'city' },
  { id: 'panama', en: 'Panama City', es: 'Ciudad de Panamá', lat: 8.98, lon: -79.52, r: 20, kind: 'city' },
  { id: 'bogota', en: 'Bogotá', es: 'Bogotá', lat: 4.71, lon: -74.07, r: 25, kind: 'city' },
  { id: 'caracas', en: 'Caracas', es: 'Caracas', lat: 10.48, lon: -66.90, r: 20, kind: 'city' },
  { id: 'quito', en: 'Quito', es: 'Quito', lat: -0.18, lon: -78.47, r: 20, kind: 'city' },
  { id: 'lapaz', en: 'La Paz', es: 'La Paz', lat: -16.50, lon: -68.15, r: 20, kind: 'city' },
  { id: 'santiago', en: 'Santiago', es: 'Santiago de Chile', lat: -33.45, lon: -70.67, r: 25, kind: 'city' },
  { id: 'montevideo', en: 'Montevideo', es: 'Montevideo', lat: -34.90, lon: -56.16, r: 20, kind: 'city' },
  { id: 'asuncion', en: 'Asunción', es: 'Asunción', lat: -25.26, lon: -57.58, r: 20, kind: 'city' },
  { id: 'brasilia', en: 'Brasília', es: 'Brasilia', lat: -15.79, lon: -47.88, r: 20, kind: 'city' },
  { id: 'manaus', en: 'Manaus', es: 'Manaos', lat: -3.12, lon: -60.02, r: 20, kind: 'city' },
  { id: 'madrid', en: 'Madrid', es: 'Madrid', lat: 40.42, lon: -3.70, r: 25, kind: 'city' },
  { id: 'rome', en: 'Rome', es: 'Roma', lat: 41.90, lon: 12.50, r: 25, kind: 'city' },
  { id: 'berlin', en: 'Berlin', es: 'Berlín', lat: 52.52, lon: 13.40, r: 25, kind: 'city' },
  { id: 'istanbul', en: 'Istanbul', es: 'Estambul', lat: 41.01, lon: 28.98, r: 30, kind: 'city' },
  { id: 'casablanca', en: 'Casablanca', es: 'Casablanca', lat: 33.57, lon: -7.59, r: 20, kind: 'city' },
  { id: 'lagos', en: 'Lagos', es: 'Lagos', lat: 6.52, lon: 3.38, r: 30, kind: 'city' },
  { id: 'dakar', en: 'Dakar', es: 'Dakar', lat: 14.72, lon: -17.47, r: 20, kind: 'city' },
  { id: 'kinshasa', en: 'Kinshasa', es: 'Kinsasa', lat: -4.44, lon: 15.27, r: 25, kind: 'city' },
  { id: 'addis', en: 'Addis Ababa', es: 'Adís Abeba', lat: 9.03, lon: 38.74, r: 20, kind: 'city' },
  { id: 'johannesburg', en: 'Johannesburg', es: 'Johannesburgo', lat: -26.20, lon: 28.05, r: 30, kind: 'city' },
  { id: 'riyadh', en: 'Riyadh', es: 'Riad', lat: 24.71, lon: 46.68, r: 30, kind: 'city' },
  { id: 'tehran', en: 'Tehran', es: 'Teherán', lat: 35.69, lon: 51.39, r: 30, kind: 'city' },
  { id: 'karachi', en: 'Karachi', es: 'Karachi', lat: 24.86, lon: 67.01, r: 30, kind: 'city' },
  { id: 'mumbai', en: 'Mumbai', es: 'Bombay', lat: 19.08, lon: 72.88, r: 30, kind: 'city' },
  { id: 'dhaka', en: 'Dhaka', es: 'Daca', lat: 23.81, lon: 90.41, r: 25, kind: 'city' },
  { id: 'bangkok', en: 'Bangkok', es: 'Bangkok', lat: 13.76, lon: 100.50, r: 30, kind: 'city' },
  { id: 'singapore', en: 'Singapore', es: 'Singapur', lat: 1.35, lon: 103.82, r: 20, kind: 'city' },
  { id: 'jakarta', en: 'Jakarta', es: 'Yakarta', lat: -6.21, lon: 106.85, r: 30, kind: 'city' },
  { id: 'manila', en: 'Manila', es: 'Manila', lat: 14.60, lon: 120.98, r: 25, kind: 'city' },
  { id: 'seoul', en: 'Seoul', es: 'Seúl', lat: 37.57, lon: 126.98, r: 25, kind: 'city' },
  { id: 'ulaanbaatar', en: 'Ulaanbaatar', es: 'Ulán Bator', lat: 47.92, lon: 106.92, r: 20, kind: 'city' },
  { id: 'yakutsk', en: 'Yakutsk', es: 'Yakutsk', lat: 62.03, lon: 129.73, r: 20, kind: 'city' },
  { id: 'almaty', en: 'Almaty', es: 'Almaty', lat: 43.24, lon: 76.89, r: 20, kind: 'city' },
  { id: 'perth', en: 'Perth', es: 'Perth', lat: -31.95, lon: 115.86, r: 25, kind: 'city' },
  { id: 'alice', en: 'Alice Springs', es: 'Alice Springs', lat: -23.70, lon: 133.88, r: 20, kind: 'city' },
  { id: 'auckland', en: 'Auckland', es: 'Auckland', lat: -36.85, lon: 174.76, r: 25, kind: 'city' },
  { id: 'honolulu', en: 'Honolulu', es: 'Honolulu', lat: 21.31, lon: -157.86, r: 15, kind: 'city' },
  { id: 'mcmurdo', en: 'McMurdo Station', es: 'Estación McMurdo', lat: -77.85, lon: 166.67, r: 20, kind: 'city' },
];

const KM_PER_DEG = 111.32;

export function distanceKm(aLat, aLon, bLat, bLon) {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nearest curated city within maxKm (cities only, as in "near Lima"). */
export function nearestCity(lat, lon, maxKm = 150) {
  let best = null;
  let bestD = maxKm;
  for (const p of PLACES) {
    if (p.kind !== 'city') continue;
    const d = distanceKm(lat, lon, p.lat, p.lon);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best ? { place: best, km: bestD } : null;
}

export { KM_PER_DEG };
