"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AuthUserInfo {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Lightweight client hook for the signed-in user, used by the header to show an
 * account avatar/menu. Subscribes to auth changes so the header updates on
 * login/logout without a full reload.
 */
export function useAuthUser(): { user: AuthUserInfo | null; loading: boolean } {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const toInfo = (u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) =>
      u
        ? {
            id: u.id,
            email: u.email ?? "",
            name: (u.user_metadata?.name as string) ?? (u.user_metadata?.full_name as string) ?? null,
          }
        : null;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(toInfo(data.user));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toInfo(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
