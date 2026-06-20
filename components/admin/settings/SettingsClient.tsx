"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Panel, Field } from "@/components/admin/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { OrphanCleanup } from "@/components/admin/settings/OrphanCleanup";
import {
  saveShopInfo,
  saveTax,
  saveSubscriptionFrequencies,
  saveBankDetails,
  saveCodLimits,
  savePickupLimits,
  saveNotifications,
  saveSeo,
  saveMaintenance,
  saveStorageCleanup,
} from "@/lib/admin/settings-actions";
import { NOTIFICATION_EVENTS } from "@/lib/notifications/catalog";
import type {
  SubscriptionFrequencies,
  NotificationSettings,
  SeoSettings,
  MaintenanceSettings,
  StorageCleanupSettings,
} from "@/types/admin";
import type { ShopInfo, TaxSettings, BankDetails, CodLimits, PickupLimits } from "@/types/checkout";

interface Props {
  shop: ShopInfo & { logo_url?: string };
  tax: TaxSettings;
  frequencies: SubscriptionFrequencies;
  bank: BankDetails;
  cod: CodLimits;
  pickup: PickupLimits;
  notifications: NotificationSettings;
  seo: SeoSettings;
  maintenance: MaintenanceSettings;
  storageCleanup: StorageCleanupSettings;
  payHereEnabled: boolean;
  payHereMode: string | null;
}

function useSaver() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setSaving(true);
    const res = await fn();
    setSaving(false);
    if (!res.ok) return toast.error(res.error ?? "Failed.");
    toast.success("Settings saved.");
    router.refresh();
  };
  return { saving, run };
}

export function SettingsClient(props: Props) {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-green-deep">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Shop configuration.</p>
      </div>

      <Tabs defaultValue="shop">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="shop">Shop Info</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="subs">Subscriptions</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="shop">
          <ShopTab shop={props.shop} />
        </TabsContent>
        <TabsContent value="tax">
          <TaxTab tax={props.tax} />
        </TabsContent>
        <TabsContent value="subs">
          <SubsTab frequencies={props.frequencies} />
        </TabsContent>
        <TabsContent value="payment">
          <PaymentTab
            bank={props.bank}
            cod={props.cod}
            pickup={props.pickup}
            payHereEnabled={props.payHereEnabled}
            payHereMode={props.payHereMode}
          />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab notifications={props.notifications} />
        </TabsContent>
        <TabsContent value="seo">
          <SeoTab seo={props.seo} />
        </TabsContent>
        <TabsContent value="storage">
          <StorageTab storageCleanup={props.storageCleanup} />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceTab maintenance={props.maintenance} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="mt-4 flex justify-end">
      <Button onClick={onClick} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}

function ShopTab({ shop }: { shop: ShopInfo & { logo_url?: string } }) {
  const { saving, run } = useSaver();
  const [f, setF] = useState({
    name: shop.name ?? "",
    tagline: shop.tagline ?? "",
    address: shop.address ?? "",
    phone: shop.phone ?? "",
    whatsapp: shop.whatsapp ?? "",
    email: shop.email ?? "",
    business_hours: shop.business_hours ?? "",
    logo_url: shop.logo_url ?? null as string | null,
  });
  const set = (k: keyof typeof f, v: string | null) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shop name">
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Tagline">
          <Input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input value={f.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Business hours">
          <Input value={f.business_hours} onChange={(e) => set("business_hours", e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Address">
          <Textarea value={f.address} onChange={(e) => set("address", e.target.value)} rows={2} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Logo">
          <ImageUpload value={f.logo_url} onChange={(url) => set("logo_url", url)} bucket="site-assets" />
        </Field>
      </div>
      <SaveButton saving={saving} onClick={() => run(() => saveShopInfo({ ...f, logo_url: f.logo_url ?? undefined }))} />
    </Panel>
  );
}

function TaxTab({ tax }: { tax: TaxSettings }) {
  const { saving, run } = useSaver();
  const [rate, setRate] = useState(String(tax.rate));
  const [label, setLabel] = useState(tax.label ?? "Tax");
  const [inclusive, setInclusive] = useState(tax.inclusive);
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tax rate (%)">
          <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-green-deep">
        <Switch checked={inclusive} onCheckedChange={setInclusive} />
        Prices are tax-inclusive
      </label>
      <SaveButton
        saving={saving}
        onClick={() => run(() => saveTax({ rate: Number(rate), label, inclusive }))}
      />
    </Panel>
  );
}

function SubsTab({ frequencies }: { frequencies: SubscriptionFrequencies }) {
  const { saving, run } = useSaver();
  const [f, setF] = useState(frequencies);
  return (
    <Panel>
      <p className="mb-3 text-sm text-muted-foreground">Frequencies offered to customers.</p>
      <div className="space-y-3">
        <Toggle label="Weekly" checked={f.weekly} onChange={(v) => setF((s) => ({ ...s, weekly: v }))} />
        <Toggle label="Every 2 weeks" checked={f.biweekly} onChange={(v) => setF((s) => ({ ...s, biweekly: v }))} />
        <Toggle label="Monthly" checked={f.monthly} onChange={(v) => setF((s) => ({ ...s, monthly: v }))} />
      </div>
      <div className="mt-4">
        <Field label="Subscription loyalty bonus (points, optional)">
          <Input
            type="number"
            value={String(f.loyalty_bonus ?? 0)}
            onChange={(e) => setF((s) => ({ ...s, loyalty_bonus: Number(e.target.value) || 0 }))}
            className="max-w-[160px]"
          />
        </Field>
      </div>
      <SaveButton saving={saving} onClick={() => run(() => saveSubscriptionFrequencies(f))} />
    </Panel>
  );
}

function PaymentTab({
  bank,
  cod,
  pickup,
  payHereEnabled,
  payHereMode,
}: {
  bank: BankDetails;
  cod: CodLimits;
  pickup: PickupLimits;
  payHereEnabled: boolean;
  payHereMode: string | null;
}) {
  const { saving, run } = useSaver();
  const [b, setB] = useState(bank);
  const [c, setC] = useState({
    enabled: cod.enabled,
    min: cod.min_order_amount != null ? String(cod.min_order_amount) : "",
    max: cod.max_order_amount != null ? String(cod.max_order_amount) : "",
  });
  const [pk, setPk] = useState({
    enabled: pickup.enabled,
    min: pickup.min_order_amount != null ? String(pickup.min_order_amount) : "",
    max: pickup.max_order_amount != null ? String(pickup.max_order_amount) : "",
  });
  return (
    <div className="space-y-5">
      <Panel>
        <h2 className="mb-3 font-display text-lg font-semibold text-green-deep">PayHere (online)</h2>
        <div className="flex items-center gap-2 text-sm">
          {payHereEnabled ? (
            <CheckCircle2 className="h-4 w-4 text-green" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-green-deep">
            {payHereEnabled ? `Configured (${payHereMode ?? "sandbox"} mode)` : "Not configured"}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          PayHere merchant ID, secret and mode are set via environment variables
          (PAYHERE_MERCHANT_ID, PAYHERE_MERCHANT_SECRET, PAYHERE_MODE). Online payment options appear
          automatically once configured.
        </p>
      </Panel>

      <Panel>
        <h2 className="mb-3 font-display text-lg font-semibold text-green-deep">Bank transfer details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank name">
            <Input value={b.bank_name} onChange={(e) => setB((s) => ({ ...s, bank_name: e.target.value }))} />
          </Field>
          <Field label="Account name">
            <Input value={b.account_name} onChange={(e) => setB((s) => ({ ...s, account_name: e.target.value }))} />
          </Field>
          <Field label="Account number">
            <Input value={b.account_number} onChange={(e) => setB((s) => ({ ...s, account_number: e.target.value }))} />
          </Field>
          <Field label="Branch">
            <Input value={b.branch} onChange={(e) => setB((s) => ({ ...s, branch: e.target.value }))} />
          </Field>
        </div>
        <SaveButton saving={saving} onClick={() => run(() => saveBankDetails(b))} />
      </Panel>

      <Panel>
        <h2 className="mb-1 font-display text-lg font-semibold text-green-deep">Cash on Delivery</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Cash paid when a <strong>delivery</strong> order arrives. Limits guard against the trip cost
          of tiny orders and the refusal risk of large ones. Store-pickup cash is set separately below.
        </p>
        <label className="flex items-center gap-3 text-sm text-green-deep">
          <Switch checked={c.enabled} onCheckedChange={(v) => setC((s) => ({ ...s, enabled: v }))} />
          Enable Cash on Delivery
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Min order amount">
            <Input type="number" value={c.min} onChange={(e) => setC((s) => ({ ...s, min: e.target.value }))} />
          </Field>
          <Field label="Max order amount (blank = none)">
            <Input type="number" value={c.max} onChange={(e) => setC((s) => ({ ...s, max: e.target.value }))} />
          </Field>
        </div>
        <SaveButton
          saving={saving}
          onClick={() =>
            run(() =>
              saveCodLimits({
                enabled: c.enabled,
                min_order_amount: c.min === "" ? null : Number(c.min),
                max_order_amount: c.max === "" ? null : Number(c.max),
              })
            )
          }
        />
      </Panel>

      <Panel>
        <h2 className="mb-1 font-display text-lg font-semibold text-green-deep">Pay at Store</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Cash paid at the counter when a <strong>pickup</strong> order is collected. This is low-risk
          (paid before goods leave), so limits are usually left blank — leave both empty for no limit.
        </p>
        <label className="flex items-center gap-3 text-sm text-green-deep">
          <Switch checked={pk.enabled} onCheckedChange={(v) => setPk((s) => ({ ...s, enabled: v }))} />
          Enable Pay at Store
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Min order amount (blank = none)">
            <Input type="number" value={pk.min} onChange={(e) => setPk((s) => ({ ...s, min: e.target.value }))} />
          </Field>
          <Field label="Max order amount (blank = none)">
            <Input type="number" value={pk.max} onChange={(e) => setPk((s) => ({ ...s, max: e.target.value }))} />
          </Field>
        </div>
        <SaveButton
          saving={saving}
          onClick={() =>
            run(() =>
              savePickupLimits({
                enabled: pk.enabled,
                min_order_amount: pk.min === "" ? null : Number(pk.min),
                max_order_amount: pk.max === "" ? null : Number(pk.max),
              })
            )
          }
        />
      </Panel>
    </div>
  );
}

function NotificationsTab({ notifications }: { notifications: NotificationSettings }) {
  const { saving, run } = useSaver();
  const [n, setN] = useState<NotificationSettings>({
    email_enabled: notifications.email_enabled,
    whatsapp_enabled: notifications.whatsapp_enabled,
    events: notifications.events ?? {},
  });

  // events map is opt-out: undefined/true = enabled.
  const eventOn = (key: string) => n.events?.[key] !== false;
  const setEvent = (key: string, v: boolean) =>
    setN((s) => ({ ...s, events: { ...s.events, [key]: v } }));

  const transactional = NOTIFICATION_EVENTS.filter((e) => e.group === "transactional");
  const orderStatus = NOTIFICATION_EVENTS.filter((e) => e.group === "order_status");

  return (
    <div className="space-y-5">
      <Panel>
        <h2 className="mb-1 font-display text-lg font-semibold text-green-deep">Channels</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Master switches per channel. A channel also requires its integration to be configured
          (Resend for email, WhatsApp Cloud API keys for WhatsApp) — otherwise sends are skipped.
        </p>
        <div className="space-y-3">
          <Toggle
            label="Email notifications (Resend)"
            checked={n.email_enabled}
            onChange={(v) => setN((s) => ({ ...s, email_enabled: v }))}
          />
          <Toggle
            label="WhatsApp notifications (Cloud API)"
            checked={n.whatsapp_enabled}
            onChange={(v) => setN((s) => ({ ...s, whatsapp_enabled: v }))}
          />
        </div>
        <SaveButton saving={saving} onClick={() => run(() => saveNotifications(n))} />
      </Panel>

      <Panel>
        <h2 className="mb-1 font-display text-lg font-semibold text-green-deep">Per-event</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Turn individual customer notifications on or off. Each still requires its channel&apos;s
          master switch above to be on.
        </p>
        <div className="space-y-4">
          {transactional.map((e) => (
            <div key={e.key} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-green-deep">{e.label}</p>
                <p className="text-xs text-muted-foreground">{e.description}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  WhatsApp template: <code className="rounded bg-sand px-1">{e.whatsappTemplate}</code> ·
                  variables: {e.whatsappVars.map((v) => `{{${v}}}`).join(", ")}
                </p>
              </div>
              <Switch checked={eventOn(e.key)} onCheckedChange={(v) => setEvent(e.key, v)} />
            </div>
          ))}
        </div>
        <SaveButton saving={saving} onClick={() => run(() => saveNotifications(n))} />
      </Panel>

      <Panel>
        <h2 className="mb-1 font-display text-lg font-semibold text-green-deep">Order notifications</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Sent automatically as an order progresses (debounced). These also follow the master
          Email/WhatsApp switches above. <strong>Order placed</strong> (the customer&apos;s receipt) and{" "}
          <strong>Bank receipt</strong> (action-required) are always on so an order is never left
          silently stalled.
        </p>
        <div className="space-y-4">
          {orderStatus.map((e) => {
            const toggleable = e.key === "order_status_updates";
            return (
              <div key={e.key} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-green-deep">{e.label}</p>
                  <p className="text-xs text-muted-foreground">{e.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    WhatsApp template: <code className="rounded bg-sand px-1">{e.whatsappTemplate}</code>
                  </p>
                </div>
                {toggleable ? (
                  <Switch checked={eventOn(e.key)} onCheckedChange={(v) => setEvent(e.key, v)} />
                ) : (
                  <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Always on
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <SaveButton saving={saving} onClick={() => run(() => saveNotifications(n))} />
      </Panel>
    </div>
  );
}

function SeoTab({ seo }: { seo: SeoSettings }) {
  const { saving, run } = useSaver();
  const [s, setS] = useState(seo);
  return (
    <Panel>
      <div className="space-y-4">
        <Field label="Site title">
          <Input value={s.site_title} onChange={(e) => setS((x) => ({ ...x, site_title: e.target.value }))} />
        </Field>
        <Field label="Default meta description">
          <Textarea
            value={s.meta_description}
            onChange={(e) => setS((x) => ({ ...x, meta_description: e.target.value }))}
            rows={2}
          />
        </Field>
        <Field label="Default OG image">
          <ImageUpload
            value={s.og_image_url || null}
            onChange={(url) => setS((x) => ({ ...x, og_image_url: url ?? "" }))}
            bucket="site-assets"
            aspect="wide"
          />
        </Field>
      </div>
      <SaveButton saving={saving} onClick={() => run(() => saveSeo(s))} />
    </Panel>
  );
}

function StorageTab({ storageCleanup }: { storageCleanup: StorageCleanupSettings }) {
  const { saving, run } = useSaver();
  const [autoEnabled, setAutoEnabled] = useState(storageCleanup.enabled);

  return (
    <div className="space-y-5">
      <Panel>
        <h2 className="mb-1 font-display text-lg font-semibold text-green-deep">Clean up unused images</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Finds orphaned files in the public image buckets (product, brand, category, banner, review
          and site-asset images) that no longer belong to any product, banner or setting — the kind left
          behind when an upload is cancelled or an image is replaced before saving. Only files{" "}
          <strong>older than 24 hours</strong> are listed, so a just-uploaded image is never removed.
          Payment receipts and bulk-request attachments are never scanned.
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          Scanning opens a gallery of the unused images — view or delete them individually, or delete
          them all. Nothing is removed until you confirm.
        </p>
        <OrphanCleanup />
      </Panel>

      <Panel>
        <h2 className="mb-1 font-display text-lg font-semibold text-green-deep">Weekly automatic cleanup</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          When on, the same cleanup runs automatically once a week, removing unused images older than{" "}
          <strong>7 days</strong> (a wider safety margin since no one reviews it). Off by default — leave
          it off until you&apos;ve run the manual cleanup a few times and are happy with what it removes.
        </p>
        <label className="flex items-center gap-3 text-sm text-green-deep">
          <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
          Enable weekly automatic cleanup
        </label>
        <SaveButton saving={saving} onClick={() => run(() => saveStorageCleanup({ enabled: autoEnabled }))} />
      </Panel>
    </div>
  );
}

function MaintenanceTab({ maintenance }: { maintenance: MaintenanceSettings }) {
  const { saving, run } = useSaver();
  const [m, setM] = useState(maintenance);
  return (
    <Panel>
      <label className="flex items-center gap-3 text-sm text-green-deep">
        <Switch checked={m.enabled} onCheckedChange={(v) => setM((s) => ({ ...s, enabled: v }))} />
        Enable maintenance mode
      </label>
      <p className="mt-1 text-xs text-muted-foreground">
        When on, the storefront shows a branded “back soon” message; the admin keeps working.
      </p>
      <div className="mt-4">
        <Field label="Message">
          <Textarea
            value={m.message}
            onChange={(e) => setM((s) => ({ ...s, message: e.target.value }))}
            rows={2}
            placeholder="We’ll be back shortly…"
          />
        </Field>
      </div>
      <SaveButton saving={saving} onClick={() => run(() => saveMaintenance(m))} />
    </Panel>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-green-deep">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
