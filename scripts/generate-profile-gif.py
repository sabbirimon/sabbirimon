#!/usr/bin/env python3
"""Render the original pixel hero as a small, seamlessly looping GIF.

Requirements: Python 3.9+, Pillow, and rsvg-convert (from librsvg).
  python3 -m pip install Pillow
  python3 scripts/generate-profile-gif.py

The vector source remains the editable master and reduced-motion alternative.
All frame artwork is derived from it; no downloaded images or browser needed.
"""

import copy
import io
import math
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as ET

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "pixel-hero.svg"
OUTPUT = ROOT / "assets" / "pixel-hero.gif"
FRAMES = 60
FRAME_MS = 100
SVG = "{http://www.w3.org/2000/svg}"


def render_frame(original, frame_number, renderer):
    root = copy.deepcopy(original)
    progress = frame_number / FRAMES
    angle = progress * math.tau
    star_number = 0
    for node in root.iter():
        classes = node.get("class", "").split()
        if node.tag == SVG + "style":
            # Each animation is sampled explicitly below, without CSS timing.
            node.text = ""
        if "float" in classes:
            dy = round(-4 + 4 * math.cos(angle))
            node.set("transform", f"translate(0 {dy})")
        if "float-slow" in classes:
            dy = round(-4 + 4 * math.cos(angle + 2))
            node.set("transform", f"translate(0 {dy})")
        if "twinkle" in classes:
            brightness = 0.42 + 0.58 * (1 + math.sin(angle + star_number)) / 2
            node.set("opacity", f"{brightness:.2f}")
            star_number += 1
        if "cursor" in classes:
            node.set("opacity", "1" if frame_number % 20 < 10 else "0")
        # The small floating collectible catches the light without flashing.
        if node.get("d", "").startswith("M1001 201"):
            amount = (1 + math.sin(angle)) / 2
            start, end = (247, 206, 119), (255, 229, 161)
            rgb = [round(a + (b - a) * amount) for a, b in zip(start, end)]
            node.set("fill", "#" + "".join(f"{c:02x}" for c in rgb))
    data = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    png = subprocess.run(
        [renderer, "--format=png"], input=data, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=True,
    ).stdout
    return Image.open(io.BytesIO(png)).convert("RGB")


def main():
    renderer = shutil.which("rsvg-convert")
    if renderer is None:
        raise SystemExit("Install librsvg (rsvg-convert) before running this script.")
    original = ET.parse(SOURCE).getroot()
    frames = [render_frame(original, n, renderer) for n in range(FRAMES)]

    # One palette for the whole loop prevents colors from crawling between
    # frames. Disable dithering to keep the original pixel edges crisp.
    palette_sheet = Image.new("RGB", (600, 220 * 12))
    for row, frame in enumerate(frames[::5]):
        palette_sheet.paste(frame.resize((600, 220), Image.Resampling.NEAREST),
                            (0, row * 220))
    palette = palette_sheet.quantize(colors=256)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE)
               for frame in frames]
    indexed[0].save(
        OUTPUT, save_all=True, append_images=indexed[1:],
        duration=FRAME_MS, loop=0, optimize=True, disposal=1,
    )

    with Image.open(OUTPUT) as result:
        if result.n_frames < 2:
            raise RuntimeError("Expected an animated GIF, received a static image.")
        first = result.convert("RGB")
        result.seek(result.n_frames // 4)
        if ImageChops.difference(first, result.convert("RGB")).getbbox() is None:
            raise RuntimeError("Animation frames unexpectedly match.")
        frame_count = result.n_frames
    size = OUTPUT.stat().st_size
    if size > 2_000_000:
        raise RuntimeError(f"GIF exceeds the 2 MB budget: {size:,} bytes")
    print(f"{OUTPUT.name}: {frame_count} frames, {FRAMES * FRAME_MS / 1000:g}s loop, "
          f"{size:,} bytes")


if __name__ == "__main__":
    main()
