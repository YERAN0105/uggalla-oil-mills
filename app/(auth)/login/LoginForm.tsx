"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, signInWithGoogle } from "@/app/(auth)/actions";
import { isGoogleAuthEnabled } from "@/lib/integrations";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const resetSuccess = searchParams.get("reset") === "success";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("redirect", redirect);

    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) setError(result.error);
    });
  }

  async function handleGoogleSignIn() {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGoogle();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-sand">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="font-display text-2xl text-green-deep">Welcome back</CardTitle>
        <CardDescription>Sign in to your Uggalla Oil Mills account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {resetSuccess && (
          <div className="rounded-lg bg-sage/40 border border-sage px-4 py-3 text-sm text-green-deep">
            Password updated successfully. Please sign in.
          </div>
        )}

        {isGoogleAuthEnabled && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignIn}
              disabled={isPending}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-sand" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or sign in with email</span>
              </div>
            </div>
          </>
        )}

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
              className={cn(error && "border-destructive")}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-green hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={cn("pr-10", error && "border-destructive")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending} size="lg">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-green font-medium hover:underline">
            Create one
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-green transition-colors">
            Continue as guest →
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
