"""Layer 2 - Night lights change 2012 -> 2023 (NASA SVS 5276, Black Marble / Suomi NPP VIIRS).

Run from the project root:  python scripts/prep_lights.py

The change dots are few and faint, so averaging pixels while shrinking would erase them.
We therefore classify at the original 7680x4320 resolution and then reduce to the
1920x1080 working grid by keeping, in every 4x4 block, the category and strength of the
STRONGEST classified pixel (max, not mean).

Classification (initial values from the brief, checked with debug images):
  more light : B - R > 15  and  (R + B)/2 - G > 10  and  brightness > 60
  less light : R - G > 20  and  G - B > 10          and  brightness > 90
  everything else = "no change detected" (silence). There is no numeric scale.
Strength (0..1) combines brightness and saturation, relative within the image.

Grid codes (data/lights/grid.png, 1920x1080, 8-bit):
  0 = no change detected, 1..127 = less light (1 + s*126), 128..255 = more light (128 + s*127)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from download import download  # noqa: E402

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data_raw", "lights")
OUT = os.path.join(ROOT, "data", "lights")
DBG = os.path.join(ROOT, "debug")
URL = "https://svs.gsfc.nasa.gov/vis/a000000/a005200/a005276/nightlights_flat_change_cb_still_8k.00700.jpg"
W8, H8 = 7680, 4320
F = 4  # reduction factor -> 1920x1080
# Legend box in the South Atlantic (1920x1080 coords x 715-1035, y 725-785), with margin, at 8k
LEGEND_8K = (700 * 4, 715 * 4, 1050 * 4, 795 * 4)


def lat_weights(h):
    lat = 90 - (np.arange(h) + 0.5) / h * 180
    return np.cos(np.radians(lat))


def main():
    os.makedirs(OUT, exist_ok=True)
    src = os.path.join(RAW, "lights_8k.jpg")
    download(URL, src)
    im = Image.open(src).convert("RGB")
    assert im.size == (W8, H8), im.size
    a = np.asarray(im).astype(np.int16)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    bright = (R + G + B) / 3.0
    mx = a.max(2)
    mn = a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

    more = (B - R > 15) & ((R + B) / 2 - G > 10) & (bright > 60)
    less = (R - G > 20) & (G - B > 10) & (bright > 90) & ~more
    x0, y0, x1, y1 = LEGEND_8K
    more[y0:y1, x0:x1] = False
    less[y0:y1, x0:x1] = False

    # strength: brightness above threshold and saturation, scaled by the 99th percentile per class
    def strength(mask, thr):
        raw = np.clip((bright - thr) / (255 - thr), 0, 1) * 0.6 + sat * 0.4
        vals = raw[mask]
        p99 = np.percentile(vals, 99) if vals.size else 1
        return np.clip(raw / max(p99, 1e-6), 0, 1)

    s_more = np.where(more, strength(more, 60), 0)
    s_less = np.where(less, strength(less, 90), 0)

    wt8 = np.broadcast_to(lat_weights(H8)[:, None], (H8, W8))
    print(f"Full resolution {W8}x{H8}: more-light pixels {more.sum():,} ({more.mean()*100:.3f} %), "
          f"less-light pixels {less.sum():,} ({less.mean()*100:.3f} %)")

    # --- max-pooling reduction keeping the strongest classified pixel -----------------
    h, w = H8 // F, W8 // F
    sm = s_more.reshape(h, F, w, F).max(axis=(1, 3))
    sl = s_less.reshape(h, F, w, F).max(axis=(1, 3))
    is_more = (sm > 0) & (sm >= sl)
    is_less = (sl > 0) & ~is_more
    codes = np.zeros((h, w), np.uint8)
    codes[is_less] = (1 + np.round(sl[is_less] * 126)).astype(np.uint8)
    codes[is_more] = (128 + np.round(sm[is_more] * 127)).astype(np.uint8)
    Image.fromarray(codes, "L").save(os.path.join(OUT, "grid.png"), optimize=True)

    wt = np.broadcast_to(lat_weights(h)[:, None], (h, w))
    # land share for context (pixels brighter than the near-black ocean)
    small = np.asarray(im.resize((w, h), Image.BOX)).astype(np.int16)
    land = small.mean(2) > 22
    stats = {
        "full_res_more_pixels": int(more.sum()), "full_res_less_pixels": int(less.sum()),
        "full_res_more_pct": round(float(more.mean() * 100), 3), "full_res_less_pct": round(float(less.mean() * 100), 3),
        "grid_more_cells": int(is_more.sum()), "grid_less_cells": int(is_less.sum()),
        "grid_more_pct": round(float(is_more.mean() * 100), 3), "grid_less_pct": round(float(is_less.mean() * 100), 3),
        "grid_more_pct_of_land_area_weighted": round(float(wt[is_more & land].sum() / wt[land].sum() * 100), 2),
        "grid_less_pct_of_land_area_weighted": round(float(wt[is_less & land].sum() / wt[land].sum() * 100), 2),
        "land_like_cells_pct": round(float(land.mean() * 100), 1),
    }
    print(f"Working grid {w}x{h}: more-light cells {stats['grid_more_cells']:,} ({stats['grid_more_pct']} %), "
          f"less-light cells {stats['grid_less_cells']:,} ({stats['grid_less_pct']} %)")
    print(f"  share of land area (cos-lat weighted): more {stats['grid_more_pct_of_land_area_weighted']} %, "
          f"less {stats['grid_less_pct_of_land_area_weighted']} %")

    # --- images for the app -------------------------------------------------------------
    im.resize((2560, 1440), Image.LANCZOS).save(os.path.join(OUT, "map.jpg"), quality=88, optimize=True)
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({
            "layer": "lights", "source_page": "https://svs.gsfc.nasa.gov/5276", "source_file": URL,
            "period": "2012 to 2023", "width": w, "height": h,
            "codes": {"none": 0, "less": [1, 127], "more": [128, 255]},
            "legend_mask_8k": LEGEND_8K, "rules": {
                "more": "B-R>15 and (R+B)/2-G>10 and brightness>60",
                "less": "R-G>20 and G-B>10 and brightness>90"},
            "validation": stats,
        }, f, indent=2)

    # --- debug images -------------------------------------------------------------------
    dbg = np.zeros((h, w, 3), np.uint8)
    dbg[land] = (28, 28, 28)
    dbg[is_more] = np.stack([150 + 105 * sm, 80 + 60 * sm, 255 + 0 * sm], -1)[is_more].clip(0, 255).astype(np.uint8)
    dbg[is_less] = np.stack([255 + 0 * sl, 120 + 60 * sl, 0 * sl], -1)[is_less].clip(0, 255).astype(np.uint8)
    Image.fromarray(dbg).save(os.path.join(DBG, "lights_classified_1920.png"))
    # full-resolution crop (Europe / North Africa) to check the classifier on the original pixels
    cy0, cy1, cx0, cx1 = 700, 1700, 3600, 5000
    crop = (a[cy0:cy1, cx0:cx1] * 0.5).astype(np.uint8)
    crop[more[cy0:cy1, cx0:cx1]] = (190, 120, 255)
    crop[less[cy0:cy1, cx0:cx1]] = (255, 150, 0)
    side = np.concatenate([a[cy0:cy1, cx0:cx1].astype(np.uint8), crop], axis=1)
    Image.fromarray(side).save(os.path.join(DBG, "lights_fullres_crop_europe.png"))
    print("Wrote data/lights/{grid.png,map.jpg,meta.json} and debug/lights_*.png")


if __name__ == "__main__":
    main()
