import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveLineup } from "@/lib/teams.functions";
import { ArrowLeft, Share2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/$eventId/lineup")({
  component: Lineup,
});

type Player = { id: string; display_name: string; jersey_number: string | null };

const SLOTS = [
  "L1-LW","L1-C","L1-RW","L2-LW","L2-C","L2-RW","L3-LW","L3-C","L3-RW","L4-LW","L4-C","L4-RW",
  "D1-L","D1-R","D2-L","D2-R","D3-L","D3-R","G-Start","G-Backup",
] as const;

function Lineup() {
  const { teamId, eventId } = Route.useParams();
  const save = useServerFn(saveLineup);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assign, setAssign] = useState<Record<string, string | null>>({});
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("team_players").select("id,display_name,jersey_number").eq("team_id", teamId).then(({ data }) => setPlayers((data ?? []) as Player[]));
  }, [teamId]);

  const used = new Set(Object.values(assign).filter(Boolean) as string[]);

  async function persist() {
    setSaving(true);
    try { await save({ data: { teamId, eventId, positions: assign, shared } }); alert("Lineup saved"); }
    catch (e: any) { alert(e?.message); } finally { setSaving(false); }
  }

  return (
    <div>
      <Link to="/coach/teams/$teamId/schedule/$eventId" params={{ teamId, eventId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back</Link>
      <h3 className="mt-2 font-display text-lg font-bold">Lineup</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {SLOTS.map((slot) => (
          <div key={slot} className="rounded-xl border border-border bg-surface p-2">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{slot}</p>
            <select
              value={assign[slot] || ""}
              onChange={(e) => setAssign({ ...assign, [slot]: e.target.value || null })}
              className="mt-1 w-full rounded-lg bg-background px-2 py-1.5 text-xs"
            >
              <option value="">—</option>
              {players.map((p) => (
                <option key={p.id} value={p.id} disabled={used.has(p.id) && assign[slot] !== p.id}>
                  {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.display_name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs">
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
        <Share2 size={12} /> Share with team (parents see position + first name)
      </label>
      <button onClick={persist} disabled={saving} className="mt-3 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save lineup"}</button>
    </div>
  );
}