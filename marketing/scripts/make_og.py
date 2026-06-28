#!/usr/bin/env python3
"""Generate the FitDaily og:image (1200x630) for social share cards.

Usage:  python3 scripts/make_og.py   (from the marketing/ folder)
Requires Pillow:  pip install pillow
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630
BG = (10, 11, 13)
ORANGE = (255, 90, 60)
ORANGE_HI = (255, 150, 100)
WHITE = (244, 245, 247)
GREY = (150, 156, 166)

def font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

BOLD = ["/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc"]
REG = ["/System/Library/Fonts/SFNS.ttf",
       "/System/Library/Fonts/Supplemental/Arial.ttf",
       "/Library/Fonts/Arial.ttf",
       "/System/Library/Fonts/Helvetica.ttc"]

f_brand = font(BOLD, 46)
f_head  = font(BOLD, 92)
f_pill  = font(BOLD, 26)
f_sub   = font(REG, 36)
f_foot  = font(BOLD, 30)

img = Image.new("RGB", (W, H), BG)

# Soft orange glow (top-left) + blue glow (bottom-right) via blurred blobs.
glow = Image.new("RGB", (W, H), BG)
gd = ImageDraw.Draw(glow)
gd.ellipse([-200, -260, 560, 360], fill=(60, 24, 16))
gd.ellipse([820, 380, 1500, 900], fill=(12, 26, 40))
glow = glow.filter(ImageFilter.GaussianBlur(120))
img = Image.blend(img, glow, 0.9)
d = ImageDraw.Draw(img)

MX = 80  # left margin

# --- Brand row: orange rounded square w/ lightning bolt + "FitDaily" ---
bx, by, bs = MX, 70, 60
d.rounded_rectangle([bx, by, bx + bs, by + bs], radius=16, fill=ORANGE)
# simple lightning bolt polygon centered in the square
cx, cy = bx + bs / 2, by + bs / 2
bolt = [(cx + 6, cy - 18), (cx - 10, cy + 3), (cx, cy + 3),
        (cx - 6, cy + 18), (cx + 11, cy - 5), (cx + 1, cy - 5)]
d.polygon(bolt, fill=WHITE)
d.text((bx + bs + 20, by + 6), "FitDaily", font=f_brand, fill=WHITE)

# --- Eyebrow pill: NOW IN BETA ---
pill_t = "NOW IN BETA"
pw = d.textlength(pill_t, font=f_pill)
px, py = MX, 200
d.rounded_rectangle([px, py, px + pw + 44, py + 46], radius=23, fill=(42, 24, 18))
d.ellipse([px + 18, py + 18, px + 28, py + 28], fill=ORANGE)
d.text((px + 36, py + 9), pill_t, font=f_pill, fill=ORANGE)

# --- Headline: "One personalized\nworkout a day." with orange word ---
hx, hy = MX, 274
lh = 100
# line 1: "One " + "personalized"
d.text((hx, hy), "One ", font=f_head, fill=WHITE)
w_one = d.textlength("One ", font=f_head)
d.text((hx + w_one, hy), "personalized", font=f_head, fill=ORANGE)
# line 2
d.text((hx, hy + lh), "workout a day.", font=f_head, fill=WHITE)

# --- Subline ---
d.text((MX, hy + 2 * lh + 14), "An AI-personalized workout, every single day.",
       font=f_sub, fill=GREY)

# --- Footer CTA ---
d.text((MX, H - 78), "Join the beta  →  fitdaily1.netlify.app",
       font=f_foot, fill=ORANGE_HI)

out = os.path.join(os.path.dirname(__file__), "..", "assets", "og-image.png")
out = os.path.normpath(out)
img.save(out, "PNG")
print("wrote", out, img.size)
