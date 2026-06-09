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

export function SearchBar({ className }: { className?: string }) {
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
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceTimer.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    debounceTimer.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
          if (res.ok) {
            const data = (await res.json()) as ProductWithRelations[];
            setResults(data);
          }
        } catch {
          setResults([]);
        }
      });
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery("");
      setResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setResults([]);
    }
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Toggle button (closed state) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Search products"
          className="flex items-center justify-center h-9 w-9 rounded-md transition-colors hover:bg-sand text-green-deep/70 hover:text-green"
        >
          <Search className="h-5 w-5" />
        </button>
      )}

      {/* Search input (open state) */}
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ width: 36, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 36, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="relative"
          >
            <form onSubmit={handleSubmit} role="search">
              <div className="flex items-center border border-green/30 rounded-lg bg-white overflow-hidden focus-within:border-green focus-within:ring-1 focus-within:ring-green">
                <Search className="h-4 w-4 ml-3 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="Search products…"
                  value={query}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-2 py-2 text-sm bg-transparent outline-none text-green-deep placeholder:text-muted-foreground min-w-0"
                  aria-label="Search products"
                  autoComplete="off"
                />
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-green" />}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    setResults([]);
                  }}
                  className="p-2 hover:text-green transition-colors text-muted-foreground"
                  aria-label="Close search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <m.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-sand rounded-xl shadow-xl z-50 overflow-hidden"
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
                            onClick={() => {
                              setOpen(false);
                              setQuery("");
                              setResults([]);
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-sand/50 transition-colors"
                            role="option"
                          >
                            <div className="relative h-10 w-10 rounded-lg bg-sand/40 flex-shrink-0 overflow-hidden">
                              {img ? (
                                <Image
                                  src={img.url}
                                  alt={img.alt_text ?? product.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-lg">🥥</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-green-deep truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.categories.name} ·{" "}
                                {product.purchase_type === "bulk_quote"
                                  ? "Request Quote"
                                  : formatCurrency(price)}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                      <Link
                        href={`/shop?q=${encodeURIComponent(query)}`}
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                          setResults([]);
                        }}
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
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
