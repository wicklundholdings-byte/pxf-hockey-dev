import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { startISO: start.toISOString().slice(0, 10), endISO: end.toISOString().slice(0, 10), startDate: start };
}

export const setStaffSessionRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; rateCents: number }) => d)
  .handler(async ({ data, context }) => {
    const rate = Math.max(0, Math.floor(data.rateCents || 0));
    const { error } = await context.supabase
      .from("elite_staff_coaches")
      .update({ session_rate_cents: rate })
      .eq("id", data.staffId)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, rateCents: rate };
  });

export const listAssignableSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

    // Camp sessions for owner's camps
    const { data: camps } = await context.supabase
      .from("camps").select("id,name").eq("owner_id", context.userId);
    const campIds = (camps ?? []).map((c: any) => c.id);
    const campNameById = new Map<string, string>((camps ?? []).map((c: any) => [c.id, c.name as string]));
    let campSessions: any[] = [];
    if (campIds.length) {
      const { data } = await context.supabase
        .from("camp_sessions")
        .select("id,camp_id,session_date,start_time,end_time")
        .in("camp_id", campIds)
        .gte("session_date", today).lte("session_date", horizon)
        .order("session_date");
      campSessions = data ?? [];
    }

    // Team practices for owner's teams
    const { data: teams } = await context.supabase
      .from("teams").select("id,name").eq("coach_id", context.userId);
    const teamIds = (teams ?? []).map((t: any) => t.id);
    const teamNameById = new Map<string, string>((teams ?? []).map((t: any) => [t.id, t.name as string]));
    let teamEvents: any[] = [];
    if (teamIds.length) {
      const { data } = await context.supabase
        .from("team_events")
        .select("id,team_id,event_type,title,event_date,start_time")
        .in("team_id", teamIds)
        .in("event_type", ["practice", "game"])
        .gte("event_date", today).lte("event_date", horizon)
        .order("event_date");
      teamEvents = data ?? [];
    }

    return {
      campSessions: campSessions.map((s) => ({
        id: s.id as string, date: s.session_date as string,
        start: (s.start_time as string)?.slice(0, 5) ?? null,
        label: campNameById.get(s.camp_id) ?? "Camp",
      })),
      teamEvents: teamEvents.map((e) => ({
        id: e.id as string, date: e.event_date as string,
        start: (e.start_time as string)?.slice(0, 5) ?? null,
        label: `${teamNameById.get(e.team_id) ?? "Team"} · ${e.title ?? (e.event_type === "practice" ? "Practice" : "Game")}`,
      })),
    };
  });

export const listStaffAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("staff_session_assignments")
      .select("id, source_type, source_id, session_date, rate_cents")
      .eq("owner_id", context.userId)
      .eq("staff_id", data.staffId);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{ id: string; source_type: "camp_session" | "team_event"; source_id: string; session_date: string; rate_cents: number }>;
  });

