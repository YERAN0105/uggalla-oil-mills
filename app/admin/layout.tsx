import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { getBadgeCounts } from "@/lib/admin/badges";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin — Uggalla Oil Mills" },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const badges = await getBadgeCounts();

  return (
    <AdminShell user={user} badges={badges}>
      {children}
    </AdminShell>
  );
}
