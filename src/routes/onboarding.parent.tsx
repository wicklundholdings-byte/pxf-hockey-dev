import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";

export const Route = createFileRoute("/onboarding/parent")({
  component: ParentOnboarding,
});

function ParentOnboarding() {
  const [step, setStep] = useState(1);
  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background px-5 pt-6 pb-12">
      <div className="flex items-center gap-2">
        {[1, 2].map((n) => (
          <div key={n} className={"h-1 flex-1 rounded-full " + (step >= n ? "bg-teal" : "bg-surface")} />
        ))}
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step {step} of 2</p>

      {step === 1 && (
        <div className="mt-3 space-y-3">
          <h1 className="font-display text-2xl font-bold">Create your account</h1>
          {["Full name", "Email", "Password"].map((l) => (
            <div key={l}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{l}</label>
              <input className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm" placeholder={l} />
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="mt-3">
          <h1 className="font-display text-2xl font-bold">Find a camp</h1>
          <p className="mt-1 text-xs text-muted-foreground">Search by coach name or enter a join code.</p>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
            <Search size={14} className="text-muted-foreground" />
            <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Coach name or join code" />
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">Or browse all public camps in your area.</p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        {step < 2 ? (
          <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 rounded-full bg-teal px-5 py-2.5 text-xs font-bold text-black">
            Continue <ArrowRight size={12} />
          </button>
        ) : (
          <Link to="/parent" className="rounded-full bg-teal px-5 py-2.5 text-xs font-bold text-black">Go to my camps</Link>
        )}
      </div>
    </div>
  );
}