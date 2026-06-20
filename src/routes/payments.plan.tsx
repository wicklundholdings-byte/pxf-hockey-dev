import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CalendarClock, Info } from "lucide-react";

export const Route = createFileRoute("/payments/plan")({
  head: () => ({ meta: [{ title: "Payment plan — Camp setup" }] }),
  component: PlanScreen,
});

function PlanScreen() {
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState<2 | 3>(2);
  const [price, setPrice] = useState(400);

  const installment = Math.round((price / count) * 100) / 100;
  const schedule = Array.from({ length: count }).map((_, i) => ({
    label: i === 0 ? "Today" : `In ${30 * i} days`,
    amount: installment,
  }));

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24">
      <Link to="/payments-preview" className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back</Link>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Camp setup · Step 4 of 6</p>
      <h1 className="font-display text-2xl font-bold text-foreground">Payment plans</h1>
      <p className="text-xs text-muted-foreground">Let parents split registration across multiple charges.</p>

      {/* Toggle */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal">
            <CalendarClock size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Enable payment plans</p>
            <p className="text-[10px] text-muted-foreground">Auto-charged via Stripe subscriptions.</p>
          </div>
        </div>
        <button onClick={() => setEnabled((v) => !v)} className={"relative h-6 w-11 rounded-full transition " + (enabled ? "bg-teal" : "bg-border")}>
          <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-background transition " + (enabled ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Installment count */}
          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Number of installments</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => setCount(2)} className={"rounded-xl border p-3 text-left " + (count === 2 ? "border-teal bg-teal/10" : "border-border bg-surface")}>
                <p className={"font-display text-xl font-bold " + (count === 2 ? "text-teal" : "text-foreground")}>2</p>
                <p className="text-[10px] text-muted-foreground">Today + 30 days</p>
              </button>
              <button onClick={() => setCount(3)} className={"rounded-xl border p-3 text-left " + (count === 3 ? "border-teal bg-teal/10" : "border-border bg-surface")}>
                <p className={"font-display text-xl font-bold " + (count === 3 ? "text-teal" : "text-foreground")}>3</p>
                <p className="text-[10px] text-muted-foreground">0 / 30 / 60 days</p>
              </button>
            </div>
          </div>

          {/* Preview camp price */}
          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview — camp price</p>
            <div className="mt-2 flex items-center rounded-xl border border-border bg-surface px-3">
              <span className="text-sm text-muted-foreground">$</span>
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground focus:outline-none" />
            </div>
          </div>

          {/* Schedule */}
          <div className="mt-3 rounded-2xl border border-teal/30 bg-gradient-to-br from-teal/5 to-transparent p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Installment schedule</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ${price} camp = {count} × <span className="font-bold text-teal">${installment.toFixed(2)}</span>
            </p>
            <ol className="mt-3 space-y-2">
              {schedule.map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className={"grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold " + (i === 0 ? "bg-teal text-black" : "border border-border bg-surface text-muted-foreground")}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">${s.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                  {i === 0 && <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[9px] font-bold uppercase text-teal">Due now</span>}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-[10px] text-muted-foreground">
            <Info size={12} className="mt-0.5 shrink-0 text-teal" />
            <p>Stripe automatically retries failed charges. You'll be notified if a final retry fails. Parents see the full schedule at checkout.</p>
          </div>
        </>
      )}

      <button className="mt-6 w-full rounded-full bg-teal py-3.5 text-sm font-bold text-black">Save & continue</button>
    </div>
  );
}