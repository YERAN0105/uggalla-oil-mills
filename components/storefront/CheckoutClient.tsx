"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Truck,
  Store,
  CreditCard,
  Banknote,
  Wallet,
  Bell,
  Loader2,
  ShieldCheck,
  Leaf,
  MapPin,
  CalendarDays,
  Clock,
  CheckCircle2,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Container } from "@/components/shared/Container";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/brand";
import { formatInColombo } from "@/lib/date";
import { useCartStore, getSubtotal, computeCouponDiscount } from "@/stores/cart";
import {
  createOrder,
  getSlotAvailabilityAction,
  checkEmailHasAccount,
  applyCouponAction,
} from "@/lib/checkout/actions";
import type {
  DeliveryZone,
  TimeSlot,
  SavedAddress,
  CheckoutUser,
  TaxSettings,
  LoyaltySettings,
  CodLimits,
  PickupLimits,
  ShopInfo,
} from "@/types/checkout";

interface CheckoutClientProps {
  zones: DeliveryZone[];
  slots: TimeSlot[];
  holidays: string[];
  user: CheckoutUser | null;
  addresses: SavedAddress[];
  tax: TaxSettings;
  loyalty: LoyaltySettings;
  cod: CodLimits;
  pickup: PickupLimits;
  shopInfo: ShopInfo;
  payHereEnabled: boolean;
  minLeadTimeHours: number;
}

type PaymentMethod = "payhere" | "bank_transfer" | "cod";

const INTERVAL_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

