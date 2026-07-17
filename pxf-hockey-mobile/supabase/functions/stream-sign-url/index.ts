/**
 * Supabase Edge Function: stream-sign-url
 *
 * Proxies Cloudflare Stream API calls server-side so the API token
 * is never exposed in the mobile app bundle.
 *
 * Deploy:
 *   supabase functions deploy stream-sign-url
 *   supabase secrets set CLOUDFLARE_STREAM_TOKEN=cfut_... CLOUDFLARE_ACCOUNT_ID=9b81a43b71d6af5c4ed5a893adc26918
 *
 * Endpoints (passed as ?action=<action>):
 *   list          GET  → list all videos for the account
 *   get           GET  ?videoId=<uid>  → single video metadata
 *   sign          POST ?videoId=<uid>  → signed playback URL (private videos)
 *   upload_url    POST body: { name: string } → one-time direct-upload URL
 *   delete        DELETE ?videoId=<uid>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') ?? '';
const CF_TOKEN      = Deno.env.get('CLOUDFLARE_STREAM_TOKEN') ?? '';
const BASE_URL      = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream`;

const CF_HEADERS = {
  Authorization: `Bearer ${CF_TOKEN}`,
  'Content-Type': 'application/json',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Auth helper ─────────────────────────────────────────────────────────────
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Require auth
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const url    = new URL(req.url);
  const action  = url.searchParams.get('action') ?? '';
  const videoId = url.searchParams.get('videoId') ?? '';

  try {
    let cfRes: Response;
    let body: any;

    switch (action) {

      // ── List all videos ──────────────────────────────────────────────────────
      case 'list': {
        cfRes = await fetch(BASE_URL, { headers: CF_HEADERS });
        body  = await cfRes.json();
        return new Response(JSON.stringify(body.success ? body.result : []), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ── Get single video ─────────────────────────────────────────────────────
      case 'get': {
        if (!videoId) return err(400, 'videoId required');
        cfRes = await fetch(`${BASE_URL}/${videoId}`, { headers: CF_HEADERS });
        body  = await cfRes.json();
        return new Response(JSON.stringify(body.success ? body.result : null), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ── Generate signed playback URL (private videos) ────────────────────────
      case 'sign': {
        if (!videoId) return err(400, 'videoId required');
        cfRes = await fetch(`${BASE_URL}/${videoId}/token`, {
          method:  'POST',
          headers: CF_HEADERS,
        });
        body = await cfRes.json();
        if (!body.success) return err(500, body.errors?.[0]?.message ?? 'Sign failed');
        const signedUrl = `https://iframe.videodelivery.net/${body.result.token}`;
        return new Response(JSON.stringify({ signedUrl }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ── Get direct upload URL ────────────────────────────────────────────────
      case 'upload_url': {
        const reqBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
        const name    = reqBody.name ?? 'PXF Video';
        cfRes = await fetch(`${BASE_URL}/direct_upload`, {
          method:  'POST',
          headers: CF_HEADERS,
          body:    JSON.stringify({
            maxDurationSeconds: 3600,
            meta: { name },
            requireSignedURLs: false,
          }),
        });
        body = await cfRes.json();
        if (!body.success) return err(500, body.errors?.[0]?.message ?? 'Upload URL failed');
        return new Response(JSON.stringify({
          uploadURL: body.result.uploadURL,
          uid:       body.result.uid,
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // ── Delete video ─────────────────────────────────────────────────────────
      case 'delete': {
        if (!videoId) return err(400, 'videoId required');
        cfRes = await fetch(`${BASE_URL}/${videoId}`, {
          method:  'DELETE',
          headers: CF_HEADERS,
        });
        return new Response(JSON.stringify({ ok: cfRes.ok }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      default:
        return err(400, `Unknown action: ${action}. Use list | get | sign | upload_url | delete`);
    }
  } catch (e: any) {
    console.error('[stream-sign-url]', e);
    return err(500, e?.message ?? 'Internal error');
  }
});

function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
