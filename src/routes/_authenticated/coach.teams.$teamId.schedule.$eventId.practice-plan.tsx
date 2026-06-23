import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { savePracticePlan } from "@/lib/teams.functions";
import { ArrowLeft, Plus, X, GripVertical, Dumbbell, StickyNote, Library } from "lucide-react";
import { DRILLS } from "@/data/pxf";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/$eventId/practice-plan")({
  component: PracticePlan,
});

type Item = { id: string; itemType: "drill" | "note"; drillId?: string; drillName?: string; noteText?: string; durationMinutes: number };
type Drill = { id: string; title: string };
type SavedBlock = { uid: string; drillId: string; mins: number };
type SavedSession = { id: string; name: string; date: string; totalMins: number; blocks: SavedBlock[] };
const SESSIONS_KEY = "pxf:sessions:v2";

function PracticePlan() {
  const { teamId, eventId } = Route.useParams();
  const save = useServerFn(savePracticePlan);
  const [items, setItems] = useState<Item[]>([]);
  const [picking, setPicking] = useState(false);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("drills").select("id,title").order("title").limit(200).then(({ data }) => setDrills((data ?? []) as Drill[]));
    if (typeof window !== "undefined") {
      try { setSessions(JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]")); } catch { /* ignore */ }
    }
  }, []);

  function add(item: Item) { setItems([...items, item]); }
  function loadSession(s: SavedSession) {
    const next: Item[] = s.blocks.map((b) => {
      const d = DRILLS.find((x) => x.id === b.drillId);
      return {
        id: crypto.randomUUID(),
        itemType: "note" as const,
        noteText: d?.name ?? "Drill",
        durationMinutes: b.mins,
      };
    });
    setItems([...items, ...next]);
    setLoadingSession(false);
  }
  function remove(id: string) { setItems(items.filter((i) => i.id !== id)); }
  function move(id: string, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === id); const next = idx + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items]; [copy[idx], copy[next]] = [copy[next], copy[idx]]; setItems(copy);
  }

  async function persist() {
    setSaving(true);
    try {
      await save({ data: { teamId, eventId, items: items.map((i) => ({ itemType: i.itemType, drillId: i.drillId, noteText: i.noteText, durationMinutes: i.durationMinutes })) } });
      alert("Practice plan saved");
    } catch (e: any) { alert(e?.message); } finally { setSaving(false); }
  }

  const total = items.reduce((a, b) => a + (b.durationMinutes || 0), 0);

  return (
    <div>
      <Link to="/coach/teams/$teamId/schedule/$eventId" params={{ teamId, eventId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back to event</Link>
      <div className="mt-2 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Practice plan</h3>
        <span className="text-[11px] text-muted-foreground">{total} min</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">Add drills or notes to build your plan.</p>}
        {items.map((it, idx) => (
          <div key={it.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
            <button onClick={() => move(it.id, -1)} className="text-muted-foreground" disabled={idx === 0}><GripVertical size={14} /></button>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2">
              {it.itemType === "drill" ? <Dumbbell size={14} /> : <StickyNote size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{it.itemType === "drill" ? it.drillName : (it.noteText || "Note")}</p>
              <p className="text-[10px] text-muted-foreground">{it.durationMinutes} min</p>
            </div>
            <button onClick={() => remove(it.id)} className="text-muted-foreground"><X size={14} /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={() => setLoadingSession(true)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><Library size={12} /> Full session</button>
        <button onClick={() => setPicking(true)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><Plus size={12} /> Add drill</button>
        <button onClick={() => add({ id: crypto.randomUUID(), itemType: "note", noteText: "Water break", durationMinutes: 5 })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><Plus size={12} /> Add note</button>
      </div>
      <button onClick={persist} disabled={saving || items.length === 0} className="mt-4 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save plan"}</button>

      {picking && (
        <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={() => setPicking(false)}>
          <div className="mx-auto max-h-[70vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <p className="text-xs font-bold">Choose a drill</p>
            <div className="mt-2 space-y-1">
              {drills.map((d) => (
                <button key={d.id} onClick={() => { add({ id: crypto.randomUUID(), itemType: "drill", drillId: d.id, drillName: d.title, durationMinutes: 10 }); setPicking(false); }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm">{d.title}</button>
              ))}
              {drills.length === 0 && <p className="text-xs text-muted-foreground">No drills in your library yet.</p>}
            </div>
          </div>
        </div>
      )}

      {loadingSession && (
        <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={() => setLoadingSession(false)}>
          <div className="mx-auto max-h-[70vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <p className="text-xs font-bold">Load full session</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Pulls blocks from a saved session into this practice plan.</p>
            <div className="mt-3 space-y-1.5">
              {sessions.map((s) => (
                <button key={s.id} onClick={() => loadSession(s)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left">
                  <p className="text-sm font-semibold">{s.name || "Untitled session"}</p>
                  <p className="text-[10px] text-muted-foreground">{s.blocks.length} blocks · {s.totalMins} min</p>
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No saved sessions yet. Build one in the Sessions builder first.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}