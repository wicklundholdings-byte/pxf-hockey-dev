import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/plans")({
  component: PlansPage,
});

const plans = [
  {
    id: "home",
    name: "Home Coach",
    price: "$9",
    period: "/month",
    desc: "Drill library + session builder for parents training their own kid.",
    features: ["Full drill library", "Session builder", "Save & reuse sessions"],
    trial: "14-day free trial",
  },
  {
    id: "elite",
    name: "Elite Coach",
    price: "$49",
    period: "/month",
    desc: "Run camps, take registrations, message parents.",
    features: ["Everything in Home", "Camp registrations + Stripe payouts", "Roster, attendance, evaluations", "Direct & group messaging", "Email broadcasts"],
    trial: "30-day free trial",
    highlight: true,
  },
  {
    id: "platinum",
    name: "Platinum Coach",
    price: "$99",
    period: "/month",
    desc: "For programs with branding, analytics, and partner channels.",
    features: ["Everything in Elite", "Custom branding (logo, colors)", "Advanced analytics", "Partner channels", "Priority support"],
    trial: "30-day free trial",
  },
];

function PlansPage() {
  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-16">
      <Link to="/coach" className="flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>
      <div className="mt-3 text-center">
        <Sparkles size={22} className="mx-auto text-teal" />
        <h1 className="mt-2 font-display text-2xl font-bold">Choose your plan</h1>
        <p className="mt-1 text-xs text-muted-foreground">Start free. Cancel anytime.</p>
      </div>
      <div className="mt-6 space-y-3">
        {plans.map((p) => (
          <div
            key={p.id}
            className={
              "rounded-2xl border p-4 " +
              (p.highlight ? "border-teal bg-teal/5" : "border-border bg-card")
            }
          >
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-display text-lg font-bold">{p.name}</p>
                {p.highlight && <span className="text-[10px] font-bold text-teal">MOST POPULAR</span>}
              </div>
              <div>
                <span className="font-display text-2xl font-bold">{p.price}</span>
                <span className="text-xs text-muted-foreground">{p.period}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{p.desc}</p>
            <ul className="mt-3 space-y-1.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs">
                  <Check size={13} className="mt-0.5 text-teal" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button className={"mt-4 w-full rounded-full py-2.5 text-xs font-bold " + (p.highlight ? "bg-gradient-brand text-primary-foreground" : "border border-border bg-surface text-foreground")}>
              Start {p.trial}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}