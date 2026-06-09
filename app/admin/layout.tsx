import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin — Uggalla Oil Mills" } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-green-deep text-white">
      {children}
    </div>
  );
}
