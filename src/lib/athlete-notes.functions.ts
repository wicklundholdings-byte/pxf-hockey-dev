import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NoteVideoInput = {
  video_url: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
};

export const listAthleteNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { athleteId: string; from?: string; to?: string; drillId?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("athlete_notes")
      .select("*, athlete_note_videos(*)")
      .eq("athlete_id", data.athleteId)
      .order("note_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.from) q = q.gte("note_date", data.from);
    if (data.to) q = q.lte("note_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;
    let result = rows ?? [];
    if (data.drillId) {
      result = result.filter((n: any) =>
        Array.isArray(n.drill_ids) && n.drill_ids.includes(data.drillId)
      );
    }
    return result;
  });

export const createAthleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    athleteId: string;
    noteDate: string;
    writtenNotes?: string;
    drillIds?: string[];
    drillFreetext?: string[];
    sessionRating?: number | null;
    isShared?: boolean;
    videos?: NoteVideoInput[];
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: note, error } = await supabase
      .from("athlete_notes")
      .insert({
        coach_id: userId,
        athlete_id: data.athleteId,
        note_date: data.noteDate,
        written_notes: data.writtenNotes ?? null,
        drill_ids: data.drillIds ?? [],
        drill_freetext: data.drillFreetext ?? [],
        session_rating: data.sessionRating ?? null,
        is_shared: data.isShared ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    if (data.videos && data.videos.length > 0) {
      const { error: vErr } = await supabase.from("athlete_note_videos").insert(
        data.videos.map((v) => ({
          note_id: note.id,
          video_url: v.video_url,
          thumbnail_url: v.thumbnail_url ?? null,
          duration_seconds: v.duration_seconds ?? null,
        }))
      );
      if (vErr) throw vErr;
    }
    return note;
  });

export const updateAthleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    noteDate?: string;
    writtenNotes?: string;
    drillIds?: string[];
    drillFreetext?: string[];
    sessionRating?: number | null;
    isShared?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const patch: {
      note_date?: string;
      written_notes?: string | null;
      drill_ids?: string[];
      drill_freetext?: string[];
      session_rating?: number | null;
      is_shared?: boolean;
    } = {};
    if (data.noteDate !== undefined) patch.note_date = data.noteDate;
    if (data.writtenNotes !== undefined) patch.written_notes = data.writtenNotes;
    if (data.drillIds !== undefined) patch.drill_ids = data.drillIds;
    if (data.drillFreetext !== undefined) patch.drill_freetext = data.drillFreetext;
    if (data.sessionRating !== undefined) patch.session_rating = data.sessionRating;
    if (data.isShared !== undefined) patch.is_shared = data.isShared;
    const { error } = await context.supabase
      .from("athlete_notes")
      .update(patch)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteAthleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("athlete_notes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listSharedNotesForParent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { athleteId?: string }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("athlete_notes")
      .select("*, athlete_note_videos(*), attendees!inner(full_name)")
      .eq("is_shared", true)
      .order("note_date", { ascending: false });
    if (data.athleteId) q = q.eq("athlete_id", data.athleteId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });