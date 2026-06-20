// Orphan-image storage sweep (periodic cleanup).
//
// Catch-all for "upload-then-cancel" / "replace before save" orphan files that the
// per-action cleanup in `lib/admin/storage.ts` can't catch. A file is removed ONLY
// when BOTH are true:
//   1. UNUSED  — referenced by NONE of the keep-list columns (rebuilt fresh from the
//                DB on every run, so it always reflects the live data).
//   2. OLD ENOUGH — older than the caller's safety buffer, so a freshly-uploaded-but-
//                   not-yet-saved file is never deleted.
//
// SCOPE: only the 6 PUBLIC buckets below. The private `payment-receipts` and
// `bulk-attachments` buckets (financial/legal records) are never listed or touched.
//
// Server-only. Never throws — returns an `error` string instead, so a cron tick or
// an admin click can report failure without crashing.

import { createAdminClient } from "@/lib/supabase/admin";
import { parseStorageUrl } from "@/lib/admin/storage";

/** Safety buffers. Manual button is conservative; the unwatched auto-run more so. */
export const MANUAL_BUFFER_MS = 24 * 60 * 60 * 1000; // 24 hours
export const AUTO_BUFFER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Supabase inserts this 0-byte marker when an empty folder is created. Ignore it. */
const FOLDER_PLACEHOLDER = ".emptyFolderPlaceholder";

const PAGE_SIZE = 100;
const DELETE_CHUNK = 100;

export interface SweepFile {
  bucket: string;
  path: string;
  size: number;
  /** Public URL, for rendering/viewing the image. */
  url: string;
}

export interface SweepResult {
  files: SweepFile[];
  totalBytes: number;
  /** Total files scanned across all public buckets (for sanity / logging). */
  scanned: number;
  error?: string;
}

export interface SweepDeleteResult {
  deleted: number;
  bytes: number;
  error?: string;
}

export interface SingleDeleteResult {
  ok: boolean;
  /** Set when the file was not deleted because it is no longer an orphan. */
  notOrphan?: boolean;
  error?: string;
}

/**
 * The 6 public buckets and how to build each one's keep-list — the set of object
 * paths that ARE referenced by a live DB row. Anything in the bucket but not in this
 * set (and old enough) is an orphan.
 */
const BUCKETS = [
  "product-images",
  "brand-images",
  "category-images",
  "banner-images",
  "review-images",
  "site-assets",
] as const;

type Bucket = (typeof BUCKETS)[number];

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Build the keep-list: a map of bucket → set of decoded object paths still referenced
 * by the DB. Rebuilt fresh on every sweep so it always reflects current data.
 */
async function buildKeepList(db: ReturnType<typeof createAdminClient>): Promise<Map<Bucket, Set<string>>> {
  const keep = new Map<Bucket, Set<string>>();
  for (const b of BUCKETS) keep.set(b, new Set<string>());

  const add = (url: string | null | undefined) => {
    if (!url) return;
    const parsed = parseStorageUrl(url);
    if (!parsed) return;
    const set = keep.get(parsed.bucket as Bucket);
    if (set) set.add(parsed.path); // parseStorageUrl returns a decoded path
  };

  // Each reference column for the public buckets. Column names verified against
  // supabase/migrations/001 (note: product_images & review_images use `url`, the
  // others use `image_url`).
  const [productImages, brands, categories, banners, reviewImages, settings] = await Promise.all([
    db.from("product_images").select("url"),
    db.from("brands").select("image_url"),
    db.from("categories").select("image_url"),
    db.from("banners").select("image_url"),
    db.from("review_images").select("url"),
    db.from("settings").select("key, value").in("key", ["shop_info", "seo"]),
  ]);

  for (const r of (productImages.data as any[]) ?? []) add(r.url);
  for (const r of (brands.data as any[]) ?? []) add(r.image_url);
  for (const r of (categories.data as any[]) ?? []) add(r.image_url);
  for (const r of (banners.data as any[]) ?? []) add(r.image_url);
  for (const r of (reviewImages.data as any[]) ?? []) add(r.url);

  for (const row of (settings.data as any[]) ?? []) {
    const value = row.value ?? {};
    if (row.key === "shop_info") add(value.logo_url);
    if (row.key === "seo") add(value.og_image_url);
  }

  return keep;
}

interface ListedFile {
  path: string;
  size: number;
  ageMs: number | null; // null = unknown timestamp → treated as not-old-enough
}

