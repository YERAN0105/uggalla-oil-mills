"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, ExternalLink, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/primitives";
import {
  previewOrphanImages,
  deleteOrphanImageAction,
  cleanupOrphanImages,
} from "@/lib/admin/storage-sweep-actions";
import type { SweepFile } from "@/lib/admin/storage-sweep";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const fileKey = (f: SweepFile) => `${f.bucket}/${f.path}`;
const fileName = (f: SweepFile) => f.path.split("/").pop() || f.path;

export function OrphanCleanup() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [files, setFiles] = useState<SweepFile[]>([]);

  const [pendingDelete, setPendingDelete] = useState<SweepFile | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const totalBytes = files.reduce((s, f) => s + f.size, 0);

  const handleScan = async () => {
    setScanning(true);
    const res = await previewOrphanImages();
    setScanning(false);
    if (!res.ok) return toast.error(res.error ?? "Scan failed.");
    if (!res.data || res.data.count === 0) {
      toast.success("No unused images found — storage is clean.");
      return;
    }
    setFiles(res.data.files);
    setGalleryOpen(true);
  };

  const confirmSingleDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeletingKey(fileKey(target));
    const res = await deleteOrphanImageAction(target.bucket, target.path);
    setDeletingKey(null);
    setPendingDelete(null);
    if (!res.ok) {
      toast.error(res.error ?? "Delete failed.");
      return;
    }
    setFiles((prev) => {
      const next = prev.filter((f) => fileKey(f) !== fileKey(target));
      if (next.length === 0) setGalleryOpen(false);
      return next;
    });
    toast.success("Image deleted.");
    router.refresh();
  };

  const confirmDeleteAll = async () => {
    setDeletingAll(true);
    const res = await cleanupOrphanImages();
    setDeletingAll(false);
    setConfirmAllOpen(false);
    if (!res.ok) {
      toast.error(res.error ?? "Cleanup failed.");
      return;
    }
    const deleted = res.data?.deleted ?? 0;
    setFiles([]);
    setGalleryOpen(false);
    toast.success(
      deleted === 0
        ? "Nothing to delete — files were already in use."
        : `Deleted ${deleted} unused ${deleted === 1 ? "file" : "files"} (${formatBytes(res.data?.bytes ?? 0)}).`
    );
    router.refresh();
  };

  return (
    <>
      <Button onClick={handleScan} disabled={scanning} variant="outline" className="gap-2">
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {scanning ? "Scanning…" : "Scan for unused images"}
      </Button>

      {/* Gallery of orphan images */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent
          className="max-w-3xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Unused images</DialogTitle>
            <DialogDescription>
              {files.length} unused {files.length === 1 ? "file" : "files"} · {formatBytes(totalBytes)}.
              Hover an image (or tap on mobile) to view or delete it.
            </DialogDescription>
          </DialogHeader>

          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <ImageOff className="h-6 w-6" />
              No unused images.
            </div>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto py-1 pr-1 sm:grid-cols-3 md:grid-cols-4">
              {files.map((f) => {
                const key = fileKey(f);
                const isDeleting = deletingKey === key;
                return (
                  <div
                    key={key}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-sand bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.url}
                      alt={fileName(f)}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />

                    {/* Action overlay: appears on hover/focus (desktop), always shown on phones */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-green-deep/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100">
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-green-deep shadow-sm transition hover:bg-cream"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(f)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>

                    {/* Size caption */}
                    <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-green-deep/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Only files older than 24 hours are listed.
            </span>
            <Button
              variant="destructive"
              onClick={() => setConfirmAllOpen(true)}
              disabled={files.length === 0 || deletingAll}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single-image delete confirmation */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this image?"
        description={
          pendingDelete
            ? `“${fileName(pendingDelete)}” (${formatBytes(pendingDelete.size)}) will be permanently deleted from storage. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete image"
        loading={deletingKey !== null}
        onConfirm={confirmSingleDelete}
      />

      {/* Delete-all confirmation */}
      <ConfirmDialog
        open={confirmAllOpen}
        onOpenChange={setConfirmAllOpen}
        title="Delete all unused images?"
        description={`All ${files.length} unused ${
          files.length === 1 ? "file" : "files"
        } (${formatBytes(totalBytes)}) will be permanently deleted from storage. This cannot be undone.`}
        confirmLabel="Delete all"
        loading={deletingAll}
        onConfirm={confirmDeleteAll}
      />
    </>
  );
}
