import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Crown, Sparkles, Zap, Lock } from "lucide-react";

export const Route = createFileRoute("/payments/subscribe")({
  head: () => ({ meta: [{ title: "Choose your plan — PXF Hockey for Coaches" }] }),
  component: SubscribeScreen,
});

type Cycle = "monthly" | "annual";

const tiers = [
  {
    id: "basic",
    name: "Basic",
    icon: Sparkles,
    monthly: 0,
    annual: 0,
    tagline: "Try the platform",
    features: ["1 active camp", "Up to 20 athletes", "Manual roster", "Email support"],
    cta: "Current plan",
    accent: "muted" as const,
  },
  {
    id: "elite",
    name: "Elite",
    icon: Zap,
    monthly: 29,
    annual: 290,
    tagline: "Grow your program",
    features: ["Unlimited camps", "Up to 200 athletes", "Drill library", "Custom branding", "Email campaigns"],
    cta: "Choose Elite",
    accent: "teal" as const,
  },
  {
    id: "platinum",
    name: "Platinum",
    icon: Crown,
    monthly: 79,
    annual: 790,
    tagline: "Run it like a business",
    features: ["Everything in Elite", "Stripe payouts", "Payment plans", "Team accounts", "Advanced analytics", "Priority support"],
    cta: "Go Platinum",
    accent: "gold" as const,
    featured: true,
  },
];

function SubscribeScreen() {
  const [cycle, setCycle] = useState<Cycle>("annual");
  const [picked, setPicked] = useState<string | null>(null);
  const foundingLeft = 17;

  if (picked) return <CardEntry tier={tiers.find((t) => t.id === picked)!} cycle={cycle} onBack={() => setPicked(null)} />;

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24">
      <Link to="/payments-preview" className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back</Link>

      <div className="mt-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Coach platform</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">Pick your plan</h1>
        <p className="mt-1 text-xs text-muted-foreground">Cancel anytime. 14-day money-back guarantee.</p>
      </div>

      {/* Founding member counter */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/5 px-3 py-1.5">
        <Crown size={12} className="text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
          Founding members · {foundingLeft} of 50 spots left
        </span>
      </div>

      {/* Cycle toggle */}
      <div className="mx-auto mt-4 flex w-fit rounded-full border border-border bg-card p-1">
        <button onClick={() => setCycle("monthly")} className={"rounded-full px-4 py-1.5 text-[11px] font-bold transition " + (cycle === "monthly" ? "bg-teal text-black" : "text-muted-foreground")}>Monthly</button>
        <button onClick={() => setCycle("annual")} className={"flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold transition " + (cycle === "annual" ? "bg-teal text-black" : "text-muted-foreground")}>
          Annual <span className={"rounded-full px-1.5 py-0.5 text-[8px] " + (cycle === "annual" ? "bg-black/15 text-black" : "bg-emerald-400/15 text-emerald-400")}>−17%</span>
        </button>
      </div>

      {/* Tiers */}
      <div className="mt-5 space-y-3">
        {tiers.map((t) => {
          const price = cycle === "monthly" ? t.monthly : Math.round(t.annual / 12);
          const isFree = t.monthly === 0;
          const ring =
            t.accent === "gold" ? "border-amber-400/50 bg-gradient-to-br from-amber-400/10 to-transparent" :
            t.accent === "teal" ? "border-teal/40 bg-gradient-to-br from-teal/5 to-transparent" :
            "border-border bg-card";
          const iconCls =
            t.accent === "gold" ? "bg-amber-400/15 text-amber-400" :
            t.accent === "teal" ? "bg-teal/15 text-teal" :
            "bg-surface text-muted-foreground";
          return (
            <div key={t.id} className={"relative rounded-2xl border p-4 " + ring}>
              {t.featured && (
                <span className="absolute -top-2 right-4 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
                  Most popular
                </span>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={"grid h-10 w-10 place-items-center rounded-xl " + iconCls}>
                    <t.icon size={18} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.tagline}</p>
                  </div>
                </div>
                <div className="text-right">
                  {isFree ? (
                    <p className="font-display text-xl font-bold text-foreground">Free</p>
                  ) : (
                    <>
                      <p className="font-display text-2xl font-bold text-foreground">${price}<span className="text-xs text-muted-foreground">/mo</span></p>
                      {cycle === "annual" && <p className="text-[10px] text-emerald-400">Billed ${t.annual}/yr</p>}
                    </>
                  )}
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check size={12} className={t.accent === "gold" ? "text-amber-400" : t.accent === "teal" ? "text-teal" : "text-muted-foreground"} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isFree}
                onClick={() => setPicked(t.id)}
                className={
                  "mt-4 w-full rounded-full py-2.5 text-xs font-bold disabled:opacity-50 " +
                  (t.accent === "gold" ? "bg-amber-400 text-black" : t.accent === "teal" ? "bg-teal text-black" : "border border-border bg-surface text-muted-foreground")
                }
              >
                {t.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardEntry({ tier, cycle, onBack }: { tier: typeof tiers[number]; cycle: Cycle; onBack: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const price = cycle === "monthly" ? tier.monthly : tier.annual;

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background px-5 pt-16 pb-24 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal shadow-2xl shadow-emerald-400/40">
          <Check size={36} strokeWidth={3} className="text-black" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-foreground">Welcome to {tier.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your subscription is active. All features unlocked.</p>
        <p className="mt-4 rounded-full border border-border bg-card mx-auto w-fit px-3 py-1 font-mono text-[11px] text-muted-foreground">
          Sub <span className="text-foreground">#sub_1Q8M2X4K</span>
        </p>
        <Link to="/payments-preview" className="mt-8 inline-block rounded-full bg-teal px-6 py-3 text-sm font-bold text-black">Go to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back to plans</button>

      <h1 className="mt-3 font-display text-2xl font-bold text-foreground">Confirm subscription</h1>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tier.name} plan · {cycle}</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">${price}<span className="text-xs text-muted-foreground">/{cycle === "monthly" ? "mo" : "yr"}</span></p>
          </div>
          <tier.icon size={28} className={tier.accent === "gold" ? "text-amber-400" : "text-teal"} />
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Lock size={10} /> Stripe</div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-border bg-surface px-3 py-3">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Card number</p>
            <p className="font-mono text-sm tracking-widest text-muted-foreground/60">1234 1234 1234 1234</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-surface px-3 py-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Expiry</p>
              <p className="font-mono text-sm text-muted-foreground/60">MM / YY</p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-3 py-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">CVC</p>
              <p className="font-mono text-sm text-muted-foreground/60">•••</p>
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => setConfirmed(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-teal py-3.5 text-sm font-bold text-black shadow-lg shadow-teal/30">
        <Lock size={14} /> Subscribe ${price}/{cycle === "monthly" ? "mo" : "yr"}
      </button>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">Cancel anytime from settings. Recurring billing handled by Stripe.</p>
    </div>
  );
}