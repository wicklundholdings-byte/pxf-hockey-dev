import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, X, ChevronLeft, ChevronRight, Film, Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/media")({
  component: TeamMediaScreen,
});

type MediaItem = { id: string; title: string; type: "video" | "photo" };
type EventGroup = {
  id: string;
  category: "GAME" | "PRACTICE" | "TOURNAMENT" | "HIGHLIGHTS";
  title: string;
  date?: string;
  items: MediaItem[];
};

const FILTERS = ["All", "Games", "Practices", "Highlights", "Tournaments"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_TO_CATEGORY: Record<Exclude<Filter, "All">, EventGroup["category"]> = {
  Games: "GAME",
  Practices: "PRACTICE",
  Highlights: "HIGHLIGHTS",
  Tournaments: "TOURNAMENT",
};

const GROUPS: EventGroup[] = [
  {
    id: "g1",
    category: "GAME",
    title: "vs. Langley Trappers",
    date: "Jun 22",
    items: [
      { id: "g1-v1", title: "Game vs Langley", type: "video" },
      { id: "g1-p1", title: "Post-game Celebration", type: "photo" },
    ],
  },
  {
    id: "p1",
    category: "PRACTICE",
    title: "Surrey Sport and Leisure",
    date: "Jun 20",
    items: [
      { id: "p1-v1", title: "Practice Highlights", type: "video" },
      { id: "p1-v2", title: "Skating Drills", type: "video" },
      { id: "p1-p1", title: "Practice Candids", type: "photo" },
    ],
  },
  {
    id: "p2",
    category: "PRACTICE",
    title: "Surrey Sport and Leisure",
    date: "Jun 18",
    items: [{ id: "p2-v1", title: "Power Play Session", type: "video" }],
  },
  {
    id: "h1",
    category: "HIGHLIGHTS",
    title: "Season Highlights",
    items: [{ id: "h1-v1", title: "Top Plays June", type: "video" }],
  },
];

function TeamMediaScreen() {
  const { teamId } = Route.useParams();
  const [filter, setFilter] = useState<Filter>("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const visibleGroups = useMemo(() => {
    if (filter === "All") return GROUPS;
    const cat = FILTER_TO_CATEGORY[filter];
    return GROUPS.filter((g) => g.category === cat);
  }, [filter]);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          to="/coach/teams/$teamId/more"
          params={{ teamId } as any}
          className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-surface px-3 py-1.5 text-[12px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
        >
          <ChevronLeft size={14} />
          <span>More</span>
        </Link>
        <h1 className="flex-1 text-center text-sm font-bold">Media</h1>
        <button className="rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-background shadow-glow-teal active:opacity-90">
          + Upload
        </button>
      </div>

      {/* Filter chips */}
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setExpanded(null);
              }}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors " +
                (active ? "bg-teal text-background" : "bg-surface text-muted-foreground border border-border")
              }
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Event groups */}
      {visibleGroups.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No media in this category yet
        </div>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((g) => {
            const isExpanded = expanded === g.id;
            return (
              <section key={g.id}>
                <div className="mb-2 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {g.category}
                    </p>
                    <p className="truncate text-sm font-bold">
                      {g.title}
                      {g.date ? <span className="font-normal text-muted-foreground"> · {g.date}</span> : null}
                    </p>
                  </div>
                  {g.items.length > 1 && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : g.id)}
                      className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-teal"
                    >
                      {isExpanded ? "Collapse" : "See All"}
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>

                {isExpanded ? (
                  <div className="grid grid-cols-2 gap-2">
                    {g.items.map((item) => (
                      <MediaCard key={item.id} item={item} onOpen={() => setPreview(item)} />
                    ))}
                  </div>
                ) : (
                  <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
                    {g.items.map((item) => (
                      <div key={item.id} className="w-[150px] shrink-0">
                        <MediaCard item={item} onOpen={() => setPreview(item)} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Fullscreen Preview */}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={() => setPreview(null)}>
          <div className="absolute top-0 right-0 z-10 p-4">
            <button
              onClick={() => setPreview(null)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 backdrop-blur-sm"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              {preview.type === "video" ? (
                <Film size={48} className="text-foreground/30" />
              ) : (
                <Camera size={48} className="text-foreground/30" />
              )}
              <p className="text-sm font-semibold text-white">{preview.title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaCard({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="relative block h-[100px] w-full overflow-hidden rounded-xl text-left"
      style={{ backgroundColor: "#131313" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {item.type === "video" ? (
          <Film size={24} className="text-foreground/20" />
        ) : (
          <Camera size={24} className="text-foreground/20" />
        )}
      </div>
      {item.type === "video" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-lg">
            <Play size={16} className="ml-0.5 text-black" fill="black" />
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pb-2 pt-6">
        <p className="truncate text-[11px] font-bold text-white">{item.title}</p>
      </div>
    </button>
  );
}
