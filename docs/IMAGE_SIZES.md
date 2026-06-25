# Image Sizes Guide

A practical reference for every image the store uses — what shape and size to
upload so photos stay sharp and load fast. Sizes are **recommendations**, not
hard limits; the site automatically resizes and optimises whatever you upload.

**General rules for all images**

- **Format:** JPEG (or WebP) for photos; PNG only for logos/graphics that need a
  transparent background.
- **File size:** aim for **under ~400 KB** per photo after export. Export at
  ~80% quality — it looks identical and is much smaller.
- **Don't upscale.** Start from a high-resolution original and crop down; never
  stretch a small image up to these numbers.

---

## Hero / Homepage banner

The big banner at the top of the homepage. It can be a single image or several
that rotate as a slideshow (Admin → Banners). Each hero takes **two** images:

| Image | Size (W × H) | Ratio | Shown on |
|---|---|---|---|
| **Desktop** (required) | **2400 × 1350** | 16:9 (wide) | Tablets & computers |
| **Mobile** (optional) | **1080 × 1440** | 3:4 (tall) | Phones |

- If no **mobile** image is uploaded, the **desktop** image is used on phones too
  (cropped to the centre). The mobile image fixes that crop.
- A taller mobile option is **1080 × 1920** (9:16) if you want it to fill more of
  a tall phone screen.
- **Text placement:** the headline sits over the **left** on desktop and the
  **top-left** on phones. Keep the main subject slightly **right of centre**
  (desktop) and **lower/centred** (mobile) so text doesn't cover it.
- **Tip:** shoot one good high-res photo, then export it twice — once cropped
  wide, once cropped tall — keeping the subject well placed in each.

**The default hero (no admin banner):** drop a wide file at `public/hero.jpeg`
and, optionally, a tall file at `public/hero-mobile.jpeg`. The mobile file is
picked up automatically on the next deploy/restart; if it's missing, the wide
one is used everywhere.

---

## Category image

Shown on the homepage category cards and category landing pages.

| Size (W × H) | Ratio |
|---|---|
| **1200 × 900** | 4:3 (landscape) |

Uploaded per category in **Admin → Categories**.

---

## Product image

Product photos on cards, search, and the product page. Always shown as a
**square**, so shoot/crop square with the product centred.

| Size (W × H) | Ratio |
|---|---|
| **1200 × 1200** | 1:1 (square) |

- A clean, evenly-lit background (white or neutral) looks most professional.
- You can upload several per product (**Admin → Products**); the first is the
  main image.

---

## Brand image

The brand banner shown in brand listings.

| Size (W × H) | Ratio |
|---|---|
| **1600 × 600** | wide |

Uploaded per brand in **Admin → Brands**.

---

## Shop logo

The logo in the site header and footer. Uploaded in **Admin → Settings → General**.

- **Format:** **PNG with a transparent background** (not a white box behind it).
- **Size:** about **400 px wide**, height to match your logo's proportions.
- A horizontal (wide) logo works best in the header bar.

---

## Social share image (Open Graph)

The preview image shown when a page link is shared on WhatsApp, Facebook, etc.
Uploaded in **Admin → Settings → SEO**.

| Size (W × H) | Ratio |
|---|---|
| **1200 × 630** | 1.91:1 (wide) |

- Keep important content (logo, text) **away from the edges** — some apps crop a
  little.

---

## Quick reference

| Image | Size (W × H) | Ratio | Where to upload |
|---|---|---|---|
| Hero — desktop | 2400 × 1350 | 16:9 | Admin → Banners (or `public/hero.jpeg`) |
| Hero — mobile | 1080 × 1440 | 3:4 | Admin → Banners (or `public/hero-mobile.jpeg`) |
| Category | 1200 × 900 | 4:3 | Admin → Categories |
| Product | 1200 × 1200 | 1:1 | Admin → Products |
| Brand | 1600 × 600 | wide | Admin → Brands |
| Logo | ~400 px wide | — (transparent PNG) | Admin → Settings → General |
| Social share | 1200 × 630 | 1.91:1 | Admin → Settings → SEO |
