import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Mail, Trash2, Plus, Copy, Check, CalendarRange } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listStaff, inviteStaffCoach, removeStaffCoach, reassignStaffTeams } from "@/lib/staff.functions";
import { setStaffSessionRate, listAssignableSessions, listStaffAssignments, assignStaffToSession, unassignStaffFromSession } from "@/lib/coach-costs.functions";

export const Route = createFileRoute("/_authenticated/coach/staff")({
  component: StaffPage,
});

const INCLUDED = 3;
const ADDL_PRICE = 9.99;

type StaffRow = {
  id: string; email: string; full_name: string | null; status: string;
  invited_at: string; accepted_at: string | null; invite_token: string;
  staff_user_id: string | null;
  session_rate_cents: number;
  teams: { team_id: string; name: string }[];
};
type TeamOpt = { id: string; name: string };

function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [teams, setTeams] = useState<TeamOpt[]>([]);
  const [openInvite, setOpenInvite] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [managingSessions, setManagingSessions] = useState<StaffRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const rows = await listStaff();
    setStaff(rows as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("teams").select("id,name").eq("coach_id", user.id).order("name");
      setTeams(((data ?? []) as TeamOpt[]));
      await refresh();
    })();
  }, [user?.id]);

  const additional = Math.max(0, staff.filter((s) => s.status === "active" || s.status === "invited").length - INCLUDED);

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Link to="/settings" className="rounded-full border border-border p-1.5 text-muted-foreground"><ChevronLeft size={14} /></Link>
        <h1 className="font-display text-xl font-bold">Staff Coaches</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{INCLUDED} included</span> · {additional} additional at ${ADDL_PRICE.toFixed(2)}/mo each
        </p>
        {additional > 0 && (
          <p className="mt-1 text-[11px] text-amber-400">+${(additional * ADDL_PRICE).toFixed(2)}/mo will be added at next renewal.</p>
        )}
      </div>

      <button
        onClick={() => setOpenInvite(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground"
      >
        <Plus size={16} /> Invite Coach
      </button>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : staff.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No staff coaches yet. Invite one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.full_name || s.email.split("@")[0]}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.email}</p>
                </div>
                <span className={
                  "rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider " +
                  (s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400")
                }>
                  {s.status.toUpperCase()}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Teams: {s.teams.length ? s.teams.map((t) => t.name).join(", ") : <span className="text-muted-foreground/70">none assigned</span>}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Added {new Date(s.invited_at).toLocaleDateString()}</p>
              <RateEditor staff={s} onSaved={refresh} />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setEditing(s)}
                  className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold"
                >Reassign teams</button>
                <button
                  onClick={() => setManagingSessions(s)}
                  className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-semibold"
                ><CalendarRange size={12} /> Sessions</button>
                {s.status === "invited" && (
                  <CopyLink token={s.invite_token} />
                )}
                <button
                  onClick={async () => { if (confirm("Remove this staff coach?")) { await removeStaffCoach({ data: { staffId: s.id } }); refresh(); } }}
                  className="ml-auto flex items-center gap-1 rounded-full border border-red-500/40 px-3 py-1 text-[11px] font-semibold text-red-400"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {openInvite && (
        <InviteSheet
          teams={teams}
          onClose={() => setOpenInvite(false)}
          onInvited={() => { setOpenInvite(false); refresh(); }}
        />
      )}
      {editing && (
        <ReassignSheet
          staff={editing}
          teams={teams}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {managingSessions && (
        <SessionsSheet
          staff={managingSessions}
          onClose={() => setManagingSessions(null)}
        />
      )}
    </div>
  );
}

