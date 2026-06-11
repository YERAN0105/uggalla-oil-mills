"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileSchema } from "@/lib/account/schema";
import { updateProfile, deleteAccount } from "@/lib/account/actions";

interface Props {
  initial: { name: string; email: string; phone: string };
}

export function ProfileForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial.name,
    email: initial.email,
    phone: initial.phone,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Account deletion
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const parsed = useMemo(() => profileSchema.safeParse(form), [form]);
  const errors: Record<string, string[]> = parsed.success ? {} : parsed.error.flatten().fieldErrors;
  const errFor = (field: string) =>
    touched.has(field) || submitted ? errors[field]?.[0] : undefined;

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const blur = (key: string) => setTouched((t) => new Set(t).add(key));

  const handleSave = async () => {
    setSubmitted(true);
    if (!parsed.success) return;
    setSaving(true);
    try {
      const res = await updateProfile(form);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.emailChanged
          ? "Saved. Check your new inbox to confirm the email change."
          : "Profile updated."
      );
      setForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
      setSubmitted(false);
      setTouched(new Set());
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePassword) {
      toast.error("Enter your password to confirm.");
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteAccount(deletePassword);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Your account has been deleted.");
      router.push("/");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Details */}
      <div className="rounded-2xl border border-sand bg-white p-5">
        <h2 className="mb-4 font-display text-lg text-green-deep">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block">Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => blur("name")} />
            {errFor("name") && <p className="mt-1 text-xs text-red-600">{errFor("name")}</p>}
          </div>
          <div>
            <Label className="mb-1 block">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() => blur("phone")}
              placeholder="+947XXXXXXXX"
            />
            {errFor("phone") && <p className="mt-1 text-xs text-red-600">{errFor("phone")}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1 block">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => blur("email")}
            />
            {errFor("email") && <p className="mt-1 text-xs text-red-600">{errFor("email")}</p>}
            {form.email.toLowerCase() !== initial.email.toLowerCase() && (
              <p className="mt-1 text-xs text-gold-warm">
                You&apos;ll need to confirm your new email before it takes effect.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-sand bg-white p-5">
        <h2 className="mb-1 font-display text-lg text-green-deep">Change password</h2>
        <p className="mb-4 text-sm text-muted-foreground">Leave blank to keep your current password.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-1 block">Current password</Label>
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => set("currentPassword", e.target.value)}
              onBlur={() => blur("currentPassword")}
              autoComplete="current-password"
            />
            {errFor("currentPassword") && (
              <p className="mt-1 text-xs text-red-600">{errFor("currentPassword")}</p>
            )}
          </div>
          <div>
            <Label className="mb-1 block">New password</Label>
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => set("newPassword", e.target.value)}
              onBlur={() => blur("newPassword")}
              autoComplete="new-password"
            />
            {errFor("newPassword") && <p className="mt-1 text-xs text-red-600">{errFor("newPassword")}</p>}
          </div>
          <div>
            <Label className="mb-1 block">Confirm password</Label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              onBlur={() => blur("confirmPassword")}
              autoComplete="new-password"
            />
            {errFor("confirmPassword") && (
              <p className="mt-1 text-xs text-red-600">{errFor("confirmPassword")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Delete account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This deactivates your account and removes access. Your past orders are retained for our records.
          This action cannot be undone.
        </p>
        <Button variant="destructive" className="mt-4" onClick={() => setDeleteOpen(true)}>
          Delete my account
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Enter your password to confirm. You&apos;ll be signed out and won&apos;t be able to sign back in.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="mb-1 block">Password</Label>
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Permanently delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
