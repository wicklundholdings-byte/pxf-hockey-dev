import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Banknote, ShieldCheck, Clock, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/payments/connect")({
  head: () => ({ meta: [{ title: "Connect with Stripe — PXF Hockey" }] }),
  component: ConnectScreen,
});

function ConnectScreen() {
  const [connected, setConnected] = useState(false);

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24">
      <Link to="/payments-preview" className="flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="mt-6 flex flex-col items-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal to-emerald-400 shadow-lg shadow-teal/30">
          <Banknote size={28} className="text-black" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Get paid for your camps</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Connect a bank account through Stripe to receive registration payments directly. PXF Hockey never holds your funds.
        </p>
      </div>

      <div className={"mt-6 rounded-2xl border p-4 " + (connected ? "border-emerald-400/40 bg-emerald-400/5" : "border-amber-400/40 bg-amber-400/5")}>
        <div className="flex items-center gap-2">
          <span className={"h-2 w-2 rounded-full " + (connected ? "bg-emerald-400" : "bg-amber-400")} />
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            {connected ? "Connected" : "Not connected"}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {connected ? "Account ending in •••• 4242 · Ready to accept payments." : "You won't be able to publish paid camps until you connect."}
        </p>
      </div>

      <ul className="mt-5 space-y-3">
        <Row icon={Clock} title="Takes about 5 minutes" sub="Stripe-hosted onboarding, then back here." />
        <Row icon={FileText} title="What you'll need" sub="Government ID, bank account info, business details (if applicable)." />
        <Row icon={ShieldCheck} title="Bank-grade security" sub="Stripe handles all financial data. PXF Hockey never sees your account number." />
      </ul>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Standard Stripe fees</p>
        <p className="mt-1 text-sm text-foreground">2.9% + 30¢ per successful card charge</p>
        <p className="text-[10px] text-muted-foreground">PXF Hockey takes 0% platform fee.</p>
      </div>

      <button
        onClick={() => setConnected((c) => !c)}
        className={
          "mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold " +
          (connected ? "bg-surface text-muted-foreground border border-border" : "bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/30")
        }
      >
        {connected ? (
          <>
            <CheckCircle2 size={16} /> Connected — Manage in Stripe
          </>
        ) : (
          <>
            <Banknote size={16} /> Connect with Stripe
          </>
        )}
      </button>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        By continuing you agree to Stripe's <span className="text-teal">Connected Account Agreement</span>.
      </p>
    </div>
  );
}

function Row({ icon: Icon, title, sub }: { icon: typeof Banknote; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal/15 text-teal">
        <Icon size={14} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </li>
  );
}