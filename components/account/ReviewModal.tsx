"use client";

import { useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Star, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { submitReview, updateReview } from "@/lib/reviews/actions";

type CreateProps = {
  mode: "create";
  orderItemId: string;
  productId: string;
  productName: string;
  reviewId?: undefined;
  initial?: undefined;
};
type EditProps = {
  mode: "edit";
  reviewId: string;
  productName: string;
  initial: { rating: number; title: string; body: string };
  orderItemId?: undefined;
  productId?: undefined;
};

type Props = (CreateProps | EditProps) & { trigger: ReactNode };

const MAX_IMAGES = 3;

export function ReviewModal(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(props.mode === "edit" ? props.initial.rating : 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(props.mode === "edit" ? props.initial.title : "");
  const [body, setBody] = useState(props.mode === "edit" ? props.initial.body : "");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_IMAGES));
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (props.mode === "create") {
        const fd = new FormData();
        fd.set("orderItemId", props.orderItemId);
        fd.set("productId", props.productId);
        fd.set("rating", String(rating));
        fd.set("title", title);
        fd.set("body", body);
        files.forEach((f) => fd.append("images", f));
        const res = await submitReview(fd);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        toast.success("Thanks! Your review will be visible after moderation.");
      } else {
        const res = await updateReview(props.reviewId, { rating, title, body });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        toast.success("Review updated.");
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{props.mode === "edit" ? "Edit your review" : "Write a review"}</DialogTitle>
          <DialogDescription>{props.productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stars */}
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={rating === s}
                aria-label={`${s} star${s === 1 ? "" : "s"}`}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                className="p-0.5"
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-colors",
                    s <= (hover || rating) ? "fill-gold text-gold" : "fill-sand text-sand"
                  )}
                />
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="review-title">Title (optional)</Label>
            <Input
              id="review-title"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum it up in a few words"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="review-body">Review (optional)</Label>
            <Textarea
              id="review-body"
              value={body}
              maxLength={1000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you think of the oil?"
              rows={4}
              className="mt-1"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{body.length}/1000</p>
          </div>

          {/* Images (create only) */}
          {props.mode === "create" && (
            <div>
              <Label>Photos (optional)</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-green-deep/70 p-0.5 text-white"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {files.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-sand text-muted-foreground hover:border-green/40"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-[10px]">Add</span>
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Up to 3 images · JPG, PNG or WEBP</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {props.mode === "edit" ? "Save changes" : "Submit review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
