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

export const addPlayerWithInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string;
    displayName: string;
    jerseyNumber?: string;
    position?: string;
    parentEmail: string;
    parentName?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const parts = data.displayName.trim().split(/\s+/);
    const firstName = parts[0] ?? data.displayName;
    const lastName = parts.slice(1).join(" ") || "—";

    const { data: player, error: pErr } = await context.supabase
      .from("team_players")
      .insert({
        team_id: data.teamId,
        display_name: data.displayName,
        jersey_number: data.jerseyNumber ?? null,
        position: data.position ?? null,
        added_by: context.userId,
      })
      .select("id")
      .single();
    if (pErr) throw new Error(pErr.message);

    // invite_token is a privileged column that anon/authenticated cannot read
    // via the Data API; use the service-role client to safely return it once.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite, error: iErr } = await supabaseAdmin
      .from("team_invites")
      .insert({
        team_id: data.teamId,
        athlete_first_name: firstName,
        athlete_last_name: lastName,
        position: data.position ?? null,
        jersey_number: data.jerseyNumber ?? null,
        parent1_name: data.parentName ?? null,
        parent1_email: data.parentEmail,
      })
      .select("invite_token")
      .single();
    if (iErr) throw new Error(iErr.message);

    // Look up team + coach for email context
    const { data: team } = await context.supabase
      .from("teams")
      .select("name")
      .eq("id", data.teamId)
      .single();
    const { data: coach } = await context.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .single();

    const origin =
      process.env.SITE_URL ||
      process.env.PUBLIC_SITE_URL ||
      "https://pxf-hockey-dev.lovable.app";
    const inviteUrl = `${origin}/team-invite/${invite.invite_token}`;

    let emailStatus: "sent" | "skipped" | "failed" = "skipped";
    let emailError: string | null = null;
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const teamName = team?.name ?? "the team";
        const coachName = coach?.full_name ?? "Your coach";
        const greeting = data.parentName ? `Hi ${data.parentName},` : "Hi there,";
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 12px">You're invited to join ${escapeHtml(teamName)}</h2>
            <p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
            <p style="margin:0 0 12px">
              ${escapeHtml(coachName)} added <strong>${escapeHtml(data.displayName)}</strong>
              to the <strong>${escapeHtml(teamName)}</strong> roster.
              Please complete the athlete profile, your phone number, and emergency contacts so the coach can reach you.
            </p>
            <p style="margin:24px 0">
              <a href="${inviteUrl}" style="background:#0ea5a3;color:#000;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">
                Complete profile
              </a>
            </p>
            <p style="margin:0 0 8px;color:#555;font-size:12px">Or copy this link:</p>
            <p style="margin:0 0 16px;color:#555;font-size:12px;word-break:break-all">${inviteUrl}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
            <p style="margin:0;color:#888;font-size:11px">If you weren't expecting this, you can safely ignore the email.</p>
          </div>
        `;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "PXF Hockey <onboarding@resend.dev>",
            to: [data.parentEmail],
            subject: `Complete ${data.displayName}'s profile for ${teamName}`,
            html,
          }),
        });
        if (!res.ok) {
          emailStatus = "failed";
          emailError = `Resend ${res.status}: ${await res.text()}`;
          console.error(emailError);
        } else {
          emailStatus = "sent";
        }
      } catch (e: any) {
        emailStatus = "failed";
        emailError = e?.message ?? "Unknown error";
        console.error("Invite email failed", e);
      }
    }

    return {
      playerId: player.id,
      inviteToken: invite.invite_token,
      inviteUrl,
      emailStatus,
      emailError,
    };
  });

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

