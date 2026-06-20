import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCog, Plus, Mail, Phone, Trash2, X, Check, Clock } from "lucide-react";

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
};

function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", title: "Assistant Coach", phone: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("owner_id", u.user.id)
      .order("created_at", { ascending: false });
    setMembers((data ?? []) as Member[]);
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
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ email: "", title: "Assistant Coach", phone: "" });
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
          className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black"
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
                <Row key={m.id} m={m} onActivate={() => activate(m.id)} onRemove={() => remove(m.id)} />
              ))}
            </Section>
          )}
          {active.length > 0 && (
            <Section title="Active" count={active.length}>
              {active.map((m) => (
                <Row key={m.id} m={m} onRemove={() => remove(m.id)} />
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
              {err && <p className="text-xs text-destructive">{err}</p>}
              <button
                disabled={saving || !form.email.trim()}
                onClick={invite}
                className="w-full rounded-xl bg-teal py-2.5 text-sm font-bold text-black disabled:opacity-50"
              >
                {saving ? "Sending…" : "Send invite"}
              </button>
            </div>
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
  onActivate,
  onRemove,
}: {
  m: Member;
  onActivate?: () => void;
  onRemove: () => void;
}) {
  const initials = m.email.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3">
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