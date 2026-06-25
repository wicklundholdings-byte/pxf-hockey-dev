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

export type TeamContact = {
  id: string;
  kind: "parent" | "athlete";
  name: string;
  email: string | null;
  player_name: string | null;
};

export const listTeamMessageableContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { teamId: string }) => data)
  .handler(async ({ data, context }): Promise<TeamContact[]> => {
    const { supabase } = context as any;
    const { data: players } = await supabase
      .from("team_players")
      .select("id, display_name, parent_contact_id, athlete_id")
      .eq("team_id", data.teamId);
    const rows = (players ?? []) as Array<{
      id: string;
      display_name: string | null;
      parent_contact_id: string | null;
      athlete_id: string | null;
    }>;

    const parentIds = Array.from(
      new Set(rows.map((r) => r.parent_contact_id).filter(Boolean) as string[]),
    );
    const athleteIds = Array.from(
      new Set(rows.map((r) => r.athlete_id).filter(Boolean) as string[]),
    );

    const parentsById: Record<string, { full_name: string | null; email: string | null }> = {};
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from("contacts")
        .select("id, full_name, email")
        .in("id", parentIds);
      (parents ?? []).forEach((p: any) => {
        parentsById[p.id] = { full_name: p.full_name, email: p.email };
      });
    }

    const athletesById: Record<string, { full_name: string | null }> = {};
    if (athleteIds.length > 0) {
      const { data: athletes } = await supabase
        .from("attendees")
        .select("id, full_name")
        .in("id", athleteIds);
      (athletes ?? []).forEach((a: any) => {
        athletesById[a.id] = { full_name: a.full_name };
      });
    }

    const result: TeamContact[] = [];
    rows.forEach((r) => {
      const playerName =
        r.display_name ||
        (r.athlete_id ? athletesById[r.athlete_id]?.full_name ?? null : null);
      if (r.parent_contact_id) {
        const p = parentsById[r.parent_contact_id];
        if (p) {
          result.push({
            id: `parent:${r.parent_contact_id}`,
            kind: "parent",
            name: p.full_name || p.email || "Parent",
            email: p.email,
            player_name: playerName,
          });
        }
      }
      if (r.athlete_id) {
        const a = athletesById[r.athlete_id];
        if (a) {
          result.push({
            id: `athlete:${r.athlete_id}`,
            kind: "athlete",
            name: a.full_name || playerName || "Athlete",
            email: null,
            player_name: playerName,
          });
        }
      }
    });

    // de-dupe by id
    const seen = new Set<string>();
    return result.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  });