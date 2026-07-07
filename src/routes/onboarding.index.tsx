import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, User, Users, Camera, CreditCard, CalendarPlus, MapPin, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding/")({
  head: () => ({ meta: [{ title: "Welcome — PXF Hockey" }] }),
  component: OnboardingScreen,
});

type Role = "coach" | "parent" | null;

function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>(null);
  const navigate = useNavigate();
  const totalSteps = 4;

  const goToPlans = () => {
    if (!role) return;
    navigate({ to: "/onboarding/plans", search: { role } });
  };

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-32">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} className="flex items-center gap-1 text-[11px] text-muted-foreground disabled:opacity-30" disabled={step === 1}>
            <ArrowLeft size={12}/> Back
          </button>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Step {step} of {totalSteps}</span>
          <Link to="/" className="text-[11px] text-muted-foreground">Skip</Link>
        </div>

        <div className="mt-3 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={"h-1 flex-1 rounded-full " + (i < step ? "bg-teal" : "bg-surface")} />
          ))}
        </div>

        <div className="mt-6">
          {step === 1 && <Step1 role={role} setRole={setRole} onNext={() => role && setStep(2)} />}
          {step === 2 && role === "coach" && <CoachStep2 onNext={() => setStep(3)} />}
          {step === 3 && role === "coach" && <CoachStep3 onNext={() => setStep(4)} />}
          {step === 4 && role === "coach" && <CoachStep4 />}
          {step === 2 && role === "parent" && <ParentStep2 onNext={() => setStep(3)} />}
          {step === 3 && role === "parent" && <ParentStep3 onNext={() => setStep(4)} />}
          {step === 4 && role === "parent" && <ParentStep4 />}
        </div>
      </div>
    </div>
  );
}

function Step1({ role, setRole, onNext }: { role: Role; setRole: (r: Role) => void; onNext: () => void }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Welcome to PXF Hockey</h1>
      <p className="mt-1 text-xs text-muted-foreground">First, tell us who you are.</p>
      <div className="mt-5 grid grid-cols-1 gap-3">
        <RoleCard active={role === "coach"} onClick={() => setRole("coach")} icon={Users}
          title="I'm a Coach" desc="Run camps, build your roster, and collect payments." />
        <RoleCard active={role === "parent"} onClick={() => setRole("parent")} icon={User}
          title="I'm an Athlete or Parent" desc="Find camps, book your spot, track progress." />
      </div>
      <NextBtn onClick={onNext} disabled={!role} />
    </div>
  );
}

function CoachStep2({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">Set up your program</h2>
      <p className="mt-1 text-xs text-muted-foreground">Parents will see this on your public profile.</p>
      <div className="mt-4 space-y-3">
        <div className="grid place-items-center">
          <button className="grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-border bg-card text-muted-foreground">
            <Camera size={20}/>
          </button>
          <span className="mt-1 text-[10px] text-muted-foreground">Profile photo</span>
        </div>
        <Field label="Your name" placeholder="Marcus Reilly" />
        <Field label="Program name" placeholder="Reilly Hockey Development" />
        <Field label="Location" placeholder="Toronto, ON" icon={MapPin} />
      </div>
      <NextBtn onClick={onNext} />
    </div>
  );
}

function CoachStep3({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">Get paid</h2>
      <p className="mt-1 text-xs text-muted-foreground">Connect your bank account to receive camp payments.</p>
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal/15">
          <CreditCard size={20} className="text-teal" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">Stripe Connect</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Secure payouts. Takes about 2 minutes.</p>
        <button className="mt-4 w-full rounded-full bg-teal py-2.5 text-xs font-bold text-black">Connect with Stripe</button>
        <button className="mt-2 w-full text-[11px] text-muted-foreground">Do this later</button>
      </div>
      <NextBtn onClick={onNext} label="Continue" />
    </div>
  );
}

function CoachStep4() {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">Create your first camp</h2>
      <p className="mt-1 text-xs text-muted-foreground">You can do this now or anytime from the dashboard.</p>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <Link to="/coach/camps/new" className="flex items-center gap-3 rounded-2xl border border-teal bg-teal/10 p-4">
          <CalendarPlus size={20} className="text-teal" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Create my first camp</p>
            <p className="text-[10px] text-muted-foreground">Takes about 5 minutes</p>
          </div>
          <ArrowRight size={14} className="text-teal" />
        </Link>
        <Link to="/coach" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Check size={20} className="text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Skip — take me to the dashboard</p>
            <p className="text-[10px] text-muted-foreground">I'll set up camps later</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function ParentStep2({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">Tell us about your family</h2>
      <p className="mt-1 text-xs text-muted-foreground">We use this to recommend the right camps.</p>
      <div className="mt-4 space-y-3">
        <Field label="Your name" placeholder="Sarah Walsh" />
        <Field label="Athlete's name" placeholder="Jordan Walsh" />
        <Field label="Athlete's birthday" placeholder="MM / DD / YYYY" />
      </div>
      <NextBtn onClick={onNext} />
    </div>
  );
}

function ParentStep3({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">Browse camps near you</h2>
      <p className="mt-1 text-xs text-muted-foreground">Showing camps in Toronto, ON.</p>
      <ul className="mt-4 space-y-2">
        {[
          { name: "Elite Skills Camp", date: "Oct 14–18", price: 420 },
          { name: "Power Skating Intensive", date: "Nov 4–6", price: 280 },
          { name: "Winter Skills Clinic", date: "Jan 5–9", price: 380 },
        ].map((c) => (
          <li key={c.name} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{c.name}</p>
              <p className="text-[10px] text-muted-foreground">{c.date}</p>
            </div>
            <p className="text-sm font-bold text-foreground">${c.price}</p>
          </li>
        ))}
      </ul>
      <NextBtn onClick={onNext} label="Continue" />
    </div>
  );
}

function ParentStep4() {
  return (
    <div className="text-center">
      <div className="mx-auto mt-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15">
        <Check size={28} className="text-emerald-400" />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold text-foreground">You're all set</h2>
      <p className="mt-1 text-xs text-muted-foreground">Start exploring camps and training.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-teal px-6 py-2.5 text-xs font-bold text-black">Go to home</Link>
    </div>
  );
}

function RoleCard({ active, onClick, icon: Icon, title, desc }:
  { active: boolean; onClick: () => void; icon: typeof User; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={"flex items-start gap-3 rounded-2xl border p-4 text-left " +
      (active ? "border-teal bg-teal/10" : "border-border bg-card")}>
      <div className={"grid h-10 w-10 place-items-center rounded-full " + (active ? "bg-teal/20" : "bg-surface")}>
        <Icon size={18} className={active ? "text-teal" : "text-muted-foreground"} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
      </div>
      {active && <Check size={16} className="text-teal" />}
    </button>
  );
}

function Field({ label, placeholder, icon: Icon }: { label: string; placeholder: string; icon?: typeof MapPin }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative mt-1">
        {Icon && <Icon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>}
        <input placeholder={placeholder}
          className={"w-full rounded-xl border border-border bg-card py-2.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none " + (Icon ? "pl-8" : "pl-3")} />
      </div>
    </div>
  );
}

function NextBtn({ onClick, disabled, label = "Next" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="mt-6 flex w-full items-center justify-center gap-1 rounded-full bg-teal py-3 text-xs font-bold text-black disabled:opacity-40">
      {label} <ArrowRight size={13}/>
    </button>
  );
}