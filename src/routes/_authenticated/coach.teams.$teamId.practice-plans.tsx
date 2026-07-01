import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Plus, Search, X, GripVertical, Check, Clock, MapPin,
  ChevronRight, Send, Save, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/practice-plans")({
  component: PracticePlansScreen,
});

// ---------- Types & mock data ----------

type DrillCategory = "Skating" | "Shooting" | "Passing" | "Defensive" | "Offensive" | "Special Teams";
type Drill = { id: string; name: string; category: DrillCategory; duration: number };

const DRILL_LIBRARY: Drill[] = [
  { id: "d1",  name: "Figure 8 Edge Work",       category: "Skating",       duration: 10 },
  { id: "d2",  name: "C-Cuts & Crossovers",      category: "Skating",       duration: 8 },
  { id: "d3",  name: "Tight Turn Ladder",        category: "Skating",       duration: 6 },
  { id: "d4",  name: "Shooting Gallery",         category: "Shooting",      duration: 12 },
  { id: "d5",  name: "One-Timer Reps",           category: "Shooting",      duration: 10 },
  { id: "d6",  name: "Give-and-Go Cycle",        category: "Passing",       duration: 8 },
  { id: "d7",  name: "Saucer Pass Circuit",      category: "Passing",       duration: 7 },
  { id: "d8",  name: "D-Zone Coverage 3v3",      category: "Defensive",     duration: 15 },
  { id: "d9",  name: "Gap Control 1v1",          category: "Defensive",     duration: 10 },
  { id: "d10", name: "Breakout Wheel",           category: "Defensive",     duration: 12 },
  { id: "d11", name: "2-on-1 Rush",              category: "Offensive",     duration: 15 },
  { id: "d12", name: "Cycle & Attack",           category: "Offensive",     duration: 12 },
  { id: "d13", name: "PP Umbrella Entry",        category: "Special Teams", duration: 10 },
  { id: "d14", name: "PK Box Rotation",          category: "Special Teams", duration: 10 },
];

type Block = { id: string; name: string; minutes: number; drills: Drill[] };

type PlanStatus = "none" | "in_progress" | "ready";

type Practice = {
  id: string;
  weekday: string;
  dateLabel: string; // "Jul 3"
  timeLabel: string; // "6:00 PM"
  rink: string;
  durationMin: number;
  status: PlanStatus;
  focus?: string;
  coachNotes?: string;
  blocks?: Block[];
};

const DEFAULT_BLOCKS = (): Block[] => [
  { id: "b1", name: "Warm-up Skate",    minutes: 10, drills: [] },
  { id: "b2", name: "Skating / Edges",  minutes: 20, drills: [] },
  { id: "b3", name: "Drill Block 1",    minutes: 25, drills: [] },
  { id: "b4", name: "Drill Block 2",    minutes: 20, drills: [] },
  { id: "b5", name: "Compete / Battle", minutes: 10, drills: [] },
  { id: "b6", name: "Cooldown",         minutes: 5,  drills: [] },
];

const initialPractices: Practice[] = [
  {
    id: "pr1",
    weekday: "Thursday", dateLabel: "Jul 3",
    timeLabel: "6:00 PM", rink: "Rink 2",
    durationMin: 90,
    status: "ready",
    focus: "Defensive zone coverage + breakouts",
    coachNotes: "Push tempo on breakout wheel. Watch F1 support.",
    blocks: [
      { id: "b1", name: "Warm-up Skate", minutes: 10, drills: [] },
      { id: "b2", name: "Skating / Edges", minutes: 15, drills: [DRILL_LIBRARY[0], DRILL_LIBRARY[1]] },
      { id: "b3", name: "D-Zone Structure", minutes: 25, drills: [DRILL_LIBRARY[7], DRILL_LIBRARY[9]] },
      { id: "b4", name: "Rush Attack", minutes: 25, drills: [DRILL_LIBRARY[10]] },
      { id: "b5", name: "Cooldown", minutes: 15, drills: [] },
    ],
  },
  {
    id: "pr2",
    weekday: "Saturday", dateLabel: "Jul 5",
    timeLabel: "8:15 AM", rink: "Rink 1",
    durationMin: 75,
    status: "in_progress",
    focus: "",
    blocks: [
      { id: "b1", name: "Warm-up Skate", minutes: 10, drills: [] },
      { id: "b2", name: "Skating / Edges", minutes: 15, drills: [DRILL_LIBRARY[2]] },
      { id: "b3", name: "Drill Block 1", minutes: 20, drills: [] },
      { id: "b4", name: "Drill Block 2", minutes: 20, drills: [] },
      { id: "b5", name: "Cooldown", minutes: 10, drills: [] },
    ],
  },
  {
    id: "pr3",
    weekday: "Tuesday", dateLabel: "Jul 8",
    timeLabel: "5:30 PM", rink: "Rink 3",
    durationMin: 60,
    status: "none",
  },
  {
    id: "pr4",
    weekday: "Thursday", dateLabel: "Jul 10",
    timeLabel: "6:00 PM", rink: "Rink 2",
    durationMin: 90,
    status: "none",
  },
];

