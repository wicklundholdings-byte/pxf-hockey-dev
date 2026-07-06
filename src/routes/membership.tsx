import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowLeft, Crown, Gift } from "lucide-react";

export const Route = createFileRoute("/membership")({
  head: () => ({ meta: [{ title: "PXF Core Membership — PXF Hockey" }] }),
  component: Membership,
});

const CORE_FEATURES = [
  "200 Slip Circuits",
  "25–30 Dryland Skills",
  "Full drill library with video + diagrams",
  "Session builder & saved sessions",
  "Favourites",
  "Athlete profile",
];

function Membership() {
  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <Link to="/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="mt-5 text-center">
        <Crown size={26} className="mx-auto text-teal" />
        <h1 className="mt-2 font-display text-2xl font-bold">PXF Core</h1>
        <p className="mt-1 text-xs text-muted-foreground">The PXF Training System — Slips + App.</p>
      </div>

      <div className="mt-5 rounded-2xl border border-teal/40 bg-card p-5 shadow-[0_0_0_1px] shadow-teal/30">
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Membership</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold">$19.99</span>
          <span className="text-xs text-muted-foreground">/month</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Cancel anytime.</p>

        <ul className="mt-4 space-y-2">
          {CORE_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs">
              <Check size={14} className="mt-0.5 shrink-0 text-teal" />
              <span className="text-foreground">{f}</span>
            </li>
          ))}
        </ul>

        <button className="mt-5 w-full rounded-xl bg-teal py-3 text-xs font-bold tracking-wider text-background">
          START PXF CORE
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-volt/40 bg-gradient-to-r from-volt/10 to-teal/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-volt">
          <Gift size={16} /> Every slip purchase includes 30 days free app access
        </p>
        <p className="mt-1 text-xs text-foreground/90">
          Buy any PXF Slips bundle and your PXF Core membership is free for 30 days — automatically.
        </p>
      </div>
    </div>
  );
}
