import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowLeft, Sparkles, Flame } from "lucide-react";
import { COACH_TIERS, FOUNDING_MEMBER_END } from "@/lib/tiers";

export const Route = createFileRoute("/_authenticated/coach/plans")({
  component: PlansPage,
});

function PlansPage() {
  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-16">
      <Link to="/coach" className="flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>
      <div className="mt-3 rounded-2xl border border-teal/40 bg-gradient-to-r from-teal/15 to-volt/10 p-3">
        <p className="flex items-center gap-2 text-xs font-bold text-teal">
          <Flame size={14} /> Founding Member — Free until {FOUNDING_MEMBER_END}
        </p>
      </div>
      <div className="mt-4 text-center">
        <Sparkles size={22} className="mx-auto text-teal" />
        <h1 className="mt-2 font-display text-2xl font-bold">Choose your coach plan</h1>
        <p className="mt-1 text-xs text-muted-foreground">14-day free trial on every coach tier.</p>
      </div>
      <div className="mt-6 space-y-3">
        {COACH_TIERS.map((p) => (
          <div
            key={p.id}
            className={
              "rounded-2xl border p-4 " +
              (p.popular ? "border-teal bg-teal/5" : "border-border bg-card")
            }
          >
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-display text-lg font-bold">{p.name}</p>
                {p.popular && <span className="text-[10px] font-bold text-teal">MOST POPULAR</span>}
              </div>
              <div>
                <span className="font-display text-2xl font-bold">${p.price}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{p.tagline}</p>
            <ul className="mt-3 space-y-1.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs">
                  <Check size={13} className="mt-0.5 text-teal" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button className={"mt-4 w-full rounded-full py-2.5 text-xs font-bold " + (p.popular ? "bg-gradient-brand text-primary-foreground" : "border border-border bg-surface text-foreground")}>
              Start {p.trialDays}-day free trial
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}