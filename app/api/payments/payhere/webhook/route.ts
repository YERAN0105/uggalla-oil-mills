import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyNotification,
  mapPayHereStatus,
  type PayHereNotification,
} from "@/lib/payments/payhere";

// PayHere POSTs application/x-www-form-urlencoded server-to-server. We always
// return 200 so PayHere doesn't retry indefinitely; problems are logged and the
// raw payload is stored for manual review.
export async function POST(request: Request) {
  let payload: PayHereNotification;
  try {
    const form = await request.formData();
    const obj: Record<string, string> = {};
    for (const [k, v] of form.entries()) obj[k] = String(v);
    payload = obj as unknown as PayHereNotification;
  } catch (err) {
    console.error("[payhere webhook] could not parse body:", err);
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  // Verify signature — on failure, log for manual review and bail (still 200).
  // We can't store a payments row here: order_id is NOT NULL and the payload is
  // untrusted, so we don't attach it to any order.
  const valid = verifyNotification(payload);
  if (!valid) {
    console.error("[payhere webhook] signature verification failed", payload.order_id, payload);
    return NextResponse.json({ ok: true });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, payment_status, status")
    .eq("order_number", payload.order_id)
    .maybeSingle();

  if (!order) {
    console.error("[payhere webhook] unknown order:", payload.order_id);
    return NextResponse.json({ ok: true });
  }

  const outcome = mapPayHereStatus(payload.status_code);

  // Always record the payment attempt with the full raw response.
  await admin.from("payments").insert({
    order_id: order.id,
    gateway: "payhere",
    gateway_transaction_id: payload.payment_id ?? null,
    amount: Number(payload.payhere_amount ?? 0),
    status: outcome,
    raw_response: payload as unknown as Record<string, unknown>,
  });

  // Map outcome → order fields.
  let paymentStatus: string | null = null;
  let orderStatus: string | null = null;
  switch (outcome) {
    case "paid":
      paymentStatus = "paid";
      orderStatus = "confirmed";
      break;
    case "pending":
      paymentStatus = "pending";
      break;
    case "cancelled":
    case "failed":
      paymentStatus = "pending"; // leave recoverable; customer can retry
      break;
    case "chargedback":
      paymentStatus = "refunded";
      orderStatus = "refunded";
      break;
  }

  if (paymentStatus) {
    const update: Record<string, string> = { payment_status: paymentStatus };
    if (orderStatus) update.status = orderStatus;
    await admin.from("orders").update(update).eq("id", order.id);

    if (orderStatus) {
      await admin.from("order_status_history").insert({
        order_id: order.id,
        status: orderStatus,
        note: `PayHere: ${outcome}`,
      });
    }
  }

  // TODO Phase 6: notify('payment_received') on paid.
  return NextResponse.json({ ok: true });
}
