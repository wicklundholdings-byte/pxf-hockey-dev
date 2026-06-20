import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const listLiveCamps = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("camps")
    .select("id, name, slug, hero_image, venue_name, location_type, start_date, end_date, price_cents, capacity")
    .eq("status", "live")
    .order("start_date", { ascending: true })
    .limit(60);
  if (error) return { camps: [] as Array<NonNullable<typeof data>[number]>, error: "Unavailable" };
  return { camps: data ?? [], error: null as string | null };
});