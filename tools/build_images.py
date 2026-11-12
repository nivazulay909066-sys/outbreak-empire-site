"""Convert source images in images/src/ to compressed WebP (+ og.jpg, apple-touch-icon.png).

Usage:  python tools/build_images.py
Put army.jpg, building.jpg, horde.jpg, raid.jpg, coalition.jpg in images/src/ (jpg/jpeg/png/webp).
If a source is missing, a clearly labelled PLACEHOLDER is written instead.
Requires Pillow:  pip install pillow
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "src"
OUT = ROOT / "images"

HERO = "army"
FEATURES = ["building", "horde", "raid", "coalition"]
QUALITY = 78


def find_source(name):
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = SRC / (name + ext)
        if p.exists():
            return p
    return None


def placeholder(name, size):
    img = Image.new("RGB", size, (24, 26, 30))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", max(24, size[0] // 28))
    except OSError:
        font = ImageFont.load_default()
    text = f"PLACEHOLDER - add images/src/{name}.jpg"
    w = d.textlength(text, font=font)
    d.text(((size[0] - w) / 2, size[1] / 2), text, fill=(232, 116, 44), font=font)
    return img


def load(name, fallback_size):
    p = find_source(name)
    if p is None:
        print(f"  missing {name} -> placeholder")
        return placeholder(name, fallback_size)
    img = Image.open(p)
    img = ImageOps.exif_transpose(img).convert("RGB")
    return img


def save_webp(img, name, width, crop_ratio=None):
    im = img
    if crop_ratio:
        target_h = round(width / crop_ratio)
        im = ImageOps.fit(img, (width, target_h), Image.LANCZOS)
    elif img.width > width:
        im = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    path = OUT / f"{name}-{width}.webp"
    im.save(path, "WEBP", quality=QUALITY, method=6)
    print(f"  {path.name}  {im.width}x{im.height}  {path.stat().st_size // 1024} KB")


def main():
    OUT.mkdir(exist_ok=True)
    hero = load(HERO, (1920, 1080))
    for w in (960, 1920):
        save_webp(hero, HERO, w)
    og = ImageOps.fit(hero, (1200, 630), Image.LANCZOS)
    og.save(OUT / "og.jpg", "JPEG", quality=82, optimize=True, progressive=True)
    print("  og.jpg 1200x630")

    for name in FEATURES:
        img = load(name, (1600, 1000))
        for w in (640, 960):
            save_webp(img, name, w, crop_ratio=16 / 10)

    icon = Image.open(ROOT / "images" / "src" / "icon.png") if (SRC / "icon.png").exists() else None
    if icon is None:
        icon = Image.new("RGB", (180, 180), (13, 14, 16))
        d = ImageDraw.Draw(icon)
        d.polygon([(40, 150), (40, 70), (90, 45), (140, 70), (140, 150), (124, 150), (124, 80), (90, 63), (56, 80), (56, 150)], fill=(232, 116, 44))
        d.rectangle([75, 100, 105, 150], fill=(232, 116, 44))
    else:
        icon = ImageOps.fit(icon.convert("RGB"), (180, 180), Image.LANCZOS)
    icon.save(OUT / "apple-touch-icon.png", optimize=True)
    print("  apple-touch-icon.png")


if __name__ == "__main__":
    main()
