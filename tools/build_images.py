"""Convert source images in images/src/ to compressed WebP, plus og.jpg and apple-touch-icon.png.

Usage:  python tools/build_images.py      (needs: pip install pillow)
Sources expected in images/src/ (png/jpg/webp): hero, horde, convoy, warroom, winter.
Originals stay out of git (.gitignore); only the compressed files are published.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "src"
OUT = ROOT / "images"
QUALITY = 74
NAMES = ["hero", "horde", "convoy", "warroom", "winter"]
WIDTHS = [800, 1600]


def find(name):
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = SRC / (name + ext)
        if p.exists():
            return p
    raise SystemExit(f"missing images/src/{name}.(png|jpg|webp)")


def main():
    for name in NAMES:
        img = ImageOps.exif_transpose(Image.open(find(name))).convert("RGB")
        for w in WIDTHS:
            im = img if img.width <= w else img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
            path = OUT / f"{name}-{w}.webp"
            im.save(path, "WEBP", quality=QUALITY, method=6)
            print(f"  {path.name:20} {im.width}x{im.height}  {path.stat().st_size // 1024} KB")
        if name == "hero":
            ImageOps.fit(img, (1200, 630), Image.LANCZOS, centering=(0.5, 0.4)).save(
                OUT / "og.jpg", "JPEG", quality=84, optimize=True, progressive=True)
            print("  og.jpg               1200x630")

    icon = Image.new("RGB", (180, 180), (17, 18, 21))
    from PIL import ImageDraw
    d = ImageDraw.Draw(icon)
    gold = (200, 144, 46)
    d.polygon([(38, 150), (38, 72), (90, 44), (142, 72), (142, 150), (124, 150), (124, 83), (90, 64), (56, 83), (56, 150)], fill=gold)
    d.rectangle([76, 104, 104, 150], fill=gold)
    icon.save(OUT / "apple-touch-icon.png", optimize=True)
    print("  apple-touch-icon.png")


if __name__ == "__main__":
    main()
