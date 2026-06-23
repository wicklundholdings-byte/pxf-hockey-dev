import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Star, Tag, Video, Calendar as CalIcon } from "lucide-react";
import { listSharedNotesForParent } from "@/lib/athlete-notes.functions";

export const Route = createFileRoute("/_authenticated/parent/updates")({
  component: ParentUpdates,
});

function ParentUpdates() {
  const fn = useServerFn(listSharedNotesForParent);
  const { data: notes = [] } = useQuery({
    queryKey: ["parent-shared-notes"],
    queryFn: () => fn({ data: {} }) as Promise<any[]>,
  });

  return (
    <div className="space-y-4 p-4">
      <Link to="/parent" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back
      </Link>
      <h1 className="font-display text-xl font-bold text-foreground">Coach Updates</h1>

      {notes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No updates from your coach yet.
        </div>
      )}

      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalIcon size={11} />
                {new Date(n.note_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                <span className="ml-2 font-semibold text-foreground">{n.attendees?.full_name}</span>
              </span>
              {n.session_rating != null && (
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={10} className={i < n.session_rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
                  ))}
                </span>
              )}
            </div>
            {n.drill_freetext?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {n.drill_freetext.map((t: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold text-teal">
                    <Tag size={9} /> {t}
                  </span>
                ))}
              </div>
            )}
            {n.written_notes && (
              <p className="mt-2 whitespace-pre-wrap text-xs text-foreground">{n.written_notes}</p>
            )}
            {n.athlete_note_videos?.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1">
                {n.athlete_note_videos.map((v: any) => (
                  <a key={v.id} href={v.video_url} target="_blank" rel="noreferrer"
                    className="grid aspect-square place-items-center overflow-hidden rounded-lg border border-border bg-surface">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Video size={16} className="text-muted-foreground" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}