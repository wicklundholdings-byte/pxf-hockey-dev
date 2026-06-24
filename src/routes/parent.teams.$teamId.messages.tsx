import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId/messages")({
  component: ParentTeamMessages,
});

type Broadcast = { id: string; title: string; body: string; sent_at: string | null; created_at: string };
type TeamCoach = { coach_id: string | null; coach_name: string | null };

function ParentTeamMessages() {
  const { teamId } = Route.useParams();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [coach, setCoach] = useState<TeamCoach>({ coach_id: null, coach_name: null });

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("teams").select("coach_id").eq("id", teamId).maybeSingle();
      const coachId = (t as { coach_id: string } | null)?.coach_id ?? null;
      let coachName: string | null = null;
      if (coachId) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", coachId).maybeSingle();
        coachName = (p as { full_name: string | null } | null)?.full_name ?? null;
      }
      setCoach({ coach_id: coachId, coach_name: coachName });

      if (coachId) {
        const { data: bs } = await supabase
          .from("broadcasts")
          .select("id,title,body,sent_at,created_at")
          .eq("owner_id", coachId)
          .eq("audience_type", "team")
          .eq("audience_id", teamId)
          .order("created_at", { ascending: false })
          .limit(50);
        setBroadcasts((bs ?? []) as Broadcast[]);
      }
    })();
  }, [teamId]);

  return (
    <div className="px-5 pb-6">
      <Link
        to="/parent/inbox"
        className="flex items-center gap-3 rounded-2xl border border-teal/40 bg-teal/10 p-3"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/20 text-teal">
          <MessageSquare size={16} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Message {coach.coach_name ? `Coach ${coach.coach_name}` : "the coach"}</p>
          <p className="text-[11px] text-muted-foreground">Direct message — private thread</p>
        </div>
      </Link>

      <h3 className="mt-5 text-sm font-bold flex items-center gap-1">
        <Megaphone size={14} className="text-muted-foreground" /> Team broadcasts
      </h3>
      <div className="mt-2 space-y-2">
        {broadcasts.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
            No broadcasts yet.
          </p>
        )}
        {broadcasts.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-surface p-3">
            <p className="text-sm font-semibold">{b.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-foreground/80">{b.body}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {new Date(b.sent_at || b.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}