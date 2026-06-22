import { BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Blue shield checkmark shown on coach profiles, public camp pages, and listings
 * when the coach has an approved (non-expired) verification record.
 */
export function VerifiedBadge({
  size = "sm",
  label = true,
  className = "",
}: { size?: "xs" | "sm" | "md"; label?: boolean; className?: string }) {
  const iconSize = size === "xs" ? 10 : size === "sm" ? 12 : 14;
  const pad = size === "xs" ? "px-1.5 py-0.5" : size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const text = size === "xs" ? "text-[9px]" : "text-[10px]";
  return (
    <span
      title="Identity & background check verified"
      className={`inline-flex items-center gap-1 rounded-full bg-sky-500/15 ${pad} ${text} font-bold uppercase tracking-wider text-sky-400 ring-1 ring-inset ring-sky-500/30 ${className}`}
    >
      <BadgeCheck size={iconSize} className="fill-sky-500/20" />
      {label && "Verified"}
    </span>
  );
}

/** Hook: returns true if the given coach user is currently verified. */
export function useCoachVerified(userId: string | null | undefined) {
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (!userId) { setVerified(false); return; }
    let cancelled = false;
    supabase
      .from("coach_verifications")
      .select("status, expires_at")
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle()
      .then(({ data }: { data: { status: string; expires_at: string | null } | null }) => {
        if (cancelled) return;
        if (!data) { setVerified(false); return; }
        const stillValid = !data.expires_at || new Date(data.expires_at) > new Date();
        setVerified(stillValid);
      });
    return () => { cancelled = true; };
  }, [userId]);
  return verified;
}