function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/staff-invite/${token}`;
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-semibold"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy link"}
    </button>
  );
}

function InviteSheet({ teams, onClose, onInvited }: { teams: TeamOpt[]; onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) { setMsg("Enter an email"); return; }
    setSending(true); setMsg(null);
    try {
      const res = await inviteStaffCoach({ data: { email: email.trim(), fullName: fullName.trim() || undefined, teamIds: Array.from(selected) } });
      if (res.emailStatus === "sent") onInvited();
      else { setMsg(`Invite saved. ${res.emailStatus === "skipped" ? "Email not configured – share the link from the list." : "Email failed – share the link manually."}`); onInvited(); }
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-background p-5 sm:rounded-3xl">
        <h2 className="font-display text-lg font-bold">Invite a coach</h2>
        <p className="mt-1 text-xs text-muted-foreground">They'll get an email to set up their account and join your Elite plan.</p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@example.com"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Name (optional)</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Assign teams</span>
            {teams.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">No teams yet.</p>
            ) : (
              <div className="mt-1 space-y-1">
                {teams.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                    <input type="checkbox" checked={selected.has(t.id)} onChange={(e) => {
                      const s = new Set(selected); if (e.target.checked) s.add(t.id); else s.delete(t.id); setSelected(s);
                    }} />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        {msg && <p className="mt-3 text-[11px] text-amber-400">{msg}</p>}
        <div className="mt-5 flex items-center gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2 text-sm">Cancel</button>
          <button disabled={sending} onClick={submit} className="flex-1 rounded-full bg-gradient-brand py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {sending ? "Sending…" : (<><Mail size={14} className="-mt-0.5 mr-1 inline" /> Send invite</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReassignSheet({ staff, teams, onClose, onSaved }: { staff: StaffRow; teams: TeamOpt[]; onClose: () => void; onSaved: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(staff.teams.map((t) => t.team_id)));
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-background p-5 sm:rounded-3xl">
        <h2 className="font-display text-lg font-bold">Reassign teams</h2>
        <p className="mt-1 text-xs text-muted-foreground">{staff.email}</p>
        <div className="mt-4 space-y-1">
          {teams.map((t) => (
            <label key={t.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.has(t.id)} onChange={(e) => {
                const s = new Set(selected); if (e.target.checked) s.add(t.id); else s.delete(t.id); setSelected(s);
              }} />
              <span>{t.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={async () => { setSaving(true); await reassignStaffTeams({ data: { staffId: staff.id, teamIds: Array.from(selected) } }); onSaved(); }}
            className="flex-1 rounded-full bg-gradient-brand py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RateEditor({ staff, onSaved }: { staff: StaffRow; onSaved: () => void }) {
  const [val, setVal] = useState<string>(((staff.session_rate_cents ?? 0) / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const save = async () => {
    const cents = Math.round(parseFloat(val || "0") * 100);
    if (Number.isNaN(cents)) return;
    setSaving(true);
    try {
      await setStaffSessionRate({ data: { staffId: staff.id, rateCents: cents } });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 1500);
      onSaved();
    } finally { setSaving(false); }
  };
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rate</span>
      <span className="text-xs text-muted-foreground">$</span>
      <input
        type="number" min="0" step="1" value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
      />
      <span className="text-[11px] text-muted-foreground">/ session</span>
      {saving ? <span className="text-[10px] text-muted-foreground">Saving…</span> :
        savedOk ? <Check size={12} className="text-emerald-400" /> : null}
      <span className="ml-auto text-[10px] text-muted-foreground">Owner-only</span>
    </div>
  );
}

type AssignableItem = { id: string; date: string; start: string | null; label: string };

function SessionsSheet({ staff, onClose }: { staff: StaffRow; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [camps, setCamps] = useState<AssignableItem[]>([]);
  const [teamEvents, setTeamEvents] = useState<AssignableItem[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());

  const keyOf = (sourceType: string, id: string) => `${sourceType}:${id}`;

  const load = async () => {
    setLoading(true);
    const [opts, mine] = await Promise.all([
      listAssignableSessions(),
      listStaffAssignments({ data: { staffId: staff.id } }),
    ]);
    setCamps(opts.campSessions);
    setTeamEvents(opts.teamEvents);
    setAssigned(new Set(mine.map((m) => keyOf(m.source_type, m.source_id))));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [staff.id]);

  const toggle = async (sourceType: "camp_session" | "team_event", item: AssignableItem) => {
    const k = keyOf(sourceType, item.id);
    setBusy(true);
    try {
      if (assigned.has(k)) {
        await unassignStaffFromSession({ data: { staffId: staff.id, sourceType, sourceId: item.id } });
      } else {
        await assignStaffToSession({ data: { staffId: staff.id, sourceType, sourceId: item.id, sessionDate: item.date } });
      }
      const next = new Set(assigned);
      if (next.has(k)) next.delete(k); else next.add(k);
      setAssigned(next);
    } finally { setBusy(false); }
  };

  const renderList = (sourceType: "camp_session" | "team_event", items: AssignableItem[]) => (
    items.length === 0 ? <p className="text-[11px] text-muted-foreground">None upcoming.</p> : (
      <ul className="space-y-1">
        {items.map((it) => {
          const k = keyOf(sourceType, it.id);
          const on = assigned.has(k);
          return (
            <li key={k}>
              <button
                disabled={busy}
                onClick={() => toggle(sourceType, it)}
                className={"flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs " + (on ? "border-teal bg-teal/10" : "border-border bg-surface")}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{it.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{new Date(it.date + "T00:00:00").toLocaleDateString()} {it.start ? `· ${it.start}` : ""}</p>
                </div>
                {on ? <Check size={14} className="text-teal" /> : <Plus size={14} className="text-muted-foreground" />}
              </button>
            </li>
          );
        })}
      </ul>
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-background p-5 sm:rounded-3xl">
        <h2 className="font-display text-lg font-bold">Assign sessions</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {staff.full_name || staff.email} · ${((staff.session_rate_cents ?? 0) / 100).toFixed(2)} / session
        </p>
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
          {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : (
            <>
              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Camp sessions</h3>
                {renderList("camp_session", camps)}
              </section>
              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Team events</h3>
                {renderList("team_event", teamEvents)}
              </section>
            </>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-full border border-border py-2 text-sm">Done</button>
      </div>
    </div>
  );
}