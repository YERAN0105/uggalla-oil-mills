# About card stack — image folder

Drop your photos in **this folder** (`public/about-stack/`) and they appear
automatically in the "About Us" card stack — on the **homepage** and the
**About page**. No code changes needed; the images are picked up on the next
deploy (or dev-server restart).

If this folder has **no images**, the site quietly falls back to the single
store photo it showed before — so it's always safe.

## Naming = order

The **filename controls the order**, so name them like:

```
01-our-shop.jpg
02-staff-packing.jpg
03-fresh-stock.jpg
04-delivery.jpg
```

- The **number prefix** (`01-`, `02-`, …) sets the order they show in.
- The readable part of the name is used as the photo's description for screen
  readers (accessibility) — it is **not** shown as text on the image.

## What to put in

- **3–5 photos** works best — more than that dilutes the effect.
- Good subjects: the **shop / storefront, staff serving or packing, shelves &
  product close-ups, packaging, delivery**.
- ⚠️ We're a **shop, not a mill** — no oil-pressing / mill-floor / grove photos.

## Size & format

| Recommended | Ratio | Notes |
|---|---|---|
| **1200 × 900** | 4:3 (landscape) | Same shape as category images |

- **Format:** JPEG or WebP (PNG only if it needs transparency).
- **Keep all photos the same orientation** (landscape) so the cards crop cleanly.
- Aim for **under ~400 KB** each (export at ~80% quality). Don't upscale small
  images.

Supported file types: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`.

## How it behaves

- Auto-rotates through the photos, and pauses while you're hovering or touching it.
- **Desktop:** the cards stack **vertically** (like the reference look).
- **Phone:** the cards stack **horizontally** so a sideways swipe never fights
  page scrolling.
- Swipe, tap, the little dots, or arrow keys all change the photo.
