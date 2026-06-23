import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { addPlayerWithInvite } from "@/lib/teams.functions";
import { Plus, X, UserCircle2, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/roster")({
  component: Roster,
});

type Player = { id: string; display_name: string; jersey_number: string | null; position: string | null };

function Roster() {
  const { teamId } = Route.useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [adding, setAdding] = useState(false);

  async function refresh() {
    const { data } = await supabase.from("team_players").select("id,display_name,jersey_number,position").eq("team_id", teamId).order("display_name");
    setPlayers((data ?? []) as Player[]);
  }
  useEffect(() => { refresh(); }, [teamId]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Roster · {players.length}</h3>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full bg-teal px-3 py-1 text-[11px] font-bold text-background">
          <Plus size={12} /> Add player
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {players.length === 0 && <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">No players yet.</p>}
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-xs font-bold">{p.jersey_number || <UserCircle2 size={18} />}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{p.display_name}</p>
              <p className="text-[11px] text-muted-foreground">{p.position || "—"}</p>
            </div>
          </div>
        ))}
      </div>
      {adding && <AddPlayer teamId={teamId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />}
    </div>
  );
}

function AddPlayer({ teamId, onClose, onSaved }: { teamId: string; onClose: () => void; onSaved: () => void }) {
  const add = useServerFn(addPlayerWithInvite);
  const [form, setForm] = useState({ displayName: "", jerseyNumber: "", position: "", parentEmail: "", parentName: "" });
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"sent" | "skipped" | "failed" | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName.trim() || !form.parentEmail.trim()) return;
    setSaving(true);
    try {
      const res = await add({ data: { teamId, ...form } });
      const url = `${window.location.origin}/team-invite/${res.inviteToken}`;
      setInviteUrl(url);
      setEmailStatus(res.emailStatus ?? "skipped");
      setEmailError(res.emailError ?? null);
    } catch (err: any) { alert(err?.message || "Failed"); }
    finally { setSaving(false); }
  }
  function copyLink() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between"><h3 className="font-bold">{inviteUrl ? "Invite ready" : "Add player"}</h3><button onClick={inviteUrl ? onSaved : onClose}><X size={16} /></button></div>
        {inviteUrl ? (
          <div className="mt-4 space-y-3">
            {emailStatus === "sent" && (
              <div className="rounded-xl border border-teal/40 bg-teal/10 p-3 text-sm">
                <p className="font-semibold text-teal">Invite email sent ✓</p>
                <p className="mt-1 text-muted-foreground">
                  We emailed the signup link to <span className="text-foreground font-semibold">{form.parentEmail}</span>.
                </p>
              </div>
            )}
            {emailStatus === "failed" && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <p className="font-semibold text-destructive">Email failed to send</p>
                <p className="mt-1 text-muted-foreground">Share the link below instead.</p>
                {emailError && <p className="mt-1 text-[10px] text-muted-foreground">{emailError}</p>}
              </div>
            )}
            {emailStatus === "skipped" && (
              <p className="text-sm text-muted-foreground">
                Share this link with <span className="text-foreground font-semibold">{form.parentEmail}</span>.
              </p>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
              <code className="flex-1 truncate text-[11px]">{inviteUrl}</code>
              <button onClick={copyLink} className="grid h-8 w-8 place-items-center rounded-lg bg-teal text-background">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button onClick={onSaved} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground">Done</button>
          </div>
        ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground">PLAYER NAME</span>
            <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground">JERSEY #</span>
              <input value={form.jerseyNumber} onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground">POSITION</span>
              <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="F / D / G" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground">PARENT NAME (OPTIONAL)</span>
            <input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground">PARENT EMAIL</span>
            <input type="email" required value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} placeholder="parent@example.com" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <span className="mt-1 block text-[10px] text-muted-foreground">Parent receives a link to complete athlete profile, phone, and emergency contacts.</span>
          </label>
          <button disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? "Sending…" : "Add and Invite"}</button>
        </form>
        )}
      </div>
    </div>
  );
}