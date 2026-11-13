"""Build the brand files of the second design: favicons, the share image, the wear mask and the grain.

Usage:  python tools/build_brand.py      (needs: pip install pillow)
The wordmark is set in Anton (SIL Open Font License, tools/fonts/OFL.txt).
On the site itself the wordmark is live text; these files cover the places text cannot reach.
"""
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images"
FONT = str(ROOT / "tools" / "fonts" / "Anton-Regular.ttf")
INK = (241, 236, 225)
BG = (7, 7, 8)
FIRE = [(255, 208, 138), (255, 138, 42), (226, 71, 15)]  # top, middle, bottom


def fire(size):
    """Vertical fire gradient, the same one the site uses on EMPIRE."""
    w, h = size
    g = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        a, b, k = (FIRE[0], FIRE[1], t / .45) if t < .45 else (FIRE[1], FIRE[2], (t - .45) / .55)
        g.putpixel((0, y), tuple(round(a[i] + (b[i] - a[i]) * k) for i in range(3)))
    return g.resize((w, h))


def word(text, px, fill):
    """One word as an RGBA image cropped to its ink. fill: a colour or 'fire'."""
    f = ImageFont.truetype(FONT, px)
    l, t, r, b = f.getbbox(text)
    mask = Image.new("L", (r - l, b - t), 0)
    ImageDraw.Draw(mask).text((-l, -t), text, font=f, fill=255)
    base = fire(mask.size) if fill == "fire" else Image.new("RGB", mask.size, fill)
    base.putalpha(mask)
    return base


def lockup(width):
    """OUTBREAK over EMPIRE, both exactly `width` wide."""
    top = word("OUTBREAK", round(width / 3.69), INK)
    top = top.resize((width, round(top.height * width / top.width)), Image.LANCZOS)
    bot = word("EMPIRE", round(width / 2.746), "fire")
    bot = bot.resize((width, round(bot.height * width / bot.width)), Image.LANCZOS)
    gap = round(width * .035)
    im = Image.new("RGBA", (width, top.height + gap + bot.height), (0, 0, 0, 0))
    im.alpha_composite(top, (0, 0))
    im.alpha_composite(bot, (0, top.height + gap))
    return im


def monogram(size, pad):
    im = Image.new("RGB", (size, size), BG)
    o = word("O", size, INK)
    e = word("E", size, "fire")
    h = size - 2 * pad
    o = o.resize((round(o.width * h / o.height), h), Image.LANCZOS)
    e = e.resize((round(e.width * h / e.height), h), Image.LANCZOS)
    gap = max(1, round(size * .04))
    x = (size - (o.width + gap + e.width)) // 2
    im.paste(o, (x, pad), o)
    im.paste(e, (x + o.width + gap, pad), e)
    return im


def wear_mask(size=512, seed=7):
    """Tileable alpha mask: mostly solid, with chips and scratches worn out of it."""
    rnd = random.Random(seed)
    big = size * 3
    m = Image.new("L", (big, big), 255)
    d = ImageDraw.Draw(m)
    for _ in range(150):  # chips
        x, y, r = rnd.randrange(big), rnd.randrange(big), rnd.choice([1, 1, 1, 2, 2, 3])
        d.ellipse([x - r, y - r, x + r * rnd.uniform(.6, 1.8), y + r], fill=rnd.choice([0, 0, 60, 120]))
    for _ in range(14):  # scratches
        x, y = rnd.randrange(big), rnd.randrange(big)
        ln, a = rnd.randrange(30, 150), rnd.uniform(-.5, .5)
        d.line([x, y, x + ln, y + ln * a], fill=rnd.choice([0, 40, 90]), width=rnd.choice([1, 1, 2]))
    m = m.filter(ImageFilter.GaussianBlur(.7))
    # wrap the three-by-three sheet onto itself so the tile repeats without a seam
    tile = Image.new("L", (size, size), 255)
    for ox in range(3):
        for oy in range(3):
            part = m.crop((ox * size, oy * size, (ox + 1) * size, (oy + 1) * size))
            tile = Image.composite(tile, part, part.point(lambda v: 255 if v > 200 else 0))
    out = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    out.putalpha(tile)
    return out


