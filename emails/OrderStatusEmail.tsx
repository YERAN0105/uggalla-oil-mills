// Branded order-status email (React Email). Rendered by lib/notifications/email.ts
// and sent via Resend. Brand palette is inlined (email clients can't use CSS vars
// or Tailwind): green #1B6B3A, deep #123524, gold #F6C026, cream #FBF7EE, sand
// #F1E9D6. Keep this template self-contained and table/inline-style based so it
// renders consistently across mail clients.

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import { brand, formatCurrency } from "@/lib/brand";

export interface OrderEmailItem {
  name: string;
  sizeLabel: string | null;
  quantity: number;
  lineTotal: number;
}

export interface OrderStatusEmailProps {
  recipientName: string | null;
  orderNumber: string;
  heading: string;
  message: string;
  /** Optional extra line, e.g. a cancellation/refund reason. */
  note?: string | null;
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  loyaltyDiscount: number;
  tax: number;
  total: number;
  fulfillmentType: "delivery" | "pickup";
  deliveryDate: string | null;
  viewOrderUrl: string;
  shopEmail: string;
  shopPhone: string;
}

const colors = {
  green: "#1B6B3A",
  deep: "#123524",
  gold: "#F6C026",
  cream: "#FBF7EE",
  sand: "#F1E9D6",
  muted: "#6b7280",
  border: "#e7e0cf",
};

// Match the storefront type: Fraunces (display) + DM Sans (body). Email clients
// that support web fonts (Apple Mail, iOS) load them via the <link> in <Head>;
// the rest fall back gracefully to the serif/sans stacks below.
const FONT_DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif";
const FONT_SANS = "'DM Sans', Helvetica, Arial, sans-serif";

