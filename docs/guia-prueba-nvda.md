# Guía de prueba: NVDA y personas usuarias

Esta guía tiene dos partes:

- **Parte A:** tú pruebas la app con el lector de pantalla NVDA, unos 30 minutos.
- **Parte B:** un protocolo para probarla con personas ciegas o con baja visión en Lima.

App: https://luislazaromachado.github.io/earth-is-speaking/

---

## Parte A: prueba con NVDA (tú mismo)

### Preparación (una sola vez)

1. Descarga NVDA, que es gratis, desde https://www.nvaccess.org/download/ e instálalo.
2. Usa **Google Chrome**, porque es el navegador donde funciona la voz.
3. Ponte audífonos y baja un poco el volumen de Windows.
4. Teclas básicas de NVDA:
   - **Ctrl** calla a NVDA.
   - **Insert + Q** sale de NVDA.
   - **Insert + Espacio** cambia entre "modo exploración" y "modo foco". El mapa necesita modo foco; NVDA suele activarlo solo al llegar al mapa.

### Recorrido de prueba

En cada paso, anota **Sí** o **No** y escribe lo que te llamó la atención.

| # | Haz esto | Debería pasar |
|---|---|---|
| 1 | Abre la app y deja que NVDA lea. | Lee el título y "convierte datos de la Tierra de la NASA en sonido…". |
| 2 | Pulsa **Tab** hasta "Probar el sonido" y luego **Enter**. | Suena una escala ascendente de 5 segundos. |
| 3 | Tab hasta "Empezar a escuchar" y luego **Enter**. | El foco pasa al mapa y NVDA dice "Mapa del mundo: Temperatura del aire…". |
| 4 | En el mapa, pulsa las **flechas** varias veces. | En cada paso suena una nota y NVDA dice el lugar y la frase, por ejemplo "Aquí hace frío". |
| 5 | Pulsa **Enter**. | Suena el punto y NVDA dice "Marcador 1 añadido". |
| 6 | Pulsa **W**. | Dice dónde estás, la capa y el valor. |
| 7 | Pulsa **I**. | Lee el panel completo. |
| 8 | Pulsa **2**, luego **3** y luego **4**. | Cambia de capa y lo anuncia. |
| 9 | Pulsa **/**, escribe "Perú" y pulsa **Enter**. | Suenan hasta 24 puntos y al final se lee un resumen. |
| 10 | Pulsa **H**. | Se abre la lista de atajos. **Esc** la cierra y el foco vuelve al mapa. |
| 11 | Tab hasta "Empezar el recorrido" y luego **Enter**. | Una voz narra la parada 1 (Antártida) y suena. |
| 12 | Pulsa **Espacio** y luego **Espacio** otra vez. | Se pausa y se reanuda, voz incluida. |
| 13 | Tab hasta "Mi canción de la Tierra" y luego **Enter**. | Se abre la lista; cada fila dice "Marcador 1 de 1…". |
| 14 | Pulsa **V** y di "Lima" (solo en Chrome). | La app pregunta, te escucha y va a Lima. |
| 15 | Activa "Modo solo audio" y repite los pasos 4 y 6. | La app habla sola, sin depender de NVDA. Con NVDA activo puede oírse doble, y conviene anotarlo. |
| 16 | Pulsa **G**. | Se abre el globo 3D; las flechas lo giran y Enter suena el punto del centro. |

### Qué anotar

- Cualquier momento en que **no supiste dónde estabas** o **qué hacer**.
- Mensajes que se cortan, se repiten o se pisan con el sonido.
- Botones con nombres raros o que NVDA no lee.

Pásame tus notas y lo corrijo.

---

## Parte B: protocolo para probar con personas ciegas o con baja visión (Lima)

### A quién invitar

- **Solo personas adultas (18 años o más).** Las reglas del NASA Space Apps prohíben fotos, videos o audio de menores.
- Entre 3 y 5 personas bastan para encontrar la mayoría de los problemas.
- Puedes contactar asociaciones de personas ciegas, centros de rehabilitación, universidades con programas de inclusión o docentes de educación especial.

### Antes de empezar

1. Explica en dos frases qué es la app y que **se prueba la app, no a la persona**.
2. Pide permiso para tomar notas. No grabes rostros. Si grabas audio, pide permiso expreso y no lo publiques sin autorización.
3. Que cada persona use su propio lector de pantalla y teléfono o computadora, si los tiene: NVDA, JAWS, TalkBack o VoiceOver.

### Tareas (sin ayudar, salvo que la persona lo pida)

1. "Encuentra un lugar donde haga mucho frío."
2. "Busca tu país y escucha cómo suena."
3. "Compara la temperatura del Perú con la de otro país."
4. "Cambia a la capa de luces nocturnas y encuentra una ciudad con más luz que en 2012."
5. "Guarda tres lugares y reprodúcelos como canción."
6. "Haz el recorrido guiado hasta Lima."

Por cada tarea anota si la completó (sí, con ayuda o no), el tiempo aproximado y lo que dijo en voz alta.

### Preguntas finales (escala del 1 al 5)

1. ¿Qué tan fácil fue usar la app?
2. ¿Entendiste qué significaba cada sonido?
3. ¿Aprendiste algo nuevo sobre la Tierra?
4. ¿La usarías en clase o en casa?
5. ¿Qué cambiarías primero? (respuesta abierta)

### Después

- Resume los problemas por orden de gravedad: no pudo completar la tarea, completó con dificultad, molestia menor.
- Comparte el resumen, sin nombres, para corregir la app y publicar los resultados en `docs/accessibility-audit.md`.
