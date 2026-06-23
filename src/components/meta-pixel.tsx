import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

/**
 * Meta Pixel stub.
 * Reads the coach's Pixel ID from `coach_marketing_settings` and fires a
 * Purchase event when the page mounts.
 *
 * TODO (build phase): inject the real fbq() script via <script> tag and call
 *   fbq('init', pixelId); fbq('track', 'Purchase', { value, currency, content_name });
 * For now we just log so the integration point is visible.
 */
export function MetaPixel({
  coachId,
  campName,
  amountCents,
  currency = "USD",
}: {
  coachId: string | null | undefined;
  campName: string;
  amountCents: number;
  currency?: string;
}) {
  const [pixelId, setPixelId] = useState<string | null>(null);

  useEffect(() => {
    if (!coachId) return;
    let cancelled = false;
    (supabase as any)
      .rpc("get_meta_pixel_id", { _coach_id: coachId })
      .then(({ data }: { data: string | null }) => {
        if (cancelled) return;
        setPixelId(data ?? null);
      });
    return () => { cancelled = true; };
  }, [coachId]);

  useEffect(() => {
    if (!pixelId) return;
    // TODO (build phase): wire actual Facebook Pixel script
    // eslint-disable-next-line no-console
    console.info("[MetaPixel] Purchase", {
      pixelId,
      content_name: campName,
      value: amountCents / 100,
      currency,
    });
  }, [pixelId, campName, amountCents, currency]);

  return null;
}