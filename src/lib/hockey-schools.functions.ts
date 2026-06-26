import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Schools (Elite Coach owners) where this parent has registered an athlete previously or currently. */
export const listMyHockeySchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // 1) contact ids for this user (email match)
    const email = (context.claims as any)?.email as string | undefined;
    if (!email) return [];
    const { data: contacts } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .ilike("email", email);
    const contactIds = (contacts ?? []).map((c: any) => c.id);
    if (!contactIds.length) return [];
    // 2) camps registered by these contacts
    const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select("camp_id, camps(id, owner_id, name, city, venue_name)")
      .in("contact_id", contactIds);
    const ownerIds = Array.from(
      new Set(
        ((regs ?? []) as any[])
          .map((r) => r.camps?.owner_id as string | undefined)
          .filter((v): v is string => !!v),
      ),
    );
    if (!ownerIds.length) return [];
    // 3) profiles for those owners
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, city")
      .in("id", ownerIds);
    const profMap = new Map<string, { full_name: string | null; city: string | null }>();
    ((profs ?? []) as any[]).forEach((p) => profMap.set(p.id, { full_name: p.full_name, city: p.city }));
    return ownerIds.map((id) => ({
      owner_id: id,
      name: profMap.get(id)?.full_name
        ? `${profMap.get(id)!.full_name} Hockey`
        : "Hockey School",
      head_coach: profMap.get(id)?.full_name ?? null,
      location: profMap.get(id)?.city ?? null,
    }));
  });

/** Public profile + camps + instructors for a hockey school (Elite Coach owner). */
export const getHockeySchool = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ownerId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: prof }, { data: verified }, { data: camps }, { data: staff }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, bio, city").eq("id", data.ownerId).maybeSingle(),
      supabaseAdmin.from("coach_verifications").select("status, expires_at").eq("user_id", data.ownerId).eq("status", "approved").maybeSingle(),
      supabaseAdmin
        .from("camps")
        .select("id, name, slug, hero_image, venue_name, city, start_date, end_date, price_cents, capacity")
        .eq("owner_id", data.ownerId)
        .eq("status", "live")
        .order("start_date", { ascending: true }),
      supabaseAdmin
        .from("elite_staff_coaches")
        .select("id, full_name, staff_user_id")
        .eq("owner_id", data.ownerId)
        .eq("status", "active"),
    ]);
    const isVerified = verified
      ? !verified.expires_at || new Date(verified.expires_at) > new Date()
      : false;
    // Past camps for this parent's athletes at this school
    let pastCamps: any[] = [];
    const email = (context.claims as any)?.email as string | undefined;
    if (email) {
      const { data: contacts } = await supabaseAdmin.from("contacts").select("id").ilike("email", email);
      const contactIds = (contacts ?? []).map((c: any) => c.id);
      if (contactIds.length) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: regs } = await supabaseAdmin
          .from("registrations")
          .select("camp_id, camps!inner(id, name, owner_id, start_date, end_date, venue_name)")
          .in("contact_id", contactIds);
        pastCamps = ((regs ?? []) as any[])
          .filter((r) => r.camps?.owner_id === data.ownerId && (r.camps?.end_date ?? "") < today)
          .map((r) => r.camps);
      }
    }
    return {
      profile: prof
        ? { id: prof.id, name: prof.full_name ?? "Hockey School", bio: prof.bio ?? null, city: prof.city ?? null, verified: isVerified }
        : null,
      camps: camps ?? [],
      instructors: (staff ?? []).map((s: any) => ({
        id: s.id,
        name: s.full_name ?? "Coach",
        user_id: s.staff_user_id,
        specialty: null as string | null,
      })),
      past_camps: pastCamps,
    };
  });

const filtersSchema = z
  .object({
    q: z.string().max(120).optional(),
    location: z.string().max(120).optional(),
    ageGroup: z.string().max(40).optional(),
  })
  .partial();

/** All Elite Coach hockey schools that opted into the public marketplace. */
export const listAllHockeySchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => (d ? filtersSchema.parse(d) : {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, bio, city, slug")
      .eq("marketplace_visible", true)
      .limit(60);
    if (data?.location) query = query.ilike("city", `%${data.location.trim()}%`);
    if (data?.q) query = query.ilike("full_name", `%${data.q.trim()}%`);
    const { data: rows } = await query;
    return ((rows ?? []) as any[]).map((p) => ({
      owner_id: p.id,
      name: p.full_name ? `${p.full_name} Hockey` : "Hockey School",
      head_coach: p.full_name ?? null,
      location: p.city ?? null,
      bio: p.bio ?? null,
    }));
  });

