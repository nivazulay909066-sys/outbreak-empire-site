"""Cuts the owner's logo (images/src/logo.jpg, on a flat near-black background)
out to a transparent WebP: images/logo-{300,640,1000}.webp.

Background pixels connected to the image border are keyed out with a soft edge
(alpha grows with distance from the background colour), colours unpremultiplied.
Usage: python -I tools/build_logo.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "src" / "logo.jpg"
OUT = ROOT / "images"
BG = np.array([17, 17, 17], dtype=np.float32)
TOL, SOFT_LO, SOFT_HI = 16, 4, 16

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)
d = np.abs(a - BG).max(axis=2)

near = Image.fromarray(np.where(d <= TOL, 255, 0).astype(np.uint8), "L").copy()
w, h = near.size
for x in range(0, w, 4):
    for y in (0, h - 1):
        if near.getpixel((x, y)) == 255: ImageDraw.floodfill(near, (x, y), 128)
for y in range(0, h, 4):
    for x in (0, w - 1):
        if near.getpixel((x, y)) == 255: ImageDraw.floodfill(near, (x, y), 128)
region = np.asarray(near) == 128

alpha = np.ones_like(d)
alpha[region] = np.clip((d[region] - SOFT_LO) / (SOFT_HI - SOFT_LO), 0, 1)
safe = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((a - BG * (1 - alpha[..., None])) / safe, 0, 255)
rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
out = Image.fromarray(rgba, "RGBA")
bbox = Image.fromarray((alpha > .5).astype(np.uint8) * 255).getbbox()
pad = 6
out = out.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)))
print("cropped", out.size)
for width in (300, 640, 1000):
    r = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS) if width < out.width else out
    r.save(OUT / f"logo-{width}.webp", quality=78, alpha_quality=80, method=6)
    print(width, r.size, (OUT / f"logo-{width}.webp").stat().st_size)

# Wordmark only (the plate), for the nav bar.
W, H = out.size
plate = out.crop((round(W * .03), round(H * .49), round(W * .97), round(H * .95)))
plate = plate.crop(Image.fromarray((np.asarray(plate)[..., 3] > 128).astype(np.uint8) * 255).getbbox())
pw = 360
plate.resize((pw, round(plate.height * pw / plate.width)), Image.LANCZOS).save(OUT / "logo-word-360.webp", quality=78, alpha_quality=80, method=6)
print("word", plate.size)

# Share image (1200x630): hero art, dark left side, logo on the left.
srcs = [p for p in (ROOT / "images" / "src").glob("hero.*")]
if srcs:
    hero = Image.open(srcs[0]).convert("RGB")
    tw, th = 1200, 630
    s = max(tw / hero.width, th / hero.height)
    hero = hero.resize((round(hero.width * s), round(hero.height * s)), Image.LANCZOS)
    left = round((hero.width - tw) * .75); top = round((hero.height - th) * .3)
    card = hero.crop((left, top, left + tw, top + th)).convert("RGBA")
    shade = np.zeros((th, tw, 4), np.uint8)
    ramp = np.clip(1 - np.arange(tw) / (tw * .62), 0, 1) * 230
    shade[..., 3] = ramp[None, :].astype(np.uint8)
    card.alpha_composite(Image.fromarray(shade, "RGBA"))
    lh = 560
    lg = out.resize((round(out.width * lh / out.height), lh), Image.LANCZOS)
    card.alpha_composite(lg, (70, (th - lh) // 2))
    card.convert("RGB").save(OUT / "og.jpg", quality=86)
    print("og ok")

# Home-screen icon: the logo on the site background.
ic = Image.new("RGBA", (180, 180), (17, 17, 17, 255))
li = out.resize((round(out.width * 168 / out.height), 168), Image.LANCZOS)
ic.alpha_composite(li, ((180 - li.width) // 2, 6))
ic.convert("RGB").save(OUT / "apple-touch-icon.png")

# Browser-tab icons: the gate emblem above the wordmark (the whole logo is unreadable at 32px).
em = out.crop((round(W * .18), 0, round(W * .82), round(H * .50)))
em = em.crop(Image.fromarray((np.asarray(em)[..., 3] > 128).astype(np.uint8) * 255).getbbox())
side = max(em.size)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.alpha_composite(em, ((side - em.width) // 2, (side - em.height) // 2))
for s in (32, 192):
    fav = Image.new("RGBA", (s, s), (17, 17, 17, 255))
    fav.alpha_composite(sq.resize((s, s), Image.LANCZOS))
    fav.convert("RGB").save(OUT / f"favicon-{s}.png", optimize=True)
    print("favicon", s, (OUT / f"favicon-{s}.png").stat().st_size)
