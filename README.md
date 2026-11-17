# Earth Is Speaking

**Listen to our planet.** Touch the Earth. Hear what it says.

Earth Is Speaking is an accessible web app that turns NASA Earth data into sound. It was designed first for blind and low-vision people, and it is meant for everyone. It is an independent project for the NASA Space Apps Challenge 2026, challenge "The Earth Information Jukebox", by the team *Houston! We have a playlist* (Lima, Peru).

- **Live app:** https://luislazaromachado.github.io/earth-is-speaking/
- **Demo (7 slides):** https://luislazaromachado.github.io/earth-is-speaking/demo/

## What it does

You touch a map or a 3D pixel globe, use the arrow keys, or say a place, and you hear that point. Each point also gets a simple sentence and a checked "Did you know?" fact. The sound is generated in the browser in real time from fixed rules: color, then value, then note.

| Layer | NASA source | Data type | How it sounds |
|---|---|---|---|
| Air temperature | SVS 5147, GEOS-FP (GMAO) | Measured (approx.) | cold = low, hot = high (pentatonic C3–C6) |
| Night lights 2012→2023 | SVS 5276, Black Marble (Suomi NPP VIIRS) | Trend | rising interval = more light, falling = less |
| Ocean currents (trend) | SVS 5479, ECCO-2 (NASA/JPL, MIT) | Trend | pad; brighter lines = louder, brighter |
| Aerosols | SVS 5669, GEOS | Category | one instrument per particle type |
| Forest height | SVS 4950, GEDI lidar on the ISS | Trend (global view) | low hum → high bell |
| Lightning | SVS 5011, LIS on the ISS | Density and rhythm (global view) | 1–8 drum hits per second |

Other features:

- **Places:** search 242 countries and 90+ cities and areas in English or Spanish. For each country you hear up to 24 points spread evenly by area, then a summary. All country statistics are weighted by cos(latitude).
- **Compare:** two countries side by side.
- **Guided journey:** 8 narrated stops, from Antarctica to Lima.
- **My Earth Song:** a playlist of up to 100 markers, which you can share as a link or download as WAV with a credits file.
- **Sound postcards:** you send a place, and the person who receives it can answer with their own.
- **Accessibility:** voice search and commands (Chrome), audio-only mode, full keyboard support, screen readers, visual sound pulse, vibration on Android.

There are no accounts, no server and no tracking.

## Honesty rules

The app never shows a number or a claim that the data does not support:

- Temperatures are approximate, and the ends of the scale are reported as "−40 °C or colder" and "40 °C or more".
- Night lights and ocean currents are trends, never measurements.
- One pixel is about 20 km, and the app never claims more precision than that.
- Model dates are the dates printed on the NASA frames; the app never says "today".

The methods, the validation numbers and the limits are all listed in the in-app **About & methods** dialog.

## Run locally

The app is a static site (HTML, CSS and JavaScript ES modules), so it needs a local web server:

```powershell
cd <project folder>
python -m http.server 8000
```

Then open http://localhost:8000.

## Publish on GitHub Pages (step by step)

1. Push this repository to GitHub. The site needs no build step.
2. On GitHub, open the repository → **Settings** → **Pages**.
3. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. Wait about one minute. The site will be at `https://<user>.github.io/<repository>/`.
5. Optional: if a school or event network blocks a newly published site, you can ask FortiGuard to classify it at https://www.fortiguard.com/faq/wfratingsubmit (category "Web-based applications", company "N/A"). Domains on `github.io` are usually already classified.

## Data preparation

All NASA images are processed offline by the scripts in `scripts/` (Python 3 with NumPy and Pillow, plus FFmpeg), and the results are stored in `data/`. The browser never reads NASA files directly. Run the scripts from the project root:

| Step | Script | Source |
|---|---|---|
| Air temperature | `python scripts/prep_air.py --label "<date printed on the last frame>"` | NASA SVS 5147 |
| Borders, land, coastal waters | `python scripts/prep_geo.py` | Natural Earth 1:50m (public domain) |
| Night lights | `python scripts/prep_lights.py` | NASA SVS 5276 |
| Ocean currents | `python scripts/prep_ocean.py` (after prep_geo) | NASA SVS 5479 |
| Aerosols | `python scripts/prep_aero.py` | NASA SVS 5669 |
| Forest height and lightning | `python scripts/prep_global.py` | NASA SVS 4950, SVS 5011 |
| Clean textures for the 3D globe | `python scripts/prep_textures.py` | layer images with labels covered |
| Card images | `python scripts/prep_cards.py` | crops of the layer images |

To **refresh the "Latest on Earth" snapshot** (NASA updates it daily), run `python scripts/refresh_latest.py`. It downloads the newest frame, shows you the date printed on it, rebuilds the data, and can commit and push the result.

Debug images for visual checks are written to `debug/`. The validation numbers for each layer are in `data/<layer>/meta.json`.

## Project structure

```
index.html            app shell (welcome, explorer, dialogs)
css/styles.css        styles (NASA-inspired palette, responsive, reduced motion)
js/main.js            app wiring: panel, controls, places, journey, voice, options
js/core/              audio engine, instruments, layers, grids, geography, statistics, speech
js/views/             flat map, 3D globe (Three.js), view hub
js/song.js            My Earth Song, share links, postcards, WAV export
js/voice.js           voice questions and commands
js/content.js         texts per layer (EN/ES) and verified facts
js/i18n.js            interface texts (EN/ES)
js/vendor/            Three.js r160 (MIT)
data/                 processed NASA data, images and borders
scripts/              data-preparation scripts (Python)
docs/                 facts and sources, accessibility report, NVDA and user test guide
tools/                headless tests (Edge + Puppeteer + axe-core + Lighthouse)
demo/                 the 7-slide demo submitted to Space Apps
```

## Documentation

- [Verified facts and sources](docs/facts.md)
- [Accessibility report](docs/accessibility-audit.md): axe-core on 38 states with 0 violations, Lighthouse accessibility 100, contrast measured on the real background.
- [NVDA and user test guide](docs/guia-prueba-nvda.md) (Spanish)

## Tests

```
cd tools && npm install && cd ..
node tools/run.mjs tools/scenarios/stage3.mjs     # any scenario in tools/scenarios
node tools/run.mjs tools/scenarios/audit.mjs      # axe-core accessibility audit
node tools/lighthouse.mjs                         # Lighthouse
```

## Use of AI

The code, the data-preparation scripts, the interface texts and the demo slides were written with the help of an AI assistant (Claude, by Anthropic). The team directed, checked and tested that work. The sound itself follows fixed rules, not AI. No image, audio or data in the app was generated by AI.

## License

The code, scripts and documentation of Earth Is Speaking are released under the
[MIT License](LICENSE). This license does not cover third-party content. The NASA images and data keep
their own terms (NASA asks to be credited, for example "NASA's Scientific Visualization Studio").
Natural Earth data is in the public domain, and Three.js is distributed under its own MIT license
(`js/vendor/three.LICENSE.txt`).

## Credits

- NASA Scientific Visualization Studio, and the visualizers and scientists credited on each layer.
- NASA Global Modeling and Assimilation Office (GMAO).
- ECCO (NASA/JPL, MIT).
- Black Marble (Suomi NPP VIIRS).
- GEDI.
- ISS LIS (NASA GHRC DAAC).
- NASA Earth Observatory.
- Natural Earth (public domain).
- INEI Peru (2017 Census).
- NOAA Ocean Service.
- Three.js (MIT).

Earth Is Speaking is not endorsed by NASA.
