# MUNDP 2027 — Sponsorship Package (redesign)

A redesigned, print-ready sponsorship package built in response to the DSG's
feedback: **more vivid colour, more creative, more professional** than the
muted template original.

## What changed vs. the old version
- **Palette**: flat muted navy → a layered midnight base lifted with vivid
  azure→cyan→violet gradients and a warm **gold** premium accent.
- **Creativity**: gradient "mesh" backgrounds, a dynamic wave band, a framed
  hero panel with the country-placard motif, gradient stat cards, and a
  colour-coded tier system.
- **Structure**: a real 6-page package, not just a cover —
  1. Cover
  2. Welcome / invitation (with a DSG quote card)
  3. By the numbers (impact stats + reach bars)
  4. Sponsorship tiers (Bronze / Silver / Gold / Platinum)
  5. Benefits comparison matrix
  6. Call to action + contact

## How to export a PDF
1. Open `index.html` in Chrome or Edge (you need internet the first time so the
   Google Fonts load).
2. Print → **Save as PDF**.
3. Settings: **Paper = A4**, **Margins = None**, **Background graphics = ON**.

## Things to personalise (all clearly marked as placeholders)
- **Cover photo**: replace the placeholder panel — set a `background:` image on
  `.cover-visual` (search that class in `index.html`). Drop your hi-res
  committee photo in `sponsorship/` and reference it, e.g.
  `background: url('committee.jpg') center/cover;`
- **THIMUN logo**: swap the globe monogram SVG in `.logo-badge` for the real
  affiliation mark.
- **Prices / tiers**: the figures ($250 / $500 / $1,000 / $2,500) are
  placeholders for the Secretariat to confirm.
- **Contact details**: update the email, phone, and website on the final page.
- **Stats**: the 600+ / 40+ / 15K+ figures are representative — confirm before
  sending.

Everything is in a single self-contained `index.html` (no build step).
