import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Clock } from "lucide-react";
import { CLIP_TYPES, ClipType, VideoClip, fmtDuration, fmtShortDate } from "@/lib/mock-videos";

const FILTER_TYPES: (ClipType | "All")[] = ["All", ...CLIP_TYPES.filter((t) => t !== "Other")];

export function VideosGrid({ clips, showApprovalBadges }: { clips: VideoClip[]; showApprovalBadges?: boolean }) {
  const [filter, setFilter] = useState<ClipType | "All">("All");
  const visible = filter === "All" ? clips : clips.filter((c) => c.type === filter);

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-2">
        {FILTER_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold " +
              (filter === t ? "bg-teal text-background" : "border border-border text-muted-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-center text-[12px] text-muted-foreground">No clips yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {visible.map((c) => (
            <Link
              key={c.id}
              to="/media/clip/$clipId"
              params={{ clipId: c.id }}
              className="group overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="relative aspect-video bg-gradient-to-br from-surface-2 to-background">
                <div className="absolute inset-0 grid place-items-center">
                  <Play size={28} className="text-white/80" />
                </div>
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Clock size={10} /> {fmtDuration(c.durationSec)}
                </span>
                {showApprovalBadges && c.pendingApproval && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-bold text-background">
                    Pending approval
                  </span>
                )}
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[9px] font-bold text-teal">{c.type}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtShortDate(c.createdAt)}</span>
                </div>
                {c.note && <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{c.note}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}