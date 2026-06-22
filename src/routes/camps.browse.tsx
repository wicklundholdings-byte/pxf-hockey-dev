import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listLiveCamps } from "@/lib/camps-public.functions";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, CalendarDays, Map as MapIcon, List, ArrowRight, X } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";

export const Route = createFileRoute("/camps/browse")({
  head: () => ({
    meta: [
      { title: "Find Hockey Camps Near You — PXF Marketplace" },
      {
        name: "description",
        content:
          "Browse verified hockey camps from elite coaches. Filter by city, age group (U8–Senior), skill level and sport. Book directly with the coach.",
      },
      { property: "og:title", content: "Find Hockey Camps Near You — PXF" },
      {
        property: "og:description",
        content: "The PXF marketplace for verified hockey coaches and their camps.",
      },
    ],
    links: [{ rel: "canonical", href: "https://pxf-hockey-dev.lovable.app/camps/browse" }],
  }),
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
  age_group: string | null;
  skill_level: string | null;
  sport_type: string | null;
  city: string | null;
  postal_code: string | null;
};

const AGE_GROUPS = ["U8", "U10", "U12", "U14", "U16", "U18", "Junior", "Senior"];
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"];
const SPORT_TYPES = ["Hockey", "Skating", "Goalie", "Off-Ice"];

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-full border px-3 py-1.5 text-[11px] outline-none ${value ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground"}`}
      aria-label={label}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

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
  const [coachNames, setCoachNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [skillLevel, setSkillLevel] = useState<string>("");
  const [sportType, setSportType] = useState<string>("");
  const [verifiedOwners, setVerifiedOwners] = useState<Set<string>>(new Set());
  const [paidCounts, setPaidCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await listLiveCamps({
          data: {
            q: q || undefined,
            location: location || undefined,
            ageGroup: ageGroup || undefined,
            skillLevel: skillLevel || undefined,
            sportType: sportType || undefined,
          },
        });
        if (cancelled) return;
        const list = (res.camps ?? []) as Camp[];
        setCamps(list);
        setCoachNames(res.coaches ?? {});
        const ownerIds = Array.from(new Set(list.map((c) => c.owner_id).filter(Boolean)));
        if (ownerIds.length) {
          const [{ data: v }, { data: regs }] = await Promise.all([
            supabase
              .from("coach_verifications")
              .select("user_id, expires_at")
              .eq("status", "approved")
              .in("user_id", ownerIds),
            supabase
              .from("registrations")
              .select("camp_id")
              .in("camp_id", list.map((c) => c.id))
              .eq("status", "paid"),
          ]);
          if (cancelled) return;
          const now = Date.now();
          setVerifiedOwners(
            new Set(
              (v ?? [])
                .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now)
                .map((r) => r.user_id),
            ),
          );
          const counts: Record<string, number> = {};
          for (const r of regs ?? []) counts[r.camp_id] = (counts[r.camp_id] ?? 0) + 1;
          setPaidCounts(counts);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, location, ageGroup, skillLevel, sportType]);

  const filtered = useMemo(() => camps, [camps]);
  const activeFilters = [ageGroup, skillLevel, sportType, location].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Find Camps</h1>
      <p className="text-[11px] text-muted-foreground">Verified coaches in the PXF marketplace.</p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search size={14} className="text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search camp name…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <MapPin size={14} className="text-muted-foreground" />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or postal/zip code…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {location && (
          <button onClick={() => setLocation("")} aria-label="Clear location">
            <X size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <FilterSelect label="Age" value={ageGroup} onChange={setAgeGroup} options={AGE_GROUPS} />
        <FilterSelect label="Skill" value={skillLevel} onChange={setSkillLevel} options={SKILL_LEVELS} />
        <FilterSelect label="Sport" value={sportType} onChange={setSportType} options={SPORT_TYPES} />
      </div>
      {activeFilters > 0 && (
        <button
          onClick={() => {
            setAgeGroup("");
            setSkillLevel("");
            setSportType("");
            setLocation("");
          }}
          className="mt-2 text-[11px] text-teal underline"
        >
          Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
        </button>
      )}

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
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <span>By {coachNames[c.owner_id] ?? "PXF Coach"}</span>
                        {verifiedOwners.has(c.owner_id) && <VerifiedBadge size="xs" label={false} />}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold text-volt">
                      {Math.max(0, c.capacity - (paidCounts[c.id] ?? 0))} left
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={11} />{[c.venue_name, c.city].filter(Boolean).join(", ") || (c.location_type === "online" ? "Online" : "TBA")}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={11} />{fmtRange(c.start_date, c.end_date)}</span>
                  </div>
                  {(c.age_group || c.skill_level) && (
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                      {c.age_group && <span className="rounded-full bg-background border border-border px-2 py-0.5">{c.age_group}</span>}
                      {c.skill_level && <span className="rounded-full bg-background border border-border px-2 py-0.5">{c.skill_level}</span>}
                    </div>
                  )}
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