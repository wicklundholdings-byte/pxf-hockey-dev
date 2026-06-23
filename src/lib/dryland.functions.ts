import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const enrollAthlete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { athleteId: string; programId: string; startDate: string; trainingDays: number[]; role?: "parent" | "coach" }) => d)
  .handler(async ({ data, context }) => {
    const role = data.role ?? "parent";
    const { data: row, error } = await context.supabase
      .from("athlete_program_enrollments")
      .insert({
        athlete_id: data.athleteId,
        program_id: data.programId,
        enrolled_by: context.userId,
        enrolled_by_role: role,
        start_date: data.startDate,
        training_days: data.trainingDays,
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // TODO: schedule push notifications for upcoming sessions on selected training_days
    return { id: row.id };
  });

export const completeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { athleteId: string; sessionId: string; enrollmentId?: string; durationSeconds?: number; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("athlete_session_completions").insert({
      athlete_id: data.athleteId,
      session_id: data.sessionId,
      enrollment_id: data.enrollmentId ?? null,
      duration_actual_seconds: data.durationSeconds ?? null,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recommendProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { athleteId: string; programId: string; message?: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("program_recommendations").insert({
      coach_id: context.userId,
      athlete_id: data.athleteId,
      program_id: data.programId,
      message: data.message ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkRecommendProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { athleteIds: string[]; programId: string; message?: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.athleteIds.length) return { ok: true, count: 0 };
    const rows = data.athleteIds.map((athleteId) => ({
      coach_id: context.userId,
      athlete_id: athleteId,
      program_id: data.programId,
      message: data.message ?? null,
    }));
    const { error } = await context.supabase.from("program_recommendations").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });