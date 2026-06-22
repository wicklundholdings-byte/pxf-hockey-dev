import { useEffect, useMemo, useState } from "react";
import { Plus, X, ChevronUp, ChevronDown, Trash2, Layers } from "lucide-react";
import { readSeries, writeSeries, upsertSeries, deleteSeries, type SessionSeries } from "@/lib/session-series";

type SavedSession = { id: string; name: string; totalMins?: number; blocks?: unknown[] };

function readSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try { const r = window.localStorage.getItem("pxf:sessions:v2"); return r ? JSON.parse(r) : []; } catch { return []; }
}

export function SeriesManager() {
  const [list, setList] = useState<SessionSeries[]>([]);
  const [lib, setLib] = useState<SavedSession[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const sync = () => { setList(readSeries()); setLib(readSessions()); };
    sync();
    window.addEventListener("pxf:series-changed", sync);
    window.addEventListener("pxf:sessions-changed", sync);
    return () => {
      window.removeEventListener("pxf:series-changed", sync);
      window.removeEventListener("pxf:sessions-changed", sync);
    };
  }, []);

  function removeOne(id: string) {
    if (!confirm("Delete this series? Sessions inside it are not deleted.")) return;
    deleteSeries(id);
    setList(readSeries());
  }

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">SESSION SERIES</p>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1 rounded-full bg-volt px-3 py-1.5 text-[11px] font-bold text-black">
          <Plus size={12} /> New Series
        </button>
      </div>

      {list.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center">
          <Layers size={20} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold text-foreground">No series yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Group sessions into a multi-day flow (e.g. "3 Day Skating Flow").</p>
          <button onClick={() => setCreating(true)} className="mt-3 inline-flex items-center gap-1 rounded-full bg-volt px-4 py-1.5 text-[11px] font-bold text-black">
            <Plus size={12} /> Create your first series
          </button>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{s.days.length} day{s.days.length === 1 ? "" : "s"}</p>
                  <ol className="mt-2 space-y-1">
                    {s.days.map((sid, i) => {
                      const sess = lib.find((l) => l.id === sid);
                      return (
                        <li key={i} className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5 text-[11px]">
                          <span className="font-bold text-volt">Day {i + 1}</span>
                          <span className={"truncate " + (sess ? "text-foreground" : "text-muted-foreground italic")}>
                            {sess ? sess.name : "Session removed"}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <button onClick={() => removeOne(s.id)} aria-label="Delete" className="rounded-full p-1.5 text-muted-foreground hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && <CreateSeriesModal lib={lib} onClose={() => setCreating(false)} onSave={(s) => { upsertSeries(s); setList(readSeries()); setCreating(false); }} />}
    </div>
  );
}

const DAY_PRESETS = [3, 5] as const;

function CreateSeriesModal({ lib, onClose, onSave }: { lib: SavedSession[]; onClose: () => void; onSave: (s: SessionSeries) => void }) {
  const [name, setName] = useState("");
  const [numDays, setNumDays] = useState<number>(3);
  const [days, setDays] = useState<(string | null)[]>([null, null, null]);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  function setDayCount(n: number) {
    const next = Array.from({ length: n }, (_, i) => days[i] ?? null);
    setNumDays(n);
    setDays(next);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= days.length) return;
    const next = [...days];
    [next[i], next[j]] = [next[j], next[i]];
    setDays(next);
  }

  const nameError = touched && !name.trim() ? "Series name is required" : null;
  const canSave = name.trim().length > 0 && days.some((d) => d);

  function submit() {
    setTouched(true);
    if (!canSave) return;
    onSave({
      id: `ser-${Date.now()}`,
      name: name.trim(),
      days: days.filter((d): d is string => Boolean(d)),
      createdAt: Date.now(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-screen-sm overflow-y-auto rounded-t-3xl border-t border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">NEW</p>
            <h2 className="mt-0.5 text-lg font-bold text-foreground">Create Session Series</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">SERIES NAME</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 3 Day Skating Flow"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-teal" />
            {nameError && <p className="mt-1 text-[11px] text-destructive">{nameError}</p>}
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">NUMBER OF DAYS</label>
            <div className="mt-1.5 flex items-center gap-1.5">
              {DAY_PRESETS.map((n) => (
                <button key={n} onClick={() => setDayCount(n)}
                  className={"rounded-full border px-3 py-1.5 text-[11px] font-semibold " + (numDays === n ? "border-teal bg-teal text-background" : "border-border bg-surface-2 text-muted-foreground")}>
                  {n} days
                </button>
              ))}
              <input type="number" min={1} max={30} value={numDays}
                onChange={(e) => setDayCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="ml-2 w-20 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-center text-[11px] font-semibold text-foreground outline-none focus:border-teal" />
              <span className="text-[10px] text-muted-foreground">custom</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">ASSIGN SESSIONS</label>
            <ul className="mt-1.5 space-y-1.5">
              {days.map((sid, i) => {
                const sess = sid ? lib.find((l) => l.id === sid) : null;
                return (
                  <li key={i} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2">
                    <span className="grid h-8 w-12 place-items-center rounded-lg bg-volt/15 text-[10px] font-bold tracking-wider text-volt">D{i + 1}</span>
                    <button onClick={() => setPickerFor(i)} className="min-w-0 flex-1 text-left">
                      <p className={"truncate text-sm " + (sess ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {sess ? sess.name : "Pick a session…"}
                      </p>
                    </button>
                    <div className="flex flex-col">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-muted-foreground disabled:opacity-30"><ChevronUp size={12} /></button>
                      <button onClick={() => move(i, 1)} disabled={i === days.length - 1} className="rounded p-0.5 text-muted-foreground disabled:opacity-30"><ChevronDown size={12} /></button>
                    </div>
                    {sid && (
                      <button onClick={() => { const n = [...days]; n[i] = null; setDays(n); }} className="rounded-full p-1 text-muted-foreground" aria-label="Clear">
                        <X size={12} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {lib.length === 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">No saved sessions yet — build one in the Sessions tab first.</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-surface p-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-border bg-surface-2 py-3 text-[12px] font-bold tracking-wide text-foreground">CANCEL</button>
          <button onClick={submit} disabled={!canSave} className="flex-[1.4] rounded-2xl bg-gradient-brand py-3 text-[12px] font-bold tracking-wide text-primary-foreground shadow-glow-teal disabled:opacity-50">SAVE SERIES</button>
        </div>

        {pickerFor !== null && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4" onClick={() => setPickerFor(null)}>
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Pick a session for Day {pickerFor + 1}</h3>
                <button onClick={() => setPickerFor(null)}><X size={14} /></button>
              </div>
              {lib.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No saved sessions.</p>
              ) : (
                <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                  {lib.map((l) => (
                    <li key={l.id}>
                      <button onClick={() => { const n = [...days]; n[pickerFor] = l.id; setDays(n); setPickerFor(null); }}
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left hover:border-teal/40">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{l.name}</p>
                          <p className="text-[10px] text-muted-foreground">{l.blocks?.length ?? 0} drills · {l.totalMins ?? 0} min</p>
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
    </div>
  );
}
