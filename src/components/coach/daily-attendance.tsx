import { useEffect, useMemo, useState } from "react";
import { Check, X, HelpCircle, Bell, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Session = { id: string; session_date: string; start_time: string | null; end_time: string | null };
type Reg = {
  id: string;
  attendees?: { full_name: string | null } | null;
  contacts?: { full_name: string | null; phone: string | null } | null;
};
type Rsvp = {
  id: string;
  registration_id: string;
  camp_session_id: string;
  status: "attending" | "not_attending" | "no_response";
  reason: string | null;
  responded_at: string | null;
  overridden_by: string | null;
};

export function DailyAttendance({ campId, sessions, regs }: { campId: string; sessions: Session[]; regs: Reg[] }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessions[0]?.id ?? null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSessionId) return;
    (async () => {
      setLoading(true);
      // Ensure rsvp row exists for every paid/active registration on this session
      const { data: existing } = await supabase
        .from("daily_rsvps")
        .select("*")
        .eq("camp_session_id", activeSessionId);
      const have = new Set((existing ?? []).map((r) => r.registration_id));
      const missing = regs.filter((r) => !have.has(r.id));
      if (missing.length) {
        await supabase.from("daily_rsvps").insert(
          missing.map((r) => ({ camp_id: campId, camp_session_id: activeSessionId, registration_id: r.id })),
        );
        const { data: refreshed } = await supabase
          .from("daily_rsvps")
          .select("*")
          .eq("camp_session_id", activeSessionId);
        setRsvps((refreshed ?? []) as Rsvp[]);
      } else {
        setRsvps((existing ?? []) as Rsvp[]);
      }
      setLoading(false);
    })();
  }, [activeSessionId, campId, regs]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const regById = useMemo(() => new Map(regs.map((r) => [r.id, r])), [regs]);
  const buckets = useMemo(() => {
    const a: Rsvp[] = [], n: Rsvp[] = [], u: Rsvp[] = [];
    for (const r of rsvps) {
      if (r.status === "attending") a.push(r);
      else if (r.status === "not_attending") n.push(r);
      else u.push(r);
    }
    return { attending: a, notAttending: n, noResponse: u };
  }, [rsvps]);

  async function override(rsvp: Rsvp, next: Rsvp["status"]) {
    setBusy(rsvp.id);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("daily_rsvps").update({
      status: next,
      responded_at: new Date().toISOString(),
      overridden_by: u.user?.id ?? null,
      overridden_at: new Date().toISOString(),
    }).eq("id", rsvp.id);
    setRsvps((list) => list.map((x) => x.id === rsvp.id ? { ...x, status: next, responded_at: new Date().toISOString(), overridden_by: u.user?.id ?? null } : x));
    setBusy(null);
  }

  async function remindAll() {
    if (buckets.noResponse.length === 0) return;
    setReminding(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setReminding(false); return; }
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) { setReminding(false); return; }
    const body = `Quick reminder — please RSVP for tomorrow's camp day (${new Date(session.session_date + "T00:00:00").toLocaleDateString()}).`;
    const rows = buckets.noResponse.map((r) => ({
      owner_id: u.user!.id,
      camp_id: campId,
      registration_id: r.registration_id,
      channel: "sms",
      kind: "rsvp_reminder_manual",
      body,
      scheduled_for: new Date().toISOString(),
    }));
    await supabase.from("scheduled_messages").insert(rows);
    setReminding(false);
    setToast(`Queued ${rows.length} reminder${rows.length === 1 ? "" : "s"}`);
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        No camp days scheduled yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Date strip */}
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {sessions.map((s, i) => {
            const active = s.id === activeSessionId;
            const d = new Date(s.session_date + "T00:00:00");
            return (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={
                  "shrink-0 rounded-2xl border px-3 py-2 text-center transition-colors " +
                  (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-foreground")
                }
              >
                <p className="text-[9px] font-bold uppercase tracking-wider">Day {i + 1}</p>
                <p className="text-[11px] font-semibold">{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-teal" /></div>
      ) : (
        <>
          <Column
            title="Attending"
            color="teal"
            icon={Check}
            rows={buckets.attending}
            regById={regById}
            onOverride={override}
            busy={busy}
          />
          <Column
            title="Not Attending"
            color="red"
            icon={X}
            rows={buckets.notAttending}
            regById={regById}
            onOverride={override}
            busy={busy}
          />
          <Column
            title="No Response"
            color="muted"
            icon={HelpCircle}
            rows={buckets.noResponse}
            regById={regById}
            onOverride={override}
            busy={busy}
            action={
              <button
                disabled={reminding || buckets.noResponse.length === 0}
                onClick={remindAll}
                className="flex items-center gap-1 rounded-full border border-volt/50 bg-volt/15 px-3 py-1 text-[10px] font-bold tracking-wider text-volt disabled:opacity-50"
              >
                <Bell size={11} /> {reminding ? "QUEUING…" : "REMIND ALL"}
              </button>
            }
          />
        </>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-teal px-4 py-2 text-xs font-bold text-black shadow-lg">{toast}</div>
      )}
    </div>
  );
}

function Column({
  title, color, icon: Icon, rows, regById, onOverride, busy, action,
}: {
  title: string;
  color: "teal" | "red" | "muted";
  icon: typeof Check;
  rows: Rsvp[];
  regById: Map<string, Reg>;
  onOverride: (r: Rsvp, next: Rsvp["status"]) => void;
  busy: string | null;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const tone = color === "teal" ? "text-teal" : color === "red" ? "text-red-400" : "text-muted-foreground";
  const bg = color === "teal" ? "bg-teal/15" : color === "red" ? "bg-red-500/15" : "bg-surface";

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={"flex h-6 w-6 items-center justify-center rounded-full " + bg + " " + tone}><Icon size={13} /></span>
          <p className={"text-xs font-bold " + tone}>{title}</p>
          <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-bold text-foreground">{rows.length}</span>
        </div>
        {action}
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">No one here.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => {
            const reg = regById.get(r.registration_id);
            const name = reg?.attendees?.full_name ?? reg?.contacts?.full_name ?? "Athlete";
            const expanded = open === r.id;
            return (
              <li key={r.id}>
                <button
                  onClick={() => setOpen(expanded ? null : r.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-surface"
                >
                  <span className="truncate text-sm text-foreground">{name}</span>
                  <span className="flex items-center gap-1">
                    {r.reason && <span className="hidden truncate max-w-[120px] text-[10px] text-muted-foreground sm:inline">"{r.reason}"</span>}
                    <ChevronDown size={12} className={"text-muted-foreground transition-transform " + (expanded ? "rotate-180" : "")} />
                  </span>
                </button>
                {expanded && (
                  <div className="mt-1 mb-2 rounded-xl border border-border bg-surface p-2">
                    {r.reason && (
                      <p className="mb-2 text-[11px] italic text-muted-foreground">"{r.reason}"</p>
                    )}
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Override status</p>
                    <div className="grid grid-cols-3 gap-1">
                      <OverrideBtn active={r.status === "attending"} onClick={() => onOverride(r, "attending")} disabled={busy === r.id}>Attending</OverrideBtn>
                      <OverrideBtn active={r.status === "not_attending"} onClick={() => onOverride(r, "not_attending")} disabled={busy === r.id}>Not</OverrideBtn>
                      <OverrideBtn active={r.status === "no_response"} onClick={() => onOverride(r, "no_response")} disabled={busy === r.id}>None</OverrideBtn>
                    </div>
                    {r.overridden_by && <p className="mt-1.5 text-[9px] text-muted-foreground">Coach override</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OverrideBtn({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={"rounded-lg py-1 text-[10px] font-semibold disabled:opacity-50 " + (active ? "bg-teal text-background" : "border border-border bg-card text-muted-foreground")}
    >
      {children}
    </button>
  );
}