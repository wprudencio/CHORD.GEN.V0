#!/usr/bin/env python3
"""Generate Open Graph image for CHORD.GEN — cyberpunk aesthetic."""

from PIL import Image, ImageDraw, ImageFont
import os
import sys

W, H = 1200, 630
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "opengraph-image.png")

# --- Colors ---
BG = (13, 17, 23)           # #0D1117
GRID = (22, 27, 34)         # #161B22 - subtle grid
GREEN = (192, 252, 20)      # #C0FC14
PINK = (255, 45, 124)       # #FF2D7C
CYAN = (20, 252, 235)       # #14FCEB
TEXT_SECONDARY = (154, 175, 136)  # #9AAF88
TEXT_DIM = (106, 122, 90)   # #6A7A5A

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# --- Grid ---
cell = 40
for x in range(0, W, cell):
    draw.line([(x, 0), (x, H)], fill=GRID, width=1)
for y in range(0, H, cell):
    draw.line([(0, y), (W, y)], fill=GRID, width=1)

# --- Scanlines ---
for y in range(0, H, 3):
    draw.rectangle([(0, y), (W, y)], fill=(0, 0, 0, 18))  # subtle

# --- Corner brackets ---
bracket_len = 60
bracket_w = 4
# Top-left
draw.rectangle([(40, 40), (40 + bracket_len, 40 + bracket_w)], fill=GREEN)
draw.rectangle([(40, 40), (40 + bracket_w, 40 + bracket_len)], fill=GREEN)
# Bottom-right
draw.rectangle([(W - 40 - bracket_len, H - 40 - bracket_w), (W - 40, H - 40)], fill=PINK)
draw.rectangle([(W - 40 - bracket_w, H - 40 - bracket_len), (W - 40, H - 40)], fill=PINK)

# --- Top-right accent line ---
draw.rectangle([(W - 40 - 200, 40), (W - 40, 42)], fill=CYAN)

# --- Font setup ---
# Try to find a good monospace or display font
font_candidates = [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Courier.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]
title_font = None
mono_font = None

for fp in font_candidates:
    if os.path.exists(fp):
        try:
            title_font = ImageFont.truetype(fp, 96)
            mono_font = ImageFont.truetype(fp, 28)
            break
        except Exception:
            continue

if title_font is None:
    title_font = ImageFont.load_default()
    mono_font = ImageFont.load_default()

# --- Title ---
title = "CHORD.GEN"
title_bbox = draw.textbbox((0, 0), title, font=title_font)
title_w = title_bbox[2] - title_bbox[0]
title_x = (W - title_w) // 2
title_y = 170
draw.text((title_x, title_y), title, fill=GREEN, font=title_font)

# --- Subtitle ---
sub = "PROGRESSION  COMPOSER"
sub_bbox = draw.textbbox((0, 0), sub, font=mono_font)
sub_w = sub_bbox[2] - sub_bbox[0]
sub_x = (W - sub_w) // 2
draw.text((sub_x, title_y + 110), sub, fill=TEXT_SECONDARY, font=mono_font)

# --- Divider line ---
line_y = title_y + 170
draw.line([(W // 2 - 150, line_y), (W // 2 + 150, line_y)], fill=GREEN, width=2)

# --- Description ---
desc = "128-chord progression generator"
desc_bbox = draw.textbbox((0, 0), desc, font=mono_font)
desc_w = desc_bbox[2] - desc_bbox[0]
draw.text(((W - desc_w) // 2, line_y + 30), desc, fill=TEXT_DIM, font=mono_font)

# --- URL ---
url = "chordgenv0.weslei.com"
url_bbox = draw.textbbox((0, 0), url, font=mono_font)
url_w = url_bbox[2] - url_bbox[0]
draw.text(((W - url_w) // 2, H - 80), url, fill=CYAN, font=mono_font)

# --- Bottom accent dots ---
dot_spacing = 12
for i in range(8):
    x = W // 2 - (8 * dot_spacing) // 2 + i * dot_spacing
    color = GREEN if i % 2 == 0 else PINK
    draw.ellipse([(x, H - 45), (x + 4, H - 41)], fill=color)

img.save(OUT, "PNG")
print(f"OG image saved to {OUT} ({W}x{H})")
