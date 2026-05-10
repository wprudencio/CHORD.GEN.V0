#!/usr/bin/env python3
"""Generate favicon assets from the SVG icon."""

import os
from PIL import Image
import subprocess

BASE = os.path.dirname(__file__)
PUBLIC = os.path.join(BASE, "..", "public")
SVG = os.path.join(PUBLIC, "icon.svg")

# Generate dark PNGs at various sizes using ImageMagick
sizes = [16, 32, 48, 64, 128, 192, 512]

# Generate from SVG (defaults to dark background since prefers-color-scheme: dark is default)
for size in sizes:
    out = os.path.join(PUBLIC, f"icon-{size}x{size}.png")
    subprocess.run(
        ["convert", "-background", "none", "-density", "300", "-resize", f"{size}x{size}", SVG, out],
        check=True,
    )
    print(f"Generated {out}")

# Also create light mode versions (invert the SVG's media query behavior)
# For light mode, we want white bg and dark fg
# We'll create them from the dark PNGs by inverting
# Actually, let's just create a seaparate light icon

# Generate favicon.ico (multi-size: 16, 32, 48)
ico_sizes = [16, 32, 48]
imgs = []
for size in ico_sizes:
    png_path = os.path.join(PUBLIC, f"icon-{size}x{size}.png")
    img = Image.open(png_path)
    imgs.append(img)

ico_path = os.path.join(PUBLIC, "favicon.ico")
imgs[0].save(
    ico_path,
    format="ICO",
    sizes=[(s, s) for s in ico_sizes],
    append_images=imgs[1:],
)
print(f"Generated {ico_path}")

# Generate apple-touch-icon (180x180)
# Already have apple-icon.png, but let's ensure it's 180x180
# Copy the 192x192 as apple-touch-icon.png if needed
print("Done!")
