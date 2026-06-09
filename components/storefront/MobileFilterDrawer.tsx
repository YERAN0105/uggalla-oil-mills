"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilterSidebar } from "@/components/storefront/FilterSidebar";
import type { Category, Brand } from "@/types/supabase";

interface MobileFilterDrawerProps {
  categories: Category[];
  brands: Brand[];
  availableSizes: string[];
}

export function MobileFilterDrawer({
  categories,
  brands,
  availableSizes,
}: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
        aria-label="Open filters"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter Products</DialogTitle>
          </DialogHeader>
          <FilterSidebar
            categories={categories}
            brands={brands}
            availableSizes={availableSizes}
          />
          <Button className="mt-4 w-full" onClick={() => setOpen(false)}>
            Apply Filters
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
