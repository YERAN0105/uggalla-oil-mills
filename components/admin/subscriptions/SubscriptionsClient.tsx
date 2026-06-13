"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Pause, Play, Ban, Bell, CalendarClock, Loader2, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminPageHeader, AdminEmpty, Panel, Field } from "@/components/admin/primitives";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/date";
import { INTERVAL_LABEL } from "@/lib/orders/status";
import {
  setSubscriptionStatus,
  setNextReminderDate,
  triggerReminder,
} from "@/lib/admin/subscriptions";
import type { AdminSubscriptionRow } from "@/types/admin";
import type { SubscriptionStats } from "@/lib/admin/subscriptions-data";

export function SubscriptionsClient({
  rows,
  stats,
  params,
}: {
  rows: AdminSubscriptionRow[];
  stats: SubscriptionStats;
  params: Record<string, unknown>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [date, setDate] = useState("");

  const setParam = (updates: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged = { ...params, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && v !== null) usp.set(k, String(v));
    }
    startTransition(() => router.push(`${pathname}?${usp.toString()}`));
  };

  const run = async (id: string, fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => {
    setPendingId(id);
    const res = await fn();
    setPendingId(null);
    if (!res.ok) return toast.error(res.error ?? "Failed.");
    toast.success(msg);
    router.refresh();
  };

  const reschedule = async () => {
    if (!rescheduleId || !date) return;
    setPendingId(rescheduleId);
    const res = await setNextReminderDate(rescheduleId, date);
    setPendingId(null);
    if (!res.ok) return toast.error(res.error);
    setRescheduleId(null);
    setDate("");
    toast.success("Reminder rescheduled.");
    router.refresh();
  };

  const selectClass =
    "h-9 rounded-lg border border-sand bg-white px-2 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green";

  return (
    <>
      <AdminPageHeader title="Subscriptions" description="Reorder reminders (no auto-charge)." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active" value={stats.active} />
        <Stat label="Paused" value={stats.paused} />
        <Stat label="Cancelled" value={stats.cancelled} />
        <Stat label="Reminders sent" value={stats.remindersSent} />
      </div>

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={(params.status as string) || ""}
            onChange={(e) => setParam({ status: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={(params.interval as string) || ""}
            onChange={(e) => setParam({ interval: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Any frequency</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </Panel>

      {rows.length === 0 ? (
        <AdminEmpty icon={<Repeat className="h-7 w-7" />} title="No subscriptions" />
      ) : (
        <Panel className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="hidden sm:table-cell">Frequency</TableHead>
                <TableHead>Next reminder</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm font-medium text-green-deep">
                    {s.customer_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.product_name}
                    {s.size_label && (
                      <span className="text-muted-foreground"> · {s.size_label}</span>
                    )}
                    <span className="text-muted-foreground"> ×{s.quantity}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {INTERVAL_LABEL[s.interval] ?? s.interval}
                  </TableCell>
                  <TableCell className="text-sm">{formatShortDate(s.next_reminder_date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status === "active" ? "sage" : s.status === "cancelled" ? "destructive" : "secondary"
                      }
                      className="text-[10px] capitalize"
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {pendingId === s.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {s.status === "active" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Send reminder now"
                          onClick={() => run(s.id, () => triggerReminder(s.id), "Reminder triggered.")}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Reschedule"
                        onClick={() => {
                          setRescheduleId(s.id);
                          setDate(s.next_reminder_date);
                        }}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                      {s.status === "active" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Pause"
                          onClick={() => run(s.id, () => setSubscriptionStatus(s.id, "paused"), "Paused.")}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : s.status === "paused" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Resume"
                          onClick={() => run(s.id, () => setSubscriptionStatus(s.id, "active"), "Resumed.")}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {s.status !== "cancelled" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Cancel"
                          className="text-red-600"
                          onClick={() => run(s.id, () => setSubscriptionStatus(s.id, "cancelled"), "Cancelled.")}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <Dialog open={!!rescheduleId} onOpenChange={(o) => !o && setRescheduleId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reschedule reminder</DialogTitle>
          </DialogHeader>
          <Field label="Next reminder date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRescheduleId(null)}>
              Cancel
            </Button>
            <Button onClick={reschedule} disabled={!date || !!pendingId}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Panel>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-green-deep">{value}</p>
    </Panel>
  );
}
