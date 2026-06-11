"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SubscriptionInterval = "weekly" | "biweekly" | "monthly";

/** A single size choice captured at add-to-cart time. */
export interface CartItemSize {
  id: string | null; // product_sizes.id — null for single-size / sizeless retail
  label: string;
  volume_ml: number | null;
  price: number;
}

/**
 * One line in the cart. `cartId` is a stable per-line id so two lines of the
 * same product/size (e.g. one subscription, one one-off) stay distinct.
 * Prices stored here are for display only — the server always recomputes them
 * (see lib/checkout/actions.ts) before an order is created.
 */
export interface CartItem {
  cartId: string;
  productId: string;
  slug: string;
  name: string;
  brandName: string | null;
  image: string | null;
  size: CartItemSize;
  quantity: number;
  note: string;
  unitPrice: number;
  lineTotal: number;
  isSubscription: boolean;
  subscriptionInterval: SubscriptionInterval | null;
  // Stock metadata (snapshot) for low-stock warnings in the cart UI.
  stockTracked: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
}

/** Coupon definition kept client-side so the cart/summary can show an estimated
 * discount. The server re-validates and recomputes on checkout — never trust this. */
export interface AppliedCoupon {
  id: string;
  code: string;
  type: "percent_off" | "flat_off" | "free_delivery";
  value: number;
  min_order_amount: number | null;
  max_discount: number | null;
}

interface CartState {
  items: CartItem[];
  appliedCoupon: AppliedCoupon | null;
  // Transient UI state (not persisted).
  isDrawerOpen: boolean;

  addItem: (item: Omit<CartItem, "cartId" | "lineTotal">) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  updateItem: (cartId: string, patch: Partial<CartItem>) => void;
  clearCart: () => void;
  setCoupon: (coupon: AppliedCoupon | null) => void;

  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

function withLineTotal(item: Omit<CartItem, "lineTotal">): CartItem {
  return { ...item, lineTotal: Number((item.unitPrice * item.quantity).toFixed(2)) };
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      appliedCoupon: null,
      isDrawerOpen: false,

      addItem: (incoming) => {
        const newItem = withLineTotal({ ...incoming, cartId: genId() });
        set((state) => {
          // Merge identical lines (same product, size, note, subscription terms).
          const matchIndex = state.items.findIndex(
            (i) =>
              i.productId === newItem.productId &&
              i.size.id === newItem.size.id &&
              i.note === newItem.note &&
              i.isSubscription === newItem.isSubscription &&
              i.subscriptionInterval === newItem.subscriptionInterval
          );
          if (matchIndex >= 0) {
            const items = [...state.items];
            const merged = items[matchIndex];
            const quantity = Math.min(99, merged.quantity + newItem.quantity);
            items[matchIndex] = withLineTotal({ ...merged, quantity });
            return { items };
          }
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (cartId) =>
        set((state) => ({ items: state.items.filter((i) => i.cartId !== cartId) })),

      updateQuantity: (cartId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartId === cartId
              ? withLineTotal({ ...i, quantity: Math.max(1, Math.min(99, quantity)) })
              : i
          ),
        })),

      updateItem: (cartId, patch) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartId === cartId ? withLineTotal({ ...i, ...patch }) : i
          ),
        })),

      clearCart: () => set({ items: [], appliedCoupon: null }),

      setCoupon: (coupon) => set({ appliedCoupon: coupon }),

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
    }),
    {
      name: "uggalla-cart",
      // Persist only the durable cart contents — never the drawer's open state.
      partialize: (state) => ({ items: state.items, appliedCoupon: state.appliedCoupon }),
    }
  )
);

// ─── Pure selectors / helpers ────────────────────────────────────────────────

export function getSubtotal(items: CartItem[]): number {
  return Number(items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/**
 * Estimated coupon discount for cart/summary display. `free_delivery` returns 0
 * here (the delivery fee is only known at checkout). The server is authoritative.
 */
export function computeCouponDiscount(coupon: AppliedCoupon | null, subtotal: number): number {
  if (!coupon) return 0;
  if (coupon.min_order_amount && subtotal < coupon.min_order_amount) return 0;
  let discount = 0;
  if (coupon.type === "percent_off") discount = (subtotal * coupon.value) / 100;
  else if (coupon.type === "flat_off") discount = coupon.value;
  if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
  return Number(Math.min(discount, subtotal).toFixed(2));
}
