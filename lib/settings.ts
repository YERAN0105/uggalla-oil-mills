import { createAdminClient } from "@/lib/supabase/admin";
import type {
  TaxSettings,
  LoyaltySettings,
  CodLimits,
  BankDetails,
  ShopInfo,
} from "@/types/checkout";

const DEFAULT_TAX: TaxSettings = { rate: 0, inclusive: false, label: "Tax" };

const DEFAULT_LOYALTY: LoyaltySettings = {
  // Default ON so existing behavior is unchanged until an admin turns a side off.
  earn_enabled: true,
  redeem_enabled: true,
  earn_rate: 1,
  earn_per_amount: 100,
  redeem_rate: 50,
  redeem_per_points: 100,
  max_redeem_percent: 20,
  expiry_months: 12,
  first_order_bonus: 50,
  review_bonus: 10,
};

const DEFAULT_COD: CodLimits = {
  min_order_amount: 500,
  max_order_amount: null,
  enabled: true,
};

const DEFAULT_BANK: BankDetails = {
  bank_name: "Bank of Ceylon",
  account_name: "Uggalla Oil Mills (Pvt) Ltd",
  account_number: "0000 0000 0000",
  branch: "Padukka",
};

/**
 * Read one settings row by key. Returns `fallback` if missing.
 * Uses the service-role client: settings are admin-only under RLS, and the
 * storefront needs several keys (cod_limits, bank_details, loyalty) server-side.
 * Server-only — never import this into a Client Component.
 */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const admin = createAdminClient();
  const { data } = await admin.from("settings").select("value").eq("key", key).maybeSingle();
  if (!data?.value) return fallback;
  return data.value as T;
}

export async function getTaxSettings(): Promise<TaxSettings> {
  return getSetting<TaxSettings>("tax", DEFAULT_TAX);
}

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  // Merge over defaults so a settings row saved before the on/off toggles existed
  // still reports earn/redeem as enabled (back-compat).
  const stored = await getSetting<Partial<LoyaltySettings>>("loyalty", DEFAULT_LOYALTY);
  return { ...DEFAULT_LOYALTY, ...stored };
}

export async function getCodLimits(): Promise<CodLimits> {
  return getSetting<CodLimits>("cod_limits", DEFAULT_COD);
}

export async function getBankDetails(): Promise<BankDetails> {
  // bank_details may not be seeded; fall back to placeholders.
  return getSetting<BankDetails>("bank_details", DEFAULT_BANK);
}

export async function getShopInfo(): Promise<ShopInfo> {
  return getSetting<ShopInfo>("shop_info", {
    name: "Uggalla Oil Mills",
    address: "Padukka, Sri Lanka",
    phone: "+94 77 XXX XXXX",
    email: "hello@uggallaoilmills.lk",
    whatsapp: "+94 77 XXX XXXX",
  });
}

export { DEFAULT_TAX, DEFAULT_LOYALTY, DEFAULT_COD, DEFAULT_BANK };
