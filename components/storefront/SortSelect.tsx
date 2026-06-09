"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption } from "@/lib/products";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "popularity", label: "Popularity" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const current = (searchParams.get("sort") as SortOption) ?? "newest";

  const handleChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", value);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px] h-9 text-sm" aria-label="Sort products">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
