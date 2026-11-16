"""Background images for the layer cards: small crops of each layer's own NASA image.

Run from the project root after the layer scripts:  python scripts/prep_cards.py
Crops are given as fractions of the source image (x0, y0, x1, y1).
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "cards")

CROPS = {
    # id: (source image, crop box as fractions)
    "air": ("data/air/map.jpg", (0.42, 0.24, 0.80, 0.52)),       # Africa and the Atlantic
    "latest": ("data/air/map.jpg", (0.22, 0.38, 0.52, 0.70)),    # South America
    "lights": ("data/lights/map.jpg", (0.46, 0.20, 0.80, 0.45)),
    "ocean": ("data/ocean/map.jpg", (0.20, 0.20, 0.45, 0.45)),
    "aero": ("data/aero/map.jpg", (0.30, 0.25, 0.60, 0.50)),
    "forest": ("data/forest/view.jpg", (0.30, 0.30, 0.70, 0.60)),
    "lightning": ("data/lightning/view.jpg", (0.30, 0.35, 0.70, 0.65)),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for cid, (src, (x0, y0, x1, y1)) in CROPS.items():
        path = os.path.join(ROOT, src)
        if not os.path.exists(path):
            print(f"[skip] {cid}: {src} not found yet")
            continue
        im = Image.open(path).convert("RGB")
        w, h = im.size
        crop = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
        crop.thumbnail((480, 240))
        crop.save(os.path.join(OUT, f"{cid}.jpg"), quality=80, optimize=True)
        print(f"[ok] data/cards/{cid}.jpg {crop.size}")


if __name__ == "__main__":
    main()
