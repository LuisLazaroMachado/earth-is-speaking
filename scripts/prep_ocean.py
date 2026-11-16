"""Layer 3 - Ocean currents (trend). NASA SVS 5479, ECCO-2 model (NASA/JPL, MIT), 2021-2023.

Run from the project root (after prep_geo.py):  python scripts/prep_ocean.py

This version colors the current lines by temperature, but no color bar is published for
it (the 0-25 degC bar of SVS 5425 matched only 17 % of pixels), so the app NEVER shows degC
or speed here. We only measure how strongly current lines stand out from the navy ocean:

 1. Extract one frame at 50 % of the video (ffprobe duration / 2).
 2. Background = median color of an open-ocean box (South Pacific).
 3. Per-pixel line strength = RGB distance from that background (warm, bright lines are farthest).
 4. "Current-line index" = 5x5 local mean of that strength over ocean pixels (about 100 km),
    so a tap between two thin lines still hears the area; normalized to 0..1 by the 99th percentile.
 5. Land (Natural Earth 50m, grown by 1 pixel) and sea ice (bright, gray) are silent.
    Date and frame-counter labels are masked.

Grid codes (data/ocean/grid.png, 2048x1024): 0 = land / ice / label (silent), 1..255 = 1 + index*254.
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from download import download  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data_raw", "ocean")
OUT = os.path.join(ROOT, "data", "ocean")
DBG = os.path.join(ROOT, "debug")
URL = "https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005479/perpetual_ocean2_EQUIREC_072_FINAL15_SOS_temperature_1024p30.mp4"
MASKS = [(0, 980, 230, 1024), (1770, 980, 2048, 1024)]  # date (bottom left), frame counter (bottom right)
BG_BOX = (150, 600, 450, 760)  # open South Pacific (x0, y0, x1, y1)


def box_mean(arr, weight, r):
    """Mean of arr over a (2r+1)^2 window, counting only weight==1 pixels. Wraps in longitude."""
    s = np.zeros_like(arr)
    n = np.zeros_like(arr)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            a = np.roll(np.roll(arr * weight, dy, 0), dx, 1)
            b = np.roll(np.roll(weight, dy, 0), dx, 1)
            s += a
            n += b
    return np.where(n > 0, s / np.maximum(n, 1), 0)


def main():
    os.makedirs(OUT, exist_ok=True)
    mp4 = os.path.join(RAW, "ocean.mp4")
    download(URL, mp4)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                         "-of", "csv=p=0", mp4]).decode().strip())
    t = dur / 2
    frame_path = os.path.join(RAW, "frame_mid.png")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", mp4, "-frames:v", "1", frame_path], check=True)
    a = np.asarray(Image.open(frame_path).convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    assert (w, h) == (2048, 1024)
    print(f"Video duration {dur:.2f} s, frame extracted at {t:.2f} s")
    Image.fromarray(a[960:1024, 0:300].astype(np.uint8)).save(os.path.join(DBG, "ocean_date_crop.png"))

    land = np.asarray(Image.open(os.path.join(ROOT, "data", "geo", "land.png"))) > 0
    grown = land.copy()
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        grown |= np.roll(np.roll(land, dy, 0), dx, 1)
    mx = a.max(2)
    mn = a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    ice = (a.mean(2) > 150) & (sat < 0.15)
    for _ in range(2):  # grow 2 px so the bright edges of ice shelves do not count as currents
        ice = ice | np.roll(ice, 1, 0) | np.roll(ice, -1, 0) | np.roll(ice, 1, 1) | np.roll(ice, -1, 1)
    label = np.zeros((h, w), bool)
    for (x0, y0, x1, y1) in MASKS:
        label[y0:y1, x0:x1] = True
    ocean = ~grown & ~ice & ~label

    x0, y0, x1, y1 = BG_BOX
    bg = np.median(a[y0:y1, x0:x1][ocean[y0:y1, x0:x1]], axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(2))
    idx = box_mean(dist, ocean.astype(np.float32), 2)
    p99 = np.percentile(idx[ocean], 99)
    idx = np.clip(idx / p99, 0, 1)

    codes = np.zeros((h, w), np.uint8)
    codes[ocean] = (1 + np.round(idx[ocean] * 254)).astype(np.uint8)
    Image.fromarray(codes, "L").save(os.path.join(OUT, "grid.png"), optimize=True)
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(OUT, "map.jpg"), quality=88, optimize=True)

    lat = 90 - (np.arange(h) + 0.5) / h * 180
    wt = np.broadcast_to(np.cos(np.radians(lat))[:, None], (h, w))
    stats = {
        "frame_time_s": round(t, 2), "background_rgb": [round(float(v), 1) for v in bg],
        "p99_raw_index": round(float(p99), 2),
        "ocean_pixels": int(ocean.sum()), "ice_pixels_over_water": int((ice & ~grown).sum()),
        "share_index_gt_0_5_area_weighted": round(float(wt[ocean & (idx > 0.5)].sum() / wt[ocean].sum() * 100), 2),
        "median_index": round(float(np.median(idx[ocean])), 3),
    }
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({"layer": "ocean", "source_page": "https://svs.gsfc.nasa.gov/5479", "source_file": URL,
                   "frame_label": "07 Jun 2023 21:31", "frame_counter": 15460, "model_years": "2021-2023",
                   "width": w, "height": h, "masks": MASKS, "validation": stats}, f, indent=2)
    for k, v in stats.items():
        print(f"  {k}: {v}")

    dbg = np.zeros((h, w, 3), np.uint8)
    g = (idx * 255).astype(np.uint8)
    dbg[ocean] = np.stack([g, g, g], -1)[ocean]
    dbg[grown] = (20, 45, 20)
    dbg[ice & ~grown] = (90, 20, 20)
    dbg[label] = (90, 90, 0)
    Image.fromarray(dbg).save(os.path.join(DBG, "ocean_intensity.png"))
    print("Wrote data/ocean/{grid.png,map.jpg,meta.json} and debug/ocean_*.png")


if __name__ == "__main__":
    main()
