import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    teamId: string;
    requestType: "registration" | "one_off";
    label: string;
    description?: string;
    amountCents: number;
    dueDate?: string | null;
    playerIds?: string[]; // empty/undefined = entire team
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: req, error } = await supabase
      .from("team_payment_requests")
      .insert({
        team_id: data.teamId,
        created_by: userId,
        request_type: data.requestType,
        label: data.label,
        description: data.description ?? null,
        amount_cents: data.amountCents,
        due_date: data.dueDate ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Determine target players
    let playerIds = data.playerIds ?? [];
    if (playerIds.length === 0) {
      const { data: roster } = await supabase
        .from("team_players")
        .select("id")
        .eq("team_id", data.teamId);
      playerIds = (roster ?? []).map((r: any) => r.id);
    }
    if (playerIds.length > 0) {
      const rows = playerIds.map((pid) => ({
        request_id: req.id,
        team_player_id: pid,
        amount_cents: data.amountCents,
      }));
      const { error: chErr } = await supabase.from("team_payment_charges").insert(rows);
      if (chErr) throw new Error(chErr.message);
    }
    return { id: req.id };
  });

export const remindUnpaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; chargeIds?: string[] }) => d)
  .handler(async ({ data, context }) => {
    const q = context.supabase
      .from("team_payment_charges")
      .update({ last_reminder_at: new Date().toISOString() })
      .eq("request_id", data.requestId)
      .eq("status", "pending");
    const { error } = data.chargeIds && data.chargeIds.length > 0
      ? await q.in("id", data.chargeIds)
      : await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markChargePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { chargeId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_payment_charges")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_by: context.userId })
      .eq("id", data.chargeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const closePaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_payment_requests")
      .update({ status: "closed" })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });