import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/rsvp/team/$token")({
  component: TokenRsvp,
});

function TokenRsvp() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<any>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any).rpc("get_team_rsvp_by_token", { _token: token }).then(({ data, error }: any) => {
      if (error) setErr(error.message); else { setInfo(data); setResponse(data?.response ?? null); }
    });
  }, [token]);

  async function send(r: "yes" | "no" | "maybe") {
    setResponse(r);
    const { error } = await (supabase as any).rpc("respond_to_team_rsvp", { _token: token, _response: r });
    if (error) setErr(error.message);
  }

  if (err) return <div className="mx-auto max-w-md p-6 text-center text-sm text-red-400">{err}</div>;
  if (!info) return <div className="mx-auto max-w-md p-6 text-center text-xs text-muted-foreground">Loading…</div>;

  const e = info.event;
  return (
    <div className="mx-auto max-w-md p-6">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{String(e.event_type).toUpperCase().replace("_", " ")}</p>
      <h1 className="mt-1 font-display text-2xl font-bold">
        {e.event_type === "game" ? `vs ${e.opponent_name || "TBD"}` : (e.title || "Event")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{info.team_name} · {info.player_name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{e.event_date}{e.start_time ? ` · ${e.start_time}` : ""}{e.venue ? ` · ${e.venue}` : ""}</p>
      <div className="mt-6 grid grid-cols-3 gap-2">
        {([["yes", "Yes", Check], ["maybe", "Maybe", HelpCircle], ["no", "No", X]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => send(k)}
            className={"inline-flex flex-col items-center justify-center gap-1 rounded-xl py-4 text-sm font-bold " + (response === k ? "bg-teal text-background" : "bg-surface-2 text-muted-foreground")}>
            <Icon size={20} /> {label}
          </button>
        ))}
      </div>
      {response && <p className="mt-3 text-center text-xs text-emerald-400">Response recorded — you can change it anytime.</p>}
    </div>
  );
}