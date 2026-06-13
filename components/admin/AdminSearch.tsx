"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ShoppingBag, Boxes, Users, PackageSearch } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { adminGlobalSearch, type AdminSearchResult } from "@/lib/admin/search";

const TYPE_ICON = {
  product: Boxes,
  order: ShoppingBag,
  customer: Users,
  bulk: PackageSearch,
} as const;

const TYPE_LABEL = {
  product: "Product",
  order: "Order",
  customer: "Customer",
  bulk: "Bulk request",
} as const;

export function AdminSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // cmd+K / ctrl+K to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // debounced search
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      const q = query.trim();
      if (q.length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const r = await adminGlobalSearch(q);
        setResults(r);
        setActive(0);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  const go = (r: AdminSearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(r.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-sand bg-white px-3 text-sm text-muted-foreground transition-colors hover:border-green/40"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded bg-sand px-1.5 py-0.5 text-[10px] font-medium sm:inline">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[15%] max-w-xl translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Admin search</DialogTitle>
          <div className="flex items-center gap-2 border-b border-sand px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && results[active]) {
                  e.preventDefault();
                  go(results[active]);
                }
              }}
              placeholder="Search products, orders, customers, bulk requests…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : results.length === 0 && !pending ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</p>
            ) : (
              results.map((r, i) => {
                const Icon = TYPE_ICON[r.type];
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => go(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      i === active ? "bg-sand" : "hover:bg-sand/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-green" />
                    <span className="flex-1 truncate">
                      <span className="font-medium text-green-deep">{r.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{r.subtitle}</span>
                    </span>
                    <span className="shrink-0 rounded bg-sand px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {TYPE_LABEL[r.type]}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
