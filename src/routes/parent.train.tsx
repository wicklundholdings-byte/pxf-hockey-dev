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
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>("player");
  const [age, setAge] = useState<string | null>(null);
  const [dur, setDur] = useState<number | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);

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
        setAthleteId(rows[0].id);
        setPosition(rows[0].preferred_position ?? "player");
      }
    })();
  }, [user?.id]);

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

      {/* Athlete selector (if multiple kids) */}
      {athletes.length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {athletes.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setAthleteId(a.id);
                setPosition(a.preferred_position ?? "player");
              }}
              className={
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold " +
                (a.id === athleteId ? "bg-foreground text-background" : "bg-surface text-muted-foreground")
              }
            >
              {a.full_name}
            </button>
          ))}
        </div>
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
    </div>
  );
}

function lockedHref(locked: boolean, videoId: string) {
  return locked ? "#locked" : undefined;
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