import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Camera, Play, Share2, Download, X } from "lucide-react";

export const Route = createFileRoute("/parent/media")({
  head: () => ({ meta: [{ title: "All Media — PXF Hockey" }] }),
  component: ParentAllMedia,
});

type Item = {
  id: string;
  athlete: string;
  tag: string;
  date: string;
  kind: "photo" | "video";
  icon: "puck" | "camera";
  session: string;
  note: string;
};

const ITEMS: Item[] = [
  { id: "m1", athlete: "Alex Dev", tag: "Edge Work", date: "Jul 5", kind: "video", icon: "puck", session: "Jul 5 Practice", note: "Good edge work on the left side. Watch knee bend." },
  { id: "m2", athlete: "Sam Dev", tag: "Skating", date: "Jul 3", kind: "video", icon: "puck", session: "Jul 3 Skating Session", note: "Strong crossovers — keep chest tall through the turn." },
  { id: "m3", athlete: "Team Photo", tag: "Lightning U14", date: "Jul 1", kind: "photo", icon: "camera", session: "Lightning U14 Team Photo", note: "Team photo from July 1 practice." },
  { id: "m4", athlete: "Alex Dev", tag: "Shooting", date: "Jun 28", kind: "video", icon: "puck", session: "Jun 28 Practice", note: "Quick release — work on weight transfer before the shot." },
  { id: "m5", athlete: "Sam Dev", tag: "Puck Control", date: "Jun 26", kind: "video", icon: "puck", session: "Jun 26 Skills Session", note: "Nice tight handles in traffic. Keep head up." },
  { id: "m6", athlete: "Alex Dev", tag: "Game Clip", date: "Jun 21", kind: "video", icon: "puck", session: "Jun 21 Game", note: "Excellent 2-on-1 read." },
];

const FILTERS = ["All", "Alex", "Sam", "Videos", "Photos"] as const;
type Filter = typeof FILTERS[number];

function ParentAllMedia() {
  const [filter, setFilter] = useState<Filter>("All");
  const [open, setOpen] = useState<Item | null>(null);

  const items = useMemo(() => {
    switch (filter) {
      case "Alex": return ITEMS.filter((i) => i.athlete.startsWith("Alex"));
      case "Sam": return ITEMS.filter((i) => i.athlete.startsWith("Sam"));
      case "Videos": return ITEMS.filter((i) => i.kind === "video");
      case "Photos": return ITEMS.filter((i) => i.kind === "photo");
      default: return ITEMS;
    }
  }, [filter]);

  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-24 text-foreground">
      <div className="flex items-center gap-3">
        <Link to="/parent" className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground" aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Recent Media</p>
          <h1 className="font-display text-2xl font-bold">All Media</h1>
        </div>
      </div>

      <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold " +
              (filter === f ? "bg-teal text-background" : "border border-border bg-surface text-muted-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((m) => (
          <button
            key={m.id}
            onClick={() => setOpen(m)}
            className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left"
          >
            <div className="flex aspect-square items-center justify-center bg-surface-2/40">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-2">
                {m.icon === "camera" ? (
                  <Camera size={24} className="text-muted-foreground" />
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <ellipse cx="12" cy="12" rx="9" ry="4" />
                    <path d="M3 12v3c0 2.2 4 4 9 4s9-1.8 9-4v-3" />
                  </svg>
                )}
              </div>
            </div>
            {m.kind === "video" && (
              <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-white">
                <Play size={11} />
              </span>
            )}
            <div className="border-t border-border bg-card px-2.5 py-2">
              <p className="truncate text-[12px] font-semibold text-foreground">{m.athlete}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                <span className="text-teal">{m.tag}</span> · {m.date}
              </p>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <p className="col-span-2 rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-xs text-muted-foreground">
            No media in this view.
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{open.athlete}</p>
              <p className="truncate text-[11px] text-muted-foreground">{open.session}</p>
            </div>
            <button onClick={() => setOpen(null)} className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center bg-black">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-surface-2">
              {open.icon === "camera" ? <Camera size={40} className="text-muted-foreground" /> : <Play size={40} className="text-white" />}
            </div>
          </div>
          <div className="border-t border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Coach Note</p>
            <p className="mt-1 text-sm text-foreground">{open.note}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface py-2.5 text-xs font-bold text-foreground">
                <Share2 size={14} /> Share
              </button>
              <button className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-background">
                <Download size={14} /> Save to Camera Roll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}