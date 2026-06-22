import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Clock, Heart, Folder as FolderIcon, Trash2, MoreVertical, X } from "lucide-react";
import { usePlaybookFolders } from "@/hooks/usePlaybookFolders";
import { usePlaybookFavorites } from "@/hooks/usePlaybookFavorites";
import { FolderManager } from "./folder-manager";
import { CATEGORIES } from "@/data/pxf";

type SessionBlock = { uid: string; drillId: string; mins: number };
type SavedSession = {
  id: string; name: string; date: string; age: string; level: string;
  totalMins: number; notes: string; blocks: SessionBlock[]; focus?: string;
  completed?: boolean; completedAt?: string; folderId?: string | null;
};

const AGE_GROUPS = ["U9+", "U11+", "U13+", "U15+"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"] as const;

const KEY = "pxf:sessions:v2";
function read(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try { const r = window.localStorage.getItem(KEY); return r ? JSON.parse(r) as SavedSession[] : []; } catch { return []; }
}
function write(list: SavedSession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("pxf:sessions-changed"));
}

export function PlaybookSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [showFolders, setShowFolders] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const folders = usePlaybookFolders("session");
  const fav = usePlaybookFavorites();

  useEffect(() => {
    const sync = () => setSessions(read());
    sync();
    window.addEventListener("pxf:sessions-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pxf:sessions-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const visible = useMemo(() => {
    if (!activeFolder) return sessions;
    if (activeFolder === "__unfiled") return sessions.filter((s) => !s.folderId);
    return sessions.filter((s) => s.folderId === activeFolder);
  }, [sessions, activeFolder]);

  function setFolder(id: string, folderId: string | null) {
    const list = read().map((s) => s.id === id ? { ...s, folderId } : s);
    write(list); setSessions(list); setAssignFor(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this session?")) return;
    const list = read().filter((s) => s.id !== id);
    write(list); setSessions(list);
  }
  function createSession(session: SavedSession) {
    const list = [session, ...read()].slice(0, 100);
    write(list);
    setSessions(list);
    setCreateOpen(false);
    navigate({ to: "/session-detail/$sessionId", params: { sessionId: session.id } });
  }

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 gap-1 overflow-x-auto pb-1">
          <Chip active={activeFolder === null} onClick={() => setActiveFolder(null)}>All</Chip>
          <Chip active={activeFolder === "__unfiled"} onClick={() => setActiveFolder("__unfiled")}>Unfiled</Chip>
          {folders.folders.map((f) => (
            <Chip key={f.id} active={activeFolder === f.id} onClick={() => setActiveFolder(f.id)}>{f.name}</Chip>
          ))}
        </div>
        <button onClick={() => setShowFolders(true)} className="rounded-full border border-border bg-surface p-2 text-muted-foreground" aria-label="Manage folders">
          <FolderIcon size={14} />
        </button>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black">
          <Plus size={12} /> New
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">No sessions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Build a session to add it here.</p>
          <button onClick={() => setCreateOpen(true)} className="mt-3 inline-flex items-center gap-1 rounded-full bg-teal px-4 py-1.5 text-[11px] font-bold text-black">
            <Plus size={12} /> Build session
          </button>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((s) => {
            const isFav = fav.isFav("session", s.id);
            const fold = folders.folders.find((f) => f.id === s.folderId);
            return (
              <li key={s.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/session-detail/$sessionId" params={{ sessionId: s.id }} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{s.name || "Untitled session"}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Clock size={10} /> {s.totalMins || 0} min · {s.blocks?.length ?? 0} drills
                      {fold && <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-foreground/70">📁 {fold.name}</span>}
                    </p>
                  </Link>
                  <div className="flex items-center gap-1">
                    <button onClick={() => fav.toggle("session", s.id)} aria-label="Favorite" className="rounded-full p-1.5">
                      <Heart size={14} className={isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
                    </button>
                    <button onClick={() => setAssignFor(s.id)} aria-label="More" className="rounded-full p-1.5 text-muted-foreground">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {assignFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setAssignFor(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Move to folder</h3>
              <button onClick={() => setAssignFor(null)}><X size={14} /></button>
            </div>
            <button onClick={() => setFolder(assignFor, null)} className="mb-1 w-full rounded-xl border border-border bg-surface p-2 text-left text-xs text-foreground">No folder</button>
            {folders.folders.map((f) => (
              <button key={f.id} onClick={() => setFolder(assignFor, f.id)} className="mb-1 w-full rounded-xl border border-border bg-surface p-2 text-left text-xs text-foreground">{f.name}</button>
            ))}
            <button onClick={() => { remove(assignFor); setAssignFor(null); }} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-red-500/40 bg-red-500/5 p-2 text-xs font-semibold text-red-400">
              <Trash2 size={12} /> Delete session
            </button>
          </div>
        </div>
      )}

      {showFolders && <FolderManager kind="session" onClose={() => setShowFolders(false)} />}
      {createOpen && <CreateSessionModal onClose={() => setCreateOpen(false)} onSave={createSession} />}
    </div>
  );
}

function CreateSessionModal({ onClose, onSave }: { onClose: () => void; onSave: (session: SavedSession) => void }) {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayISO);
  const [age, setAge] = useState<string>("U13+");
  const [level, setLevel] = useState<string>("Intermediate");
  const [mins, setMins] = useState<number>(60);
  const [focus, setFocus] = useState<string>(CATEGORIES[0]?.name ?? "Skating");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const nameError = touched && !name.trim() ? "Session name is required" : null;

  function submit() {
    setTouched(true);
    if (!name.trim()) return;
    onSave({
      id: `s-${Date.now()}`,
      name: name.trim(),
      date,
      age,
      level,
      totalMins: Math.max(5, Number(mins) || 60),
      notes: notes.trim(),
      focus,
      blocks: [],
      completed: false,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-screen-sm overflow-y-auto rounded-t-3xl border-t border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">NEW</p>
            <h2 className="mt-0.5 text-lg font-bold text-foreground">Create Session</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <ModalField label="Session Name" error={nameError}>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Friday PEP Development" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal" />
          </ModalField>
          <ModalField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal" />
          </ModalField>
          <ModalField label="Age Group">
            <div className="flex flex-wrap gap-1.5">{AGE_GROUPS.map((a) => <Chip key={a} active={age === a} onClick={() => setAge(a)}>{a}</Chip>)}</div>
          </ModalField>
          <ModalField label="Skill Level">
            <div className="flex flex-wrap gap-1.5">{LEVELS.map((l) => <Chip key={l} active={level === l} onClick={() => setLevel(l)}>{l}</Chip>)}</div>
          </ModalField>
          <ModalField label="Total Duration (minutes)">
            <input type="number" min={5} step={5} value={mins} onChange={(e) => setMins(Number(e.target.value))} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none focus:border-teal" />
          </ModalField>
          <ModalField label="Main Focus">
            <div className="flex flex-wrap gap-1.5">{CATEGORIES.map((c) => <Chip key={c.name} active={focus === c.name} onClick={() => setFocus(c.name)}>{c.name}</Chip>)}</div>
          </ModalField>
          <ModalField label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Session intent, key cues, equipment reminders…" className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal" />
          </ModalField>
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-surface p-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-border bg-surface-2 py-3 text-[12px] font-bold tracking-wide text-foreground">CANCEL</button>
          <button onClick={submit} className="flex-[1.4] rounded-2xl bg-gradient-brand py-3 text-[12px] font-bold tracking-wide text-primary-foreground shadow-glow-teal">SAVE SESSION</button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">{label.toUpperCase()}</label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold " + (active ? "border-teal bg-teal text-background" : "border-border bg-surface text-muted-foreground")}>
      {children}
    </button>
  );
}