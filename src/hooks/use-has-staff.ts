import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current coach (owner) has any staff coaches.
 * If false, the UI should auto-treat the owner as the sole instructor
 * and suppress "No coach assigned" warnings.
 */
export function useHasStaff() {
  const [hasStaff, setHasStaff] = useState<boolean>(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setLoading(false); }
        return;
      }
      const [elite, tm] = await Promise.all([
        (supabase as any).from("elite_staff_coaches").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "active"),
        (supabase as any).from("team_members").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "active"),
      ]);
      if (cancelled) return;
      const total = (elite.count ?? 0) + (tm.count ?? 0);
      setHasStaff(total > 0);
      setOwnerId(user.id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { hasStaff, ownerId, loading };
}