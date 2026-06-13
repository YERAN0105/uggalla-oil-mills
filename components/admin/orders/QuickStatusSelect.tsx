"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatus } from "@/lib/admin/orders";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

const STATUS_KEYS = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "refunded",
];

export function QuickStatusSelect({
  orderId,
  status,
  className,
}: {
  orderId: string;
  status: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, setPending] = useState(false);

  const onChange = async (next: string) => {
    const prev = value;
    setValue(next);
    setPending(true);
    const res = await updateOrderStatus(orderId, next);
    setPending(false);
    if (!res.ok) {
      setValue(prev);
      toast.error(res.error);
      return;
    }
    if (res.data && res.data.earnedPoints > 0) {
      toast.success(`Customer earned ${res.data.earnedPoints} loyalty points`);
    } else {
      toast.success("Order status updated");
    }
    router.refresh();
  };

  return (
    <select
      value={value}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 rounded-lg border border-sand bg-white px-2 text-xs font-medium text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green disabled:opacity-50",
        className
      )}
    >
      {STATUS_KEYS.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
