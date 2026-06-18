// Generic branded transactional email (React Email). Used by the non-order-status
// notifications (welcome, bulk request received, bulk quote sent, subscription
// reminder, review request, admin alerts). Order-status emails use the richer
// OrderStatusEmail template instead.
//
// Brand palette is inlined (email clients can't use CSS vars or Tailwind):
// green #1B6B3A, deep #123524, gold #F6C026, cream #FBF7EE, sand #F1E9D6.

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { brand } from "@/lib/brand";

export interface NotificationEmailRow {
  label: string;
  value: string;
}

export interface NotificationEmailProps {
  /** Browser/inbox preview line. */
  preview: string;
  /** Optional "Hi {name}," greeting. */
  recipientName?: string | null;
  heading: string;
  /** One or more body paragraphs. */
  paragraphs: string[];
  /** Optional highlighted info card (e.g. quote details). */
  rows?: NotificationEmailRow[];
  /**
   * Optional distinct, labelled message box — e.g. the shop's personal note on a
   * quote — so the customer can clearly tell it apart from the system text.
   */
  message?: { label?: string; text: string } | null;
  /** Optional call-to-action button. */
  cta?: { label: string; url: string } | null;
  /** Optional small note shown under the CTA / body. */
  footnote?: string | null;
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

const FONT_DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif";
const FONT_SANS = "'DM Sans', Helvetica, Arial, sans-serif";

export function NotificationEmail(props: NotificationEmailProps) {
  const { preview, recipientName, heading, paragraphs, rows, message, cta, footnote, shopEmail, shopPhone } =
    props;

  return (
    <Html>
      <Head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.cream, margin: 0, padding: "24px 0", fontFamily: FONT_SANS }}>
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
          }}
        >
          {/* Header band */}
          <Section style={{ backgroundColor: colors.green, padding: "28px 32px", textAlign: "center" as const }}>
            <Heading
              as="h1"
              style={{ color: "#ffffff", margin: 0, fontSize: "26px", letterSpacing: "0.5px", fontFamily: FONT_DISPLAY }}
            >
              {brand.name}
            </Heading>
            <Text style={{ color: colors.gold, margin: "6px 0 0", fontSize: "13px" }}>{brand.tagline}</Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            {recipientName ? (
              <Heading as="h2" style={{ color: colors.deep, fontSize: "20px", margin: "0 0 4px", fontFamily: FONT_DISPLAY }}>
                Hi {recipientName},
              </Heading>
            ) : null}
            <Heading as="h2" style={{ color: colors.green, fontSize: "20px", margin: "0 0 14px", fontFamily: FONT_DISPLAY }}>
              {heading}
            </Heading>

            {paragraphs.map((p, i) => (
              <Text key={i} style={{ color: "#374151", fontSize: "15px", lineHeight: "22px", margin: "0 0 12px" }}>
                {p}
              </Text>
            ))}

            {rows && rows.length > 0 ? (
              <Section style={{ backgroundColor: colors.sand, borderRadius: "8px", padding: "16px 20px", margin: "8px 0 4px" }}>
                {rows.map((r, i) => (
                  <Row key={i}>
                    <Column>
                      <Text style={{ color: colors.muted, fontSize: "13px", margin: "2px 0" }}>{r.label}</Text>
                    </Column>
                    <Column style={{ textAlign: "right" as const }}>
                      <Text style={{ color: colors.deep, fontSize: "13px", fontWeight: 600, margin: "2px 0" }}>{r.value}</Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            ) : null}

            {message && message.text ? (
              <Section
                style={{
                  borderLeft: `4px solid ${colors.gold}`,
                  backgroundColor: colors.cream,
                  borderRadius: "6px",
                  padding: "14px 16px",
                  margin: "8px 0 4px",
                }}
              >
                {message.label ? (
                  <Text
                    style={{
                      color: colors.green,
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.6px",
                      margin: "0 0 6px",
                    }}
                  >
                    {message.label}
                  </Text>
                ) : null}
                <Text
                  style={{
                    color: colors.deep,
                    fontSize: "15px",
                    lineHeight: "22px",
                    margin: 0,
                    whiteSpace: "pre-wrap" as const,
                  }}
                >
                  {message.text}
                </Text>
              </Section>
            ) : null}

            {cta ? (
              <Section style={{ textAlign: "center" as const, margin: "24px 0 8px" }}>
                <Button
                  href={cta.url}
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
                  {cta.label}
                </Button>
              </Section>
            ) : null}

            {footnote ? (
              <Text style={{ color: colors.muted, fontSize: "12px", textAlign: "center" as const, margin: "8px 0 0" }}>
                {footnote}
              </Text>
            ) : null}
          </Section>

          <Hr style={{ borderColor: colors.border, margin: 0 }} />

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

export default NotificationEmail;
