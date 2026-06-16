import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowLeft, Crown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership — PXF Hockey" },
      { name: "description", content: "Choose your PXF Hockey membership: Core for fundamentals, Elite for the full development system." },
      { property: "og:title", content: "Membership — PXF Hockey" },
      { property: "og:description", content: "Core and Elite training memberships built for elite hockey development." },
    ],
  }),
  component: Membership,
});

const billing = {
  monthly: { label: "Monthly", suffix: "/month" },
  annual: { label: "Annual", suffix: "/year" },
};

const plans = [
  {
    id: "core",
    name: "PXF CORE",
    subtitle: "For players building the fundamentals",
    monthlyPrice: "$19.99",
    annualPrice: "$199.99",
    annualNote: "Save 17%",
    tint: "teal" as const,
    cta: "START CORE",
    features: [
      "Core drill library",
      "Skating Flow",
      "Puck Control",
      "Shooting",
      "Passing",
      "Dryland",
      "Video demonstrations",
      "Progressions",
    ],
    comparison: "Sits below iTrain Hockey's monthly price while offering a broader system.",
  },
  {
    id: "elite",
    name: "PXF ELITE",
    subtitle: "Everything in Core, plus the advanced system",
    monthlyPrice: "$29.99",
    annualPrice: "$299.99",
    annualNote: "Save 17%",
    tint: "volt" as const,
    cta: "START ELITE",
    recommended: true,
    features: [
      "Advanced slip circuits",
      "Session Builder",
      "Coach Resources",
      "Practice Plans",
      "Coaching Notes",
      "Small Area Games",
      "GameIQ Library",
      "Future GameIQ integration",
      "Early access to new content",
    ],
  },
];

function Membership() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="px-5 pt-4">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="mt-4 text-center">
        <Crown size={28} className="mx-auto text-volt" />
        <p className="mt-2 text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PXF MEMBERSHIP</p>
        <h1 className="mt-1 text-3xl font-bold text-gradient-brand">Train the Game</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Pick the plan that matches your game. Upgrade or cancel anytime.
        </p>
      </div>

      {/* Billing switch */}
      <div className="mx-auto mt-6 flex max-w-xs items-center justify-center rounded-full border border-border/60 bg-surface p-1">
        {( ["monthly", "annual"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={
              "flex-1 rounded-full px-4 py-2 text-xs font-bold tracking-wider transition-all " +
              (period === key
                ? "bg-gradient-brand text-primary-foreground shadow-glow-teal"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {billing[key].label}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="mt-6 space-y-4">
        {plans.map((plan) => {
          const isTeal = plan.tint === "teal";
          const activeColor = isTeal ? "border-teal shadow-glow-teal" : "border-volt shadow-glow-volt";
          const textColor = isTeal ? "text-teal" : "text-volt";
          const price = period === "monthly" ? plan.monthlyPrice : plan.annualPrice;

          return (
            <div
              key={plan.id}
              className={"relative overflow-hidden rounded-3xl border bg-surface p-5 " + activeColor}
            >
              {plan.recommended && (
                <span className="absolute -top-2 left-5 rounded-full bg-gradient-brand px-2 py-0.5 text-[9px] font-bold tracking-widest text-primary-foreground">
                  RECOMMENDED
                </span>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <p className={"text-[10px] font-bold tracking-[0.3em] " + textColor}>{plan.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{plan.subtitle}</p>
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-foreground">{price}</span>
                <span className="text-sm text-muted-foreground">{billing[period].suffix}</span>
                {period === "annual" && (
                  <span className={"text-[10px] font-bold tracking-wide " + textColor}>{plan.annualNote}</span>
                )}
              </div>

              {plan.comparison && (
                <p className="mt-2 text-xs italic text-muted-foreground">{plan.comparison}</p>
              )}

              <button
                className={
                  "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold tracking-[0.2em] text-primary-foreground transition-transform active:scale-[0.98] " +
                  (isTeal ? "bg-gradient-brand shadow-glow-teal" : "bg-gradient-brand shadow-glow-volt")
                }
              >
                {plan.cta}
              </button>

              <div className="mt-5 border-t border-border/60 pt-4">
                <p className={"text-[10px] font-bold tracking-[0.3em] " + textColor}>INCLUDED</p>
                <ul className="mt-3 grid gap-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
                      <span className={"mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-primary-foreground " + (isTeal ? "bg-gradient-brand" : "bg-gradient-brand")}>
                        <Check size={11} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 mb-8 text-center text-[10px] leading-relaxed tracking-widest text-muted-foreground">
        CANCEL ANYTIME · NO COMMITMENT · 7-DAY FREE TRIAL
      </p>
    </div>
  );
}
