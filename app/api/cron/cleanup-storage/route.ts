// Weekly orphan-image storage sweep (automatic run).
//
// Deletes unused public-bucket images older than the 7-day auto buffer — but ONLY
// when the `storage_cleanup` setting is enabled (default OFF). The longer buffer is
// because nobody watches this run; the admin button uses a 24h buffer with a preview.
//
// SECURITY: requires `Authorization: Bearer <CRON_SECRET>`.
// SCHEDULING: weekly via Vercel Cron (see vercel.json) — wired at deploy.

import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { deleteOrphanImages, AUTO_BUFFER_MS } from "@/lib/admin/storage-sweep";

interface StorageCleanupSettings {
  enabled: boolean;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function run() {
  const setting = await getSetting<StorageCleanupSettings>("storage_cleanup", { enabled: false });
  if (!setting.enabled) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  const res = await deleteOrphanImages(AUTO_BUFFER_MS);
  if (res.error) {
    console.error("[cleanup-storage] failed:", res.error);
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }
  console.log(`[cleanup-storage] deleted ${res.deleted} files (${res.bytes} bytes).`);
  return NextResponse.json({ ok: true, deleted: res.deleted, bytes: res.bytes });
}

function guard(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();
  return null;
}

export async function POST(request: Request) {
  return guard(request) ?? run();
}

export async function GET(request: Request) {
  return guard(request) ?? run();
}
