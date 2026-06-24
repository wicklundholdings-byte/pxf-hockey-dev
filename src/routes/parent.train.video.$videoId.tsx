import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Video = {
  id: string;
  title: string;
  category: string;
  position: string;
  age_group: string | null;
  difficulty: string;
  duration_minutes: number;
  instructor_name: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  published_at: string;
};

export const Route = createFileRoute("/parent/train/video/$videoId")({
  head: () => ({ meta: [{ title: "Training session — PXF Hockey" }] }),
  component: VideoPlayer,
});

function VideoPlayer() {
  const { videoId } = useParams({ from: "/parent/train/video/$videoId" });
  const navigate = useNavigate();
  const { user } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [nextUp, setNextUp] = useState<Video | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: v } = await supabase.from("dryland_videos").select("*").eq("id", videoId).maybeSingle();
      setVideo((v ?? null) as Video | null);

      if (v) {
        const { data: more } = await supabase
          .from("dryland_videos")
          .select("*")
          .eq("is_published", true)
          .or(`position.eq.${v.position},position.eq.both`)
          .neq("id", v.id)
          .order("published_at", { ascending: false })
          .limit(1);
        setNextUp(((more?.[0]) ?? null) as Video | null);
      }
    })();
  }, [videoId]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: kids } = await supabase
        .from("attendees")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at")
        .limit(1);
      const id = kids?.[0]?.id ?? null;
      setAthleteId(id);
      if (id) {
        const { data: prog } = await supabase
          .from("dryland_watch_progress")
          .select("watched_seconds, completed")
          .eq("athlete_id", id)
          .eq("video_id", videoId)
          .maybeSingle();
        if (prog) {
          setWatchedSeconds(prog.watched_seconds ?? 0);
          setCompleted(!!prog.completed);
        }
      }
    })();
  }, [user?.id, videoId]);

  const save = async (sec: number, done: boolean) => {
    if (!athleteId) return;
    await supabase.from("dryland_watch_progress").upsert(
      {
        athlete_id: athleteId,
        video_id: videoId,
        watched_seconds: Math.max(0, Math.floor(sec)),
        completed: done,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "athlete_id,video_id" },
    );
  };

  const onTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0;
    setWatchedSeconds(t);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => save(t, false), 1500);
  };

  const markComplete = async () => {
    setCompleted(true);
    await save(watchedSeconds, true);
  };

  if (!video) return <div className="px-5 pt-6 text-sm text-muted-foreground">Loading…</div>;

  const drills = [
    { name: "Warm-up", sets: "1 round", instruction: "Light edges, ankle mobility, wrist rolls." },
    { name: "Main set", sets: `3 sets · ${video.duration_minutes >= 20 ? "12" : "8"} reps`, instruction: "Focus on technique over speed. Reset between sets." },
    { name: "Cool down", sets: "2 min", instruction: "Slow stretch — hips, hamstrings, shoulders." },
  ];

  return (
    <div className="pb-32">
      <div className="flex items-center gap-2 px-5 pt-5">
        <button onClick={() => navigate({ to: "/parent/train" })} className="grid h-9 w-9 place-items-center rounded-full bg-surface">
          <ArrowLeft size={16} />
        </button>
        <p className="flex-1 truncate text-sm font-semibold text-foreground">{video.title}</p>
      </div>

      <div className="mt-3 px-5">
        <div className="relative overflow-hidden rounded-3xl bg-surface-2" style={{ aspectRatio: "16/9" }}>
          {video.video_url ? (
            <video
              ref={videoRef}
              src={video.video_url}
              poster={video.thumbnail_url ?? undefined}
              controls
              playsInline
              onTimeUpdate={onTimeUpdate}
              onEnded={markComplete}
              className="h-full w-full object-cover"
            />
          ) : video.thumbnail_url ? (
            <>
              <img src={video.thumbnail_url} alt={video.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-background/90">
                  <Play size={22} className="text-foreground" fill="currentColor" />
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-brand" />
          )}
        </div>
      </div>

      <div className="px-5 pt-4">
        <h1 className="text-xl font-bold text-foreground">{video.title}</h1>
        <p className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-teal">
          <span>{video.difficulty}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {video.duration_minutes}m</span>
          {video.age_group && <span>· {video.age_group}</span>}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{video.instructor_name ?? "PXF Coach"}</p>
      </div>

      <div className="mt-5 px-5">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-muted-foreground">DRILL BREAKDOWN</p>
        <div className="mt-2 space-y-2">
          {drills.map((d, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-surface p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{d.name}</p>
                <p className="text-[11px] font-semibold text-teal">{d.sets}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{d.instruction}</p>
            </div>
          ))}
        </div>
      </div>

      {nextUp && (
        <div className="mt-6 px-5">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-muted-foreground">NEXT UP</p>
          <Link
            to="/parent/train/video/$videoId"
            params={{ videoId: nextUp.id }}
            className="mt-2 flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3"
          >
            {nextUp.thumbnail_url ? (
              <img src={nextUp.thumbnail_url} alt={nextUp.title} className="h-14 w-20 rounded-xl object-cover" />
            ) : (
              <div className="h-14 w-20 rounded-xl bg-gradient-brand" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{nextUp.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock size={10} /> {nextUp.duration_minutes}m · {nextUp.difficulty}
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-background/95 p-4 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),1rem)]">
        <button
          onClick={markComplete}
          disabled={completed}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          <CheckCircle2 size={16} /> {completed ? "Completed" : "Mark complete"}
        </button>
      </div>
    </div>
  );
}