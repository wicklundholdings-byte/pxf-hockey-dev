import { useEffect, useState } from "react";
import { Layers, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Template = { id: string; name: string; num_days: number };
type Day = { day_number: number; session_name: string | null; session_snapshot: any };

type Props = {
  /** Ordered list of camp_sessions for this event (by date). */
  campSessions: { id: string }[];
  /** Storage key the PlansTab uses for per-session-id → SavedSession.id assignments. */
  planKey: string;
  onApplied: () => void;
};

type SavedSession = { id: string; name: string; totalMins: number; blocks: { uid: string; drillId: string; mins: number }[]; date?: string; age?: string; level?: string; notes?: string };

function readSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try { const r = window.localStorage.getItem("pxf:sessions:v2"); return r ? JSON.parse(r) : []; } catch { return []; }
}
function writeSessions(list: SavedSession[]) {
  window.localStorage.setItem("pxf:sessions:v2", JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("pxf:sessions-changed"));
}

export function ApplyCampTemplate({ campSessions, planKey, onApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setTemplates([]); setLoading(false); return; }
      const { data } = await supabase
        .from("camp_templates")
        .select("id,name,num_days")
        .eq("owner_id", u.user.id)
        .order("created_at", { ascending: false });
      setTemplates((data ?? []) as Template[]);
      setLoading(false);
    })();
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function apply(t: Template) {
    setApplying(t.id);
    const { data: daysData } = await supabase
      .from("camp_template_days")
      .select("day_number,session_name,session_snapshot")
      .eq("template_id", t.id)
      .order("day_number");
    const days = (daysData ?? []) as Day[];

    // Merge any new snapshots into local sessions library
    const lib = readSessions();
    const libById = new Map(lib.map((s) => [s.id, s]));
    const assignments: Record<string, string> = {};
    try {
      const raw = window.localStorage.getItem(planKey);
      if (raw) Object.assign(assignments, JSON.parse(raw));
    } catch { /* ignore */ }

    const max = Math.min(campSessions.length, days.length);
    for (let i = 0; i < max; i++) {
      const day = days[i];
      const snap = day.session_snapshot as SavedSession | null;
      if (!snap) continue;
      // Use a new id per apply to avoid clobbering past plan history
      const newId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-d${i}`;
      const sess: SavedSession = { ...snap, id: newId, name: snap.name || day.session_name || `Day ${i + 1}` };
      libById.set(newId, sess);
      assignments[campSessions[i].id] = newId;
    }
    writeSessions(Array.from(libById.values()));
    window.localStorage.setItem(planKey, JSON.stringify(assignments));

    setApplying(null);
    setOpen(false);
    setToast(`Applied "${t.name}" to ${max} day${max === 1 ? "" : "s"}`);
    onApplied();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-full border border-volt/50 bg-volt/15 py-2 text-[11px] font-bold tracking-wider text-volt"
      >
        <Layers size={12} /> APPLY CAMP TEMPLATE
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Apply Camp Template</h3>
                <p className="text-[10px] text-muted-foreground">Fills sessions for all {campSessions.length} day{campSessions.length === 1 ? "" : "s"} in one tap.</p>
              </div>
              <button onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
            {loading ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
            ) : templates.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No camp templates saved yet. Build one in Playbook → Camps.</p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {templates.map((t) => {
                  const mismatch = t.num_days !== campSessions.length;
                  return (
                    <li key={t.id}>
                      <button
                        disabled={applying === t.id}
                        onClick={() => apply(t)}
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left hover:border-teal/40 disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.num_days}-day template
                            {mismatch && <span className="ml-1 text-volt">· event has {campSessions.length}, will fill first {Math.min(t.num_days, campSessions.length)}</span>}
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