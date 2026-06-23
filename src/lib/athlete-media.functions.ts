import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAthleteMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { athleteId?: string; sessionId?: string }) => input)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("athlete_media")
      .select("*")
      .order("recorded_at", { ascending: false });
    if (data.athleteId) q = q.eq("athlete_id", data.athleteId);
    if (data.sessionId) q = q.eq("session_id", data.sessionId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const createAthleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    athlete_id: string;
    session_id?: string | null;
    video_url: string;
    thumbnail_url?: string | null;
    duration_seconds?: number | null;
    caption?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("athlete_media")
      .insert({ ...data, coach_id: context.userId })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateAthleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string;
    caption?: string;
    annotation_status?: "raw" | "reviewed" | "annotated";
    is_shared?: boolean;
  }) => input)
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("athlete_media")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteAthleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("athlete_media").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const saveAnnotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    media_id: string;
    frame_timestamp?: number | null;
    annotation_type: string;
    annotation_data?: unknown;
    voiceover_url?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("video_annotations")
      .insert({ ...data, created_by: context.userId, annotation_data: data.annotation_data as any })
      .select()
      .single();
    if (error) throw error;
    await context.supabase
      .from("athlete_media")
      .update({ annotation_status: "annotated" })
      .eq("id", data.media_id);
    return row;
  });