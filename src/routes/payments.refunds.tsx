import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Undo2, X, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/payments/refunds")({
  head: () => ({ meta: [{ title: "Refunds — Coach Dashboard" }] }),
  component: RefundsScreen,
});

type Status = "paid" | "refunded" | "partial";
type Row = { id: string; name: string; email: string; amount: number; date: string; status: Status; refunded?: number };

const seed: Row[] = [
  { id: "PXF-8K2-4M9R", name: "Sarah Walsh", email: "sarah.w@email.com", amount: 47460, date: "Jul 2", status: "paid" },
  { id: "PXF-7H1-2L8P", name: "Mike Chen", email: "mike@email.com", amount: 47460, date: "Jul 1", status: "partial", refunded: 20000 },
  { id: "PXF-6F0-9K3D", name: "Aisha Patel", email: "aisha.p@email.com", amount: 47460, date: "Jun 29", status: "refunded" },
  { id: "PXF-5E9-3J1C", name: "Tom Bauer", email: "tomb@email.com", amount: 47460, date: "Jun 28", status: "paid" },
  { id: "PXF-4D8-7H2B", name: "Lina Park", email: "lina@email.com", amount: 47460, date: "Jun 27", status: "paid" },
];

function RefundsScreen() {
  const [rows, setRows] = useState<Row[]>(seed);
  const [active, setActive] = useState<Row | null>(null);
  const [type, setType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("requested");

  function submit() {
    if (!active) return;
    const amt = type === "full" ? active.amount : Math.round(Number(amount) * 100);
    setRows((rs) => rs.map((r) => r.id === active.id ? { ...r, status: type === "full" ? "refunded" : "partial", refunded: amt } : r));
    setActive(null); setAmount(""); setType("full");
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24">
      <Link to="/payments-preview" className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back</Link>

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Elite Skills Camp · Aug 12–16</p>
        <h1 className="font-display text-2xl font-bold text-foreground">Refunds</h1>
        <p className="text-xs text-muted-foreground">{rows.length} registrations · Refunds via Stripe to original payment method.</p>
      </div>

      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{r.email} · {r.date}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{r.id}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-foreground">${(r.amount / 100).toFixed(2)}</p>
                <StatusBadge s={r.status} refunded={r.refunded} />
              </div>
            </div>
            {r.status === "paid" && (
              <button onClick={() => setActive(r)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-1.5 text-[11px] font-bold text-foreground hover:border-red-400/40 hover:text-red-400">
                <Undo2 size={11} /> Refund
              </button>
            )}
            {r.status === "partial" && (
              <button onClick={() => setActive(r)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface py-1.5 text-[11px] font-bold text-foreground">
                Refund remaining ${((r.amount - (r.refunded ?? 0)) / 100).toFixed(2)}
              </button>
            )}
          </li>
        ))}
      </ul>

      {active && (
        <div onClick={() => setActive(null)} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-background p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Refund {active.name}</h2>
                <p className="text-[10px] text-muted-foreground">Paid ${(active.amount / 100).toFixed(2)} on {active.date}</p>
              </div>
              <button onClick={() => setActive(null)} className="rounded-full bg-surface p-1.5 text-muted-foreground"><X size={14} /></button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setType("full")} className={"rounded-xl border py-2.5 text-xs font-bold " + (type === "full" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>Full refund</button>
              <button onClick={() => setType("partial")} className={"rounded-xl border py-2.5 text-xs font-bold " + (type === "partial" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>Partial</button>
            </div>

            {type === "partial" && (
              <div className="mt-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount to refund</label>
                <div className="flex items-center rounded-xl border border-border bg-surface px-3">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="0.00" className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground focus:outline-none" />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Max ${((active.amount - (active.refunded ?? 0)) / 100).toFixed(2)}</p>
              </div>
            )}

            <div className="mt-3">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-teal focus:outline-none">
                <option value="requested">Requested by customer</option>
                <option value="duplicate">Duplicate registration</option>
                <option value="cancelled">Camp cancelled</option>
                <option value="injury">Player injury</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-[10px] text-amber-200">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <p>Refunds return to the parent's original payment method via Stripe and typically take 5–10 business days to appear.</p>
            </div>

            <button onClick={submit} className="mt-4 w-full rounded-full bg-red-500 py-3 text-sm font-bold text-white">
              Confirm refund {type === "full" ? `$${(active.amount / 100).toFixed(2)}` : amount ? `$${amount}` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ s, refunded }: { s: Status; refunded?: number }) {
  if (s === "paid") return <span className="mt-1 inline-block rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">Paid</span>;
  if (s === "refunded") return <span className="mt-1 inline-block rounded-full bg-red-400/15 px-2 py-0.5 text-[9px] font-bold uppercase text-red-400">Refunded</span>;
  return <span className="mt-1 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400">Partial · ${((refunded ?? 0) / 100).toFixed(0)}</span>;
}