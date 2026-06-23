import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MessageableContact = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

type Scope = {
  role: "owner" | "manager" | "coach" | "assistant" | "content_creator";
  ownerId: string;
  teamMemberId: string | null;
};

async function resolveScope(supabase: any, userId: string): Promise<Scope | null> {
  // Admin/coach role on user_roles → treat as owner of own org
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roleSet = new Set((roles ?? []).map((r: any) => String(r.role)));
  if (roleSet.has("admin") || roleSet.has("coach")) {
    return { role: "owner", ownerId: userId, teamMemberId: null };
  }
  const { data: tm } = await supabase
    .from("team_members")
    .select("id, owner_id, permission_level")
    .eq("member_user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!tm) return null;
  return {
    role: (tm.permission_level ?? "coach") as Scope["role"],
    ownerId: tm.owner_id,
    teamMemberId: tm.id,
  };
}

export const listMessageableContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MessageableContact[]> => {
    const { supabase, userId } = context as any;
    const scope = await resolveScope(supabase, userId);
    if (!scope) return [];
    if (scope.role === "content_creator") return [];

    if (scope.role === "owner" || scope.role === "manager") {
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, email, phone")
        .eq("owner_id", scope.ownerId)
        .order("full_name");
      return (data ?? []) as MessageableContact[];
    }

    // coach / assistant — only contacts registered to assigned camps
    if (!scope.teamMemberId) return [];
    const { data: assigned } = await supabase
      .from("camp_staff")
      .select("camp_id")
      .eq("team_member_id", scope.teamMemberId);
    const campIds = (assigned ?? []).map((a: any) => a.camp_id);
    if (campIds.length === 0) return [];
    const { data: regs } = await supabase
      .from("registrations")
      .select("contact_id")
      .in("camp_id", campIds);
    const contactIds = Array.from(
      new Set((regs ?? []).map((r: any) => r.contact_id).filter(Boolean)),
    );
    if (contactIds.length === 0) return [];
    const { data } = await supabase
      .from("contacts")
      .select("id, full_name, email, phone")
      .in("id", contactIds)
      .order("full_name");
    return (data ?? []) as MessageableContact[];
  });

export const canMessageContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string }) => data)
  .handler(async ({ data, context }): Promise<{ allowed: boolean }> => {
    const { supabase, userId } = context as any;
    const scope = await resolveScope(supabase, userId);
    if (!scope || scope.role === "content_creator") return { allowed: false };
    if (scope.role === "owner" || scope.role === "manager") {
      const { data: c } = await supabase
        .from("contacts")
        .select("id")
        .eq("id", data.contactId)
        .eq("owner_id", scope.ownerId)
        .maybeSingle();
      return { allowed: !!c };
    }
    if (!scope.teamMemberId) return { allowed: false };
    const { data: assigned } = await supabase
      .from("camp_staff")
      .select("camp_id")
      .eq("team_member_id", scope.teamMemberId);
    const campIds = (assigned ?? []).map((a: any) => a.camp_id);
    if (campIds.length === 0) return { allowed: false };
    const { data: reg } = await supabase
      .from("registrations")
      .select("id")
      .eq("contact_id", data.contactId)
      .in("camp_id", campIds)
      .limit(1);
    return { allowed: (reg ?? []).length > 0 };
  });