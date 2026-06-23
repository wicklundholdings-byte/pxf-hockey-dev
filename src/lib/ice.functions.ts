import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ParsedSlot = {
  rink_name: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  surface_type: string | null;
  notes: string | null;
  ambiguous?: boolean;
};

const SYSTEM = `You are parsing an ice rental contract or schedule. Extract every ice time slot from this document and return a JSON array. Each item must have: rink_name (string), date (YYYY-MM-DD), start_time (HH:MM 24hr), end_time (HH:MM 24hr), surface_type (one of: full_ice, half_ice, shooting_area, unknown), notes (any relevant text like 'no Zamboni' or blank string). If a field is unclear, use null. Return only the JSON array, no other text.`;

function buildContent(input: { kind: "pdf" | "image" | "text"; data: string; filename?: string; mime?: string }) {
  if (input.kind === "text") {
    return [{ type: "text", text: SYSTEM + "\n\nDocument:\n" + input.data }];
  }
  if (input.kind === "image") {
    return [
      { type: "text", text: SYSTEM },
      { type: "image_url", image_url: { url: `data:${input.mime ?? "image/jpeg"};base64,${input.data}` } },
    ];
  }
  return [
    { type: "text", text: SYSTEM },
    {
      type: "file",
      file: {
        filename: input.filename ?? "contract.pdf",
        file_data: `data:application/pdf;base64,${input.data}`,
      },
    },
  ];
}

function stripFences(s: string): string {
  return s.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

export const parseIceContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "pdf" | "image" | "text"; data: string; filename?: string; mime?: string }) => input)
  .handler(async ({ data }): Promise<{ slots: ParsedSlot[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: buildContent(data) }],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Top up workspace credits.");
      throw new Error(`AI error: ${res.status} ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "[]";
    let parsed: any = [];
    try {
      parsed = JSON.parse(stripFences(text));
    } catch {
      // try to extract array
      const m = text.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }
    if (!Array.isArray(parsed)) parsed = [];

    const slots: ParsedSlot[] = parsed.map((r: any) => {
      const ambiguous =
        !r?.rink_name || !r?.date || !r?.start_time || !r?.end_time || r?.surface_type === "unknown" || !r?.surface_type;
      return {
        rink_name: r?.rink_name ?? null,
        date: r?.date ?? null,
        start_time: r?.start_time ?? null,
        end_time: r?.end_time ?? null,
        surface_type: r?.surface_type ?? null,
        notes: r?.notes ?? null,
        ambiguous,
      };
    });

    return { slots };
  });