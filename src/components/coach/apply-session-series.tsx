import { useEffect, useState } from "react";
import { Layers, X, Check } from "lucide-react";
import { readSeries, type SessionSeries, sigOf, writeAppliedSeries } from "@/lib/session-series";

type SavedSession = { id: string; name: string; totalMins?: number; blocks?: { uid: string; drillId: string; mins: number }[]; date?: string; age?: string; level?: string; notes?: string };

function readSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try { const r = window.localStorage.getItem("pxf:sessions:v2"); return r ? JSON.parse(r) : []; } catch { return []; }
}
function writeSessions(list: SavedSession[]) {
  window.localStorage.setItem("pxf:sessions:v2", JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("pxf:sessions-changed"));
}

type Props = {
  campId: string;
  campSessions: { id: string }[];
  planKey: string;
  onApplied: () => void;
};

export function ApplySessionSeries({ campId, campSessions, planKey, onApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SessionSeries[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (open) setList(readSeries()); }, [open]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function apply(series: SessionSeries) {
    const lib = readSessions();
    const libById = new Map(lib.map((s) => [s.id, s]));
    const assignments: Record<string, string> = {};
    try {
      const raw = window.localStorage.getItem(planKey);
      if (raw) Object.assign(assignments, JSON.parse(raw));
    } catch { /* ignore */ }

    const max = Math.min(campSessions.length, series.days.length);
    const mapping: { campSessionId: string; sourceSessionId: string; snapshotSessionId: string; sourceSig: string }[] = [];

    for (let i = 0; i < max; i++) {
      const sourceId = series.days[i];
      const source = libById.get(sourceId);
      if (!source) continue;
      const newId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-d${i}`;
      const snap: SavedSession = { ...source, id: newId };
      libById.set(newId, snap);
      assignments[campSessions[i].id] = newId;
      mapping.push({ campSessionId: campSessions[i].id, sourceSessionId: sourceId, snapshotSessionId: newId, sourceSig: sigOf(source) });
    }

    writeSessions(Array.from(libById.values()));
    window.localStorage.setItem(planKey, JSON.stringify(assignments));
    writeAppliedSeries(campId, { seriesId: series.id, seriesName: series.name, appliedAt: Date.now(), mapping });

    setOpen(false);
    setToast(`Applied "${series.name}" to ${mapping.length} day${mapping.length === 1 ? "" : "s"}`);
    onApplied();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-full border border-teal/50 bg-teal/15 py-2 text-[11px] font-bold tracking-wider text-teal"
      >
        <Layers size={12} /> APPLY SESSION SERIES
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Apply Session Series</h3>
                <p className="text-[10px] text-muted-foreground">Fills the first {campSessions.length} day{campSessions.length === 1 ? "" : "s"} in order.</p>
              </div>
              <button onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
            {list.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No series saved yet. Create one in Playbook → Sessions → Series.</p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {list.map((s) => {
                  const mismatch = s.days.length !== campSessions.length;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => apply(s)}
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left hover:border-teal/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.days.length}-day series
                            {mismatch && <span className="ml-1 text-volt">· event has {campSessions.length}, will fill first {Math.min(s.days.length, campSessions.length)}</span>}
                          </p>
                        </div>
                        <Check size={14} className="text-teal" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-teal px-4 py-2 text-xs font-bold text-black shadow-lg">{toast}</div>
      )}
    </>
  );
}
