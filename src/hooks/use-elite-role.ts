import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type EliteRole = "owner" | "staff" | "none";

export function useEliteRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<EliteRole>("none");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [assignedTeamIds, setAssignedTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user?.id) {
      setRole("none");
      setOwnerId(null);
      setAssignedTeamIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      // Am I an active staff coach?
      const { data: staffRow } = await (supabase as any)
        .from("elite_staff_coaches")
        .select("id, owner_id, status")
        .eq("staff_user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (staffRow) {
        const { data: asn } = await (supabase as any)
          .from("elite_staff_team_assignments")
          .select("team_id")
          .eq("staff_id", staffRow.id);
        if (cancelled) return;
        setRole("staff");
        setOwnerId(staffRow.owner_id);
        setAssignedTeamIds(((asn ?? []) as { team_id: string }[]).map((r) => r.team_id));
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setRole("owner");
      setOwnerId(user.id);
      setAssignedTeamIds([]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return { role, ownerId, assignedTeamIds, loading };
}