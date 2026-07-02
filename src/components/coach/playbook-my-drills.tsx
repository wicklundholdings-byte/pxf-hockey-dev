import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus, Upload, X, Video, Pencil, Heart, Play, Undo2, Trash2, Palette,
} from "lucide-react";

type MyDrill = {
  id: string;
  name: string;
  category: string;
  level: string;
  ageGroup: string;
  duration: string;
  description: string;
  notes: string;
  videoName?: string;
  ihsUrl?: string;
  diagram?: DiagramShape[];
  createdAt: string;
};

type Tool = "player" | "skate" | "pass" | "puck";
type Color = "teal" | "white" | "amber";
type DiagramShape =
  | { kind: "player"; x: number; y: number; color: Color }
  | { kind: "skate" | "pass" | "puck"; x1: number; y1: number; x2: number; y2: number; color: Color };

const COLORS: Record<Color, string> = {
  teal: "#00E5D6",
  white: "#f8fafc",
  amber: "#F59E0B",
};

const KEY = "pxf:my-drills:v1";
function readAll(): MyDrill[] {
  if (typeof window === "undefined") return [];
  try { const r = window.localStorage.getItem(KEY); return r ? JSON.parse(r) as MyDrill[] : []; } catch { return []; }
}
function writeAll(list: MyDrill[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("pxf:my-drills-changed"));
}

