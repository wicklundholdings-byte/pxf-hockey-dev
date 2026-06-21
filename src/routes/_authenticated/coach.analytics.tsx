import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Users, DollarSign, Mail, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Coach" }] }),
  component: AnalyticsScreen,
});

const regTrend = [6, 9, 7, 12, 14, 10, 18, 16, 22, 19, 25, 28];
const revTrend = [2, 3, 3, 5, 6, 5, 8, 7, 10, 9, 12, 14];

const popular = [
  { name: "Summer Elite Camp", regs: 48, cap: 50 },
  { name: "Skating Power Clinic", regs: 32, cap: 40 },
  { name: "Goalie Intensive", regs: 18, cap: 24 },
  { name: "U10 Skills Day", regs: 24, cap: 30 },
];

function Chart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex h-24 items-end gap-1">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.4 + (i / data.length) * 0.6 }} />
      ))}
    </div>
  );
}

function AnalyticsScreen() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Analytics</h2>
          <p className="text-[11px] text-muted-foreground">Track growth across your program.</p>
        </div>
        <select className="rounded-lg border border-border bg-card px-2 py-1 text-[10px]">
          <option>Last 30 days</option><option>Last 60 days</option><option>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { l: "Registrations", v: "186", d: "+24%", icon: Users, color: "text-teal" },
          { l: "Revenue", v: "$18,420", d: "+31%", icon: DollarSign, color: "text-volt" },
          { l: "Retention", v: "72%", d: "+5%", icon: TrendingUp, color: "text-emerald-400" },
          { l: "Fill rate", v: "84%", d: "+9%", icon: Calendar, color: "text-blue-400" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-border bg-card p-3">
            <s.icon size={14} className={s.color} />
            <p className="mt-1 font-display text-xl font-bold">{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l} <span className="text-emerald-400">{s.d}</span></p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registration Trend</h3>
        <p className="mt-1 font-display text-lg font-bold">186 registrations</p>
        <Chart data={regTrend} color="#00C4B4" />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue Growth</h3>
        <p className="mt-1 font-display text-lg font-bold text-volt">$18,420</p>
        <Chart data={revTrend} color="#3DFF8F" />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Most Popular Camps</h3>
        <div className="mt-3 space-y-3">
          {popular.map((p) => {
            const pct = (p.regs / p.cap) * 100;
            return (
              <div key={p.name}>
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted-foreground">{p.regs}/{p.cap}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Returning vs new</p>
          <p className="mt-1 font-display text-lg font-bold">68% / 32%</p>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface">
            <div className="bg-teal" style={{ width: "68%" }} />
            <div className="bg-volt" style={{ width: "32%" }} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Peak season</p>
          <p className="mt-1 font-display text-lg font-bold">August</p>
          <p className="text-[10px] text-muted-foreground">42% of annual regs</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><Mail size={11} /> Email Campaign Performance</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div><p className="font-display text-base font-bold">12</p><p className="text-[9px] text-muted-foreground">Sent</p></div>
          <div><p className="font-display text-base font-bold text-teal">48%</p><p className="text-[9px] text-muted-foreground">Open rate</p></div>
          <div><p className="font-display text-base font-bold text-volt">14%</p><p className="text-[9px] text-muted-foreground">Click rate</p></div>
        </div>
      </section>
    </div>
  );
}