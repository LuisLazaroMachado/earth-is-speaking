// Interface text in English and Spanish. t('key', {vars}) returns the current language.
import { store } from './store.js';

const STR = {
  en: {
    title: 'Earth Is Speaking', subtitle: 'Listen to our planet', tagline: 'Touch the Earth. Hear what it says.',
    intro_sr: 'Earth Is Speaking turns NASA Earth data into sound. Press "Start listening", then click the map or use the arrow keys to hear each place.',
    start: 'Start listening', audio_only: 'Audio-only mode', test_sound: 'Play a test sound', how_to: 'How to listen',
    about: 'About & methods', help: 'Help', data_nasa: 'Data: NASA', language: 'Language',
    skip: 'Skip to main content', close: 'Close',
    layer_air: 'Air temperature', layer_lights: 'Night lights', layer_ocean: 'Ocean currents (trend)',
    layer_aero: 'Aerosols', layer_forest: 'Forest height', layer_light: 'Lightning',
    type_label: 'Data type', type_measured: 'Measured (approx.)', type_trend: 'Trend', type_category: 'Category',
    type_density: 'Density and rhythm',
    view_map: 'Map', view_globe: 'Globe', view_global: 'Global view',
    search_ph: 'Search a country, city or place', search_label: 'Search a place',
    mic: 'Speak a place', surprise: 'Surprise me', compare: 'Compare', compare_pick: 'Choose two places',
    listen: 'Listen', play: 'Play', pause: 'Pause', stop: 'Stop', volume: 'Volume', speed: 'Speed',
    slow: 'Slow', normal: 'Normal', fast: 'Fast', hear_scale: 'Hear the scale', sweep: 'Landscape sweep',
    scale_hint: 'Low sound = cold. High sound = hot.', hover: 'Hover preview', vibration: 'Vibration',
    pulse: 'Show sound pulse', see_data: 'See the data', did_you_know: 'Did you know?',
    why_matters: 'Why it matters', why_sounds: 'Why it sounds this way', date: 'Date', source: 'Source',
    range: 'Range', value: 'Value', my_song: 'My Earth Song', add_marker: 'Add marker', temp_marker: 'Temporary marker',
    rename: 'Rename', delete: 'Delete', playlist: 'Play all', mode_order: 'In order', mode_lr: 'Left to right',
    mode_chord: 'All together', share: 'Share link', share_place: 'Share this place', download: 'Download audio',
    latest: 'Latest on Earth', latest_label: 'Latest NASA model snapshot', latest_desc: 'The newest air temperature map we saved from NASA.',
    journey: 'Start the journey', next: 'Next', back: 'Back', where_am_i: 'Where am I?',
    no_place_layer: "This layer can't be heard by place yet.", other_layer: 'Hear this place in another layer',
    small_area: 'Area of about 20 km around {place}', no_coast: 'This place has no coast, so there is no ocean sound here.',
    quiet_here: 'It is quiet here: there is nothing to hear in this layer.', few_changes: 'Few changes detected here',
    top_scale: '40 °C or more (top of the scale)', bottom_scale: '−40 °C or colder (bottom of the scale)',
    near_top: 'near the top of the scale', approx: 'approx.',
    voice_first: 'Where would you like to listen? Say a place, or say "surprise me".', voice_short: 'Where to?',
    voice_going: 'Going to {place}', voice_surprise: 'Your place is: {place}.',
    voice_retry: "I didn't catch that. Please say a place name, like Venice or Antarctica, or type it.",
    audio_on: 'Audio-only mode is on. Say or type a place. Say help for commands.',
    no_mic: 'Voice search works in Google Chrome. Use the search box.',
    img_error: 'This picture could not be loaded.', not_endorsed: 'Independent project for the NASA Space Apps Challenge 2026.',
    // extra interface text
    choose_layer: 'Choose what to listen to', map_label: 'World map: {layer}. Use arrow keys to move, Enter to play.',
    map_help: 'Click or tap to hear a place. Hold and drag to play the map like a piano. With the keyboard: arrow keys move the cursor 2 degrees (Shift: 10 degrees), Enter plays the point and keeps it as a marker.',
    panel_title: 'What you hear', panel_empty: 'Touch the map, or use the arrow keys, to hear a place.',
    near: 'near {place}', coords: '{lat}, {lon}', ocean_at: 'Ocean ({lat}, {lon})', global_no_place: 'Global view, no place',
    no_data: 'No data at this point.', relative_strength: 'Relative strength: {level}',
    level_high: 'high', level_medium: 'medium', level_low: 'low',
    model_output: 'model output', soon: 'Coming soon', layer_soon: 'This layer is not ready yet.',
    scale_now: 'Scale: {label}', sweep_start: 'Landscape sweep started, west to east.', sweep_end: 'Landscape sweep finished.',
    test_desc: 'A 5-second rising scale to set a comfortable volume.',
    shortcuts: 'Keyboard shortcuts', sound_desc: 'Sound', paused: 'Paused', resumed: 'Playing',
    stopped: 'Stopped', volume_now: 'Volume {v} percent', layer_now: 'Layer: {layer}',
    footer_credit: 'Images and data: NASA Scientific Visualization Studio and the missions credited in About & methods.',
    nasa_logo_alt: 'NASA', open_panel: 'Show details', close_panel: 'Hide details', controls: 'Sound controls',
    zoom_group: 'Map zoom', zoom_in: 'Zoom in', zoom_out: 'Zoom out', zoom_reset: 'World',
    search_none: 'No places found', results: '{n} results', compare_a: 'First country', compare_b: 'Second country',
    compare_need: 'Choose two countries to compare them.', global_hint: 'This is a picture of a globe drawn by NASA: touch it to hear it. It has no place names.',
    repeat: 'Repeat', listening: 'Listening… say a place or a command.', audio_off: 'Audio-only mode is off.',
    voice_none: 'I did not find that place. Please type it in the search box.', audio_banner: 'Audio-only mode is on: the app speaks everything. Press V or the microphone to talk, H for keys.',
    options: 'Options', hover_desc: 'Plays a short, soft preview while the mouse moves over the map (off by default).',
    pulse_desc: 'A small ring next to the point pulses with the sound, for deaf and hard-of-hearing people.',
    journey_stop: 'Stop {n} of {total}', journey_end_btn: 'End the journey',
    journey_done: 'The journey is over. Now explore on your own: touch the map or search a place.',
    journey_none: 'In this picture there is nothing to hear here, so we move on.',
    journey_calm: 'In this picture its current lines look calm, so the sound is soft.', listening_to: 'Listening to {place}…', listen_to: 'Listen to {place}',
    summary_of: 'Summary: {place}', kind_country: 'Country', kind_city: 'City', kind_zone: 'Area', layer_no_compare: 'This layer cannot be compared by country.',
  },
  es: {
    title: 'Earth Is Speaking', subtitle: 'Escucha nuestro planeta', tagline: 'Toca la Tierra. Escucha lo que dice.',
    intro_sr: 'Earth Is Speaking convierte datos de la Tierra de la NASA en sonido. Pulsa "Empezar a escuchar" y luego toca el mapa o usa las flechas para oír cada lugar.',
    start: 'Empezar a escuchar', audio_only: 'Modo solo audio', test_sound: 'Probar el sonido', how_to: 'Cómo escuchar',
    about: 'Acerca de y métodos', help: 'Ayuda', data_nasa: 'Datos: NASA', language: 'Idioma',
    skip: 'Saltar al contenido principal', close: 'Cerrar',
    layer_air: 'Temperatura del aire', layer_lights: 'Luces nocturnas', layer_ocean: 'Corrientes del océano (tendencia)',
    layer_aero: 'Aerosoles', layer_forest: 'Altura del bosque', layer_light: 'Rayos',
    type_label: 'Tipo de dato', type_measured: 'Medida (aprox.)', type_trend: 'Tendencia', type_category: 'Categoría',
    type_density: 'Densidad y ritmo',
    view_map: 'Mapa', view_globe: 'Globo', view_global: 'Vista global',
    search_ph: 'Busca un país, ciudad o lugar', search_label: 'Buscar un lugar',
    mic: 'Di un lugar', surprise: 'Sorpréndeme', compare: 'Comparar', compare_pick: 'Elige dos lugares',
    listen: 'Escuchar', play: 'Reproducir', pause: 'Pausa', stop: 'Detener', volume: 'Volumen', speed: 'Velocidad',
    slow: 'Lento', normal: 'Normal', fast: 'Rápido', hear_scale: 'Escuchar la escala', sweep: 'Barrido del paisaje',
    scale_hint: 'Sonido grave = frío. Sonido agudo = calor.', hover: 'Vista previa al pasar el ratón', vibration: 'Vibración',
    pulse: 'Mostrar pulso del sonido', see_data: 'Ver los datos', did_you_know: '¿Sabías que?',
    why_matters: 'Por qué importa', why_sounds: 'Por qué suena así', date: 'Fecha', source: 'Fuente',
    range: 'Rango', value: 'Valor', my_song: 'Mi canción de la Tierra', add_marker: 'Añadir marcador', temp_marker: 'Marcador temporal',
    rename: 'Renombrar', delete: 'Borrar', playlist: 'Reproducir todo', mode_order: 'En orden', mode_lr: 'De izquierda a derecha',
    mode_chord: 'Todo junto', share: 'Compartir enlace', share_place: 'Compartir este lugar', download: 'Descargar audio',
    latest: 'Lo último en la Tierra', latest_label: 'Última instantánea del modelo de NASA', latest_desc: 'El mapa de temperatura del aire más reciente que guardamos de NASA.',
    journey: 'Empezar el recorrido', next: 'Siguiente', back: 'Atrás', where_am_i: '¿Dónde estoy?',
    no_place_layer: 'Esta capa todavía no se puede escuchar por lugar.', other_layer: 'Escucha este lugar en otra capa',
    small_area: 'Área de unos 20 km alrededor de {place}', no_coast: 'Este lugar no tiene costa, así que aquí no hay sonido del océano.',
    quiet_here: 'Aquí está en silencio: no hay nada que oír en esta capa.', few_changes: 'Aquí se detectan pocos cambios',
    top_scale: '40 °C o más (extremo de la escala)', bottom_scale: '−40 °C o menos (extremo inferior de la escala)',
    near_top: 'cerca del extremo de la escala', approx: 'aprox.',
    voice_first: '¿Qué lugar quieres escuchar? Di un lugar, o di "sorpréndeme".', voice_short: '¿A dónde?',
    voice_going: 'Vamos a {place}', voice_surprise: 'Tu lugar es: {place}.',
    voice_retry: 'No te entendí. Di el nombre de un lugar, como Venecia o la Antártida, o escríbelo.',
    audio_on: 'Modo solo audio activado. Di o escribe un lugar. Di ayuda para ver los comandos.',
    no_mic: 'La búsqueda por voz funciona en Google Chrome. Usa el cuadro de búsqueda.',
    img_error: 'No se pudo cargar esta imagen.', not_endorsed: 'Proyecto independiente para el NASA Space Apps Challenge 2026.',
    choose_layer: 'Elige qué escuchar', map_label: 'Mapa del mundo: {layer}. Usa las flechas para moverte y Enter para escuchar.',
    map_help: 'Haz clic o toca para oír un lugar. Mantén pulsado y arrastra para tocar el mapa como un piano. Con el teclado: las flechas mueven el cursor 2 grados (Shift: 10 grados) y Enter suena el punto y lo guarda como marcador.',
    panel_title: 'Lo que oyes', panel_empty: 'Toca el mapa, o usa las flechas, para oír un lugar.',
    near: 'cerca de {place}', coords: '{lat}, {lon}', ocean_at: 'Océano ({lat}, {lon})', global_no_place: 'Vista global, sin lugar',
    no_data: 'No hay datos en este punto.', relative_strength: 'Fuerza relativa: {level}',
    level_high: 'alta', level_medium: 'media', level_low: 'baja',
    model_output: 'resultado del modelo', soon: 'Muy pronto', layer_soon: 'Esta capa aún no está lista.',
    scale_now: 'Escala: {label}', sweep_start: 'Empieza el barrido del paisaje, de oeste a este.', sweep_end: 'Terminó el barrido del paisaje.',
    test_desc: 'Una escala ascendente de 5 segundos para ajustar un volumen cómodo.',
    shortcuts: 'Atajos de teclado', sound_desc: 'Sonido', paused: 'En pausa', resumed: 'Reproduciendo',
    stopped: 'Detenido', volume_now: 'Volumen {v} por ciento', layer_now: 'Capa: {layer}',
    footer_credit: 'Imágenes y datos: NASA Scientific Visualization Studio y las misiones citadas en Acerca de y métodos.',
    nasa_logo_alt: 'NASA', open_panel: 'Mostrar detalles', close_panel: 'Ocultar detalles', controls: 'Controles de sonido',
    zoom_group: 'Zoom del mapa', zoom_in: 'Acercar', zoom_out: 'Alejar', zoom_reset: 'Mundo',
    search_none: 'No se encontraron lugares', results: '{n} resultados', compare_a: 'Primer país', compare_b: 'Segundo país',
    compare_need: 'Elige dos países para compararlos.', global_hint: 'Es una imagen de un globo dibujado por NASA: tócala para oírla. No tiene nombres de lugares.',
    repeat: 'Repetir', listening: 'Escuchando… di un lugar o un comando.', audio_off: 'Modo solo audio desactivado.',
    voice_none: 'No encontré ese lugar. Escríbelo en el cuadro de búsqueda.', audio_banner: 'Modo solo audio activado: la app lo dice todo en voz alta. Pulsa V o el micrófono para hablar, y H para ver las teclas.',
    options: 'Opciones', hover_desc: 'Suena una vista previa corta y suave al mover el ratón sobre el mapa (desactivada por defecto).',
    pulse_desc: 'Un anillo pequeño junto al punto late con el sonido, para personas sordas o con poca audición.',
    journey_stop: 'Parada {n} de {total}', journey_end_btn: 'Terminar el recorrido',
    journey_done: 'Terminó el recorrido. Ahora explora por tu cuenta: toca el mapa o busca un lugar.',
    journey_none: 'En esta imagen no hay nada que oír aquí, así que seguimos.',
    journey_calm: 'En esta imagen sus líneas de corriente se ven tranquilas, así que el sonido es suave.', listening_to: 'Escuchando {place}…', listen_to: 'Escuchar {place}',
    summary_of: 'Resumen: {place}', kind_country: 'País', kind_city: 'Ciudad', kind_zone: 'Zona', layer_no_compare: 'Esta capa no se puede comparar por país.',
  },
};

