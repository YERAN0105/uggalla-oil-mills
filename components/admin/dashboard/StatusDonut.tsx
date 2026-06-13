"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Panel } from "@/components/admin/primitives";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import type { StatusSlice } from "@/lib/admin/dashboard";

const COLORS: Record<string, string> = {
  pending_confirmation: "#E0A92E",
  confirmed: "#CFE0CF",
  preparing: "#9bbf9b",
  out_for_delivery: "#F6C026",
  ready_for_pickup: "#F6C026",
  delivered: "#1B6B3A",
  cancelled: "#dc2626",
  refunded: "#9ca3af",
};

export function StatusDonut({ slices }: { slices: StatusSlice[] }) {
  const data = slices.map((s) => ({
    name: ORDER_STATUS_LABEL[s.status] ?? s.status,
    value: s.count,
    color: COLORS[s.status] ?? "#9ca3af",
  }));

  return (
    <Panel>
      <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Orders by status</h2>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #E0D9C5", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
