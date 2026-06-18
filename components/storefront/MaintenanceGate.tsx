// Storefront maintenance-mode enforcement (Phase 6).
//
// Returns a branded "back soon" screen when the `maintenance` setting is enabled,
// EXCEPT for admins (so the shop owner can keep working / previewing). Returns
// null when the storefront should render normally. Called from the storefront
// layout: `const gate = await MaintenanceGate(); if (gate) return gate;`

import { createClient } from "@/lib/supabase/server";
import { getSetting } from "@/lib/settings";
import { brand } from "@/lib/brand";
import { DropletSVG } from "@/components/shared/DropletSVG";
import type { MaintenanceSettings } from "@/types/admin";

export async function MaintenanceGate(): Promise<React.ReactNode | null> {
  const maintenance = await getSetting<MaintenanceSettings>("maintenance", { enabled: false, message: "" });
  if (!maintenance.enabled) return null;

  // Admins bypass maintenance mode.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "admin") return null;
    }
  } catch {
    // If we can't determine the role, fail closed to the maintenance screen.
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
      <DropletSVG className="h-16 w-16 text-green" />
      <h1 className="mt-6 font-display text-3xl font-semibold text-green-deep">{brand.name}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        {maintenance.message?.trim() || "We're doing a little maintenance and will be back shortly. Thank you for your patience."}
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        {brand.email} · {brand.phone}
      </p>
    </div>
  );
}
