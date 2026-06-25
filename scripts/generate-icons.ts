/**
 * Generates the site's favicon / app icons from public/logo.jpeg using sharp.
 * Run from the project root:  npm run generate-icons
 * (or: npx tsx scripts/generate-icons.ts)
 *
 * Outputs:
 *   app/icon.png                  64x64    browser-tab favicon (Next file convention)
 *   app/apple-icon.png            180x180  iOS "add to home screen"
 *   public/icon-192.png           192x192  PWA manifest
 *   public/icon-512.png           512x512  PWA manifest
 *   public/icon-maskable-512.png  512x512  PWA maskable (logo padded into the safe zone)
 *
 * app/icon.png and app/apple-icon.png are auto-detected by Next.js — no layout
 * change is needed. Re-run this whenever public/logo.jpeg changes.
 */
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const src = path.join(root, "public", "logo.jpeg");
const out = (p: string) => path.join(root, p);

async function main() {
  // Sample the logo's top-left pixel so the maskable padding blends with the
  // logo's own background instead of leaving a mismatched border.
  const corner = await sharp(src).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
  const [r, g, b] = corner;
  const bg = { r, g, b, alpha: 1 };

  await sharp(src).resize(64, 64).png().toFile(out("app/icon.png"));
  await sharp(src).resize(180, 180).png().toFile(out("app/apple-icon.png"));
  await sharp(src).resize(192, 192).png().toFile(out("public/icon-192.png"));
  await sharp(src).resize(512, 512).png().toFile(out("public/icon-512.png"));

  // Maskable icon: logo scaled to ~80% (the maskable "safe zone") and centered
  // on the sampled background colour, so masked shapes never clip the logo.
  const inner = Math.round(512 * 0.8);
  const logo = await sharp(src).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out("public/icon-maskable-512.png"));

  console.log(`✓ Icons generated from public/logo.jpeg (maskable bg = rgb(${r}, ${g}, ${b})).`);
}

main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
