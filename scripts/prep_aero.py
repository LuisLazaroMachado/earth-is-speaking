"""Layer 4 - Aerosols (category). NASA SVS 5669, GEOS model, 19 Aug 2025 20:00 UTC.

Run from the project root:  python scripts/prep_aero.py

The four category colors are sampled from NASA's legend (Aerosols_cbar.png), not typed in.
Colors blend where aerosols overlap, so we classify by HUE:
  - silent: dark pixels (value < 50: night-side ocean), and low-saturation pixels
    (gray land, Antarctica, white city lights, white cloud-like cores);
  - each category has a hue center taken from the legend; a pixel's membership in a
    category falls linearly with hue distance (triangular weights between neighbors);
  - the strongest category is the main one; a second category is kept when its share
    of the local mix is >= 30 % (both then sound).
Intensity (0..1) is the pixel value relative to the 99th percentile: relative, no unit.
Sea salt is the hardest type to separate from the dark ocean (stated in About & methods).

Grid (data/aero/grid.png, 1920x1080, RGB, lossless):
  R = main category (0 none, 1 black carbon, 2 dust, 3 sea salt, 4 sulfate)
  G = second category (0 none, 1..4), B = intensity (1..255)
"""
import colorsys
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from download import download  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data_raw", "aero")
OUT = os.path.join(ROOT, "data", "aero")
DBG = os.path.join(ROOT, "debug")
BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005669/"
IMG = "Aerosols_2025-08-19T20_00_00_1920x1080.png"
CBAR = "Aerosols_cbar.png"
CATS = ["blackcarbon", "dust", "seasalt", "sulfate"]
SWATCH_CENTERS = {"blackcarbon": (300, 187), "dust": (597, 187), "seasalt": (898, 187), "sulfate": (1192, 187)}
V_MIN = 50
S_MIN = 0.28
S_MIN_BRIGHT = 0.12  # very bright pale pixels (dust core) may be less saturated


def hue_deg(a):
    r, g, b = a[..., 0] / 255, a[..., 1] / 255, a[..., 2] / 255
    mx = np.max(a, 2) / 255
    mn = np.min(a, 2) / 255
    d = np.where(mx - mn == 0, 1e-9, mx - mn)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    return (h * 60) % 360


