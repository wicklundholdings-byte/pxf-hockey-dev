import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, List, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/coach/status-badge";

export const Route = createFileRoute("/_authenticated/coach/camps")({
  component: CampsPage,
});

type Camp = {
  id: string;
  name: string;
  slug: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  capacity: number;
  price_cents: number;
  hero_image: string | null;
  venue_name: string | null;
  location_type: string;
};

function fmtDate(d: string | null) {
  if (!d) return "TBA";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtMonth(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}
function fmtDay(d: string | null) {
  if (!d) return "—";
  return new Date(d).getDate().toString();
}

function CampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [regCounts, setRegCounts] = useState<Map<string, { count: number; revenue: number }>>(new Map());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "draft" | "ended">("all");
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    (async () => {
      const [c, r] = await Promise.all([
        supabase.from("camps").select("*").order("start_date", { ascending: true }),
        supabase.from("registrations").select("camp_id,status,amount_cents").eq("status", "paid"),
      ]);
      setCamps((c.data ?? []) as Camp[]);
      const m = new Map<string, { count: number; revenue: number }>();
      (r.data ?? []).forEach((row: any) => {
        const prev = m.get(row.camp_id) ?? { count: 0, revenue: 0 };
        m.set(row.camp_id, { count: prev.count + 1, revenue: prev.revenue + (row.amount_cents ?? 0) });
      });
      setRegCounts(m);
    })();
  }, []);

  const filtered = useMemo(() => {
    return camps.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [camps, q, filter]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search camps…"
              className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
            />
          </div>
          <div className="flex rounded-full border border-border bg-card p-0.5">
            <button
              onClick={() => setView("list")}
              className={"rounded-full px-2 py-1 " + (view === "list" ? "bg-teal text-black" : "text-muted-foreground")}
              aria-label="List view"
            >
              <List size={12} />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={"rounded-full px-2 py-1 " + (view === "calendar" ? "bg-teal text-black" : "text-muted-foreground")}
              aria-label="Calendar view"
            >
              <CalendarIcon size={12} />
            </button>
          </div>
          <Link
            to="/coach/camps/new"
            className="flex items-center gap-1 rounded-full bg-teal px-3 py-2 text-[11px] font-bold text-black"
          >
            <Plus size={12} /> New
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "live", "draft", "ended"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-full border px-3 py-1 text-[11px] font-semibold capitalize " +
                (filter === f ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No camps match your filters.
            </p>
          ) : (
            filtered.map((c) => {
              const stats = regCounts.get(c.id) ?? { count: 0, revenue: 0 };
              const pct = c.capacity ? Math.min(100, (stats.count / c.capacity) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  to="/coach/camps/$campId"
                  params={{ campId: c.id }}
                  className="block rounded-2xl border border-border bg-card p-3 transition-colors hover:border-teal/40"
                >
                  <div className="flex gap-3">
                    {/* Date block */}
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-center">
                      <span className="text-[9px] font-bold tracking-wider text-teal">{fmtMonth(c.start_date)}</span>
                      <span className="font-display text-lg font-bold leading-none text-foreground">{fmtDay(c.start_date)}</span>
                    </div>
                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-bold text-foreground">{c.name}</h3>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <MapPin size={10} /> {c.venue_name ?? (c.location_type === "online" ? "Online" : "TBA")}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted-foreground">
                          {stats.count}/{c.capacity} spots
                        </span>
                        <span className="font-bold text-emerald-400">
                          ${(stats.revenue / 100).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-teal" style={{ width: pct + "%" }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        <CalendarView camps={filtered} />
      )}
    </div>
  );
}

function CalendarView({ camps }: { camps: Camp[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();

  const cells: Array<{ day: number | null; camps: Camp[] }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, camps: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({
      day: d,
      camps: camps.filter(
        (c) => c.start_date && c.end_date && dateStr >= c.start_date && dateStr <= c.end_date,
      ),
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 font-display text-sm font-bold text-foreground">
        {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={
              "min-h-[44px] rounded-md border p-1 text-[10px] " +
              (cell.day ? "border-border/40 bg-surface" : "border-transparent")
            }
          >
            {cell.day && <div className="text-muted-foreground">{cell.day}</div>}
            {cell.camps.slice(0, 2).map((c) => (
              <div key={c.id} className="mt-0.5 truncate rounded bg-teal/20 px-1 text-[8px] font-bold text-teal">
                {c.name}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}