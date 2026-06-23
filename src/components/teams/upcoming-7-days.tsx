import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamEventRow } from "./team-event-row";

type Row = {
  id: string;
  kind: "camp" | "team";
  event_type: string;
  title: string | null;
  opponent_name: string | null;
  venue: string | null;
  event_date: string;
  start_time: string | null;
  team_name?: string | null;
  link_to: string;
  link_params?: Record<string, string>;
};

export function UpcomingSevenDays() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const [te, camps] = await Promise.all([
        supabase.from("team_events").select("id,event_type,title,opponent_name,venue,event_date,start_time, teams(name)").gte("event_date", today).lte("event_date", in7).order("event_date"),
        supabase.from("camps").select("id,name,slug,start_date").gte("start_date", today).lte("start_date", in7).order("start_date"),
      ]);
      const out: Row[] = [];
      ((te.data ?? []) as any[]).forEach((r) => out.push({
        id: r.id, kind: "team", event_type: r.event_type, title: r.title, opponent_name: r.opponent_name,
        venue: r.venue, event_date: r.event_date, start_time: r.start_time, team_name: r.teams?.name ?? null,
        link_to: "/coach/teams/$teamId/schedule/$eventId", link_params: { teamId: "_", eventId: r.id },
      }));
      ((camps.data ?? []) as any[]).forEach((c) => out.push({
        id: c.id, kind: "camp", event_type: "camp", title: c.name, opponent_name: null,
        venue: null, event_date: c.start_date, start_time: null,
        link_to: "/coach/camps/$campId", link_params: { campId: c.id },
      }));
      out.sort((a, b) => a.event_date.localeCompare(b.event_date));
      setRows(out);
    })();
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-bold tracking-[0.3em] text-muted-foreground">NEXT 7 DAYS</p>
      <div className="mt-3 space-y-2">
        {rows.map((r) => {
          if (r.kind === "team") {
            return (
              <Link key={`t-${r.id}`} to="/coach/teams" className="block">
                <TeamEventRow event={{ ...r, team_name: r.team_name }} />
              </Link>
            );
          }
          return (
            <Link key={`c-${r.id}`} to="/coach/camps/$campId" params={{ campId: r.id }} className="block">
              <TeamEventRow event={{ event_type: "camp", title: r.title, event_date: r.event_date }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}