const CATEGORIES = ["Skating", "Slip Training", "GameIQ", "Dryland", "Other"] as const;
const FULL_CATEGORIES = ["Skating", "Slip Training", "GameIQ", "Dryland", "Offensive", "Defensive", "Other"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

const MOCK_DRILLS: MyDrill[] = [
  {
    id: "md-mock-2on1",
    name: "2-on-1 Rush Progression",
    category: "Offensive",
    level: "Intermediate",
    ageGroup: "Ages 12+",
    duration: "15",
    description: "Two-attacker rush concepts against a single defender with reads and finishing.",
    notes: "",
    ihsUrl: "https://ihs.com/drills/2on1-rush",
    createdAt: "2024-05-01T00:00:00Z",
  },
  {
    id: "md-mock-back-cross",
    name: "Backward Crossover Circuit",
    category: "Skating",
    level: "Beginner",
    ageGroup: "Ages 10-14",
    duration: "12",
    description: "Full-ice backward crossover circuit for edge control and posture.",
    notes: "",
    createdAt: "2024-05-02T00:00:00Z",
  },
  {
    id: "md-mock-def-gap",
    name: "Defensive Gap Control",
    category: "GameIQ",
    level: "Advanced",
    ageGroup: "Ages 13+",
    duration: "20",
    description: "Reads and gap control drills for defenders vs a controlled rush.",
    notes: "",
    createdAt: "2024-05-03T00:00:00Z",
  },
];

export function PlaybookMyDrills() {
  const [drills, setDrills] = useState<MyDrill[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => setDrills(readAll());
    sync();
    window.addEventListener("pxf:my-drills-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pxf:my-drills-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggleFav(id: string) {
    setFavIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function save(d: MyDrill) {
    const list = [d, ...readAll()];
    writeAll(list);
    setDrills(list);
    setCreateOpen(false);
    setUploadOpen(false);
  }

  return (
    <div className="pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">MY DRILLS</p>
          <p className="mt-1 text-xs text-muted-foreground">Your personal drill library</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            <Plus size={12} /> Create Drill
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-bold text-foreground"
          >
            <Upload size={12} /> Upload
          </button>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {[...MOCK_DRILLS, ...drills].map((d) => (
          <DrillCard key={d.id} drill={d} favorited={favIds.has(d.id)} onToggleFav={() => toggleFav(d.id)} />
        ))}
      </ul>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        For IHS recordings, upload directly from the web portal for best quality.
      </p>

      {createOpen && <CreateDrillModal onClose={() => setCreateOpen(false)} onSave={save} />}
      {uploadOpen && <UploadDrillModal onClose={() => setUploadOpen(false)} onSave={save} />}
    </div>
  );
}

function DrillCard({ drill: d, favorited, onToggleFav }: { drill: MyDrill; favorited: boolean; onToggleFav: () => void }) {
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        to="/playbook-drill/$drillId"
        params={{ drillId: d.id }}
        search={{ from: "mydrills" }}
        className="flex gap-3 p-3"
      >
        <div className="relative grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-black text-muted-foreground">
          <Play size={20} className="text-teal" />
          {d.ihsUrl && (
            <span className="absolute right-1 top-1 rounded-full border border-teal bg-black/60 px-1.5 py-[1px] text-[9px] font-bold tracking-wider text-teal">
              IHS
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{d.name}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-teal">
            MY DRILLS · {d.category.toUpperCase()} · {d.level.toUpperCase()}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {d.ageGroup} · ⏱ {d.duration} min
          </p>
        </div>
        <div className="flex flex-col items-end justify-between">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="rounded-full p-1.5 text-muted-foreground"
            aria-label="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
            className="rounded-full p-1.5"
            aria-label="Favorite"
          >
            <Heart size={14} className={favorited ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
          </button>
        </div>
      </Link>
    </li>
  );
}

function CreateDrillModal({ onClose, onSave }: { onClose: () => void; onSave: (d: MyDrill) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(FULL_CATEGORIES[0]);
  const [level, setLevel] = useState<string>(LEVELS[1]);
  const [ageGroup, setAgeGroup] = useState("U13+");
  const [duration, setDuration] = useState("10");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [ihsUrl, setIhsUrl] = useState("");
  const [videoName, setVideoName] = useState<string | undefined>();
  const [diagram, setDiagram] = useState<DiagramShape[] | undefined>();
  const [diagramOpen, setDiagramOpen] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!name.trim()) return;
    onSave({
      id: `md-${Date.now()}`,
      name: name.trim(),
      category, level, ageGroup, duration, description, notes, videoName,
      ihsUrl: ihsUrl.trim() || undefined,
      diagram,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <ModalShell title="Create Drill" onClose={onClose}>
      <Field label="Drill Name">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tight Turn Shooter" className={inputClass} />
      </Field>
      <Field label="Category">
        <ChipRow items={FULL_CATEGORIES as unknown as string[]} value={category} onChange={setCategory} />
      </Field>
      <Field label="Level">
        <ChipRow items={LEVELS as unknown as string[]} value={level} onChange={setLevel} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age Group">
          <input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder='e.g. "U13+" or "Ages 10-16"' className={inputClass} />
        </Field>
        <Field label="Duration (min)">
          <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
      </Field>
      <Field label="Coaching Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Private — not visible to athletes" className={inputClass} />
        <p className="mt-1 text-[10px] text-muted-foreground">Private — not visible to athletes.</p>
      </Field>
      <Field label="IHS Drill Link (optional)">
        <input value={ihsUrl} onChange={(e) => setIhsUrl(e.target.value)} placeholder="Paste IHS drill URL..." className={inputClass} />
        <p className="mt-1 text-[10px] text-muted-foreground">Athletes will be directed to IHS to view this drill.</p>
      </Field>
      <Field label="Video">
        <button onClick={() => videoRef.current?.click()} className="w-full rounded-xl border border-dashed border-border bg-surface-2 px-3 py-3 text-xs font-semibold text-muted-foreground">
          📹 {videoName ?? "Upload Video"}
        </button>
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setVideoName(e.target.files?.[0]?.name)}
        />
      </Field>
      <Field label="Diagram">
        {diagram && diagram.length > 0 ? (
          <button onClick={() => setDiagramOpen(true)} className="block w-full overflow-hidden rounded-xl border border-border bg-black">
            <DiagramThumb shapes={diagram} />
          </button>
        ) : (
          <button onClick={() => setDiagramOpen(true)} className="w-full rounded-xl border border-dashed border-border bg-surface-2 px-3 py-3 text-xs font-semibold text-muted-foreground">
            🎨 Add Diagram
          </button>
        )}
      </Field>
      <button onClick={submit} className="mt-2 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground">
        Save Drill
      </button>

      {diagramOpen && (
        <DiagramEditor
          initial={diagram}
          onCancel={() => setDiagramOpen(false)}
          onSave={(s) => { setDiagram(s); setDiagramOpen(false); }}
        />
      )}
    </ModalShell>
  );
}

function UploadDrillModal({ onClose, onSave }: { onClose: () => void; onSave: (d: MyDrill) => void }) {
  const [videoName, setVideoName] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [level, setLevel] = useState<string>(LEVELS[1]);
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(100);
  const videoRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!name.trim() || !videoName) return;
    onSave({
      id: `md-${Date.now()}`,
      name: name.trim(),
      category, level,
      ageGroup: "",
      duration: `${Math.max(1, trimOut - trimIn)}s clip`,
      description: "",
      notes: "",
      videoName,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <ModalShell title="Upload Video" onClose={onClose}>
      <button onClick={() => videoRef.current?.click()} className="w-full rounded-xl border border-dashed border-border bg-surface-2 px-3 py-4 text-xs font-semibold text-muted-foreground">
        {videoName ?? "Select video from camera roll"}
      </button>
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => setVideoName(e.target.files?.[0]?.name)}
      />

      <Field label="Drill Name">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Backhand Release" className={inputClass} />
      </Field>
      <Field label="Category">
        <ChipRow items={CATEGORIES as unknown as string[]} value={category} onChange={setCategory} />
      </Field>
      <Field label="Level">
        <ChipRow items={LEVELS as unknown as string[]} value={level} onChange={setLevel} />
      </Field>
      <Field label={`Trim  ·  in ${trimIn}%  ·  out ${trimOut}%`}>
        <div className="space-y-2">
          <input type="range" min={0} max={100} value={trimIn} onChange={(e) => setTrimIn(Math.min(Number(e.target.value), trimOut - 1))} className="w-full" />
          <input type="range" min={0} max={100} value={trimOut} onChange={(e) => setTrimOut(Math.max(Number(e.target.value), trimIn + 1))} className="w-full" />
        </div>
      </Field>
      <button onClick={submit} disabled={!name.trim() || !videoName} className="mt-2 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        Save to My Drills
      </button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        For IHS recordings, upload directly from the web portal for best quality.
      </p>
    </ModalShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">{label.toUpperCase()}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ChipRow({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={
            "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold " +
            (value === i ? "border-teal bg-teal text-background" : "border-border bg-surface text-muted-foreground")
          }
        >
          {i}
        </button>
      ))}
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-screen-sm overflow-y-auto rounded-t-3xl border-t border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">NEW</p>
            <h2 className="mt-0.5 text-lg font-bold text-foreground">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>
  );
}