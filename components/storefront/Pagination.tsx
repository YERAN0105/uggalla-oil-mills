"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export function Pagination({ totalCount, pageSize, currentPage }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) return null;

  const makeUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  const pagesWithEllipsis: (number | "…")[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      pagesWithEllipsis.push("…");
    }
    pagesWithEllipsis.push(pages[i]);
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-8" aria-label="Pagination">
      {/* Prev */}
      {currentPage > 1 ? (
        <Link
          href={makeUrl(currentPage - 1)}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-sand hover:border-green/40 hover:bg-sand transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="h-9 w-9 flex items-center justify-center rounded-lg border border-sand opacity-40 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {/* Pages */}
      {pagesWithEllipsis.map((page, idx) =>
        page === "…" ? (
          <span key={`ellipsis-${idx}`} className="h-9 w-9 flex items-center justify-center text-muted-foreground text-sm">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={makeUrl(page)}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
              page === currentPage
                ? "bg-green text-white"
                : "border border-sand hover:border-green/40 hover:bg-sand text-green-deep"
            )}
          >
            {page}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={makeUrl(currentPage + 1)}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-sand hover:border-green/40 hover:bg-sand transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="h-9 w-9 flex items-center justify-center rounded-lg border border-sand opacity-40 cursor-not-allowed">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}

      <span className="ml-4 text-xs text-muted-foreground">
        Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
      </span>
    </nav>
  );
}
