import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Users, DollarSign, Calendar, Download, Printer, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/coach/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Coach" }] }),
  component: AnalyticsScreen,
});

type Reg = {
  id: string;
  camp_id: string;
  contact_id: string | null;
  status: string;
  amount_cents: number | null;
  created_at: string;
};
type Camp = { id: string; name: string; capacity: number | null };

const RANGES = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last 12 months", days: 365 },
  { id: "ytd", label: "Year to date", days: 0 },
];

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
      {positive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {Math.abs(value).toFixed(0)}% vs LY
    </span>
  );
}

function Bars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-24 items-end gap-1">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.4 + (i / Math.max(data.length - 1, 1)) * 0.6 }} />
      ))}
    </div>
  );
}

function AnalyticsScreen() {
  const { user } = useAuth();
  const [rangeId, setRangeId] = useState("30");
  const [allRegs, setAllRegs] = useState<Reg[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: cmp } = await supabase.from("camps").select("id,name,capacity").eq("owner_id", user.id);
      const ids = (cmp ?? []).map((c) => c.id);
      setCamps((cmp ?? []) as Camp[]);
      if (ids.length === 0) { setAllRegs([]); setLoading(false); return; }
      // Pull up to ~2 years for YoY compare
      const since = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
      const { data: regs } = await supabase
        .from("registrations")
        .select("id,camp_id,contact_id,status,amount_cents,created_at")
        .in("camp_id", ids)
        .gte("created_at", since)
        .limit(5000);
      setAllRegs((regs ?? []) as Reg[]);
      setLoading(false);
    })();
  }, [user]);

  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1];
  const { start, end, prevStart, prevEnd } = useMemo(() => {
    const end = new Date();
    const start = rangeId === "ytd"
      ? new Date(end.getFullYear(), 0, 1)
      : new Date(end.getTime() - range.days * 86400000);
    const prevStart = new Date(start);
    prevStart.setFullYear(prevStart.getFullYear() - 1);
    const prevEnd = new Date(end);
    prevEnd.setFullYear(prevEnd.getFullYear() - 1);
    return { start, end, prevStart, prevEnd };
  }, [rangeId, range.days]);

  const inWindow = (r: Reg, s: Date, e: Date) => {
    const t = new Date(r.created_at).getTime();
    return t >= s.getTime() && t <= e.getTime();
  };

  const curr = allRegs.filter((r) => inWindow(r, start, end));
  const prev = allRegs.filter((r) => inWindow(r, prevStart, prevEnd));

  // Returning families: contacts whose FIRST registration ever was before window start
  const firstSeen = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allRegs) {
      if (!r.contact_id) continue;
      const t = new Date(r.created_at).getTime();
      const prev = m.get(r.contact_id);
      if (prev === undefined || t < prev) m.set(r.contact_id, t);
    }
    return m;
  }, [allRegs]);

  const stats = useMemo(() => {
    const paid = curr.filter((r) => r.status !== "cancelled");
    const revenue = paid.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const cancelled = curr.filter((r) => r.status === "cancelled").length;
    const cancelRate = curr.length ? (cancelled / curr.length) * 100 : 0;
    const campsWithRegs = new Set(paid.map((r) => r.camp_id));
    const avgSize = campsWithRegs.size ? paid.length / campsWithRegs.size : 0;

    const newFamilies = new Set<string>();
    const returningFamilies = new Set<string>();
    for (const r of paid) {
      if (!r.contact_id) continue;
      const seen = firstSeen.get(r.contact_id);
      if (seen !== undefined && seen >= start.getTime()) newFamilies.add(r.contact_id);
      else returningFamilies.add(r.contact_id);
    }

    const prevPaid = prev.filter((r) => r.status !== "cancelled");
    const prevRevenue = prevPaid.reduce((s, r) => s + (r.amount_cents ?? 0), 0);

    return {
      regs: paid.length,
      revenue,
      avgSize,
      cancelRate,
      newFamilies: newFamilies.size,
      returningFamilies: returningFamilies.size,
      regsDelta: pctChange(paid.length, prevPaid.length),
      revDelta: pctChange(revenue, prevRevenue),
    };
  }, [curr, prev, firstSeen, start]);

  const topCamps = useMemo(() => {
    const map = new Map<string, { regs: number; revenue: number }>();
    for (const r of curr) {
      if (r.status === "cancelled") continue;
      const m = map.get(r.camp_id) ?? { regs: 0, revenue: 0 };
      m.regs++;
      m.revenue += r.amount_cents ?? 0;
      map.set(r.camp_id, m);
    }
    return Array.from(map.entries())
      .map(([id, m]) => ({ ...m, camp: camps.find((c) => c.id === id) }))
      .filter((x) => x.camp)
      .sort((a, b) => b.regs - a.regs)
      .slice(0, 5);
  }, [curr, camps]);

  const trend = useMemo(() => {
    const buckets = 12;
    const span = end.getTime() - start.getTime();
    const bucketMs = span / buckets;
    const regs = new Array(buckets).fill(0);
    const rev = new Array(buckets).fill(0);
    for (const r of curr) {
      if (r.status === "cancelled") continue;
      const idx = Math.min(buckets - 1, Math.floor((new Date(r.created_at).getTime() - start.getTime()) / bucketMs));
      regs[idx]++;
      rev[idx] += (r.amount_cents ?? 0) / 100;
    }
    return { regs, rev };
  }, [curr, start, end]);

  function exportCSV() {
    const rows = [
      ["Metric", "Value", "vs Same Period Last Year"],
      ["Registrations", String(stats.regs), `${stats.regsDelta.toFixed(1)}%`],
      ["Revenue", fmtMoney(stats.revenue), `${stats.revDelta.toFixed(1)}%`],
      ["Avg camp size", stats.avgSize.toFixed(1), ""],
      ["Cancellation rate", `${stats.cancelRate.toFixed(1)}%`, ""],
      ["New families", String(stats.newFamilies), ""],
      ["Returning families", String(stats.returningFamilies), ""],
      [],
      ["Top Camps", "Registrations", "Revenue"],
      ...topCamps.map((c) => [c.camp!.name, String(c.regs), fmtMoney(c.revenue)]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-${rangeId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (loading) {
    return <p className="px-5 pt-10 text-center text-xs text-muted-foreground">Loading analytics…</p>;
  }

  const newReturnTotal = stats.newFamilies + stats.returningFamilies;
  const newPct = newReturnTotal ? (stats.newFamilies / newReturnTotal) * 100 : 0;

  return (
    <div className="space-y-5 print:bg-white print:text-black">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Analytics</h2>
          <p className="text-[11px] text-muted-foreground">{range.label} · vs same period last year</p>
        </div>
        <select
          value={rangeId}
          onChange={(e) => setRangeId(e.target.value)}
          className="rounded-lg border border-border bg-card px-2 py-1 text-[10px]"
        >
          {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2 print:hidden">
        <button onClick={exportCSV} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-card py-2 text-[11px] font-bold">
          <Download size={12} /> Export CSV
        </button>
        <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-card py-2 text-[11px] font-bold">
          <Printer size={12} /> Export PDF
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <Users size={14} className="text-teal" />
          <p className="mt-1 font-display text-xl font-bold">{stats.regs}</p>
          <p className="text-[10px] text-muted-foreground">Registrations <Delta value={stats.regsDelta} /></p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <DollarSign size={14} className="text-volt" />
          <p className="mt-1 font-display text-xl font-bold">{fmtMoney(stats.revenue)}</p>
          <p className="text-[10px] text-muted-foreground">Revenue <Delta value={stats.revDelta} /></p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <Calendar size={14} className="text-blue-400" />
          <p className="mt-1 font-display text-xl font-bold">{stats.avgSize.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">Avg camp size</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <TrendingUp size={14} className="text-red-400" />
          <p className="mt-1 font-display text-xl font-bold">{stats.cancelRate.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Cancellation rate</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registrations</h3>
        <p className="mt-1 font-display text-lg font-bold">{stats.regs}</p>
        <Bars data={trend.regs} color="#00C4B4" />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</h3>
        <p className="mt-1 font-display text-lg font-bold text-volt">{fmtMoney(stats.revenue)}</p>
        <Bars data={trend.rev} color="#3DFF8F" />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Performing Events</h3>
        {topCamps.length === 0 ? (
          <p className="mt-3 text-[11px] text-muted-foreground">No registrations in this window.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {topCamps.map((p) => {
              const cap = p.camp!.capacity ?? Math.max(p.regs, 1);
              const pct = Math.min(100, (p.regs / cap) * 100);
              return (
                <div key={p.camp!.id}>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold">{p.camp!.name}</span>
                    <span className="text-muted-foreground">{p.regs}{p.camp!.capacity ? `/${p.camp!.capacity}` : ""} · {fmtMoney(p.revenue)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">New vs returning families</p>
        <p className="mt-1 font-display text-lg font-bold">{stats.newFamilies} new · {stats.returningFamilies} returning</p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface">
          <div className="bg-volt" style={{ width: `${newPct}%` }} />
          <div className="bg-teal" style={{ width: `${100 - newPct}%` }} />
        </div>
      </div>
    </div>
  );
}