export const assignStaffToSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; sourceType: "camp_session" | "team_event"; sourceId: string; sessionDate: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase
      .from("elite_staff_coaches")
      .select("id, session_rate_cents")
      .eq("id", data.staffId).eq("owner_id", context.userId).maybeSingle();
    if (!staff) throw new Error("Staff not found");
    const rate = (staff as any).session_rate_cents ?? 0;
    const { error } = await context.supabase.from("staff_session_assignments").upsert({
      owner_id: context.userId,
      staff_id: data.staffId,
      source_type: data.sourceType,
      source_id: data.sourceId,
      session_date: data.sessionDate,
      rate_cents: rate,
    }, { onConflict: "staff_id,source_type,source_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unassignStaffFromSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { staffId: string; sourceType: "camp_session" | "team_event"; sourceId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("staff_session_assignments")
      .delete()
      .eq("owner_id", context.userId)
      .eq("staff_id", data.staffId)
      .eq("source_type", data.sourceType)
      .eq("source_id", data.sourceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCoachCostsThisMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { startISO, endISO } = monthRange();
    const { data: rows } = await context.supabase
      .from("staff_session_assignments")
      .select("id, staff_id, source_type, source_id, session_date, rate_cents")
      .eq("owner_id", context.userId)
      .gte("session_date", startISO).lt("session_date", endISO);
    const items = (rows ?? []) as any[];

    const { data: staffRows } = await context.supabase
      .from("elite_staff_coaches")
      .select("id, full_name, email")
      .eq("owner_id", context.userId);
    const byStaff = new Map<string, { name: string; email: string; sessions: number; totalCents: number; items: any[] }>();
    (staffRows ?? []).forEach((s: any) => {
      byStaff.set(s.id, { name: s.full_name || s.email.split("@")[0], email: s.email, sessions: 0, totalCents: 0, items: [] });
    });
    for (const r of items) {
      const b = byStaff.get(r.staff_id);
      if (!b) continue;
      b.sessions += 1;
      b.totalCents += r.rate_cents ?? 0;
      b.items.push(r);
    }

    // Resolve labels for items
    const campSessionIds = items.filter((i) => i.source_type === "camp_session").map((i) => i.source_id);
    const teamEventIds = items.filter((i) => i.source_type === "team_event").map((i) => i.source_id);
    const labelMap = new Map<string, string>();
    if (campSessionIds.length) {
      const { data } = await context.supabase
        .from("camp_sessions").select("id, camps(name)").in("id", campSessionIds);
      (data ?? []).forEach((d: any) => labelMap.set(`camp_session:${d.id}`, d.camps?.name ?? "Camp"));
    }
    if (teamEventIds.length) {
      const { data } = await context.supabase
        .from("team_events").select("id, event_type, title, teams(name)").in("id", teamEventIds);
      (data ?? []).forEach((d: any) => labelMap.set(`team_event:${d.id}`, `${d.teams?.name ?? "Team"} · ${d.title ?? (d.event_type === "practice" ? "Practice" : "Game")}`));
    }

    const staff = Array.from(byStaff.entries())
      .map(([id, v]) => ({
        staffId: id, name: v.name, email: v.email,
        sessions: v.sessions, totalCents: v.totalCents,
        items: v.items.map((i) => ({
          date: i.session_date,
          rateCents: i.rate_cents,
          label: labelMap.get(`${i.source_type}:${i.source_id}`) ?? "Session",
        })).sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .filter((s) => s.sessions > 0)
      .sort((a, b) => b.totalCents - a.totalCents);

    const totalCents = staff.reduce((s, x) => s + x.totalCents, 0);
    return { staff, totalCents };
  });

export const setIceCostOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amountCents: number }) => d)
  .handler(async ({ data, context }) => {
    const { startISO } = monthRange();
    const amount = Math.max(0, Math.floor(data.amountCents || 0));
    const { error } = await context.supabase
      .from("ice_cost_overrides")
      .upsert({ owner_id: context.userId, month_start: startISO, amount_cents: amount }, { onConflict: "owner_id,month_start" });
    if (error) throw new Error(error.message);
    return { ok: true, amountCents: amount };
  });

export const getIceCostsThisMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { startISO, endISO } = monthRange();
    const { data: slots } = await context.supabase
      .from("ice_slots")
      .select("start_time, end_time, cost_per_hour_cents")
      .eq("owner_id", context.userId)
      .gte("slot_date", startISO).lt("slot_date", endISO);

    let autoCents = 0;
    let pricedCount = 0;
    for (const s of (slots ?? []) as any[]) {
      if (s.cost_per_hour_cents == null) continue;
      const [sh, sm] = String(s.start_time).split(":").map(Number);
      const [eh, em] = String(s.end_time).split(":").map(Number);
      const minutes = (eh * 60 + em) - (sh * 60 + sm);
      if (minutes > 0) {
        autoCents += Math.round((minutes / 60) * s.cost_per_hour_cents);
        pricedCount += 1;
      }
    }

    const { data: override } = await context.supabase
      .from("ice_cost_overrides")
      .select("amount_cents")
      .eq("owner_id", context.userId)
      .eq("month_start", startISO)
      .maybeSingle();

    const overrideCents = (override as any)?.amount_cents ?? null;
    const mode: "auto" | "override" = pricedCount > 0 ? "auto" : (overrideCents != null ? "override" : "auto");
    const totalCents = mode === "auto" ? autoCents : (overrideCents ?? 0);
    return { totalCents, autoCents, overrideCents, mode, pricedCount };
  });

export const listMyStaffEarnings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staff } = await context.supabase
      .from("elite_staff_coaches")
      .select("id, owner_id")
      .eq("staff_user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!staff) return { monthCents: 0, seasonCents: 0, monthItems: [] as Array<{ date: string; label: string; rateCents: number }>, monthSessions: 0 };

    const { startISO, endISO } = monthRange();
    const seasonStart = new Date(new Date().getFullYear(), 7, 1); // Aug 1
    if (seasonStart > new Date()) seasonStart.setFullYear(seasonStart.getFullYear() - 1);
    const seasonISO = seasonStart.toISOString().slice(0, 10);

    const { data: rows } = await context.supabase
      .from("staff_session_assignments")
      .select("source_type, source_id, session_date, rate_cents")
      .eq("staff_id", (staff as any).id)
      .gte("session_date", seasonISO);
    const items = (rows ?? []) as any[];

    const monthItems = items.filter((i) => i.session_date >= startISO && i.session_date < endISO);
    const monthCents = monthItems.reduce((s, i) => s + (i.rate_cents ?? 0), 0);
    const seasonCents = items.reduce((s, i) => s + (i.rate_cents ?? 0), 0);

    // labels
    const campIds = monthItems.filter((i) => i.source_type === "camp_session").map((i) => i.source_id);
    const teamIds = monthItems.filter((i) => i.source_type === "team_event").map((i) => i.source_id);
    const labelMap = new Map<string, string>();
    if (campIds.length) {
      const { data } = await context.supabase.from("camp_sessions").select("id, camps(name)").in("id", campIds);
      (data ?? []).forEach((d: any) => labelMap.set(`camp_session:${d.id}`, d.camps?.name ?? "Camp"));
    }
    if (teamIds.length) {
      const { data } = await context.supabase.from("team_events").select("id, title, event_type, teams(name)").in("id", teamIds);
      (data ?? []).forEach((d: any) => labelMap.set(`team_event:${d.id}`, `${d.teams?.name ?? "Team"} · ${d.title ?? (d.event_type === "practice" ? "Practice" : "Game")}`));
    }

    return {
      monthCents, seasonCents, monthSessions: monthItems.length,
      monthItems: monthItems
        .sort((a, b) => a.session_date.localeCompare(b.session_date))
        .map((i) => ({
          date: i.session_date,
          rateCents: i.rate_cents ?? 0,
          label: labelMap.get(`${i.source_type}:${i.source_id}`) ?? "Session",
        })),
    };
  });