import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    async function refreshRole(u: User | null) {
      if (!u) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id);
      if (!cancel) setIsAdmin(!!data?.some((r) => r.role === "admin"));
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancel) return;
      const u = data.session?.user ?? null;
      setUser(u);
      refreshRole(u).finally(() => !cancel && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      refreshRole(u);
    });

    return () => { cancel = true; sub.subscription.unsubscribe(); };
  }, []);

  return { user, isAdmin, loading };
}
