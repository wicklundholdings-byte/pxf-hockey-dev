import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_public_camps",
  title: "List public camps",
  description:
    "List live hockey camps from coaches who opted into the public marketplace. Optional filters: text query, city/location, age group, skill level, sport type.",
  inputSchema: {
    q: z.string().max(120).optional().describe("Text search across camp and venue name."),
    location: z.string().max(120).optional().describe("City, postal code, or venue substring."),
    ageGroup: z.string().max(40).optional(),
    skillLevel: z.string().max(40).optional(),
    sportType: z.string().max(40).optional(),
    limit: z.number().int().min(1).max(60).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ q, location, ageGroup, skillLevel, sportType, limit }) => {
    const supabase = publicClient();
    const { data: visibleCoaches } = await supabase
      .from("public_marketplace_profiles")
      .select("id, full_name")
      .eq("marketplace_visible", true);
    const visibleIds = (visibleCoaches ?? []).map((p) => p.id).filter((id): id is string => !!id);
    if (visibleIds.length === 0) {
      return { content: [{ type: "text", text: "No public camps available." }], structuredContent: { camps: [] } };
    }
    let query = supabase
      .from("camps")
      .select(
        "id, name, slug, owner_id, venue_name, start_date, end_date, price_cents, capacity, age_group, skill_level, sport_type, city",
      )
      .eq("status", "live")
      .in("owner_id", visibleIds)
      .order("start_date", { ascending: true })
      .limit(limit ?? 20);
    if (ageGroup) query = query.eq("age_group", ageGroup);
    if (skillLevel) query = query.eq("skill_level", skillLevel);
    if (sportType) query = query.eq("sport_type", sportType);
    if (location) {
      const loc = location.trim();
      query = query.or(`city.ilike.%${loc}%,venue_name.ilike.%${loc}%`);
    }
    if (q) query = query.or(`name.ilike.%${q.trim()}%,venue_name.ilike.%${q.trim()}%`);
    const { data: camps, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    const coachMap = new Map<string, string>();
    for (const c of visibleCoaches ?? []) if (c.id) coachMap.set(c.id, c.full_name ?? "PXF Coach");
    const results = (camps ?? []).map((c) => ({
      ...c,
      coach_name: c.owner_id ? coachMap.get(c.owner_id) ?? null : null,
      price: c.price_cents != null ? `$${(c.price_cents / 100).toFixed(2)}` : null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { camps: results },
    };
  },
});