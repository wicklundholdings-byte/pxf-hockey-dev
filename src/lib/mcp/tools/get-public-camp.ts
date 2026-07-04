import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_public_camp",
  title: "Get public camp details",
  description:
    "Fetch details for a single live camp by its public slug, including session dates and paid registration count.",
  inputSchema: {
    slug: z.string().min(1).max(120).describe("The camp's public URL slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = publicClient();
    const { data: camp, error } = await supabase
      .from("camps")
      .select(
        "id, name, slug, owner_id, description, venue_name, address, start_date, end_date, start_time, end_time, price_cents, capacity, age_group, skill_level, sport_type, city",
      )
      .eq("slug", slug)
      .eq("status", "live")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!camp) return { content: [{ type: "text", text: "Camp not found." }], isError: true };
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
    const result = { camp, sessions: sessions ?? [], paid_registrations: count ?? 0 };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});