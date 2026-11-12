# Aurora storefront: design record

## Audience and job
Buyers of watches, chains and necklaces, mostly in Nigeria and abroad, paying in USD, NGN, EUR or GBP on Bachs's hosted checkout.
The barrier is trust, not taste: *will this arrive, and can I see where it is?* The page must say what the business sells in five seconds,
then show the order is visible from payment to doorstep. Conversion: add to bag, then checkout. (Assumption: nothing on the site says
the brand is Nigerian, so no cultural motifs were added.)

## What looked like a template (evidence from the code before this pass)
| Sign | Where | Verdict |
|---|---|---|
| Claims nobody had confirmed: "certified gemologist", "guaranteed for five years", "Certificate included", "30-day returns", "fully insured" | hero, trust strip, product page, emails, SEO | Removed. Owner fills `src/content/business.js`; nothing shows until then |
| Placeholder phone, address and hours on the public contact page | ContactPage | Removed, same mechanism |
| Four equal icon columns ("Authenticity", "Insured delivery", "Returns", "Advice") | HomePage | Replaced by a numbered, true "how an order works" list |
| Stock icons used as hero imagery | HeroSwiper | Replaced by a real in-stock catalogue photo on each category's 3D hero slide; an icon remains only when no photo is available |
| Vague headline "Exquisite, handpicked pieces" | HomePage | "The collection", with real counts |
| Brass text on cream at 3.1:1, white on brass 3.5:1, brass on hero tint 2.8:1 | tokens | Text brass is now #7b5d12 (5.6:1); badges are ink |
| `scale()` on every button, card and image on hover | CSS | Removed. Hover now inverts colour |
| Autoplaying carousel with no pause | HeroSwiper | No autoplay |
| 22px bag/menu buttons, 9px carousel dots, placeholder-as-label inputs | header, hero, forms | 44px targets, 24px dots, visible labels |
| Dead CSS (stars, wishlist, newsletter, category cards, `dialog`) | styles.css | Deleted |
| Admin status `.pill` overrode the storefront filter chips | styles.css | Chips are `.chip`; admin status is `.admin .pill` |

Kept on purpose: Lucide (one family, only where it clarifies), Inter for UI and numbers, cream/ink base, dark mode, the 3D hero you asked for, cards for products
(a product is a real group), the cart/checkout/tracking flows.

## Two directions
**A. Catalogue (chosen).** Warm paper, ink, brass only for small marks. Pieces read as numbered catalogue entries (the SKU is the number).
Newsreader (headlines, product names) + Inter (everything else). 2 to 4px corners, hairline rules, no shadow except on floating layers.
Icons: Lucide, functional only. Defining detail: the catalogue number, echoed by the order timeline. Paper #f6f4ef, surface #fffdf8, ink #1a1916, brass #7b5d12.
**B. Vitrine.** Graphite #151412 with gold #d3b068 on a lit-display-case layout, Playfair kept. Closest to today's look, but it is the black-and-gold look most
jewellery shops share, and it needs consistent studio photography to work.
**Why A:** photos are uploaded by the admin and will vary (light frames forgive that), it reads in daylight on modest phones, and the catalogue-number idea matches real
features (SKU, tracking). Dark mode still exists: same tokens, inverted.

## Tokens (all in `src/styles.css`, top of file)
| Group | Light | Dark |
|---|---|---|
| paper / surface | #f6f4ef / #fffdf8 | #151412 / #1d1c19 |
| ink / ink-2 | #1a1916 (16:1) / #55524a (7.1:1) | #eee9de / #aaa59a |
| rule / rule-strong (UI borders, 3:1) | #d8d3c6 / #8f8a78 | #34322d / #6d6a60 |
| brass (text) / brass-fill (decoration only) | #7b5d12 (5.6:1) / #b8923a | #d3b068 / #b8923a |
| ok / warn / err / info | #1f6a46 / #8a5700 / #a3261b / #25507a | #5fc08f / #e0a53a / #ff8a7d / #7fb0e0 |
| focus | ink, 2px, 3px offset | light ink |
Status colours always sit next to words. Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 px. Radii: 2 / 4 / 8. One shadow, for drawer, toast and prompt only.

## Type
Newsreader 400 to 500 (opsz auto) for h1 to h3 and product names; Inter 400/500/600 for body, UI, prices (tabular figures). Scale: 13, 15, 16, 19, fluid 21 to 26, 28 to 40, 36 to 64 px.
Body 16px / 1.6, measure 62ch, one h1 per page, no skipped levels. Labels use small uppercase only for catalogue numbers and footer headings.

## Layout system (sections differ on purpose)
Hero: asymmetric split with a stable h1 and a live category line. Shop: catalogue grid with a sort bar. Process: editorial numbered list on a 5/7 split. Closing: one sentence, two buttons.
Footer: real links only. No logo strip, testimonial row, pricing block or invented counts.

## Content rule
Every number on the page comes from live data (catalogue counts, lowest price, free-delivery threshold from the shipping zones, fees). Everything else the owner must confirm lives in
`src/content/business.js`; empty means hidden.

## States
Loading skeletons (no layout shift), error with "Try again", empty category with "Show all pieces", empty catalogue with a contact link, product load error, empty bag with a link,
field errors with text + border + aria, form success. No dead links: policy links appear only if a destination exists.

## Motion
Only: drawer and menu slide (300ms), toast, photo crossfade (350ms), and the 3D scene (pauses off-screen, still under `prefers-reduced-motion`). No scroll fade-ins, no hover scaling, no autoplay.

## Verified and not verified
Run `python3 qa/render-check.py`. It renders the real stylesheet with mirrored markup at 320 / 375 / 768 / 1440 px, light and dark, and checks overflow, tap targets (24px minimum),
text contrast (4.5 / 3), heading order and focus rings. It does not run React, the API or the 3D scene. Fonts load from Google in production; the check used system fallbacks.
