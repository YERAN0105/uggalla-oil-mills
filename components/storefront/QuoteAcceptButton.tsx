"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptQuote } from "@/lib/quote/actions";

export function QuoteAcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    const res = await acceptQuote(token);
    if (!res.ok) {
      setLoading(false);
      toast.error(res.error);
      return;
    }
    // Hand off to the existing PayHere redirect page.
    router.push(`/checkout/pay/${res.orderNumber}`);
  };

  return (
    <Button onClick={handleAccept} disabled={loading} size="lg" className="w-full gap-2">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? "Starting secure payment…" : "Accept & Pay"}
    </Button>
  );
}
