# Outbreak Empire – landing page

Plain static site (HTML + CSS + a few lines of JS). No build step except images.

## Images
1. Put `hero`, `horde`, `convoy`, `warroom`, `winter` (png, jpg or webp) in `images/src/`
   (optional: `icon.png` for the iPhone home-screen icon).
2. Run `python tools/build_images.py` (needs `pip install pillow`).
   It writes compressed WebP files, `og.jpg` (share image) and `apple-touch-icon.png` into `images/`.
   Missing sources become labelled PLACEHOLDER images.

Only use images you have a commercial licence for.

## Site address
The canonical, Open Graph and Twitter URLs in `index.html` point to
`https://nivazulay909066-sys.github.io/outbreak-empire-site/`.
If the repo name or domain changes, search-and-replace that address.

Icons: Simple Icons (CC0).
