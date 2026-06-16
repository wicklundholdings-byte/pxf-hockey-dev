import { createFileRoute } from "@tanstack/react-router";
import { Plus, GripVertical, Trash2, Save, Clock, Users, Disc3, X, Search, Heart, Folder, BookOpen, Wrench, ListChecks, Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DRILLS, type Drill } from "@/data/pxf";
import { useFavorites } from "@/hooks/useFavorites";

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

const AGE_GROUPS = ["U9+", "U11+", "U13+", "U15+"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"] as const;

type SessionBlock = {
  uid: string;       // unique id within the session (a drill can appear twice)
  drillId: string;
  mins: number;
};

type Session = {
  id: string;
  name: string;
  date: string;       // yyyy-mm-dd
  age: string;
  level: string;
  totalMins: number;
  notes: string;
  blocks: SessionBlock[];
};

const SESSIONS_KEY = "pxf:sessions:v2";

function newSession(): Session {
  return {
    id: `s-${Date.now()}`,
    name: "Untitled Session",
    date: new Date().toISOString().slice(0, 10),
    age: "U13+",
    level: "Intermediate",
    totalMins: 60,
    notes: "",
    blocks: [],
  };
}

function Sessions() {
  const [session, setSession] = useState<Session>(newSession);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [overUid, setOverUid] = useState<string | null>(null);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const [saved, setSaved] = useState<Session[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SESSIONS_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function persist(next: Session[]) {
    setSaved(next);
    if (typeof window !== "undefined") window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  }

  const totalMins = useMemo(() => session.blocks.reduce((s, b) => s + b.mins, 0), [session.blocks]);

  function update<K extends keyof Session>(key: K, val: Session[K]) {
    setSession((s) => ({ ...s, [key]: val }));
  }

  function addDrill(drill: Drill) {
    setSession((s) => ({
      ...s,
      blocks: [...s.blocks, { uid: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, drillId: drill.id, mins: drill.durationMin }],
    }));
  }

  function removeBlock(uid: string) {
    setSession((s) => ({ ...s, blocks: s.blocks.filter((b) => b.uid !== uid) }));
  }

  function setBlockMins(uid: string, mins: number) {
    setSession((s) => ({ ...s, blocks: s.blocks.map((b) => (b.uid === uid ? { ...b, mins: Math.max(1, mins) } : b)) }));
  }

  function onDrop(targetUid: string) {
    if (!dragUid || dragUid === targetUid) { setDragUid(null); setOverUid(null); return; }
    setSession((s) => {
      const from = s.blocks.findIndex((b) => b.uid === dragUid);
      const to = s.blocks.findIndex((b) => b.uid === targetUid);
      if (from < 0 || to < 0) return s;
      const copy = s.blocks.slice();
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return { ...s, blocks: copy };
    });
    setDragUid(null);
    setOverUid(null);
  }

  function saveSession() {
    const toSave: Session = { ...session, totalMins };
    const idx = saved.findIndex((s) => s.id === session.id);
    const next = idx >= 0
      ? saved.map((s, i) => (i === idx ? toSave : s))
      : [toSave, ...saved].slice(0, 20);
    persist(next);
  }

  function loadSession(s: Session) {
    setSession(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteSaved(id: string) {
    persist(saved.filter((s) => s.id !== id));
  }

  return (
    <div className="px-5 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">SESSION BUILDER</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Build a Session</h1>
        </div>
        <button onClick={() => setSession(newSession())} className="rounded-full border border-border/60 bg-surface px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
          NEW
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-border/60 bg-surface p-4">
        <input
          value={session.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Session name"
          className="w-full bg-transparent text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Date" icon={CalendarIcon}>
            <input
              type="date"
              value={session.date}
              onChange={(e) => update("date", e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
            />
          </Field>
          <Field label="Total Length (min)" icon={Clock}>
            <input
              type="number"
              min={5}
              value={session.totalMins}
              onChange={(e) => update("totalMins", Math.max(5, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
            />
          </Field>
          <Field label="Age Group" icon={Users}>
            <Select value={session.age} options={[...AGE_GROUPS]} onChange={(v) => update("age", v)} />
          </Field>
          <Field label="Skill Level" icon={Disc3}>
            <Select value={session.level} options={[...LEVELS]} onChange={(v) => update("level", v)} />
          </Field>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">NOTES</p>
          <textarea
            value={session.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Focus, themes, communication points…"
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-teal/30 bg-surface px-4 py-3 shadow-glow-teal">
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className={"flex items-center gap-1 " + (totalMins > session.totalMins ? "text-destructive" : "")}>
            <Clock size={12} className="text-teal" /> {totalMins} / {session.totalMins} min
          </span>
          <span className="flex items-center gap-1"><Disc3 size={12} className="text-teal" /> {session.blocks.length} drills</span>
        </div>
        <button onClick={saveSession} className="flex items-center gap-1 rounded-lg border border-volt/40 bg-volt/10 px-3 py-1.5 text-[11px] font-bold text-volt">
          <Save size={12} /> SAVE
        </button>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-[0.25em] text-foreground/90">DRILLS IN ORDER</h2>
          <span className="text-[10px] text-muted-foreground">Drag to reorder</span>
        </div>

        <div className="mt-3 space-y-3">
          {session.blocks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/80 bg-surface/50 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">No drills yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Pull from your library, favourites, or folders.</p>
            </div>
          )}

          {session.blocks.map((b, i) => {
            const drill = DRILLS.find((d) => d.id === b.drillId);
            if (!drill) return null;
            return (
              <SessionBlockCard
                key={b.uid}
                index={i}
                block={b}
                drill={drill}
                expanded={expandedUid === b.uid}
                dragging={dragUid === b.uid}
                isOver={overUid === b.uid && dragUid !== b.uid}
                onToggleExpand={() => setExpandedUid((u) => (u === b.uid ? null : b.uid))}
                onMins={(m) => setBlockMins(b.uid, m)}
                onRemove={() => removeBlock(b.uid)}
                onDragStart={() => setDragUid(b.uid)}
                onDragEnter={() => setOverUid(b.uid)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(b.uid)}
                onDragEnd={() => { setDragUid(null); setOverUid(null); }}
              />
            );
          })}

          <button
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-teal/50 bg-teal/5 py-3 text-sm font-bold text-teal"
          >
            <Plus size={14} /> ADD DRILL
          </button>
        </div>
      </div>

      {saved.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-bold tracking-[0.25em] text-foreground/90">SAVED SESSIONS</h2>
          <div className="mt-3 space-y-2">
            {saved.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-surface px-3 py-2.5">
                <button onClick={() => loadSession(s)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.date} · {s.level} · {s.blocks.length} drills · {s.blocks.reduce((t, b) => t + b.mins, 0)} min</p>
                </button>
                <button onClick={() => deleteSaved(s.id)} className="ml-2 text-muted-foreground" aria-label="Delete">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {pickerOpen && (
        <DrillPickerSheet
          existingIds={session.blocks.map((b) => b.drillId)}
          onPick={(d) => { addDrill(d); }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <div className="h-10" />
    </div>
  );
}

function Field({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: typeof Clock }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-bold tracking-[0.3em] text-muted-foreground">
        {Icon ? <Icon size={10} className="text-teal" /> : null}
        {label.toUpperCase()}
      </p>
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

function SessionBlockCard({
  index, block, drill, expanded, dragging, isOver,
  onToggleExpand, onMins, onRemove,
  onDragStart, onDragEnter, onDragOver, onDrop, onDragEnd,
}: {
  index: number;
  block: SessionBlock;
  drill: Drill;
  expanded: boolean;
  dragging: boolean;
  isOver: boolean;
  onToggleExpand: () => void;
  onMins: (m: number) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={
        "rounded-2xl border bg-surface p-3 transition-all " +
        (dragging ? "border-teal/60 opacity-50 " : isOver ? "border-volt/60 ring-2 ring-volt/30 " : "border-border/60 ")
      }
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <GripVertical size={16} className="cursor-grab text-muted-foreground" />
          <span className="font-display text-[10px] font-bold text-volt">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.3em] text-teal">{drill.category.toUpperCase()}</p>
          <p className="mt-0.5 truncate text-sm font-bold text-foreground">{drill.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Wrench size={10} /> {drill.equipment.length} items</span>
            <span>L{drill.level} · {drill.difficulty}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-surface-2 px-2 py-1">
            <input
              type="number"
              value={block.mins}
              onChange={(e) => onMins(Number(e.target.value))}
              className="w-10 bg-transparent text-right text-xs font-bold text-foreground focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground">m</span>
          </div>
          <button onClick={onToggleExpand} aria-label="Details" className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 text-muted-foreground">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onRemove} aria-label="Remove" className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 text-muted-foreground hover:border-destructive/40 hover:text-destructive">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          <div>
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-[0.3em] text-muted-foreground">
              <Wrench size={10} className="text-teal" /> EQUIPMENT
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {drill.equipment.map((e) => (
                <span key={e} className="rounded-full border border-border/60 bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">{e}</span>
              ))}
            </div>
          </div>
          {drill.notes.length > 0 && (
            <div>
              <p className="flex items-center gap-1 text-[10px] font-bold tracking-[0.3em] text-muted-foreground">
                <ListChecks size={10} className="text-volt" /> COACHING NOTES
              </p>
              <ul className="mt-1.5 space-y-1">
                {drill.notes.map((n) => (
                  <li key={n} className="flex gap-2 text-[12px] text-foreground/90">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Source = "library" | "favorites" | "folder";

function DrillPickerSheet({
  existingIds, onPick, onClose,
}: {
  existingIds: string[];
  onPick: (d: Drill) => void;
  onClose: () => void;
}) {
  const { ids: favIds, folders, assignments } = useFavorites();
  const [source, setSource] = useState<Source>("library");
  const [folderId, setFolderId] = useState<string | null>(folders[0]?.id ?? null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (folders.length > 0 && !folders.find((f) => f.id === folderId)) {
      setFolderId(folders[0].id);
    }
  }, [folders, folderId]);

  const list = useMemo<Drill[]>(() => {
    let base: Drill[] = [];
    if (source === "library") base = DRILLS;
    else if (source === "favorites") base = DRILLS.filter((d) => favIds.includes(d.id));
    else if (source === "folder" && folderId) {
      base = DRILLS.filter((d) => assignments[d.id]?.includes(folderId));
    }
    if (q) {
      const needle = q.toLowerCase();
      base = base.filter((d) =>
        d.name.toLowerCase().includes(needle) ||
        d.category.toLowerCase().includes(needle)
      );
    }
    return base;
  }, [source, folderId, q, favIds, assignments]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-border/60 bg-surface shadow-2xl"
      >
        <div className="px-5 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-[0.2em] text-foreground">ADD DRILL</h2>
            <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted-foreground">
              <X size={14} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <SourceTab active={source === "library"} onClick={() => setSource("library")} icon={BookOpen} label="Library" />
            <SourceTab active={source === "favorites"} onClick={() => setSource("favorites")} icon={Heart} label="Favourites" />
            <SourceTab active={source === "folder"} onClick={() => setSource("folder")} icon={Folder} label="Folders" />
          </div>

          {source === "folder" && (
            <div className="mt-3 -mx-5 overflow-x-auto px-5">
              {folders.length === 0 ? (
                <p className="rounded-xl border border-border/60 bg-surface-2 px-3 py-3 text-center text-xs text-muted-foreground">
                  No folders yet — create them from Favourites.
                </p>
              ) : (
                <div className="flex gap-2 pb-1">
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFolderId(f.id)}
                      className={"shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold " + (folderId === f.id ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface-2 text-muted-foreground")}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search drills…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-5">
          {list.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">No drills here.</p>
          ) : (
            <div className="space-y-2">
              {list.map((d) => {
                const added = existingIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => onPick(d)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-surface-2 p-2.5 text-left transition-colors hover:border-teal/50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
                      <Plus size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold tracking-wider text-volt">{d.category.toUpperCase()}</span>
                      <span className="block truncate text-sm font-semibold text-foreground">{d.name}</span>
                      <span className="text-[10px] text-muted-foreground">{d.durationMin}m · L{d.level} · {d.difficulty}</span>
                    </span>
                    {added && <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">ADDED</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Heart; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-bold tracking-wide " +
        (active ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface-2 text-muted-foreground")
      }
    >
      <Icon size={12} /> {label.toUpperCase()}
    </button>
  );
}