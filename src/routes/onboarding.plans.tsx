import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, Star, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/onboarding/plans")({
  validateSearch: (s: Record<string, unknown>) => ({
    role: s.role === "coach" || s.role === "parent" ? s.role : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Choose your plan — PXF Hockey" },
      { name: "description", content: "Select the PXF Hockey plan that fits your program." },
    ],
  }),
  component: OnboardingPlans,
});

type Billing = "monthly" | "annual";

interface Plan {
  id: string;
  name: string;
  monthly: number;
  foundingMonthly?: number;
  annual: number;
  foundingAnnual?: number;
  features: string[];
  popular?: boolean;
  cta: string;
  ctaStyle: "outline" | "gradient";
}

const PLANS: Plan[] = [
  {
    id: "parent",
    name: "PARENT",
    monthly: 10,
    annual: 100,
    features: [
      "Athlete profile",
      "Dryland programs",
      "Schedule & RSVP",
      "Evaluations",
      "Payments",
      "Messaging",
    ],
    cta: "Get Started",
    ctaStyle: "outline",
  },
  {
    id: "team",
    name: "TEAM COACH",
    monthly: 35,
    foundingMonthly: 26,
    annual: 350,
    foundingAnnual: 260,
    features: [
      "Everything in Parent",
      "3 teams",
      "Drill library",
      "Practice plans",
      "Session builder",
      "PXF hardware integration",
      "1 staff coach",
    ],
    cta: "Start Free Trial",
    ctaStyle: "outline",
  },
  {
    id: "elite",
    name: "ELITE COACH",
    monthly: 75,
    foundingMonthly: 56,
    annual: 750,
    foundingAnnual: 560,
    popular: true,
    features: [
      "Everything in Team Coach",
      "Unlimited camps",
      "Privates",
      "Financials",
      "Locations",
      "QR check-in",
      "Public profile + marketplace",
    ],
    cta: "Start Free Trial",
    ctaStyle: "gradient",
  },
  {
    id: "academy",
    name: "ACADEMY",
    monthly: 125,
    foundingMonthly: 94,
    annual: 1250,
    foundingAnnual: 940,
    features: [
      "Everything in Elite Coach",
      "Unlimited teams",
      "Unlimited staff",
      "Advanced reporting",
    ],
    cta: "Start Free Trial",
    ctaStyle: "outline",
  },
];

function OnboardingPlans() {
  const { role } = useSearch({ from: "/onboarding/plans" });
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background px-5 pt-6 pb-12">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-brand p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-xs font-bold text-black">
          <Flame size={14} /> Founding Member — First 250 coaches get 25% off for life. 30-day free trial included.
        </p>
        <p className="mt-1 text-[11px] font-semibold text-black/80">187 spots remaining</p>
      </div>

      {/* Header */}
      <div className="mt-6 text-center">
        <h1 className="font-display text-2xl font-bold">Choose your plan</h1>
        <p className="mt-1 text-xs text-muted-foreground">Start training with PXF Hockey today.</p>
      </div>

      {/* Toggle */}
      <div className="mt-5 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-surface p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={
              "rounded-full px-4 py-1.5 text-xs font-semibold transition " +
              (billing === "monthly" ? "bg-teal text-black" : "text-muted-foreground")
            }
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={
              "rounded-full px-4 py-1.5 text-xs font-semibold transition " +
              (billing === "annual" ? "bg-teal text-black" : "text-muted-foreground")
            }
          >
            Annual <span className="ml-1 text-[10px] font-bold text-volt">(save 2 months)</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="mt-6 space-y-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} billing={billing} role={role} />
        ))}
      </div>

      {/* Back */}
      <div className="mt-6 text-center">
        <Link to="/onboarding" className="text-xs text-muted-foreground underline underline-offset-2">
          Back to role selection
        </Link>
      </div>
    </div>
  );
}

function PlanCard({ plan, billing, role }: { plan: Plan; billing: Billing; role?: "coach" | "parent" }) {
  const isAnnual = billing === "annual";
  const price = isAnnual
    ? plan.foundingAnnual ?? plan.annual
    : plan.foundingMonthly ?? plan.monthly;
  const originalPrice = isAnnual ? plan.annual : plan.monthly;
  const showDiscount = plan.foundingMonthly !== undefined;

  const nextHref =
    plan.id === "parent"
      ? "/onboarding/parent"
      : role === "parent"
        ? "/parent"
        : "/coach";

  return (
    <div
      className={
        "relative rounded-2xl border p-4 " +
        (plan.popular ? "border-teal bg-teal/5" : "border-border bg-card")
      }
    >
      {plan.popular && (
        <div className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-gradient-brand px-2.5 py-0.5 text-[10px] font-bold text-black">
          <Star size={10} fill="currentColor" /> POPULAR
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg font-bold">{plan.name}</p>
        <div className="text-right">
          <span className="font-display text-2xl font-bold">${price}</span>
          <span className="text-xs text-muted-foreground">/mo</span>
          {showDiscount && (
            <p className="text-[10px] text-muted-foreground line-through">${originalPrice}/mo</p>
          )}
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-foreground/90">
            <Check size={12} className="mt-0.5 text-teal" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        to={nextHref as "/"}
        className={
          "mt-4 flex w-full items-center justify-center gap-1 rounded-full py-2.5 text-xs font-bold transition " +
          (plan.ctaStyle === "gradient"
            ? "bg-gradient-brand text-black"
            : "border border-border bg-surface text-foreground hover:border-teal/60")
        }
      >
        {plan.cta} <ArrowRight size={12} />
      </Link>
    </div>
  );
}
