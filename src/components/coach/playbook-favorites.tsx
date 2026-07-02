import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Clock, Calendar, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { usePlaybookFavorites } from "@/hooks/usePlaybookFavorites";

type Filter = "all" | "drill" | "session" | "camp";

type DrillRow = { id: string; title: string; duration_minutes: number | null; thumbnail_url: string | null };
type CampRow = { id: string; name: string; num_days: number };
type SavedSession = { id: string; name: string; totalMins: number; blocks: { uid: string; drillId: string; mins: number }[] };

const MOCK_DRILLS: { id: string; title: string; tag: string }[] = [
  { id: "fav-mock-edge", title: "Edge Mastery Series", tag: "Skating" },
  { id: "fav-mock-slip", title: "Slip Deke Figure 8", tag: "Slip Training" },
  { id: "fav-mock-dzc", title: "Defensive Zone Coverage", tag: "GameIQ" },
];

const MOCK_SESSIONS: { id: string; name: string; meta: string }[] = [
  { id: "fav-mock-elite", name: "Elite Demo — Thu Jul 3", meta: "90 min · 6 blocks" },
];

function readSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try { const r = window.localStorage.getItem("pxf:sessions:v2"); return r ? JSON.parse(r) : []; } catch { return []; }
}

export function PlaybookFavorites() {
  const [filter, setFilter] = useState<Filter>("all");
  const drillFav = useFavorites();
  const pf = usePlaybookFavorites();
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [camps, setCamps] = useState<CampRow[]>([]);
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    setSessions(readSessions().filter((s) => pf.sessionIds.includes(s.id)));
  }, [pf.sessionIds]);

  useEffect(() => {
    (async () => {
      if (drillFav.ids.length === 0) { setDrills([]); return; }
      const { data } = await supabase.from("drills").select("id,title,duration_minutes,thumbnail_url").in("id", drillFav.ids);
      setDrills((data ?? []) as DrillRow[]);
    })();
  }, [drillFav.ids]);

  useEffect(() => {
    (async () => {
      if (pf.campIds.length === 0) { setCamps([]); return; }
      const { data } = await supabase.from("camp_templates").select("id,name,num_days").in("id", pf.campIds);
      setCamps((data ?? []) as CampRow[]);
    })();
  }, [pf.campIds]);

  const total = drills.length + sessions.length + camps.length + MOCK_DRILLS.length + MOCK_SESSIONS.length;
  const showDrills = filter === "all" || filter === "drill";
  const showSessions = filter === "all" || filter === "session";
  const showCamps = filter === "all" || filter === "camp";

  return (
    <div className="pt-1">
      <div className="flex gap-1 overflow-x-auto pb-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All ({total})</Chip>
        <Chip active={filter === "drill"} onClick={() => setFilter("drill")}>Drills ({drills.length + MOCK_DRILLS.length})</Chip>
        <Chip active={filter === "session"} onClick={() => setFilter("session")}>Sessions ({sessions.length + MOCK_SESSIONS.length})</Chip>
        <Chip active={filter === "camp"} onClick={() => setFilter("camp")}>Camps ({camps.length})</Chip>
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center">
          <Heart size={20} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold text-foreground">No favorites yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Tap the heart on any drill, session, or camp.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {showDrills && (drills.length > 0 || MOCK_DRILLS.length > 0) && (
            <Section title="Drills">
              {MOCK_DRILLS.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-teal"><Dumbbell size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{d.title}</p>
                    <p className="text-[10px] uppercase tracking-wider text-teal">{d.tag}</p>
                  </div>
                  <Heart size={14} className="fill-red-500 text-red-500" />
                </div>
              ))}
              {drills.map((d) => (
                <Link key={d.id} to="/drill-detail/$drillId" params={{ drillId: d.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-teal"><Dumbbell size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground">{d.duration_minutes ?? 0} min</p>
                  </div>
                  <Heart size={14} className="fill-red-500 text-red-500" />
                </Link>
              ))}
            </Section>
          )}
          {showSessions && (sessions.length > 0 || MOCK_SESSIONS.length > 0) && (
            <Section title="Sessions">
              {MOCK_SESSIONS.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-teal"><Clock size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.meta}</p>
                  </div>
                  <Heart size={14} className="fill-red-500 text-red-500" />
                </div>
              ))}
              {sessions.map((s) => (
                <Link key={s.id} to="/session-detail/$sessionId" params={{ sessionId: s.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-teal"><Clock size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.totalMins} min · {s.blocks?.length ?? 0} drills</p>
                  </div>
                  <Heart size={14} className="fill-red-500 text-red-500" />
                </Link>
              ))}
            </Section>
          )}
          {showCamps && camps.length > 0 && (
            <Section title="Camp Templates">
              {camps.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-teal"><Calendar size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.num_days}-day template</p>
                  </div>
                  <Heart size={14} className="fill-red-500 text-red-500" />
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold " + (active ? "border-teal bg-teal text-background" : "border-border bg-surface text-muted-foreground")}>
      {children}
    </button>
  );
}