import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Download, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/parent/invoices")({
  head: () => ({ meta: [{ title: "Invoices — PXF Hockey" }] }),
  component: InvoicesPage,
});

type Invoice = {
  id: string;
  athlete: string;
  name: string;
  amount: string;
  date: string;
  status: "paid" | "outstanding";
  due?: string;
};

const INVOICES: Invoice[] = [
  { id: "INV-1042", athlete: "Braxton Wicklund", name: "Summer Elite Camp — balance", amount: "$450.00", date: "Jul 1", status: "outstanding", due: "Jul 15" },
  { id: "INV-1031", athlete: "Braxton Wicklund", name: "Summer Elite Camp — deposit", amount: "$225.00", date: "Jun 28", status: "paid" },
  { id: "INV-1024", athlete: "Everest Wicklund", name: "Skating Power Clinic", amount: "$175.00", date: "Jun 15", status: "paid" },
  { id: "INV-1017", athlete: "Braxton Wicklund", name: "Spring Selects — team fee (Q2)", amount: "$320.00", date: "May 30", status: "paid" },
  { id: "INV-1008", athlete: "Everest Wicklund", name: "Learn to Play — Spring session", amount: "$140.00", date: "Apr 12", status: "paid" },
  { id: "INV-1001", athlete: "Braxton Wicklund", name: "Skating Assessment", amount: "$60.00", date: "Mar 22", status: "paid" },
];

function InvoicesPage() {
  const outstanding = INVOICES.filter((i) => i.status === "outstanding");
  const paid = INVOICES.filter((i) => i.status === "paid");

  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-24 text-foreground">
      <Link to="/parent" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-teal">
        <ChevronLeft size={14} /> Dashboard
      </Link>
      <h1 className="font-display text-2xl font-bold">Invoices</h1>
      <p className="text-sm text-muted-foreground">All invoices across your athletes.</p>

      {outstanding.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Outstanding</h2>
          <div className="mt-2 space-y-2">
            {outstanding.map((i) => (
              <div key={i.id} className="rounded-2xl border border-teal/40 bg-teal/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal">{i.athlete}</p>
                    <p className="mt-0.5 truncate text-sm font-semibold">{i.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {i.id} · Issued {i.date}{i.due ? ` · Due ${i.due}` : ""}
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-display text-lg font-bold text-teal">{i.amount}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-volt">
                    <Clock size={10} /> Outstanding
                  </span>
                  <Link to="/parent" className="ml-auto rounded-full bg-gradient-to-r from-teal to-teal/70 px-4 py-1.5 text-[11px] font-bold text-background">
                    Pay Now →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Paid</h2>
        <div className="mt-2 space-y-2">
          {paid.map((i) => (
            <div key={i.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal">{i.athlete}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{i.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{i.id} · Paid {i.date}</p>
                </div>
                <span className="whitespace-nowrap font-display text-lg font-bold">{i.amount}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal">
                  <CheckCircle2 size={10} /> Paid
                </span>
                <button className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-foreground">
                  <Download size={12} /> Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}