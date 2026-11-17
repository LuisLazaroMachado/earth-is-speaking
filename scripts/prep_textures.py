"""Clean textures for the 3D globe (labels, dates and legends covered with neighboring colors).

Run from the project root after the layer scripts:  python scripts/prep_textures.py

The flat maps in the app keep NASA's original pictures untouched; only the globe texture is
cleaned, because a legend or a date label wrapped around a sphere would look like data.
  - air:    data/air/texture.jpg is already written by prep_air.py (logo and date boxes filled)
  - lights: legend box in the South Atlantic filled with the median color around it (dark ocean)
  - ocean:  date and frame-counter boxes (over Antarctica) filled with the row just above them
  - aero:   no labels in the picture, used as is
"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ring_median(a, x0, y0, x1, y1, pad=12):
    h, w, _ = a.shape
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)
    region = a[Y0:Y1, X0:X1].reshape(-1, 3)
    inner = np.zeros((Y1 - Y0, X1 - X0), bool)
    inner[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = True
    return np.median(region[~inner.reshape(-1)], axis=0)


def main():
    # night lights: map.jpg is the 7680x4320 picture shrunk to 2560x1440 (factor 1/3)
    p = os.path.join(ROOT, "data", "lights", "map.jpg")
    a = np.asarray(Image.open(p).convert("RGB")).astype(np.float32)
    x0, y0, x1, y1 = 2800 // 3, 2860 // 3, 4200 // 3, 3180 // 3
    a[y0:y1, x0:x1] = ring_median(a, x0, y0, x1, y1)
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(ROOT, "data", "lights", "texture.jpg"), quality=88, optimize=True)
    print(f"lights: legend box {x0},{y0}-{x1},{y1} filled")

    # ocean currents: 2048x1024, labels at the bottom over Antarctica
    p = os.path.join(ROOT, "data", "ocean", "map.jpg")
    a = np.asarray(Image.open(p).convert("RGB")).copy()
    for (x0, y0, x1, y1) in [(0, 980, 230, 1024), (1770, 980, 2048, 1024)]:
        a[y0:y1, x0:x1] = a[y0 - 1, x0:x1][None, :, :]
    Image.fromarray(a).save(os.path.join(ROOT, "data", "ocean", "texture.jpg"), quality=88, optimize=True)
    print("ocean: date and counter boxes filled")

    # aerosols: no labels
    Image.open(os.path.join(ROOT, "data", "aero", "map.jpg")).save(os.path.join(ROOT, "data", "aero", "texture.jpg"), quality=88)
    print("aero: copied")


if __name__ == "__main__":
    main()
