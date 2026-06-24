import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Flame, Shield, User, Trophy, Clock } from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId/leaderboard/$athleteId")({
  head: () => ({ meta: [{ title: "Athlete Dryland Activity — PXF Hockey" }] }),
  component: AthleteDrylandDetail,
});

type Athlete = { id: string; full_name: string; preferred_position: "player" | "goalie" | null };
type Streak = { current_streak_weeks: number; longest_streak_weeks: number };
type LogRow = {
  id: string;
  last_watched_at: string;
  title: string;
  category: string;
  position: string;
  duration_minutes: number;
  difficulty: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  stickhandling: "Stickhandling",
  shooting: "Shooting",
  strength_fitness: "Strength & Fitness",
  synthetic_ice: "Synthetic Ice",
  mobility_flexibility: "Mobility & Flexibility",
};

function maskName(full: string) {
  const parts = full.trim().split(/\s+/);
  return (parts[0] ?? "") + (parts[1]?.[0] ? ` ${parts[1][0]}.` : "");
}

type FilterMode = "all" | "category" | "month";

function AthleteDrylandDetail() {
  const { teamId, athleteId } = Route.useParams();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [mode, setMode] = useState<FilterMode>("all");
  const [filterValue, setFilterValue] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [a, s, l] = await Promise.all([
        supabase.from("attendees").select("id,full_name,preferred_position").eq("id", athleteId).maybeSingle(),
        supabase
          .from("dryland_streaks")
          .select("current_streak_weeks,longest_streak_weeks")
          .eq("athlete_id", athleteId)
          .maybeSingle(),
        supabase
          .from("dryland_watch_progress")
          .select("id,last_watched_at,dryland_videos(title,category,position,duration_minutes,difficulty)")
          .eq("athlete_id", athleteId)
          .eq("completed", true)
          .order("last_watched_at", { ascending: false })
          .limit(200),
      ]);
      setAthlete((a.data as Athlete) ?? null);
      setStreak((s.data as Streak) ?? null);
      setLog(
        ((l.data as any[]) ?? []).map((r) => ({
          id: r.id,
          last_watched_at: r.last_watched_at,
          title: r.dryland_videos?.title ?? "Session",
          category: r.dryland_videos?.category ?? "",
          position: r.dryland_videos?.position ?? "player",
          duration_minutes: r.dryland_videos?.duration_minutes ?? 0,
          difficulty: r.dryland_videos?.difficulty ?? "beginner",
        })),
      );
    })();
  }, [athleteId]);

  const categories = useMemo(() => Array.from(new Set(log.map((l) => l.category))).filter(Boolean), [log]);
  const months = useMemo(() => {
    const set = new Set<string>();
    log.forEach((l) => {
      const d = new Date(l.last_watched_at);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(set).sort().reverse();
  }, [log]);

  const filtered = useMemo(() => {
    if (mode === "all" || filterValue === "all") return log;
    if (mode === "category") return log.filter((l) => l.category === filterValue);
    if (mode === "month")
      return log.filter((l) => {
        const d = new Date(l.last_watched_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === filterValue;
      });
    return log;
  }, [log, mode, filterValue]);

  const totalSessions = filtered.length;
  const totalMinutes = filtered.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
  const displayName = athlete ? maskName(athlete.full_name) : "Athlete";
  const PosIcon = athlete?.preferred_position === "goalie" ? Shield : User;

  return (
    <div className="px-5 pb-28 pt-4">
      <Link
        to="/parent/teams/$teamId/leaderboard"
        params={{ teamId }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <ArrowLeft size={14} /> Leaderboard
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal/15 text-teal">
          <PosIcon size={20} />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">{displayName}</h1>
          <p className="text-[11px] capitalize text-muted-foreground">{athlete?.preferred_position ?? "player"}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat label="Sessions" value={totalSessions.toString()} />
        <Stat label="Minutes" value={totalMinutes.toString()} />
        <Stat label="Streak" value={`${streak?.current_streak_weeks ?? 0}w`} />
        <Stat label="Longest" value={`${streak?.longest_streak_weeks ?? 0}w`} />
      </div>

      <div className="mt-5 flex gap-1 rounded-full border border-border bg-surface p-1">
        {([
          ["all", "All"],
          ["category", "By Category"],
          ["month", "By Month"],
        ] as [FilterMode, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              setMode(k);
              setFilterValue("all");
            }}
            className={
              "flex-1 rounded-full py-1.5 text-[10px] font-bold tracking-wide " +
              (mode === k ? "bg-teal text-background" : "text-muted-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "category" && categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill active={filterValue === "all"} onClick={() => setFilterValue("all")}>All</Pill>
          {categories.map((c) => (
            <Pill key={c} active={filterValue === c} onClick={() => setFilterValue(c)}>
              {CATEGORY_LABEL[c] ?? c}
            </Pill>
          ))}
        </div>
      )}
      {mode === "month" && months.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill active={filterValue === "all"} onClick={() => setFilterValue("all")}>All</Pill>
          {months.map((m) => {
            const [y, mm] = m.split("-");
            const label = new Date(Number(y), Number(mm) - 1, 1).toLocaleString(undefined, { month: "short", year: "numeric" });
            return (
              <Pill key={m} active={filterValue === m} onClick={() => setFilterValue(m)}>
                {label}
              </Pill>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-[11px] font-bold tracking-[0.25em] text-muted-foreground">ACTIVITY LOG</p>
      <div className="mt-2 space-y-2">
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
            No completed sessions for this filter.
          </p>
        )}
        {filtered.map((l) => (
          <div key={l.id} className="rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-start gap-3">
              <Trophy size={14} className="mt-0.5 text-teal" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{l.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(l.last_watched_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · <Clock size={10} className="inline" /> {l.duration_minutes} min
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <Tag>{CATEGORY_LABEL[l.category] ?? l.category}</Tag>
              <Tag>{l.position === "goalie" ? "Goalie" : "Player"}</Tag>
              <Tag className="capitalize">{l.difficulty}</Tag>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2 text-center">
      <p className="font-display text-base font-bold">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1 text-[10px] font-bold " +
        (active ? "bg-teal text-background" : "border border-border bg-surface text-muted-foreground")
      }
    >
      {children}
    </button>
  );
}

function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={"rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted-foreground " + (className ?? "")}>
      {children}
    </span>
  );
}

// keep Flame import used to satisfy linter when extending later
void Flame;