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

## Logo

Put the logo (flat near-black background) at `images/src/logo.jpg`, then run `python -I tools/build_logo.py` **after** `build_images.py`.
It writes the transparent `logo-*.webp`, `logo-word-360.webp`, and overwrites `og.jpg` and `apple-touch-icon.png` with logo versions.

## Before publishing
- Turn on two-step verification on the Google account that owns the form, and do not share the responses sheet (the privacy policy promises this).
- Optional, recommended: add the owner's name and a dedicated contact email to `privacy.html` and `accessibility.html`. Until then the contact is the Discord server, which GDPR and the Israeli privacy law treat as weak, because they expect the controller's identity.

## Google Form changes (for whoever edits the form)
1. Form description: "We use your answers only to email you about Outbreak Empire (closed test, launch and game news). You don't have to give us this information, but we need your email to add you. Privacy Policy: https://nivazulay909066-sys.github.io/outbreak-empire-site/privacy.html"
2. First question, required, multiple choice: "How old are you?" with "Under 13", "13-15", "16 or older". Under 16 goes to a closing section ("Sorry, the waitlist is for players aged 16 or older.") and never reaches the email field.
3. Required checkbox, not pre-ticked: "I agree to receive emails, including promotional emails, about Outbreak Empire. I can unsubscribe at any time."
4. Required checkbox: "I have read the Privacy Policy."

## Every waitlist email
- Send one email per person, or put everyone in BCC. Never in To or CC.
- In Israel, start the subject line with the word "פרסומת" (Communications Law section 30A).
- End with: "You're receiving this because you joined the Outbreak Empire waitlist. To unsubscribe, reply 'unsubscribe'. We'll remove you within 10 days." US law (CAN-SPAM) also needs a postal address in promotional emails; a P.O. box is enough.
- Remove anyone who unsubscribes within 10 days.