def main():
    os.makedirs(OUT, exist_ok=True)
    img_path = os.path.join(RAW, "aerosols.png")
    cb_path = os.path.join(RAW, "cbar.png")
    download(BASE + IMG, img_path)
    download(BASE + CBAR, cb_path)

    cb = np.asarray(Image.open(cb_path).convert("RGB")).astype(np.float32)
    swatch = {}
    for c, (x, y) in SWATCH_CENTERS.items():
        swatch[c] = np.median(cb[y - 15:y + 15, x - 50:x + 50].reshape(-1, 3), 0)
    centers = np.array([colorsys.rgb_to_hsv(*(swatch[c] / 255))[0] * 360 for c in CATS])
    print("Legend colors:", {c: swatch[c].astype(int).tolist() for c in CATS})
    print("Hue centers (deg):", dict(zip(CATS, centers.round(1).tolist())))

    a = np.asarray(Image.open(img_path).convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    assert (w, h) == (1920, 1080)
    V = a.max(2)
    S = (V - a.min(2)) / np.maximum(V, 1)
    H = hue_deg(a)
    valid = (V >= V_MIN) & ((S >= S_MIN) | ((V >= 150) & (S >= S_MIN_BRIGHT) & ((H > 230) | (H < 25))))

    # Calibration: the legend's sea-salt swatch is gray-cyan, but NASA's page says sea salt is
    # drawn as BLUE swirls. Use the median hue of the Southern Ocean swirls (where sea salt is the
    # only plausible type) as the sea-salt hue center.
    legend_centers = centers.copy()
    so = valid[780:950, 100:700]
    centers[CATS.index("seasalt")] = float(np.median(H[780:950, 100:700][so]))
    print(f"Sea-salt hue center: legend {legend_centers[2]:.1f} deg -> calibrated on Southern Ocean swirls {centers[2]:.1f} deg")

    # triangular hue memberships, width = distance to the neighboring centers (circular)
    order = np.argsort(centers)
    cs = centers[order]
    weights = np.zeros((h, w, 4), np.float32)
    for k in range(4):
        c = cs[k]
        left = cs[k - 1] - (360 if k == 0 else 0)
        right = cs[(k + 1) % 4] + (360 if k == 3 else 0)
        d = (H - c + 540) % 360 - 180  # signed hue difference in [-180, 180)
        wl = np.clip(1 + d / (c - left), 0, 1)
        wr = np.clip(1 - d / (right - c), 0, 1)
        weights[..., order[k]] = np.where(d < 0, wl, wr)
    total = weights.sum(2, keepdims=True)
    share = np.where(total > 0, weights / np.maximum(total, 1e-9), 0)
    main_i = share.argmax(2)
    srt = np.sort(share, 2)
    second_share = srt[..., -2]
    second_i = np.argsort(share, 2)[..., -2]

    p99 = np.percentile(V[valid], 99)
    inten = np.clip((V - V_MIN) / max(p99 - V_MIN, 1), 0, 1)

    R = np.where(valid, main_i + 1, 0).astype(np.uint8)
    G = np.where(valid & (second_share >= 0.3), second_i + 1, 0).astype(np.uint8)
    B = np.where(valid, 1 + np.round(inten * 254), 0).astype(np.uint8)
    Image.fromarray(np.stack([R, G, B], -1), "RGB").save(os.path.join(OUT, "grid.png"), optimize=True)
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(OUT, "map.jpg"), quality=88, optimize=True)

    lat = 90 - (np.arange(h) + 0.5) / h * 180
    wt = np.broadcast_to(np.cos(np.radians(lat))[:, None], (h, w))
    stats = {"legend_rgb": {c: swatch[c].astype(int).tolist() for c in CATS},
             "hue_centers_deg": dict(zip(CATS, centers.round(1).tolist())),
             "legend_hue_centers_deg": dict(zip(CATS, legend_centers.round(1).tolist())),
             "classified_pct_area_weighted": round(float(wt[valid].sum() / wt.sum() * 100), 1),
             "mixed_pct_of_classified": round(float((G > 0).sum() / max(valid.sum(), 1) * 100), 1)}
    for i, c in enumerate(CATS):
        stats[f"{c}_pct_of_classified_area"] = round(float(wt[R == i + 1].sum() / wt[valid].sum() * 100), 1)
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({"layer": "aero", "source_page": "https://svs.gsfc.nasa.gov/5669", "source_file": BASE + IMG,
                   "date_label": "19 Aug 2025, 20:00 UTC", "categories": CATS, "width": w, "height": h,
                   "thresholds": {"value_min": V_MIN, "sat_min": S_MIN, "mix_share_min": 0.3},
                   "validation": stats}, f, indent=2)
    for k, v in stats.items():
        print(f"  {k}: {v}")

    # debug: main category in legend colors, brightness = intensity; mixed pixels outlined in a 2nd image
    dbg = np.zeros((h, w, 3), np.float32)
    for i, c in enumerate(CATS):
        m = R == i + 1
        dbg[m] = swatch[c] * (0.35 + 0.65 * inten[m, None])
    Image.fromarray(dbg.clip(0, 255).astype(np.uint8)).save(os.path.join(DBG, "aero_classified.png"))
    mix = (a * 0.3).astype(np.uint8)
    mix[G > 0] = (255, 255, 255)
    Image.fromarray(mix).save(os.path.join(DBG, "aero_mixed_pixels.png"))
    print("Wrote data/aero/{grid.png,map.jpg,meta.json} and debug/aero_*.png")


if __name__ == "__main__":
    main()
