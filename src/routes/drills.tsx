import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Filter, Play, BarChart3, Clock, Users, Wrench, ChevronRight, Heart, Plus, X, CheckCircle2, ListChecks, Sparkles, Calendar as CalendarIcon, Folder as FolderIcon, FolderPlus, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, DRILLS, type Category, type Drill } from "@/data/pxf";
import { trainingCategories, TRAINING_CATEGORY_TO_DRILL_CATEGORIES, type TrainingCategory } from "@/data/trainingCategories";
import { useFavorites } from "@/hooks/useFavorites";

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

const SESSIONS_KEY = "pxf:sessions:v2";

type SessionBlock = { uid: string; drillId: string; mins: number };
type SavedSession = {
  id: string;
  name: string;
  date: string;
  age: string;
  level: string;
  totalMins: number;
  notes: string;
  blocks: SessionBlock[];
  completed?: boolean;
  completedAt?: string;
};

function readSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SavedSession[]) : [];
  } catch { return []; }
}
function writeSessions(list: SavedSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("pxf:sessions-changed"));
}
function makeBlock(drill: Drill): SessionBlock {
  return { uid: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, drillId: drill.id, mins: drill.durationMin };
}

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
  const [addDrill, setAddDrill] = useState<Drill | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAdd, setBulkAdd] = useState(false);
  const [bulkFolder, setBulkFolder] = useState(false);
  const fav = useFavorites();

  function toggleSelected(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  const selectedDrills = useMemo(
    () => DRILLS.filter((d) => selected.has(d.id)),
    [selected],
  );

  function saveSelectedToFavourites() {
    let added = 0;
    for (const id of selected) {
      if (!fav.isFavorite(id)) { fav.toggle(id); added++; }
    }
    setToast(added === 0 ? "Already in Favourites" : `Saved ${added} to Favourites`);
    exitSelect();
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">DRILL LIBRARY</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Drills</h1>
        </div>
        <button
          onClick={() => { if (selectMode) exitSelect(); else setSelectMode(true); }}
          className={"mt-1 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wider transition-colors " + (selectMode ? "border-teal bg-teal text-background" : "border-border/60 bg-surface text-foreground/80")}
        >
          {selectMode ? "DONE" : "SELECT"}
        </button>
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
                {list.map((d) => (
                  <DrillCard
                    key={d.id}
                    d={d}
                    onAdd={() => setAddDrill(d)}
                    selectMode={selectMode}
                    selected={selected.has(d.id)}
                    onToggleSelect={() => toggleSelected(d.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No drills match those filters.</p>
        )}
      </div>

      {addDrill && (
        <AddToSessionModal
          drills={[addDrill]}
          onClose={() => setAddDrill(null)}
          onDone={(msg) => { setAddDrill(null); setToast(msg); }}
        />
      )}

      {bulkAdd && selectedDrills.length > 0 && (
        <AddToSessionModal
          drills={selectedDrills}
          onClose={() => setBulkAdd(false)}
          onDone={(msg) => { setBulkAdd(false); exitSelect(); setToast(msg); }}
        />
      )}

      {bulkFolder && selectedDrills.length > 0 && (
        <SaveToFolderModal
          drillIds={[...selected]}
          onClose={() => setBulkFolder(false)}
          onDone={(msg) => { setBulkFolder(false); exitSelect(); setToast(msg); }}
        />
      )}

      {selectMode && (
        <SelectionToolbar
          count={selected.size}
          onAddToSession={() => { if (selected.size) setBulkAdd(true); }}
          onSaveToFolder={() => { if (selected.size) setBulkFolder(true); }}
          onSaveToFavourites={() => { if (selected.size) saveSelectedToFavourites(); }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-5">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-teal/40 bg-surface/95 px-4 py-2.5 text-sm font-semibold text-teal shadow-glow-teal backdrop-blur">
            <CheckCircle2 size={16} />
            {toast}
          </div>
        </div>
      )}
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

function DrillCard({ d, onAdd, selectMode, selected, onToggleSelect }: { d: Drill; onAdd: () => void; selectMode: boolean; selected: boolean; onToggleSelect: () => void }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(d.id);
  const cardClass = "flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 transition-colors " +
    (selectMode
      ? (selected ? "border-teal bg-teal/10 pr-3" : "border-border/60 pr-3 hover:border-teal/40")
      : "border-border/60 pr-24 hover:border-teal/40");
  const inner = (
    <>
      {selectMode && (
        <div className={"grid h-6 w-6 shrink-0 place-items-center rounded-full border " + (selected ? "border-teal bg-teal text-background" : "border-border/60 bg-surface-2 text-muted-foreground")}>
          {selected && <Check size={14} strokeWidth={3} />}
        </div>
      )}
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
      {!selectMode && <ChevronRight size={16} className="text-muted-foreground" />}
    </>
  );

  if (selectMode) {
    return (
      <button type="button" onClick={onToggleSelect} className={cardClass + " text-left"}>
        {inner}
      </button>
    );
  }

  return (
    <div className="relative">
    <Link to="/drills/$drillId" params={{ drillId: d.id }} className={cardClass}>
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
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(); }}
        aria-label="Add to session"
        className="absolute right-12 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full border border-volt/40 bg-volt/15 text-volt transition-colors hover:bg-volt/25"
      >
        <Plus size={16} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(d.id); }}
        aria-label={fav ? "Remove from favourites" : "Add to favourites"}
        className={"absolute right-3 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full border transition-colors " + (fav ? "border-teal/40 bg-teal/15 text-teal" : "border-border/60 bg-surface-2 text-muted-foreground hover:text-teal")}
      >
        <Heart size={14} fill={fav ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function AddToSessionModal({ drill, onClose, onDone }: { drill: Drill; onClose: () => void; onDone: (msg: string) => void }) {
  const [mode, setMode] = useState<"choose" | "existing" | "new">("choose");
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // new session fields
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(`${drill.category} — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`);
  const [date, setDate] = useState(today);
  const [age, setAge] = useState<string>(drill.ageGroup ?? "U13+");
  const [duration, setDuration] = useState<number>(60);

  useEffect(() => { setSessions(readSessions()); }, []);

  function togglePick(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function addToExisting() {
    if (picked.size === 0) return;
    const next = sessions.map((s) =>
      picked.has(s.id) ? { ...s, blocks: [...s.blocks, makeBlock(drill)] } : s,
    );
    writeSessions(next);
    onDone(picked.size === 1 ? "Drill Added To Session" : `Drill Added To ${picked.size} Sessions`);
  }

  function createAndAdd() {
    if (!name.trim()) return;
    const fresh: SavedSession = {
      id: `s-${Date.now()}`,
      name: name.trim(),
      date,
      age,
      level: drill.difficulty ?? "Intermediate",
      totalMins: duration,
      notes: "",
      blocks: [makeBlock(drill)],
      completed: false,
    };
    writeSessions([fresh, ...sessions]);
    onDone("Drill Added To Session");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border/60 bg-surface p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-teal">ADD TO SESSION</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{drill.name}</h2>
            <p className="text-[11px] text-muted-foreground">{drill.category} · {drill.durationMin} min</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        {mode === "choose" && (
          <div className="mt-5 grid grid-cols-1 gap-2">
            <button
              onClick={() => setMode("existing")}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2 p-4 text-left transition-colors hover:border-teal/40"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal"><ListChecks size={18} /></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Existing Session</p>
                <p className="text-[11px] text-muted-foreground">{sessions.length} saved · pick one or more</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => setMode("new")}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2 p-4 text-left transition-colors hover:border-volt/40"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-volt/15 text-volt"><Sparkles size={18} /></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Create New Session</p>
                <p className="text-[11px] text-muted-foreground">Name, date, age, duration</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {mode === "existing" && (
          <div className="mt-5">
            <button onClick={() => setMode("choose")} className="text-[11px] font-semibold tracking-wider text-muted-foreground">← BACK</button>
            <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {sessions.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No saved sessions yet. Create one instead.</p>
              )}
              {sessions.map((s) => {
                const a = picked.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => togglePick(s.id)}
                    className={"flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors " + (a ? "border-teal bg-teal/10" : "border-border/60 bg-surface-2 hover:border-teal/40")}
                  >
                    <div className={"grid h-8 w-8 place-items-center rounded-full border " + (a ? "border-teal bg-teal text-background" : "border-border/60 text-muted-foreground")}>
                      {a ? <CheckCircle2 size={16} /> : <Plus size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.date} · {s.blocks.length} drills · {s.age}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              disabled={picked.size === 0}
              onClick={addToExisting}
              className="mt-4 w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-40"
            >
              Add to {picked.size || 0} session{picked.size === 1 ? "" : "s"}
            </button>
          </div>
        )}

        {mode === "new" && (
          <div className="mt-5 space-y-3">
            <button onClick={() => setMode("choose")} className="text-[11px] font-semibold tracking-wider text-muted-foreground">← BACK</button>
            <Field label="Session Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Date" icon={<CalendarIcon size={12} />}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
              </Field>
              <Field label="Duration (min)">
                <input type="number" min={10} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 0)} className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
              </Field>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">AGE GROUP</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {AGE_GROUPS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setAge(g)}
                    className={"rounded-full border px-3 py-1 text-[11px] font-semibold " + (age === g ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface-2 text-muted-foreground")}
                  >{g}</button>
                ))}
              </div>
            </div>
            <button
              onClick={createAndAdd}
              disabled={!name.trim()}
              className="mt-2 w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-40"
            >
              Create & Add Drill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block rounded-xl border border-border/60 bg-surface-2 px-3 py-2">
      <p className="flex items-center gap-1 text-[9px] font-bold tracking-[0.3em] text-muted-foreground">{icon}{label}</p>
      <div className="mt-1">{children}</div>
    </label>
  );
}