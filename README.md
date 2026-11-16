# Earth Is Speaking

**Listen to our planet.** Touch the Earth. Hear what it says.

An accessible web app that turns NASA Earth data into sound, designed first for blind and low-vision people.
Independent project for the NASA Space Apps Challenge 2026 ("The Earth Information Jukebox").

_Work in progress._

## Run locally

The app is a static site (ES modules), so it needs a local web server:

```powershell
cd <project folder>
python -m http.server 8000
```

Then open http://localhost:8000

## Data preparation

All NASA images are processed offline by the scripts in `scripts/` and the results are
stored in `data/`. The browser never reads NASA files directly.

| Layer | Script | Source |
|---|---|---|
| Air temperature | `python scripts/prep_air.py --label "<date printed on the last frame>"` | NASA SVS 5147 (GEOS-FP, GMAO) |
| Borders, land, coastal waters | `python scripts/prep_geo.py` | Natural Earth 1:50m (public domain) |
| Night lights change 2012-2023 | `python scripts/prep_lights.py` | NASA SVS 5276 (Black Marble, Suomi NPP VIIRS) |
| Ocean currents (trend) | `python scripts/prep_ocean.py` (after prep_geo) | NASA SVS 5479 (ECCO-2, NASA/JPL, MIT) |
| Aerosols | `python scripts/prep_aero.py` | NASA SVS 5669 (GEOS, GMAO) |
| Forest height + Lightning (global views) | `python scripts/prep_global.py` | NASA SVS 4950 (GEDI), SVS 5011 (ISS LIS) |
| Card images | `python scripts/prep_cards.py` | crops of the layer images |

Debug images for visual checks are written to `debug/`. Validation numbers for each layer are
stored in `data/<layer>/meta.json` and shown in the app's About & methods dialog.

## Tests

`tools/` holds a headless Microsoft Edge runner (puppeteer-core) and scenario scripts, including
axe-core accessibility checks: `cd tools && npm install`, then `node tools/run.mjs tools/scenarios/stage3.mjs`.
