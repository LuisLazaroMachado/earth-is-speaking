// Long-form dialog content (EN/ES): How to listen, keyboard shortcuts, About & methods.
import { getLang } from '../i18n.js';

const SHORTCUTS = [
  [['←', '↑', '→', '↓'], 'Move the map cursor 2° (with Shift: 10°)', 'Mover el cursor del mapa 2° (con Shift: 10°)'],
  [['Enter'], 'Play the point under the cursor and keep it as a marker', 'Sonar el punto del cursor y guardarlo como marcador'],
  [['Space'], 'Play / Pause', 'Reproducir / Pausa'],
  [['S'], 'Stop', 'Detener'],
  [['[', ']'], 'Volume down / up', 'Bajar / subir volumen'],
  [['1', '…', '6'], 'Change layer', 'Cambiar de capa'],
  [['/'], 'Search a country, city or place', 'Buscar un país, ciudad o lugar'],
  [['+', '−'], 'Zoom the map in / out (smaller cursor steps when zoomed in)', 'Acercar / alejar el mapa (pasos del cursor más cortos al acercar)'],
  [['W'], 'Where am I? (place, layer and value)', '¿Dónde estoy? (lugar, capa y valor)'],
  [['I'], 'Read the whole information panel', 'Leer todo el panel de información'],
  [['R'], 'Repeat the last spoken message', 'Repetir el último mensaje hablado'],
  [['H'], 'Open this list of shortcuts', 'Abrir esta lista de atajos'],
  [['Esc'], 'Close a dialog', 'Cerrar un diálogo'],
];

