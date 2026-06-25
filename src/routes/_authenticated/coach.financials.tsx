import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DollarSign, TrendingUp, Wallet, Tag, Plus, X, Copy, CheckCircle2, BarChart3, Percent, Download, ChevronDown, ChevronUp, Snowflake, Users, TrendingDown } from "lucide-react";
import { TierGate } from "@/components/tier-gate";
import { BlockForStaff } from "@/components/block-for-staff";
import { getCoachCostsThisMonth, getIceCostsThisMonth, setIceCostOverride } from "@/lib/coach-costs.functions";

export const Route = createFileRoute("/_authenticated/coach/financials")({
  component: GatedFinancials,
});

function GatedFinancials() {
  return (
    <BlockForStaff>
      <TierGate feature="stripePayouts">
        <FinancialsPage />
      </TierGate>
    </BlockForStaff>
  );
}

type Reg = {
  id: string;
  status: string;
  amount_cents: number | null;
  created_at: string;
  camps: { name: string | null } | null;
  contacts: { full_name: string | null; email: string | null } | null;
};
type Payout = { id: string; amount_cents: number; status: string; period_start: string | null; period_end: string | null; paid_at: string | null; created_at: string };
type Coupon = { id: string; code: string; percent_off: number | null; amount_off_cents: number | null; expires_at: string | null; usage_limit: number | null; used_count: number };

type Tab = "overview" | "orders" | "reports" | "taxes" | "payouts" | "coupons";

function FinancialsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [regs, setRegs] = useState<Reg[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [r, p, c] = await Promise.all([
      supabase
        .from("registrations")
        .select("id,status,amount_cents,created_at, camps(name), contacts(full_name,email)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("payouts").select("*").order("created_at", { ascending: false }),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    ]);
    setRegs((r.data ?? []) as unknown as Reg[]);
    setPayouts((p.data ?? []) as Payout[]);
    setCoupons((c.data ?? []) as Coupon[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const paid = regs.filter((r) => r.status === "paid");
    const gross = paid.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const pending = regs.filter((r) => r.status === "pending").reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const refunded = regs.filter((r) => r.status === "refunded").reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const paidOut = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);
    const balance = gross - refunded - paidOut;
    return { gross, pending, refunded, paidOut, balance, paidCount: paid.length };
  }, [regs, payouts]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Money</p>
        <h2 className="font-display text-lg font-bold text-foreground">Financials</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <BigStat icon={DollarSign} label="Gross revenue" value={`$${(stats.gross / 100).toLocaleString()}`} tint="teal" sub={`${stats.paidCount} paid`} />
        <BigStat icon={Wallet} label="Available balance" value={`$${(stats.balance / 100).toLocaleString()}`} tint="emerald" sub={`$${(stats.paidOut / 100).toLocaleString()} paid out`} />
        <BigStat icon={TrendingUp} label="Pending" value={`$${(stats.pending / 100).toLocaleString()}`} tint="amber" sub={`${regs.filter((r) => r.status === "pending").length} orders`} />
        <BigStat icon={X} label="Refunded" value={`$${(stats.refunded / 100).toLocaleString()}`} tint="red" sub={`${regs.filter((r) => r.status === "refunded").length} orders`} />
      </div>

      <nav className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {(["overview", "orders", "reports", "taxes", "payouts", "coupons"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize " +
                (tab === t ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      {loading ? <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p> : (
        <>
          {tab === "overview" && <OverviewTab regs={regs} />}
          {tab === "orders" && <OrdersTab regs={regs} />}
          {tab === "reports" && <ReportsTab regs={regs} />}
          {tab === "taxes" && <TaxesTab />}
          {tab === "payouts" && <PayoutsTab payouts={payouts} balance={stats.balance} onReload={load} />}
          {tab === "coupons" && <CouponsTab coupons={coupons} onReload={load} />}
        </>
      )}
    </div>
  );
}

function BigStat({ icon: Icon, label, value, sub, tint }: { icon: typeof DollarSign; label: string; value: string; sub: string; tint: "teal" | "emerald" | "amber" | "red" }) {
  const color =
    tint === "teal" ? "text-teal" :
    tint === "emerald" ? "text-emerald-400" :
    tint === "amber" ? "text-amber-400" : "text-red-400";
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Icon size={10} className={color} /> {label}
      </div>
      <p className={"mt-1 font-display text-xl font-bold " + color}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function OverviewTab({ regs }: { regs: Reg[] }) {
  const grossMtdCents = useMemo(() => {
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    return regs.filter((r) => r.status === "paid").reduce((s, r) => {
      const d = new Date(r.created_at);
      if (d.getMonth() !== m || d.getFullYear() !== y) return s;
      return s + (r.amount_cents ?? 0);
    }, 0);
  }, [regs]);

  // Revenue by camp
  const byCamp = useMemo(() => {
    const m = new Map<string, number>();
    regs.filter((r) => r.status === "paid").forEach((r) => {
      const k = r.camps?.name ?? "Unknown";
      m.set(k, (m.get(k) ?? 0) + (r.amount_cents ?? 0));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [regs]);
  const max = Math.max(1, ...byCamp.map(([, v]) => v));

  return (
    <div className="space-y-3">
      <ProfitabilityCards grossMtdCents={grossMtdCents} />

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-foreground">Revenue by camp</h3>
        {byCamp.length === 0 ? (
          <p className="text-xs text-muted-foreground">No paid revenue yet.</p>
        ) : (
          <ul className="space-y-2">
            {byCamp.map(([name, amt]) => (
              <li key={name}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="truncate text-foreground">{name}</span>
                  <span className="font-bold text-emerald-400">${(amt / 100).toLocaleString()}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full bg-gradient-to-r from-teal to-emerald-400" style={{ width: `${(amt / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProfitabilityCards({ grossMtdCents }: { grossMtdCents: number }) {
  const [iceCents, setIceCents] = useState(0);
  const [iceMode, setIceMode] = useState<"auto" | "override">("auto");
  const [pricedCount, setPricedCount] = useState(0);
  const [coachTotalCents, setCoachTotalCents] = useState(0);
  const [coachRows, setCoachRows] = useState<Awaited<ReturnType<typeof getCoachCostsThisMonth>>["staff"]>([]);
  const [expanded, setExpanded] = useState(false);
  const [openStaff, setOpenStaff] = useState<string | null>(null);
  const [editingIce, setEditingIce] = useState(false);
  const [iceInput, setIceInput] = useState("");

  const reload = async () => {
    const [ice, coach] = await Promise.all([getIceCostsThisMonth(), getCoachCostsThisMonth()]);
    setIceCents(ice.totalCents); setIceMode(ice.mode); setPricedCount(ice.pricedCount);
    setIceInput(((ice.overrideCents ?? 0) / 100).toFixed(0));
    setCoachTotalCents(coach.totalCents); setCoachRows(coach.staff);
  };
  useEffect(() => { reload(); }, []);

  const gross = grossMtdCents;
  const profit = gross - iceCents - coachTotalCents;
  const fmt = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3">
      {/* Gross Profit */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {profit >= 0 ? <TrendingUp size={11} className="text-emerald-400" /> : <TrendingDown size={11} className="text-red-400" />}
          Gross Profit · this month
        </div>
        <p className={"mt-1 font-display text-3xl font-bold " + (profit >= 0 ? "text-emerald-400" : "text-red-400")}>{profit < 0 ? "-" : ""}{fmt(Math.abs(profit))}</p>
        <p className="text-[11px] text-muted-foreground">{fmt(gross)} sales − {fmt(iceCents)} ice − {fmt(coachTotalCents)} coaches</p>
      </div>

      {/* Ice Costs */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Snowflake size={11} className="text-teal" /> Ice Costs · this month
            </div>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{fmt(iceCents)}</p>
            <p className="text-[10px] text-muted-foreground">
              {iceMode === "auto" ? `${pricedCount} slot${pricedCount === 1 ? "" : "s"} priced` : "Manual entry"}
            </p>
          </div>
          {!editingIce && (
            <button onClick={() => setEditingIce(true)} className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold">Edit</button>
          )}
        </div>
        {editingIce && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">$</span>
            <input
              type="number" min="0" step="1" value={iceInput}
              onChange={(e) => setIceInput(e.target.value)}
              className="w-28 rounded-md border border-border bg-surface px-2 py-1 text-xs"
            />
            <button
              onClick={async () => {
                await setIceCostOverride({ data: { amountCents: Math.round(parseFloat(iceInput || "0") * 100) } });
                setEditingIce(false);
                reload();
              }}
              className="rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-bold text-primary-foreground"
            >Save</button>
            <button onClick={() => setEditingIce(false)} className="text-[10px] text-muted-foreground">Cancel</button>
            {iceMode === "auto" && pricedCount > 0 && (
              <span className="text-[10px] text-muted-foreground">Auto sum from slots: {fmt(iceCents)}</span>
            )}
          </div>
        )}
      </div>

      {/* Coach Costs */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between">
          <div className="text-left">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Users size={11} className="text-teal" /> Coach Costs · this month
            </div>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{fmt(coachTotalCents)}</p>
            <p className="text-[10px] text-muted-foreground">{coachRows.length} coach{coachRows.length === 1 ? "" : "es"}</p>
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expanded && (
          <div className="mt-3 space-y-2">
            {coachRows.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No staff sessions assigned this month.</p>
            ) : coachRows.map((s) => {
              const open = openStaff === s.staffId;
              return (
                <div key={s.staffId} className="rounded-xl border border-border bg-surface">
                  <button onClick={() => setOpenStaff(open ? null : s.staffId)} className="flex w-full items-center justify-between px-3 py-2 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.sessions} session{s.sessions === 1 ? "" : "s"}</p>
                    </div>
                    <p className="ml-2 text-xs font-bold text-emerald-400">{fmt(s.totalCents)}</p>
                  </button>
                  {open && (
                    <ul className="border-t border-border px-3 py-2 space-y-1">
                      {s.items.map((it, idx) => (
                        <li key={idx} className="flex items-center justify-between text-[11px]">
                          <div className="min-w-0">
                            <p className="truncate text-foreground">{it.label}</p>
                            <p className="text-[9px] text-muted-foreground">{new Date(it.date + "T00:00:00").toLocaleDateString()}</p>
                          </div>
                          <span className="text-foreground">{fmt(it.rateCents)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersTab({ regs }: { regs: Reg[] }) {
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "refunded">("all");
  const filtered = regs.filter((r) => filter === "all" || r.status === filter);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["all", "paid", "pending", "refunded"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full border px-3 py-1 text-[10px] font-semibold capitalize " +
              (filter === f ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
            }
          >{f}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">No orders.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{r.contacts?.full_name ?? "Unknown"}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {r.camps?.name ?? "—"} · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={
                    "text-[9px] font-bold uppercase " +
                    (r.status === "paid" ? "text-emerald-400" :
                     r.status === "pending" ? "text-amber-400" :
                     r.status === "refunded" ? "text-red-400" : "text-muted-foreground")
                  }>{r.status}</p>
                  <p className="text-sm font-bold text-foreground">${((r.amount_cents ?? 0) / 100).toFixed(0)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportsTab({ regs }: { regs: Reg[] }) {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "ytd">("30d");
  const gross = useMemo(() => regs.filter((r) => r.status === "paid").reduce((s, r) => s + (r.amount_cents ?? 0), 0), [regs]);
  const refunded = useMemo(() => regs.filter((r) => r.status === "refunded").reduce((s, r) => s + (r.amount_cents ?? 0), 0), [regs]);
  const net = gross - refunded;
  // Synthetic 14-day spark
  const bars = Array.from({ length: 14 }).map((_, i) => 30 + ((i * 73) % 70));
  const max = Math.max(...bars);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(["7d", "30d", "90d", "ytd"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase " +
                (range === r ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
              }
            >{r}</button>
          ))}
        </div>
        <button className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold text-foreground">
          <Download size={11} /> Export CSV
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <BarChart3 size={11} /> Revenue trend
        </h3>
        <div className="flex h-32 items-end gap-1">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-teal/40 to-teal" style={{ height: `${(b / max) * 100}%` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          <span>14 days ago</span><span>Today</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Gross</p>
          <p className="font-display text-lg font-bold text-teal">${(gross / 100).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Refunds</p>
          <p className="font-display text-lg font-bold text-red-400">-${(refunded / 100).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Net</p>
          <p className="font-display text-lg font-bold text-emerald-400">${(net / 100).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function TaxesTab() {
  const [country, setCountry] = useState<"CA" | "US">("CA");
  const [rate, setRate] = useState("13");
  const [perCamp, setPerCamp] = useState<Record<string, boolean>>({
    "Summer Skills Camp": true,
    "Goalie Intensive": false,
    "Game IQ Weekend": true,
  });
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-teal/30 bg-teal/5 p-2.5">
        <Percent size={12} className="mt-0.5 shrink-0 text-teal" />
        <p className="text-[10px] leading-relaxed text-foreground/80">
          Set a default tax rate and toggle which camps collect tax at checkout.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground">Region</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setCountry("CA"); setRate("13"); }} className={"rounded-xl border py-2 text-xs font-bold " + (country === "CA" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>🇨🇦 Canada (GST/HST)</button>
          <button onClick={() => { setCountry("US"); setRate("0"); }} className={"rounded-xl border py-2 text-xs font-bold " + (country === "US" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>🇺🇸 US (Sales tax)</button>
        </div>
        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Default rate (%)</label>
        <input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground">Apply per camp</p>
        <ul className="space-y-1.5">
          {Object.entries(perCamp).map(([name, on]) => (
            <li key={name} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
              <span className="text-xs text-foreground">{name}</span>
              <button
                onClick={() => setPerCamp({ ...perCamp, [name]: !on })}
                className={"rounded-full px-2.5 py-0.5 text-[10px] font-bold " + (on ? "bg-gradient-brand text-primary-foreground" : "bg-muted text-muted-foreground")}
              >
                {on ? "On" : "Off"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button className="w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground">Save tax settings</button>
    </div>
  );
}

function PayoutsTab({ payouts, balance, onReload }: { payouts: Payout[]; balance: number; onReload: () => void }) {
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);

  async function requestPayout() {
    if (!user || balance <= 0) return;
    setRequesting(true);
    await supabase.from("payouts").insert({
      owner_id: user.id,
      amount_cents: balance,
      status: "pending",
      period_end: new Date().toISOString().slice(0, 10),
    });
    setRequesting(false);
    onReload();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-teal/30 bg-teal/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available to request</p>
        <p className="mt-1 font-display text-3xl font-bold text-teal">${(balance / 100).toLocaleString()}</p>
        <button
          disabled={balance <= 0 || requesting}
          onClick={requestPayout}
          className="mt-3 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {requesting ? "Requesting…" : "Request payout"}
        </button>
      </div>

      {payouts.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">No payouts yet.</p>
      ) : (
        <ul className="space-y-2">
          {payouts.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">${(p.amount_cents / 100).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">
                  {p.paid_at ? `Paid ${new Date(p.paid_at).toLocaleDateString()}` : `Requested ${new Date(p.created_at).toLocaleDateString()}`}
                </p>
              </div>
              <span className={
                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase " +
                (p.status === "paid" ? "bg-emerald-400/15 text-emerald-400" :
                 p.status === "pending" ? "bg-amber-400/15 text-amber-400" : "bg-muted text-muted-foreground")
              }>{p.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CouponsTab({ coupons, onReload }: { coupons: Coupon[]; onReload: () => void }) {
  const { user } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discount, setDiscount] = useState(10);
  const [limit, setLimit] = useState<number | "">("");
  const [copied, setCopied] = useState<string | null>(null);

  async function create() {
    if (!user || !code.trim()) return;
    await supabase.from("coupons").insert({
      owner_id: user.id,
      code: code.trim().toUpperCase(),
      percent_off: discountType === "percent" ? discount : null,
      amount_off_cents: discountType === "amount" ? discount * 100 : null,
      usage_limit: typeof limit === "number" ? limit : null,
    });
    setShowNew(false); setCode(""); setDiscount(10); setLimit("");
    onReload();
  }

  async function remove(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    onReload();
  }

  function copyCode(c: string) {
    navigator.clipboard.writeText(c);
    setCopied(c);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowNew(true)}
        className="flex w-full items-center justify-center gap-1 rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground"
      >
        <Plus size={14} /> New coupon
      </button>

      {coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Tag size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">No coupons yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {coupons.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            const exhausted = c.usage_limit != null && c.used_count >= c.usage_limit;
            const dead = expired || exhausted;
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className={"grid h-10 w-10 place-items-center rounded-xl " + (dead ? "bg-muted text-muted-foreground" : "bg-teal/15 text-teal")}>
                  <Tag size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-sm font-bold text-foreground">{c.code}</p>
                    <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-teal">
                      {copied === c.code ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {c.percent_off != null ? `${c.percent_off}% off` : `$${((c.amount_off_cents ?? 0) / 100).toFixed(0)} off`}
                    {" · "}{c.used_count}/{c.usage_limit ?? "∞"} used
                    {dead && " · INACTIVE"}
                  </p>
                </div>
                <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-red-400">
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showNew && (
        <div onClick={() => setShowNew(false)} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-background p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">New coupon</h2>
              <button onClick={() => setShowNew(false)} className="rounded-full bg-surface p-1.5 text-muted-foreground"><X size={14} /></button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER25"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground focus:border-teal focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDiscountType("percent")} className={"rounded-xl border py-2 text-xs font-bold " + (discountType === "percent" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>% off</button>
                <button onClick={() => setDiscountType("amount")} className={"rounded-xl border py-2 text-xs font-bold " + (discountType === "amount" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>$ off</button>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {discountType === "percent" ? "Percent off" : "Dollars off"}
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Usage limit (optional)</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Unlimited"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
                />
              </div>
              <button
                onClick={create}
                disabled={!code.trim() || discount <= 0}
                className="mt-4 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >Create coupon</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}