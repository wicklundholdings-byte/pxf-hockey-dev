import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Play } from "lucide-react";
import { listAthleteMedia, deleteAthleteMedia } from "@/lib/athlete-media.functions";
import { VideoAnalysisPlayer } from "@/components/video-analysis-player";

type Media = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  annotation_status: "raw" | "reviewed" | "annotated";
  recorded_at: string;
  session_id: string | null;
};

export function AthleteMediaTab({ athleteId, athleteName, readOnly = false }: { athleteId: string; athleteName?: string; readOnly?: boolean }) {
  const list = useServerFn(listAthleteMedia);
  const del = useServerFn(deleteAthleteMedia);
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Media | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const rows = (await list({ data: { athleteId } })) as Media[];
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  return (
    <div className="space-y-3">
      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-xs text-muted-foreground">No clips yet.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {items.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <button onClick={() => setOpen(m)} className="relative block aspect-video w-full bg-black">
              {m.thumbnail_url ? (
                <img src={m.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-white">
                  <Play size={24} />
                </div>
              )}
              <span className={"absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold " + statusClass(m.annotation_status)}>
                {m.annotation_status.toUpperCase()}
              </span>
            </button>
            <div className="flex items-start justify-between gap-2 p-2">
              <div className="min-w-0">
                <p className="truncate text-[10px] text-muted-foreground">{new Date(m.recorded_at).toLocaleDateString()}</p>
                {m.caption && <p className="truncate text-[11px] font-semibold text-foreground">{m.caption}</p>}
              </div>
              {!readOnly && (
                <button
                  onClick={async () => {
                    if (!confirm("Delete clip?")) return;
                    await del({ data: { id: m.id } });
                    refresh();
                  }}
                  className="text-rose-500"
                  aria-label="Delete clip"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background p-3">
          <button onClick={() => setOpen(null)} className="self-end rounded-md border border-border bg-surface px-3 py-1 text-xs">
            Close
          </button>
          <div className="mt-2">
            <VideoAnalysisPlayer
              videoUrl={open.video_url}
              mediaId={open.id}
              athleteName={athleteName}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function statusClass(s: string) {
  if (s === "annotated") return "bg-teal text-background";
  if (s === "reviewed") return "bg-amber-400 text-background";
  return "bg-surface text-muted-foreground";
}