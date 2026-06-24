import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle2 } from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId/roster")({
  component: ParentTeamRoster,
});

type Player = { id: string; display_name: string; jersey_number: string | null; position: string | null };

function maskName(full: string) {
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const lastInitial = parts[1]?.[0] ? ` ${parts[1][0]}.` : "";
  return first + lastInitial;
}

function ParentTeamRoster() {
  const { teamId } = Route.useParams();
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("team_players")
        .select("id,display_name,jersey_number,position")
        .eq("team_id", teamId)
        .order("display_name");
      setPlayers((data ?? []) as Player[]);
    })();
  }, [teamId]);

  return (
    <div className="px-5 pb-6">
      <h3 className="text-sm font-bold">Roster · {players.length}</h3>
      <div className="mt-3 space-y-2">
        {players.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
            No players on the roster yet.
          </p>
        )}
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-xs font-bold">
              {p.jersey_number || <UserCircle2 size={18} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{maskName(p.display_name)}</p>
              <p className="text-[11px] text-muted-foreground">{p.position || "—"}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">Last names are hidden for player privacy.</p>
    </div>
  );
}