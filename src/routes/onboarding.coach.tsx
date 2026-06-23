import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ArrowRight, Flame } from "lucide-react";
import { COACH_TIERS, FOUNDING_MEMBER_END } from "@/lib/tiers";

export const Route = createFileRoute("/onboarding/coach")({
  component: CoachOnboarding,
});

function CoachOnboarding() {
  const [step, setStep] = useState(1);
  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background px-5 pt-6 pb-12">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={"h-1 flex-1 rounded-full " + (step >= n ? "bg-teal" : "bg-surface")} />
        ))}
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step {step} of 3</p>

      {step === 1 && (
        <div className="mt-3">
          <h1 className="font-display text-2xl font-bold">Choose your plan</h1>
          <p className="mt-1 text-xs text-muted-foreground">14-day free trial. No card up front.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-teal/40 bg-gradient-to-r from-teal/15 to-volt/10 px-3 py-2 text-[11px] font-semibold text-teal">
            <Flame size={13} /> Founding Member — Free until {FOUNDING_MEMBER_END}
          </div>
          <div className="mt-4 space-y-2">
            {COACH_TIERS.map((p) => (
              <button key={p.id} className={"flex w-full items-center justify-between rounded-2xl border p-4 text-left " + (p.popular ? "border-teal bg-teal/5" : "border-border bg-card")}>
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.trialDays}-day trial · ${p.price}/mo after</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{p.tagline}</p>
                </div>
                <Check size={16} className={p.popular ? "text-teal" : "text-muted-foreground"} />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-3 space-y-3">
          <h1 className="font-display text-2xl font-bold">Set up your profile</h1>
          {["Full name", "Sport (Hockey)", "Organization or program name"].map((l) => (
            <div key={l}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{l}</label>
              <input className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm" placeholder={l} />
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="mt-3">
          <h1 className="font-display text-2xl font-bold">You're in</h1>
          <p className="mt-1 text-xs text-muted-foreground">Pick a starting point.</p>
          <div className="mt-4 space-y-2">
            <Link to="/coach/camps/new" className="block rounded-2xl border border-teal bg-teal/5 p-4">
              <p className="font-semibold">Create your first event</p>
              <p className="text-[11px] text-muted-foreground">Set up a camp and open registrations.</p>
            </Link>
            <Link to="/coach/playbook" className="block rounded-2xl border border-border bg-card p-4">
              <p className="font-semibold">Explore the Playbook</p>
              <p className="text-[11px] text-muted-foreground">Build drills and sessions first.</p>
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 rounded-full bg-teal px-5 py-2.5 text-xs font-bold text-black">
            Continue <ArrowRight size={12} />
          </button>
        ) : (
          <Link to="/coach" className="rounded-full bg-teal px-5 py-2.5 text-xs font-bold text-black">Go to dashboard</Link>
        )}
      </div>
    </div>
  );
}