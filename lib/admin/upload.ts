"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Upload a file to a public Supabase Storage bucket from the browser. The admin
 * is authenticated and the storage RLS policies grant `is_admin()` write access,
 * so this works directly from the client without a server round-trip. Returns
 * the public URL.
 */
export async function uploadPublicImage(
  bucket: string,
  file: File,
  prefix = ""
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safePrefix = prefix ? `${prefix.replace(/[^a-zA-Z0-9/_-]/g, "")}/` : "";
  const path = `${safePrefix}${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
