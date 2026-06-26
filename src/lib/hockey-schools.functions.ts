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
    const { error } = await supabaseAdmin.from("private_booking_requests").insert({
      owner_id: data.ownerId,
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