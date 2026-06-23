import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitRsvp } from "@/lib/teams.functions";
import { ArrowLeft, Check, X, HelpCircle } from "lucide-react";
import { GameMediaTab } from "@/components/teams/game-media-tab";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parent/team/event/$eventId")({
  component: ParentEvent,
});

type Event = { id: string; team_id: string; event_type: string; title: string | null; opponent_name: string | null; venue: string | null; event_date: string; start_time: string | null; notes: string | null };
type Player = { id: string; display_name: string };

function ParentEvent() {
  const { eventId } = Route.useParams();
  const rsvp = useServerFn(submitRsvp);
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});

  async function load() {
    const { data: e } = await supabase.from("team_events").select("*").eq("id", eventId).maybeSingle();
    if (!e) return;
    setEvent(e as Event);
    const contactIdsRes = await (supabase as any).rpc("current_user_contact_ids");
    const contactIds = (contactIdsRes.data ?? []) as string[];
    const { data: ps } = await supabase
      .from("team_players")
      .select("id,display_name")
      .eq("team_id", (e as Event).team_id)
      .in("parent_contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]);
    setPlayers((ps ?? []) as Player[]);
    const { data: rs } = await supabase.from("team_event_rsvps").select("team_player_id,response").eq("event_id", eventId);
    const map: Record<string, string> = {}; (rs ?? []).forEach((r: any) => { map[r.team_player_id] = r.response; });
    setResponses(map);
  }
  useEffect(() => { load(); }, [eventId]);

  async function respond(pid: string, r: "yes" | "no" | "maybe") {
    setResponses({ ...responses, [pid]: r });
    try { await rsvp({ data: { eventId, teamPlayerId: pid, response: r } }); }
    catch (e: any) { alert(e?.message); }
  }

  if (!event) return <div className="p-5 text-xs text-muted-foreground">Loading…</div>;

  return (
    <div className="px-5 pt-4 pb-10">
      <Link to="/parent/team/$teamId" params={{ teamId: event.team_id }} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back</Link>
      <div className="mt-2 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{event.event_type.toUpperCase().replace("_", " ")}</p>
        <h2 className="mt-1 font-display text-xl font-bold">
          {event.event_type === "game" ? `vs ${event.opponent_name || "TBD"}` : (event.title || "Event")}
        </h2>
        <p className="text-xs text-muted-foreground">{event.event_date}{event.start_time ? ` · ${event.start_time}` : ""}{event.venue ? ` · ${event.venue}` : ""}</p>
      </div>
      <h3 className="mt-4 text-xs font-bold">RSVP</h3>
      <div className="mt-2 space-y-2">
        {players.length === 0 && <p className="text-xs text-muted-foreground">No rostered athletes linked to your account for this team.</p>}
        {players.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-surface p-3">
            <p className="text-sm font-semibold">{p.display_name}</p>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {([["yes", "Yes", Check], ["maybe", "Maybe", HelpCircle], ["no", "No", X]] as const).map(([k, label, Icon]) => (
                <button key={k} onClick={() => respond(p.id, k)}
                  className={"inline-flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold " + (responses[p.id] === k ? "bg-teal text-background" : "bg-surface-2 text-muted-foreground")}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(event.event_type === "game" || event.event_type === "practice") && (
        <>
          <h3 className="mt-5 text-xs font-bold">Media</h3>
          <div className="mt-2">
            <GameMediaTab
              teamId={event.team_id}
              eventId={eventId}
              isCoach={false}
              currentUserId={user?.id ?? null}
              currentPlayerId={players[0]?.id ?? null}
            />
          </div>
        </>
      )}
    </div>
  );
}