import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { savePracticePlan } from "@/lib/teams.functions";
import { ArrowLeft, Plus, X, GripVertical, Dumbbell, StickyNote, Library, Search, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import { DRILLS, CATEGORIES, type Category } from "@/data/pxf";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/$eventId/practice-plan")({
  component: PracticePlan,
});

type SessionChild = { drillId: string; drillName: string; durationMinutes: number };
type Item =
  | { id: string; itemType: "drill"; drillId?: string; drillName: string; durationMinutes: number }
  | { id: string; itemType: "note"; noteText: string; durationMinutes: number }
  | { id: string; itemType: "session"; sessionName: string; children: SessionChild[] };
type Drill = { id: string; title: string; category?: string | null; duration_minutes?: number | null };
type SavedBlock = { uid: string; drillId: string; mins: number };
type SavedSession = { id: string; name: string; date: string; totalMins: number; blocks: SavedBlock[] };
const SESSIONS_KEY = "pxf:sessions:v2";

function itemDuration(it: Item): number {
  if (it.itemType === "session") return it.children.reduce((a, b) => a + (b.durationMinutes || 0), 0);
  return it.durationMinutes || 0;
}

function PracticePlan() {
  const { teamId, eventId } = Route.useParams();
  const navigate = useNavigate();
  const save = useServerFn(savePracticePlan);
  const [items, setItems] = useState<Item[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [pickingSession, setPickingSession] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("All");
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const sid = window.localStorage.getItem(`pxf:event-session:${eventId}`);
        if (sid) {
          navigate({ to: "/session-detail/$sessionId", params: { sessionId: sid }, replace: true });
          return;
        }
      } catch { /* ignore */ }
    }
    (async () => {
      const { data: cats } = await supabase.from("drill_categories").select("id,title").order("sort_order");
      const catRows = (cats ?? []) as Array<{ id: string; title: string }>;
      const catMap = new Map<string, string>(catRows.map((c) => [c.id, c.title]));
      setDbCategories(catRows.map((c) => c.title));
      const { data: rows } = await supabase.from("drills").select("id,title,category_id,duration_minutes").order("title").limit(500);
      setDrills(((rows ?? []) as Array<{ id: string; title: string; category_id: string | null; duration_minutes: number | null }>).map((r) => ({
        id: r.id, title: r.title, category: r.category_id ? (catMap.get(r.category_id) ?? null) : null, duration_minutes: r.duration_minutes,
      })));
    })();
    if (typeof window !== "undefined") {
      try { setSessions(JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]")); } catch { /* ignore */ }
    }
  }, []);

  function add(item: Item) { setItems((prev) => [...prev, item]); }
  function addDrill(d: Drill) {
    add({
      id: crypto.randomUUID(),
      itemType: "drill",
      drillId: d.id,
      drillName: d.title,
      durationMinutes: d.duration_minutes ?? 10,
    });
  }
  function addSession(s: SavedSession) {
    const children: SessionChild[] = s.blocks.map((b) => {
      const d = DRILLS.find((x) => x.id === b.drillId);
      return { drillId: b.drillId, drillName: d?.name ?? "Drill", durationMinutes: b.mins };
    });
    const id = crypto.randomUUID();
    add({ id, itemType: "session", sessionName: s.name || "Session", children });
    setExpanded((e) => ({ ...e, [id]: true }));
    setPickingSession(false);
  }
  function remove(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)); }
  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id); const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev]; [copy[idx], copy[next]] = [copy[next], copy[idx]]; return copy;
    });
  }
  function setDuration(id: string, mins: number) {
    setItems((prev) => prev.map((i) => (i.id === id && i.itemType !== "session" ? { ...i, durationMinutes: Math.max(1, mins) } : i)));
  }
  function setChildDuration(parentId: string, childIdx: number, mins: number) {
    setItems((prev) => prev.map((i) => {
      if (i.id !== parentId || i.itemType !== "session") return i;
      const children = i.children.map((c, idx) => (idx === childIdx ? { ...c, durationMinutes: Math.max(1, mins) } : c));
      return { ...i, children };
    }));
  }

  async function persist() {
    setSaving(true);
    try {
      // Flatten sessions into a labelled note + child notes for persistence
      const flat: Array<{ itemType: "drill" | "note"; drillId?: string; noteText?: string; durationMinutes?: number }> = [];
      for (const it of items) {
        if (it.itemType === "drill") flat.push({ itemType: "drill", drillId: it.drillId, durationMinutes: it.durationMinutes });
        else if (it.itemType === "note") flat.push({ itemType: "note", noteText: it.noteText, durationMinutes: it.durationMinutes });
        else {
          flat.push({ itemType: "note", noteText: `▼ Session: ${it.sessionName}`, durationMinutes: itemDuration(it) });
          for (const c of it.children) flat.push({ itemType: "note", noteText: `  • ${c.drillName}`, durationMinutes: c.durationMinutes });
        }
      }
      await save({ data: { teamId, eventId, items: flat } });
      alert("Practice Plan saved");
    } catch (e: any) { alert(e?.message); } finally { setSaving(false); }
  }

  const total = items.reduce((a, b) => a + itemDuration(b), 0);

  const filteredDrills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drills.filter((d) => {
      if (catFilter !== "All" && (d.category || "") !== catFilter) return false;
      if (q && !d.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [drills, search, catFilter]);

  return (
    <div>
      <Link to="/coach/teams/$teamId/schedule/$eventId" params={{ teamId, eventId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back to event</Link>
      <div className="mt-2 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Practice Plan</h3>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold">Total {total} min</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">Browse drills or add a saved session to build your plan.</p>}
        {items.map((it, idx) => {
          const isSession = it.itemType === "session";
          const isOpen = !!expanded[it.id];
          return (
            <div key={it.id} className="rounded-xl border border-border bg-surface">
              <div className="flex items-center gap-2 p-2">
                <div className="flex flex-col">
                  <button onClick={() => move(it.id, -1)} className="text-muted-foreground disabled:opacity-30" disabled={idx === 0} aria-label="Move up"><ArrowUp size={12} /></button>
                  <GripVertical size={12} className="text-muted-foreground/60" />
                  <button onClick={() => move(it.id, 1)} className="text-muted-foreground disabled:opacity-30" disabled={idx === items.length - 1} aria-label="Move down"><ArrowDown size={12} /></button>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2">
                  {it.itemType === "drill" ? <Dumbbell size={14} /> : it.itemType === "session" ? <Library size={14} /> : <StickyNote size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${it.itemType === "session" ? "bg-volt/20 text-volt" : it.itemType === "drill" ? "bg-teal/20 text-teal" : "bg-surface-2 text-muted-foreground"}`}>{it.itemType}</span>
                    <p className="truncate text-sm font-semibold">{it.itemType === "drill" ? it.drillName : it.itemType === "session" ? it.sessionName : (it.noteText || "Note")}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{itemDuration(it)} min{isSession ? ` · ${it.children.length} drills` : ""}</p>
                </div>
                {!isSession && (
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={it.durationMinutes} onChange={(e) => setDuration(it.id, Number(e.target.value))} className="w-12 rounded-md border border-border bg-background px-1.5 py-1 text-center text-xs" />
                    <span className="text-[10px] text-muted-foreground">m</span>
                  </div>
                )}
                {isSession && (
                  <button onClick={() => setExpanded((e) => ({ ...e, [it.id]: !isOpen }))} className="text-muted-foreground" aria-label="Expand">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
                <button onClick={() => remove(it.id)} className="text-muted-foreground" aria-label="Remove"><X size={14} /></button>
              </div>
              {isSession && isOpen && (
                <div className="border-t border-border/60 px-2 py-2 space-y-1.5 bg-background/30">
                  {it.children.length === 0 && <p className="text-[11px] text-muted-foreground">No drills in this session.</p>}
                  {it.children.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5">
                      <Dumbbell size={11} className="text-muted-foreground" />
                      <p className="flex-1 truncate text-xs">{c.drillName}</p>
                      <input type="number" min={1} value={c.durationMinutes} onChange={(e) => setChildDuration(it.id, ci, Number(e.target.value))} className="w-12 rounded-md border border-border bg-background px-1.5 py-0.5 text-center text-[11px]" />
                      <span className="text-[10px] text-muted-foreground">m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={() => setBrowsing(true)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><Search size={12} /> Browse drills</button>
        <button onClick={() => setPickingSession(true)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><Library size={12} /> Add session</button>
        <button onClick={() => add({ id: crypto.randomUUID(), itemType: "note", noteText: "Water break", durationMinutes: 5 })} className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><Plus size={12} /> Add note</button>
      </div>
      <button onClick={persist} disabled={saving || items.length === 0} className="mt-4 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save plan"}</button>

      {browsing && (
        <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={() => setBrowsing(false)}>
          <div className="mx-auto flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-3xl border-t border-border bg-surface" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 pb-2">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Browse drills</p>
                <button onClick={() => setBrowsing(false)} className="text-muted-foreground"><X size={16} /></button>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                <Search size={14} className="text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drills…" className="flex-1 bg-transparent text-sm outline-none" />
              </div>
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {(["All", ...(dbCategories.length ? dbCategories : CATEGORIES.map((c) => c.name))]).map((c) => (
                  <button key={c} onClick={() => setCatFilter(c)} className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${catFilter === c ? "bg-gradient-brand text-primary-foreground" : "border border-border bg-background text-muted-foreground"}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
              {filteredDrills.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    {d.category && <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.category}</p>}
                  </div>
                  <button onClick={() => addDrill(d)} className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-2.5 py-1 text-[11px] font-bold text-primary-foreground"><Plus size={11} /> Add</button>
                </div>
              ))}
              {filteredDrills.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No drills match.</p>}
            </div>
          </div>
        </div>
      )}

      {pickingSession && (
        <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={() => setPickingSession(false)}>
          <div className="mx-auto max-h-[70vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Add a saved session</p>
              <button onClick={() => setPickingSession(false)} className="text-muted-foreground"><X size={16} /></button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Drops a saved session in as an expandable block.</p>
            <div className="mt-3 space-y-1.5">
              {sessions.map((s) => (
                <button key={s.id} onClick={() => addSession(s)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left">
                  <p className="text-sm font-semibold">{s.name || "Untitled session"}</p>
                  <p className="text-[10px] text-muted-foreground">{s.blocks.length} drills · {s.totalMins} min</p>
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