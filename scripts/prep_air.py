"""Layer 1 - Air temperature (NASA SVS 5147, GEOS-FP near-surface temperature).

Run from the project root:
    python scripts/prep_air.py --label "15 Nov 2026 13:00:00 EST"

The --label is the date printed on the last video frame. The script saves that part of
the frame to debug/air_date_crop.png so you can read it; if the label you pass does not
match, re-run with the right one. (A future refresh script reads it automatically.)

Steps
 1. Download the daily-updated MP4 and the official colorbar from NASA SVS.
 2. Extract the last frame with ffmpeg (2048x1024, equirectangular, whole world).
 3. Build a color -> temperature lookup table from row y=95 of the colorbar.
    The tick marks (every 10 degC) sit at x = 72.5 + k*48.875, so
    T = -40 + (x - 72.5) / 48.875 * 10   for the bar pixels x = 73..462.
 4. Match every frame pixel to the closest bar color (Euclidean RGB).
    Accepted if distance < 20, otherwise "no data" (silent).
 5. Scale ends are reported honestly, never as an invented number:
      - bottom: pixels matching T <= -39.5, or darker than the bar's first color
        (a synthetic ramp toward deep navy, used only to flag "-40 degC or colder")
      - top: pixels matching T >= 39.5 ("40 degC or more")
 6. Write data/air/grid.png (8-bit codes, 2048x1024, lossless), map + clean texture
    images, meta.json, and debug images.

Grid codes: 0 = no data, 1 = bottom of scale (<= -40), 2..162 = -40..+40 degC in 0.5 steps
            (code = 2 + round((T + 40) * 2)), 255 = top of scale (>= 40).
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from download import download  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data_raw", "air")
OUT = os.path.join(ROOT, "data", "air")
DBG = os.path.join(ROOT, "debug")
BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005147/"
MP4 = "MC01_stage3_GMAO_near_surface_temperature_2048x1024_en.mp4"
CBAR = "NearSurfaceTemperature_colorbar_plain.png"

# Label boxes burned into the frame (2048x1024). Confirmed with debug/air_masks.png.
MASKS = [(0, 0, 356, 78), (0, 918, 504, 1024)]  # (x0, y0, x1, y1), x1/y1 exclusive
ACCEPT_DIST = 20.0


def lat_weights(h):
    lat = 90 - (np.arange(h) + 0.5) / h * 180
    return np.cos(np.radians(lat))


def nearest(pixels, lut, chunk=200_000):
    """Return (index, distance) of the closest LUT color for each pixel."""
    idx = np.empty(len(pixels), np.int32)
    dist = np.empty(len(pixels), np.float32)
    lut_f = lut.astype(np.float32)
    lut_sq = (lut_f ** 2).sum(1)
    for s in range(0, len(pixels), chunk):
        p = pixels[s:s + chunk].astype(np.float32)
        d2 = (p ** 2).sum(1)[:, None] - 2 * p @ lut_f.T + lut_sq[None, :]
        i = d2.argmin(1)
        idx[s:s + chunk] = i
        dist[s:s + chunk] = np.sqrt(np.maximum(d2[np.arange(len(i)), i], 0))
    return idx, dist


def inpaint_boxes(img, boxes):
    """Fill label boxes with a blend of the nearest outside pixels (for the 3D globe texture)."""
    a = img.astype(np.float32)
    h, w, _ = a.shape
    for (x0, y0, x1, y1) in boxes:
        # vertical source: the row just outside the box (below if the box touches the top)
        vy = y1 if y0 == 0 else y0 - 1
        hx = x1  # both boxes touch the left edge, so use the column to the right
        hd = np.abs(np.arange(x0, x1) - hx)
        wh = 1.0 / (hd + 1)[:, None]
        v = a[vy, x0:x1].copy()
        for y in range(y0, min(y1, h)):
            wv = 1.0 / (abs(y - vy) + 1)
            a[y, x0:x1] = (v * wv + a[y, hx][None, :] * wh) / (wv + wh)
    return a.clip(0, 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", required=True, help='Date printed on the frame, e.g. "15 Nov 2026 13:00:00 EST"')
    ap.add_argument("--no-download", action="store_true")
    args = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(DBG, exist_ok=True)

    mp4 = os.path.join(RAW, "temp.mp4")
    cbar_path = os.path.join(RAW, "colorbar.png")
    last_mod = None
    if not args.no_download:
        download(BASE + CBAR, cbar_path)
        last_mod = download(BASE + MP4, mp4)

    frame_path = os.path.join(RAW, "frame_last.png")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-sseof", "-0.3", "-i", mp4,
                    "-frames:v", "1", frame_path], check=True)
    frame = np.array(Image.open(frame_path).convert("RGB"))
    h, w, _ = frame.shape
    assert (w, h) == (2048, 1024), f"unexpected frame size {w}x{h}"
    print(f"Frame: {w}x{h}")
    Image.fromarray(frame[900:1024, 0:520]).save(os.path.join(DBG, "air_date_crop.png"))

    # --- color table from the colorbar -----------------------------------------------
    cb = np.array(Image.open(cbar_path).convert("RGB")).astype(np.int32)
    xs = np.arange(73, 463)
    bar = cb[95, 73:463]
    temps = -40 + (xs - 72.5) / 48.875 * 10
    print(f"Colorbar: {len(bar)} colors, {temps[0]:.2f} .. {temps[-1]:.2f} degC, "
          f"first {bar[0].tolist()} last {bar[-1].tolist()}")

    # synthetic cold extension: from the darkest bar navy toward deep navy, flag-only
    darkest = bar[:4].mean(0)
    ext = np.array([darkest + (np.array([0, 10, 62]) - darkest) * t for t in np.linspace(0.1, 1, 12)])
    lut = np.vstack([bar, ext]).round().astype(np.int32)
    n_bar = len(bar)

    # --- per-pixel match -------------------------------------------------------------
    px = frame.reshape(-1, 3)
    idx, dist = nearest(px, lut)
    idx = idx.reshape(h, w)
    dist = dist.reshape(h, w)

    mask = np.zeros((h, w), bool)
    for (x0, y0, x1, y1) in MASKS:
        mask[y0:y1, x0:x1] = True
    valid = ~mask
    accepted = valid & (dist < ACCEPT_DIST)
    in_bar = idx < n_bar
    t_map = np.where(in_bar, temps[np.minimum(idx, n_bar - 1)], -99.0)
    bottom = accepted & ((~in_bar) | (t_map <= -39.5))
    top = accepted & in_bar & (t_map >= 39.5)
    normal = accepted & ~bottom & ~top

    codes = np.zeros((h, w), np.uint8)
    codes[normal] = (2 + np.round((t_map[normal] + 40) * 2)).astype(np.uint8)
    codes[bottom] = 1
    codes[top] = 255
    Image.fromarray(codes, "L").save(os.path.join(OUT, "grid.png"), optimize=True)

    # --- statistics ------------------------------------------------------------------
    n_valid = valid.sum()
    wts = np.broadcast_to(lat_weights(h)[:, None], (h, w))
    stats = {
        "pixels_outside_label_boxes": int(n_valid),
        "share_dist_lt_10": round(float((dist[valid] < 10).mean()) * 100, 1),
        "share_dist_lt_20": round(float((dist[valid] < 20).mean()) * 100, 1),
        "share_accepted": round(float(accepted.sum() / n_valid) * 100, 1),
        "share_accepted_area_weighted": round(float(wts[accepted].sum() / wts[valid].sum()) * 100, 1),
        "bottom_of_scale_pixels": int(bottom.sum()),
        "bottom_from_cold_extension_pixels": int((accepted & ~in_bar).sum()),
        "top_of_scale_pixels": int(top.sum()),
    }
    lat_rows = 90 - (np.nonzero(bottom)[0] + 0.5) / h * 180
    stats["bottom_of_scale_lat_range"] = [round(float(lat_rows.min()), 1), round(float(lat_rows.max()), 1)] if len(lat_rows) else None
    hot_rows = 90 - (np.nonzero(top | (normal & (t_map >= 37)))[0] + 0.5) / h * 180
    stats["gray_ramp_ge37C_lat_range"] = [round(float(hot_rows.min()), 1), round(float(hot_rows.max()), 1)] if len(hot_rows) else None
    stats["gray_ramp_ge37C_pixels"] = int((normal & (t_map >= 37)).sum() + top.sum())
    tv = t_map[normal]
    stats["value_range_degC"] = [round(float(tv.min()), 1), round(float(tv.max()), 1)]

    # gray hot-end check: neutral gray pixels in the tropics vs. the bar's gray ramp
    trop = np.zeros((h, w), bool)
    trop[256:768] = True
    rgb = frame.astype(np.int32)
    neutral = trop & valid & ((rgb.max(2) - rgb.min(2)) < 20) & (rgb.max(2) > 60)
    if neutral.any():
        stats["tropical_gray_pixels"] = int(neutral.sum())
        stats["tropical_gray_median_rgb"] = np.median(rgb[neutral], 0).tolist()
        stats["tropical_gray_median_match_degC"] = round(float(np.median(t_map[neutral & accepted])), 1)
        stats["tropical_gray_median_dist"] = round(float(np.median(dist[neutral])), 1)
    # cold check: very dark navy pixels (colder than the bar start)
    ant = valid.copy()
    ant[: int(h * 0.75)] = False
    dark = ant & (rgb.sum(2) < 170)
    if dark.any():
        stats["polar_dark_pixels"] = int(dark.sum())
        stats["polar_dark_median_rgb"] = np.median(rgb[dark], 0).tolist()
        stats["polar_dark_dist_to_bar_first_median"] = round(float(np.median(np.sqrt(((rgb[dark] - bar[0]) ** 2).sum(1)))), 1)

    for k, v in stats.items():
        print(f"  {k}: {v}")

    # --- images for the app ----------------------------------------------------------
    Image.fromarray(frame).save(os.path.join(OUT, "map.jpg"), quality=90, optimize=True)
    clean = inpaint_boxes(frame, MASKS)
    Image.fromarray(clean).save(os.path.join(OUT, "texture.jpg"), quality=90, optimize=True)
    lut_out = [{"code": int(2 + round((t + 40) * 2)), "t": round(float(t), 1)} for t in np.arange(-40, 40.5, 0.5)]
    meta = {
        "layer": "air",
        "frame_label": args.label,
        "source_page": "https://svs.gsfc.nasa.gov/5147",
        "source_file": BASE + MP4,
        "source_last_modified": last_mod,
        "width": w, "height": h,
        "scale_min": -40, "scale_max": 40,
        "codes": {"no_data": 0, "bottom": 1, "top": 255, "first_value_code": 2, "step_degC": 0.5},
        "masks": MASKS,
        "accept_distance": ACCEPT_DIST,
        "validation": stats,
        "lut_example": lut_out[::20],
    }
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # --- debug images ----------------------------------------------------------------
    dbg = frame.copy()
    dbg[valid & ~accepted] = (255, 0, 255)
    dbg[mask] = (dbg[mask] * 0.25).astype(np.uint8)
    im = Image.fromarray(dbg)
    d = ImageDraw.Draw(im)
    for (x0, y0, x1, y1) in MASKS:
        d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(255, 255, 0), width=3)
    im.save(os.path.join(DBG, "air_accepted.png"))

    ext_img = (frame * 0.35).astype(np.uint8)
    ext_img[bottom] = (0, 255, 255)
    ext_img[top] = (255, 255, 0)
    ext_img[normal & (t_map >= 37) & ~top] = (255, 140, 0)
    Image.fromarray(ext_img).save(os.path.join(DBG, "air_extremes.png"))

    val = np.zeros((h, w, 3), np.uint8)
    g = np.clip((t_map + 40) / 80 * 255, 0, 255).astype(np.uint8)
    val[normal] = np.stack([g, g, g], -1)[normal]
    val[bottom] = (0, 120, 255)
    val[top] = (255, 60, 0)
    Image.fromarray(val).save(os.path.join(DBG, "air_values.png"))
    print("Wrote data/air/{grid.png,map.jpg,texture.jpg,meta.json} and debug/air_*.png")


if __name__ == "__main__":
    main()
