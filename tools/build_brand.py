"""Build the brand files: favicons and the share image, in the strategy look (slate blue and gold).

Usage:  python tools/build_brand.py      (needs: pip install pillow)
The wordmark is set in Anton (SIL Open Font License, tools/fonts/OFL.txt).
On the site itself the wordmark is live text; these files cover the places text cannot reach.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images"
FONT = str(ROOT / "tools" / "fonts" / "Anton-Regular.ttf")
INK = (241, 236, 225)
BG = (17, 26, 37)
FIRE = [(255, 233, 168), (255, 138, 42), (217, 138, 11)]  # top, middle, bottom


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
    d.rectangle([66, 132, 66 + 84, 136], fill=(244, 181, 46))
    return im


def main():
    monogram(32, 5).save(OUT / "favicon-32.png", optimize=True)
    monogram(192, 36).save(OUT / "favicon-192.png", optimize=True)
    monogram(180, 34).save(OUT / "apple-touch-icon.png", optimize=True)
    # browsers and crawlers ask for /favicon.ico whatever the page says
    monogram(48, 8).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    share_image().save(OUT / "og.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    for n in ["favicon-32.png", "favicon-192.png", "apple-touch-icon.png", "og.jpg"]:
        print(f"  {n:22} {(OUT / n).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
