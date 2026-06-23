import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAthleteMedia, updateAthleteMedia } from "@/lib/athlete-media.functions";
import { VideoAnalysisPlayer } from "@/components/video-analysis-player";
import { Send } from "lucide-react";

type Media = {
  id: string;
  athlete_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  annotation_status: "raw" | "reviewed" | "annotated";
  recorded_at: string;
  is_shared: boolean;
};

export function SessionVideoReview({
  sessionId,
  athleteNames,
}: {
  sessionId: string;
  athleteNames?: Record<string, string>;
}) {
  const list = useServerFn(listAthleteMedia);
  const update = useServerFn(updateAthleteMedia);
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unreviewed">("all");
  const [open, setOpen] = useState<Media | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const rows = (await list({ data: { sessionId } })) as Media[];
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const grouped = useMemo(() => {
    const filtered = items.filter((m) => (filter === "all" ? true : m.annotation_status === "raw"));
    const map = new Map<string, Media[]>();
    for (const m of filtered) {
      const arr = map.get(m.athlete_id) ?? [];
      arr.push(m);
      map.set(m.athlete_id, arr);
    }
    return [...map.entries()];
  }, [items, filter]);

  async function shareAllAnnotated() {
    const targets = items.filter((m) => m.annotation_status === "annotated" && !m.is_shared);
    for (const t of targets) {
      await update({ data: { id: t.id, is_shared: true } });
    }
    refresh();
    alert(`Shared ${targets.length} clips with parent inboxes.`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "unreviewed")}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
        >
          <option value="all">All clips</option>
          <option value="unreviewed">Unreviewed only</option>
        </select>
        <button
          onClick={shareAllAnnotated}
          className="ml-auto flex items-center gap-1 rounded-md bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
        >
          <Send size={12} /> Send all annotated
        </button>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!loading && grouped.length === 0 && <p className="text-xs text-muted-foreground">No clips for this session.</p>}

      {grouped.map(([athleteId, clips]) => (
        <div key={athleteId} className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-teal">
            {athleteNames?.[athleteId] ?? `Athlete ${athleteId.slice(0, 6)}`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {clips.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpen(c)}
                className="relative overflow-hidden rounded-xl border border-border bg-surface text-left"
              >
                <div className="aspect-video bg-black">
                  {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex items-center justify-between p-1.5">
                  <span className="text-[9px] text-muted-foreground">{new Date(c.recorded_at).toLocaleTimeString()}</span>
                  <span className={"rounded-full px-1.5 py-0.5 text-[8px] font-bold " + (c.annotation_status === "annotated" ? "bg-teal text-background" : c.annotation_status === "reviewed" ? "bg-amber-400 text-background" : "bg-surface-2 text-muted-foreground")}>
                    {c.annotation_status.toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={async () => {
                await update({ data: { id: open.id, annotation_status: "reviewed" } });
                setOpen(null);
                refresh();
              }}
              className="rounded-md border border-border bg-surface px-3 py-1 text-xs"
            >
              Mark reviewed
            </button>
            <button onClick={() => setOpen(null)} className="rounded-md border border-border bg-surface px-3 py-1 text-xs">
              Close
            </button>
          </div>
          <VideoAnalysisPlayer
            videoUrl={open.video_url}
            mediaId={open.id}
            athleteName={athleteNames?.[open.athlete_id]}
            onSendToAthlete={async () => {
              await update({ data: { id: open.id, is_shared: true } });
              alert("Sent to parent inbox.");
              refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}