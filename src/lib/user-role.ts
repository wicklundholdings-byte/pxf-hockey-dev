import { supabase } from "@/integrations/supabase/client";

export type AppRole = "coach" | "parent";

export async function getUserAppRole(userId: string): Promise<AppRole> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = new Set((data ?? []).map((row) => String(row.role)));
  if (roles.has("admin") || roles.has("coach")) return "coach";
  return "parent";
}

export function roleHome(role: AppRole) {
  return role === "coach" ? "/coach" : "/parent";
}