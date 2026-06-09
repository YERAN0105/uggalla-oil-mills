"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPassword } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-sand">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="font-display text-2xl text-green-deep">New password</CardTitle>
        <CardDescription>Choose a strong password for your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className={cn("pr-10", error && "border-destructive")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repeat password"
              required
              autoComplete="new-password"
              className={cn(error && "border-destructive")}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending} size="lg">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
