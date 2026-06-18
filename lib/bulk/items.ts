// Shared, pure helpers for bulk-request line items. No framework imports — safe to
// use from client components, server actions, and notification builders alike.

import type { BulkRequestItem } from "@/types/supabase";

export type { BulkRequestItem };

/** Human label for a single line, e.g. "Coconut Oil — 200 litres". */
export function bulkItemLabel(item: BulkRequestItem): string {
  const name = item.name?.trim() || "Loose coconut oil";
  return `${name} — ${item.quantity} ${item.unit}`;
}

/**
 * Coerce raw JSONB / unknown into a clean BulkRequestItem[]. Falls back to a
 * single line built from legacy scalar columns when `items` is empty (older rows
 * written before the multi-item migration, defensive only — the migration
 * backfills them).
 */
export function normalizeBulkItems(
  raw: unknown,
  legacy?: { product_id: string | null; name: string | null; quantity: number; unit: string }
): BulkRequestItem[] {
  const arr = Array.isArray(raw) ? raw : [];
  const items = arr
    .map((r): BulkRequestItem | null => {
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      const quantity = Number(o.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      return {
        product_id: typeof o.product_id === "string" ? o.product_id : null,
        name: typeof o.name === "string" && o.name.trim() ? o.name : null,
        quantity,
        unit: typeof o.unit === "string" && o.unit ? o.unit : "litres",
      };
    })
    .filter((x): x is BulkRequestItem => x !== null);

  if (items.length === 0 && legacy && Number(legacy.quantity) > 0) {
    return [
      {
        product_id: legacy.product_id,
        name: legacy.name,
        quantity: Number(legacy.quantity),
        unit: legacy.unit || "litres",
      },
    ];
  }
  return items;
}

/** One-line summary for tables / WhatsApp params, e.g. "Coconut Oil 200 litres, Sesame Oil 50 cans". */
export function summarizeBulkItems(items: BulkRequestItem[]): string {
  if (items.length === 0) return "Bulk oil";
  return items
    .map((i) => `${i.name?.trim() || "Loose coconut oil"} ${i.quantity} ${i.unit}`)
    .join(", ");
}

/** Compact "Coconut Oil +2 more" label for the admin list product column. */
export function shortBulkItemsLabel(items: BulkRequestItem[]): string {
  if (items.length === 0) return "—";
  const first = items[0].name?.trim() || "Loose coconut oil";
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
}

/** Order line label for a converted bulk request (single summarizing line). */
export function bulkOrderLineLabel(items: BulkRequestItem[]): string {
  if (items.length === 0) return "Bulk: Loose coconut oil";
  if (items.length === 1) return `Bulk: ${bulkItemLabel(items[0])}`;
  return `Bulk order (${items.length} items): ${summarizeBulkItems(items)}`;
}
