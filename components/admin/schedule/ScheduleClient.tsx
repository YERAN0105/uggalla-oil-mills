"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Clock, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminPageHeader, Panel, Field, ConfirmDialog } from "@/components/admin/primitives";
import { formatShortDate } from "@/lib/date";
import { timeSlotSchema, holidaySchema } from "@/lib/admin/schemas";
import {
  saveTimeSlot,
  deleteTimeSlot,
  toggleSlotActive,
  addHoliday,
  deleteHoliday,
  saveLeadTimes,
  type LeadTimes,
} from "@/lib/admin/schedule";
import type { AdminTimeSlot, AdminHoliday } from "@/types/admin";

export function ScheduleClient({
  slots,
  holidays,
  leadTimes,
  categories,
}: {
  slots: AdminTimeSlot[];
  holidays: AdminHoliday[];
  leadTimes: LeadTimes;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();

  // Slots
  const [slotOpen, setSlotOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState({ label: "", start_time: "", end_time: "", capacity: "50", is_active: true });
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [savingSlot, setSavingSlot] = useState(false);
  const [delSlot, setDelSlot] = useState<string | null>(null);

  // Holidays
  const [holForm, setHolForm] = useState({ date: "", label: "" });
  const [holErrors, setHolErrors] = useState<Record<string, string>>({});
  const [addingHol, setAddingHol] = useState(false);
  const [delHol, setDelHol] = useState<string | null>(null);

  // Lead times
  const [global, setGlobal] = useState(String(leadTimes.global_hours ?? 24));
  const [overrides, setOverrides] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(leadTimes.per_category ?? {}).map(([k, v]) => [k, String(v)]))
  );
  const [savingLead, setSavingLead] = useState(false);

  const openSlotAdd = () => {
    setEditId(null);
    setSlotForm({ label: "", start_time: "", end_time: "", capacity: "50", is_active: true });
    setSlotErrors({});
    setSlotOpen(true);
  };
  const openSlotEdit = (s: AdminTimeSlot) => {
    setEditId(s.id);
    setSlotForm({
      label: s.label,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      capacity: String(s.capacity),
      is_active: s.is_active,
    });
    setSlotErrors({});
    setSlotOpen(true);
  };

  const submitSlot = async () => {
    const payload = { ...slotForm, capacity: slotForm.capacity === "" ? 0 : Number(slotForm.capacity) };
    const parsed = timeSlotSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setSlotErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setSavingSlot(true);
    const res = await saveTimeSlot(parsed.data, editId ?? undefined);
    setSavingSlot(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(editId ? "Slot updated." : "Slot created.");
    setSlotOpen(false);
    router.refresh();
  };

  const submitHoliday = async () => {
    const parsed = holidaySchema.safeParse(holForm);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setHolErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setAddingHol(true);
    const res = await addHoliday(parsed.data);
    setAddingHol(false);
    if (!res.ok) return toast.error(res.error);
    setHolForm({ date: "", label: "" });
    toast.success("Holiday added.");
    router.refresh();
  };

  const persistLead = async () => {
    const per: Record<string, number> = {};
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== "" && Number(v) > 0) per[k] = Number(v);
    }
    setSavingLead(true);
    const res = await saveLeadTimes({ global_hours: Number(global) || 0, per_category: per });
    setSavingLead(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Lead times saved.");
    router.refresh();
  };

  return (
    <>
      <AdminPageHeader title="Schedule" description="Delivery time slots, holidays and lead times." />

      <Tabs defaultValue="slots">
        <TabsList>
          <TabsTrigger value="slots">Time Slots</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="lead">Lead Times</TabsTrigger>
        </TabsList>

        {/* Time slots */}
        <TabsContent value="slots">
          <div className="mb-3 flex justify-end">
            <Button onClick={openSlotAdd} className="gap-2">
              <Plus className="h-4 w-4" /> New slot
            </Button>
          </div>
          {slots.length === 0 ? (
            <Panel className="py-10 text-center text-sm text-muted-foreground">
              <Clock className="mx-auto mb-2 h-6 w-6 text-green" />
              No time slots yet.
            </Panel>
          ) : (
            <div className="space-y-2">
              {slots.map((s) => (
                <Panel key={s.id} className="flex items-center gap-3 p-3">
                  <Clock className="h-4 w-4 text-green" />
                  <div className="flex-1">
                    <span className="font-medium text-green-deep">{s.label}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · cap {s.capacity}
                    </span>
                    {!s.is_active && <Badge variant="secondary" className="ml-2 text-[10px]">Hidden</Badge>}
                  </div>
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={async (v) => {
                      const res = await toggleSlotActive(s.id, v);
                      if (!res.ok) toast.error(res.error);
                      else router.refresh();
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => openSlotEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setDelSlot(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Panel>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Holidays */}
        <TabsContent value="holidays">
          <Panel className="mb-3">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Date" error={holErrors.date}>
                <Input
                  type="date"
                  value={holForm.date}
                  onChange={(e) => setHolForm((f) => ({ ...f, date: e.target.value }))}
                />
              </Field>
              <Field label="Label">
                <Input
                  value={holForm.label}
                  onChange={(e) => setHolForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Poya day, New Year…"
                />
              </Field>
              <Button onClick={submitHoliday} disabled={addingHol} className="gap-2">
                {addingHol && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" /> Add holiday
              </Button>
            </div>
          </Panel>
          {holidays.length === 0 ? (
            <Panel className="py-10 text-center text-sm text-muted-foreground">
              <CalendarOff className="mx-auto mb-2 h-6 w-6 text-green" />
              No holidays set.
            </Panel>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {holidays.map((h) => (
                <Panel key={h.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium text-green-deep">{formatShortDate(h.date)}</p>
                    {h.label && <p className="text-xs text-muted-foreground">{h.label}</p>}
                  </div>
                  <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setDelHol(h.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Panel>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Lead times */}
        <TabsContent value="lead">
          <Panel className="space-y-4">
            <Field label="Global minimum lead time (hours)" hint="Earliest a customer can pick a delivery/pickup date.">
              <Input
                type="number"
                value={global}
                onChange={(e) => setGlobal(e.target.value)}
                className="max-w-[160px]"
              />
            </Field>
            {categories.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-green-deep">Per-category overrides (optional)</p>
                <div className="space-y-2">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="w-40 text-sm text-green-deep">{c.name}</span>
                      <Input
                        type="number"
                        value={overrides[c.id] ?? ""}
                        onChange={(e) => setOverrides((o) => ({ ...o, [c.id]: e.target.value }))}
                        placeholder="hours"
                        className="max-w-[120px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={persistLead} disabled={savingLead} className="gap-2">
                {savingLead && <Loader2 className="h-4 w-4 animate-spin" />}
                Save lead times
              </Button>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      {/* Slot dialog */}
      <Dialog open={slotOpen} onOpenChange={setSlotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit slot" : "New slot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Label" error={slotErrors.label} required>
              <Input value={slotForm.label} onChange={(e) => setSlotForm((f) => ({ ...f, label: e.target.value }))} placeholder="Morning" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time" error={slotErrors.start_time} required>
                <Input type="time" value={slotForm.start_time} onChange={(e) => setSlotForm((f) => ({ ...f, start_time: e.target.value }))} />
              </Field>
              <Field label="End time" error={slotErrors.end_time} required>
                <Input type="time" value={slotForm.end_time} onChange={(e) => setSlotForm((f) => ({ ...f, end_time: e.target.value }))} />
              </Field>
            </div>
            <Field label="Capacity" error={slotErrors.capacity} required>
              <Input type="number" value={slotForm.capacity} onChange={(e) => setSlotForm((f) => ({ ...f, capacity: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch checked={slotForm.is_active} onCheckedChange={(v) => setSlotForm((f) => ({ ...f, is_active: v }))} />
              Active
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSlotOpen(false)} disabled={savingSlot}>
              Cancel
            </Button>
            <Button onClick={submitSlot} disabled={savingSlot} className="gap-2">
              {savingSlot && <Loader2 className="h-4 w-4 animate-spin" />}
              {editId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delSlot}
        onOpenChange={(o) => !o && setDelSlot(null)}
        title="Delete this time slot?"
        confirmLabel="Delete slot"
        onConfirm={async () => {
          if (!delSlot) return;
          const res = await deleteTimeSlot(delSlot);
          setDelSlot(null);
          if (!res.ok) return toast.error(res.error);
          toast.success("Slot deleted.");
          router.refresh();
        }}
      />
      <ConfirmDialog
        open={!!delHol}
        onOpenChange={(o) => !o && setDelHol(null)}
        title="Remove this holiday?"
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!delHol) return;
          const res = await deleteHoliday(delHol);
          setDelHol(null);
          if (!res.ok) return toast.error(res.error);
          toast.success("Holiday removed.");
          router.refresh();
        }}
      />
    </>
  );
}
