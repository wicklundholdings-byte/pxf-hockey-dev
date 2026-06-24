import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Dumbbell,
  Target,
  Zap,
  Snowflake,
  StretchHorizontal,
  Lock,
  Play,
  Clock,
  ChevronRight,
  Sparkles,
  UserPlus,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentTier } from "@/hooks/use-tier";

type Position = "player" | "goalie";
type VideoCategory =
  | "stickhandling"
  | "shooting"
  | "strength_fitness"
  | "synthetic_ice"
  | "mobility_flexibility";

type Video = {
  id: string;
  title: string;
  category: VideoCategory;
  position: "player" | "goalie" | "both";
  age_group: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration_minutes: number;
  instructor_name: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  published_at: string;
};

type Athlete = { id: string; full_name: string; preferred_position: Position };
type Progress = { video_id: string; watched_seconds: number; completed: boolean; last_watched_at: string };
type Teammate = {
  id: string; // team_players.id
  athlete_id: string | null;
  display_name: string;
  position: string | null;
  jersey_number: string | null;
  team_id: string;
  team_name: string;
};

const PLAYER_CATS: { id: VideoCategory; label: string; icon: typeof Dumbbell }[] = [
  { id: "stickhandling", label: "Stickhandling", icon: Target },
  { id: "shooting", label: "Shooting", icon: Zap },
  { id: "strength_fitness", label: "Strength & Fitness", icon: Dumbbell },
];
const GOALIE_CATS: { id: VideoCategory; label: string; icon: typeof Dumbbell }[] = [
  { id: "synthetic_ice", label: "Synthetic Ice", icon: Snowflake },
  { id: "mobility_flexibility", label: "Mobility", icon: StretchHorizontal },
  { id: "strength_fitness", label: "Strength & Fitness", icon: Dumbbell },
];

const AGES = ["U8", "U10", "U12", "U14", "U16", "U18", "Competitive"];
const DURATIONS = [10, 15, 20, 30];

export const Route = createFileRoute("/parent/train")({
  head: () => ({ meta: [{ title: "Train — PXF Hockey" }] }),
  component: TrainScreen,
});

