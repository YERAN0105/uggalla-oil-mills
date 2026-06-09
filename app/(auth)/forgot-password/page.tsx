"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { forgotPassword } from "@/app/(auth)/actions";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await forgotPassword(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md shadow-xl border-sand text-center">
        <CardContent className="pt-10 pb-8 space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-sage/40 flex items-center justify-center">
            <Mail className="h-7 w-7 text-green" />
          </div>
          <h2 className="font-display text-2xl text-green-deep">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            We&apos;ve sent a password reset link. Check your inbox (and spam folder).
          </p>
          <Button variant="outline" asChild className="mt-2">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-sand">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="font-display text-2xl text-green-deep">Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@email.com"
              required
              autoComplete="email"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending} size="lg">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send Reset Link
          </Button>
        </form>

        <Button variant="ghost" className="w-full" asChild>
          <Link href="/login">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
