import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function TrialBanner({ daysLeft = 12, plan = "Elite" }: { daysLeft?: number; plan?: string }) {
  return (
    <Link
      to="/coach/plans"
      className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-teal" />
        <span className="text-[11px] font-semibold text-foreground">
          {daysLeft} days left in your {plan} trial
        </span>
      </div>
      <span className="rounded-full bg-teal px-2.5 py-1 text-[10px] font-bold text-black">Subscribe</span>
    </Link>
  );
}

export function PaywallOverlay() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-md">
      <div className="m-5 max-w-md rounded-3xl border border-border bg-card p-6 text-center">
        <Sparkles size={28} className="mx-auto text-teal" />
        <h2 className="mt-3 font-display text-xl font-bold">Your trial has ended</h2>
        <p className="mt-1 text-xs text-muted-foreground">Subscribe to keep access to your dashboard, events, and contacts. Your data is safe.</p>
        <Link to="/coach/plans" className="mt-4 inline-block rounded-full bg-teal px-5 py-2 text-xs font-bold text-black">
          View Plans
        </Link>
      </div>
    </div>
  );
}