/** Parent submits a private session request to an Elite Coach's Operations waitlist. */
export const submitBookingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    ownerId: string;
    instructorStaffId?: string | null;
    athleteName: string;
    preferredDates: string[];
    preferredTimes: string[];
    sessionLengthMinutes: number;
    notes?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Confirm target is a real coach
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("id, full_name").eq("id", data.ownerId).maybeSingle();
    if (!prof) throw new Error("Coach not found");
    const email = (context.claims as any)?.email as string | undefined;
    const { data: me } = await supabaseAdmin
      .from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const parts = [
      `Length: ${data.sessionLengthMinutes} min`,
      data.instructorStaffId ? `Instructor staff id: ${data.instructorStaffId}` : null,
      data.notes ? `Notes: ${data.notes}` : null,
    ].filter(Boolean).join("\n");
    // Create a DM conversation between parent and coach so this thread shows in both inboxes.
    const { data: convo, error: convoErr } = await supabaseAdmin
      .from("conversations")
      .insert({ type: "dm", created_by: context.userId })
      .select("id")
      .single();
    if (convoErr) throw new Error(convoErr.message);
    await supabaseAdmin.from("conversation_members").insert([
      { conversation_id: convo.id, user_id: context.userId },
      { conversation_id: convo.id, user_id: data.ownerId },
    ]);
    const summary =
      `Private session request for ${data.athleteName}\n` +
      `Preferred dates: ${data.preferredDates.join(", ")}\n` +
      `Preferred times: ${data.preferredTimes.join(", ")}\n` +
      `Length: ${data.sessionLengthMinutes} min` +
      (data.notes ? `\nNotes: ${data.notes}` : "");
    await supabaseAdmin.from("messages").insert({
      conversation_id: convo.id,
      sender_id: context.userId,
      body: summary,
    });
    const { error } = await supabaseAdmin.from("private_booking_requests").insert({
      owner_id: data.ownerId,
      parent_user_id: context.userId,
      conversation_id: convo.id,
      athlete_name: data.athleteName,
      parent_name: me?.full_name ?? null,
      parent_contact: email ?? null,
      preferred_dates: data.preferredDates.join(", "),
      preferred_times: data.preferredTimes.join(", "),
      notes: parts,
    });
    if (error) throw new Error(error.message);
    return { ok: true, coachName: prof.full_name ?? "Your coach" };
  });

/** Coach responds to a parent booking request: confirm / waitlist / decline. Posts a message into the bridge thread. */
export const respondToBookingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    requestId: string;
    action: "confirm" | "waitlist" | "decline";
    sessionId?: string | null;
    sessionDate?: string | null;
    startTime?: string | null;
    location?: string | null;
    declineMessage?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error: reqErr } = await supabaseAdmin
      .from("private_booking_requests")
      .select("id, owner_id, conversation_id, athlete_name, parent_user_id")
      .eq("id", data.requestId)
      .maybeSingle();
    if (reqErr || !req) throw new Error("Request not found");
    if (req.owner_id !== context.userId) throw new Error("Forbidden");

    const status =
      data.action === "confirm" ? "confirmed" :
      data.action === "waitlist" ? "waitlisted" : "declined";

    const patch: Record<string, unknown> = { status };
    if (data.action === "decline" && data.declineMessage) patch.decline_message = data.declineMessage;
    if (data.action === "confirm" && data.sessionId) patch.resulting_session_id = data.sessionId;
    const { error: upErr } = await supabaseAdmin
      .from("private_booking_requests").update(patch).eq("id", req.id);
    if (upErr) throw new Error(upErr.message);

    // Make sure both sides are conversation members (in case the request predates the bridge).
    let convoId = req.conversation_id as string | null;
    if (!convoId && req.parent_user_id) {
      const { data: convo } = await supabaseAdmin
        .from("conversations").insert({ type: "dm", created_by: context.userId }).select("id").single();
      convoId = convo?.id ?? null;
      if (convoId) {
        await supabaseAdmin.from("conversation_members").insert([
          { conversation_id: convoId, user_id: context.userId },
          { conversation_id: convoId, user_id: req.parent_user_id },
        ]);
        await supabaseAdmin.from("private_booking_requests").update({ conversation_id: convoId }).eq("id", req.id);
      }
    }

    if (convoId) {
      let body = "";
      if (data.action === "confirm") {
        const when = [data.sessionDate, data.startTime?.slice(0, 5)].filter(Boolean).join(" · ");
        body = `✅ Your private for ${req.athlete_name} is confirmed${when ? ` for ${when}` : ""}${data.location ? ` at ${data.location}` : ""}. Payment details will follow shortly.`;
      } else if (data.action === "waitlist") {
        body = `⏳ Your request for ${req.athlete_name} has been waitlisted. We'll reach out as soon as a slot opens up.`;
      } else {
        body = `❌ Unfortunately your request for ${req.athlete_name} can't be accommodated.${data.declineMessage ? `\n\n${data.declineMessage}` : ""}`;
      }
      await supabaseAdmin.from("messages").insert({
        conversation_id: convoId,
        sender_id: context.userId,
        body,
      });
    }
    return { ok: true };
  });