import type { Metadata } from "next";
import { Truck, Clock, MapPin, Package } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { brand } from "@/lib/brand";
import { getShopInfo } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Delivery Information",
  description: `Delivery zones, fees, and timelines for ${brand.name}.`,
};

const zones = [
  {
    name: "Padukka & Nearby",
    area: "Within 10 km of our store",
    fee: "Rs. 300.00",
    time: "1–2 hours",
  },
  {
    name: "Greater Colombo",
    area: "Colombo, Nugegoda, Maharagama & surrounds",
    fee: "Rs. 500.00",
    time: "Same day / next day",
  },
  {
    name: "Island-Wide",
    area: "All other areas of Sri Lanka",
    fee: "Rs. 900.00",
    time: "2–3 business days",
  },
];

export default async function DeliveryInfoPage() {
  const shopInfo = await getShopInfo();

  return (
    <>
      <section className="py-16 bg-green-deep text-white">
        <Container>
          <FadeIn>
            <span className="text-eyebrow text-gold/80 mb-3 block">Shipping</span>
            <h1 className="font-display text-5xl font-bold">Delivery Information</h1>
          </FadeIn>
        </Container>
      </section>

      <section className="py-16 bg-cream">
        <Container>
          <div className="grid lg:grid-cols-2 gap-14">
            <FadeIn direction="right">
              <div className="space-y-6">
                <h2 className="font-display text-3xl text-green-deep">Delivery Zones &amp; Fees</h2>
                <div className="space-y-4">
                  {zones.map((zone) => (
                    <div key={zone.name} className="bg-white rounded-xl border border-sand p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-green-deep">{zone.name}</h3>
                          <p className="text-muted-foreground text-sm">{zone.area}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-green">{zone.fee}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3" /> {zone.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  Free delivery on all orders over Rs.{" "}
                  {brand.freeDeliveryThreshold.toLocaleString()}.
                </p>
              </div>
            </FadeIn>

            <FadeIn direction="left">
              <div className="space-y-8">
                <h2 className="font-display text-3xl text-green-deep">Good to Know</h2>
                <div className="space-y-6">
                  {[
                    {
                      icon: Package,
                      title: "Pickup Available",
                      desc: "Prefer to collect? Pick up from our store in Padukka at no extra charge. Select 'Pickup' at checkout and choose a time slot.",
                    },
                    {
                      icon: Clock,
                      title: "Order Cut-Off",
                      desc: `Orders placed before 2:00 PM are typically dispatched the same day (Mon–Sat). Orders placed after cut-off are sent the next working day.`,
                    },
                    {
                      icon: MapPin,
                      title: "Store Address",
                      desc: shopInfo.address,
                    },
                    {
                      icon: Truck,
                      title: "Tracking",
                      desc: "You'll receive an email and WhatsApp notification when your order is dispatched, along with a tracking update.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-sage/50 flex-shrink-0 flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-green" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-deep">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </Container>
      </section>
    </>
  );
}
