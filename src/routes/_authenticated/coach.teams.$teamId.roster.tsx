import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { addPlayer } from "@/lib/teams.functions";
import { Plus, X, UserCircle2 } from "lucide-react";

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
  const add = useServerFn(addPlayer);
  const [form, setForm] = useState({ displayName: "", jerseyNumber: "", position: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName.trim()) return;
    setSaving(true);
    try { await add({ data: { teamId, ...form } }); onSaved(); }
    catch (err: any) { alert(err?.message || "Failed"); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between"><h3 className="font-bold">Add player</h3><button onClick={onClose}><X size={16} /></button></div>
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
          <button disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Add"}</button>
        </form>
      </div>
    </div>
  );
}