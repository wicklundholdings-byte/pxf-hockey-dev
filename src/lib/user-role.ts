import { supabase } from "@/integrations/supabase/client";

export type AppRole = "coach" | "parent";

export async function getUserAppRole(userId: string): Promise<AppRole> {
  const [{ data: roleRows }, { data: teamRows }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("team_members")
      .select("id")
      .eq("member_user_id", userId)
      .eq("status", "active")
      .limit(1),
  ]);

  const roles = new Set((roleRows ?? []).map((row) => String(row.role)));
  if (roles.has("admin") || roles.has("coach")) return "coach";
  if ((teamRows ?? []).length > 0) return "coach";
  return "parent";
}

export function roleHome(role: AppRole) {
  return role === "coach" ? "/coach" : "/parent";
}