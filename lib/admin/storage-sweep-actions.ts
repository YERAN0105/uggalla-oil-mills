"use server";

import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import {
  findOrphanImages,
  deleteOrphanImage,
  deleteOrphanImages,
  MANUAL_BUFFER_MS,
} from "@/lib/admin/storage-sweep";
import type { SweepFile } from "@/lib/admin/storage-sweep";
import type { ActionResult } from "@/types/admin";

export interface OrphanPreview {
  files: SweepFile[];
  count: number;
  totalBytes: number;
  scanned: number;
}

/** Read-only: the orphan images (with public URLs) older than the 24h manual buffer. */
export async function previewOrphanImages(): Promise<ActionResult<OrphanPreview>> {
  await requireAdmin();
  const res = await findOrphanImages(MANUAL_BUFFER_MS);
  if (res.error) return { ok: false, error: res.error };
  return {
    ok: true,
    data: { files: res.files, count: res.files.length, totalBytes: res.totalBytes, scanned: res.scanned },
  };
}

/** Delete a single hand-picked orphan (re-verified as unused + old enough before removal). */
export async function deleteOrphanImageAction(
  bucket: string,
  path: string
): Promise<ActionResult<{ bucket: string; path: string }>> {
  const admin = await requireAdmin();
  const res = await deleteOrphanImage(bucket, path, MANUAL_BUFFER_MS);
  if (!res.ok) return { ok: false, error: res.error ?? "Delete failed." };
  await logActivity(admin.id, {
    action: "storage.cleanup",
    targetTable: "storage",
    metadata: { deleted: 1, bucket, path, trigger: "manual_single" },
  });
  return { ok: true, data: { bucket, path } };
}

/** Delete all orphan images older than the 24h manual buffer (re-scans before deleting). */
export async function cleanupOrphanImages(): Promise<ActionResult<{ deleted: number; bytes: number }>> {
  const admin = await requireAdmin();
  const res = await deleteOrphanImages(MANUAL_BUFFER_MS);
  if (res.error) return { ok: false, error: res.error };
  await logActivity(admin.id, {
    action: "storage.cleanup",
    targetTable: "storage",
    metadata: { deleted: res.deleted, bytes: res.bytes, trigger: "manual" },
  });
  return { ok: true, data: { deleted: res.deleted, bytes: res.bytes } };
}
