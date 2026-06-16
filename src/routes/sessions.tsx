import { createFileRoute } from "@tanstack/react-router";
import { Plus, GripVertical, Trash2, Save, Wand2, Clock, Users, Disc3, X } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Session Builder — PXF Hockey" },
      { name: "description", content: "Build complete practice sessions from warmup to cooldown in minutes." },
      { property: "og:title", content: "Session Builder — PXF Hockey" },
      { property: "og:description", content: "Build complete practices in minutes." },
    ],
  }),
  component: Sessions,
});

const PHASES = ["Warm Up", "Skill Development", "Progression Work", "Game Transfer", "Cool Down"] as const;
type Phase = typeof PHASES[number];
type Block = { id: string; phase: Phase; name: string; mins: number };

function buildSession(input: { age: string; level: string; players: number; ice: number; equipment: string[] }): Block[] {
  const total = input.ice;
  const split: Record<Phase, number> = {
    "Warm Up": 0.12,
    "Skill Development": 0.28,
    "Progression Work": 0.28,
    "Game Transfer": 0.22,
    "Cool Down": 0.10,
  };
  const pick = (phase: Phase): string => {
    switch (phase) {
      case "Warm Up": return "Dynamic Edge Warmup";
      case "Skill Development": return input.level === "Advanced" || input.level === "Elite" ? "Figure 8 Puck Control" : "Inside Edge Crossovers";
      case "Progression Work": return "Quick Release Snap Shot";
      case "Game Transfer": return input.players >= 8 ? "Small Area Game (3v3)" : "1v1 Scan & Support";
      case "Cool Down": return "Stretch & Reset Flow";
    }
  };
  return PHASES.map((p, i) => ({
    id: `${p}-${i}`,
    phase: p,
    name: pick(p),
    mins: Math.max(3, Math.round(total * split[p])),
  }));
}

type Saved = { name: string; blocks: Block[] };

function Sessions() {
  const [form, setForm] = useState({ age: "U13+", level: "Intermediate", players: 12, ice: 60, equipment: ["Pucks", "Cones", "Nets"] as string[] });
  const [blocks, setBlocks] = useState<Block[]>(() => buildSession(form));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("pxf:sessions") ?? "[]"); } catch { return []; }
  });

  const totalMins = useMemo(() => blocks.reduce((s, b) => s + b.mins, 0), [blocks]);

  function rebuild() { setBlocks(buildSession(form)); }
  function save() {
    const entry: Saved = { name: `${form.level} · ${form.ice}m`, blocks };
    const next = [entry, ...saved].slice(0, 5);
    setSaved(next);
    if (typeof window !== "undefined") localStorage.setItem("pxf:sessions", JSON.stringify(next));
  }

  function onDragStart(id: string) { setDraggingId(id); }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === draggingId);
      const to = prev.findIndex((b) => b.id === targetId);
      if (from < 0 || to < 0) return prev;
      const copy = prev.slice();
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    setDraggingId(null);
  }

  function remove(id: string) { setBlocks((p) => p.filter((b) => b.id !== id)); }
  function updateMins(id: string, mins: number) { setBlocks((p) => p.map((b) => b.id === id ? { ...b, mins } : b)); }

  return (
    <div className="px-5 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">SESSION BUILDER</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Build a Session</h1>
        </div>
        <button onClick={rebuild} className="grid h-11 w-11 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal" aria-label="Auto build">
          <Wand2 size={18} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-border/60 bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age Group">
            <Select value={form.age} options={["U9+", "U11+", "U13+", "U15+"]} onChange={(v) => setForm({ ...form, age: v })} />
          </Field>
          <Field label="Skill Level">
            <Select value={form.level} options={["Beginner", "Intermediate", "Advanced", "Elite"]} onChange={(v) => setForm({ ...form, level: v })} />
          </Field>
          <Field label="Players">
            <input type="number" min={1} value={form.players} onChange={(e) => setForm({ ...form, players: Number(e.target.value) })}
              className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none" />
          </Field>
          <Field label="Ice Time (min)">
            <input type="number" min={15} value={form.ice} onChange={(e) => setForm({ ...form, ice: Number(e.target.value) })}
              className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none" />
          </Field>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">EQUIPMENT</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Pucks", "Cones", "Nets", "PODs", "Pylons", "Stations"].map((e) => {
              const a = form.equipment.includes(e);
              return (
                <button key={e}
                  onClick={() => setForm((f) => ({ ...f, equipment: a ? f.equipment.filter((x) => x !== e) : [...f.equipment, e] }))}
                  className={"rounded-full border px-3 py-1 text-[11px] font-semibold " + (a ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface-2 text-muted-foreground")}
                >{e}</button>
              );
            })}
          </div>
        </div>

        <button onClick={rebuild} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-bold tracking-wide text-primary-foreground">
          <Wand2 size={14} /> AUTO BUILD SESSION
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-teal/30 bg-surface px-4 py-3 shadow-glow-teal">
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock size={12} className="text-teal" /> {totalMins} min</span>
          <span className="flex items-center gap-1"><Disc3 size={12} className="text-teal" /> {blocks.length} blocks</span>
          <span className="flex items-center gap-1"><Users size={12} className="text-teal" /> {form.players} players</span>
        </div>
        <button onClick={save} className="flex items-center gap-1 rounded-lg border border-volt/40 bg-volt/10 px-3 py-1.5 text-[11px] font-bold text-volt">
          <Save size={12} /> SAVE
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {blocks.map((b) => (
          <div key={b.id} draggable
            onDragStart={() => onDragStart(b.id)} onDragOver={onDragOver} onDrop={() => onDrop(b.id)}
            className={"rounded-2xl border bg-surface p-3 transition-all " + (draggingId === b.id ? "border-teal/60 opacity-60" : "border-border/60")}
          >
            <div className="flex items-center gap-3">
              <GripVertical size={16} className="cursor-grab text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-[0.3em] text-volt">{b.phase.toUpperCase()}</p>
                <p className="mt-0.5 truncate text-sm font-bold text-foreground">{b.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-surface-2 px-2 py-1">
                  <input type="number" value={b.mins}
                    onChange={(e) => updateMins(b.id, Math.max(1, Number(e.target.value)))}
                    className="w-10 bg-transparent text-right text-xs font-bold text-foreground focus:outline-none" />
                  <span className="text-[10px] text-muted-foreground">m</span>
                </div>
                <button onClick={() => remove(b.id)} aria-label="Remove" className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 text-muted-foreground">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => setBlocks((p) => [...p, { id: `custom-${Date.now()}`, phase: "Skill Development", name: "Custom Drill", mins: 5 }])}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-surface/50 py-3 text-sm font-semibold text-muted-foreground"
        >
          <Plus size={14} /> Add block
        </button>
      </div>

      {saved.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-bold tracking-[0.25em] text-foreground/90">SAVED SESSIONS</h2>
          <div className="mt-3 space-y-2">
            {saved.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-surface px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.blocks.length} blocks · {s.blocks.reduce((t, b) => t + b.mins, 0)} min</p>
                </div>
                <button
                  onClick={() => setSaved((p) => {
                    const next = p.filter((_, idx) => idx !== i);
                    if (typeof window !== "undefined") localStorage.setItem("pxf:sessions", JSON.stringify(next));
                    return next;
                  })}
                  className="text-muted-foreground" aria-label="Delete"
                ><X size={14} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">{label.toUpperCase()}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}