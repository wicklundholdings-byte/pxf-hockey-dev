import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  type TierId,
  type Tier,
  tierFromPlanName,
  tierAtLeast,
  getTier,
  FEATURE_MIN_TIER,
} from "@/lib/tiers";

const MOCK_KEY = "pxf:mock-tier";

export function getMockTier(): TierId | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(MOCK_KEY);
  if (!v || v === "auto") return null;
  return v as TierId;
}

export function setMockTier(tier: TierId | "auto") {
  if (typeof window === "undefined") return;
  if (tier === "auto") window.localStorage.removeItem(MOCK_KEY);
  else window.localStorage.setItem(MOCK_KEY, tier);
  window.dispatchEvent(new Event("pxf:mock-tier-changed"));
}

export function useCurrentTier(): {
  tier: TierId | null;
  dbTier: TierId | null;
  tierMeta: Tier | null;
  loading: boolean;
  isMocked: boolean;
} {
  const { user, loading: authLoading } = useAuth();
  const [dbTier, setDbTier] = useState<TierId | null>(null);
  const [loading, setLoading] = useState(true);
  const [mock, setMock] = useState<TierId | null>(() => getMockTier());

  useEffect(() => {
    const onChange = () => setMock(getMockTier());
    if (typeof window !== "undefined") {
      window.addEventListener("pxf:mock-tier-changed", onChange);
      window.addEventListener("storage", onChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pxf:mock-tier-changed", onChange);
        window.removeEventListener("storage", onChange);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setDbTier(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("subscriptions")
      .select("plan_name,status,current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data }) => {
        if (cancelled) return;
        const active = (data ?? []).find(
          (s) => !s.current_period_end || new Date(s.current_period_end) > new Date(),
        );
        setDbTier(tierFromPlanName(active?.plan_name ?? null));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, mock]);

  // A stale dev mock of "parent" can leak into coach previews via localStorage.
  // Parent is not a coach subscription tier, so keep paid coach accounts on their
  // real DB tier instead of dropping coach dashboards/features to parent mode.
  const effective = mock === "parent" && dbTier && dbTier !== "parent" ? dbTier : (mock ?? dbTier);
  return {
    tier: effective,
    dbTier,
    tierMeta: effective ? getTier(effective) : null,
    loading: authLoading || loading,
    isMocked: !!mock,
  };
}

export function useHasFeature(feature: keyof typeof FEATURE_MIN_TIER) {
  const { tier, loading } = useCurrentTier();
  return {
    allowed: tierAtLeast(tier, FEATURE_MIN_TIER[feature]),
    loading,
    tier,
  };
}