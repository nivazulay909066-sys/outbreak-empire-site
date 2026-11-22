"""Build the brand files: the game icon in every size and the share image, in the strategy look (slate blue and gold).

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


def icon(size):
    """The game icon. Small sizes are cut closer to the face so it still reads in a browser tab."""
    im = Image.open(ROOT / "images" / "src" / "icon.png").convert("RGB")
    if size <= 64:
        w = im.width
        im = im.crop((round(w * .22), round(w * .08), round(w * .78), round(w * .64)))
    return im.resize((size, size), Image.LANCZOS)


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
    icon(32).save(OUT / "favicon-32.png", optimize=True)
    icon(192).save(OUT / "favicon-192.png", optimize=True)
    icon(180).save(OUT / "apple-touch-icon.png", optimize=True)
    # browsers and crawlers ask for /favicon.ico whatever the page says
    icon(48).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    icon(96).save(OUT / "icon-96.webp", "WEBP", quality=88, method=6)  # beside the wordmark in the top bar
    share_image().save(OUT / "og.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    # the press kit: the logo on clear and on dark ground, and a square icon
    press = OUT / "press"
    press.mkdir(exist_ok=True)
    mark = lockup(1400)
    mark.save(press / "outbreak-empire-logo.png", optimize=True)
    dark = Image.new("RGBA", (mark.width + 240, mark.height + 240), BG + (255,))
    dark.alpha_composite(mark, (120, 120))
    dark.convert("RGB").save(press / "outbreak-empire-logo-dark.png", optimize=True)
    icon(1024).save(press / "outbreak-empire-icon.png", optimize=True)
    for n in ["favicon-32.png", "favicon-192.png", "apple-touch-icon.png", "og.jpg"]:
        print(f"  {n:22} {(OUT / n).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
