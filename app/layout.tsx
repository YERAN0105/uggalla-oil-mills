import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { MotionProvider } from "@/components/shared/MotionProvider";
import { brand } from "@/lib/brand";
import "./globals.css";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description:
    "Pure, fresh oils — including coconut, rice bran and sunflower — from Padukka, Sri Lanka. Naturally good, with no additives, delivered island-wide.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    siteName: brand.name,
    type: "website",
    locale: "en_LK",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-cream font-sans antialiased">
        <MotionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--color-cream)",
                border: "1px solid var(--border)",
                color: "var(--color-green-deep)",
                fontFamily: "var(--font-sans)",
              },
            }}
          />
        </MotionProvider>
      </body>
    </html>
  );
}
