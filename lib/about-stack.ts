import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Auto-loads the "About Us" card-stack photos from `public/about-stack/`.
 *
 * Drop image files in that folder and they appear automatically — no code
 * change. The filename controls both order and caption:
 *   `01-our-shop.jpg` → shows first, caption "Our shop".
 *
 * Same idea as the default hero auto-detection in the homepage. The folder is
 * read on the server; `next.config.ts` (`outputFileTracingIncludes`) ensures the
 * files are bundled so the read also works in production on Vercel.
 */

export interface AboutStackImage {
  src: string;
  alt: string;
  caption: string;
}

const DIR = path.join(process.cwd(), "public", "about-stack");
const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;

/** "01-staff-packing.jpg" → "Staff packing" */
function toCaption(filename: string): string {
  return filename
    .replace(IMAGE_RE, "") // drop extension
    .replace(/^[\d]+[-_\s]*/, "") // drop leading order prefix ("01-")
    .replace(/[-_]+/g, " ") // hyphens/underscores → spaces
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
}

export function getAboutStackImages(): AboutStackImage[] {
  let files: string[];
  try {
    files = fs.readdirSync(DIR);
  } catch {
    return []; // folder missing / empty — caller falls back to the static image
  }

  return files
    .filter((f) => IMAGE_RE.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => {
      const caption = toCaption(f);
      return {
        src: `/about-stack/${encodeURIComponent(f)}`,
        alt: caption || "Uggalla Oil Mills shop in Padukka, Sri Lanka",
        caption,
      };
    });
}
