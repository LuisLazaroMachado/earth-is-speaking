"""Refresh the "Latest on Earth" air-temperature snapshot (NASA SVS 5147, updated daily by NASA).

Run from the project root on your PC:
    python scripts/refresh_latest.py
    python scripts/refresh_latest.py --label "16 Nov 2026 13:00:00 EST" --yes   (no questions)

What it does:
 1. Downloads the newest MP4 from NASA SVS 5147 and extracts the last frame.
 2. Saves the date printed on the frame to debug/air_date_crop.png and opens it, so you can
    read the date (the app always shows the date printed on the frame, never "today").
 3. Rebuilds data/air (grid, images, validation numbers) and the card images.
 4. Optionally commits and pushes the new snapshot so the website updates.
"""
import argparse
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from download import download  # noqa: E402

BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a005100/a005147/"
MP4 = "MC01_stage3_GMAO_near_surface_temperature_2048x1024_en.mp4"


def run(cmd):
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", help="date printed on the last frame, e.g. '16 Nov 2026 13:00:00 EST'")
    ap.add_argument("--yes", action="store_true", help="commit and push without asking")
    args = ap.parse_args()

    raw = os.path.join(ROOT, "data_raw", "air")
    os.makedirs(raw, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "debug"), exist_ok=True)
    mp4 = os.path.join(raw, "temp.mp4")
    download(BASE + MP4, mp4, force=True)
    download(BASE + "NearSurfaceTemperature_colorbar_plain.png", os.path.join(raw, "colorbar.png"))

    label = args.label
    if not label:
        crop = os.path.join(ROOT, "debug", "air_date_crop.png")
        frame = os.path.join(raw, "frame_last.png")
        run(["ffmpeg", "-y", "-v", "error", "-sseof", "-0.3", "-i", mp4, "-frames:v", "1", frame])
        from PIL import Image
        Image.open(frame).convert("RGB").crop((0, 900, 520, 1024)).save(crop)
        print(f"\nThe date printed on the newest frame is in: {crop}")
        if hasattr(os, "startfile"):
            os.startfile(crop)  # opens the picture on Windows
        label = input('Type that date exactly (e.g. "16 Nov 2026 13:00:00 EST"): ').strip()
        if not label:
            sys.exit("No date given; nothing changed.")

    run([sys.executable, "scripts/prep_air.py", "--label", label, "--no-download"])
    run([sys.executable, "scripts/prep_cards.py"])

    answer = "y" if args.yes else input("Commit and push the new snapshot so the website updates? [y/N] ").strip().lower()
    if answer == "y":
        run(["git", "add", "data/air", "data/cards", "debug/air_accepted.png", "debug/air_extremes.png",
             "debug/air_values.png", "debug/air_date_crop.png"])
        run(["git", "commit", "-m", f"Refresh latest air temperature snapshot: {label}"])
        run(["git", "push"])
        print("Done. GitHub Pages updates in about a minute.")
    else:
        print("Done locally. Commit and push when you are ready.")


if __name__ == "__main__":
    main()