export function OrderStatusEmail(props: OrderStatusEmailProps) {
  const {
    recipientName,
    orderNumber,
    heading,
    message,
    note,
    items,
    subtotal,
    deliveryFee,
    discount,
    loyaltyDiscount,
    tax,
    total,
    fulfillmentType,
    deliveryDate,
    viewOrderUrl,
    shopEmail,
    shopPhone,
  } = props;

  return (
    <Html>
      <Head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap"
        />
      </Head>
      <Preview>{heading} — order {orderNumber}</Preview>
      <Body style={{ backgroundColor: colors.cream, margin: 0, padding: "24px 0", fontFamily: FONT_SANS }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", border: `1px solid ${colors.border}` }}>
          {/* Header band */}
          <Section style={{ backgroundColor: colors.green, padding: "28px 32px", textAlign: "center" as const }}>
            <Heading as="h1" style={{ color: "#ffffff", margin: 0, fontSize: "26px", letterSpacing: "0.5px", fontFamily: FONT_DISPLAY }}>
              {brand.name}
            </Heading>
            <Text style={{ color: colors.gold, margin: "6px 0 0", fontSize: "13px" }}>{brand.tagline}</Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Heading as="h2" style={{ color: colors.deep, fontSize: "22px", margin: "0 0 4px", fontFamily: FONT_DISPLAY }}>
              {recipientName ? `Hi ${recipientName},` : "Hello,"}
            </Heading>
            <Heading as="h2" style={{ color: colors.green, fontSize: "20px", margin: "0 0 12px", fontFamily: FONT_DISPLAY }}>
              {heading}
            </Heading>
            <Text style={{ color: "#374151", fontSize: "15px", lineHeight: "22px", margin: 0 }}>{message}</Text>

            {note ? (
              <Section style={{ backgroundColor: "#fef3c7", borderRadius: "8px", padding: "12px 16px", margin: "16px 0 0" }}>
                <Text style={{ color: "#92400e", fontSize: "14px", margin: 0 }}>{note}</Text>
              </Section>
            ) : null}

            {/* Order meta */}
            <Section style={{ backgroundColor: colors.sand, borderRadius: "8px", padding: "16px 20px", margin: "20px 0" }}>
              <MetaRow label="Order Number" value={orderNumber} bold />
              {deliveryDate ? (
                <MetaRow label={fulfillmentType === "pickup" ? "Pickup Date" : "Delivery Date"} value={deliveryDate} />
              ) : null}
            </Section>

            {/* Items */}
            {items.map((item, i) => (
              <Row key={i} style={{ paddingBottom: "10px" }}>
                <Column>
                  <Text style={{ color: colors.deep, fontSize: "14px", fontWeight: 600, margin: 0 }}>{item.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: "12px", margin: "2px 0 0" }}>
                    {[item.sizeLabel, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" as const, verticalAlign: "top" as const, width: "110px" }}>
                  <Text style={{ color: colors.deep, fontSize: "14px", fontWeight: 600, margin: 0 }}>
                    {formatCurrency(item.lineTotal)}
                  </Text>
                </Column>
              </Row>
            ))}

            <Hr style={{ borderColor: colors.border, margin: "8px 0 12px" }} />

            {/* Totals */}
            <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />
            {discount > 0 ? <TotalRow label="Discount" value={`−${formatCurrency(discount)}`} accent /> : null}
            {loyaltyDiscount > 0 ? <TotalRow label="Loyalty" value={`−${formatCurrency(loyaltyDiscount)}`} accent /> : null}
            {fulfillmentType === "delivery" ? <TotalRow label="Delivery" value={formatCurrency(deliveryFee)} /> : null}
            {tax > 0 ? <TotalRow label="Tax" value={formatCurrency(tax)} /> : null}

            <Row style={{ borderTop: `1px solid ${colors.border}`, paddingTop: "10px", marginTop: "4px" }}>
              <Column>
                <Text style={{ color: colors.deep, fontSize: "16px", fontWeight: 700, margin: 0 }}>Total</Text>
              </Column>
              <Column style={{ textAlign: "right" as const }}>
                <Text style={{ color: colors.green, fontSize: "18px", fontWeight: 700, margin: 0 }}>
                  {formatCurrency(total)}
                </Text>
              </Column>
            </Row>

            {/* CTA */}
            <Section style={{ textAlign: "center" as const, margin: "28px 0 8px" }}>
              <Button
                href={viewOrderUrl}
                style={{
                  backgroundColor: colors.green,
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 600,
                  padding: "12px 28px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                View Order
              </Button>
            </Section>
            <Text style={{ color: colors.muted, fontSize: "12px", textAlign: "center" as const, margin: "8px 0 0" }}>
              Or use your order number <strong>{orderNumber}</strong> to look up your order.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: colors.cream, padding: "20px 32px", textAlign: "center" as const }}>
            <Text style={{ color: colors.muted, fontSize: "12px", margin: 0 }}>
              Questions? Reply to this email or contact us at{" "}
              <Link href={`mailto:${shopEmail}`} style={{ color: colors.green }}>
                {shopEmail}
              </Link>{" "}
              · {shopPhone}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function MetaRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Row>
      <Column>
        <Text style={{ color: colors.muted, fontSize: "13px", margin: "2px 0" }}>{label}</Text>
      </Column>
      <Column style={{ textAlign: "right" as const }}>
        <Text style={{ color: colors.deep, fontSize: "13px", fontWeight: bold ? 700 : 500, margin: "2px 0" }}>{value}</Text>
      </Column>
    </Row>
  );
}

function TotalRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Row style={{ paddingBottom: "4px" }}>
      <Column>
        <Text style={{ color: accent ? colors.green : colors.muted, fontSize: "13px", margin: "2px 0" }}>{label}</Text>
      </Column>
      <Column style={{ textAlign: "right" as const }}>
        <Text style={{ color: accent ? colors.green : colors.deep, fontSize: "13px", fontWeight: 500, margin: "2px 0" }}>
          {value}
        </Text>
      </Column>
    </Row>
  );
}

export default OrderStatusEmail;
