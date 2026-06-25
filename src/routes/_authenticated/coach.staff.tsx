import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Mail, Trash2, Plus, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listStaff, inviteStaffCoach, removeStaffCoach, reassignStaffTeams } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/coach/staff")({
  component: StaffPage,
});

const INCLUDED = 3;
const ADDL_PRICE = 9.99;

type StaffRow = {
  id: string; email: string; full_name: string | null; status: string;
  invited_at: string; accepted_at: string | null; invite_token: string;
  staff_user_id: string | null;
  teams: { team_id: string; name: string }[];
};
type TeamOpt = { id: string; name: string };

function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [teams, setTeams] = useState<TeamOpt[]>([]);
  const [openInvite, setOpenInvite] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
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
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setEditing(s)}
                  className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold"
                >Reassign teams</button>
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