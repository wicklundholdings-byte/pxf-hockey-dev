import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Internal helper — insert one notification row using service role.
async function pushNotification(
  admin: any,
  args: {
    userId: string;
    kind: string;
    title: string;
    body?: string | null;
    linkTo?: string | null;
    relatedId?: string | null;
    paymentAmountCents?: number | null;
  },
) {
  if (!args.userId) return;
  await admin.from("notifications").insert({
    user_id: args.userId,
    kind: args.kind,
    title: args.title,
    body: args.body ?? null,
    link_to: args.linkTo ?? null,
    related_id: args.relatedId ?? null,
    payment_amount_cents: args.paymentAmountCents ?? null,
  });
}

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

    const { error: upErr } = await supabaseAdmin
      .from("private_booking_requests").update({
        status,
        decline_message: data.action === "decline" ? (data.declineMessage ?? null) : null,
        resulting_session_id: data.action === "confirm" ? (data.sessionId ?? null) : null,
      }).eq("id", req.id);
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

    // Push notification to parent
    if (req.parent_user_id) {
      if (data.action === "confirm") {
        let feeCents: number | null = null;
        if (data.sessionId) {
          const { data: sess } = await supabaseAdmin
            .from("private_sessions").select("fee_cents").eq("id", data.sessionId).maybeSingle();
          feeCents = (sess?.fee_cents as number | null) ?? null;
        }
        const when = [data.sessionDate, data.startTime?.slice(0, 5)].filter(Boolean).join(" · ");
        await pushNotification(supabaseAdmin, {
          userId: req.parent_user_id,
          kind: "booking_confirmed",
          title: `Private confirmed for ${req.athlete_name}`,
          body: `${when}${data.location ? ` · ${data.location}` : ""}${feeCents ? ` · Tap to pay $${(feeCents/100).toFixed(0)}` : ""}`,
          linkTo: "/parent/camps",
          relatedId: data.sessionId ?? req.id,
          paymentAmountCents: feeCents,
        });
      } else if (data.action === "decline") {
        await pushNotification(supabaseAdmin, {
          userId: req.parent_user_id,
          kind: "booking_declined",
          title: `Private request declined`,
          body: data.declineMessage ?? `Your request for ${req.athlete_name} can't be accommodated right now.`,
          linkTo: "/parent/inbox",
          relatedId: req.id,
        });
      }
    }
    return { ok: true };
  });

/** Coach confirms a request, creating a private_session row tied to parent + booking + fee. */
export const confirmBookingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    requestId: string;
    iceSlotId: string;
    coachUserId?: string | null;
    feeCents?: number | null;
    durationMinutes?: number | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req } = await supabaseAdmin
      .from("private_booking_requests")
      .select("id, owner_id, athlete_name, parent_user_id")
      .eq("id", data.requestId).maybeSingle();
    if (!req || req.owner_id !== context.userId) throw new Error("Forbidden");
    const { data: slot } = await supabaseAdmin
      .from("ice_slots")
      .select("id, slot_date, start_time, end_time, rink:rinks(name)")
      .eq("id", data.iceSlotId).maybeSingle();
    if (!slot) throw new Error("Ice slot not found");
    const location = (slot as any).rink?.name ?? null;
    const { data: session, error: sErr } = await supabaseAdmin
      .from("private_sessions").insert({
        owner_id: context.userId,
        parent_user_id: req.parent_user_id,
        booking_request_id: req.id,
        athlete_name: req.athlete_name,
        session_date: slot.slot_date,
        start_time: slot.start_time,
        duration_minutes: data.durationMinutes ?? 60,
        fee_cents: data.feeCents ?? null,
        location,
        assigned_coach_id: data.coachUserId ?? null,
        payment_status: data.feeCents ? "pending" : "unpaid",
      }).select("id").single();
    if (sErr) throw new Error(sErr.message);
    if (data.coachUserId) {
      await supabaseAdmin.from("ice_slots").update({ booked_by_coach_id: data.coachUserId }).eq("id", slot.id);
      // Notify the assigned staff coach
      await pushNotification(supabaseAdmin, {
        userId: data.coachUserId,
        kind: "session_assigned",
        title: `New session assigned`,
        body: `${req.athlete_name} · ${slot.slot_date} ${String(slot.start_time).slice(0,5)}${location ? ` · ${location}` : ""}`,
        linkTo: "/coach",
        relatedId: session.id,
      });
    }
    return { sessionId: session.id, location, slotDate: slot.slot_date, startTime: slot.start_time };
  });

/** Parent marks payment for their confirmed private session and notifies the coach. */
export const payForPrivateSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sess } = await supabaseAdmin
      .from("private_sessions")
      .select("id, owner_id, parent_user_id, athlete_name, fee_cents, session_date, start_time")
      .eq("id", data.sessionId).maybeSingle();
    if (!sess || sess.parent_user_id !== context.userId) throw new Error("Forbidden");
    await supabaseAdmin.from("private_sessions")
      .update({ payment_status: "paid" }).eq("id", sess.id);
    await pushNotification(supabaseAdmin, {
      userId: sess.owner_id,
      kind: "payment_received",
      title: `Payment received`,
      body: `${sess.athlete_name}${sess.fee_cents ? ` · $${(sess.fee_cents/100).toFixed(0)}` : ""}`,
      linkTo: "/coach/financials",
      relatedId: sess.id,
      paymentAmountCents: sess.fee_cents,
    });
    return { ok: true };
  });

/** Read current user's notifications (most recent first). */
export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, link_to, related_id, payment_amount_cents, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

/** Mark all my notifications read. */
export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("notifications")
      .update({ read_at: new Date().toISOString() }).is("read_at", null);
    return { ok: true };
  });