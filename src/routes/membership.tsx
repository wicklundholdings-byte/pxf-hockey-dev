import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, ArrowLeft, Crown, Flame } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/membership")({
  head: () => ({ meta: [{ title: "Membership — PXF Hockey" }] }),
  component: Membership,
});

type Tier = {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  futureMonthly?: number;
  badge?: string;
  features: { label: string; included: boolean }[];
};

const tiers: Tier[] = [
  {
    id: "basic",
    name: "Basic",
    monthly: 0,
    annual: 0,
    features: [
      { label: "Browse public camps", included: true },
      { label: "Player profile", included: true },
      { label: "Drill library access", included: false },
      { label: "Camp management", included: false },
      { label: "Team messaging", included: false },
      { label: "Stripe payouts", included: false },
    ],
  },
  {
    id: "elite",
    name: "Elite",
    monthly: 9.99,
    annual: 99.99,
    futureMonthly: 29.99,
    features: [
      { label: "Full drill & session library", included: true },
      { label: "Session builder", included: true },
      { label: "Up to 2 camps active", included: true },
      { label: "Team messaging", included: true },
      { label: "Stripe Connect payouts", included: false },
      { label: "Email marketing", included: false },
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    monthly: 24.99,
    annual: 249.99,
    futureMonthly: 79.99,
    badge: "Most Popular",
    features: [
      { label: "Everything in Elite", included: true },
      { label: "Unlimited camps", included: true },
      { label: "Stripe Connect payouts", included: true },
      { label: "Email marketing & broadcasts", included: true },
      { label: "Waivers & e-signatures", included: true },
      { label: "Priority coach support", included: true },
    ],
  },
];

const comparisonRows = [
  { label: "Drill library", basic: false, elite: true, platinum: true },
  { label: "Camps active", basic: "—", elite: "2", platinum: "Unlimited" },
  { label: "Team messaging", basic: false, elite: true, platinum: true },
  { label: "Stripe payouts", basic: false, elite: false, platinum: true },
  { label: "Email marketing", basic: false, elite: false, platinum: true },
  { label: "Waivers", basic: false, elite: false, platinum: true },
  { label: "Public coach profile", basic: false, elite: true, platinum: true },
];

function Membership() {
  const [annual, setAnnual] = useState(false);
  const spotsLeft = 37;

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Founding member banner */}
      <div className="mt-3 rounded-2xl border border-teal/40 bg-gradient-to-r from-teal/15 to-volt/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-teal">
          <Flame size={16} /> Founding Member Pricing
        </p>
        <p className="mt-1 text-xs text-foreground/90">
          Only <span className="font-bold text-volt">{spotsLeft} of 50 spots</span> remaining. Lock in your rate forever.
        </p>
      </div>

      <div className="mt-5 text-center">
        <Crown size={26} className="mx-auto text-volt" />
        <h1 className="mt-2 font-display text-2xl font-bold">Choose your plan</h1>
        <p className="mt-1 text-xs text-muted-foreground">Cancel anytime. 7-day free trial on paid tiers.</p>
      </div>

      {/* Annual toggle */}
      <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 rounded-full border border-border bg-card p-1">
        <button
          onClick={() => setAnnual(false)}
          className={`flex-1 rounded-full py-2 text-xs font-bold ${!annual ? "bg-teal text-background" : "text-muted-foreground"}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={`flex-1 rounded-full py-2 text-xs font-bold ${annual ? "bg-teal text-background" : "text-muted-foreground"}`}
        >
          Annual <span className="ml-1 rounded bg-volt/20 px-1 text-[9px] text-volt">Save 17%</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {tiers.map((t) => {
          const isPopular = t.badge === "Most Popular";
          const price = t.monthly === 0 ? "Free" : annual ? `$${t.annual}` : `$${t.monthly}`;
          const suffix = t.monthly === 0 ? "" : annual ? "/yr" : "/mo";
          return (
            <div
              key={t.id}
              className={`relative rounded-2xl border bg-card p-5 ${isPopular ? "border-volt shadow-[0_0_0_1px] shadow-volt/40" : "border-border"}`}
            >
              {isPopular && (
                <span className="absolute -top-2 left-5 rounded-full bg-volt px-2 py-0.5 text-[9px] font-bold tracking-wider text-background">
                  MOST POPULAR
                </span>
              )}
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold">{price}</span>
                <span className="text-xs text-muted-foreground">{suffix}</span>
              </div>
              {t.futureMonthly && (
                <p className="mt-1 text-[10px] text-volt">
                  Price increases to ${t.futureMonthly}/mo after 50 coaches
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {t.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-xs">
                    {f.included ? (
                      <Check size={14} className="mt-0.5 shrink-0 text-teal" />
                    ) : (
                      <X size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={f.included ? "text-foreground" : "text-muted-foreground line-through"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`mt-5 w-full rounded-xl py-3 text-xs font-bold tracking-wider ${
                  isPopular ? "bg-volt text-background" : t.monthly === 0 ? "border border-border text-foreground" : "bg-teal text-background"
                }`}
              >
                {t.monthly === 0 ? "CONTINUE FREE" : "SELECT PLAN"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-4 border-b border-border bg-background/40 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Feature</span><span className="text-center">Basic</span><span className="text-center">Elite</span><span className="text-center">Platinum</span>
        </div>
        {comparisonRows.map((r) => (
          <div key={r.label} className="grid grid-cols-4 items-center border-b border-border px-4 py-3 text-xs last:border-b-0">
            <span className="text-foreground">{r.label}</span>
            {(["basic", "elite", "platinum"] as const).map((k) => {
              const v = r[k];
              return (
                <span key={k} className="flex justify-center">
                  {typeof v === "boolean" ? (
                    v ? <Check size={14} className="text-teal" /> : <X size={14} className="text-muted-foreground" />
                  ) : (
                    <span className="text-foreground">{v}</span>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
