import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Banknote, TrendingUp, Calendar, CheckCircle2, Clock, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/payments/payouts")({
  head: () => ({ meta: [{ title: "Payouts — Coach Dashboard" }] }),
  component: PayoutsScreen,
});

const payouts = [
  { id: "po_5", date: "Jul 5", amount: 184220, status: "paid" as const },
  { id: "po_4", date: "Jun 28", amount: 96780, status: "paid" as const },
  { id: "po_3", date: "Jun 21", amount: 142300, status: "paid" as const },
  { id: "po_2", date: "Jun 14", amount: 89150, status: "paid" as const },
  { id: "po_1", date: "Jun 7", amount: 47460, status: "paid" as const },
];

const camps = [
  { name: "Elite Skills Camp", regs: 22, gross: 1044120 },
  { name: "Goalie Bootcamp", regs: 8, gross: 264000 },
  { name: "Spring Power Skating", regs: 14, gross: 588000 },
  { name: "U13 Game IQ Clinic", regs: 6, gross: 144000 },
];

function PayoutsScreen() {
  const monthTotal = 281000;
  const allTime = 2040120;
  const nextAmount = 67320;

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24">
      <Link to="/payments-preview" className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back</Link>

      <h1 className="mt-3 font-display text-2xl font-bold text-foreground">Financials</h1>
      <p className="text-xs text-muted-foreground">Stripe-managed payouts to your bank.</p>

      {/* Bank status */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-400">
          <Banknote size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Connected</p>
          </div>
          <p className="truncate text-sm font-semibold text-foreground">RBC Royal Bank · •••• 4242</p>
        </div>
        <ChevronRight size={14} className="text-muted-foreground" />
      </div>

      {/* Next payout */}
      <div className="mt-3 rounded-2xl border border-teal/30 bg-gradient-to-br from-teal/10 to-teal/5 p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal">
          <Calendar size={11} /> Next payout · Jul 12
        </div>
        <p className="mt-1 font-display text-3xl font-bold text-teal">${(nextAmount / 100).toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">From 3 paid registrations · auto-deposited within 2 business days.</p>
      </div>

      {/* Totals */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat icon={TrendingUp} label="This month" value={`$${(monthTotal / 100).toLocaleString()}`} />
        <Stat icon={Banknote} label="All time" value={`$${(allTime / 100).toLocaleString()}`} />
      </div>

      {/* Per camp */}
      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue by camp</p>
        <ul className="mt-3 space-y-3">
          {camps.map((c) => {
            const max = Math.max(...camps.map((x) => x.gross));
            return (
              <li key={c.name}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="truncate text-foreground">{c.name}</span>
                  <span className="font-bold text-emerald-400">${(c.gross / 100).toLocaleString()}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full bg-gradient-to-r from-teal to-emerald-400" style={{ width: `${(c.gross / max) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-[9px] text-muted-foreground">{c.regs} registrations</p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Payout history */}
      <div className="mt-3">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payout history</p>
        <ul className="mt-2 space-y-2">
          {payouts.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface text-muted-foreground">
                  {p.status === "paid" ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Clock size={14} className="text-amber-400" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">${(p.amount / 100).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{p.date} · •••• 4242</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">Paid</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Icon size={10} className="text-teal" /> {label}
      </div>
      <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}