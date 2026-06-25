import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { savePracticePlan, createEvent } from "@/lib/teams.functions";
import {
  ArrowLeft, Pencil, Calendar as CalendarIcon, Clock, Users, BarChart3, Disc3,
  Wrench, ListChecks, GripVertical, Trash2, ChevronRight, Plus, Copy, CheckCircle2,
  Play, X, SkipForward, Save, Pause, RotateCcw, Video, Image as ImageIcon, Minus, Printer,
  ClipboardList,
} from "lucide-react";
import { DRILLS, findDrill, type Category, type Drill } from "@/data/pxf";

const SESSIONS_KEY = "pxf:sessions:v2";
const EVT = "pxf:sessions-changed";

type Block = { uid: string; drillId: string; mins: number; notes?: string };
type Session = {
  id: string;
  name: string;
  date: string;
  age: string;
  level: string;
  totalMins: number;
  notes: string;
  blocks: Block[];
  completed?: boolean;
  completedAt?: string;
};

function readAll(): Session[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]"); } catch { return []; }
}
function writeAll(list: Session[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export const Route = createFileRoute("/session-detail/$sessionId")({
  head: ({ params }) => ({
    meta: [
      { title: "Session — PXF Hockey" },
      { name: "description", content: `Session ${params?.sessionId ?? ""} detail.` },
    ],
  }),
  notFoundComponent: () => {
    const { sessionId } = Route.useParams();
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Session {sessionId} not found.</p>
        <Link to="/saved-sessions" className="mt-3 inline-flex text-sm font-semibold text-teal">Back to sessions</Link>
      </div>
    );
  },
  errorComponent: ({ error, reset }) => (
    <div className="px-5 pt-10 text-center">
      <p className="text-sm text-destructive">Something went wrong.</p>
      <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-3 text-sm font-semibold text-teal">Try again</button>
    </div>
  ),
  component: SessionDetail,
});

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const [editingBlockUid, setEditingBlockUid] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    const all = readAll();
    const s = all.find((x) => x.id === sessionId) ?? null;
    setSession(s);
  }, [sessionId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  if (session === null) {
    return <div className="px-5 pt-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const totalMins = session.blocks.reduce((t, b) => t + b.mins, 0);
  const focuses = uniqueFocuses(session.blocks);
  const equipment = uniqueEquipment(session.blocks);

  function update(next: Session, markDirty = true) {
    setSession(next);
    if (markDirty) setDirty(true);
  }

  function persist(next?: Session) {
    const target = next ?? session;
    if (!target) return;
    const all = readAll();
    const idx = all.findIndex((x) => x.id === target.id);
    const updated = { ...target, totalMins: target.blocks.reduce((t, b) => t + b.mins, 0) };
    if (idx === -1) all.unshift(updated); else all[idx] = updated;
    writeAll(all);
    setSession(updated);
    setDirty(false);
    setToast("Session saved");
  }

  function reorder(from: number, to: number) {
    if (!session || from === to) return;
    const blocks = [...session.blocks];
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    update({ ...session, blocks });
  }

  function adjustMins(uid: string, delta: number) {
    if (!session) return;
    update({
      ...session,
      blocks: session.blocks.map((b) => b.uid === uid ? { ...b, mins: Math.max(1, b.mins + delta) } : b),
    });
  }

  function removeBlock(uid: string) {
    if (!session) return;
    update({ ...session, blocks: session.blocks.filter((b) => b.uid !== uid) });
  }

  function setBlockNotes(uid: string, notes: string) {
    if (!session) return;
    update({
      ...session,
      blocks: session.blocks.map((b) => b.uid === uid ? { ...b, notes } : b),
    });
  }

  function addDrill(drill: Drill) {
    if (!session) return;
    const newBlock: Block = {
      uid: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      drillId: drill.id,
      mins: drill.durationMin,
    };
    update({ ...session, blocks: [...session.blocks, newBlock] });
  }

  function duplicate() {
    if (!session) return;
    const all = readAll();
    const copy: Session = {
      ...session,
      id: `s-${Date.now()}`,
      name: `${session.name} (Copy)`,
      completed: false,
      completedAt: undefined,
      blocks: session.blocks.map((b) => ({ ...b, uid: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
    };
    writeAll([copy, ...all].slice(0, 50));
    setToast("Duplicated");
    navigate({ to: "/session-detail/$sessionId", params: { sessionId: copy.id } });
  }

  function toggleComplete() {
    if (!session) return;
    const next: Session = {
      ...session,
      completed: !session.completed,
      completedAt: !session.completed ? new Date().toISOString() : undefined,
    };
    persist(next);
    setToast(next.completed ? "Marked complete" : "Marked incomplete");
  }

  function deleteSession() {
    if (typeof window !== "undefined" && !window.confirm("Delete this session?")) return;
    const all = readAll().filter((x) => x.id !== session!.id);
    writeAll(all);
    navigate({ to: "/saved-sessions" });
  }

  function exportPDF() {
    if (!session || typeof window === "undefined") return;
    const escape = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const total = session.blocks.reduce((t, b) => t + b.mins, 0);
    const rows = session.blocks.map((b, i) => {
      const d = findDrill(b.drillId);
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;width:32px;font-weight:700;color:#0f766e;">${i + 1}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700;font-size:14px;">${escape(d?.name ?? "Drill")}</div>
            ${d?.category ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${escape(d.category)}</div>` : ""}
            ${b.notes ? `<div style="font-size:11px;color:#374151;margin-top:4px;">${escape(b.notes)}</div>` : ""}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;white-space:nowrap;">${b.mins} min</td>
        </tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(session.name)} — Session Plan</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:32px;}
        h1{margin:0 0 4px;font-size:24px;}
        .meta{color:#6b7280;font-size:12px;margin-bottom:18px;}
        .summary{display:flex;gap:16px;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;margin-bottom:18px;}
        .summary div{font-size:12px;color:#6b7280;}
        .summary div b{display:block;font-size:18px;color:#111;}
        table{width:100%;border-collapse:collapse;}
        th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;padding:6px 8px;border-bottom:2px solid #111;}
        .foot{margin-top:24px;font-size:10px;color:#9ca3af;text-align:center;}
        @media print{@page{margin:18mm;}}
      </style></head><body>
      <h1>${escape(session.name)}</h1>
      <div class="meta">${formatDate(session.date)} · ${escape(session.age)} · ${escape(session.level)}</div>
      <div class="summary">
        <div><b>${total} min</b>Total time</div>
        <div><b>${session.blocks.length}</b>Drills</div>
        <div><b>${uniqueFocuses(session.blocks).join(", ") || "—"}</b>Focus</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Drill</th><th style="text-align:right;">Time</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${session.notes ? `<p style="margin-top:18px;font-size:12px;"><b>Notes:</b> ${escape(session.notes)}</p>` : ""}
      <div class="foot">PXF Hockey · Session Plan</div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),200);};</script>
      </body></html>`;
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) { setToast("Allow pop-ups to export"); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  return (
    <div className="pb-40">
      {/* Header */}
      <div className="px-5 pt-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/saved-sessions" })}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-volt">SESSION</p>
          <button
            onClick={() => setEditingName((v) => !v)}
            aria-label="Edit session"
            className="grid h-10 w-10 place-items-center rounded-full border border-teal/40 bg-teal/10 text-teal"
          >
            <Pencil size={16} />
          </button>
        </div>

        <button
          onClick={exportPDF}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface px-3 py-1.5 text-[11px] font-bold text-foreground"
        >
          <Printer size={12} /> Export PDF
        </button>
        <button
          onClick={() => setAssignOpen(true)}
          className="mt-3 ml-2 inline-flex items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-background"
        >
          <ClipboardList size={12} /> Add to Team Practice
        </button>

        {editingName ? (
          <input
            autoFocus
            value={session.name}
            onChange={(e) => update({ ...session, name: e.target.value })}
            onBlur={() => setEditingName(false)}
            className="mt-4 w-full rounded-2xl border border-teal/50 bg-surface-2 px-3 py-2.5 text-2xl font-bold text-foreground outline-none"
          />
        ) : (
          <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground">{session.name}</h1>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarIcon size={12} className="text-teal" /> {formatDate(session.date)}</span>
          <span className="flex items-center gap-1"><Users size={12} className="text-teal" /> {session.age}</span>
          <span className="flex items-center gap-1"><BarChart3 size={12} className="text-teal" /> {session.level}</span>
          <span className="flex items-center gap-1"><Clock size={12} className="text-volt" /> {totalMins} min</span>
          <span className="flex items-center gap-1"><Disc3 size={12} className="text-volt" /> {session.blocks.length} drills</span>
        </div>

        {session.completed && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-volt/15 px-3 py-1 text-[10px] font-bold tracking-wider text-volt">
            <CheckCircle2 size={11} /> COMPLETED
          </div>
        )}
      </div>

      {/* Summary card */}
      <div className="px-5 mt-5">
        <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-surface to-surface-2 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Clock} tint="teal" label="Total Time" value={`${totalMins} min`} />
            <Stat icon={Disc3} tint="volt" label="Drills" value={String(session.blocks.length)} />
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">FOCUS AREAS</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {focuses.length === 0 && <span className="text-xs text-muted-foreground">No drills yet</span>}
              {focuses.map((f) => (
                <span key={f} className="rounded-full bg-teal/15 px-2.5 py-0.5 text-[11px] font-semibold text-teal">{f}</span>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">EQUIPMENT</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {equipment.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              {equipment.map((e) => (
                <span key={e} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-foreground/80">
                  <Wrench size={9} className="text-volt" /> {e}
                </span>
              ))}
            </div>
          </div>

          {session.notes.trim() && (
            <div className="mt-3 rounded-xl border border-border/40 bg-surface-2/60 p-2.5">
              <p className="flex items-center gap-1 text-[10px] font-bold tracking-[0.2em] text-volt">
                <ListChecks size={10} /> NOTES
              </p>
              <p className="mt-1 line-clamp-3 text-[12px] italic text-muted-foreground">{session.notes}</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={duplicate}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-surface-2 py-2 text-[11px] font-bold tracking-wide text-foreground hover:bg-surface"
            >
              <Copy size={12} /> DUPLICATE
            </button>
            <button
              onClick={toggleComplete}
              className={
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold tracking-wide " +
                (session.completed ? "border border-border/60 bg-surface-2 text-muted-foreground" : "bg-volt/15 text-volt")
              }
            >
              <CheckCircle2 size={12} /> {session.completed ? "INCOMPLETE" : "COMPLETE"}
            </button>
            <button
              onClick={deleteSession}
              className="grid h-9 w-9 place-items-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive"
              aria-label="Delete session"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Session plan */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-[0.3em] text-teal">SESSION PLAN</p>
          <span className="text-[10px] font-semibold text-muted-foreground">Drag to reorder</span>
        </div>

        <div className="mt-3 space-y-2.5">
          {session.blocks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-surface p-6 text-center">
              <p className="text-sm text-muted-foreground">No drills yet.</p>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-[11px] font-bold tracking-wide text-primary-foreground"
              >
                <Plus size={12} /> ADD DRILL
              </button>
            </div>
          )}

          {session.blocks.map((b, i) => {
            const d = findDrill(b.drillId);
            if (!d) return null;
            const editing = editingBlockUid === b.uid;
            return (
              <div
                key={b.uid}
                draggable
                onDragStart={() => setDrag({ from: i, over: i })}
                onDragOver={(e) => { e.preventDefault(); if (drag) setDrag({ ...drag, over: i }); }}
                onDrop={() => { if (drag) reorder(drag.from, i); setDrag(null); }}
                onDragEnd={() => setDrag(null)}
                className={
                  "rounded-2xl border bg-surface transition-colors " +
                  (drag?.over === i && drag.from !== i ? "border-teal/60 shadow-glow-teal" : "border-border/60")
                }
              >
                <div className="flex gap-2 p-3">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-brand text-[12px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <button
                      aria-label="Drag handle"
                      className="cursor-grab text-muted-foreground active:cursor-grabbing"
                    >
                      <GripVertical size={16} />
                    </button>
                  </div>

                  <Link
                    to="/drill-detail/$drillId"
                    params={{ drillId: d.id }}
                    className="flex min-w-0 flex-1 flex-col gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold tracking-wider text-teal">{d.category.toUpperCase()}</p>
                          <h3 className="truncate text-sm font-bold text-foreground">{d.name}</h3>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {d.difficulty} · {d.ageGroup} · {b.mins} min
                          </p>
                        </div>
                        <ChevronRight size={16} className="mt-1 shrink-0 text-muted-foreground" />
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        <Wrench size={9} className="-mt-0.5 mr-1 inline text-volt" />
                        {d.equipment.join(", ")}
                      </p>
                      {d.notes[0] && (
                        <p className="mt-1 line-clamp-1 text-[11px] italic text-foreground/70">
                          Focus: {d.notes[0]}
                        </p>
                      )}
                    </div>
                    <MiniDrillDiagram drill={d} />
                  </Link>
                </div>

                {/* Duration & notes editor */}
                {editing && (
                  <div className="border-t border-border/60 bg-surface-2/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">DURATION</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => adjustMins(b.uid, -1)} className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-surface text-foreground">
                          <Minus size={14} />
                        </button>
                        <span className="min-w-[60px] text-center text-sm font-bold text-teal">{b.mins} min</span>
                        <button onClick={() => adjustMins(b.uid, 1)} className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-surface text-foreground">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">DRILL NOTES</span>
                      <textarea
                        value={b.notes ?? ""}
                        onChange={(e) => setBlockNotes(b.uid, e.target.value)}
                        placeholder="Add coaching notes for this drill…"
                        rows={2}
                        className="mt-1.5 w-full resize-none rounded-xl border border-border/60 bg-surface px-3 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal/60"
                      />
                    </div>
                  </div>
                )}

                {!editing && b.notes && (
                  <div className="border-t border-border/60 bg-surface-2/40 px-3 py-2">
                    <p className="line-clamp-2 text-[11px] italic text-muted-foreground">
                      <ListChecks size={10} className="-mt-0.5 mr-1 inline text-volt" />
                      {b.notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center border-t border-border/60 bg-surface-2/40">
                  <button
                    onClick={() => setEditingBlockUid(editing ? null : b.uid)}
                    className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-bold tracking-wide text-teal hover:bg-teal/10"
                  >
                    <Pencil size={11} /> {editing ? "DONE" : "EDIT"}
                  </button>
                  <div className="h-6 w-px bg-border/60" />
                  <button
                    onClick={() => removeBlock(b.uid)}
                    className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-bold tracking-wide text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={11} /> REMOVE
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2">
          <button
            onClick={() => setAddOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-surface py-3 text-[11px] font-bold tracking-wide text-foreground"
          >
            <Plus size={14} /> ADD DRILL
          </button>
          <button
            onClick={() => persist()}
            className={
              "flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-[11px] font-bold tracking-wide " +
              (dirty ? "bg-teal/20 text-teal" : "border border-border/60 bg-surface text-muted-foreground")
            }
          >
            <Save size={14} /> SAVE
          </button>
          <button
            onClick={() => setRunOpen(true)}
            disabled={session.blocks.length === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-brand py-3 text-[11px] font-bold tracking-wide text-primary-foreground shadow-glow-teal disabled:opacity-50"
          >
            <Play size={14} /> START
          </button>
        </div>
      </div>

      {addOpen && <AddDrillModal onClose={() => setAddOpen(false)} onPick={(d) => { addDrill(d); setAddOpen(false); setToast(`Added ${d.name}`); }} />}

      {runOpen && <RunSession session={session} onClose={() => setRunOpen(false)} onComplete={() => { setRunOpen(false); if (!session.completed) toggleComplete(); }} />}

      {assignOpen && (
        <AssignToTeamPractice
          session={session}
          onClose={() => setAssignOpen(false)}
          onSaved={(label) => { setAssignOpen(false); setToast(label); }}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 bottom-24 z-50 -translate-x-1/2 rounded-full bg-volt px-4 py-2 text-[12px] font-bold text-background shadow-glow-volt">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, tint, label, value }: { icon: typeof Clock; tint: "teal" | "volt"; label: string; value: string }) {
  const color = tint === "teal" ? "text-teal" : "text-volt";
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-2/60 p-3">
      <div className={"flex items-center gap-1.5 " + color}>
        <Icon size={14} />
        <span className="text-[10px] font-bold tracking-[0.2em]">{label.toUpperCase()}</span>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function DrillThumb({ category }: { category: Category }) {
  const isVolt = ["Edge Control", "Passing", "Reaction Training", "Circuits"].includes(category);
  return (
    <div className={"grid h-14 w-14 shrink-0 place-items-center rounded-xl border " + (isVolt ? "border-volt/40 bg-volt/10 text-volt" : "border-teal/40 bg-teal/10 text-teal")}>
      <Disc3 size={22} />
    </div>
  );
}

/* ============================== Mini Drill Diagram ============================== */
// Simplified top-down rink visualization. Setup elements (slips, cones, players,
// pucks) and routes (skating dashed, passing dotted) vary by drill category so
// coaches can scan the whole session at a glance.

function MiniDrillDiagram({ drill }: { drill: Drill }) {
  // teal = skating route, volt = passing route, orange = cones, white = pucks
  const skating = "hsl(180 90% 55%)";
  const passing = "hsl(95 90% 60%)";
  const cone = "hsl(28 95% 60%)";
  const slip = "hsl(180 90% 55%)";
  const puck = "#f5f5f5";
  const player = "hsl(95 90% 60%)";

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/60 bg-surface-2">
      <svg viewBox="0 0 120 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* Rink backdrop */}
        <rect x="3" y="3" width="114" height="94" rx="14" ry="14" fill="hsl(210 25% 12%)" stroke="hsl(0 0% 30%)" strokeWidth="1" />
        <line x1="60" y1="6" x2="60" y2="94" stroke="hsl(0 0% 28%)" strokeWidth="0.5" strokeDasharray="2 2" />
        <circle cx="60" cy="50" r="10" fill="none" stroke="hsl(0 0% 25%)" strokeWidth="0.5" />

        {(() => {
          switch (drill.category) {
            case "Skating Flow":
              return (
                <>
                  <Cone x={25} y={75} fill={cone} />
                  <Cone x={60} y={30} fill={cone} />
                  <Cone x={95} y={75} fill={cone} />
                  <path d="M25,75 Q40,40 60,30 Q80,40 95,75" stroke={skating} strokeWidth="1.5" strokeDasharray="3 2" fill="none" markerEnd="url(#arrow-teal)" />
                  <Player x={25} y={85} fill={player} />
                </>
              );
            case "Edge Control":
              return (
                <>
                  <circle cx="60" cy="50" r="22" fill="none" stroke={skating} strokeWidth="1.2" strokeDasharray="3 2" />
                  <Cone x={60} y={50} fill={cone} />
                  <Player x={38} y={50} fill={player} />
                </>
              );
            case "Puck Control":
              return (
                <>
                  <Slip x={35} y={40} fill={slip} />
                  <Slip x={85} y={60} fill={slip} />
                  <Puck x={35} y={70} fill={puck} />
                  <path d="M35,70 Q55,55 35,40 Q15,55 35,40 Q55,55 85,60" stroke={skating} strokeWidth="1.4" strokeDasharray="3 2" fill="none" markerEnd="url(#arrow-teal)" />
                  <Player x={35} y={80} fill={player} />
                </>
              );
            case "Passing":
              return (
                <>
                  <Player x={25} y={75} fill={player} />
                  <Player x={95} y={75} fill={player} />
                  <Player x={60} y={28} fill={player} />
                  <Puck x={25} y={75} fill={puck} />
                  <path d="M25,75 L60,28" stroke={passing} strokeWidth="1.4" strokeDasharray="1 3" fill="none" markerEnd="url(#arrow-volt)" />
                  <path d="M60,28 L95,75" stroke={passing} strokeWidth="1.4" strokeDasharray="1 3" fill="none" markerEnd="url(#arrow-volt)" />
                </>
              );
            case "Shooting":
              return (
                <>
                  <rect x="48" y="14" width="24" height="6" rx="1" fill="none" stroke="hsl(0 0% 70%)" strokeWidth="1" />
                  <Cone x={40} y={75} fill={cone} />
                  <Cone x={80} y={75} fill={cone} />
                  <Puck x={60} y={70} fill={puck} />
                  <Player x={60} y={82} fill={player} />
                  <path d="M60,70 L60,22" stroke={passing} strokeWidth="1.6" strokeDasharray="1 3" fill="none" markerEnd="url(#arrow-volt)" />
                </>
              );
            case "Reaction Training":
              return (
                <>
                  <Cone x={30} y={35} fill={cone} />
                  <Cone x={90} y={35} fill={cone} />
                  <Cone x={30} y={75} fill={cone} />
                  <Cone x={90} y={75} fill={cone} />
                  <Player x={60} y={55} fill={player} />
                  <path d="M60,55 L30,35" stroke={skating} strokeWidth="1" strokeDasharray="2 2" fill="none" />
                  <path d="M60,55 L90,35" stroke={skating} strokeWidth="1" strokeDasharray="2 2" fill="none" />
                  <path d="M60,55 L30,75" stroke={skating} strokeWidth="1" strokeDasharray="2 2" fill="none" />
                  <path d="M60,55 L90,75" stroke={skating} strokeWidth="1" strokeDasharray="2 2" fill="none" />
                </>
              );
            case "GameIQ":
              return (
                <>
                  <Player x={30} y={70} fill={player} />
                  <Player x={60} y={40} fill={player} />
                  <Player x={90} y={70} fill={player} />
                  <Player x={45} y={25} fill="hsl(0 80% 65%)" />
                  <Player x={75} y={25} fill="hsl(0 80% 65%)" />
                  <Puck x={30} y={70} fill={puck} />
                  <path d="M30,70 Q45,55 60,40" stroke={passing} strokeWidth="1.4" strokeDasharray="1 3" fill="none" markerEnd="url(#arrow-volt)" />
                  <path d="M60,40 Q75,55 90,70" stroke={passing} strokeWidth="1.4" strokeDasharray="1 3" fill="none" markerEnd="url(#arrow-volt)" />
                </>
              );
            case "Circuits":
              return (
                <>
                  <Slip x={25} y={30} fill={slip} />
                  <Slip x={60} y={30} fill={slip} />
                  <Slip x={95} y={30} fill={slip} />
                  <Cone x={25} y={75} fill={cone} />
                  <Cone x={60} y={75} fill={cone} />
                  <Cone x={95} y={75} fill={cone} />
                  <path d="M25,75 L25,30 L60,75 L60,30 L95,75 L95,30" stroke={skating} strokeWidth="1.3" strokeDasharray="3 2" fill="none" markerEnd="url(#arrow-teal)" />
                </>
              );
            default:
              return null;
          }
        })()}

        <defs>
          <marker id="arrow-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={skating} />
          </marker>
          <marker id="arrow-volt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={passing} />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function Cone({ x, y, fill }: { x: number; y: number; fill: string }) {
  return <polygon points={`${x},${y - 4} ${x - 3},${y + 2} ${x + 3},${y + 2}`} fill={fill} />;
}
function Player({ x, y, fill }: { x: number; y: number; fill: string }) {
  return <circle cx={x} cy={y} r={3.5} fill={fill} stroke="hsl(0 0% 15%)" strokeWidth="0.6" />;
}
function Puck({ x, y, fill }: { x: number; y: number; fill: string }) {
  return <ellipse cx={x} cy={y} rx={2.4} ry={1.4} fill={fill} />;
}
function Slip({ x, y, fill }: { x: number; y: number; fill: string }) {
  return <rect x={x - 5} y={y - 1.5} width={10} height={3} rx={1.5} fill={fill} opacity={0.85} />;
}

function uniqueFocuses(blocks: Block[]): string[] {
  const set = new Set<Category>();
  for (const b of blocks) {
    const d = findDrill(b.drillId);
    if (d) set.add(d.category);
  }
  return Array.from(set);
}

function uniqueEquipment(blocks: Block[]): string[] {
  const set = new Set<string>();
  for (const b of blocks) {
    const d = findDrill(b.drillId);
    if (d) for (const e of d.equipment) set.add(e);
  }
  return Array.from(set);
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

/* ============================== Add Drill Modal ============================== */

function AddDrillModal({ onClose, onPick }: { onClose: () => void; onPick: (d: Drill) => void }) {
  return <AddDrillModalImpl onClose={onClose} onPick={onPick} />;
}

/* ========================= Assign to Team Practice ========================= */

type TeamRow = { id: string; name: string };
type EventRow = { id: string; title: string | null; event_date: string; start_time: string | null; venue: string | null };

function AssignToTeamPractice({ session, onClose, onSaved }: { session: Session; onClose: () => void; onSaved: (label: string) => void }) {
  const save = useServerFn(savePracticePlan);
  const createEv = useServerFn(createEvent);
  const [teams, setTeams] = useState<TeamRow[] | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("teams").select("id,name").order("created_at", { ascending: false });
      setTeams((data ?? []) as TeamRow[]);
    })();
  }, []);

  useEffect(() => {
    if (!teamId) { setEvents(null); return; }
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("team_events")
        .select("id,title,event_date,start_time,venue,event_type")
        .eq("team_id", teamId)
        .eq("event_type", "practice")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(25);
      setEvents((data ?? []) as EventRow[]);
    })();
  }, [teamId]);

  async function assignToEvent(eventId: string, label: string) {
    if (!teamId) return;
    setBusy(true);
    setError(null);
    try {
      const items: Array<{ itemType: "note"; noteText: string; durationMinutes?: number }> = [
        { itemType: "note", noteText: `Session: ${session.name}`, durationMinutes: session.totalMins || undefined },
        ...session.blocks.map((b) => {
          const d = findDrill(b.drillId);
          return { itemType: "note" as const, noteText: d?.name ?? "Drill", durationMinutes: b.mins };
        }),
      ];
      if (session.notes) items.push({ itemType: "note", noteText: `Notes: ${session.notes}` });
      await save({ data: { teamId, eventId, templateName: session.name, items } });
      onSaved(`Added to ${label}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  async function createAndAssign() {
    if (!teamId || !newDate) return;
    setBusy(true);
    setError(null);
    try {
      const title = newTitle.trim() || "Practice";
      const { id } = await createEv({ data: {
        teamId, eventType: "practice", title,
        eventDate: newDate, startTime: newTime || undefined,
      } });
      await assignToEvent(id, title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create practice");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-screen-sm overflow-y-auto rounded-t-3xl border-t border-border/60 bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">ASSIGN</p>
            <h2 className="mt-0.5 text-lg font-bold text-foreground">Add to Team Practice</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-foreground"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className="mb-1.5 text-[10px] font-bold tracking-[0.2em] text-muted-foreground">TEAM</p>
            {teams === null ? (
              <p className="text-xs text-muted-foreground">Loading teams…</p>
            ) : teams.length === 0 ? (
              <p className="text-xs text-muted-foreground">You don't have any teams yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {teams.map((t) => (
                  <button key={t.id} onClick={() => setTeamId(t.id)} className={"rounded-full border px-3 py-1.5 text-[11px] font-semibold " + (teamId === t.id ? "border-teal bg-teal text-background" : "border-border bg-surface text-muted-foreground")}>{t.name}</button>
                ))}
              </div>
            )}
          </div>

          {teamId && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold tracking-[0.2em] text-muted-foreground">UPCOMING PRACTICES</p>
              {events === null ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : events.length === 0 ? (
                <p className="text-xs text-muted-foreground">No upcoming practices scheduled.</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((ev) => {
                    const label = `${ev.title ?? "Practice"} · ${formatDate(ev.event_date)}${ev.start_time ? " · " + ev.start_time.slice(0, 5) : ""}`;
                    return (
                      <li key={ev.id}>
                        <button disabled={busy} onClick={() => assignToEvent(ev.id, ev.title ?? "Practice")} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-left disabled:opacity-50">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">{ev.title ?? "Practice"}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{formatDate(ev.event_date)}{ev.start_time ? " · " + ev.start_time.slice(0, 5) : ""}{ev.venue ? " · " + ev.venue : ""}</p>
                          </div>
                          <ChevronRight size={14} className="text-teal" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3">
                {!creating ? (
                  <button onClick={() => setCreating(true)} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface px-3 py-2.5 text-xs font-semibold text-foreground">
                    <Plus size={14} className="text-teal" /> Create new practice
                  </button>
                ) : (
                  <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">NEW PRACTICE</p>
                    <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Practice title" className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
                      <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div className="flex gap-2">
                      <button disabled={busy || !newDate} onClick={createAndAssign} className="flex-1 rounded-xl bg-teal px-3 py-2 text-xs font-bold text-background disabled:opacity-50">Create & assign</button>
                      <button onClick={() => setCreating(false)} className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
          <p className="text-[10px] text-muted-foreground">Replaces any existing practice plan on the selected event.</p>
        </div>
      </div>
    </div>
  );
}

function AddDrillModalImpl({ onClose, onPick }: { onClose: () => void; onPick: (d: Drill) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return DRILLS.filter((d) => !t || d.name.toLowerCase().includes(t) || d.category.toLowerCase().includes(t));
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-screen-sm overflow-hidden rounded-t-3xl border-t border-border/60 bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">ADD DRILL</p>
            <h2 className="mt-0.5 text-lg font-bold text-foreground">Drill Library</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search drills…"
            className="w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal/60"
          />
        </div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto px-3 pb-6">
          {list.map((d) => (
            <button
              key={d.id}
              onClick={() => onPick(d)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface-2 p-3 text-left transition-colors hover:border-teal/50"
            >
              <DrillThumb category={d.category} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-wider text-teal">{d.category.toUpperCase()}</p>
                <h3 className="truncate text-sm font-bold text-foreground">{d.name}</h3>
                <p className="text-[11px] text-muted-foreground">{d.difficulty} · {d.ageGroup} · {d.durationMin} min</p>
              </div>
              <Plus size={18} className="text-teal" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================== Run Session Mode ============================== */

function RunSession({ session, onClose, onComplete }: { session: Session; onClose: () => void; onComplete: () => void }) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [showVideo, setShowVideo] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);

  const block = session.blocks[idx];
  const drill = block ? findDrill(block.drillId) : null;

  const [seconds, setSeconds] = useState((block?.mins ?? 0) * 60);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    setSeconds((block?.mins ?? 0) * 60);
    setRunning(true);
    setShowVideo(false);
    setShowDiagram(false);
  }, [idx, block?.mins]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!block || !drill) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const total = session.blocks.length;
  const completedAll = done.size === total;

  function completeDrill() {
    const next = new Set(done);
    next.add(block.uid);
    setDone(next);
    if (idx < total - 1) setIdx(idx + 1);
    else onComplete();
  }

  function nextDrill() {
    if (idx < total - 1) setIdx(idx + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <button onClick={onClose} aria-label="Close run mode" className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground">
          <X size={16} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-volt">RUN MODE</p>
          <p className="text-[11px] text-muted-foreground">Drill {idx + 1} of {total}</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-4 pt-3">
        {session.blocks.map((b, i) => (
          <div
            key={b.uid}
            className={
              "h-1.5 flex-1 rounded-full " +
              (done.has(b.uid) ? "bg-volt" : i === idx ? "bg-teal" : "bg-surface-2")
            }
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-32">
        <p className="text-[10px] font-bold tracking-wider text-teal">{drill.category.toUpperCase()}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">{drill.name}</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">{drill.difficulty} · {drill.ageGroup}</p>

        {/* Timer */}
        <div className="mt-5 rounded-3xl border border-teal/40 bg-gradient-to-br from-teal/10 to-volt/10 p-6 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-teal">TIMER</p>
          <p className="mt-2 font-mono text-6xl font-bold text-foreground tabular-nums">{mm}:{ss}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-5 py-2 text-[12px] font-bold text-primary-foreground shadow-glow-teal"
            >
              {running ? <><Pause size={14} /> PAUSE</> : <><Play size={14} /> RESUME</>}
            </button>
            <button
              onClick={() => setSeconds(block.mins * 60)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface text-foreground"
              aria-label="Reset timer"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Media toggles */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => { setShowVideo((v) => !v); setShowDiagram(false); }}
            className={"flex items-center justify-center gap-1.5 rounded-2xl py-3 text-[11px] font-bold tracking-wide " + (showVideo ? "bg-teal/20 text-teal" : "border border-border/60 bg-surface text-foreground")}
          >
            <Video size={14} /> VIDEO
          </button>
          <button
            onClick={() => { setShowDiagram((v) => !v); setShowVideo(false); }}
            className={"flex items-center justify-center gap-1.5 rounded-2xl py-3 text-[11px] font-bold tracking-wide " + (showDiagram ? "bg-volt/20 text-volt" : "border border-border/60 bg-surface text-foreground")}
          >
            <ImageIcon size={14} /> DIAGRAM
          </button>
        </div>

        {showVideo && (
          <div className="mt-3 grid aspect-video place-items-center rounded-2xl border border-border/60 bg-surface-2 text-muted-foreground">
            <div className="text-center">
              <Video size={28} className="mx-auto text-teal" />
              <p className="mt-2 text-[12px]">Video demonstration</p>
            </div>
          </div>
        )}
        {showDiagram && (
          <div className="mt-3 grid aspect-video place-items-center rounded-2xl border border-border/60 bg-surface-2 text-muted-foreground">
            <div className="text-center">
              <ImageIcon size={28} className="mx-auto text-volt" />
              <p className="mt-2 text-[12px]">Drill diagram</p>
            </div>
          </div>
        )}

        {/* Coaching points */}
        <div className="mt-5">
          <p className="text-[10px] font-bold tracking-[0.3em] text-volt">COACHING POINTS</p>
          <ul className="mt-2 space-y-2">
            {drill.notes.map((n, i) => (
              <li key={i} className="flex gap-2 rounded-xl border border-border/60 bg-surface p-3">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />
                <span className="text-[13px] text-foreground">{n}</span>
              </li>
            ))}
          </ul>
        </div>

        {block.notes && (
          <div className="mt-4 rounded-2xl border border-volt/30 bg-volt/10 p-3">
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">SESSION NOTES</p>
            <p className="mt-1 text-[13px] text-foreground">{block.notes}</p>
          </div>
        )}
      </div>

      {/* Sticky run actions */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2">
          <button
            onClick={nextDrill}
            disabled={idx >= total - 1}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-surface py-3 text-[11px] font-bold tracking-wide text-foreground disabled:opacity-40"
          >
            <SkipForward size={14} /> NEXT
          </button>
          <button
            onClick={completeDrill}
            className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl bg-gradient-brand py-3 text-[11px] font-bold tracking-wide text-primary-foreground shadow-glow-teal"
          >
            <CheckCircle2 size={14} /> {completedAll ? "FINISH" : "COMPLETE DRILL"}
          </button>
        </div>
      </div>
    </div>
  );
}