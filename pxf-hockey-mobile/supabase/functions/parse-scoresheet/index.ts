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
    const { imageBase64, mediaType, homeTeam, awayTeam, roster } = await req.json() as {
      imageBase64: string;
      mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
      homeTeam?: string;
      awayTeam?: string;
      roster?: string[]; // known player names for fuzzy matching
    };

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const rosterHint = roster && roster.length > 0
      ? `\n\nKNOWN ROSTER PLAYERS (match player names to this list when possible, using the closest name):\n${roster.join(', ')}`
      : '';

    const homeHint  = homeTeam ? `Home team: ${homeTeam}` : '';
    const awayHint  = awayTeam ? `Away team: ${awayTeam}` : '';
    const teamHints = [homeHint, awayHint].filter(Boolean).join(' | ');

    const prompt = `You are reading a handwritten ice hockey game scoresheet photo. Extract all scoring and penalty events.
${teamHints ? `\n${teamHints}` : ''}${rosterHint}

Extract the following:

1. SCORE: Final score for home and away teams.
2. GOALS: Each goal scored. For each goal:
   - period (1, 2, 3, or OT)
   - time (MM:SS format, e.g. "2:31")
   - player (scorer name — match to roster if provided)
   - team ("home" or "away")
   - assist1 (first assist name, or null)
   - assist2 (second assist name, or null)
   - goal_type: "ES" (even strength), "PP" (power play), "SH" (short handed), "PS" (penalty shot), "EN" (empty net) — default to "ES" if unclear
3. PENALTIES: Each penalty. For each:
   - period
   - time (MM:SS)
   - player (name)
   - team ("home" or "away")
   - infraction (e.g. "Tripping", "Hooking", "Roughing")
   - duration (minutes as number, e.g. 2, 5, 10)

RULES:
- Handwriting may be messy — do your best to read names and times
- If a value is truly unreadable, use null
- Match player names to the known roster list when one is provided (use the closest match)
- Period may be written as "1", "2", "3", "P1", "P2", "P3", "OT"
- Time is time elapsed in the period, MM:SS format
- If no penalties are visible, return an empty array
- Return ONLY valid JSON, no markdown, no explanation

{
  "home_score": number,
  "away_score": number,
  "goals": [
    {
      "period": 1,
      "time": "2:31",
      "player": "Wicklund",
      "team": "home",
      "assist1": "Smith",
      "assist2": null,
      "goal_type": "ES"
    }
  ],
  "penalties": [
    {
      "period": 1,
      "time": "5:42",
      "player": "Jones",
      "team": "away",
      "infraction": "Tripping",
      "duration": 2
    }
  ]
}`;

    const models = ['claude-opus-4-8', 'claude-sonnet-4-6'];
    let response: Response | null = null;
    let lastErr = '';

    for (const model of models) {
      console.log('[parse-scoresheet] trying model:', model);
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: imageBase64 } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      });
      if (response.ok) break;
      lastErr = await response.text();
      console.error('[parse-scoresheet] model', model, 'error:', lastErr);
      if (!lastErr.includes('overloaded')) break;
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ error: 'AI parsing failed', detail: lastErr }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const ai = await response.json();
    const rawText = ai.content?.[0]?.text ?? '';
    console.log('[parse-scoresheet] raw AI response:', rawText);

    const jsonStr = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse AI response', raw: rawText }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      home_score: parsed.home_score ?? null,
      away_score: parsed.away_score ?? null,
      goals:      Array.isArray(parsed.goals)     ? parsed.goals     : [],
      penalties:  Array.isArray(parsed.penalties) ? parsed.penalties : [],
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[parse-scoresheet] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
