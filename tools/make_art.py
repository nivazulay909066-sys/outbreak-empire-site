"""Generates the site's illustrations as SVG (deterministic, seeded).

  assets/growth-1..6.svg   camp -> metropolis silhouettes

Usage: python tools/make_art.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

def growth():
    """Six silhouettes, each a bit bigger than the last. 120x80 viewBox."""
    gold = "#C8902E"

    def tent(x, y, w=26, h=20):
        return f'<path d="M{x},{y} L{x + w / 2},{y - h} L{x + w},{y} Z"/>'

    def house(x, y, w, h, roof=8):
        return f'<path d="M{x},{y} L{x},{y - h} L{x + w / 2},{y - h - roof} L{x + w},{y - h} L{x + w},{y} Z"/>'

    def block(x, y, w, h):
        return f'<rect x="{x}" y="{y - h}" width="{w}" height="{h}"/>'

    def fence(x0, x1, y, h=10):
        return "".join(f'<rect x="{x}" y="{y - h}" width="3" height="{h}"/>' for x in range(x0, x1, 5))

    stages = [
        tent(40, 70, 34, 26) + '<circle cx="86" cy="66" r="3" fill="#E8742C"/>',
        tent(22, 70) + house(54, 70, 26, 18) + fence(84, 108, 70),
        house(14, 70, 22, 16) + house(40, 70, 26, 22) + house(70, 70, 20, 14) + block(94, 70, 14, 20) + fence(4, 116, 70, 6),
        f'<path d="M4,70 L4,44 L14,44 L14,50 L106,50 L106,44 L116,44 L116,70 Z"/>' + house(30, 50, 22, 14) + block(58, 50, 16, 26) + house(80, 50, 18, 12),
        block(6, 70, 16, 30) + block(26, 70, 20, 44) + block(50, 70, 14, 26) + block(68, 70, 22, 52) + block(94, 70, 20, 36),
        block(4, 70, 12, 34) + block(18, 70, 14, 58) + block(34, 70, 10, 40) + block(46, 70, 18, 68)
        + '<rect x="54" y="-6" width="2" height="10"/>' + block(66, 70, 12, 46) + block(80, 70, 16, 62) + block(98, 70, 18, 42),
    ]
    for i, body in enumerate(stages, 1):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 120 82"><g fill="{gold}">{body}</g>'
               f'<rect y="70" width="120" height="2" fill="{gold}" opacity=".5"/></svg>')
        (ASSETS / f"growth-{i}.svg").write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    ASSETS.mkdir(exist_ok=True)
    growth()
    print("ok")
