"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPageHeader, Panel, Field } from "@/components/admin/primitives";
import { saveLoyaltySettings, adjustLoyaltyByEmail } from "@/lib/admin/loyalty";
import type { LoyaltySettings } from "@/types/checkout";
import type { LoyaltyStats } from "@/lib/admin/loyalty-data";

export function LoyaltyClient({
  settings,
  stats,
}: {
  settings: LoyaltySettings;
  stats: LoyaltyStats;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    earn_rate: String(settings.earn_rate),
    earn_per_amount: String(settings.earn_per_amount),
    redeem_rate: String(settings.redeem_rate),
    redeem_per_points: String(settings.redeem_per_points),
    max_redeem_percent: String(settings.max_redeem_percent),
    expiry_months: String(settings.expiry_months),
    first_order_bonus: String(settings.first_order_bonus),
    review_bonus: String(settings.review_bonus),
  });
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await saveLoyaltySettings({
      earn_rate: Number(form.earn_rate),
      earn_per_amount: Number(form.earn_per_amount),
      redeem_rate: Number(form.redeem_rate),
      redeem_per_points: Number(form.redeem_per_points),
      max_redeem_percent: Number(form.max_redeem_percent),
      expiry_months: Number(form.expiry_months),
      first_order_bonus: Number(form.first_order_bonus),
      review_bonus: Number(form.review_bonus),
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Loyalty settings saved.");
    router.refresh();
  };

  const adjust = async () => {
    setAdjusting(true);
    const res = await adjustLoyaltyByEmail(email, Number(points), reason);
    setAdjusting(false);
    if (!res.ok) return toast.error(res.error);
    setEmail("");
    setPoints("");
    setReason("");
    toast.success("Adjustment applied.");
    router.refresh();
  };

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <AdminPageHeader title="Loyalty" description="Earning, redemption, bonuses and balances." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Points issued" value={stats.issued} />
        <Stat label="Redeemed" value={stats.redeemed} />
        <Stat label="Expired" value={stats.expired} />
        <Stat label="Outstanding" value={stats.outstanding} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Earn rate (points)" hint="Points earned per amount below.">
              <Input type="number" value={form.earn_rate} onChange={(e) => set("earn_rate", e.target.value)} />
            </Field>
            <Field label="Per amount (Rs.)" hint="e.g. 1 point per Rs. 100.">
              <Input type="number" value={form.earn_per_amount} onChange={(e) => set("earn_per_amount", e.target.value)} />
            </Field>
            <Field label="Redeem value (Rs.)" hint="Rupees per points below.">
              <Input type="number" value={form.redeem_rate} onChange={(e) => set("redeem_rate", e.target.value)} />
            </Field>
            <Field label="Per points" hint="e.g. Rs. 50 per 100 points.">
              <Input type="number" value={form.redeem_per_points} onChange={(e) => set("redeem_per_points", e.target.value)} />
            </Field>
            <Field label="Max redemption (% of order)">
              <Input type="number" value={form.max_redeem_percent} onChange={(e) => set("max_redeem_percent", e.target.value)} />
            </Field>
            <Field label="Expiry (months)">
              <Input type="number" value={form.expiry_months} onChange={(e) => set("expiry_months", e.target.value)} />
            </Field>
            <Field label="First order bonus">
              <Input type="number" value={form.first_order_bonus} onChange={(e) => set("first_order_bonus", e.target.value)} />
            </Field>
            <Field label="Per approved review bonus">
              <Input type="number" value={form.review_bonus} onChange={(e) => set("review_bonus", e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-green-deep">
            <Gift className="h-4 w-4" /> Manual adjustment
          </h2>
          <div className="space-y-3">
            <Field label="Customer email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Points (negative to deduct)">
              <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
            </Field>
            <Field label="Reason">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Goodwill…" />
            </Field>
            <Button
              onClick={adjust}
              disabled={adjusting || !email || !points || !reason}
              className="w-full gap-2"
            >
              {adjusting && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply adjustment
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Panel>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-green-deep">{value.toLocaleString()}</p>
    </Panel>
  );
}