let lang = 'en';
const listeners = new Set();

export function initLang() {
  const saved = store.get('lang');
  if (saved === 'en' || saved === 'es') lang = saved;
  else lang = (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  document.documentElement.lang = lang;
  return lang;
}

export function getLang() { return lang; }

export function setLang(l) {
  if (l !== 'en' && l !== 'es') return;
  lang = l;
  store.set('lang', l);
  document.documentElement.lang = l;
  applyI18n();
  listeners.forEach((fn) => fn(l));
}

export function onLangChange(fn) { listeners.add(fn); }

export function t(key, vars) {
  let s = STR[lang][key] ?? STR.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Pick from an {en, es} object. */
export function L(obj) { return obj ? (obj[lang] ?? obj.en) : ''; }

/** Fill every element with data-i18n / data-i18n-attr="attr:key;attr:key". */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    });
  });
}

/** Format a number with the right decimal separator and minus sign. */
export function fmtNum(n, digits = 0) {
  const s = Math.abs(n).toFixed(digits);
  const out = lang === 'es' ? s.replace('.', ',') : s;
  return (n < 0 && Number(s) !== 0 ? '−' : '') + out;
}

export function fmtLatLon(lat, lon) {
  const la = `${fmtNum(Math.abs(lat), 1)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${fmtNum(Math.abs(lon), 1)}° ${lon >= 0 ? 'E' : (lang === 'es' ? 'O' : 'W')}`;
  return { lat: la, lon: lo };
}
