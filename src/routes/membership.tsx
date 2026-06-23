import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowLeft, Crown, Flame, X } from "lucide-react";
import { TIERS, FOUNDING_MEMBER_END, FOUNDING_MEMBER_LIMIT } from "@/lib/tiers";

export const Route = createFileRoute("/membership")({
  head: () => ({ meta: [{ title: "Membership — PXF Hockey" }] }),
  component: Membership,
});

function Membership() {
  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Founding member banner */}
      <div className="mt-3 rounded-2xl border border-teal/40 bg-gradient-to-r from-teal/15 to-volt/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-teal">
          <Flame size={16} /> Founding Member — Free until {FOUNDING_MEMBER_END}
        </p>
        <p className="mt-1 text-xs text-foreground/90">
          First {FOUNDING_MEMBER_LIMIT} signups get full access to their tier — free until {FOUNDING_MEMBER_END}.
        </p>
      </div>

      <div className="mt-5 text-center">
        <Crown size={26} className="mx-auto text-volt" />
        <h1 className="mt-2 font-display text-2xl font-bold">Choose your plan</h1>
        <p className="mt-1 text-xs text-muted-foreground">Cancel anytime. Free trial included on every tier.</p>
      </div>

      {/* Plan cards */}
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.id}
            className={`relative rounded-2xl border bg-card p-5 ${t.popular ? "border-volt shadow-[0_0_0_1px] shadow-volt/40" : "border-border"}`}
          >
            {t.popular && (
              <span className="absolute -top-2 left-5 rounded-full bg-volt px-2 py-0.5 text-[9px] font-bold tracking-wider text-background">
                MOST POPULAR
              </span>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t.name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{t.tagline}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">${t.price}</span>
              <span className="text-xs text-muted-foreground">/mo</span>
            </div>
            <p className="mt-1 text-[10px] text-teal">{t.trialDays}-day free trial</p>
            <ul className="mt-4 space-y-2">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs">
                  <Check size={14} className="mt-0.5 shrink-0 text-teal" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
              {t.restrictions?.map((r) => (
                <li key={r} className="flex items-start gap-2 text-xs">
                  <X size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
            <button
              className={`mt-5 w-full rounded-xl py-3 text-xs font-bold tracking-wider ${
                t.popular ? "bg-volt text-background" : "bg-teal text-background"
              }`}
            >
              START {t.trialDays}-DAY TRIAL
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
