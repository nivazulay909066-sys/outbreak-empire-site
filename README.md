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
`https://outbreakempire.com/`.
If the domain changes, search-and-replace that address, and update `CNAME` and the `<base>` in `404.html`.

DNS (at the registrar): A records for `outbreakempire.com` to 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153, and `www` as a CNAME to `nivazulay909066-sys.github.io`.

Icons: Simple Icons (CC0).

## Logo and brand files

The logo is live text set in Anton (`.wm` in `style.css`): OUTBREAK in bone white over EMPIRE in the fire gradient.
`python -I tools/build_brand.py` (run it **after** `build_images.py`) writes the files text cannot reach:
the browser-tab icons `favicon-32.png` and `favicon-192.png`, `apple-touch-icon.png`, the share image `og.jpg`,
the wear mask `wear.png` on the hero title and the film grain `grain.png`.

## Motion
One switch turns every moving effect off: the class `still` on `<html>`. It is set before first paint when the device asks
for reduced motion, and by the "Pause motion" button. The choice is not saved, because the privacy policy says the site
stores nothing on the device. Keep it that way, or change the policy first.

## Earlier design
The first design is kept at the tag `v1-original` and the branch `design-v1-original`.
To go back: `git checkout main && git reset --hard v1-original && git push --force-with-lease` (or copy files from the tag).

## Before publishing
- Turn on two-step verification on the Google account that owns the form, and do not share the responses sheet (the privacy policy promises this).

## Before the form collects sign-ups, and before the first waitlist email (legal requirement)
The site names no person yet. That is fine for the pages themselves, but marketing email law needs the sender's identity:
- Israel (Communications Law s.30A) and Canada (CASL): every promotional email must name the sender, give a postal address and a way to refuse. CASL also needs the sender's name, address and a contact in the consent request itself, that is, in the form description.
- Privacy laws (Israel s.11, GDPR Art. 13, Brazil LGPD) expect the name of whoever controls the data, and an email address, not only Discord.
- So, before then: choose the name the waitlist is sent under (a person or a registered company), get a P.O. box or business address, and open a dedicated email address. Add all three to `privacy.html` ("Who we are"), `accessibility.html` ("Contact") and the form description.
- People in the EU or the UK: GDPR Art. 27 asks a non-EU controller who targets them to appoint a representative in the EU and in the UK (paid services, roughly 100-300 euros a year each). Until that is done, consider not advertising the waitlist in the EU and the UK.
- A personal Google account has no data-processing agreement with Google; Google Workspace does. Switch before the list grows.
- Send waitlist email with a mailing service that has an unsubscribe link and removes people automatically, not by hand in BCC.

## Record of processing (keep this up to date)
| | |
|---|---|
| Data | email, age group, preferred language, Discord username (optional), how they heard of us (optional) |
| Why | emailing the waitlist about the closed test, the launch and game news |
| Legal basis | consent (form checkbox) |
| Where | Google Forms and its responses sheet; Gmail for sent mail and replies |
| Who sees it | the developer only |
| How long | until unsubscribe or deletion request; at most 12 months after launch; within 30 days if development stops |
| Security | two-step verification on the Google account; responses sheet not shared |

Visit statistics: Cloudflare Web Analytics, a snippet before `</body>` on every page (no cookies, no personal data; the token in it is a public site id, not a secret). Explained in `privacy.html` under "Website visits".

## Google Form changes (for whoever edits the form)
1. Form description: "We use your answers only to email you about Outbreak Empire (closed test, launch and game news). You don't have to give us this information, but we need your email to add you. Privacy Policy: https://outbreakempire.com/privacy.html". When the sender's name and address exist, add them here (see above).
2. First question, required, multiple choice, neutral (it must not hint at the right answer): "What is your age?" with "Under 13", "13-15", "16-17", "18-24", "25-34", "35-44", "45 or older". "Under 13" and "13-15" go to a closing section ("Sorry, the waitlist is for players aged 16 or older.") and never reach the email field.
3. Required checkbox, not pre-ticked: "I agree to receive emails, including promotional emails, about Outbreak Empire. I can unsubscribe at any time."
4. Required checkbox: "I have read the Privacy Policy."

## Every waitlist email
- Send one email per person, or put everyone in BCC. Never in To or CC.
- In Israel, start the subject line with the word "פרסומת" (Communications Law section 30A).
- End with the sender's name and postal address (a P.O. box is enough), and: "You're receiving this because you joined the Outbreak Empire waitlist. To unsubscribe, reply 'unsubscribe'. We'll remove you at once."
- Remove anyone who unsubscribes at once, and never later than 5 business days (Australia's limit; Israel gives no grace period).
