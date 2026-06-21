import { createFileRoute } from "@tanstack/react-router";
import { Check, Users, TrendingUp, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/memberships")({
  head: () => ({ meta: [{ title: "Memberships — Coach" }] }),
  component: MembershipsScreen,
});

const plans = [
  { name: "Skills Unlimited", price: 99, members: 18, includes: ["Unlimited group sessions", "Weekly skill drills", "Monthly evaluation"] },
  { name: "Elite All-Access", price: 199, members: 7, includes: ["Everything in Skills Unlimited", "Two 1-on-1s per month", "Personal drill library"] },
];

const recent = [
  { name: "Sarah Walsh (Jordan)", plan: "Elite All-Access", since: "Apr 2026" },
  { name: "Linda Chen (Mason)", plan: "Skills Unlimited", since: "May 2026" },
  { name: "Mike Thompson (Ava)", plan: "Skills Unlimited", since: "Jun 2026" },
];

function MembershipsScreen() {
  const mrr = plans.reduce((s, p) => s + p.price * p.members, 0);
  const totalMembers = plans.reduce((s, p) => s + p.members, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Memberships</h2>
        <p className="text-[11px] text-muted-foreground">Recurring revenue from your athletes. Payouts via Stripe.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-volt/30 bg-volt/5 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-volt">Monthly recurring</p>
          <p className="font-display text-xl font-bold text-foreground">${mrr.toLocaleString()}</p>
          <p className="flex items-center gap-1 text-[10px] text-emerald-400"><TrendingUp size={10} /> +12% MoM</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Active members</p>
          <p className="font-display text-xl font-bold text-foreground">{totalMembers}</p>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Users size={10} /> across {plans.length} plans</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Plans</h3>
          <button className="flex items-center gap-1 rounded-full bg-teal px-3 py-1 text-[10px] font-bold text-background"><Plus size={10} /> New Plan</button>
        </div>
        <div className="mt-2 space-y-3">
          {plans.map((p) => (
            <div key={p.name} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.members} active members</p>
                </div>
                <p className="font-display text-lg font-bold text-teal">${p.price}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
              </div>
              <ul className="mt-3 space-y-1">
                {p.includes.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Check size={12} className="text-teal" /> {i}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button className="flex-1 rounded-lg border border-border py-1.5 text-[11px] font-semibold">Edit</button>
                <button className="flex-1 rounded-lg border border-border py-1.5 text-[11px] font-semibold">View members</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Subscribers</h3>
        <div className="mt-2 space-y-2">
          {recent.map((r) => (
            <div key={r.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-[10px] text-muted-foreground">{r.plan} · since {r.since}</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">ACTIVE</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}