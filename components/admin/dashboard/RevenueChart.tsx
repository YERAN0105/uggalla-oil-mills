"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/brand";
import { formatInColombo } from "@/lib/date";
import { Panel } from "@/components/admin/primitives";
import type { RevenuePoint } from "@/lib/admin/dashboard";

const RANGES = [
  { key: "7", label: "7d" },
  { key: "30", label: "30d" },
  { key: "90", label: "90d" },
  { key: "365", label: "12mo" },
] as const;

export function RevenueChart({
  series,
  onRangeChange,
}: {
  series: Record<string, RevenuePoint[]>;
  onRangeChange?: (key: string) => void;
}) {
  const [range, setRange] = useState<string>("30");
  const data = series[range] ?? [];

  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-green-deep">Revenue</h2>
        <div className="flex gap-1 rounded-lg bg-sand/60 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setRange(r.key);
                onRangeChange?.(r.key);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                range === r.key ? "bg-white text-green-deep shadow-sm" : "text-muted-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B6B3A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1B6B3A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0D9C5" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatInColombo(`${d}T00:00:00`, "d MMM")}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Revenue"]}
              labelFormatter={(d) => formatInColombo(`${d}T00:00:00`, "d MMM yyyy")}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E0D9C5",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#1B6B3A"
              strokeWidth={2}
              fill="url(#revFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