// ---------- Helpers ----------

function fmtRange(startMin: number, dur: number) {
  const s = startMin, e = startMin + dur;
  const hh = (m: number) => Math.floor(m / 60);
  const mm = (m: number) => String(m % 60).padStart(2, "0");
  return `${hh(s)}:${mm(s)} – ${hh(e)}:${mm(e)}`;
}

function statusPill(status: PlanStatus) {
  if (status === "ready")
    return { text: "Plan ready", cls: "bg-teal/15 text-teal", icon: <Check size={11} /> };
  if (status === "in_progress")
    return { text: "In progress", cls: "bg-amber-500/15 text-amber-400", icon: null };
  return { text: "No plan yet", cls: "bg-surface-2 text-muted-foreground", icon: null };
}

// ---------- Screen ----------

function PracticePlansScreen() {
  const { teamId } = Route.useParams();
  const [practices, setPractices] = useState<Practice[]>(initialPractices);
  const [openId, setOpenId] = useState<string | null>(null);

  const upsert = (p: Practice) =>
    setPractices((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]));

  if (openId) {
    const practice = practices.find((p) => p.id === openId)!;
    return (
      <PlanBuilder
        practice={practice}
        onBack={() => setOpenId(null)}
        onSave={(p) => upsert(p)}
      />
    );
  }

  return (
    <div className="px-5 pt-4 pb-28">
      <Link to="/coach/teams/$teamId/more" params={{ teamId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> More
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold">Practice Plans</h1>
      <p className="mt-1 text-xs text-muted-foreground">Assign drills and structure to upcoming ice times</p>

      <div className="mt-4 space-y-2">
        {practices.map((p) => {
          const pill = statusPill(p.status);
          return (
            <button
              key={p.id}
              onClick={() => setOpenId(p.id)}
              className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left active:bg-surface-2"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal/15 text-teal">
                <Clock size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{p.weekday} · {p.dateLabel}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  {p.timeLabel} · <MapPin size={10} /> {p.rink}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{p.durationMin} min</p>
                <span className={"mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold " + pill.cls}>
                  {pill.icon} {pill.text}
                </span>
              </div>
              <ChevronRight size={16} className="mt-2 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <button
        onClick={() => {
          const id = "pr" + Date.now();
          upsert({
            id, weekday: "New", dateLabel: "TBD", timeLabel: "TBD", rink: "TBD",
            durationMin: 90, status: "in_progress", blocks: DEFAULT_BLOCKS(),
          });
          setOpenId(id);
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-background shadow-glow-teal active:opacity-90"
      >
        <Plus size={16} /> Plan a Practice
      </button>
    </div>
  );
}

// ---------- Builder ----------

function PlanBuilder({ practice, onBack, onSave }: { practice: Practice; onBack: () => void; onSave: (p: Practice) => void }) {
  const [blocks, setBlocks] = useState<Block[]>(practice.blocks ?? DEFAULT_BLOCKS());
  const [focus, setFocus] = useState(practice.focus ?? "");
  const [notes, setNotes] = useState(practice.coachNotes ?? "");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const total = useMemo(() => blocks.reduce((s, b) => s + b.minutes, 0), [blocks]);

  const cumulative = useMemo(() => {
    let acc = 0;
    return blocks.map((b) => { const start = acc; acc += b.minutes; return start; });
  }, [blocks]);

  const updateBlock = (id: string, patch: Partial<Block>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const removeBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));

  const addBlock = () =>
    setBlocks((prev) => [...prev, { id: "b" + Date.now(), name: "New Block", minutes: 10, drills: [] }]);

  const addDrill = (blockId: string, drill: Drill) => {
    updateBlock(blockId, {
      ...blocks.find((b) => b.id === blockId)!,
      drills: [...(blocks.find((b) => b.id === blockId)!.drills), drill],
    });
  };
  const removeDrill = (blockId: string, idx: number) => {
    const b = blocks.find((x) => x.id === blockId)!;
    updateBlock(blockId, { drills: b.drills.filter((_, i) => i !== idx) });
  };

  const onDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [m] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, m);
      return next;
    });
    setDragIdx(null);
  };

  const persist = (status: PlanStatus, flash: string) => {
    onSave({ ...practice, status, blocks, focus, coachNotes: notes, durationMin: total });
    setSavedFlash(flash);
    setTimeout(() => setSavedFlash(null), 1200);
  };

  return (
    <div className="px-5 pt-4 pb-32">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Practice Plans
      </button>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
        <h1 className="font-display text-xl font-bold">{practice.weekday} · {practice.dateLabel}</h1>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={11} /> {practice.timeLabel} · <MapPin size={11} /> {practice.rink} · {total} min planned
        </p>
      </div>

      <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-muted-foreground">STRUCTURE</p>

      <div className="mt-2 space-y-2">
        {blocks.map((b, idx) => (
          <div
            key={b.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(idx)}
            className={"rounded-2xl border border-border bg-surface p-3 " + (dragIdx === idx ? "opacity-50" : "")}
          >
            <div className="flex items-start gap-2">
              <span className="mt-1.5 cursor-grab text-muted-foreground active:cursor-grabbing"><GripVertical size={14} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-wider text-teal">{fmtRange(cumulative[idx], b.minutes)}</p>
                <input
                  value={b.name}
                  onChange={(e) => updateBlock(b.id, { name: e.target.value })}
                  className="mt-0.5 w-full bg-transparent text-sm font-bold text-foreground outline-none"
                />
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={b.minutes}
                    onChange={(e) => updateBlock(b.id, { minutes: Math.max(1, parseInt(e.target.value || "0", 10)) })}
                    className="w-16 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground">min</span>
                </div>

                {b.drills.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {b.drills.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                        <span className="text-teal">→</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.duration} min · {d.category}</p>
                        </div>
                        <button onClick={() => removeDrill(b.id, i)} className="text-muted-foreground"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-3">
                  <button onClick={() => setPickerFor(b.id)} className="text-[11px] font-bold text-teal">+ Add Drill</button>
                  {blocks.length > 1 && (
                    <button onClick={() => removeBlock(b.id)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Trash2 size={11} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addBlock} className="mt-3 w-full rounded-xl border border-dashed border-border py-2.5 text-xs font-bold text-muted-foreground">
        + Add Block
      </button>

      <div className="mt-6">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">PRACTICE FOCUS</p>
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g. Defensive zone coverage + breakouts"
          className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
        />
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">COACH NOTES <span className="text-muted-foreground/70">(private to staff)</span></p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="mx-auto flex max-w-[480px] items-center gap-2">
          <button
            onClick={() => persist("in_progress", "Draft saved")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-border bg-surface-2 py-2.5 text-xs font-bold text-foreground"
          >
            <Save size={12} /> Save Draft
          </button>
          <button
            onClick={() => persist("ready", "Team notified")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-teal py-2.5 text-xs font-bold text-teal"
          >
            <Send size={12} /> Notify Team
          </button>
        </div>
        {savedFlash && (
          <p className="mx-auto mt-1 max-w-[480px] text-center text-[10px] font-bold text-teal">{savedFlash} ✓</p>
        )}
      </div>

      {pickerFor && (
        <DrillPicker
          onClose={() => setPickerFor(null)}
          onPick={(d) => { addDrill(pickerFor, d); setPickerFor(null); }}
        />
      )}
    </div>
  );
}

// ---------- Drill picker ----------

const CATEGORIES: (DrillCategory | "All")[] = ["All", "Skating", "Shooting", "Passing", "Defensive", "Offensive", "Special Teams"];

function DrillPicker({ onClose, onPick }: { onClose: () => void; onPick: (d: Drill) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(DrillCategory | "All")>("All");

  const results = DRILL_LIBRARY.filter((d) => {
    const matchesCat = cat === "All" || d.category === cat;
    const matchesQ = !q || d.name.toLowerCase().includes(q.toLowerCase());
    return matchesCat && matchesQ;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80vh" }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Add Drill</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted-foreground"><X size={14} /></button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2">
          <Search size={14} className="text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drills" className="flex-1 bg-transparent text-sm outline-none" />
        </div>

        <div className="mt-2 -mx-1 overflow-x-auto">
          <div className="flex gap-1.5 px-1 pb-1">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={"whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold " + (cat === c ? "border-teal bg-teal/15 text-teal" : "border-border bg-surface-2 text-muted-foreground")}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: "50vh" }}>
          {results.map((d) => (
            <button key={d.id} onClick={() => onPick(d)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left active:bg-surface">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.name}</p>
                <p className="text-[10px] text-muted-foreground">{d.category} · {d.duration} min</p>
              </div>
              <span className="rounded-full bg-teal/15 px-2 py-1 text-[10px] font-bold text-teal">Add</span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No drills match your filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
