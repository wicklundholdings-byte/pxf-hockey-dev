import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PlayCircle, Plus, X, Check, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ApplyCampTemplate } from "@/components/coach/apply-camp-template";
import { ApplySessionSeries } from "@/components/coach/apply-session-series";
import { readAppliedSeries, writeAppliedSeries, sigOf, type AppliedSeries } from "@/lib/session-series";
import {
  SessionRunner,
  SessionSummary,
  readCampCompletions,
  writeCampCompletion,
  type RunnerBlock,
  type RunnerSummary,
  type SessionRunRecord,
} from "@/components/session-runner";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId/session-plans")({
  component: SessionPlansPage,
});

type Session = { id: string; session_date: string; start_time: string | null; end_time: string | null };
type SavedSession = {
  id: string;
  name: string;
  totalMins: number;
  blocks: { uid: string; drillId: string; mins: number }[];
};

function readSavedSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("pxf:sessions:v2");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function fmtDur(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SessionPlansPage() {
  const { campId } = useParams({ from: "/_authenticated/coach/camps/$campId/session-plans" });
  const planKey = `pxf:camp-plans:${campId}`;
  const [campName, setCampName] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [library, setLibrary] = useState<SavedSession[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [completions, setCompletions] = useState<Record<string, SessionRunRecord>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ sessionId: string; rec: SessionRunRecord } | null>(null);
  const [dragMode, setDragMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [syncPrompt, setSyncPrompt] = useState<{ applied: AppliedSeries; changed: { campSessionId: string; sourceSessionId: string; dayIndex: number }[] } | null>(null);

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from("camps").select("name").eq("id", campId).maybeSingle(),
        supabase.from("camp_sessions").select("*").eq("camp_id", campId).order("session_date"),
      ]);
      setCampName(c.data?.name ?? "");
      setSessions((s.data ?? []) as Session[]);
    })();
    setLibrary(readSavedSessions());
    setCompletions(readCampCompletions(campId));
    try {
      const raw = window.localStorage.getItem(planKey);
      if (raw) setAssignments(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [campId, planKey]);

  // Detect series source-session edits since apply, and prompt to re-sync.
  useEffect(() => {
    const applied = readAppliedSeries(campId);
    if (!applied) return;
    const lib = readSavedSessions();
    const changed: { campSessionId: string; sourceSessionId: string; dayIndex: number }[] = [];
    applied.mapping.forEach((m, i) => {
      const src = lib.find((l) => l.id === m.sourceSessionId);
      if (!src) return;
      if (sigOf(src) !== m.sourceSig) changed.push({ campSessionId: m.campSessionId, sourceSessionId: m.sourceSessionId, dayIndex: i });
    });
    if (changed.length > 0) setSyncPrompt({ applied, changed });
  }, [campId, library.length]);

  function applySyncUpdates() {
    if (!syncPrompt) return;
    const lib = readSavedSessions();
    const libById = new Map(lib.map((s) => [s.id, s]));
    const nextAssignments = { ...assignments };
    const nextMapping = [...syncPrompt.applied.mapping];
    syncPrompt.changed.forEach((c) => {
      const src = libById.get(c.sourceSessionId);
      if (!src) return;
      const newId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-r${c.dayIndex}`;
      libById.set(newId, { ...src, id: newId });
      nextAssignments[c.campSessionId] = newId;
      nextMapping[c.dayIndex] = { ...nextMapping[c.dayIndex], snapshotSessionId: newId, sourceSig: sigOf(src) };
    });
    window.localStorage.setItem("pxf:sessions:v2", JSON.stringify(Array.from(libById.values())));
    window.dispatchEvent(new CustomEvent("pxf:sessions-changed"));
    window.localStorage.setItem(planKey, JSON.stringify(nextAssignments));
    writeAppliedSeries(campId, { ...syncPrompt.applied, mapping: nextMapping });
    setAssignments(nextAssignments);
    setLibrary(Array.from(libById.values()));
    setSyncPrompt(null);
  }

  function dismissSync() {
    if (!syncPrompt) return;
    // Acknowledge current sigs so we don't re-prompt for the same change.
    const lib = readSavedSessions();
    const nextMapping = syncPrompt.applied.mapping.map((m) => {
      const src = lib.find((l) => l.id === m.sourceSessionId);
      return src ? { ...m, sourceSig: sigOf(src) } : m;
    });
    writeAppliedSeries(campId, { ...syncPrompt.applied, mapping: nextMapping });
    setSyncPrompt(null);
  }

  function reorder(fromCampId: string, toCampId: string) {
    if (fromCampId === toCampId) return;
    const fromAssign = assignments[fromCampId] ?? null;
    const toAssign = assignments[toCampId] ?? null;
    const next = { ...assignments };
    if (fromAssign) next[toCampId] = fromAssign; else delete next[toCampId];
    if (toAssign) next[fromCampId] = toAssign; else delete next[fromCampId];
    setAssignments(next);
    window.localStorage.setItem(planKey, JSON.stringify(next));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
  }

  function assign(sessionId: string, savedId: string | null) {
    const next = { ...assignments };
    if (savedId) next[sessionId] = savedId;
    else delete next[sessionId];
    setAssignments(next);
    window.localStorage.setItem(planKey, JSON.stringify(next));
    setPickerFor(null);
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeSessionId = useMemo(
    () => sessions.find((s) => !completions[s.id] && s.session_date <= today)?.id ?? null,
    [sessions, completions, today],
  );

  function stateFor(s: Session): "completed" | "active" | "upcoming" {
    if (completions[s.id]) return "completed";
    if (s.id === activeSessionId) return "active";
    return "upcoming";
  }

  const effectiveExpanded = expanded ?? activeSessionId ?? sessions[0]?.id ?? null;
  const expandedSession = sessions.find((s) => s.id === effectiveExpanded) ?? null;
  const expandedAssigned = expandedSession ? library.find((l) => l.id === assignments[expandedSession.id]) : null;
  const expandedState = expandedSession ? stateFor(expandedSession) : null;
  const expandedCompletion = expandedSession ? completions[expandedSession.id] : null;
  const expandedBlocks = ((expandedAssigned?.blocks ?? []) as RunnerBlock[]).filter((b) => b && b.drillId);

  return (
    <div className="space-y-4">
      <Link to="/coach/camps/$campId" params={{ campId }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back to {campName || "camp"}
      </Link>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session Plans</p>
        <h1 className="font-display text-xl font-bold text-foreground">{campName}</h1>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No camp days scheduled yet.
        </p>
      ) : (
        <>
          <ApplyCampTemplate
            campSessions={sessions.map((s) => ({ id: s.id }))}
            planKey={planKey}
            onApplied={() => {
              try {
                const raw = window.localStorage.getItem(planKey);
                if (raw) setAssignments(JSON.parse(raw));
                setLibrary(readSavedSessions());
              } catch { /* ignore */ }
            }}
          />

          <ApplySessionSeries
            campId={campId}
            campSessions={sessions.map((s) => ({ id: s.id }))}
            planKey={planKey}
            onApplied={() => {
              try {
                const raw = window.localStorage.getItem(planKey);
                if (raw) setAssignments(JSON.parse(raw));
                setLibrary(readSavedSessions());
              } catch { /* ignore */ }
            }}
          />

          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day Strip</p>
            <button
              onClick={() => {
                const next = !dragMode;
                setDragMode(next);
                if (next && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(15);
              }}
              className={"rounded-full border px-2.5 py-1 text-[10px] font-bold " + (dragMode ? "border-teal bg-teal text-background" : "border-border bg-surface text-muted-foreground")}
            >
              {dragMode ? "Done reordering" : "Reorder"}
            </button>
          </div>

          <div className="-mx-5 overflow-x-auto px-5">
            <div className="flex gap-2">
              {sessions.map((s, i) => {
                const assignedId = assignments[s.id];
                const assigned = library.find((l) => l.id === assignedId);
                const state = stateFor(s);
                const isOpen = effectiveExpanded === s.id;
                const date = new Date(s.session_date + "T00:00:00");
                const baseBorder =
                  state === "completed"
                    ? "border-emerald-400/50 bg-emerald-400/10"
                    : state === "active"
                    ? "border-teal bg-teal/10"
                    : "border-border bg-card opacity-60";
                const ringIfOpen = isOpen ? " ring-2 ring-teal/60" : "";
                const dragRing = dragMode ? " ring-1 ring-dashed ring-teal/40 animate-pulse" : "";
                const beingDragged = draggingId === s.id ? " opacity-50" : "";
                return (
                  <button
                    key={s.id}
                    onClick={() => { if (!dragMode) setExpanded(isOpen ? null : s.id); }}
                    draggable={dragMode}
                    onDragStart={() => { if (dragMode) setDraggingId(s.id); }}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => { if (dragMode && draggingId && draggingId !== s.id) e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); if (dragMode && draggingId) { reorder(draggingId, s.id); setDraggingId(null); } }}
                    className={"relative flex w-32 shrink-0 flex-col gap-1 rounded-2xl border p-3 text-left transition-colors " + baseBorder + ringIfOpen + dragRing + beingDragged}
                  >
                    <div className="flex items-center justify-between">
                      <p className={"text-[10px] font-bold uppercase tracking-wider " + (state === "completed" ? "text-emerald-400" : state === "active" ? "text-teal" : "text-muted-foreground")}>
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      {state === "completed" && <Check size={12} className="text-emerald-400" />}
                      {state === "active" && <PlayCircle size={12} className="text-teal" />}
                      {state === "upcoming" && <Lock size={11} className="text-muted-foreground" />}
                    </div>
                    <p className="font-display text-2xl font-bold text-foreground leading-none">{date.getDate()}</p>
                    <p className="text-[10px] text-muted-foreground">Day {i + 1}</p>
                    <p className={"mt-1 truncate text-[11px] font-semibold " + (assigned ? "text-foreground" : "text-muted-foreground/70")}>
                      {assigned ? assigned.name : "No session yet"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {expandedSession && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {new Date(expandedSession.session_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{expandedAssigned?.name ?? "No session assigned"}</p>
                </div>
                {expandedState !== "completed" && (
                  <button
                    onClick={() => setPickerFor(expandedSession.id)}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-foreground"
                  >
                    {expandedAssigned ? "Change" : "Assign"}
                  </button>
                )}
              </div>

              {expandedState === "completed" && expandedCompletion ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-emerald-400">Session complete</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(expandedCompletion.completedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-surface p-3 text-center">
                      <p className="font-display text-lg font-bold text-foreground">{fmtDur(expandedCompletion.totalSeconds)}</p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total time</p>
                    </div>
                    <div className="rounded-xl bg-surface p-3 text-center">
                      <p className="font-display text-lg font-bold text-foreground">
                        {expandedCompletion.drillsCompleted}/{expandedCompletion.totalDrills}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Drills run</p>
                    </div>
                  </div>
                </div>
              ) : expandedAssigned ? (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground">
                    {expandedAssigned.blocks?.length ?? 0} drills · {expandedAssigned.totalMins ?? 0} min
                  </p>
                  {expandedAssigned.blocks && expandedAssigned.blocks.length > 0 ? (
                    <ul className="space-y-1">
                      {expandedAssigned.blocks.map((b, idx) => (
                        <li key={b.uid ?? idx} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
                          <span className="font-semibold text-foreground">Drill {idx + 1}</span>
                          <span className="text-[10px] text-muted-foreground">{b.mins} min</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border bg-surface p-3 text-center text-[10px] text-muted-foreground">
                      Session has no drills yet.
                    </p>
                  )}
                  {expandedState === "active" && expandedBlocks.length > 0 && (
                    <button
                      onClick={() => setRunningSessionId(expandedSession.id)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-4 text-sm font-bold text-primary-foreground shadow-glow-teal"
                    >
                      <PlayCircle size={18} /> Start Session
                    </button>
                  )}
                  {expandedState === "upcoming" && (
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-3 text-[11px] text-muted-foreground">
                      <Lock size={12} /> Available on {new Date(expandedSession.session_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setPickerFor(expandedSession.id)}
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-teal/40 hover:text-teal"
                >
                  <Plus size={12} /> Assign from Library
                </button>
              )}
            </div>
          )}
        </>
      )}

      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setPickerFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Pick a saved session</h3>
              <button onClick={() => setPickerFor(null)} className="text-muted-foreground"><X size={14} /></button>
            </div>
            {library.length === 0 ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-xs text-muted-foreground">No saved sessions yet.</p>
                <Link to="/drill-builder" className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-4 py-1.5 text-[11px] font-bold text-primary-foreground">
                  <Plus size={12} /> Build one now
                </Link>
              </div>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {library.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => assign(pickerFor, l.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left hover:border-teal/40"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{l.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {l.blocks?.length ?? 0} drills · {l.totalMins ?? 0} min
                        </p>
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

      {runningSessionId && (() => {
        const s = sessions.find((x) => x.id === runningSessionId);
        const assigned = s ? library.find((l) => l.id === assignments[s.id]) : null;
        const blocks = ((assigned?.blocks ?? []) as RunnerBlock[]).filter((b) => b && b.drillId);
        if (!s || !assigned) return null;
        return (
          <SessionRunner
            title={assigned.name}
            blocks={blocks}
            onClose={() => setRunningSessionId(null)}
            onComplete={(rec: RunnerSummary) => {
              setSummary({ sessionId: s.id, rec });
              setRunningSessionId(null);
            }}
          />
        );
      })()}

      {summary && (() => {
        const s = sessions.find((x) => x.id === summary.sessionId);
        const assigned = s ? library.find((l) => l.id === assignments[s.id]) : null;
        return (
          <SessionSummary
            title={assigned?.name ?? "Session"}
            summary={summary.rec}
            onDone={() => {
              writeCampCompletion(campId, summary.sessionId, summary.rec);
              setCompletions((prev) => ({ ...prev, [summary.sessionId]: summary.rec }));
              const idx = sessions.findIndex((x) => x.id === summary.sessionId);
              const next = sessions[idx + 1];
              setExpanded(next ? next.id : null);
              setSummary(null);
            }}
          />
        );
      })()}

      {syncPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={dismissSync}>
          <div className="w-full max-w-md rounded-2xl border border-teal/40 bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-bold tracking-[0.3em] text-teal">SERIES UPDATED</p>
            <h3 className="mt-1 text-sm font-bold text-foreground">"{syncPrompt.applied.seriesName}" has changes</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {syncPrompt.changed.length === 1
                ? `Session ${syncPrompt.changed[0].dayIndex + 1} in your series was updated.`
                : `${syncPrompt.changed.length} sessions in your series were updated.`}
              {" "}Apply changes to this camp?
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={dismissSync} className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-[12px] font-bold text-foreground">Keep current</button>
              <button onClick={applySyncUpdates} className="flex-[1.4] rounded-xl bg-gradient-brand py-2.5 text-[12px] font-bold text-primary-foreground shadow-glow-teal">Apply updates</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}