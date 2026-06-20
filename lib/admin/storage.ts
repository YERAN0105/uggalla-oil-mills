import { createAdminClient } from "@/lib/supabase/admin";

// Public Supabase Storage URLs look like:
//   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path...>
const PUBLIC_MARKER = "/storage/v1/object/public/";

/** Parse the bucket + object path out of a public Storage URL, or null. */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const idx = url.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;
  let rest = url.slice(idx + PUBLIC_MARKER.length);
  const q = rest.indexOf("?");
  if (q !== -1) rest = rest.slice(0, q); // strip any query string
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  if (!bucket || !path) return null;
  return { bucket, path: decodeURIComponent(path) };
}

/**
 * Best-effort removal of public Storage files by their public URL. Groups by
 * bucket and removes each bucket's files in one call.
 *
 * **Never throws** — storage cleanup must not fail the database operation that
 * triggered it (the row delete is what matters; an orphaned file is harmless).
 * Non-Supabase / external URLs (e.g. Unsplash) are ignored. De-dupes input.
 */
export async function deletePublicImages(urls: (string | null | undefined)[]): Promise<void> {
  const byBucket = new Map<string, Set<string>>();
  for (const url of urls) {
    if (!url) continue;
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    const set = byBucket.get(parsed.bucket) ?? new Set<string>();
    set.add(parsed.path);
    byBucket.set(parsed.bucket, set);
  }
  if (byBucket.size === 0) return;

  try {
    const db = createAdminClient();
    for (const [bucket, paths] of byBucket) {
      const { error } = await db.storage.from(bucket).remove([...paths]);
      if (error) console.error(`[storage cleanup] ${bucket}:`, error.message);
    }
  } catch (err) {
    console.error("[storage cleanup] failed:", err);
  }
}

/** Convenience: remove a single public Storage file by URL. */
export async function deletePublicImage(url: string | null | undefined): Promise<void> {
  await deletePublicImages([url]);
}

/**
 * After an entity's image is updated, remove the PREVIOUS file from storage —
 * but only when it actually changed (and was non-empty), so an unchanged image is
 * never deleted. Use on the update/replace path of save actions.
 */
export async function deleteReplacedImage(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined
): Promise<void> {
  if (oldUrl && oldUrl !== newUrl) await deletePublicImage(oldUrl);
}
