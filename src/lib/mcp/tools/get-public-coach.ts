import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_public_coach",
  title: "Get public coach profile",
  description:
    "Fetch a public coach profile (by slug or id) along with their live camps.",
  inputSchema: {
    slug: z.string().min(1).max(120).describe("Coach slug or user id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = publicClient();
    const { data: profile } = await supabase
      .from("public_marketplace_profiles")
      .select("id, full_name, bio, city, slug, marketplace_visible")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .eq("marketplace_visible", true)
      .maybeSingle();
    if (!profile || !profile.id) {
      return { content: [{ type: "text", text: "Coach not found." }], isError: true };
    }
    const { data: camps } = await supabase
      .from("camps")
      .select("id, name, slug, start_date, end_date, price_cents, capacity, venue_name, city")
      .eq("owner_id", profile.id)
      .eq("status", "live")
      .order("start_date", { ascending: true });
    const result = { profile, camps: camps ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});