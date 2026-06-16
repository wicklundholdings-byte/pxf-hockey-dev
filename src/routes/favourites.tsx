import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, BarChart3, Wrench, Heart, Layers, ChevronRight } from "lucide-react";
import { DRILLS, type Drill } from "@/data/pxf";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/favourites")({
  head: () => ({
    meta: [
      { title: "Favourites — PXF Hockey" },
      { name: "description", content: "Your saved drills, ready to train." },
      { property: "og:title", content: "Favourites — PXF Hockey" },
      { property: "og:description", content: "Your saved drills, ready to train." },
    ],
  }),
  component: Favourites,
});

function Favourites() {
  const { ids, toggle } = useFavorites();
  const saved = DRILLS.filter((d) => ids.includes(d.id));

  return (
    <div className="px-5 pt-4 pb-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-volt">SAVED</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Favourites</h1>
          <p className="mt-1 text-xs text-muted-foreground">Drills you've bookmarked for quick access.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-[11px] font-bold text-teal">
          <Heart size={12} fill="currentColor" /> {saved.length}
        </span>
      </div>

      {saved.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-border/60 bg-surface p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal/10 text-teal">
            <Heart size={22} />
          </div>
          <h2 className="mt-4 text-base font-bold text-foreground">No favourites yet</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tap the heart on any drill to save it here.</p>
          <Link to="/drills" className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-xs font-bold tracking-wide text-primary-foreground shadow-glow-teal">
            BROWSE DRILLS
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {saved.map((d) => (
            <FavoriteDrillCard key={d.id} d={d} onUnfavorite={() => toggle(d.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteDrillCard({ d, onUnfavorite }: { d: Drill; onUnfavorite: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface transition-colors hover:border-teal/40">
      <Link to="/drills/$drillId" params={{ drillId: d.id }} className="flex w-full gap-3 p-3">
        <div className="relative grid h-24 w-32 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-surface-2 to-background">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 30% 35%, #00E5D6 0, transparent 55%), radial-gradient(circle at 75% 75%, #39FF14 0, transparent 60%)" }} />
          <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal">
            <Play size={15} fill="currentColor" />
          </div>
          <span className="absolute bottom-1 left-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-volt backdrop-blur">L{d.level}</span>
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <p className="text-[10px] font-semibold tracking-wider text-teal">{d.category.toUpperCase()}</p>
          <h3 className="mt-0.5 truncate text-sm font-bold text-foreground">{d.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><BarChart3 size={11} className="text-teal" /> {d.difficulty}</span>
            <span className="flex items-center gap-1"><Layers size={11} className="text-volt" /> Level {d.level}</span>
            <span className="flex items-center gap-1"><Wrench size={11} /> {d.equipment.length} items</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {d.equipment.slice(0, 3).map((e) => (
              <span key={e} className="rounded-full border border-border/60 bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{e}</span>
            ))}
            {d.equipment.length > 3 && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">+{d.equipment.length - 3}</span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="self-center text-muted-foreground" />
      </Link>
      <button
        onClick={onUnfavorite}
        aria-label="Remove from favourites"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-teal/40 bg-teal/15 text-teal transition-colors hover:bg-teal/25"
      >
        <Heart size={14} fill="currentColor" />
      </button>
    </div>
  );
}