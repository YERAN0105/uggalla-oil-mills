import { redirect } from "next/navigation";
import { Container } from "@/components/shared/Container";
import { AccountNav } from "@/components/account/AccountNav";
import { getAccountUser } from "@/lib/account/data";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account");

  const displayName = user.name?.trim() || user.email;
  const initials =
    (user.name?.trim() || user.email)
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <section className="min-h-screen bg-cream py-8 md:py-12">
      <Container>
        {/* Account identity band */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-sand bg-white p-5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green text-base font-bold text-gold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-green-deep">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <AccountNav />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </Container>
    </section>
  );
}
