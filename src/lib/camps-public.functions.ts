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

export const listLiveCamps = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("camps")
    .select("id, name, slug, owner_id, hero_image, venue_name, location_type, start_date, end_date, price_cents, capacity")
    .eq("status", "live")
    .order("start_date", { ascending: true })
    .limit(60);
  if (error) return { camps: [] as Array<NonNullable<typeof data>[number]>, error: "Unavailable" };
  return { camps: data ?? [], error: null as string | null };
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