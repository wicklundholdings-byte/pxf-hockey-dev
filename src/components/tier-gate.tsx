import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCurrentTier } from "@/hooks/use-tier";
import {
  FEATURE_MIN_TIER,
  gateMessage,
  getTier,
  tierAtLeast,
  TIERS,
  type TierId,
} from "@/lib/tiers";
import { setMockTier, getMockTier } from "@/hooks/use-tier";

type Feature = keyof typeof FEATURE_MIN_TIER;

export function TierGate({
  feature,
  children,
  fallback,
}: {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { tier, loading } = useCurrentTier();
  if (loading) {
    return <div className="px-5 pt-10 text-center text-xs text-muted-foreground">Loading…</div>;
  }
  const allowed = tierAtLeast(tier, FEATURE_MIN_TIER[feature]);
  if (allowed) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return <UpgradePrompt feature={feature} currentTier={tier} />;
}

export function UpgradePrompt({
  feature,
  currentTier,
}: {
  feature: Feature;
  currentTier: TierId | null;
}) {
  const min = FEATURE_MIN_TIER[feature];
  const minTier = getTier(min);
  return (
    <div className="px-5 pt-6 pb-16">
      <div className="mx-auto max-w-md rounded-3xl border border-teal/30 bg-card p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal/15">
          <Lock size={22} className="text-teal" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold">Upgrade required</h2>
        <p className="mt-2 text-sm text-muted-foreground">{gateMessage(feature)}</p>
        <p className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">
          Your plan: <span className="text-foreground">{currentTier ? getTier(currentTier).name : "Free"}</span>
        </p>
        <div className="mt-4 rounded-2xl border border-teal/40 bg-teal/5 p-4 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Recommended</p>
          <p className="mt-1 font-display text-lg font-bold">{minTier.name} — ${minTier.price}/mo</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{minTier.tagline}</p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {minTier.features.slice(0, 4).map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </div>
        <Link
          to="/coach/plans"
          className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-full bg-gradient-brand py-3 text-xs font-bold text-primary-foreground"
        >
          <Sparkles size={13} /> Upgrade to {minTier.name}
        </Link>
      </div>
    </div>
  );
}

/**
 * Floating dev-tools widget for previewing each tier without paying.
 * Hidden in production builds.
 */
export function DevTierSwitcher() {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState<string>(() => getMockTier() ?? "auto");
  const { tier } = useCurrentTier();
  if (import.meta.env.PROD) return null;

  const choose = (next: TierId | "auto") => {
    setVal(next);
    setMockTier(next);
  };

  return (
    <div className="fixed bottom-24 right-3 z-40">
      {open ? (
        <div className="w-56 rounded-2xl border border-teal/40 bg-card/95 p-3 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Dev: Mock Tier</p>
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">×</button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Current: {tier ?? "free"}</p>
          <div className="mt-2 space-y-1">
            {(["auto", ...TIERS.map((t) => t.id)] as const).map((id) => (
              <button
                key={id}
                onClick={() => choose(id as TierId | "auto")}
                className={
                  "block w-full rounded-lg px-2 py-1.5 text-left text-xs " +
                  (val === id ? "bg-teal text-background" : "bg-surface text-foreground hover:bg-surface-2")
                }
              >
                {id === "auto" ? "Auto (DB)" : getTier(id as TierId).name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-full border border-teal/40 bg-card/95 px-3 py-1.5 text-[10px] font-bold text-teal shadow-lg backdrop-blur"
          title="Mock subscription tier"
        >
          TIER: {tier ?? "free"} <ChevronDown size={10} />
        </button>
      )}
    </div>
  );
}