"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Mail,
  Loader2,
  ShieldBan,
  ShieldCheck,
  Gift,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Panel, Field, ConfirmDialog } from "@/components/admin/primitives";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate, formatDateTime } from "@/lib/date";
import { ORDER_STATUS_LABEL, INTERVAL_LABEL } from "@/lib/orders/status";
import {
  toggleCustomerBlocked,
  updateCustomerProfile,
  saveCustomerNotes,
  adjustLoyalty,
} from "@/lib/admin/customers";
import type { CustomerDetail } from "@/lib/admin/customers-data";

export function CustomerDetailClient({ customer }: { customer: CustomerDetail }) {
  const router = useRouter();
  const c = customer;

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(c.name ?? "");
  const [phone, setPhone] = useState(c.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const [notes, setNotes] = useState(c.internal_notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const waPhone = c.phone?.replace(/[^0-9]/g, "");

  const saveProfile = async () => {
    setSavingProfile(true);
    const res = await updateCustomerProfile(c.id, { name, phone });
    setSavingProfile(false);
    if (!res.ok) return toast.error(res.error);
    setEditOpen(false);
    toast.success("Profile updated.");
    router.refresh();
  };

  const block = async () => {
    setBlocking(true);
    const res = await toggleCustomerBlocked(c.id, !c.blocked);
    setBlocking(false);
    setBlockOpen(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(c.blocked ? "Customer unblocked." : "Customer blocked.");
    router.refresh();
  };

  const adjust = async () => {
    const p = Number(points);
    setAdjusting(true);
    const res = await adjustLoyalty(c.id, p, reason);
    setAdjusting(false);
    if (!res.ok) return toast.error(res.error);
    setLoyaltyOpen(false);
    setPoints("");
    setReason("");
    toast.success("Loyalty adjusted.");
    router.refresh();
  };

  const persistNotes = async () => {
    setSavingNotes(true);
    const res = await saveCustomerNotes(c.id, notes);
    setSavingNotes(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Notes saved.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/customers" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-green-deep">{c.name || "Customer"}</h1>
        {c.blocked && <Badge variant="destructive">Blocked</Badge>}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Profile + actions */}
        <Panel className="space-y-3">
          <div className="space-y-1 text-sm">
            {c.phone && (
              <div className="flex items-center gap-3">
                <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-green hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </a>
                {waPhone && (
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-green hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
              </div>
            )}
            <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-green hover:underline">
              <Mail className="h-3.5 w-3.5" /> {c.email}
            </a>
            <p className="text-muted-foreground">Joined {formatShortDate(c.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLoyaltyOpen(true)} className="gap-1">
              <Gift className="h-3.5 w-3.5" /> Adjust points
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBlockOpen(true)}
              className={`gap-1 ${c.blocked ? "text-green" : "text-red-600"}`}
            >
              {c.blocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldBan className="h-3.5 w-3.5" />}
              {c.blocked ? "Unblock" : "Block"}
            </Button>
          </div>
        </Panel>

        {/* KPIs */}
        <Panel className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Total orders" value={String(c.kpis.totalOrders)} />
            <Kpi label="Total spent" value={formatCurrency(c.kpis.totalSpent)} />
            <Kpi label="Avg. order" value={formatCurrency(c.kpis.aov)} />
            <Kpi label="Loyalty" value={`${c.loyalty_points} pts`} />
          </div>
        </Panel>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="bulk">Bulk</TabsTrigger>
          <TabsTrigger value="subs">Subscriptions</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Panel>
            {c.orders.length === 0 ? (
              <Empty text="No orders." />
            ) : (
              <ul className="divide-y divide-sand">
                {c.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/admin/orders/${o.order_number}`} className="font-medium text-green hover:underline">
                      {o.order_number}
                    </Link>
                    <span className="text-muted-foreground">{formatShortDate(o.created_at)}</span>
                    <Badge variant="secondary" className="text-[10px]">{ORDER_STATUS_LABEL[o.status]}</Badge>
                    <span className="font-medium text-green-deep">{formatCurrency(o.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="bulk">
          <Panel>
            {c.bulkRequests.length === 0 ? (
              <Empty text="No bulk requests." />
            ) : (
              <ul className="divide-y divide-sand">
                {c.bulkRequests.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/admin/bulk-requests/${b.id}`} className="font-medium text-green hover:underline">
                      {b.product_name ?? "Loose oil"} — {b.quantity} {b.unit}
                    </Link>
                    <Badge variant="secondary" className="text-[10px] capitalize">{b.status.replace("_", " ")}</Badge>
                    <span className="text-muted-foreground">{formatShortDate(b.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="subs">
          <Panel>
            {c.subscriptions.length === 0 ? (
              <Empty text="No subscriptions." />
            ) : (
              <ul className="divide-y divide-sand">
                {c.subscriptions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-green-deep">{s.product_name}</span>
                    <span className="text-muted-foreground">{INTERVAL_LABEL[s.interval] ?? s.interval}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize">{s.status}</Badge>
                    <span className="text-muted-foreground">{formatShortDate(s.next_reminder_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="addresses">
          <Panel>
            {c.addresses.length === 0 ? (
              <Empty text="No saved addresses." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {c.addresses.map((a) => (
                  <div key={a.id} className="rounded-lg border border-sand p-3 text-sm">
                    <p className="font-medium text-green-deep">{a.label || a.recipient}</p>
                    <p className="text-muted-foreground">{a.recipient}</p>
                    <p className="text-muted-foreground">
                      {a.line1}, {a.city}
                    </p>
                    {a.phone && <p className="text-muted-foreground">{a.phone}</p>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="reviews">
          <Panel>
            {c.reviews.length === 0 ? (
              <Empty text="No reviews." />
            ) : (
              <ul className="divide-y divide-sand">
                {c.reviews.map((rv) => (
                  <li key={rv.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-green-deep">{rv.product_name}</span>
                    <span className="text-gold">{"★".repeat(rv.rating)}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize">{rv.status}</Badge>
                    <span className="text-muted-foreground">{formatShortDate(rv.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="loyalty">
          <Panel>
            {c.loyaltyTx.length === 0 ? (
              <Empty text="No loyalty activity." />
            ) : (
              <ul className="divide-y divide-sand">
                {c.loyaltyTx.map((t) => (
                  <li key={t.id} className="grid grid-cols-[100px_1fr_80px_160px] items-center gap-4 py-2 text-sm">
                    <span className="capitalize text-green-deep">{t.type}</span>
                    <span className="text-muted-foreground truncate">{t.note}</span>
                    <span className={`font-medium text-right ${t.points >= 0 ? "text-green" : "text-red-600"}`}>
                      {t.points >= 0 ? "+" : ""}
                      {t.points}
                    </span>
                    <span className="text-xs text-muted-foreground text-right">{formatDateTime(t.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="notes">
          <Panel>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Admin-only notes about this customer…"
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={persistNotes} disabled={savingNotes} className="gap-2">
                {savingNotes && <Loader2 className="h-4 w-4 animate-spin" />}
                Save notes
              </Button>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      {/* Edit profile */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingProfile}>
              Cancel
            </Button>
            <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust loyalty */}
      <Dialog open={loyaltyOpen} onOpenChange={setLoyaltyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust loyalty points</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Points (use a negative number to deduct)">
              <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
            </Field>
            <Field label="Reason">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Goodwill, refund…" />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLoyaltyOpen(false)} disabled={adjusting}>
              Cancel
            </Button>
            <Button onClick={adjust} disabled={adjusting} className="gap-2">
              {adjusting && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        title={c.blocked ? "Unblock this customer?" : "Block this customer?"}
        description={
          c.blocked
            ? "They will be able to sign in and order again."
            : "They will be signed out and unable to access their account."
        }
        confirmLabel={c.blocked ? "Unblock" : "Block"}
        destructive={!c.blocked}
        loading={blocking}
        onConfirm={block}
      />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-green-deep">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