function TrainScreen() {
  const { user } = useAuth();
  const { tier, loading: tierLoading } = useCurrentTier();
  const subscribed = !!tier && !tierLoading;

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [selectedTeammateIds, setSelectedTeammateIds] = useState<string[]>([]);
  const [teammatePickerOpen, setTeammatePickerOpen] = useState(false);
  const [position, setPosition] = useState<Position>("player");
  const [age, setAge] = useState<string | null>(null);
  const [dur, setDur] = useState<number | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);

  const athleteId = selectedIds[0] ?? null;

  // Load roster + remember position from active athlete
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("attendees")
        .select("id, full_name, preferred_position")
        .eq("owner_id", user.id)
        .order("full_name");
      const rows = (data ?? []) as Athlete[];
      setAthletes(rows);
      if (rows[0]) {
        setSelectedIds([rows[0].id]);
        setPosition(rows[0].preferred_position ?? "player");
      }
    })();
  }, [user?.id]);

  // Load teammates from teams my athletes are on
  useEffect(() => {
    if (athletes.length === 0) return;
    (async () => {
      const myAthleteIds = athletes.map((a) => a.id);
      const { data: mine } = await supabase
        .from("team_players")
        .select("team_id")
        .in("athlete_id", myAthleteIds);
      const teamIds = Array.from(new Set((mine ?? []).map((r) => r.team_id)));
      if (teamIds.length === 0) {
        setTeammates([]);
        return;
      }
      const { data: rows } = await supabase
        .from("team_players")
        .select("id, athlete_id, display_name, position, jersey_number, team_id, teams(name)")
        .in("team_id", teamIds);
      const list: Teammate[] = (rows ?? [])
        .filter((r: any) => !r.athlete_id || !myAthleteIds.includes(r.athlete_id))
        .map((r: any) => ({
          id: r.id,
          athlete_id: r.athlete_id,
          display_name: r.display_name,
          position: r.position,
          jersey_number: r.jersey_number,
          team_id: r.team_id,
          team_name: r.teams?.name ?? "Team",
        }));
      setTeammates(list);
    })();
  }, [athletes]);

  // Load videos
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("dryland_videos")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      setVideos((data ?? []) as Video[]);
    })();
  }, []);

  // Load progress for active athlete
  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      const { data } = await supabase
        .from("dryland_watch_progress")
        .select("video_id, watched_seconds, completed, last_watched_at")
        .eq("athlete_id", athleteId);
      setProgress((data ?? []) as Progress[]);
    })();
  }, [athleteId]);

  // Persist position toggle to the athlete profile
  const onTogglePosition = async (p: Position) => {
    setPosition(p);
    if (athleteId) {
      await supabase.from("attendees").update({ preferred_position: p }).eq("id", athleteId);
    }
  };

  const toggleAthlete = (a: Athlete) => {
    setSelectedIds((prev) => {
      const has = prev.includes(a.id);
      // Don't allow deselecting the last one
      if (has && prev.length === 1) return prev;
      const next = has ? prev.filter((x) => x !== a.id) : [...prev, a.id];
      // When switching to a new primary, sync position
      if (!has && prev.length === 0) setPosition(a.preferred_position ?? "player");
      return next;
    });
  };

  const toggleTeammate = (id: string) => {
    setSelectedTeammateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const teammatesByTeam = useMemo(() => {
    const map = new Map<string, { team_name: string; players: Teammate[] }>();
    for (const t of teammates) {
      if (!map.has(t.team_id)) map.set(t.team_id, { team_name: t.team_name, players: [] });
      map.get(t.team_id)!.players.push(t);
    }
    for (const g of map.values()) g.players.sort((a, b) => a.display_name.localeCompare(b.display_name));
    return Array.from(map.values());
  }, [teammates]);

  const selectedTeammates = teammates.filter((t) => selectedTeammateIds.includes(t.id));
  const totalSelected = selectedIds.length + selectedTeammateIds.length;

  const cats = position === "player" ? PLAYER_CATS : GOALIE_CATS;

  const positionVideos = useMemo(
    () => videos.filter((v) => v.position === position || v.position === "both"),
    [videos, position],
  );

  const filtered = useMemo(
    () =>
      positionVideos.filter(
        (v) =>
          (!age || v.age_group === age) &&
          (!dur || v.duration_minutes === dur),
      ),
    [positionVideos, age, dur],
  );

  const featured = positionVideos.find((v) => v.is_featured) ?? null;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = positionVideos
    .filter((v) => new Date(v.published_at).getTime() >= weekAgo)
    .slice(0, 5);

  const inProgress = progress
    .filter((p) => !p.completed && p.watched_seconds > 0)
    .sort((a, b) => +new Date(b.last_watched_at) - +new Date(a.last_watched_at))[0];
  const inProgressVideo = inProgress
    ? videos.find((v) => v.id === inProgress.video_id) ?? null
    : null;
  const activeAthlete = athletes.find((a) => a.id === athleteId) ?? null;

  return (
    <div className="px-5 pt-5 pb-6">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">DRYLAND TRAINING</p>
      <h1 className="mt-1 text-3xl font-bold text-foreground">Train</h1>

      {/* Athlete selector — multi-select */}
      {athletes.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 pb-1">
            {athletes.map((a) => {
              const on = selectedIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleAthlete(a)}
                  className={
                    "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition-colors " +
                    (on ? "bg-foreground text-background" : "bg-surface text-muted-foreground")
                  }
                >
                  {on && <Check size={11} />}
                  {a.full_name}
                </button>
              );
            })}
            {selectedTeammates.map((t) => (
              <span
                key={t.id}
                className="flex shrink-0 items-center gap-1 rounded-full bg-teal/15 px-3 py-1 text-[11px] font-bold text-teal"
              >
                {t.display_name}
                <button
                  type="button"
                  onClick={() => toggleTeammate(t.id)}
                  aria-label={`Remove ${t.display_name}`}
                  className="grid h-3.5 w-3.5 place-items-center rounded-full bg-teal/30"
                >
                  <X size={9} />
                </button>
              </span>
            ))}
            {teammates.length > 0 && (
              <button
                type="button"
                onClick={() => setTeammatePickerOpen(true)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                <UserPlus size={11} /> Add Teammates
              </button>
            )}
          </div>
          {totalSelected > 1 && (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-teal">
              Training together · {totalSelected} athletes
            </p>
          )}
        </>
      )}

      {/* Player / Goalie toggle */}
      <div className="mt-4 inline-flex rounded-full bg-surface p-1">
        {(["player", "goalie"] as const).map((p) => (
          <button
            key={p}
            onClick={() => onTogglePosition(p)}
            className={
              "min-w-[88px] rounded-full px-4 py-1.5 text-xs font-bold transition-colors " +
              (position === p ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")
            }
          >
            {p === "player" ? "Player" : "Goalie"}
          </button>
        ))}
      </div>

      {/* Category cards: positions 1+2 fade-swap on toggle, position 3 stays */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {cats.map((c, idx) => {
          const Icon = c.icon;
          const keepStable = idx === 2;
          return (
            <div
              key={`${keepStable ? "static" : position}-${idx}`}
              className={
                "flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-surface p-3 " +
                (keepStable ? "" : "animate-fade-in")
              }
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand">
                <Icon size={18} className="text-primary-foreground" />
              </div>
              <p className="text-center text-[11px] font-bold leading-tight text-foreground">{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="mt-4 -mx-5 overflow-x-auto px-5">
        <div className="flex gap-1.5 pb-1">
          {AGES.map((a) => (
            <button
              key={a}
              onClick={() => setAge((cur) => (cur === a ? null : a))}
              className={
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold " +
                (age === a ? "bg-teal text-background" : "bg-surface text-muted-foreground")
              }
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 -mx-5 overflow-x-auto px-5">
        <div className="flex gap-1.5 pb-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDur((cur) => (cur === d ? null : d))}
              className={
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold " +
                (dur === d ? "bg-volt/20 text-volt" : "bg-surface text-muted-foreground")
              }
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Continue Training */}
      {inProgressVideo && activeAthlete && (
        <Link
          to="/parent/train/video/$videoId"
          params={{ videoId: inProgressVideo.id }}
          className="mt-5 flex items-center gap-3 rounded-2xl border border-volt/40 bg-volt/10 p-3"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt/20">
            <Play size={16} className="text-volt" fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-volt">Continue · {activeAthlete.full_name}</p>
            <p className="mt-0.5 truncate text-sm font-bold text-foreground">{inProgressVideo.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {Math.min(
                99,
                Math.round((inProgress!.watched_seconds / Math.max(1, inProgressVideo.duration_minutes * 60)) * 100),
              )}
              % complete
            </p>
          </div>
          <span className="rounded-full bg-volt px-3 py-1 text-[11px] font-bold text-background">Resume</span>
        </Link>
      )}

      {/* Featured */}
      {featured && (
        <FeaturedCard video={featured} locked={!subscribed} />
      )}

      {/* New This Week */}
      {newThisWeek.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-muted-foreground">NEW THIS WEEK</p>
          </div>
          <div className="mt-2 -mx-5 overflow-x-auto px-5">
            <div className="flex gap-3 pb-1">
              {newThisWeek.map((v) => (
                <SmallCard key={v.id} video={v} locked={!subscribed} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Sessions */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-muted-foreground">ALL SESSIONS</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {filtered.map((v) => (
            <GridCard key={v.id} video={v} locked={!subscribed} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">No sessions match those filters.</p>
        )}
      </div>

      {teammatePickerOpen && (
        <TeammatePicker
          groups={teammatesByTeam}
          selectedIds={selectedTeammateIds}
          onToggle={toggleTeammate}
          onClose={() => setTeammatePickerOpen(false)}
        />
      )}
    </div>
  );
}

function TeammatePicker({
  groups,
  selectedIds,
  onToggle,
  onClose,
}: {
  groups: { team_name: string; players: Teammate[] }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[75vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Add teammates</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-surface">
            <X size={14} />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Select teammates training with your athletes today.
        </p>
        {groups.length === 0 ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">No teammates available.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {groups.map((g) => (
              <div key={g.team_name}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {g.team_name}
                </p>
                <div className="mt-2 space-y-1.5">
                  {g.players.map((p) => {
                    const on = selectedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => onToggle(p.id)}
                        className={
                          "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors " +
                          (on
                            ? "border-teal bg-teal/10"
                            : "border-border/60 bg-surface hover:border-border")
                        }
                      >
                        <div className="flex items-center gap-2">
                          {p.jersey_number && (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[10px] font-bold text-foreground">
                              #{p.jersey_number}
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{p.display_name}</p>
                            {p.position && (
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {p.position}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={
                            "grid h-5 w-5 place-items-center rounded-full " +
                            (on ? "bg-teal text-background" : "bg-surface-2 text-muted-foreground")
                          }
                        >
                          {on && <Check size={12} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function FeaturedCard({ video, locked }: { video: Video; locked: boolean }) {
  const inner = (
    <div className="relative mt-5 overflow-hidden rounded-3xl bg-surface" style={{ aspectRatio: "16/9" }}>
      {video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt={video.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-brand" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-teal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
        <Sparkles size={11} /> Featured
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-bold text-foreground">
        <Clock size={10} /> {video.duration_minutes}m
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-lg font-bold text-white">{video.title}</p>
        <p className="mt-0.5 text-xs text-white/70">
          {video.instructor_name ?? "PXF Coach"} · {video.difficulty}
        </p>
      </div>
      {locked && <LockOverlay />}
    </div>
  );
  return locked ? (
    <UpgradePrompt>{inner}</UpgradePrompt>
  ) : (
    <Link to="/parent/train/video/$videoId" params={{ videoId: video.id }}>
      {inner}
    </Link>
  );
}

function SmallCard({ video, locked }: { video: Video; locked: boolean }) {
  const inner = (
    <div className="relative w-44 overflow-hidden rounded-2xl bg-surface">
      <div className="relative" style={{ aspectRatio: "16/10" }}>
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-brand" />
        )}
        <div className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
          New
        </div>
        {locked && <LockOverlay small />}
      </div>
      <div className="p-2.5">
        <p className="truncate text-xs font-bold text-foreground">{video.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock size={10} /> {video.duration_minutes}m · {video.difficulty}
        </p>
      </div>
    </div>
  );
  return locked ? (
    <UpgradePrompt>{inner}</UpgradePrompt>
  ) : (
    <Link to="/parent/train/video/$videoId" params={{ videoId: video.id }} className="shrink-0">
      {inner}
    </Link>
  );
}

function GridCard({ video, locked }: { video: Video; locked: boolean }) {
  const inner = (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="relative" style={{ aspectRatio: "16/10" }}>
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-brand" />
        )}
        <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-bold text-foreground">
          <Clock size={9} /> {video.duration_minutes}m
        </div>
        {locked && <LockOverlay small />}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-xs font-bold leading-snug text-foreground">{video.title}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-teal">{video.difficulty}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{video.instructor_name ?? "PXF Coach"}</p>
      </div>
    </div>
  );
  return locked ? (
    <UpgradePrompt>{inner}</UpgradePrompt>
  ) : (
    <Link to="/parent/train/video/$videoId" params={{ videoId: video.id }}>
      {inner}
    </Link>
  );
}

function LockOverlay({ small }: { small?: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-background/55 backdrop-blur-[1px]">
      <div className="grid place-items-center rounded-full bg-background/90 p-2.5">
        <Lock size={small ? 14 : 20} className="text-foreground" />
      </div>
    </div>
  );
}

function UpgradePrompt({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[480px] rounded-t-3xl bg-background p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-brand">
              <Lock size={20} className="text-primary-foreground" />
            </div>
            <h3 className="mt-3 text-center text-lg font-bold text-foreground">Unlock training</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Unlock all Player + Goalie training sessions for <span className="font-bold text-foreground">$7.99/month</span>.
            </p>
            <Link
              to="/membership"
              className="mt-5 flex w-full items-center justify-center gap-1 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground"
            >
              See plans <ChevronRight size={14} />
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full py-2 text-xs font-semibold text-muted-foreground"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}