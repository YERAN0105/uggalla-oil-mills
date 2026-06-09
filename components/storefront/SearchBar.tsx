"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/brand";
import { getMinPrice, getPrimaryImage } from "@/lib/product-utils";
import type { ProductWithRelations } from "@/types/supabase";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  fullWidth?: boolean;
  onNavigate?: () => void;
}

export function SearchBar({ className, fullWidth = false, onNavigate }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductWithRelations[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (fullWidth) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fullWidth]);

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceTimer.current);
    if (!value.trim()) { setResults([]); return; }
    debounceTimer.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
          if (res.ok) setResults((await res.json()) as ProductWithRelations[]);
        } catch {
          setResults([]);
        }
      });
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery("");
      setResults([]);
      onNavigate?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); setQuery(""); setResults([]); }
  };

  const close = () => { setOpen(false); setQuery(""); setResults([]); onNavigate?.(); };

  const showDropdown = (open || fullWidth) && query.trim().length > 0;

  // Pill-shaped input — no border, sand background avoids all browser focus-rectangle issues
  const inputForm = (
    <form onSubmit={handleSubmit} role="search">
      <div className="flex items-center bg-sand rounded-full transition-colors focus-within:bg-sand/80">
        {!fullWidth && <Search className="h-4 w-4 ml-4 flex-shrink-0 text-green/70" />}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search products…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-1 px-3 py-2 text-sm bg-transparent outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-green-deep placeholder:text-green-deep/40 min-w-0",
            fullWidth && "pl-5"
          )}
          aria-label="Search products"
          autoComplete="off"
        />
        {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin text-green" />}
        {!fullWidth && (
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="mr-2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-green/10 transition-colors text-green-deep/40 hover:text-green"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {fullWidth && (
          <button
            type="submit"
            disabled={!query.trim()}
            aria-label="Search"
            className="mr-1 my-1 h-8 px-4 flex items-center justify-center rounded-full bg-green text-white text-sm font-medium transition-colors hover:bg-green-deep disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );

  const dropdown = (
    <AnimatePresence>
      {showDropdown && (
        <m.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-sand rounded-2xl shadow-xl z-50 overflow-hidden"
          role="listbox"
          aria-label="Search suggestions"
        >
          {results.length > 0 ? (
            <>
              {results.map((product) => {
                const img = getPrimaryImage(product);
                const price = getMinPrice(product);
                return (
                  <Link
                    key={product.id}
                    href={`/shop/${product.slug}`}
                    onClick={close}
                    className="flex items-center gap-3 p-3 hover:bg-sand/50 transition-colors"
                    role="option"
                  >
                    <div className="relative h-10 w-10 rounded-xl bg-sand/40 flex-shrink-0 overflow-hidden">
                      {img ? (
                        <Image src={img.url} alt={img.alt_text ?? product.name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-lg">🥥</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-deep truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.categories.name} ·{" "}
                        {product.purchase_type === "bulk_quote" ? "Request Quote" : formatCurrency(price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
              <Link
                href={`/shop?q=${encodeURIComponent(query)}`}
                onClick={close}
                className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-green hover:bg-sand/50 transition-colors border-t border-sand"
              >
                View all results for &ldquo;{query}&rdquo;
                <Search className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No products found for &ldquo;{query}&rdquo;
            </div>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );

  // Mobile drawer: static full-width pill
  if (fullWidth) {
    return (
      <div ref={containerRef} className={cn("relative w-full", className)}>
        {inputForm}
        {dropdown}
      </div>
    );
  }

  // Desktop header: icon that expands into a pill
  return (
    <div ref={containerRef} className={cn("relative h-9 w-9 flex-shrink-0", className)}>
      {/* Toggle — always in DOM, invisible when open so height never shifts */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Search products"
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full transition-colors hover:bg-sand text-green-deep/60 hover:text-green",
          open && "opacity-0 pointer-events-none"
        )}
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Expanded pill — absolutely positioned, no layout shift */}
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ width: 36, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 36, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="absolute right-0 top-0"
          >
            {inputForm}
            {dropdown}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
