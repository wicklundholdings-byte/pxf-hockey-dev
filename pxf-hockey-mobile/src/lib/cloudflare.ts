/**
 * src/lib/cloudflare.ts
 * Cloudflare Stream integration for video hosting
 *
 * Architecture:
 *  All Cloudflare API calls are proxied through the Supabase Edge Function
 *  `stream-sign-url` so the API token is never in the app bundle.
 *
 * Deploy the edge function before launch:
 *   supabase functions deploy stream-sign-url
 *   supabase secrets set CLOUDFLARE_STREAM_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id>
 *
 * Account details:
 *   ACCOUNT_ID = '9b81a43b71d6af5c4ed5a893adc26918'
 */

import { supabase } from './supabase';

export const CLOUDFLARE_ACCOUNT_ID = '9b81a43b71d6af5c4ed5a893adc26918';

// ─── Edge Function URL ────────────────────────────────────────────────────────
const EDGE_FN_URL = 'https://kqamqlsimyelvzxqdnyp.supabase.co/functions/v1/stream-sign-url';

// ─── Helper: authenticated call to our edge function ─────────────────────────
async function callEdgeFn(
  action: string,
  params?: Record<string, string>,
  body?: object,
): Promise<any | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn('[Cloudflare] No auth session — cannot call edge function');
    return null;
  }

  const url = new URL(EDGE_FN_URL);
  url.searchParams.set('action', action);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      method:  body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Cloudflare] edge fn error ${res.status}:`, text);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('[Cloudflare] fetch error:', e);
    return null;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface StreamVideo {
  uid:      string;
  thumbnail: string;
  playback: { hls: string; dash: string };
  meta:     { name?: string };
  duration: number;   // seconds
  size:     number;   // bytes
  status:   { state: 'pendingupload'|'downloading'|'queued'|'inprogress'|'ready'|'error' };
  created:  string;
  modified: string;
}

// ─── List videos ─────────────────────────────────────────────────────────────
export async function listVideos(): Promise<StreamVideo[]> {
  const result = await callEdgeFn('list');
  return Array.isArray(result) ? result : [];
}

// ─── Get single video ─────────────────────────────────────────────────────────
export async function getVideo(videoId: string): Promise<StreamVideo | null> {
  return callEdgeFn('get', { videoId });
}

// ─── Delete video ─────────────────────────────────────────────────────────────
export async function deleteVideo(videoId: string): Promise<boolean> {
  const result = await callEdgeFn('delete', { videoId });
  return result?.ok === true;
}

// ─── Get upload URL (for direct uploads from device) ─────────────────────────
export async function getUploadUrl(name: string): Promise<{ uploadURL: string; uid: string } | null> {
  return callEdgeFn('upload_url', {}, { name });
}

// ─── Get signed playback URL (for private videos) ────────────────────────────
export async function getSignedUrl(videoId: string): Promise<string | null> {
  const result = await callEdgeFn('sign', { videoId });
  return result?.signedUrl ?? null;
}

// ─── Public URL helpers (no auth needed) ─────────────────────────────────────
export function getPublicHlsUrl(videoId: string): string {
  return `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
}

export function getThumbnailUrl(videoId: string): string {
  return `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg`;
}
