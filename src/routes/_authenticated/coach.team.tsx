import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCog, Plus, Mail, Phone, Trash2, X, Check, Clock, Shield, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/team")({
  component: TeamPage,
});

type Member = {
  id: string;
  owner_id: string;
  member_user_id: string | null;
  title: string;
  status: "invited" | "active";
  email: string;
  phone: string | null;
  created_at: string;
  permission_level: "owner" | "coach" | "assistant";
};

type Camp = { id: string; name: string; start_date: string | null; status: "draft" | "live" | "ended" };
type Assignment = { id: string; camp_id: string; team_member_id: string };

function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<{ email: string; title: string; phone: string; permission_level: "coach" | "assistant" }>({ email: "", title: "Assistant Coach", phone: "", permission_level: "coach" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignFor, setAssignFor] = useState<Member | null>(null);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const [{ data }, { data: c }, { data: a }] = await Promise.all([
      supabase
        .from("team_members")
        .select("*")
        .eq("owner_id", u.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("camps")
        .select("id, name, start_date, status")
        .eq("owner_id", u.user.id)
        .neq("status", "ended")
        .order("start_date", { ascending: false }),
      (supabase as any).from("camp_staff").select("id, camp_id, team_member_id"),
    ]);
    setMembers((data ?? []) as Member[]);
    setCamps((c ?? []) as Camp[]);
    setAssignments((a ?? []) as Assignment[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function invite() {
    if (!userId || !form.email.trim() || !form.title.trim()) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("team_members").insert({
      owner_id: userId,
      email: form.email.trim().toLowerCase(),
      title: form.title.trim(),
      phone: form.phone.trim() || null,
      status: "invited",
      permission_level: form.permission_level,
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ email: "", title: "Assistant Coach", phone: "", permission_level: "coach" });
    setShowInvite(false);
    load();
  }

  async function activate(id: string) {
    await supabase.from("team_members").update({ status: "active" }).eq("id", id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this team member?")) return;
    await supabase.from("team_members").delete().eq("id", id);
    load();
  }

  async function setPermission(id: string, level: "coach" | "assistant") {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, permission_level: level } : m)));
    await (supabase as any).from("team_members").update({ permission_level: level }).eq("id", id);
  }

  async function toggleAssignment(memberId: string, campId: string) {
    const existing = assignments.find((a) => a.team_member_id === memberId && a.camp_id === campId);
    if (existing) {
      setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
      await (supabase as any).from("camp_staff").delete().eq("id", existing.id);
    } else {
      const { data } = await (supabase as any)
        .from("camp_staff")
        .insert({ camp_id: campId, team_member_id: memberId })
        .select("id, camp_id, team_member_id")
        .maybeSingle();
      if (data) setAssignments((prev) => [...prev, data as Assignment]);
    }
  }

  const active = members.filter((m) => m.status === "active");
  const invited = members.filter((m) => m.status === "invited");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Team</h2>
          <p className="text-[11px] text-muted-foreground">Assistant coaches & staff</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
        >
          <Plus size={12} /> Invite
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <KPI label="Total" value={members.length} />
        <KPI label="Active" value={active.length} />
        <KPI label="Pending" value={invited.length} />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-xs text-muted-foreground">
          Loading…
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-surface p-8 text-center">
          <UserCog className="mx-auto text-muted-foreground" size={28} />
          <p className="mt-2 text-xs font-semibold text-foreground">No team members yet</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Invite assistants to help run camps</p>
        </div>
      ) : (
        <>
          {invited.length > 0 && (
            <Section title="Pending invites" count={invited.length}>
              {invited.map((m) => (
                <Row key={m.id} m={m} assignedCamps={camps.filter((c) => assignments.some((a) => a.team_member_id === m.id && a.camp_id === c.id))} onActivate={() => activate(m.id)} onRemove={() => remove(m.id)} onPermission={setPermission} onAssign={() => setAssignFor(m)} />
              ))}
            </Section>
          )}
          {active.length > 0 && (
            <Section title="Active" count={active.length}>
              {active.map((m) => (
                <Row key={m.id} m={m} assignedCamps={camps.filter((c) => assignments.some((a) => a.team_member_id === m.id && a.camp_id === c.id))} onRemove={() => remove(m.id)} onPermission={setPermission} onAssign={() => setAssignFor(m)} />
              ))}
            </Section>
          )}
        </>
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setShowInvite(false)}>
          <div
            className="w-full rounded-t-3xl border-t border-border bg-background p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">Invite team member</h3>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="coach@team.com"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60"
                />
              </Field>
              <Field label="Role / Title">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Assistant Coach"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                />
              </Field>
              <Field label="Phone (optional)">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 555 0100"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                />
              </Field>
              <Field label="Permission level">
                <div className="grid grid-cols-2 gap-2">
                  {(["coach","assistant"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setForm({ ...form, permission_level: p })}
                      className={"rounded-xl border px-3 py-2 text-left text-xs " + (form.permission_level === p ? "border-teal bg-teal/15 text-foreground" : "border-border bg-surface text-muted-foreground")}>
                      <p className="font-bold capitalize">{p}</p>
                      <p className="text-[10px] text-muted-foreground">{p === "coach" ? "Run assigned camps" : "View + check-in only"}</p>
                    </button>
                  ))}
                </div>
              </Field>
              {err && <p className="text-xs text-destructive">{err}</p>}
              <button
                disabled={saving || !form.email.trim()}
                onClick={invite}
                className="w-full rounded-xl bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Sending…" : "Send invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignFor && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setAssignFor(null)}>
          <div className="w-full rounded-t-3xl border-t border-border bg-background p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Assign to camps</h3>
                <p className="text-[11px] text-muted-foreground">{assignFor.email} · {assignFor.permission_level}</p>
              </div>
              <button onClick={() => setAssignFor(null)} className="text-muted-foreground"><X size={18} /></button>
            </div>
            {camps.length === 0 ? (
              <p className="rounded-xl bg-surface p-4 text-center text-xs text-muted-foreground">No camps yet.</p>
            ) : (
              <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
                {camps.map((c) => {
                  const assigned = assignments.some((a) => a.camp_id === c.id && a.team_member_id === assignFor.id);
                  return (
                    <button key={c.id} onClick={() => toggleAssignment(assignFor.id, c.id)}
                      className={"flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left " + (assigned ? "border-teal bg-teal/10" : "border-border bg-surface")}>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.start_date ? new Date(c.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}</p>
                      </div>
                      <span className={"text-[10px] font-bold " + (assigned ? "text-teal" : "text-muted-foreground")}>{assigned ? "ASSIGNED" : "ASSIGN"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  m,
  assignedCamps,
  onActivate,
  onRemove,
  onPermission,
  onAssign,
}: {
  m: Member;
  assignedCamps: Camp[];
  onActivate?: () => void;
  onRemove: () => void;
  onPermission: (id: string, level: "coach" | "assistant") => void;
  onAssign: () => void;
}) {
  const initials = m.email.slice(0, 2).toUpperCase();
  const campsLabel = assignedCamps.length > 0 ? assignedCamps.map((c) => c.name).join(", ") : "No camps assigned";
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-surface p-3">
      <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/15 text-xs font-bold text-teal">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
          {m.status === "invited" ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-500">
              <Clock size={9} /> Pending
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-teal/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-teal">
              <Check size={9} /> Active
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <Mail size={10} /> {m.email}
          </span>
          {m.phone && (
            <span className="flex items-center gap-1">
              <Phone size={10} /> {m.phone}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onActivate && (
          <button
            onClick={onActivate}
            className="rounded-full bg-teal/15 p-1.5 text-teal"
            title="Mark as active"
          >
            <Check size={14} />
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded-full bg-destructive/15 p-1.5 text-destructive"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
        <div className="flex items-center gap-1 rounded-full bg-card p-0.5">
          {(["coach","assistant"] as const).map((p) => (
            <button key={p} onClick={() => onPermission(m.id, p)}
              className={"flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold capitalize " + (m.permission_level === p ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")}>
              <Shield size={9} /> {p}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground" title={campsLabel}>
          {campsLabel}
        </p>
        <button onClick={onAssign} className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-foreground">
          <CalendarDays size={10} /> Assign to Camp
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}