def grain(size=160, seed=3):
    """Fine film grain: a small tile of soft white and black specks, mostly clear."""
    rnd = random.Random(seed)
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = im.load()
    for x in range(size):
        for y in range(size):
            v = rnd.random()
            if v < .5:
                px[x, y] = (255, 255, 255, round(rnd.random() * 46)) if v < .25 else (0, 0, 0, round(rnd.random() * 60))
    return im


def hero_depth():
    """A rough, hand-drawn depth map of the hero picture (white = close to the lens).
    The page uses it to shift near and far parts by different amounts, so the picture has depth.
    Coordinates are fractions of the picture; the heavy blur hides the rough edges."""
    W, H = 512, 288
    m = Image.new("L", (W, H), 0)
    px = m.load()
    for y in range(H):  # the ground comes toward the lens from the horizon down
        v = y / H
        g = 0 if v < .42 else round(255 * min(.95, .28 + (v - .42) / .58 * .7))
        for x in range(W):
            px[x, y] = g
    d = ImageDraw.Draw(m)
    box = lambda x0, y0, x1, y1, v: d.rectangle([x0 * W, y0 * H, x1 * W, y1 * H], fill=round(v * 255))
    oval = lambda x0, y0, x1, y1, v: d.ellipse([x0 * W, y0 * H, x1 * W, y1 * H], fill=round(v * 255))
    box(.62, .10, 1, .36, .08)        # far skyline
    box(.74, .20, 1, .36, .16)        # the overpass
    box(.22, .00, .62, .44, .34)      # the gate and its bridge
    box(.00, .00, .22, .60, .50)      # the near wall of the gate
    box(.22, .30, .39, .50, .32)      # the truck
    box(.88, .40, 1, .62, .48)        # wrecked car, right
    box(.90, .64, 1, .90, .80)        # wrecked car, front right
    oval(.21, .44, .30, .76, .46)     # squad, back row
    oval(.28, .41, .37, .86, .52)
    oval(.44, .38, .52, .70, .50)
    oval(.67, .40, .75, .70, .50)
    oval(.35, .37, .47, 1.1, .64)     # the bearded man
    oval(.00, .58, .24, 1.1, .86)     # grass, front left
    oval(.73, .38, .92, 1.2, .84)     # the woman, front right
    oval(.42, .40, .76, 1.3, .95)     # the leader: body
    oval(.55, .26, .69, .50, .95)     # the leader: head
    return m.filter(ImageFilter.GaussianBlur(9))


def share_image():
    src = next(p for p in (ROOT / "images" / "src").glob("hero.*"))
    im = ImageOps.fit(Image.open(src).convert("RGB"), (1200, 630), Image.LANCZOS, centering=(.72, .32))
    shade = Image.new("L", (1200, 630), 0)
    px = shade.load()
    for x in range(1200):
        for y in range(630):
            left = max(0, 1 - x / 680) ** .7
            low = max(0, (y - 380) / 250) ** 1.6
            px[x, y] = round(255 * min(1, .94 * left + .55 * low))
    im = Image.composite(Image.new("RGB", im.size, BG), im, shade)
    mark = lockup(430)
    im.paste(mark, (64, 170), mark)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, 25)
    d.text((66, 170 + mark.height + 34), "LEAD THE SURVIVORS.  BUILD WHAT'S LEFT.", font=f, fill=(232, 225, 209))
    d.rectangle([66, 132, 66 + 84, 136], fill=(255, 122, 31))
    return im


def main():
    monogram(32, 5).save(OUT / "favicon-32.png", optimize=True)
    monogram(192, 36).save(OUT / "favicon-192.png", optimize=True)
    monogram(180, 34).save(OUT / "apple-touch-icon.png", optimize=True)
    # browsers and crawlers ask for /favicon.ico whatever the page says
    monogram(48, 8).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    wear_mask().save(OUT / "wear.png", optimize=True)
    grain().save(OUT / "grain.png", optimize=True)
    hero_depth().save(OUT / "hero-depth.jpg", "JPEG", quality=72, optimize=True)
    share_image().save(OUT / "og.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    for n in ["favicon-32.png", "favicon-192.png", "apple-touch-icon.png", "wear.png", "grain.png", "hero-depth.jpg", "og.jpg"]:
        print(f"  {n:22} {(OUT / n).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
