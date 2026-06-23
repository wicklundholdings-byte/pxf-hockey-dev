import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name: string; season?: string; division?: string; age_group?: string;
    association_name?: string; primary_color?: string; secondary_color?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("teams")
      .insert({ ...data, coach_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const addPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string; displayName: string; jerseyNumber?: string; position?: string;
    athleteId?: string; parentContactId?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("team_players").insert({
      team_id: data.teamId,
      display_name: data.displayName,
      jersey_number: data.jerseyNumber ?? null,
      position: data.position ?? null,
      athlete_id: data.athleteId ?? null,
      parent_contact_id: data.parentContactId ?? null,
      added_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string; eventType: "game" | "practice" | "team_event";
    title?: string; opponentName?: string; homeAway?: "home" | "away" | "neutral";
    venue?: string; eventDate: string; startTime?: string; endTime?: string; notes?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("team_events")
      .insert({
        team_id: data.teamId,
        event_type: data.eventType,
        title: data.title ?? null,
        opponent_name: data.opponentName ?? null,
        home_away: data.homeAway ?? null,
        venue: data.venue ?? null,
        event_date: data.eventDate,
        start_time: data.startTime ?? null,
        end_time: data.endTime ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const submitRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string; teamPlayerId: string; response: "yes" | "no" | "maybe"; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_event_rsvps")
      .upsert({
        event_id: data.eventId,
        team_player_id: data.teamPlayerId,
        parent_user_id: context.userId,
        response: data.response,
        note: data.note ?? null,
      }, { onConflict: "event_id,team_player_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string; teamPlayerId: string; status: "present" | "absent" | "late" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_event_attendance")
      .upsert({
        event_id: data.eventId,
        team_player_id: data.teamPlayerId,
        status: data.status,
        marked_by: context.userId,
      }, { onConflict: "event_id,team_player_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const savePracticePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string; eventId?: string; templateName?: string;
    items: Array<{ itemType: "session" | "drill" | "note"; drillId?: string; sessionId?: string; noteText?: string; durationMinutes?: number }>;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: plan, error } = await context.supabase
      .from("practice_plans")
      .insert({
        team_id: data.teamId,
        event_id: data.eventId ?? null,
        template_name: data.templateName ?? null,
        coach_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.items.length) {
      const rows = data.items.map((it, i) => ({
        plan_id: plan.id,
        item_type: it.itemType,
        drill_id: it.drillId ?? null,
        session_id: it.sessionId ?? null,
        note_text: it.noteText ?? null,
        duration_minutes: it.durationMinutes ?? null,
        display_order: i,
      }));
      const { error: e2 } = await context.supabase.from("practice_plan_items").insert(rows);
      if (e2) throw new Error(e2.message);
    }
    return { id: plan.id };
  });

export const saveLineup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teamId: string; eventId?: string; positions: Record<string, string | null>; shared?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("team_lineups").insert({
      team_id: data.teamId,
      event_id: data.eventId ?? null,
      positions: data.positions,
      shared: data.shared ?? false,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordGameStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teamId: string; teamPlayerId: string; season?: string; goals?: number; assists?: number; penaltyMinutes?: number; gamesPlayed?: number }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("team_stats").upsert({
      team_id: data.teamId,
      team_player_id: data.teamPlayerId,
      season: data.season ?? null,
      goals: data.goals ?? 0,
      assists: data.assists ?? 0,
      penalty_minutes: data.penaltyMinutes ?? 0,
      games_played: data.gamesPlayed ?? 0,
    }, { onConflict: "team_player_id,season" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });