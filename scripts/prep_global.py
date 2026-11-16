"""Layers 5 and 6 - global views (globes already rendered by NASA with a fixed camera).

Run from the project root:  python scripts/prep_global.py

These images are perspective views, so there is no latitude/longitude and no place names:
the app works with positions on the picture only.

Forest height (Trend) - NASA SVS 4950, GEDI lidar on the ISS:
  - color bar GEDI_colorbar_0to50_01_print.jpg: 0 to 50 m (arrow = more); ticks every 10 m at
    x = 50, 137, 224, 311, 399, 486 (y = 510 row sampled).
  - each land pixel takes the height of the nearest bar color (RGB distance < 60);
    ocean (blue) and space (black) are silent. The globe is lit and heights are exaggerated,
    and gaps between ISS tracks look like low vegetation, so the app only reports a
    RELATIVE level (low / medium / tall), never meters.
  grid codes (1024x576): 0 = silent, 1..255 = 1 + relative height * 254

Lightning (Density and rhythm) - NASA SVS 5011, LIS on the ISS, 10-day windows 2017-2023:
  - yellow dots are lightning events: R > 200, G > 150, B < 120
  - density = yellow pixels within a 40-pixel radius, normalized by the 99th percentile of
    the non-zero densities.
  grid codes (1024x576): 0 = no events nearby, 1..255 = 1 + density * 254
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from download import download  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DBG = os.path.join(ROOT, "debug")
S = "https://svs.gsfc.nasa.gov/vis/a000000/"
GEDI = S + "a004900/a004950/GEDI_global.0900_print.jpg"
GEDI_BAR = S + "a004900/a004950/GEDI_colorbar_0to50_01_print.jpg"
LIS = S + "a005000/a005011/iss_lightning_preview.jpg"


def disk_sum(mask, r):
    """Number of True pixels within radius r of each pixel (no wrap)."""
    h, w = mask.shape
    m = mask.astype(np.int32)
    out = np.zeros((h, w), np.int32)
    pad = np.pad(m, r)
    for dy in range(-r, r + 1):
        span = int((r * r - dy * dy) ** 0.5)
        for dx in range(-span, span + 1):
            out += pad[r + dy:r + dy + h, r + dx:r + dx + w]
    return out


def forest():
    raw = os.path.join(ROOT, "data_raw", "forest")
    out = os.path.join(ROOT, "data", "forest")
    os.makedirs(out, exist_ok=True)
    img_p, bar_p = os.path.join(raw, "gedi_global.jpg"), os.path.join(raw, "colorbar.jpg")
    download(GEDI, img_p)
    download(GEDI_BAR, bar_p)
    bar_img = np.asarray(Image.open(bar_p).convert("RGB")).astype(np.float32)
    xs = np.arange(53, 484)
    bar = np.median(bar_img[505:516, 53:484], axis=0)  # a few rows, robust to JPEG noise
    heights = (xs - 50) / (486 - 50) * 50
    a = np.asarray(Image.open(img_p).convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    space = a.max(2) < 30
    ocean = (B > R + 15) & (B > G + 5)
    d = np.sqrt(((a[:, :, None, :] - bar[None, None, :, :]) ** 2).sum(3))
    idx = d.argmin(2)
    dist = d.min(2)
    land = ~space & ~ocean
    ok = land & (dist < 60)
    rel = np.clip(heights[idx] / 50, 0, 1)
    codes = np.zeros((h, w), np.uint8)
    codes[ok] = (1 + np.round(rel[ok] * 254)).astype(np.uint8)
    Image.fromarray(codes, "L").save(os.path.join(out, "grid.png"), optimize=True)
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(out, "view.jpg"), quality=90, optimize=True)
    stats = {"land_pixels": int(land.sum()), "matched_pct_of_land": round(float(ok.sum() / max(land.sum(), 1) * 100), 1),
             "median_rel_height": round(float(np.median(rel[ok])), 3),
             "tall_pct_of_matched": round(float((rel[ok] >= 0.5).mean() * 100), 1),
             "bar_first_rgb": bar[0].round().tolist(), "bar_last_rgb": bar[-1].round().tolist()}
    json.dump({"layer": "forest", "source_page": "https://svs.gsfc.nasa.gov/4950", "source_file": GEDI,
               "colorbar": GEDI_BAR, "width": w, "height": h, "validation": stats},
              open(os.path.join(out, "meta.json"), "w", encoding="utf-8"), indent=2)
    print("Forest:", stats)
    dbg = np.zeros((h, w, 3), np.uint8)
    g = (rel * 255).astype(np.uint8)
    dbg[ok] = np.stack([g // 3, g, g // 3], -1)[ok]
    dbg[ocean & ~space] = (10, 30, 70)
    dbg[land & ~ok] = (120, 0, 120)
    Image.fromarray(dbg).save(os.path.join(DBG, "forest_relative_height.png"))


def lightning():
    raw = os.path.join(ROOT, "data_raw", "lightning")
    out = os.path.join(ROOT, "data", "lightning")
    os.makedirs(out, exist_ok=True)
    img_p = os.path.join(raw, "lightning.jpg")
    download(LIS, img_p)
    a = np.asarray(Image.open(img_p).convert("RGB")).astype(np.int32)
    h, w, _ = a.shape
    yellow = (a[..., 0] > 200) & (a[..., 1] > 150) & (a[..., 2] < 120)
    dens = disk_sum(yellow, 40).astype(np.float32)
    nz = dens[dens > 0]
    p99 = np.percentile(nz, 99) if nz.size else 1
    norm = np.clip(dens / p99, 0, 1)
    codes = np.where(dens > 0, 1 + np.round(norm * 254), 0).astype(np.uint8)
    Image.fromarray(codes, "L").save(os.path.join(out, "grid.png"), optimize=True)
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(out, "view.jpg"), quality=90, optimize=True)
    stats = {"yellow_pixels": int(yellow.sum()), "pct_area_with_events_within_40px": round(float((dens > 0).mean() * 100), 1),
             "p99_density": float(p99)}
    json.dump({"layer": "lightning", "source_page": "https://svs.gsfc.nasa.gov/5011", "source_file": LIS,
               "window_days": 10, "years": "2017-2023", "width": w, "height": h,
               "rule": "R>200, G>150, B<120; density within 40 px", "validation": stats},
              open(os.path.join(out, "meta.json"), "w", encoding="utf-8"), indent=2)
    print("Lightning:", stats)
    dbg = (a * 0.35).astype(np.uint8)
    heat = (norm * 255).astype(np.uint8)
    m = dens > 0
    dbg[m] = np.stack([heat, heat // 2, 255 - heat], -1)[m] // 2 + dbg[m] // 2
    dbg[yellow] = (255, 255, 0)
    Image.fromarray(dbg).save(os.path.join(DBG, "lightning_density.png"))


if __name__ == "__main__":
    forest()
    lightning()
    print("Wrote data/forest/*, data/lightning/* and debug/forest_*.png, debug/lightning_*.png")
