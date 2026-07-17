import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { imageBase64, mediaType } = await req.json() as {
      imageBase64: string;
      mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'application/pdf';
    };

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    console.log('[parse-ice-contract] received', mediaType, 'size:', imageBase64.length);

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const currentYear = now.getFullYear();

    const prompt = `You are parsing an ice hockey rink booking contract or schedule document.

Your job is to extract EVERY ice time slot AND its rental cost. Cost extraction is mandatory.

=== HOW TO FIND COSTS ===

Look for a "Schedule" or "Bookings" table. The columns are typically:
  Location | Start Date | End Date | Day | Time | Fees | Extra Fees | Discount | Tax | Total

The RENTAL COST (what we want) is in the "Fees" column — this is the BASE fee BEFORE tax.

In the raw document text, each row typically appears like:
  "08:45 AM $165.10 $0.00 $0.00 $8.25 $173.35"
  where the numbers after the end time are: Fees, Extra Fees, Discount, Tax, Total

The FIRST dollar amount after the time is the FEES (rental cost). Use that value.

IMPORTANT RULES:
- Return cost as a plain number (e.g. 165.10), NOT a string or with "$"
- If you see the header row "Fees Extra Fees Discount Tax Total", the FIRST column value is Fees
- Never set cost to null if dollar amounts appear anywhere near the slot
- If all slots have the same hourly rate, set hourly_rate at the top level AND per-slot cost
- Tax is NOT included in the cost — use the pre-tax Fees amount only

=== SLOT EXTRACTION ===

For each ice time slot extract:
- date: YYYY-MM-DD format (assume year ${currentYear} if not shown)
- start_time: HH:MM 24-hour (e.g. "09:00", "21:30") — convert "7:45 AM" → "07:45"
- end_time: HH:MM 24-hour
- rink_name: specific pad name for this slot (e.g. "Ice Rink 1"), or null
- cost: the Fees amount as a NUMBER (e.g. 165.10)

Top-level fields:
- rink_name: the facility name (e.g. "Semiahmoo Twin Rink")
- hourly_rate: only if a single rate applies to all slots, else null
- currency: "CAD", "USD", etc. if visible

Rules:
- Skip non-ice slots (dry land, meetings, etc.)
- Convert "9am" → "09:00", "9:30am" → "09:30", "10pm" → "22:00"

Return ONLY valid JSON, no markdown fences, no explanation:
{
  "rink_name": "string or null",
  "hourly_rate": number or null,
  "currency": "string or null",
  "slots": [
    { "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "rink_name": "string or null", "cost": number or null }
  ]
}`;

    const isPdf = mediaType === 'application/pdf';

    const fileContent = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
      : { type: 'image',    source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: imageBase64 } };

    const reqHeaders: Record<string, string> = {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };
    if (isPdf) reqHeaders['anthropic-beta'] = 'pdfs-2024-09-25';

    console.log('[parse-ice-contract] calling Anthropic API, isPdf:', isPdf);

    // Try Opus first; fall back to Sonnet on overload
    const models = ['claude-opus-4-8', 'claude-sonnet-4-6'];
    let response: Response | null = null;
    let lastErr = '';

    for (const model of models) {
      console.log('[parse-ice-contract] trying model:', model);
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: [fileContent, { type: 'text', text: prompt }] }],
        }),
      });
      if (response.ok) break;
      lastErr = await response.text();
      console.error('[parse-ice-contract] model', model, 'error:', lastErr);
      // Only fall back on overload; stop on other errors
      if (!lastErr.includes('overloaded')) break;
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ error: 'AI parsing failed', detail: lastErr }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const ai = await response.json();
    const rawText = ai.content?.[0]?.text ?? '';

    // LOG the raw AI response — check in Supabase Dashboard → Edge Functions → Logs
    console.log('[parse-ice-contract] === RAW AI RESPONSE ===');
    console.log(rawText);
    console.log('[parse-ice-contract] === END RAW AI RESPONSE ===');

    // Strip markdown fences if the model wrapped the JSON anyway
    const jsonStr = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    let parsed: { rink_name: string | null; hourly_rate: number | null; currency: string | null; slots: any[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[parse-ice-contract] Failed to parse AI response as JSON:', rawText);
      return new Response(JSON.stringify({ error: 'Could not parse AI response', raw: rawText }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    let hourlyRate: number | null = null;
    if (typeof parsed.hourly_rate === 'number') {
      hourlyRate = parsed.hourly_rate;
    } else if (typeof parsed.hourly_rate === 'string') {
      const n = parseFloat((parsed.hourly_rate as string).replace(/[$,\s]/g, ''));
      if (!isNaN(n)) hourlyRate = n;
    }

    // Validate + sanitize slots
    const validSlots = (parsed.slots ?? [])
      .filter((s: any) =>
        typeof s.date === 'string' && s.date.match(/^\d{4}-\d{2}-\d{2}$/) &&
        typeof s.start_time === 'string' && s.start_time.match(/^\d{2}:\d{2}$/) &&
        typeof s.end_time === 'string' && s.end_time.match(/^\d{2}:\d{2}$/)
      )
      .map((s: any) => {
        // Accept cost as number OR string (e.g. "$165.10" or "165.10")
        let cost: number | null = null;
        if (typeof s.cost === 'number' && !isNaN(s.cost)) {
          cost = s.cost;
        } else if (typeof s.cost === 'string' && s.cost.trim() !== '') {
          const n = parseFloat(s.cost.replace(/[$,\s]/g, ''));
          if (!isNaN(n)) cost = n;
        }
        // Fallback: calculate from hourly rate × duration
        if (cost === null && hourlyRate !== null) {
          const [sh, sm] = s.start_time.split(':').map(Number);
          const [eh, em] = s.end_time.split(':').map(Number);
          const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
          if (hours > 0) cost = Math.round(hourlyRate * hours * 100) / 100;
        }
        console.log('[parse-ice-contract] slot', s.date, s.start_time, '→', s.end_time, 'raw cost:', s.cost, 'parsed cost:', cost);
        return { ...s, cost };
      });

    console.log('[parse-ice-contract] returning', validSlots.length, 'slots, costs:', validSlots.map((s: any) => s.cost).join(', '));

    return new Response(
      JSON.stringify({
        rink_name: parsed.rink_name ?? null,
        hourly_rate: hourlyRate,
        currency: parsed.currency ?? null,
        slots: validSlots,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[parse-ice-contract] Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
