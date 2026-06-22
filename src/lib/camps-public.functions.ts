import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const listFiltersSchema = z
  .object({
    q: z.string().max(120).optional(),
    location: z.string().max(120).optional(),
    ageGroup: z.string().max(40).optional(),
    skillLevel: z.string().max(40).optional(),
    sportType: z.string().max(40).optional(),
  })
  .partial();

export const listLiveCamps = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => (d ? listFiltersSchema.parse(d) : {}))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    // Only show camps from coaches who opted into the public marketplace.
    const { data: visibleCoaches } = await supabase
      .from("public_marketplace_profiles")
      .select("id, full_name")
      .eq("marketplace_visible", true);
    const visibleIds = (visibleCoaches ?? []).map((p) => p.id);
    if (visibleIds.length === 0) {
      return { camps: [], coaches: {} as Record<string, string>, error: null as string | null };
    }
    let query = supabase
      .from("camps")
      .select(
        "id, name, slug, owner_id, hero_image, venue_name, location_type, start_date, end_date, price_cents, capacity, age_group, skill_level, sport_type, city, postal_code",
      )
      .eq("status", "live")
      .in("owner_id", visibleIds)
      .order("start_date", { ascending: true })
      .limit(60);
    if (data?.ageGroup) query = query.eq("age_group", data.ageGroup);
    if (data?.skillLevel) query = query.eq("skill_level", data.skillLevel);
    if (data?.sportType) query = query.eq("sport_type", data.sportType);
    if (data?.location) {
      const loc = data.location.trim();
      query = query.or(`city.ilike.%${loc}%,postal_code.ilike.%${loc}%,venue_name.ilike.%${loc}%`);
    }
    if (data?.q) {
      const q = data.q.trim();
      query = query.or(`name.ilike.%${q}%,venue_name.ilike.%${q}%`);
    }
    const { data: camps, error } = await query;
    if (error) return { camps: [], coaches: {}, error: "Unavailable" };
    const coachMap: Record<string, string> = {};
    for (const c of visibleCoaches ?? []) coachMap[c.id] = c.full_name ?? "PXF Coach";
    return { camps: camps ?? [], coaches: coachMap, error: null as string | null };
  });

export const getPublicCoachProfile = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: profile } = await supabase
      .from("public_marketplace_profiles")
      .select("id, full_name, bio, city, slug, marketplace_visible")
      .or(`slug.eq.${data.slug},id.eq.${data.slug}`)
      .eq("marketplace_visible", true)
      .maybeSingle();
    if (!profile) return { profile: null, camps: [], verified: false };
    const [{ data: camps }, { data: verifiedFlag }] = await Promise.all([
      supabase
        .from("camps")
        .select("id, name, slug, start_date, end_date, price_cents, capacity, venue_name, city")
        .eq("owner_id", profile.id)
        .eq("status", "live")
        .order("start_date", { ascending: true }),
      supabase.rpc("is_coach_verified", { _user_id: profile.id }),
    ]);
    const verified = verifiedFlag === true;
    return { profile, camps: camps ?? [], verified };
  });

export const getPublicCamp = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: camp } = await supabase
      .from("camps")
      .select(
        "id, name, slug, owner_id, description, hero_image, venue_name, address, location_type, start_date, end_date, start_time, end_time, price_cents, early_bird_price_cents, early_bird_expires_at, capacity, show_remaining, waiver_required, waiver_text, payment_plan, sibling_discount, sibling_discount_percent",
      )
      .eq("slug", data.slug)
      .eq("status", "live")
      .maybeSingle();
    if (!camp) return { camp: null, sessions: [], paidCount: 0 };
    const [{ data: sessions }, { count }] = await Promise.all([
      supabase
        .from("camp_sessions")
        .select("id, session_date, start_time, end_time")
        .eq("camp_id", camp.id)
        .order("session_date", { ascending: true }),
      supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("camp_id", camp.id)
        .eq("status", "paid"),
    ]);
    return { camp, sessions: sessions ?? [], paidCount: count ?? 0 };
  });