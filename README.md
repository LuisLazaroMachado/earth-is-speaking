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

Debug images for visual checks are written to `debug/`.
