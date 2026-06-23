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

export const sendMediaToAthlete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { media_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    // 1. Load clip + athlete + parent contact
    const { data: media, error: mErr } = await supabase
      .from("athlete_media")
      .select("id, athlete_id, coach_id, caption")
      .eq("id", data.media_id)
      .single();
    if (mErr) throw mErr;
    if (media.coach_id !== userId) throw new Error("Not your clip");

    const { data: athlete, error: aErr } = await supabase
      .from("attendees")
      .select("id, full_name, contact_id")
      .eq("id", media.athlete_id)
      .single();
    if (aErr) throw aErr;
    if (!athlete.contact_id) throw new Error("Athlete has no parent contact on file");

    const { data: contact, error: cErr } = await supabase
      .from("contacts")
      .select("id, email")
      .eq("id", athlete.contact_id)
      .single();
    if (cErr) throw cErr;

    // 2. Resolve parent's auth user_id by email (admin needed to read auth.users)
    let parentUserId: string | null = null;
    if (contact.email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", contact.email)
        .maybeSingle();
      parentUserId = prof?.id ?? null;
    }
    if (!parentUserId) throw new Error("Parent has no user account yet");

    // 3. Reuse an existing 1:1 DM between coach and parent if present
    const { data: mine } = await supabase
      .from("conversation_members")
      .select("conversation_id, conversations:conversation_id(type)")
      .eq("user_id", userId);
    const myDmIds = (mine ?? [])
      .filter((m: any) => m.conversations?.type === "dm")
      .map((m: any) => m.conversation_id);
    let conversationId: string | null = null;
    if (myDmIds.length) {
      const { data: theirs } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", parentUserId)
        .in("conversation_id", myDmIds);
      conversationId = theirs?.[0]?.conversation_id ?? null;
    }

    // 4. Create the DM if needed
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ type: "dm", created_by: userId })
        .select("id")
        .single();
      if (convErr) throw convErr;
      conversationId = conv.id;
      const { error: memErr } = await supabase
        .from("conversation_members")
        .insert([
          { conversation_id: conversationId, user_id: userId },
          { conversation_id: conversationId, user_id: parentUserId },
        ]);
      if (memErr) throw memErr;
    }

    // 5. Send the message with the athlete_media reference
    const body =
      (media.caption?.trim() ? media.caption.trim() : `New clip of ${athlete.full_name}`);
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body,
        athlete_media_id: media.id,
      })
      .select()
      .single();
    if (msgErr) throw msgErr;

    // 6. Mark clip as shared
    await supabase
      .from("athlete_media")
      .update({ is_shared: true })
      .eq("id", media.id);

    return { conversation_id: conversationId, message_id: msg.id };
  });