function SectionCard({
  step,
  title,
  icon: Icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-sand bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-3 font-display text-lg text-green-deep mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green text-white text-sm font-semibold">
          {step}
        </span>
        <Icon className="h-5 w-5 text-green" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function PhoneInput({
  value,
  onChange,
  id,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (digits: string) => void;
  id: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  // Store the 9 national digits; the +94 prefix is fixed.
  const digits = value.startsWith("+94") ? value.slice(3) : value.replace(/^0/, "");
  return (
    <div className="flex">
      <span
        className={cn(
          "flex items-center px-3 rounded-l-lg border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none",
          disabled && "opacity-50"
        )}
      >
        +94
      </span>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        maxLength={9}
        placeholder="771234567"
        value={digits}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        disabled={disabled}
        className={cn("rounded-l-none", invalid && "border-destructive")}
      />
    </div>
  );
}

export function CheckoutClient(props: CheckoutClientProps) {
  const { zones, slots, holidays, user, addresses, tax, loyalty, cod, pickup, shopInfo, payHereEnabled, minLeadTimeHours } =
    props;
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const clearCart = useCartStore((s) => s.clearCart);

  // Coupon entry at checkout — same server action + store the cart's box uses, so
  // a code can be applied/changed/removed right here at the final step.
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    try {
      const lines = items.map((i) => ({ productId: i.productId, lineTotal: i.lineTotal }));
      const result = await applyCouponAction(couponInput, lines);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCoupon({
        id: result.coupon.id,
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        min_order_amount: result.coupon.min_order_amount,
        max_discount: result.coupon.max_discount,
      });
      setCouponInput("");
      toast.success(`Coupon “${result.coupon.code}” applied`);
    } catch {
      toast.error("Couldn't apply that coupon. Please try again.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  // ─── Form state ───────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  // Soft "you already have an account" nudge for guests (non-blocking).
  const [emailHasAccount, setEmailHasAccount] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const handleEmailBlur = async () => {
    if (user) return;
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setEmailHasAccount(false);
      return;
    }
    setEmailHasAccount(await checkEmailHasAccount(e));
  };

  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("delivery");

  const initialAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [savedAddressId, setSavedAddressId] = useState<string | null>(initialAddress?.id ?? null);
  const [useNewAddress, setUseNewAddress] = useState(addresses.length === 0);
  const [addr, setAddr] = useState({
    recipient: user?.name ?? "",
    phone: user?.phone ?? "",
    line1: "",
    line2: "",
    city: "",
    postal_code: "",
  });
  const [saveAddress, setSaveAddress] = useState(false);
  const [labelPreset, setLabelPreset] = useState<"Home" | "Work" | "Other">("Home");
  const [customLabel, setCustomLabel] = useState("");
  const addressLabel =
    labelPreset === "Other" ? customLabel.trim() || "Other" : labelPreset;

  const [deliveryZoneId, setDeliveryZoneId] = useState<string | null>(
    initialAddress?.delivery_zone_id ?? zones[0]?.id ?? null
  );
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [timeSlotId, setTimeSlotId] = useState<string | null>(null);
  const [driverNote, setDriverNote] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    payHereEnabled ? "payhere" : "bank_transfer"
  );

  const [loyaltyInput, setLoyaltyInput] = useState(0);
  const [slotRemaining, setSlotRemaining] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  // Set once an order is placed so the "empty cart → /cart" guard below doesn't
  // hijack the navigation to the success page after we clear the cart.
  const orderPlacedRef = useRef(false);

  // ─── Derived totals ─────────────────────────────────────────────────────────
  const subtotal = getSubtotal(items);
  const couponDiscount = computeCouponDiscount(appliedCoupon, subtotal);
  const isFreeDeliveryCoupon = appliedCoupon?.type === "free_delivery";

  const selectedZone = zones.find((z) => z.id === deliveryZoneId) ?? null;
  const deliveryFee =
    fulfillmentType === "delivery" && selectedZone && !isFreeDeliveryCoupon
      ? Number(selectedZone.fee)
      : 0;

  const loyaltyDiscount = useMemo(() => {
    if (!user || loyaltyInput <= 0 || !loyalty.redeem_enabled) return 0;
    const afterDiscount = Math.max(0, subtotal - couponDiscount);
    const perPoint = loyalty.redeem_rate / loyalty.redeem_per_points;
    const maxByPercent = (afterDiscount * loyalty.max_redeem_percent) / 100;
    const points = Math.min(loyaltyInput, user.loyaltyPoints);
    return Number(Math.min(points * perPoint, maxByPercent, afterDiscount).toFixed(2));
  }, [user, loyaltyInput, subtotal, couponDiscount, loyalty]);

  const taxableBase = Math.max(0, subtotal - couponDiscount - loyaltyDiscount);
  const taxAmount =
    tax.rate > 0 && !tax.inclusive ? Number(((taxableBase * tax.rate) / 100).toFixed(2)) : 0;
  const total = Number(
    Math.max(0, subtotal - couponDiscount - loyaltyDiscount + deliveryFee + taxAmount).toFixed(2)
  );

  const hasSubscriptionItem = items.some((i) => i.isSubscription);

  // ─── Date picker constraints (Asia/Colombo) ─────────────────────────────────
  const earliestStr = formatInColombo(new Date(Date.now() + minLeadTimeHours * 3600_000), "yyyy-MM-dd");
  const earliestDate = parseISO(earliestStr);
  const disabledDays = useMemo(
    () => [{ before: earliestDate }, ...holidays.map((h) => parseISO(h))],
    [earliestDate, holidays]
  );

  const dateStr = date ? format(date, "yyyy-MM-dd") : null;

  // Fetch per-slot remaining capacity whenever the date changes.
  const refreshSlots = useCallback(async (d: string) => {
    const remaining = await getSlotAvailabilityAction(d);
    setSlotRemaining(remaining);
  }, []);

  useEffect(() => {
    if (dateStr) {
      refreshSlots(dateStr);
      setTimeSlotId(null); // re-choose slot for the new date
    }
  }, [dateStr, refreshSlots]);

  // Cash availability — the same "cash on hand-over" method works for both
  // delivery (Cash on Delivery) and pickup (Pay at Store), but each is gated by
  // its own limits: delivery carries trip cost + refusal risk, pickup is paid
  // at the counter and is low-risk. Pick the limits for the active fulfillment.
  const cashLimits = fulfillmentType === "pickup" ? pickup : cod;
  const codAvailable =
    cashLimits.enabled &&
    (!cashLimits.min_order_amount || total >= cashLimits.min_order_amount) &&
    (!cashLimits.max_order_amount || total <= cashLimits.max_order_amount);

  // If the current method becomes invalid (e.g. COD on pickup), fall back.
  useEffect(() => {
    if (paymentMethod === "cod" && !codAvailable) {
      setPaymentMethod(payHereEnabled ? "payhere" : "bank_transfer");
    }
  }, [paymentMethod, codAvailable, payHereEnabled]);

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const buildPayload = () => ({
    items: items.map((i) => ({
      productId: i.productId,
      sizeId: i.size.id,
      quantity: i.quantity,
      note: i.note,
      isSubscription: i.isSubscription,
      subscriptionInterval: i.subscriptionInterval,
    })),
    contactName: name.trim(),
    contactEmail: email.trim(),
    contactPhone: phone.startsWith("+94") || phone.startsWith("0") ? phone : `+94${phone}`,
    createAccount: false,
    fulfillmentType,
    savedAddressId: fulfillmentType === "delivery" && !useNewAddress ? savedAddressId : null,
    address:
      fulfillmentType === "delivery" && useNewAddress
        ? {
            recipient: addr.recipient.trim(),
            phone: addr.phone.startsWith("+94") || addr.phone.startsWith("0") ? addr.phone : `+94${addr.phone}`,
            line1: addr.line1.trim(),
            line2: addr.line2.trim(),
            city: addr.city.trim(),
            postal_code: addr.postal_code.trim(),
            label: addressLabel,
          }
        : null,
    saveAddress: !!user && useNewAddress && saveAddress,
    deliveryZoneId: fulfillmentType === "delivery" ? deliveryZoneId : null,
    fulfillmentDate: dateStr ?? "",
    timeSlotId: timeSlotId ?? "",
    driverNote: driverNote.trim(),
    paymentMethod,
    couponCode: appliedCoupon?.code ?? "",
    loyaltyPointsToRedeem: user ? Math.min(loyaltyInput, user.loyaltyPoints) : 0,
  });

  // Light client gate before hitting the server (server is authoritative).
  const validationError = (): string | null => {
    if (name.trim().length < 2) return "Please enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Please enter a valid email.";
    const ph = phone.startsWith("+94") || phone.startsWith("0") ? phone : `+94${phone}`;
    if (!/^(\+94|0)[0-9]{9}$/.test(ph)) return "Please enter a valid phone number.";
    if (!dateStr) return "Please choose a date.";
    if (!timeSlotId) return "Please choose a time slot.";
    if (fulfillmentType === "delivery") {
      if (!deliveryZoneId) return "Please select a delivery zone.";
      if (useNewAddress) {
        if (addr.recipient.trim().length < 2) return "Enter the recipient's name.";
        if (addr.line1.trim().length < 3) return "Enter a delivery address.";
        if (addr.city.trim().length < 2) return "Enter a city / town.";
      } else if (!savedAddressId) {
        return "Select a saved address or add a new one.";
      }
    }
    return null;
  };

  const handlePlaceOrder = async () => {
    const err = validationError();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      const result = await createOrder(buildPayload());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      orderPlacedRef.current = true;
      clearCart();
      router.push(result.redirectUrl);
    } catch {
      toast.error("Something went wrong placing your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Guards ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mounted && items.length === 0 && !orderPlacedRef.current) router.replace("/cart");
  }, [mounted, items.length, router]);

  if (!mounted) {
    return (
      <Container className="py-16">
        <div className="h-96 animate-pulse rounded-2xl bg-sand/50" />
      </Container>
    );
  }
  if (items.length === 0) return null;

  const availablePayments: { id: PaymentMethod; show: boolean }[] = [
    { id: "payhere", show: payHereEnabled },
    { id: "bank_transfer", show: true },
    { id: "cod", show: cashLimits.enabled },
  ];

  return (
    <Container className="py-8 md:py-12">
      <h1 className="font-display text-3xl md:text-4xl text-green-deep mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* ── Left: form sections ── */}
        <div className="space-y-5">
          {/* Step 1 — Contact */}
          <SectionCard step={1} title="Contact" icon={CheckCircle2}>
            {!user && (
              <p className="text-sm text-muted-foreground mb-4">
                Checking out as a guest.{" "}
                <Link href="/login?redirect=/checkout" className="text-green underline">
                  Log in
                </Link>{" "}
                for a faster checkout and order tracking.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="c-name">Full Name</Label>
                <Input
                  id="c-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={!!user}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-phone">Phone</Label>
                <PhoneInput id="c-phone" value={phone} onChange={setPhone} disabled={!!user} />
              </div>
            </div>
            <div className="space-y-1 mt-4">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                autoComplete="email"
                disabled={!!user}
              />
            </div>

            {!user && emailHasAccount && !nudgeDismissed && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gold-warm/40 bg-gold/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-green-deep">
                  Looks like you already have an account with this email. Log in for faster checkout and to
                  track this order.
                </p>
                <div className="flex flex-shrink-0 gap-2">
                  <Button asChild size="sm">
                    <Link href="/login?redirect=/checkout">Log in</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNudgeDismissed(true)}>
                    Continue as guest
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Step 2 — Fulfillment */}
          <SectionCard step={2} title="Delivery or Pickup" icon={Truck}>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { value: "delivery", label: "Delivery", desc: "Island-wide", icon: Truck },
                { value: "pickup", label: "Pickup", desc: "Collect from the store", icon: Store },
              ].map((opt) => {
                const active = fulfillmentType === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFulfillmentType(opt.value as "delivery" | "pickup")}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                      active ? "border-green bg-green/5" : "border-sand hover:border-green/40"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? "text-green" : "text-muted-foreground")} />
                    <div>
                      <p className="text-sm font-semibold text-green-deep">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Step 3 — Delivery details / Pickup info */}
          {fulfillmentType === "delivery" ? (
            <SectionCard step={3} title="Delivery Address" icon={MapPin}>
              {addresses.length > 0 && (
                <div className="space-y-2 mb-4">
                  {addresses.map((a) => {
                    const addressZone =
                      zones.find((z) => z.id === a.delivery_zone_id) ?? zones[0] ?? null;
                    return (
                      <label
                        key={a.id}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                          !useNewAddress && savedAddressId === a.id
                            ? "border-green bg-green/5"
                            : "border-sand hover:border-green/40"
                        )}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={!useNewAddress && savedAddressId === a.id}
                          onChange={() => {
                            setUseNewAddress(false);
                            setSavedAddressId(a.id);
                            // Restore the zone saved with this address (if any).
                            if (a.delivery_zone_id) setDeliveryZoneId(a.delivery_zone_id);
                          }}
                          className="mt-1 accent-green"
                        />
                        <div className="min-w-0 flex-1 text-sm">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-semibold text-green-deep">
                              {a.recipient}
                              {a.label && <span className="text-muted-foreground font-normal"> · {a.label}</span>}
                            </p>
                            {a.phone && (
                              <span className="shrink-0 text-xs text-muted-foreground">{a.phone}</span>
                            )}
                          </div>
                          <p className="text-muted-foreground">
                            {[a.line1, a.line2, a.city, a.postal_code].filter(Boolean).join(", ")}
                          </p>
                          {addressZone && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <Truck className="h-3 w-3 text-green" />
                              {addressZone.name} · {formatCurrency(Number(addressZone.fee))}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(true)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-sm font-medium transition-colors",
                      useNewAddress ? "border-green bg-green/5 text-green" : "border-dashed border-sand text-muted-foreground hover:border-green/40"
                    )}
                  >
                    + Add a new address
                  </button>
                </div>
              )}

              {useNewAddress && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="a-recipient">Recipient Name</Label>
                      <Input
                        id="a-recipient"
                        value={addr.recipient}
                        onChange={(e) => setAddr({ ...addr, recipient: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="a-phone">Recipient Phone</Label>
                      <PhoneInput
                        id="a-phone"
                        value={addr.phone}
                        onChange={(d) => setAddr({ ...addr, phone: d })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="a-line1">Address Line 1</Label>
                    <Input
                      id="a-line1"
                      placeholder="Street address, area"
                      value={addr.line1}
                      onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="a-line2">Address Line 2 (optional)</Label>
                    <Input
                      id="a-line2"
                      value={addr.line2}
                      onChange={(e) => setAddr({ ...addr, line2: e.target.value })}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="a-city">City / Town</Label>
                      <Input id="a-city" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="a-postal">Postal Code (optional)</Label>
                      <Input
                        id="a-postal"
                        value={addr.postal_code}
                        onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Zone selector — only when entering a new address (the zone is
                  established here). Saved addresses show their zone on the card
                  above; editing it lives in account address management. */}
              {useNewAddress && (
                <div className="space-y-1 mt-5">
                  <Label htmlFor="zone">Delivery Zone</Label>
                  <div className="space-y-2">
                    {zones.map((z) => {
                      const active = deliveryZoneId === z.id;
                      return (
                        <label
                          key={z.id}
                          className={cn(
                            "flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-colors",
                            active ? "border-green bg-green/5" : "border-sand hover:border-green/40"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="zone"
                              checked={active}
                              onChange={() => setDeliveryZoneId(z.id)}
                              className="mt-1 accent-green"
                            />
                            <div className="text-sm">
                              <p className="font-medium text-green-deep">{z.name}</p>
                              {z.estimated_time && (
                                <p className="text-xs text-muted-foreground">{z.estimated_time}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-green-deep">
                            {formatCurrency(Number(z.fee))}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Save address — only when entering a new one while logged in */}
              {useNewAddress && user && (
                <div className="mt-4 mb-6 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="accent-green h-4 w-4"
                    />
                    Save this address for next time
                  </label>

                  {saveAddress && (
                    <div className="space-y-2 pl-6">
                      <p className="text-xs font-medium text-muted-foreground">Name this address</p>
                      <div className="flex flex-wrap gap-2">
                        {(["Home", "Work", "Other"] as const).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setLabelPreset(preset)}
                            className={cn(
                              "rounded-full border px-4 py-1.5 text-sm transition-colors",
                              labelPreset === preset
                                ? "border-green bg-green/10 text-green font-medium"
                                : "border-sand text-muted-foreground hover:border-green/40"
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      {labelPreset === "Other" && (
                        <Input
                          aria-label="Custom address name"
                          placeholder="e.g. Mum's place, Office 2"
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value.slice(0, 50))}
                          maxLength={50}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <DateSlotPicker
                date={date}
                setDate={setDate}
                disabledDays={disabledDays}
                earliestDate={earliestDate}
                slots={slots}
                slotRemaining={slotRemaining}
                timeSlotId={timeSlotId}
                setTimeSlotId={setTimeSlotId}
              />

              <div className="space-y-1 mt-5">
                <Label htmlFor="driver-note">Note for driver (optional)</Label>
                <Textarea
                  id="driver-note"
                  rows={2}
                  value={driverNote}
                  onChange={(e) => setDriverNote(e.target.value.slice(0, 500))}
                  placeholder="Landmark, gate code, delivery preference…"
                />
              </div>
            </SectionCard>
          ) : (
            <SectionCard step={3} title="Pickup Details" icon={Store}>
              <div className="rounded-xl border border-green/20 bg-green/5 p-4 mb-5">
                <p className="font-semibold text-green-deep flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green" />
                  {shopInfo.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{shopInfo.address}</p>
                {shopInfo.business_hours && (
                  <p className="text-sm text-muted-foreground">Hours: {shopInfo.business_hours}</p>
                )}
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(shopInfo.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green underline mt-2 inline-block"
                >
                  View on map →
                </a>
              </div>

              <DateSlotPicker
                date={date}
                setDate={setDate}
                disabledDays={disabledDays}
                earliestDate={earliestDate}
                slots={slots}
                slotRemaining={slotRemaining}
                timeSlotId={timeSlotId}
                setTimeSlotId={setTimeSlotId}
                pickup
              />
            </SectionCard>
          )}

          {/* Step 4 — Payment */}
          <SectionCard step={4} title="Payment Method" icon={CreditCard}>
            <div className="space-y-3">
              {availablePayments
                .filter((p) => p.show)
                .map((p) => (
                  <PaymentOption
                    key={p.id}
                    method={p.id}
                    fulfillmentType={fulfillmentType}
                    active={paymentMethod === p.id}
                    disabled={p.id === "cod" && !codAvailable}
                    disabledReason={p.id === "cod" ? "Not available for this order total" : undefined}
                    onSelect={() => setPaymentMethod(p.id)}
                  />
                ))}
              {!payHereEnabled && (
                <p className="text-xs text-muted-foreground">
                  Online card payment is coming soon. For now, choose bank transfer or cash on delivery.
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Right: order summary ── */}
        <div className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="rounded-2xl border border-sand bg-white p-6 space-y-4">
            <h2 className="font-display text-xl text-green-deep">Order Summary</h2>

            <div className="space-y-3 max-h-64 overflow-y-auto pt-2">
              {items.map((item) => (
                <div key={item.cartId} className="flex gap-3">
                  <div className="relative h-14 w-14 flex-shrink-0">
                    <div className="h-full w-full overflow-hidden rounded-lg bg-sand">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <DropletSVG className="h-6 w-6 text-sage" />
                        </div>
                      )}
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-green-deep text-white text-[10px] font-bold flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium text-green-deep truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.size.label}</p>
                    {item.isSubscription && (
                      <Badge variant="sage" className="mt-0.5 gap-1 text-[10px]">
                        <Bell className="h-2.5 w-2.5" />
                        {INTERVAL_LABEL[item.subscriptionInterval ?? "monthly"]}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-medium text-green-deep">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            {/* Loyalty redeem */}
            {user && user.loyaltyPoints > 0 && loyalty.redeem_enabled && (
              <div className="rounded-xl border border-sage/60 bg-sage/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="loyalty" className="text-sm text-green-deep">
                    Redeem points
                  </Label>
                  <span className="text-xs text-muted-foreground">{user.loyaltyPoints} available</span>
                </div>
                <Input
                  id="loyalty"
                  type="number"
                  min={0}
                  max={user.loyaltyPoints}
                  value={loyaltyInput || ""}
                  onChange={(e) =>
                    setLoyaltyInput(Math.max(0, Math.min(user.loyaltyPoints, Number(e.target.value) || 0)))
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  {loyalty.redeem_per_points} points = {formatCurrency(loyalty.redeem_rate)} · up to{" "}
                  {loyalty.max_redeem_percent}% of order
                </p>
              </div>
            )}

            {/* Coupon — apply / change / remove at the final step */}
            <div className="border-t border-sand pt-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg border border-green/30 bg-green/5 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-green-deep">
                    <Tag className="h-3.5 w-3.5 text-green" />
                    {appliedCoupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCoupon(null)}
                    aria-label="Remove coupon"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon}
                  >
                    {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-sand pt-4 text-sm">
              <Row label="Subtotal" value={formatCurrency(subtotal)} />
              {couponDiscount > 0 && (
                <Row label={`Discount (${appliedCoupon?.code})`} value={`−${formatCurrency(couponDiscount)}`} accent />
              )}
              {fulfillmentType === "delivery" && (
                <Row
                  label="Delivery"
                  value={
                    isFreeDeliveryCoupon
                      ? "Free"
                      : selectedZone
                        ? formatCurrency(deliveryFee)
                        : "Select a zone"
                  }
                />
              )}
              {loyaltyDiscount > 0 && (
                <Row label="Loyalty points" value={`−${formatCurrency(loyaltyDiscount)}`} accent />
              )}
              {taxAmount > 0 && <Row label={tax.label || "Tax"} value={formatCurrency(taxAmount)} />}
            </div>

            <div className="flex items-baseline justify-between border-t border-sand pt-4">
              <span className="font-semibold text-green-deep">Total</span>
              <span className="font-display text-2xl font-semibold text-green-deep">{formatCurrency(total)}</span>
            </div>

            {hasSubscriptionItem && !user && (
              <p className="rounded-lg bg-gold/10 border border-gold-warm/30 p-3 text-xs text-green-deep">
                <Bell className="inline h-3 w-3 mr-1" />
                Subscribing to reorder reminders requires an account.{" "}
                <Link href="/login?redirect=/checkout" className="underline">
                  Log in
                </Link>{" "}
                to keep your subscription, or continue as guest (order proceeds without it).
              </p>
            )}

            <Button onClick={handlePlaceOrder} disabled={submitting} size="lg" className="w-full gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing Order…
                </>
              ) : (
                <>Place Order · {formatCurrency(total)}</>
              )}
            </Button>

            <div className="space-y-1.5 pt-1">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-green" /> Secure checkout
              </p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Leaf className="h-3.5 w-3.5 text-green" /> 100% pure &amp; natural
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("flex justify-between", accent ? "text-green" : "")}>
      <span className={accent ? "" : "text-muted-foreground"}>{label}</span>
      <span className={accent ? "" : "font-medium text-green-deep"}>{value}</span>
    </div>
  );
}

function DateSlotPicker({
  date,
  setDate,
  disabledDays,
  earliestDate,
  slots,
  slotRemaining,
  timeSlotId,
  setTimeSlotId,
  pickup,
}: {
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  disabledDays: any[];
  earliestDate: Date;
  slots: TimeSlot[];
  slotRemaining: Record<string, number>;
  timeSlotId: string | null;
  setTimeSlotId: (id: string) => void;
  pickup?: boolean;
}) {
  return (
    <div className="mt-5 grid md:grid-cols-2 gap-5">
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <CalendarDays className="h-4 w-4 text-green" />
          {pickup ? "Pickup" : "Delivery"} Date
        </Label>
        <div className="rounded-xl border border-sand bg-cream p-2 inline-block">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={disabledDays}
            startMonth={earliestDate}
          />
        </div>
      </div>
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-green" />
          {pickup ? "Pickup Time" : "Time Slot"}
        </Label>
        {!date ? (
          <p className="text-sm text-muted-foreground">Choose a date to see available slots.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((s) => {
              const remaining = slotRemaining[s.id];
              const full = remaining !== undefined && remaining <= 0;
              const active = timeSlotId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={full}
                  onClick={() => setTimeSlotId(s.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors",
                    active
                      ? "border-green bg-green/5"
                      : "border-sand hover:border-green/40",
                    full && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="font-medium text-green-deep">{s.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {full
                      ? "Full"
                      : remaining !== undefined && remaining <= 5
                        ? `${remaining} left`
                        : "Available"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentOption({
  method,
  fulfillmentType,
  active,
  disabled,
  disabledReason,
  onSelect,
}: {
  method: PaymentMethod;
  fulfillmentType: "delivery" | "pickup";
  active: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onSelect: () => void;
}) {
  const config = {
    payhere: {
      icon: CreditCard,
      title: "Pay Online",
      desc: "Cards, eZ Cash, mCash & more via PayHere",
      recommended: true,
    },
    bank_transfer: {
      icon: Banknote,
      title: "Bank Transfer",
      desc: "Upload your receipt after placing the order",
      recommended: false,
    },
    cod:
      fulfillmentType === "pickup"
        ? {
            icon: Wallet,
            title: "Pay at Store",
            desc: "Pay in cash when you collect your order",
            recommended: false,
          }
        : {
            icon: Wallet,
            title: "Cash on Delivery",
            desc: "Pay in cash when your order arrives",
            recommended: false,
          },
  }[method];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
        active ? "border-green bg-green/5" : "border-sand hover:border-green/40",
        disabled && "opacity-50 cursor-not-allowed hover:border-sand"
      )}
    >
      <Icon className={cn("h-5 w-5 mt-0.5", active ? "text-green" : "text-muted-foreground")} />
      <div className="flex-1">
        <p className="text-sm font-semibold text-green-deep flex items-center gap-2">
          {config.title}
          {config.recommended && <Badge variant="gold" className="text-[10px]">Recommended</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">{disabled && disabledReason ? disabledReason : config.desc}</p>
      </div>
    </button>
  );
}
