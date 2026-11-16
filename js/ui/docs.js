// Long-form dialog content (EN/ES): How to listen, keyboard shortcuts, About & methods.
import { getLang } from '../i18n.js';

const SHORTCUTS = [
  [['←', '↑', '→', '↓'], 'Move the map cursor 2° (with Shift: 10°)', 'Mover el cursor del mapa 2° (con Shift: 10°)'],
  [['Enter'], 'Play the point under the cursor and keep it as a marker', 'Sonar el punto del cursor y guardarlo como marcador'],
  [['Space'], 'Play / Pause', 'Reproducir / Pausa'],
  [['S'], 'Stop', 'Detener'],
  [['[', ']'], 'Volume down / up', 'Bajar / subir volumen'],
  [['1', '…', '6'], 'Change layer', 'Cambiar de capa'],
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
    <h3>Hear the whole world</h3>
    <p>The <strong>Landscape sweep</strong> button crosses the map from west to east in 16 seconds. At each moment four notes play, from north to south.</p>
    <h3>Screen readers</h3>
    <p>The "What you hear" panel is announced after each sound. Everything the app says aloud is also written on screen.</p>`;
}

export function aboutHTML(meta) {
  const v = (meta && meta.validation) || {};
  const pct10 = v.share_dist_lt_10 ?? '—';
  const pct20 = v.share_dist_lt_20 ?? '—';
  const label = meta ? meta.frame_label : '';
  if (getLang() === 'es') {
    return `
      <h3>Cómo funciona</h3>
      <p>El color de cada píxel de un mapa de NASA se convierte en el valor que indica la barra de colores oficial de NASA, y ese valor decide la nota. No hay inteligencia artificial en el sonido: son reglas fijas que cualquiera puede revisar en el código.</p>
      <h3>Tipos de dato</h3>
      <ul><li><strong>Medida (aprox.)</strong>: un valor con unidad, leído de la barra oficial con un margen de unos pocos grados.</li>
      <li><strong>Tendencia</strong>: más o menos, sin número.</li><li><strong>Categoría</strong>: qué tipo de cosa hay (por ejemplo, polvo o humo).</li>
      <li><strong>Densidad y ritmo</strong>: cuántos eventos hay cerca, contado como ritmo.</li></ul>
      <h3>Temperatura del aire</h3>
      <p>Fuente: NASA SVS 5147, modelo GEOS-FP del Global Modeling and Assimilation Office de NASA (temperatura a 2 m). Imagen: ${label}. Es resultado de un modelo, no una medición directa; las horas más recientes de cada corrida son un pronóstico de corto plazo.</p>
      <p>Validación: el ${pct10} % de los píxeles coincide con un color de la barra a una distancia menor de 10 (en RGB) y el ${pct20} % a menos de 20. Los píxeles a 20 o más quedan sin dato y en silencio. Los colores más fríos que el inicio de la barra (interior de la Antártida) se informan como "−40 °C o menos"; el gris del extremo cálido de la barra cubre aproximadamente de 37 a 40 °C.</p>
      <h3>Límites</h3>
      <ul><li>Cada píxel mide unos 20 km: la app nunca finge más precisión.</li><li>La temperatura es aproximada (± unos pocos °C).</li>
      <li>Las estadísticas por área se ponderan por cos(latitud), porque en un mapa plano los píxeles cerca de los polos cubren menos superficie.</li></ul>
      <h3>Privacidad</h3>
      <p>Sin cuentas ni seguimiento. El navegador guarda solo el idioma, el volumen y el modo.</p>
      <h3>Accesibilidad</h3>
      <p>Diseñada primero para personas ciegas y con baja visión, pero todavía no se probó con ellas. Agradecemos sus comentarios.</p>
      <h3>Impacto local: Lima, Perú</h3>
      <p>En el Perú, 1 550 196 personas declararon una dificultad permanente para ver, aun usando anteojos (INEI, Censo 2017). La app está en español y en inglés, y cuenta historias de la costa peruana, como la corriente de Humboldt.</p>
      <h3>Créditos</h3>
      <p>NASA Scientific Visualization Studio; visualizador Joseph V. Ardizzone; NASA Global Modeling and Assimilation Office (GMAO). Earth Is Speaking es un proyecto independiente hecho para el NASA Space Apps Challenge 2026.</p>`;
  }
  return `
    <h3>How it works</h3>
    <p>The color of each pixel of a NASA map is turned into the value shown by NASA's official color bar, and that value chooses the note. There is no artificial intelligence in the sound: these are fixed rules anyone can check in the code.</p>
    <h3>Data types</h3>
    <ul><li><strong>Measured (approx.)</strong>: a value with a unit, read from the official color bar within a few degrees.</li>
    <li><strong>Trend</strong>: more or less, with no number.</li><li><strong>Category</strong>: what kind of thing is there (for example dust or smoke).</li>
    <li><strong>Density and rhythm</strong>: how many events are nearby, heard as rhythm.</li></ul>
    <h3>Air temperature</h3>
    <p>Source: NASA SVS 5147, GEOS-FP model from NASA's Global Modeling and Assimilation Office (temperature at 2 m). Image: ${label}. This is model output, not a direct measurement; the newest hours of each model run are a short-range forecast.</p>
    <p>Validation: ${pct10}% of pixels match a color bar color within an RGB distance of 10, and ${pct20}% within 20. Pixels at 20 or more are left as no data and stay silent. Colors colder than the start of the bar (interior of Antarctica) are reported as "−40 °C or colder"; the gray at the hot end of the bar covers roughly 37 to 40 °C.</p>
    <h3>Limits</h3>
    <ul><li>Each pixel covers about 20 km: the app never pretends to be more precise.</li><li>Temperature is approximate (± a few °C).</li>
    <li>Area statistics are weighted by cos(latitude), because on a flat map the pixels near the poles cover less surface.</li></ul>
    <h3>Privacy</h3>
    <p>No accounts and no tracking. The browser only stores your language, volume and mode.</p>
    <h3>Accessibility</h3>
    <p>Designed first for blind and low-vision people, but not yet tested with them. We welcome feedback.</p>
    <h3>Local impact: Lima, Peru</h3>
    <p>In Peru, 1,550,196 people reported a permanent difficulty seeing, even with glasses (INEI, 2017 Census). The app speaks Spanish and English and tells stories from Peru's coast, such as the Humboldt Current.</p>
    <h3>Credits</h3>
    <p>NASA Scientific Visualization Studio; visualizer Joseph V. Ardizzone; NASA Global Modeling and Assimilation Office (GMAO). Earth Is Speaking is an independent project made for the NASA Space Apps Challenge 2026.</p>`;
}
