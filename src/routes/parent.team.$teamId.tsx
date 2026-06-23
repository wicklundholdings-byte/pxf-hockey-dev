import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { TeamEventRow } from "@/components/teams/team-event-row";

export const Route = createFileRoute("/parent/team/$teamId")({
  component: ParentTeam,
});

type Event = { id: string; event_type: string; title: string | null; opponent_name: string | null; venue: string | null; event_date: string; start_time: string | null };
type Team = { id: string; name: string; season: string | null };

function ParentTeam() {
  const { teamId } = Route.useParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    (async () => {
      const [t, e] = await Promise.all([
        supabase.from("teams").select("id,name,season").eq("id", teamId).maybeSingle(),
        supabase.from("team_events").select("id,event_type,title,opponent_name,venue,event_date,start_time").eq("team_id", teamId).gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date"),
      ]);
      setTeam((t.data as Team) ?? null);
      setEvents((e.data ?? []) as Event[]);
    })();
  }, [teamId]);

  return (
    <div className="px-5 pt-4 pb-28">
      <Link to="/parent" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Home</Link>
      <h1 className="mt-2 font-display text-2xl font-bold">{team?.name || "Team"}</h1>
      <p className="text-xs text-muted-foreground">{team?.season}</p>
      <h3 className="mt-5 text-xs font-bold">Upcoming</h3>
      <div className="mt-2 space-y-2">
        {events.length === 0 && <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">No upcoming events.</p>}
        {events.map((e) => (
          <Link key={e.id} to="/parent/team/event/$eventId" params={{ eventId: e.id }}>
            <TeamEventRow event={e} />
          </Link>
        ))}
      </div>
    </div>
  );
}