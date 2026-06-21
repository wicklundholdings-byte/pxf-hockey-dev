import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardCheck, Check, X, Star, Save, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/roster")({
  component: RosterPage,
});

type Camp = { id: string; name: string };
type Session = { id: string; session_date: string; start_time: string | null; end_time: string | null };
type Reg = {
  id: string;
  attendee_id: string | null;
  status: string;
  attendees: { full_name: string; position: string | null; jersey_number: string | null } | null;
};
type AttendRow = { registration_id: string; session_id: string; present: boolean };
type EvalRow = {
  registration_id: string;
  skating: number | null;
  puck_control: number | null;
  passing: number | null;
  shooting: number | null;
  hockey_sense: number | null;
  compete_level: number | null;
  notes: string | null;
};

const SKILLS: { key: keyof EvalRow; label: string }[] = [
  { key: "skating", label: "Skating" },
  { key: "puck_control", label: "Puck Control" },
  { key: "passing", label: "Passing" },
  { key: "shooting", label: "Shooting" },
  { key: "hockey_sense", label: "Hockey IQ" },
  { key: "compete_level", label: "Compete" },
];

function RosterPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [campId, setCampId] = useState<string | null>(null);
  const [tab, setTab] = useState<"attendance" | "evaluations">("attendance");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [evals, setEvals] = useState<Record<string, EvalRow>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("camps")
        .select("id,name")
        .eq("owner_id", u.user.id)
        .order("created_at", { ascending: false });
      setCamps((data ?? []) as Camp[]);
      if (data && data.length) setCampId(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!campId) return;
    (async () => {
      const [sRes, rRes] = await Promise.all([
        supabase
          .from("camp_sessions")
          .select("id,session_date,start_time,end_time")
          .eq("camp_id", campId)
          .order("session_date", { ascending: true }),
        supabase
          .from("registrations")
          .select("id,attendee_id,status,attendees(full_name,position,jersey_number)")
          .eq("camp_id", campId)
          .order("created_at"),
      ]);
      const sList = (sRes.data ?? []) as Session[];
      setSessions(sList);
      setSessionId(sList[0]?.id ?? null);
      setRegs((rRes.data ?? []) as Reg[]);
    })();
  }, [campId]);

  useEffect(() => {
    if (!sessionId || regs.length === 0) {
      setAttendance({});
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("attendance")
        .select("registration_id,session_id,present")
        .eq("session_id", sessionId);
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((a) => {
        map[(a as AttendRow).registration_id] = (a as AttendRow).present;
      });
      setAttendance(map);
    })();
  }, [sessionId, regs]);

  useEffect(() => {
    if (regs.length === 0) {
      setEvals({});
      return;
    }
    (async () => {
      const ids = regs.map((r) => r.id);
      const { data } = await supabase
        .from("evaluations")
        .select("registration_id,skating,puck_control,passing,shooting,hockey_sense,compete_level,notes")
        .in("registration_id", ids);
      const map: Record<string, EvalRow> = {};
      (data ?? []).forEach((e) => {
        map[(e as EvalRow).registration_id] = e as EvalRow;
      });
      setEvals(map);
    })();
  }, [regs]);

  async function toggleAttendance(regId: string) {
    if (!sessionId) return;
    const next = !attendance[regId];
    setAttendance((p) => ({ ...p, [regId]: next }));
    await supabase
      .from("attendance")
      .upsert(
        { registration_id: regId, session_id: sessionId, present: next, marked_at: new Date().toISOString() },
        { onConflict: "registration_id,session_id" },
      );
  }

  async function bulkPresent() {
    if (!sessionId) return;
    const rows = regs.map((r) => ({
      registration_id: r.id,
      session_id: sessionId,
      present: true,
      marked_at: new Date().toISOString(),
    }));
    const map: Record<string, boolean> = {};
    rows.forEach((r) => (map[r.registration_id] = true));
    setAttendance(map);
    await supabase.from("attendance").upsert(rows, { onConflict: "registration_id,session_id" });
  }

  async function saveEval(regId: string, patch: Partial<EvalRow>) {
    const current = evals[regId] ?? { registration_id: regId };
    const merged = { ...current, ...patch, registration_id: regId };
    setEvals((p) => ({ ...p, [regId]: merged as EvalRow }));
    await supabase
      .from("evaluations")
      .upsert(merged as never, { onConflict: "registration_id" });
  }

  const presentCount = useMemo(
    () => Object.values(attendance).filter(Boolean).length,
    [attendance],
  );

  if (loading) {
    return <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-xs text-muted-foreground">Loading…</div>;
  }

  if (camps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-surface p-8 text-center">
        <ClipboardCheck className="mx-auto text-muted-foreground" size={28} />
        <p className="mt-2 text-xs font-semibold text-foreground">No camps yet</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Create a camp to track attendance & evaluations</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Roster</h2>
        <p className="text-[11px] text-muted-foreground">Mark attendance, score skills, share with parents</p>
      </div>

      <select
        value={campId ?? ""}
        onChange={(e) => setCampId(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
      >
        {camps.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <div className="flex gap-2 rounded-full border border-border/60 bg-surface p-1">
        {(["attendance", "evaluations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-full py-1.5 text-xs font-bold capitalize transition " +
              (tab === t ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {regs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-surface p-8 text-center text-xs text-muted-foreground">
          No registrations for this camp yet
        </div>
      ) : tab === "attendance" ? (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="rounded-2xl border border-border/60 bg-surface p-4 text-center text-[11px] text-muted-foreground">
              No sessions configured for this camp
            </p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
                {sessions.map((s) => {
                  const active = sessionId === s.id;
                  const d = new Date(s.session_date + "T00:00:00");
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSessionId(s.id)}
                      className={
                        "whitespace-nowrap rounded-xl border px-3 py-1.5 text-[11px] font-semibold " +
                        (active ? "border-teal bg-teal/10 text-teal" : "border-border/60 bg-surface text-muted-foreground")
                      }
                    >
                      {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface px-3 py-2">
                <span className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{presentCount}</span> / {regs.length} present
                </span>
                <button onClick={bulkPresent} className="rounded-full bg-teal/15 px-3 py-1 text-[11px] font-bold text-teal">
                  Mark all present
                </button>
              </div>

              <div className="space-y-2">
                {regs.map((r) => {
                  const present = !!attendance[r.id];
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggleAttendance(r.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3 text-left"
                    >
                      <div
                        className={
                          "flex h-8 w-8 items-center justify-center rounded-full " +
                          (present ? "bg-gradient-brand text-primary-foreground" : "border border-border bg-background text-muted-foreground")
                        }
                      >
                        {present ? <Check size={16} /> : <X size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {r.attendees?.full_name ?? "Unnamed"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.attendees?.position ?? "—"}
                          {r.attendees?.jersey_number ? ` · #${r.attendees.jersey_number}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {regs.map((r) => {
            const ev = evals[r.id];
            const avg = ev
              ? Math.round(
                  (SKILLS.reduce((s, sk) => s + ((ev[sk.key] as number) ?? 0), 0) /
                    SKILLS.length) *
                    10,
                ) / 10
              : 0;
            const isOpen = editing === r.id;
            return (
              <div key={r.id} className="rounded-2xl border border-border/60 bg-surface">
                <button
                  onClick={() => setEditing(isOpen ? null : r.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/15 text-[10px] font-bold text-teal">
                    {(r.attendees?.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.attendees?.full_name ?? "Unnamed"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {ev ? `Avg ${avg}/5` : "Not evaluated"}
                    </p>
                  </div>
                  <Star size={14} className={ev ? "text-teal" : "text-muted-foreground"} />
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-border/60 p-3">
                    {SKILLS.map((sk) => {
                      const val = (ev?.[sk.key] as number) ?? 0;
                      return (
                        <div key={sk.key}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-foreground">{sk.label}</span>
                            <span className="text-[10px] text-muted-foreground">{val}/5</span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                onClick={() => saveEval(r.id, { [sk.key]: n } as Partial<EvalRow>)}
                                className={
                                  "h-7 flex-1 rounded-md text-[11px] font-bold " +
                                  (val >= n ? "bg-gradient-brand text-primary-foreground" : "bg-background text-muted-foreground border border-border")
                                }
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Coach notes
                      </label>
                      <textarea
                        defaultValue={ev?.notes ?? ""}
                        onBlur={(e) => saveEval(r.id, { notes: e.target.value })}
                        rows={3}
                        placeholder="Strengths, focus areas, parent-ready feedback…"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setEditing(null)}
                        className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
                      >
                        <ChevronLeft size={12} /> Close
                      </button>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Save size={10} /> Auto-saved
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}