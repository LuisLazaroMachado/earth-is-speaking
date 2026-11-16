"""Borders, land and coastal waters from Natural Earth 1:50m (public domain).

Run from the project root:  python scripts/prep_geo.py

Outputs (all on the same 2048x1024 equirectangular grid as layers 1 and 3):
  data/geo/countries.png  8-bit country id per pixel (0 = none). Countries are drawn
                          largest first so small ones keep their pixels; every country
                          gets at least the pixel of its label point.
  data/geo/land.png       255 = land (Natural Earth land polygons, lakes as holes), 0 = water
  data/geo/coast.png      for ocean pixels within 15 pixels (~300 km) of a country:
                          the id of the nearest country (coastal waters), else 0
  data/geo/countries.json id, ISO code, English and Spanish names, label point, bbox, pixels
  data/geo/outlines.json  simplified outlines (Douglas-Peucker, 0.02 deg) for the silhouette
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from download import download  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data_raw", "ne")
OUT = os.path.join(ROOT, "data", "geo")
DBG = os.path.join(ROOT, "debug")
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
W, H = 2048, 1024
COAST_PX = 15

# Spanish names completed or adjusted by hand (Natural Earth NAME_ES is used otherwise)
ES_OVERRIDES = {"TWN": "Taiwán", "CYN": "Chipre del Norte", "SOL": "Somalilandia"}
EN_OVERRIDES = {"CYN": "Northern Cyprus"}


def to_px(lon, lat):
    return ((lon + 180) / 360 * W, (90 - lat) / 180 * H)


def polys_of(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    return geom["coordinates"]


def ring_area(ring):
    a = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def rdp(points, eps):
    """Douglas-Peucker simplification (iterative)."""
    if len(points) < 4:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        s, e = stack.pop()
        (x1, y1), (x2, y2) = points[s], points[e]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy)
        best, idx = 0.0, -1
        for i in range(s + 1, e):
            x0, y0 = points[i]
            if norm < 1e-9:  # closed ring: first == last, use distance to that point
                d = math.hypot(x0 - x1, y0 - y1)
            else:
                d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm
            if d > best:
                best, idx = d, i
        if best > eps and idx > 0:
            keep[idx] = True
            stack += [(s, idx), (idx, e)]
    return [p for p, k in zip(points, keep) if k]


def raster_polygons(features_polys, fill_values, size=(W, H)):
    img = Image.new("L", size, 0)
    d = ImageDraw.Draw(img)
    for polys, val in zip(features_polys, fill_values):
        for poly in polys:
            ext = [to_px(*p) for p in poly[0]]
            if len(ext) >= 3:
                d.polygon(ext, fill=val, outline=val)
            for hole in poly[1:]:
                hp = [to_px(*p) for p in hole]
                if len(hp) >= 3:
                    d.polygon(hp, fill=0)
    return np.array(img)


def main():
    os.makedirs(OUT, exist_ok=True)
    cpath = os.path.join(RAW, "countries50.geojson")
    lpath = os.path.join(RAW, "land50.geojson")
    download(NE + "ne_50m_admin_0_countries.geojson", cpath)
    download(NE + "ne_50m_land.geojson", lpath)
    countries = json.load(open(cpath, encoding="utf-8"))["features"]
    land_f = json.load(open(lpath, encoding="utf-8"))["features"]
    assert len(countries) < 255

    # --- land -----------------------------------------------------------------------
    land = raster_polygons([polys_of(f["geometry"]) for f in land_f], [255] * len(land_f))

    # --- countries ------------------------------------------------------------------
    info = []
    for i, f in enumerate(countries):
        p = f["properties"]
        polys = polys_of(f["geometry"])
        area = sum(ring_area(poly[0]) for poly in polys)
        a3 = p["ADM0_A3"]
        lons = [c[0] for poly in polys for c in poly[0]]
        lats = [c[1] for poly in polys for c in poly[0]]
        info.append({
            "id": i + 1, "a3": a3, "iso": p["ISO_A3"] if p["ISO_A3"] != "-99" else a3,
            "en": EN_OVERRIDES.get(a3, p["NAME_EN"] or p["NAME"]),
            "es": ES_OVERRIDES.get(a3, p["NAME_ES"] or p["NAME"]),
            "lx": round(p["LABEL_X"], 3), "ly": round(p["LABEL_Y"], 3),
            "bbox": [round(min(lons), 2), round(min(lats), 2), round(max(lons), 2), round(max(lats), 2)],
            "cont": p["CONTINENT"], "_area": area, "_polys": polys,
        })
    order = sorted(info, key=lambda c: -c["_area"])
    labels = raster_polygons([c["_polys"] for c in order], [c["id"] for c in order])
    for c in info:
        n = int((labels == c["id"]).sum())
        if n == 0:
            x, y = to_px(c["lx"], c["ly"])
            labels[min(H - 1, int(y)), int(x) % W] = c["id"]
            n = 1
        c["px"] = n

    # --- coastal waters: ocean pixels within COAST_PX of a country --------------------
    ocean = land == 0
    coast = np.zeros((H, W), np.uint8)
    frontier = np.where(ocean, 0, labels).astype(np.uint8)  # countries' pixels as seeds
    for step in range(COAST_PX):
        grown = frontier.copy()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            sh = np.roll(frontier, dx, axis=1)
            sh = np.roll(sh, dy, axis=0)
            if dy == 1:
                sh[0, :] = 0
            if dy == -1:
                sh[-1, :] = 0
            take = (grown == 0) & (sh > 0) & ocean
            grown[take] = sh[take]
        frontier = grown
    coast[ocean] = frontier[ocean]

    coast_px = {int(k): int(v) for k, v in zip(*np.unique(coast[coast > 0], return_counts=True))}
    for c in info:
        c["coast_px"] = coast_px.get(c["id"], 0)

    Image.fromarray(labels, "L").save(os.path.join(OUT, "countries.png"), optimize=True)
    Image.fromarray(land, "L").save(os.path.join(OUT, "land.png"), optimize=True)
    Image.fromarray(coast, "L").save(os.path.join(OUT, "coast.png"), optimize=True)

    # --- outlines (simplified) -------------------------------------------------------
    outlines = {}
    npts = 0
    for c in info:
        polys_out = []
        for poly in c["_polys"]:
            ext = rdp([tuple(pt) for pt in poly[0]], 0.02)
            if len(ext) < 4 and c["px"] > 30:
                continue  # drop specks of large countries; keep everything for tiny ones
            polys_out.append([[[round(x, 2), round(y, 2)] for x, y in ext]])
            npts += len(ext)
        outlines[c["id"]] = {"type": "MultiPolygon", "coordinates": polys_out}
    with open(os.path.join(OUT, "outlines.json"), "w", encoding="utf-8") as f:
        json.dump(outlines, f, separators=(",", ":"))
    out_info = [{k: v for k, v in c.items() if not k.startswith("_")} for c in info]
    with open(os.path.join(OUT, "countries.json"), "w", encoding="utf-8") as f:
        json.dump(out_info, f, ensure_ascii=False, separators=(",", ":"))

    tiny = [c["en"] for c in info if c["px"] <= 2]
    landlocked = [c["en"] for c in info if c["coast_px"] == 0]
    print(f"Countries: {len(info)}; land pixels {int((land > 0).sum()):,}; outline points {npts:,}")
    print(f"Countries with <= 2 pixels (about 20 km or less): {len(tiny)}: {', '.join(tiny)}")
    print(f"Countries with no coastal water pixels: {len(landlocked)}")
    peru = next(c for c in info if c["a3"] == "PER")
    print(f"Peru: {peru['px']} pixels, {peru['coast_px']} coastal-water pixels, ES name: {peru['es']}")

    # --- debug -----------------------------------------------------------------------
    rng = np.random.default_rng(3)
    pal = rng.integers(60, 255, (256, 3)).astype(np.uint8)
    pal[0] = (10, 20, 50)
    dbg = pal[labels]
    dbg[ocean & (labels == 0)] = (10, 20, 50)
    cm = coast > 0
    dbg[cm] = (pal[coast][cm] * 0.45).astype(np.uint8)
    Image.fromarray(dbg).save(os.path.join(DBG, "geo_countries_coast.png"))
    print("Wrote data/geo/* and debug/geo_countries_coast.png")


if __name__ == "__main__":
    main()
