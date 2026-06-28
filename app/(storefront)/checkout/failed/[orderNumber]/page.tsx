import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { Button } from "@/components/ui/button";
import { signOrderToken } from "@/lib/orders/token";

export const metadata: Metadata = { title: "Payment Incomplete" };

interface FailedPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function CheckoutFailedPage({ params }: FailedPageProps) {
  const { orderNumber } = await params;
  const token = signOrderToken(orderNumber);

  return (
    <section className="bg-cream min-h-screen flex items-center">
      <Container className="py-20">
        <FadeIn className="mx-auto max-w-md text-center space-y-5">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="font-display text-3xl text-green-deep">Payment not completed</h1>
          <p className="text-muted-foreground">
            Your payment for order <span className="font-semibold text-green-deep">{orderNumber}</span> was
            cancelled or didn&apos;t go through. Don&apos;t worry, your order is saved and no charge was made.
            You can try paying again or choose another payment method.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild>
              <Link href={`/checkout/pay/${orderNumber}`}>Try Payment Again</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/order-success/${orderNumber}?t=${token}`}>View Order</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Need help?{" "}
            <Link href="/contact" className="underline hover:text-green">
              Contact us
            </Link>
            .
          </p>
        </FadeIn>
      </Container>
    </section>
  );
}