export const saveGameLineup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string; eventId: string;
    positions: Record<string, string | null>;
    ppUnits: Record<string, (string | null)[]>;
    pkUnits: Record<string, (string | null)[]>;
    scratches: string[];
    templateName?: string | null;
    isShared?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("game_lineups").select("id").eq("event_id", data.eventId).maybeSingle();
    const payload = {
      team_id: data.teamId,
      event_id: data.eventId,
      positions: data.positions,
      pp_units: data.ppUnits,
      pk_units: data.pkUnits,
      scratches: data.scratches,
      template_name: data.templateName ?? null,
      is_shared: data.isShared ?? false,
      created_by: context.userId,
    };
    if (existing?.id) {
      const { error } = await context.supabase.from("game_lineups").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id };
    }
    const { data: row, error } = await context.supabase.from("game_lineups").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const saveGamePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string; eventId: string;
    opponentNotes?: string; ourGameplan?: string;
    matchups: Array<{ ourPlayer: string; theirPlayer: string; notes?: string }>;
    drillIds: string[]; videoClipIds: string[];
  }) => d)
  .handler(async ({ data, context }) => {
    const payload = {
      team_id: data.teamId,
      event_id: data.eventId,
      opponent_notes: data.opponentNotes ?? null,
      our_gameplan: data.ourGameplan ?? null,
      matchups: data.matchups,
      drill_ids: data.drillIds,
      video_clip_ids: data.videoClipIds,
      created_by: context.userId,
    };
    const { error } = await context.supabase
      .from("game_plans")
      .upsert(payload, { onConflict: "event_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCoachGameNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string; eventId: string;
    pepTalk?: string;
    periodNotes: { p1?: string; p2?: string; p3?: string };
    postGameNotes?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const payload = {
      team_id: data.teamId,
      event_id: data.eventId,
      pep_talk: data.pepTalk ?? null,
      period_notes: data.periodNotes,
      post_game_notes: data.postGameNotes ?? null,
      created_by: context.userId,
    };
    const { error } = await context.supabase
      .from("coach_game_notes")
      .upsert(payload, { onConflict: "event_id" });
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

export const saveGameParentPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string; eventId: string;
    shareLineup: boolean;
    shareGameplan: boolean;
    shareSystems: boolean;
    shareMessage: boolean;
    publicGameplanText?: string | null;
    publicSystemsText?: string | null;
    coachMessage?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const anyOn = data.shareLineup || data.shareGameplan || data.shareSystems || data.shareMessage;
    const { data: existing } = await context.supabase
      .from("game_parent_publish").select("id,published_at").eq("event_id", data.eventId).maybeSingle();
    const payload: any = {
      team_id: data.teamId,
      event_id: data.eventId,
      share_lineup: data.shareLineup,
      share_gameplan: data.shareGameplan,
      share_systems: data.shareSystems,
      share_message: data.shareMessage,
      public_gameplan_text: data.publicGameplanText ?? null,
      public_systems_text: data.publicSystemsText ?? null,
      coach_message: data.coachMessage ?? null,
      created_by: context.userId,
    };
    if (anyOn && !existing?.published_at) payload.published_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("game_parent_publish")
      .upsert(payload, { onConflict: "event_id" });
    if (error) throw new Error(error.message);
    return { ok: true, firstPublish: anyOn && !existing?.published_at };
  });

type SkaterStatInput = {
  teamPlayerId: string;
  athleteId?: string | null;
  goals: number;
  assists: number;
  penaltyMinutes: number;
  plusMinus: number;
  shotsOnGoal: number;
  toi?: string | null;
};
type GoalieStatInput = {
  teamPlayerId: string;
  athleteId?: string | null;
  saves: number;
  goalsAgainst: number;
  shutout: boolean;
};

export const saveFullGameStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string;
    eventId: string;
    teamScore: number;
    opponentScore: number;
    result: "win" | "loss" | "ot_win" | "ot_loss" | "so_win" | "so_loss" | null;
    skaters: SkaterStatInput[];
    goalies: GoalieStatInput[];
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error: rErr } = await supabase.from("game_results").upsert({
      event_id: data.eventId,
      team_id: data.teamId,
      team_score: data.teamScore,
      opponent_score: data.opponentScore,
      result: data.result,
      created_by: context.userId,
    }, { onConflict: "event_id" });
    if (rErr) throw new Error(rErr.message);

    if (data.skaters.length) {
      const rows = data.skaters.map((s) => ({
        event_id: data.eventId,
        team_id: data.teamId,
        team_player_id: s.teamPlayerId,
        athlete_id: s.athleteId ?? null,
        goals: s.goals,
        assists: s.assists,
        penalty_minutes: s.penaltyMinutes,
        plus_minus: s.plusMinus,
        shots_on_goal: s.shotsOnGoal,
        toi: s.toi ?? null,
      }));
      const { error } = await supabase.from("game_player_stats").upsert(rows, { onConflict: "event_id,team_player_id" });
      if (error) throw new Error(error.message);
    }

    if (data.goalies.length) {
      const rows = data.goalies.map((g) => ({
        event_id: data.eventId,
        team_id: data.teamId,
        team_player_id: g.teamPlayerId,
        athlete_id: g.athleteId ?? null,
        saves: g.saves,
        goals_against: g.goalsAgainst,
        shutout: g.shutout,
      }));
      const { error } = await supabase.from("game_goalie_stats").upsert(rows, { onConflict: "event_id,team_player_id" });
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });