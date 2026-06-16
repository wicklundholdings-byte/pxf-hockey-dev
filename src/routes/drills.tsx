import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Filter, Play, BarChart3, Clock, Users, Wrench, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORIES, DRILLS, type Category, type Drill } from "@/data/pxf";
import { trainingCategories, TRAINING_CATEGORY_TO_DRILL_CATEGORIES, type TrainingCategory } from "@/data/trainingCategories";

export const Route = createFileRoute("/drills")({
  head: () => ({
    meta: [
      { title: "Drill Library — PXF Hockey" },
      { name: "description", content: "Drills organized by category with video, equipment, age and progression levels." },
      { property: "og:title", content: "Drill Library — PXF Hockey" },
      { property: "og:description", content: "Drills organized by category with video and progressions." },
    ],
  }),
  component: Drills,
});

const AGE_GROUPS = ["U9+", "U11+", "U13+", "U15+"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"] as const;
const EQUIP = ["Cones", "Pucks", "Net", "PODs", "Partner"] as const;

type FilterKey = "age" | "level" | "equip" | "cat";

function Drills() {
  const [q, setQ] = useState("");
  const [openFilters, setOpenFilters] = useState(false);
  const [active, setActive] = useState<{
    age: string | null;
    level: string | null;
    equip: string | null;
    cat: TrainingCategory | null;
  }>({
    age: null,
    level: null,
    equip: null,
    cat: null,
  });

  const filtered = useMemo(() => {
    return DRILLS.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (active.cat) {
        const matches = TRAINING_CATEGORY_TO_DRILL_CATEGORIES[active.cat];
        if (!matches.includes(d.category)) return false;
      }
      if (active.level && d.difficulty !== active.level) return false;
      if (active.age && d.ageGroup !== active.age) return false;
      if (active.equip && !d.equipment.some((e) => e.toLowerCase().includes(active.equip!.toLowerCase()))) return false;
      return true;
    });
  }, [q, active]);

  const byCat = useMemo(() => {
    const map = new Map<Category, Drill[]>();
    for (const c of CATEGORIES) map.set(c.name, []);
    for (const d of filtered) map.get(d.category)!.push(d);
    return map;
  }, [filtered]);

  return (
    <div className="px-5 pt-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">DRILL LIBRARY</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Drills</h1>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-surface px-3 py-2.5">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search drills, skills, tags…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button
          onClick={() => setOpenFilters((v) => !v)}
          aria-label="Filters"
          className={"grid h-11 w-11 place-items-center rounded-xl border " + (openFilters ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface text-foreground/80")}
        >
          <Filter size={16} />
        </button>
      </div>

      {openFilters && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border/60 bg-surface p-4">
          <FilterRow label="Category" options={trainingCategories.map((c) => c.name)} value={active.cat} onChange={(v) => setActive((s) => ({ ...s, cat: v as TrainingCategory | null }))} />
          <FilterRow label="Age" options={[...AGE_GROUPS]} value={active.age} onChange={(v) => setActive((s) => ({ ...s, age: v }))} />
          <FilterRow label="Skill Level" options={[...LEVELS]} value={active.level} onChange={(v) => setActive((s) => ({ ...s, level: v }))} />
          <FilterRow label="Equipment" options={[...EQUIP]} value={active.equip} onChange={(v) => setActive((s) => ({ ...s, equip: v }))} />
        </div>
      )}

      <div className="mt-6 space-y-7">
        {CATEGORIES.map((c) => {
          const list = byCat.get(c.name) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={c.name}>
              <div className="flex items-end justify-between">
                <div>
                  <p className={"text-[10px] font-bold tracking-[0.3em] " + (c.tint === "teal" ? "text-teal" : "text-volt")}>{c.name.toUpperCase()}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{c.blurb}</p>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">{list.length} drills</span>
              </div>
              <div className="mt-3 space-y-3">
                {list.map((d) => <DrillCard key={d.id} d={d} />)}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No drills match those filters.</p>
        )}
      </div>
    </div>
  );
}

function FilterRow({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">{label.toUpperCase()}</p>
      <div className="mt-2 -mx-1 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const a = value === o;
          return (
            <button
              key={o}
              onClick={() => onChange(a ? null : o)}
              className={"rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors " + (a ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface-2 text-muted-foreground")}
            >{o}</button>
          );
        })}
      </div>
    </div>
  );
}

function DrillCard({ d }: { d: Drill }) {
  return (
    <Link to="/drills/$drillId" params={{ drillId: d.id }} className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3 transition-colors hover:border-teal/40">
      <div className="relative grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-surface-2 to-background">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, #00E5D6 0, transparent 60%)" }} />
        <div className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal">
          <Play size={14} fill="currentColor" />
        </div>
        <span className="absolute bottom-1 right-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-volt">L{d.level}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-wider text-volt">{d.category.toUpperCase()}</p>
        <h3 className="mt-0.5 truncate text-sm font-bold text-foreground">{d.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><BarChart3 size={11} /> {d.difficulty}</span>
          <span className="flex items-center gap-1"><Users size={11} /> {d.ageGroup}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {d.durationMin} min</span>
          <span className="flex items-center gap-1"><Wrench size={11} /> {d.equipment.length} items</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </Link>
  );
}