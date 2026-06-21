import { useEffect, useState, useMemo } from "react";
import { Plus, Calendar, Heart, Folder as FolderIcon, Trash2, ChevronRight, X, Pencil, Check, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlaybookFolders } from "@/hooks/usePlaybookFolders";
import { usePlaybookFavorites } from "@/hooks/usePlaybookFavorites";
import { FolderManager } from "./folder-manager";

type Template = {
  id: string;
  name: string;
  description: string | null;
  num_days: number;
  folder_id: string | null;
};
type Day = {
  id: string;
  template_id: string;
  day_number: number;
  session_name: string | null;
  session_snapshot: any;
};

type SavedSession = {
  id: string; name: string; totalMins: number; blocks: { uid: string; drillId: string; mins: number }[];
};

function readSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try { const r = window.localStorage.getItem("pxf:sessions:v2"); return r ? JSON.parse(r) : []; } catch { return []; }
}

export function PlaybookCamps() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showFolders, setShowFolders] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const folders = usePlaybookFolders("camp");
  const fav = usePlaybookFavorites();

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setTemplates([]); setLoading(false); return; }
    const { data } = await supabase
      .from("camp_templates")
      .select("id,name,description,num_days,folder_id")
      .eq("owner_id", u.user.id)
      .order("created_at", { ascending: false });
    setTemplates((data ?? []) as Template[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    if (!activeFolder) return templates;
    if (activeFolder === "__unfiled") return templates.filter((t) => !t.folder_id);
    return templates.filter((t) => t.folder_id === activeFolder);
  }, [templates, activeFolder]);

  async function create() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("camp_templates")
      .insert({ owner_id: u.user.id, name: "New Camp Template", num_days: 3 })
      .select("id,name,description,num_days,folder_id")
      .single();
    if (data) { await load(); setEditing(data as Template); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this camp template?")) return;
    await supabase.from("camp_templates").delete().eq("id", id);
    await load();
  }

  if (editing) return <TemplateEditor template={editing} onClose={() => { setEditing(null); load(); }} onDelete={remove} folders={folders.folders} />;

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
        <button onClick={create} className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black">
          <Plus size={12} /> New
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-xs text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center">
          <Layers size={20} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold text-foreground">No camp templates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Build a reusable multi-day curriculum.</p>
          <button onClick={create} className="mt-3 inline-flex items-center gap-1 rounded-full bg-teal px-4 py-1.5 text-[11px] font-bold text-black">
            <Plus size={12} /> New template
          </button>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((t) => {
            const isFav = fav.isFav("camp", t.id);
            const fold = folders.folders.find((f) => f.id === t.folder_id);
            return (
              <li key={t.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setEditing(t)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-bold text-foreground">{t.name}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Calendar size={10} /> {t.num_days}-day
                      {fold && <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-foreground/70">📁 {fold.name}</span>}
                    </p>
                    {t.description && <p className="mt-1 truncate text-[11px] text-muted-foreground">{t.description}</p>}
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => fav.toggle("camp", t.id)} aria-label="Favorite" className="rounded-full p-1.5">
                      <Heart size={14} className={isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
                    </button>
                    <button onClick={() => setEditing(t)} className="rounded-full p-1.5 text-muted-foreground"><ChevronRight size={14} /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showFolders && <FolderManager kind="camp" onClose={() => setShowFolders(false)} />}
    </div>
  );
}

function TemplateEditor({ template, onClose, onDelete, folders }: {
  template: Template;
  onClose: () => void;
  onDelete: (id: string) => void;
  folders: { id: string; name: string }[];
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [numDays, setNumDays] = useState(template.num_days);
  const [folderId, setFolderId] = useState<string | null>(template.folder_id);
  const [days, setDays] = useState<Day[]>([]);
  const [picker, setPicker] = useState<number | null>(null);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSavedSessions(readSessions()); }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("camp_template_days")
        .select("*")
        .eq("template_id", template.id)
        .order("day_number");
      setDays((data ?? []) as Day[]);
    })();
  }, [template.id]);

  async function save() {
    setSaving(true);
    await supabase.from("camp_templates")
      .update({ name, description: description || null, num_days: numDays, folder_id: folderId })
      .eq("id", template.id);
    setSaving(false);
    onClose();
  }

  async function assignDay(day: number, session: SavedSession | null) {
    const existing = days.find((d) => d.day_number === day);
    if (existing) {
      if (session) {
        await supabase.from("camp_template_days").update({
          session_name: session.name, session_snapshot: session as any,
        }).eq("id", existing.id);
      } else {
        await supabase.from("camp_template_days").delete().eq("id", existing.id);
      }
    } else if (session) {
      await supabase.from("camp_template_days").insert({
        template_id: template.id, day_number: day,
        session_name: session.name, session_snapshot: session as any,
      });
    }
    const { data } = await supabase.from("camp_template_days").select("*").eq("template_id", template.id).order("day_number");
    setDays((data ?? []) as Day[]);
    setPicker(null);
  }

  const dayNumbers = Array.from({ length: numDays }, (_, i) => i + 1);

  return (
    <div className="pt-1">
      <button onClick={onClose} className="mb-3 text-[11px] font-semibold text-muted-foreground">← Back to templates</button>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-base font-bold text-foreground focus:outline-none" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none" />
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Number of days</p>
          <div className="flex flex-wrap gap-2">
            {[3, 5, 7].map((n) => (
              <button key={n} onClick={() => setNumDays(n)} className={"rounded-full border px-3 py-1.5 text-[11px] font-semibold " + (numDays === n ? "border-teal bg-teal text-background" : "border-border bg-surface text-muted-foreground")}>{n}-day</button>
            ))}
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1">
              <span className="text-[10px] text-muted-foreground">Custom:</span>
              <input type="number" min={1} max={30} value={numDays} onChange={(e) => setNumDays(Math.max(1, Math.min(30, parseInt(e.target.value || "1"))))} className="w-12 bg-transparent text-center text-[11px] font-semibold text-foreground focus:outline-none" />
            </div>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Folder</p>
          <select value={folderId ?? ""} onChange={(e) => setFolderId(e.target.value || null)} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none">
            <option value="">No folder</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Days</p>
      <ul className="space-y-2">
        {dayNumbers.map((n) => {
          const d = days.find((x) => x.day_number === n);
          return (
            <li key={n} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day {n}</p>
                {d && <button onClick={() => assignDay(n, null)} className="text-[10px] font-semibold text-muted-foreground hover:text-red-400">Remove</button>}
              </div>
              {d ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-teal/30 bg-teal/5 p-2.5">
                  <p className="truncate text-xs font-bold text-teal">{d.session_name}</p>
                  <button onClick={() => setPicker(n)} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-foreground">Change</button>
                </div>
              ) : (
                <button onClick={() => setPicker(n)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-teal/40 hover:text-teal">
                  <Plus size={12} /> Assign session
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex gap-2">
        <button onClick={() => onDelete(template.id)} className="flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/5 px-3 py-2 text-[11px] font-semibold text-red-400">
          <Trash2 size={12} /> Delete
        </button>
        <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-teal py-2 text-[11px] font-bold text-black disabled:opacity-50">
          {saving ? "Saving…" : "Save template"}
        </button>
      </div>

      {picker !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setPicker(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Pick a session for Day {picker}</h3>
              <button onClick={() => setPicker(null)}><X size={14} /></button>
            </div>
            {savedSessions.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No saved sessions yet.</p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {savedSessions.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => assignDay(picker, s)} className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left hover:border-teal/40">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.blocks?.length ?? 0} drills · {s.totalMins ?? 0} min</p>
                      </div>
                      <Plus size={14} className="text-teal" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
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