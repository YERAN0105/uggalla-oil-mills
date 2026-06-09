"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { DropletSVG } from "@/components/shared/DropletSVG";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <Container size="narrow">
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-32 h-32" aria-hidden="true">
              <div className="absolute inset-0 flex items-center justify-center">
                <DropletSVG size={100} className="text-destructive/20" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-4xl font-bold text-destructive/40">!</span>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold text-green-deep">
                Something went wrong
              </h1>
              <p className="text-muted-foreground max-w-sm mx-auto">
                An unexpected error occurred. Please try again or return home.
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} size="lg">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/">
                  <Home className="h-4 w-4" /> Go Home
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </body>
    </html>
  );
}
