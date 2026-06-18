import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOrderToken } from "@/lib/orders/token";
import type { OrderWithItems } from "@/types/checkout";

const ORDER_SELECT = `
  id, order_number, user_id, guest_email, guest_phone, status, fulfillment_type,
  delivery_zone_id, address_snapshot, delivery_date, time_slot_id,
  payment_method, payment_status, subtotal, delivery_fee, discount_amount,
  tax_amount, loyalty_points_used, loyalty_discount, total, notes, quote_note, source, created_at,
  order_items(id, product_snapshot, options, quantity, unit_price, line_total),
  delivery_zone:delivery_zone_id(id, name, fee, estimated_time),
  time_slot:time_slot_id(id, label),
  order_status_history(status, note, changed_at),
  bank_transfer_receipts(id, status, uploaded_at)
`;

interface ReceiptRow {
  status: string;
  uploaded_at: string;
}
interface HistoryRow {
  changed_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shape(row: any): OrderWithItems {
  const receipts: ReceiptRow[] = ((row.bank_transfer_receipts ?? []) as ReceiptRow[])
    .slice()
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  const bank_receipt = receipts.find((r) => r.status === "pending") ?? receipts[0] ?? null;
  const history: HistoryRow[] = ((row.order_status_history ?? []) as HistoryRow[])
    .slice()
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
  return { ...row, history, bank_receipt } as OrderWithItems;
}

/**
 * Fetch an order for the success / tracking pages. Access is granted if the
 * caller either (a) owns the order while logged in, or (b) presents a valid HMAC
 * token. Uses the admin client so guest orders (no auth row) are reachable, with
 * authorization enforced here rather than via RLS.
 */
export async function getOrderForView(
  orderNumber: string,
  token?: string | null
): Promise<OrderWithItems | null> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!order) return null;

  // Token grants access.
  if (verifyOrderToken(orderNumber, token)) return shape(order);

  // Otherwise the logged-in owner may view it.
  if (order.user_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.id === order.user_id) return shape(order);
  }

  return null;
}

/** Guest tracking: look up by order number + matching email or phone. */
export async function trackGuestOrder(
  orderNumber: string,
  emailOrPhone: string
): Promise<OrderWithItems | null> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber.trim())
    .maybeSingle();
  if (!order) return null;

  const needle = emailOrPhone.trim().toLowerCase();
  const matches =
    order.guest_email?.toLowerCase() === needle ||
    order.guest_phone === emailOrPhone.trim() ||
    // Logged-in orders: match the auth email.
    (await ownerEmailMatches(order.user_id, needle));

  return matches ? shape(order) : null;
}

async function ownerEmailMatches(userId: string | null, needle: string): Promise<boolean> {
  if (!userId) return false;
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email?.toLowerCase() === needle;
}