export function shortcutsHTML() {
  const es = getLang() === 'es';
  const rows = SHORTCUTS.map(([keys, en, esT]) =>
    `<tr><th scope="row">${keys.map((k) => (k === '…' ? k : `<kbd>${k}</kbd>`)).join(' ')}</th><td>${es ? esT : en}</td></tr>`).join('');
  return `<table class="keys"><caption class="sr-only">${es ? 'Atajos de teclado' : 'Keyboard shortcuts'}</caption>
    <thead><tr><th scope="col">${es ? 'Tecla' : 'Key'}</th><th scope="col">${es ? 'Acción' : 'Action'}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function howToHTML() {
  if (getLang() === 'es') {
    return `
      <p><strong>Sonido grave = frío. Sonido agudo = calor.</strong> Cada capa tiene su propio sonido, y cada sonido sale de los colores de un mapa de NASA.</p>
      <p><button type="button" class="btn btn-small" data-action="scale">Escuchar la escala</button></p>
      <h3>Tocar</h3>
      <ul><li>Haz clic o toca un punto del mapa: suena 2,5 segundos y el panel dice qué es.</li>
      <li>Mantén pulsado y arrastra para tocar el mapa como un piano.</li></ul>
      <h3>Teclado</h3>
      <ul><li>Pulsa <kbd>Tab</kbd> hasta llegar al mapa. Las flechas mueven el cursor 2 grados (con Shift, 10).</li>
      <li><kbd>Enter</kbd> suena el punto. <kbd>W</kbd> dice dónde estás. <kbd>I</kbd> lee el panel completo.</li>
      <li><kbd>H</kbd> abre la lista de atajos.</li></ul>
      <h3>Buscar y comparar</h3>
      <p>Escribe un país, ciudad o lugar en el buscador (tecla <kbd>/</kbd>). En un país suenan hasta 24 puntos de oeste a este y luego un resumen. <strong>Comparar</strong> pone dos países lado a lado.</p>
      <h3>Escuchar todo el mundo</h3>
      <p>El botón <strong>Barrido del paisaje</strong> recorre el mapa de oeste a este en 16 segundos. En cada momento suenan cuatro notas, de norte a sur.</p>
      <h3>Lector de pantalla</h3>
      <p>El panel "Lo que oyes" se anuncia solo después de cada sonido. Todo lo que la app dice en voz alta también aparece escrito.</p>`;
  }
  return `
    <p><strong>Low sound = cold. High sound = hot.</strong> Each layer has its own sound, and every sound comes from the colors of a NASA map.</p>
    <p><button type="button" class="btn btn-small" data-action="scale">Hear the scale</button></p>
    <h3>Touch</h3>
    <ul><li>Click or tap a point on the map: it sounds for 2.5 seconds and the panel tells you what it is.</li>
    <li>Hold and drag to play the map like a piano.</li></ul>
    <h3>Keyboard</h3>
    <ul><li>Press <kbd>Tab</kbd> until you reach the map. Arrow keys move the cursor 2 degrees (with Shift, 10).</li>
    <li><kbd>Enter</kbd> plays the point. <kbd>W</kbd> tells you where you are. <kbd>I</kbd> reads the whole panel.</li>
    <li><kbd>H</kbd> opens the list of shortcuts.</li></ul>
    <h3>Search and compare</h3>
    <p>Type a country, city or place in the search box (key <kbd>/</kbd>). For a country, up to 24 points play from west to east, then a summary. <strong>Compare</strong> puts two countries side by side.</p>
    <h3>Hear the whole world</h3>
    <p>The <strong>Landscape sweep</strong> button crosses the map from west to east in 16 seconds. At each moment four notes play, from north to south.</p>
    <h3>Screen readers</h3>
    <p>The "What you hear" panel is announced after each sound. Everything the app says aloud is also written on screen.</p>`;
}

export function aboutHTML(metas = {}) {
  const v = (id, k, d = '—') => (metas[id] && metas[id].validation && metas[id].validation[k] !== undefined ? metas[id].validation[k] : d);
  const label = metas.air ? metas.air.frame_label : '';
  const es = getLang() === 'es';
  const n = (x) => (es ? String(x).replace('.', ',') : String(x));
  if (es) {
    return `
      <h3>Cómo funciona</h3>
      <p>El color de cada píxel de un mapa de NASA se convierte en el valor que indica la barra de colores oficial de NASA, y ese valor decide la nota. No hay inteligencia artificial en el sonido: son reglas fijas que cualquiera puede revisar en el código y en los scripts de preparación de datos, que están publicados junto a la app.</p>
      <h3>Tipos de dato</h3>
      <ul><li><strong>Medida (aprox.)</strong>: un valor con unidad, leído de la barra oficial con un margen de unos pocos grados.</li>
      <li><strong>Tendencia</strong>: más o menos, sin número.</li><li><strong>Categoría</strong>: qué tipo de cosa hay (por ejemplo, polvo o humo).</li>
      <li><strong>Densidad y ritmo</strong>: cuántos eventos hay cerca, contado como ritmo.</li></ul>
      <h3>Temperatura del aire (medida, aprox.)</h3>
      <p>NASA SVS 5147, modelo GEOS-FP del Global Modeling and Assimilation Office (temperatura a 2 m). Imagen: ${label}. Es resultado de un modelo, no una medición directa; las horas más recientes de cada corrida son un pronóstico de corto plazo.</p>
      <p>Validación: el ${n(v('air', 'share_dist_lt_10'))} % de los píxeles coincide con un color de la barra a una distancia menor de 10 (RGB) y el ${n(v('air', 'share_dist_lt_20'))} % a menos de 20; el resto queda sin dato y en silencio. Los colores más fríos que el inicio de la barra (interior de la Antártida) se informan como "−40 °C o menos"; el gris del extremo cálido de la barra cubre aproximadamente de 37 a 40 °C.</p>
      <h3>Luces nocturnas (tendencia)</h3>
      <p>NASA SVS 5276, Black Marble (Suomi NPP, VIIRS): cambio de la intensidad de las luces de 2012 a 2023. Púrpura = más luz, naranja = menos luz; no hay escala numérica. Clasificamos a la resolución original (7680×4320) y reducimos a 1920×1080 guardando el píxel clasificado más fuerte de cada bloque, para no borrar los puntos tenues. Resultado: ${n(v('lights', 'grid_more_pct'))} % de las celdas con más luz y ${n(v('lights', 'grid_less_pct'))} % con menos luz. El silencio significa "sin cambio detectado". Si en un país cambia menos del 1 % del área, la app dice "Aquí se detectan pocos cambios".</p>
      <h3>Corrientes del océano (tendencia)</h3>
      <p>NASA SVS 5479, modelo ECCO-2 (NASA/JPL, MIT), 2021–2023; fotograma del ${metas.ocean ? metas.ocean.frame_label : ''}. Las líneas están coloreadas por temperatura, pero NASA no publica una barra para esta versión (la barra de 0–25 °C de SVS 5425 coincidió solo en un 17 %), así que la app nunca muestra °C ni velocidad. Medimos cuánto se distinguen las líneas del océano azul marino (índice relativo 0–100, promedio local de unos 100 km). Por país se usan las aguas costeras: hasta 15 píxeles (unos 300 km) desde la costa.</p>
      <h3>Aerosoles (categoría)</h3>
      <p>NASA SVS 5669, modelo GEOS, 19 ago 2025, 20:00 UTC. Clasificamos por tono de color alrededor de los cuatro colores de la leyenda oficial. La muestra de sal marina de la leyenda es gris verdosa, pero NASA dibuja la sal marina como remolinos azules, así que calibramos su tono con los remolinos del océano Austral (${n(v('aero', 'hue_centers_deg', {}).seasalt ?? '—')}°). Si una segunda categoría supera el 30 % de la mezcla local, suenan las dos (${n(v('aero', 'mixed_pct_of_classified'))} % de los píxeles clasificados). La sal marina es la más difícil de separar del océano oscuro.</p>
      <h3>Límites</h3>
      <ul><li>Cada píxel mide unos 20 km: la app nunca finge más precisión. Los lugares que caben en uno o dos píxeles se anuncian como "área de unos 20 km".</li>
      <li>La temperatura es aproximada (± unos pocos °C), con extremos de escala (−40 °C o menos, 40 °C o más).</li>
      <li>Las corrientes y las luces son tendencias, no medidas.</li>
      <li>Toda media y porcentaje por país se pondera por cos(latitud), porque en un mapa plano los píxeles cerca de los polos cubren menos superficie. Hasta 24 puntos por país, repartidos de forma uniforme en área.</li></ul>
      <h3>Privacidad</h3>
      <p>Sin cuentas ni seguimiento. El navegador guarda solo el idioma, el volumen, la velocidad y el modo.</p>
      <h3>Accesibilidad</h3>
      <p>Diseñada primero para personas ciegas y con baja visión, pero todavía no se probó con ellas. Agradecemos sus comentarios.</p>
      <h3>Impacto local: Lima, Perú</h3>
      <p>En el Perú, 1 550 196 personas declararon una dificultad permanente para ver, aun usando anteojos (INEI, Censo 2017). La app está en español y en inglés, incluye ciudades y zonas del Perú en la búsqueda, y cuenta historias de la costa peruana, como la fría corriente de Humboldt que mantiene fresca y neblinosa a Lima.</p>
      <h3>Créditos</h3>
      <p>NASA Scientific Visualization Studio y los visualizadores y científicos citados en cada capa; NASA Global Modeling and Assimilation Office (GMAO); ECCO (NASA/JPL, MIT); Black Marble (Suomi NPP VIIRS); Natural Earth (dominio público). Earth Is Speaking es un proyecto independiente hecho para el NASA Space Apps Challenge 2026.</p>`;
  }
  return `
    <h3>How it works</h3>
    <p>The color of each pixel of a NASA map is turned into the value shown by NASA's official color bar, and that value chooses the note. There is no artificial intelligence in the sound: these are fixed rules anyone can check in the code and in the data-preparation scripts published with the app.</p>
    <h3>Data types</h3>
    <ul><li><strong>Measured (approx.)</strong>: a value with a unit, read from the official color bar within a few degrees.</li>
    <li><strong>Trend</strong>: more or less, with no number.</li><li><strong>Category</strong>: what kind of thing is there (for example dust or smoke).</li>
    <li><strong>Density and rhythm</strong>: how many events are nearby, heard as rhythm.</li></ul>
    <h3>Air temperature (measured, approx.)</h3>
    <p>NASA SVS 5147, GEOS-FP model from NASA's Global Modeling and Assimilation Office (temperature at 2 m). Image: ${label}. This is model output, not a direct measurement; the newest hours of each model run are a short-range forecast.</p>
    <p>Validation: ${v('air', 'share_dist_lt_10')}% of pixels match a color bar color within an RGB distance of 10, and ${v('air', 'share_dist_lt_20')}% within 20; the rest is left as no data and stays silent. Colors colder than the start of the bar (interior of Antarctica) are reported as "−40 °C or colder"; the gray at the hot end of the bar covers roughly 37 to 40 °C.</p>
    <h3>Night lights (trend)</h3>
    <p>NASA SVS 5276, Black Marble (Suomi NPP, VIIRS): change in lighting intensity from 2012 to 2023. Purple = more light, orange = less light; there is no numeric scale. We classify at the original resolution (7680×4320) and shrink to 1920×1080 keeping the strongest classified pixel of each block, so faint dots are not erased. Result: ${v('lights', 'grid_more_pct')}% of cells with more light and ${v('lights', 'grid_less_pct')}% with less light. Silence means "no change detected". When less than 1% of a country's area changed, the app says "Few changes detected here".</p>
    <h3>Ocean currents (trend)</h3>
    <p>NASA SVS 5479, ECCO-2 model (NASA/JPL, MIT), 2021–2023; frame of ${metas.ocean ? metas.ocean.frame_label : ''}. Current lines are colored by temperature, but NASA publishes no color bar for this version (the 0–25 °C bar of SVS 5425 matched only 17% of pixels), so the app never shows °C or speed. We measure how much the lines stand out from the navy ocean (relative index 0–100, local mean over about 100 km). For countries we use coastal waters: up to 15 pixels (about 300 km) from the coast.</p>
    <h3>Aerosols (category)</h3>
    <p>NASA SVS 5669, GEOS model, 19 Aug 2025, 20:00 UTC. We classify by hue around the four colors of the official legend. The legend's sea-salt swatch is gray-cyan, but NASA draws sea salt as blue swirls, so its hue is calibrated on the Southern Ocean swirls (${v('aero', 'hue_centers_deg', {}).seasalt ?? '—'}°). When a second category is at least 30% of the local mix, both sound (${v('aero', 'mixed_pct_of_classified')}% of classified pixels). Sea salt is the hardest type to separate from the dark ocean.</p>
    <h3>Limits</h3>
    <ul><li>Each pixel covers about 20 km: the app never pretends to be more precise. Places that fit in one or two pixels are announced as an "area of about 20 km".</li>
    <li>Temperature is approximate (± a few °C), with scale ends (−40 °C or colder, 40 °C or more).</li>
    <li>Ocean currents and night lights are trends, not measurements.</li>
    <li>Every country mean and percentage is weighted by cos(latitude), because on a flat map the pixels near the poles cover less surface. Up to 24 points per country, spread evenly by area.</li></ul>
    <h3>Privacy</h3>
    <p>No accounts and no tracking. The browser only stores your language, volume, speed and mode.</p>
    <h3>Accessibility</h3>
    <p>Designed first for blind and low-vision people, but not yet tested with them. We welcome feedback.</p>
    <h3>Local impact: Lima, Peru</h3>
    <p>In Peru, 1,550,196 people reported a permanent difficulty seeing, even with glasses (INEI, 2017 Census). The app speaks Spanish and English, includes Peruvian cities and areas in its search, and tells stories from Peru's coast, such as the cold Humboldt Current that keeps Lima cool and foggy.</p>
    <h3>Credits</h3>
    <p>NASA Scientific Visualization Studio and the visualizers and scientists credited on each layer; NASA Global Modeling and Assimilation Office (GMAO); ECCO (NASA/JPL, MIT); Black Marble (Suomi NPP VIIRS); Natural Earth (public domain). Earth Is Speaking is an independent project made for the NASA Space Apps Challenge 2026.</p>`;
}
