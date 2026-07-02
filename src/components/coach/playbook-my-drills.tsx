import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Upload, X, Video, Share2, Pencil, Film } from "lucide-react";

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
  createdAt: string;
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
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export function PlaybookMyDrills() {
  const [drills, setDrills] = useState<MyDrill[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

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

      {drills.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center">
          <Film size={22} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold text-foreground">No drills yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first drill or upload video from IHS through the web portal
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            <Plus size={12} /> Create Drill
          </button>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {drills.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <Link
                to="/playbook-drill/$drillId"
                params={{ drillId: d.id }}
                search={{ from: "mydrills" }}
                className="flex flex-1 items-center gap-3"
              >
                <div className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-surface text-teal">
                  <Video size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{d.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-teal">
                    {d.category} · {d.level}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{d.duration}</p>
                </div>
              </Link>
              <div className="flex flex-col gap-1">
                <button className="rounded-full p-1.5 text-muted-foreground" aria-label="Edit"><Pencil size={14} /></button>
                <button className="rounded-full p-1.5 text-muted-foreground" aria-label="Share"><Share2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        For IHS recordings, upload directly from the web portal for best quality.
      </p>

      {createOpen && <CreateDrillModal onClose={() => setCreateOpen(false)} onSave={save} />}
      {uploadOpen && <UploadDrillModal onClose={() => setUploadOpen(false)} onSave={save} />}
    </div>
  );
}

function CreateDrillModal({ onClose, onSave }: { onClose: () => void; onSave: (d: MyDrill) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [level, setLevel] = useState<string>(LEVELS[1]);
  const [ageGroup, setAgeGroup] = useState("U13+");
  const [duration, setDuration] = useState("10m");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [videoName, setVideoName] = useState<string | undefined>();
  const videoRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!name.trim()) return;
    onSave({
      id: `md-${Date.now()}`,
      name: name.trim(),
      category, level, ageGroup, duration, description, notes, videoName,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <ModalShell title="Create Drill" onClose={onClose}>
      <Field label="Drill Name">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tight Turn Shooter" className={inputClass} />
      </Field>
      <Field label="Category">
        <ChipRow items={CATEGORIES as unknown as string[]} value={category} onChange={setCategory} />
      </Field>
      <Field label="Level">
        <ChipRow items={LEVELS as unknown as string[]} value={level} onChange={setLevel} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age Group">
          <input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Duration">
          <input value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
      </Field>
      <Field label="Diagram">
        <button onClick={() => imageRef.current?.click()} className="w-full rounded-xl border border-dashed border-border bg-surface-2 px-3 py-3 text-xs font-semibold text-muted-foreground">
          Draw or upload image
        </button>
        <input ref={imageRef} type="file" accept="image/*" className="hidden" />
      </Field>
      <Field label="Video">
        <button onClick={() => videoRef.current?.click()} className="w-full rounded-xl border border-dashed border-border bg-surface-2 px-3 py-3 text-xs font-semibold text-muted-foreground">
          {videoName ?? "Upload from camera roll"}
        </button>
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setVideoName(e.target.files?.[0]?.name)}
        />
      </Field>
      <Field label="Notes (coach only)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
      </Field>
      <button onClick={submit} className="mt-2 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground">
        Save Drill
      </button>
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