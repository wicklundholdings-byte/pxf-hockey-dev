import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, ArrowLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership — PXF Hockey" },
      { name: "description", content: "Unlock the full PXF development system: pathways, drills, sessions, GameIQ." },
      { property: "og:title", content: "Membership — PXF Hockey" },
      { property: "og:description", content: "Unlock the full PXF development system." },
    ],
  }),
  component: Membership,
});

const plans = [
  { id: "trial", title: "30 Day Trial", price: "Free", suffix: "for 30 days", note: "Then $19/mo. Cancel anytime.", tint: "volt" as const },
  { id: "monthly", title: "Monthly", price: "$19", suffix: "/ month", note: "Full access. Cancel anytime.", tint: "teal" as const, recommended: true },
  { id: "annual", title: "Annual", price: "$179", suffix: "/ year", note: "Save 21% — best value.", tint: "volt" as const },
];

const includes = [
  "Full Drill Library",
  "Video Demonstrations",
  "Session Builder",
  "All Progression Pathways",
  "Training Pathways",
  "New Content Every Week",
  "GameIQ + POD Content",
];

function Membership() {
  const [picked, setPicked] = useState("monthly");
  return (
    <div className="px-5 pt-4">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="mt-3 text-center">
        <Crown size={28} className="mx-auto text-volt" />
        <p className="mt-2 text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PXF PRO</p>
        <h1 className="mt-1 text-3xl font-bold text-gradient-brand">Train the Game</h1>
        <p className="mt-2 text-sm text-muted-foreground">Unlock every pathway, drill, and GameIQ rep — built for elite player development.</p>
      </div>

      <div className="mt-7 space-y-3">
        {plans.map((p) => {
          const active = picked === p.id;
          return (
            <button key={p.id} onClick={() => setPicked(p.id)}
              className={"relative w-full rounded-3xl border bg-surface p-5 text-left transition-all " + (active ? "border-teal shadow-glow-teal" : "border-border/60")}
            >
              {p.recommended && (
                <span className="absolute -top-2 left-5 rounded-full bg-gradient-brand px-2 py-0.5 text-[9px] font-bold tracking-widest text-primary-foreground">RECOMMENDED</span>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <p className={"text-[10px] font-bold tracking-[0.3em] " + (p.tint === "teal" ? "text-teal" : "text-volt")}>{p.title.toUpperCase()}</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold text-foreground">{p.price}</span>
                    <span className="text-xs text-muted-foreground">{p.suffix}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{p.note}</p>
                </div>
                <span className={"grid h-6 w-6 place-items-center rounded-full border " + (active ? "border-teal bg-teal text-primary-foreground" : "border-border")}>
                  {active && <Check size={12} />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-7 rounded-3xl border border-border/60 bg-surface p-5">
        <p className="text-[10px] font-bold tracking-[0.3em] text-volt">INCLUDED</p>
        <h2 className="mt-1 text-base font-bold text-foreground">Everything in PXF Pro</h2>
        <ul className="mt-4 space-y-2">
          {includes.map((i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-foreground">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-brand text-primary-foreground">
                <Check size={11} />
              </span>
              {i}
            </li>
          ))}
        </ul>
      </div>

      <button className="mt-6 mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-4 text-sm font-bold tracking-[0.2em] text-primary-foreground shadow-glow-teal">
        START {picked === "trial" ? "FREE TRIAL" : picked === "annual" ? "ANNUAL PLAN" : "MONTHLY PLAN"}
      </button>
      <p className="mb-8 text-center text-[10px] tracking-widest text-muted-foreground">CANCEL ANYTIME · NO COMMITMENT</p>
    </div>
  );
}