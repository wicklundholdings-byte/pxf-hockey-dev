import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listLiveCamps } from "@/lib/camps-public.functions";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, CalendarDays, Map as MapIcon, List, ArrowRight } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";

export const Route = createFileRoute("/camps/browse")({
  head: () => ({ meta: [{ title: "Find Camps — PXF Hockey" }] }),
  component: BrowseCamps,
});

type Camp = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  hero_image: string | null;
  venue_name: string | null;
  location_type: string;
  start_date: string | null;
  end_date: string | null;
  price_cents: number;
  capacity: number;
};

function fmtDate(d: string | null) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtRange(start: string | null, end: string | null) {
  if (!start) return "Dates TBA";
  if (!end || end === start) return fmtDate(start);
  return `${fmtDate(start)}–${fmtDate(end)}`;
}

function BrowseCamps() {
  const [view, setView] = useState<"list" | "map">("list");
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [verifiedOwners, setVerifiedOwners] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await listLiveCamps();
        const list = (res.camps ?? []) as Camp[];
        setCamps(list);
        const ownerIds = Array.from(new Set(list.map((c) => c.owner_id).filter(Boolean)));
        if (ownerIds.length) {
          const { data: v } = await supabase
            .from("coach_verifications")
            .select("user_id, expires_at")
            .eq("status", "approved")
            .in("user_id", ownerIds);
          const now = Date.now();
          setVerifiedOwners(new Set((v ?? []).filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now).map((r) => r.user_id)));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return camps;
    return camps.filter((c) =>
      [c.name, c.venue_name ?? "", c.location_type].some((v) => v.toLowerCase().includes(needle)),
    );
  }, [camps, q]);

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Find Camps</h1>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search size={14} className="text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search camps…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {["Location", "Age group", "Skill level", "Date range", "Price range"].map((f) => (
          <button key={f} className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{f}</button>
        ))}
      </div>

      <div className="mt-3 inline-flex rounded-lg border border-border bg-card p-1 text-[11px]">
        <button onClick={() => setView("list")} className={`flex items-center gap-1 rounded-md px-3 py-1 font-bold ${view === "list" ? "bg-teal text-background" : "text-muted-foreground"}`}>
          <List size={12} /> List
        </button>
        <button onClick={() => setView("map")} className={`flex items-center gap-1 rounded-md px-3 py-1 font-bold ${view === "map" ? "bg-teal text-background" : "text-muted-foreground"}`}>
          <MapIcon size={12} /> Map
        </button>
      </div>

      {view === "list" ? (
        <div className="mt-4 space-y-3">
          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-card" />)
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No live camps match your search.
            </div>
          ) : (
            filtered.map((c) => (
              <Link
                key={c.id}
                to="/camps/$slug"
                params={{ slug: c.slug }}
                className="group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-teal/50"
              >
                <div className="h-28 bg-gradient-to-br from-teal/40 to-volt/30">
                  {c.hero_image && <img src={c.hero_image} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-foreground">{c.name}</p>
                        {verifiedOwners.has(c.owner_id) && <VerifiedBadge size="xs" label={false} />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">Hosted by PXF Hockey</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold text-volt">{c.capacity} spots</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={11} />{c.venue_name ?? (c.location_type === "online" ? "Online" : "TBA")}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={11} />{fmtRange(c.start_date, c.end_date)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-display text-lg font-bold text-foreground">${(c.price_cents / 100).toFixed(0)}</p>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-teal px-4 py-2 text-xs font-bold text-background">
                      BOOK NOW <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="mt-4 relative h-[420px] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-background">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#21262D 1px,transparent 1px),linear-gradient(90deg,#21262D 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
          {filtered.map((c, i) => (
            <Link key={c.id} to="/camps/$slug" params={{ slug: c.slug }} className="absolute" style={{ left: `${15 + i * 18}%`, top: `${25 + (i % 2) * 30}%` }}>
              <div className="rounded-full bg-teal p-1 shadow-lg shadow-teal/40"><MapPin size={14} className="text-background" /></div>
              <div className="mt-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] whitespace-nowrap">{c.name} · ${(c.price_cents / 100).toFixed(0)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}