/** Recursively list every real file in a bucket (handles the `productId/` subfolders). */
async function listAllFiles(
  db: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix = ""
): Promise<ListedFile[]> {
  const out: ListedFile[] = [];
  let offset = 0;
  const now = Date.now();

  for (;;) {
    const { data, error } = await db.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data as any[]) {
      if (entry.name === FOLDER_PLACEHOLDER) continue;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A folder has no `id`/`metadata` — recurse into it.
      if (entry.id == null && entry.metadata == null) {
        out.push(...(await listAllFiles(db, bucket, path)));
        continue;
      }
      const created = entry.created_at ?? entry.updated_at ?? null;
      const ts = created ? new Date(created).getTime() : NaN;
      out.push({
        path,
        size: Number(entry.metadata?.size) || 0,
        ageMs: Number.isNaN(ts) ? null : now - ts,
      });
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return out;
}

/**
 * Scan all 6 public buckets and return the orphan files (unused AND older than
 * `bufferMs`). Read-only — deletes nothing. Used by the admin preview.
 */
export async function findOrphanImages(bufferMs: number): Promise<SweepResult> {
  try {
    const db = createAdminClient();
    const keep = await buildKeepList(db);

    const files: SweepFile[] = [];
    let totalBytes = 0;
    let scanned = 0;

    for (const bucket of BUCKETS) {
      const listed = await listAllFiles(db, bucket);
      scanned += listed.length;
      const keepSet = keep.get(bucket)!;
      for (const f of listed) {
        const unused = !keepSet.has(f.path);
        const oldEnough = f.ageMs != null && f.ageMs >= bufferMs;
        if (unused && oldEnough) {
          const { data } = db.storage.from(bucket).getPublicUrl(f.path);
          files.push({ bucket, path: f.path, size: f.size, url: data.publicUrl });
          totalBytes += f.size;
        }
      }
    }

    return { files, totalBytes, scanned };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Storage sweep failed.";
    console.error("[storage-sweep] scan failed:", message);
    return { files: [], totalBytes: 0, scanned: 0, error: message };
  }
}

/**
 * Delete a SINGLE file, but only after re-confirming (fresh keep-list) that it is
 * still a genuine orphan older than `bufferMs`. If it became referenced since the
 * scan, it is left untouched (`notOrphan: true`) — the safety guarantee holds even
 * for a hand-picked delete.
 */
export async function deleteOrphanImage(
  bucket: string,
  path: string,
  bufferMs: number
): Promise<SingleDeleteResult> {
  const scan = await findOrphanImages(bufferMs);
  if (scan.error) return { ok: false, error: scan.error };

  const match = scan.files.find((f) => f.bucket === bucket && f.path === path);
  if (!match) return { ok: false, notOrphan: true, error: "This image is in use or was already removed." };

  try {
    const db = createAdminClient();
    const { error } = await db.storage.from(bucket).remove([path]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    console.error("[storage-sweep] single delete failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Re-scan (fresh keep-list) and delete the orphan files older than `bufferMs`.
 *
 * Deliberately re-scans rather than trusting a previously-shown preview, so a file
 * that became referenced between preview and confirm is never deleted.
 */
export async function deleteOrphanImages(bufferMs: number): Promise<SweepDeleteResult> {
  const scan = await findOrphanImages(bufferMs);
  if (scan.error) return { deleted: 0, bytes: 0, error: scan.error };
  if (scan.files.length === 0) return { deleted: 0, bytes: 0 };

  try {
    const db = createAdminClient();
    const byBucket = new Map<string, SweepFile[]>();
    for (const f of scan.files) {
      const arr = byBucket.get(f.bucket) ?? [];
      arr.push(f);
      byBucket.set(f.bucket, arr);
    }

    let deleted = 0;
    let bytes = 0;
    for (const [bucket, items] of byBucket) {
      for (let i = 0; i < items.length; i += DELETE_CHUNK) {
        const chunk = items.slice(i, i + DELETE_CHUNK);
        const { error } = await db.storage.from(bucket).remove(chunk.map((c) => c.path));
        if (error) {
          console.error(`[storage-sweep] delete ${bucket}:`, error.message);
          continue; // leave this chunk for the next run; keep going
        }
        deleted += chunk.length;
        bytes += chunk.reduce((s, c) => s + c.size, 0);
      }
    }

    return { deleted, bytes };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Storage sweep delete failed.";
    console.error("[storage-sweep] delete failed:", message);
    return { deleted: 0, bytes: 0, error: message };
  }
}
