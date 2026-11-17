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
  [['V'], 'Speak a place or a command (Google Chrome)', 'Decir un lugar o un comando (Google Chrome)'],
  [['P'], 'Play My Earth Song', 'Reproducir Mi canción de la Tierra'],
  [['G'], 'Switch between Map and 3D Globe', 'Cambiar entre Mapa y Globo 3D'],
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
      <h3>Mi canción de la Tierra</h3>
      <p>Pulsa <strong>Añadir marcador</strong> (o <kbd>Enter</kbd> en el mapa) para guardar lugares de cualquier capa, hasta 100. Reprodúcelos en orden, de izquierda a derecha o todos juntos, comparte la lista con un enlace o descárgala como audio. <strong>Compartir este lugar</strong> crea una postal sonora; quien la recibe puede responder con su propio lugar.</p>
      <h3>Voz y modo solo audio</h3>
      <p>En Google Chrome, pulsa el micrófono o la tecla <kbd>V</kbd> y di un lugar ("Lima", "Japón") o un comando ("sorpréndeme", "más fuerte", "dónde estoy", "siguiente capa", "ayuda"). El <strong>modo solo audio</strong> hace que la app diga todo en voz alta, para usarla sin mirar. Si ya usas un lector de pantalla, quizá no lo necesites.</p>
      <h3>Recorrido guiado</h3>
      <p><strong>Empezar el recorrido</strong> te lleva por 8 paradas narradas, de la Antártida a Lima, con su sonido. Usa Siguiente, Atrás o Terminar; la barra espaciadora pausa también la voz.</p>
      <h3>Opciones</h3>
      <p>En <strong>Opciones</strong>: vista previa al pasar el ratón (desactivada por defecto), vibración en teléfonos Android y el pulso visual del sonido.</p>
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
    <h3>My Earth Song</h3>
    <p>Press <strong>Add marker</strong> (or <kbd>Enter</kbd> on the map) to keep places from any layer, up to 100. Play them in order, from left to right or all together, share the list with a link or download it as audio. <strong>Share this place</strong> makes a sound postcard; whoever receives it can answer with their own place.</p>
    <h3>Voice and audio-only mode</h3>
    <p>In Google Chrome, press the microphone or the <kbd>V</kbd> key and say a place ("Lima", "Japan") or a command ("surprise me", "louder", "where am I", "next layer", "help"). <strong>Audio-only mode</strong> makes the app say everything aloud, so you can use it without looking. If you already use a screen reader, you may not need it.</p>
    <h3>Guided journey</h3>
    <p><strong>Start the journey</strong> takes you through 8 narrated stops, from Antarctica to Lima, with their sound. Use Next, Back or End; the space bar also pauses the voice.</p>
    <h3>Options</h3>
    <p>In <strong>Options</strong>: hover preview (off by default), vibration on Android phones and the visual sound pulse.</p>
    <h3>Search and compare</h3>
    <p>Type a country, city or place in the search box (key <kbd>/</kbd>). For a country, up to 24 points play from west to east, then a summary. <strong>Compare</strong> puts two countries side by side.</p>
    <h3>Hear the whole world</h3>
    <p>The <strong>Landscape sweep</strong> button crosses the map from west to east in 16 seconds. At each moment four notes play, from north to south.</p>
    <h3>Screen readers</h3>
    <p>The "What you hear" panel is announced after each sound. Everything the app says aloud is also written on screen.</p>`;
}

const REPO = 'https://github.com/LuisLazaroMachado/earth-is-speaking';

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
      <h3>Altura del bosque (tendencia, vista global)</h3>
      <p>NASA SVS 4950, GEDI, láser (lidar) en la Estación Espacial Internacional. Cada color se compara con la barra de referencia de 0 a 50 m, pero el globo está iluminado, las alturas están exageradas a propósito y los huecos entre las trazas de la estación se ven marrones como la vegetación baja, así que solo se oye la altura relativa (baja, media, alta). NASA indica las fechas como "abril 2019–abril 2020" en la descripción principal y "abril 2018–abril 2019" en otros pies de foto; la app dice "alrededor de un año de mediciones de GEDI (2018–2020)".</p>
      <h3>Rayos (densidad y ritmo, vista global)</h3>
      <p>NASA SVS 5011, Lightning Imaging Sensor (LIS) en la Estación Espacial Internacional, datos del GHRC DAAC de NASA. Cada punto amarillo es un evento dentro de una ventana de 10 días (enero 2017–julio 2023), no un destello único. Al tocar, contamos los puntos amarillos en un radio de 40 píxeles; la densidad fija el ritmo (1 a 8 golpes por segundo). Los archivos originales exigen iniciar sesión en NASA Earthdata y son decenas de miles, así que no se usan.</p>
      <h3>Por qué dos capas no se escuchan por lugar</h3>
      <p>La altura del bosque y los rayos solo existen como globos ya dibujados por NASA con la cámara fija. En una imagen en perspectiva no hay latitud ni longitud fiables, así que la app no da país ni coordenadas en esas capas y ofrece escuchar el lugar en otra capa.</p>
      <h3>Globo 3D</h3>
      <p>El globo usa la misma imagen de NASA que el mapa, con los píxeles sin suavizar para que se vean los datos, y el mismo motor: tocar un punto del globo da la misma latitud, longitud y sonido que en el mapa. Solo en la textura del globo se taparon las leyendas, logotipos y fechas con colores vecinos, para que no parezcan datos. El globo nunca es la única vía: todo se puede hacer en el mapa o con el teclado.</p>
      <h3>Capas que no se incluyen</h3>
      <p>El CO₂ (se dibuja como opacidad volumétrica, que no se puede convertir en valores fiables) y la salinidad no forman parte de la app.</p>
      <h3>Límites</h3>
      <ul><li>Cada píxel mide unos 20 km: la app nunca finge más precisión. Los lugares que caben en uno o dos píxeles se anuncian como "área de unos 20 km".</li>
      <li>La temperatura es aproximada (± unos pocos °C), con extremos de escala (−40 °C o menos, 40 °C o más).</li>
      <li>Las corrientes y las luces son tendencias, no medidas.</li>
      <li>Toda media y porcentaje por país se pondera por cos(latitud), porque en un mapa plano los píxeles cerca de los polos cubren menos superficie. Hasta 24 puntos por país, repartidos de forma uniforme en área.</li></ul>
      <h3>Privacidad</h3>
      <p>Sin cuentas ni seguimiento. El navegador guarda solo el idioma, el volumen, la velocidad, las opciones y el modo. El reconocimiento de voz de Chrome envía el audio a un servicio en la nube de Google; el micrófono solo se activa cuando pulsas el botón o la tecla V.</p>
      <h3>Declaración de accesibilidad</h3>
      <p>Diseñada primero para personas ciegas y con baja visión: todo funciona con teclado, con lector de pantalla, por voz (Chrome) y en modo solo audio, con texto en pantalla para todo lo que suena o se dice. Pruebas automáticas: axe-core en 38 estados de la app (inglés, español, escritorio y móvil) sin infracciones WCAG 2.2 AA; Lighthouse 100 en accesibilidad; contraste medido sobre el fondo real de 119 textos, el más bajo 5,27:1 (mínimo exigido 4,5:1); ningún texto por debajo de 16 px salvo el crédito decorativo de las tarjetas.</p>
      <p><strong>Probada por el equipo con el lector de pantalla NVDA</strong> (recorrido de 16 pasos: teclado, búsqueda, recorrido guiado, voz, modo solo audio y globo). <strong>Siguiente hito:</strong> sesiones con personas adultas ciegas y con baja visión en Lima, para que quienes la usarán den forma a la próxima versión. Agradecemos sus comentarios. <a href="${REPO}/blob/main/docs/accessibility-audit.md" target="_blank" rel="noopener">Informe de accesibilidad</a> · <a href="${REPO}/blob/main/docs/guia-prueba-nvda.md" target="_blank" rel="noopener">Plan de pruebas con NVDA y usuarios</a></p>
      <h3>Impacto local: Lima, Perú</h3>
      <p>En el Perú, 1 550 196 personas declararon una dificultad permanente para ver, aun usando anteojos (INEI, Censo 2017). La app está en español y en inglés, incluye ciudades y zonas del Perú en la búsqueda, y cuenta historias de la costa peruana, como la fría corriente de Humboldt que mantiene fresca y neblinosa a Lima.</p>
      <h3>Datos curiosos verificados</h3>
      <p>Cada "¿Sabías que?" se contrastó con una página de NASA o una fuente científica estable; los que no se pudieron verificar se quitaron (por ejemplo, una temperatura de la corriente de Kuroshio). <a href="${REPO}/blob/main/docs/facts.md" target="_blank" rel="noopener">Lista de datos y fuentes</a></p>
      <h3>Uso de inteligencia artificial</h3>
      <p>El código, los scripts de preparación de datos y los textos se escribieron con ayuda de un asistente de IA (Claude, de Anthropic), dirigido, revisado y probado por el equipo. El sonido no usa IA: son reglas fijas. Ninguna imagen, audio o dato de la app fue generado por IA: las imágenes son de NASA y el sonido se sintetiza en tu navegador.</p>
      <h3>Créditos</h3>
      <p>NASA Scientific Visualization Studio y los visualizadores y científicos citados en cada capa; NASA Global Modeling and Assimilation Office (GMAO); ECCO (NASA/JPL, MIT); Black Marble (Suomi NPP VIIRS); GEDI; ISS LIS (GHRC DAAC); Natural Earth (dominio público); Three.js (licencia MIT). Earth Is Speaking es un proyecto independiente hecho para el NASA Space Apps Challenge 2026 y no está respaldado por NASA. <a href="${REPO}" target="_blank" rel="noopener">Código y scripts en GitHub</a></p>`;
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
    <h3>Forest height (trend, global view)</h3>
    <p>NASA SVS 4950, GEDI, a laser (lidar) on the International Space Station. Each color is compared with the 0–50 m reference bar, but the globe is lit, heights are exaggerated on purpose, and gaps between the station's tracks look brown like low vegetation, so only relative height (low, medium, tall) is heard. NASA gives the dates as "April 2019–April 2020" in the main description and "April 2018–April 2019" in other captions; the app says "about one year of GEDI measurements (2018–2020)".</p>
    <h3>Lightning (density and rhythm, global view)</h3>
    <p>NASA SVS 5011, Lightning Imaging Sensor (LIS) on the International Space Station, data from NASA GHRC DAAC. Each yellow dot is an event within a 10-day window (January 2017–July 2023), not a single flash. On a tap we count yellow dots within a 40-pixel radius; the density sets the rhythm (1 to 8 hits per second). The original files require a NASA Earthdata login and number in the tens of thousands, so they are not used.</p>
    <h3>Why two layers can't be heard by place</h3>
    <p>Forest height and lightning only exist as globes already drawn by NASA with a fixed camera. A perspective picture has no reliable latitude or longitude, so the app gives no country or coordinates for these layers and offers to hear the place in another layer.</p>
    <h3>3D globe</h3>
    <p>The globe uses the same NASA picture as the map, with unsmoothed pixels so the data stays visible, and the same engine: tapping a point on the globe gives the same latitude, longitude and sound as on the map. Only on the globe texture were legends, logos and dates covered with neighboring colors, so they don't look like data. The globe is never the only way: everything can be done on the map or with the keyboard.</p>
    <h3>Layers not included</h3>
    <p>CO₂ (drawn as volumetric opacity, which cannot be turned into reliable values) and salinity are not part of the app.</p>
    <h3>Limits</h3>
    <ul><li>Each pixel covers about 20 km: the app never pretends to be more precise. Places that fit in one or two pixels are announced as an "area of about 20 km".</li>
    <li>Temperature is approximate (± a few °C), with scale ends (−40 °C or colder, 40 °C or more).</li>
    <li>Ocean currents and night lights are trends, not measurements.</li>
    <li>Every country mean and percentage is weighted by cos(latitude), because on a flat map the pixels near the poles cover less surface. Up to 24 points per country, spread evenly by area.</li></ul>
    <h3>Privacy</h3>
    <p>No accounts and no tracking. The browser only stores your language, volume, speed, options and mode. Chrome's speech recognition sends the audio to a Google cloud service; the microphone is only used when you press the button or the V key.</p>
    <h3>Accessibility statement</h3>
    <p>Designed first for blind and low-vision people: everything works with the keyboard, with a screen reader, by voice (Chrome) and in audio-only mode, with on-screen text for everything that sounds or is spoken. Automated tests: axe-core on 38 app states (English, Spanish, desktop and mobile) with no WCAG 2.2 AA violations; Lighthouse accessibility 100; contrast measured on the real background of 119 text elements, lowest 5.27:1 (minimum required 4.5:1); no text below 16 px except the decorative card credit.</p>
    <p><strong>Tested by our team with the NVDA screen reader</strong> (16-step walkthrough: keyboard, search, guided journey, voice, audio-only mode and globe). <strong>Next milestone:</strong> sessions with blind and low-vision adults in Lima, so the people who will use it shape the next version. We welcome feedback. <a href="${REPO}/blob/main/docs/accessibility-audit.md" target="_blank" rel="noopener">Accessibility report</a> · <a href="${REPO}/blob/main/docs/guia-prueba-nvda.md" target="_blank" rel="noopener">NVDA and user test plan (Spanish)</a></p>
    <h3>Local impact: Lima, Peru</h3>
    <p>In Peru, 1,550,196 people reported a permanent difficulty seeing, even with glasses (INEI, 2017 Census). The app speaks Spanish and English, includes Peruvian cities and areas in its search, and tells stories from Peru's coast, such as the cold Humboldt Current that keeps Lima cool and foggy.</p>
    <h3>Verified facts</h3>
    <p>Every "Did you know?" was checked against a NASA page or a stable scientific source; facts that could not be verified were removed (for example, a temperature for the Kuroshio Current). <a href="${REPO}/blob/main/docs/facts.md" target="_blank" rel="noopener">List of facts and sources</a></p>
    <h3>Use of artificial intelligence</h3>
    <p>The code, data-preparation scripts and texts were written with the help of an AI assistant (Claude, by Anthropic), directed, reviewed and tested by the team. The sound does not use AI: it follows fixed rules. No image, audio or data in the app was generated by AI: the pictures are NASA's and the sound is synthesized in your browser.</p>
    <h3>Credits</h3>
    <p>NASA Scientific Visualization Studio and the visualizers and scientists credited on each layer; NASA Global Modeling and Assimilation Office (GMAO); ECCO (NASA/JPL, MIT); Black Marble (Suomi NPP VIIRS); GEDI; ISS LIS (GHRC DAAC); Natural Earth (public domain); Three.js (MIT license). Earth Is Speaking is an independent project made for the NASA Space Apps Challenge 2026 and is not endorsed by NASA. <a href="${REPO}" target="_blank" rel="noopener">Code and scripts on GitHub</a></p>`;
}
