import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Lock, ShieldCheck, Tag, CheckCircle2, CalendarDays, MapPin } from "lucide-react";

export const Route = createFileRoute("/payments/checkout")({
  head: () => ({ meta: [{ title: "Checkout — PXF Hockey" }] }),
  component: CheckoutScreen,
});

type Plan = "full" | "two" | "three";

function CheckoutScreen() {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; off: number } | null>(null);
  const [plan, setPlan] = useState<Plan>("full");

  const base = 42000; // $420
  const discount = applied?.off ?? 0;
  const subtotal = base - discount;
  const tax = Math.round(subtotal * 0.13); // mock 13% HST
  const total = subtotal + tax;
  const dueToday = plan === "full" ? total : plan === "two" ? Math.round(total / 2) : Math.round(total / 3);

  function apply() {
    if (code.trim().toUpperCase() === "SUMMER25") setApplied({ code: "SUMMER25", off: 10500 });
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-32">
      <Link to="/payments-preview" className="flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      <h1 className="mt-3 font-display text-2xl font-bold text-foreground">Checkout</h1>
      <p className="text-xs text-muted-foreground">Review and pay to secure your spot.</p>

      {/* Order summary */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order summary</p>
        <h2 className="mt-1 font-display text-lg font-bold text-foreground">Elite Skills Camp · Aug 12–16</h2>
        <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          <p className="flex items-center gap-1.5"><CalendarDays size={11} /> Mon–Fri · 9:00 AM – 12:00 PM</p>
          <p className="flex items-center gap-1.5"><MapPin size={11} /> Scotiabank Arena · Toronto, ON</p>
          <p className="pt-1">Coach <span className="text-foreground">Marcus Reilly</span> · Athlete <span className="text-foreground">Jordan Walsh</span></p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Camp price</span>
          <span className="font-bold text-foreground">${(base / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Coupon */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Promo code</p>
        {applied ? (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-emerald-400" />
              <span className="font-mono text-sm font-bold text-emerald-400">{applied.code}</span>
              <span className="text-[10px] text-muted-foreground">−${(applied.off / 100).toFixed(2)}</span>
            </div>
            <button onClick={() => { setApplied(null); setCode(""); }} className="text-[10px] font-bold text-muted-foreground">Remove</button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER25"
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-teal focus:outline-none"
            />
            <button onClick={apply} className="rounded-xl bg-surface border border-border px-4 text-xs font-bold text-foreground">Apply</button>
          </div>
        )}
      </div>

      {/* Payment plan */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment plan</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <PlanPill active={plan === "full"} onClick={() => setPlan("full")} title="Pay in full" sub="Today" />
          <PlanPill active={plan === "two"} onClick={() => setPlan("two")} title="2 payments" sub="Today + 30d" />
          <PlanPill active={plan === "three"} onClick={() => setPlan("three")} title="3 payments" sub="0 / 30 / 60d" />
        </div>
        {plan !== "full" && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {plan === "two" ? "2" : "3"} installments of <span className="font-bold text-teal">${(dueToday / 100).toFixed(2)}</span>. Auto-charged on your card.
          </p>
        )}
      </div>

      {/* Card entry */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment details</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Lock size={10} /> Secure</div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-border bg-surface px-3 py-3">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Card number</p>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="font-mono text-sm tracking-widest text-muted-foreground/60">1234 1234 1234 1234</span>
              <div className="flex gap-1">
                <span className="h-4 w-6 rounded bg-gradient-to-br from-blue-500 to-blue-700" />
                <span className="h-4 w-6 rounded bg-gradient-to-br from-red-500 to-orange-500" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-surface px-3 py-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Expiry</p>
              <p className="font-mono text-sm text-muted-foreground/60">MM / YY</p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-3 py-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">CVC</p>
              <p className="font-mono text-sm text-muted-foreground/60">•••</p>
            </div>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <Line label="Subtotal" value={`$${(base / 100).toFixed(2)}`} />
        {applied && <Line label={`Promo ${applied.code}`} value={`−$${(applied.off / 100).toFixed(2)}`} accent="emerald" />}
        <Line label="Tax (HST 13%)" value={`$${(tax / 100).toFixed(2)}`} />
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs font-bold text-foreground">Total</span>
          <span className="font-display text-xl font-bold text-foreground">${(total / 100).toFixed(2)}</span>
        </div>
        {plan !== "full" && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Due today</span>
            <span className="text-sm font-bold text-teal">${(dueToday / 100).toFixed(2)}</span>
          </div>
        )}
      </div>

      <Link to="/payments/confirmation" className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-teal py-3.5 text-sm font-bold text-black shadow-lg shadow-teal/30">
        <Lock size={14} /> Pay ${(dueToday / 100).toFixed(2)}
      </Link>

      <div className="mt-3 space-y-1 text-center text-[10px] text-muted-foreground">
        <p className="flex items-center justify-center gap-1"><ShieldCheck size={10} /> Secured by Stripe · PCI-DSS compliant</p>
        <p>Full refund available up to 7 days before camp starts. <span className="text-teal">Refund policy</span></p>
      </div>
    </div>
  );
}

function PlanPill({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={"rounded-xl border p-2 text-left " + (active ? "border-teal bg-teal/10" : "border-border bg-surface")}>
      <p className={"text-[11px] font-bold " + (active ? "text-teal" : "text-foreground")}>{title}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
      {active && <CheckCircle2 size={11} className="mt-1 text-teal" />}
    </button>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: "emerald" }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={"text-xs font-semibold " + (accent === "emerald" ? "text-emerald-400" : "text-foreground")}>{value}</span>
    </div>
  );
}