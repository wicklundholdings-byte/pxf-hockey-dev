import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, CreditCard, CheckCircle2, Undo2, Wallet, Tag, CalendarClock, Crown, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/payments-preview")({
  head: () => ({ meta: [{ title: "Payments — Design Preview" }] }),
  component: Hub,
});

const screens = [
  { to: "/payments/connect", icon: Banknote, title: "Stripe Connect Onboarding", sub: "Platinum coach first-login flow" },
  { to: "/payments/checkout", icon: CreditCard, title: "Camp Checkout", sub: "Parent registration & payment" },
  { to: "/payments/confirmation", icon: CheckCircle2, title: "Payment Confirmation", sub: "Post-purchase success" },
  { to: "/payments/refunds", icon: Undo2, title: "Refund Management", sub: "Issue full or partial refunds" },
  { to: "/payments/payouts", icon: Wallet, title: "Coach Financials & Payouts", sub: "Bank, balance, history" },
  { to: "/payments/coupon", icon: Tag, title: "Coupon Creator", sub: "Discount codes" },
  { to: "/payments/plan", icon: CalendarClock, title: "Payment Plan Setup", sub: "Installments inside camp builder" },
  { to: "/payments/subscribe", icon: Crown, title: "Web Subscription", sub: "Coach platform plans" },
] as const;

function Hub() {
  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-20">
      <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Design Preview</p>
      <h1 className="font-display text-2xl font-bold text-foreground">Payments mockups</h1>
      <p className="mt-1 text-xs text-muted-foreground">8 visual screens. No live processing — Stripe wiring happens later.</p>

      <ul className="mt-5 space-y-2">
        {screens.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 active:scale-[0.99]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal">
                <s.icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">{s.sub}</p>
              </div>
              <ArrowRight size={14} className="text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}