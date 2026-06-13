"use client";

import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generic drag-to-reorder list using native HTML5 drag events (no extra deps).
 * Parent owns the `items` array and persists the new order in `onReorder`.
 * `renderItem` receives a drag-handle node to place wherever it likes.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (ordered: T[]) => void;
  renderItem: (item: T, handle: ReactNode) => ReactNode;
  className?: string;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const move = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((i) => i.id === dragId);
    const to = items.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <div className={className}>
      {items.map((item) => {
        const handle = (
          <span
            className="cursor-grab touch-none text-muted-foreground hover:text-green-deep active:cursor-grabbing"
            aria-hidden
          >
            <GripVertical className="h-4 w-4" />
          </span>
        );
        return (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDragId(item.id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(item.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              move(item.id);
              setDragId(null);
              setOverId(null);
            }}
            className={cn(
              "transition-all",
              dragId === item.id && "opacity-40",
              overId === item.id && dragId !== item.id && "ring-2 ring-green/40"
            )}
          >
            {renderItem(item, handle)}
          </div>
        );
      })}
    </div>
  );
}
