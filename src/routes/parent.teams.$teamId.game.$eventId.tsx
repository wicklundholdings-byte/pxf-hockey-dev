import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitRsvp } from "@/lib/teams.functions";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, MapPin, Check, X, HelpCircle, ClipboardList, Megaphone, Target, Layers, Sparkles, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId/game/$eventId")({
  component: GameDay,
});

type Event = { id: string; team_id: string; event_type: string; title: string | null; opponent_name: string | null; home_away: string | null; venue: string | null; event_date: string; start_time: string | null; notes: string | null };
type Player = { id: string; display_name: string };
type TeamRow = { id: string; name: string };
type Lineup = { positions: Record<string, string | null>; pp_units: Record<string, (string | null)[]>; pk_units: Record<string, (string | null)[]>; is_shared: boolean };
type Publish = { share_lineup: boolean; share_gameplan: boolean; share_systems: boolean; share_message: boolean; public_gameplan_text: string | null; public_systems_text: string | null; coach_message: string | null; published_at: string | null };
type Duty = { id: string; duty_type: string; notes: string | null };
type Media = { id: string; media_type: string; url: string; thumbnail_url: string | null; caption: string | null; label: string | null };

const FWD_LINES = ["L1", "L2", "L3", "L4"] as const;
const FWD_POS = ["LW", "C", "RW"] as const;
const D_PAIRS = ["D1", "D2", "D3"] as const;
const D_POS = ["LD", "RD"] as const;

function fmtDate(d: string) {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }); } catch { return d; }
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10); const ap = hr >= 12 ? "PM" : "AM"; const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${m} ${ap}`;
}
function mapsUrl(venue: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

function GameDay() {
  const { teamId, eventId } = Route.useParams();
  const rsvp = useServerFn(submitRsvp);
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allRoster, setAllRoster] = useState<Record<string, { name: string; jersey: string | null }>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [publish, setPublish] = useState<Publish | null>(null);
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [media, setMedia] = useState<Media[]>([]);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("team_events").select("*").eq("id", eventId).maybeSingle();
      if (!e) return;
      setEvent(e as Event);
      const { data: t } = await supabase.from("teams").select("id,name").eq("id", teamId).maybeSingle();
      setTeam((t as TeamRow) ?? null);

      const ids = await (supabase as any).rpc("current_user_contact_ids");
      const contactIds = (ids.data ?? []) as string[];
      const { data: ps } = await supabase
        .from("team_players").select("id,display_name").eq("team_id", teamId)
        .in("parent_contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]);
      const myPlayers = (ps ?? []) as Player[];
      setPlayers(myPlayers);

      const { data: roster } = await supabase.from("team_players").select("id,display_name,jersey_number").eq("team_id", teamId);
      const rmap: Record<string, { name: string; jersey: string | null }> = {};
      ((roster ?? []) as any[]).forEach((r) => { rmap[r.id] = { name: r.display_name, jersey: r.jersey_number }; });
      setAllRoster(rmap);

      const { data: rs } = await supabase.from("team_event_rsvps").select("team_player_id,response").eq("event_id", eventId);
      const map: Record<string, string> = {};
      ((rs ?? []) as any[]).forEach((r) => { map[r.team_player_id] = r.response; });
      setResponses(map);

      const { data: pub } = await supabase.from("game_parent_publish").select("*").eq("event_id", eventId).maybeSingle();
      setPublish((pub as Publish) ?? null);

      if (pub && (pub as Publish).share_lineup) {
        const { data: ln } = await supabase.from("game_lineups").select("positions,pp_units,pk_units,is_shared").eq("event_id", eventId).maybeSingle();
        setLineup((ln as Lineup) ?? null);
      }

      if (user?.id) {
        const { data: dt } = await supabase.from("team_duties").select("id,duty_type,notes")
          .eq("event_id", eventId).eq("assigned_to_parent_id", user.id);
        setDuties((dt ?? []) as Duty[]);
      }

      const { data: med } = await supabase.from("game_media").select("id,media_type,url,thumbnail_url,caption,label").eq("event_id", eventId).order("created_at", { ascending: false });
      setMedia((med ?? []) as Media[]);
    })();
  }, [teamId, eventId, user?.id]);

  async function respond(pid: string, r: "yes" | "no" | "maybe") {
    setResponses({ ...responses, [pid]: r });
    try { await rsvp({ data: { eventId, teamPlayerId: pid, response: r } }); }
    catch (e: any) { alert(e?.message); }
  }

  if (!event) return <div className="p-5 text-xs text-muted-foreground">Loading…</div>;

  const myPlayerIds = new Set(players.map((p) => p.id));
  const isPast = new Date(event.event_date) < new Date(new Date().toDateString());

  // Compute "your child plays on..." callout
  const myLineCallouts: { player: string; slot: string }[] = [];
  if (lineup?.positions) {
    for (const [slot, pid] of Object.entries(lineup.positions)) {
      if (pid && myPlayerIds.has(pid)) {
        const me = players.find((p) => p.id === pid);
        myLineCallouts.push({ player: me?.display_name ?? "Your athlete", slot });
      }
    }
  }

  return (
    <div className="px-5 pt-4 pb-10">
      <Link to="/parent/teams/$teamId/schedule" params={{ teamId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back to schedule
      </Link>

      {/* Duty reminder */}
      {duties.map((d) => (
        <div key={d.id} className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
          <ClipboardList size={16} className="mt-0.5 text-amber-400" />
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-300">You're on duty: <span className="capitalize">{d.duty_type}</span></p>
            {d.notes && <p className="text-[11px] text-amber-200/80">{d.notes}</p>}
            <p className="mt-1 text-[10px] text-amber-200/60">Plan to arrive 30 minutes early.</p>
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="mt-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground">GAME DAY</p>
          {event.home_away && (
            <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold " + (event.home_away === "home" ? "bg-teal/15 text-teal" : "bg-amber-500/15 text-amber-300")}>
              {event.home_away.toUpperCase()}
            </span>
          )}
        </div>
        <h2 className="mt-1 font-display text-xl font-bold leading-tight">
          {team?.name ?? "Team"} <span className="text-muted-foreground">vs</span> {event.opponent_name || "TBD"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {fmtDate(event.event_date)}{event.start_time ? ` · ${fmtTime(event.start_time)}` : ""}
        </p>
        {event.venue && (
          <div className="mt-3 flex items-center gap-2">
            <MapPin size={12} className="text-muted-foreground" />
            <p className="flex-1 text-[11px] text-muted-foreground">{event.venue}</p>
            <button onClick={() => window.open(mapsUrl(event.venue!), "_blank")} className="rounded-full bg-teal/10 px-3 py-1 text-[10px] font-bold text-teal">
              Directions
            </button>
          </div>
        )}
      </div>

      {/* RSVP */}
      {players.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[11px] font-bold tracking-wider text-muted-foreground">YOUR RSVP</h3>
          <div className="mt-2 space-y-2">
            {players.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-surface p-2.5">
                <p className="text-xs font-semibold">{p.display_name}</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1">
                  {([["yes", "Going", Check], ["maybe", "Maybe", HelpCircle], ["no", "Can't", X]] as const).map(([k, label, Ic]) => (
                    <button key={k} onClick={() => respond(p.id, k)}
                      className={"inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold " + (responses[p.id] === k ? "bg-teal text-background" : "bg-surface-2 text-muted-foreground")}>
                      <Ic size={11} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach Message */}
      {publish?.share_message && publish.coach_message && (
        <Card icon={<Megaphone size={14} />} title="Message from Coach" accent="teal">
          <p className="whitespace-pre-wrap text-xs leading-relaxed">{publish.coach_message}</p>
        </Card>
      )}

      {/* Lineup */}
      {publish?.share_lineup && lineup && (
        <Card icon={<Layers size={14} />} title="Tonight's Lineup">
          {myLineCallouts.map((c, i) => (
            <div key={i} className="mb-3 rounded-xl border border-teal/30 bg-teal/10 p-2.5">
              <p className="text-[11px] font-bold text-teal">{c.player} plays on {formatSlot(c.slot)}</p>
            </div>
          ))}
          <LineupGrid lineup={lineup} roster={allRoster} myIds={myPlayerIds} />
        </Card>
      )}

      {/* Game Plan */}
      {publish?.share_gameplan && publish.public_gameplan_text && (
        <Card icon={<Target size={14} />} title="Game Plan">
          <p className="whitespace-pre-wrap text-xs leading-relaxed">{publish.public_gameplan_text}</p>
        </Card>
      )}

      {/* Team Systems */}
      {publish?.share_systems && publish.public_systems_text && (
        <Card icon={<Sparkles size={14} />} title="Team Systems Tonight">
          <p className="whitespace-pre-wrap text-xs leading-relaxed">{publish.public_systems_text}</p>
        </Card>
      )}

      {/* Media (post-game) */}
      {media.length > 0 && (
        <Card icon={<ImageIcon size={14} />} title={isPast ? "Game Highlights" : "Media"}>
          <div className="grid grid-cols-2 gap-2">
            {media.map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-border bg-background">
                {m.thumbnail_url ? (
                  <img src={m.thumbnail_url} alt={m.caption ?? ""} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="aspect-video w-full bg-surface-2 grid place-items-center text-[10px] text-muted-foreground">{m.media_type.toUpperCase()}</div>
                )}
                {m.caption && <p className="px-1.5 py-1 text-[10px] text-muted-foreground line-clamp-2">{m.caption}</p>}
              </a>
            ))}
          </div>
        </Card>
      )}

      {!publish?.published_at && (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-surface p-4 text-center">
          <p className="text-[11px] text-muted-foreground">Game Day info isn't published yet. Your coach will share lineup, game plan, and a pre-game message once ready.</p>
        </div>
      )}
    </div>
  );
}

function Card({ icon, title, children, accent }: { icon: React.ReactNode; title: string; children: React.ReactNode; accent?: "teal" }) {
  const border = accent === "teal" ? "border-teal/30" : "border-border";
  return (
    <div className={"mt-4 rounded-2xl border bg-surface p-4 " + border}>
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-teal/15 text-teal">{icon}</span>
        <h3 className="text-xs font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function formatSlot(slot: string) {
  if (slot.startsWith("G-")) return slot === "G-Start" ? "Starting Goalie" : "Backup Goalie";
  const [line, pos] = slot.split("-");
  const posLabel: Record<string, string> = { LW: "Left Wing", C: "Center", RW: "Right Wing", LD: "Left Defense", RD: "Right Defense" };
  const lineLabel = line.startsWith("L") ? `Line ${line.slice(1)}` : line.startsWith("D") ? `Pair ${line.slice(1)}` : line;
  return `${lineLabel} — ${posLabel[pos] ?? pos}`;
}

function LineupGrid({ lineup, roster, myIds }: { lineup: Lineup; roster: Record<string, { name: string; jersey: string | null }>; myIds: Set<string> }) {
  function nameOf(pid: string | null) {
    if (!pid) return "—";
    const r = roster[pid]; if (!r) return "—";
    return (r.jersey ? `#${r.jersey} ` : "") + r.name;
  }
  function Cell({ pid, label }: { pid: string | null; label: string }) {
    const mine = pid && myIds.has(pid);
    return (
      <div className={"rounded-lg p-1.5 " + (mine ? "bg-teal/20 ring-1 ring-teal" : "bg-background")}>
        <p className="text-[9px] font-bold tracking-wider text-muted-foreground">{label}</p>
        <p className={"text-[11px] " + (mine ? "font-bold text-teal" : "text-foreground")}>{nameOf(pid)}</p>
      </div>
    );
  }
  const hasEven = Object.values(lineup.positions ?? {}).some(Boolean);
  const hasPP = Object.values(lineup.pp_units ?? {}).some((u) => (u ?? []).some(Boolean));
  const hasPK = Object.values(lineup.pk_units ?? {}).some((u) => (u ?? []).some(Boolean));
  return (
    <div className="space-y-3">
      {hasEven && (
        <>
          <Section label="Forward Lines">
            <div className="space-y-1.5">
              {FWD_LINES.map((line) => {
                const slots = FWD_POS.map((pos) => `${line}-${pos}`);
                if (!slots.some((s) => lineup.positions[s])) return null;
                return (
                  <div key={line}>
                    <p className="mb-1 text-[9px] font-bold tracking-wider text-muted-foreground">{line}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {FWD_POS.map((pos) => <Cell key={pos} label={pos} pid={lineup.positions[`${line}-${pos}`] ?? null} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
          <Section label="Defense Pairs">
            <div className="space-y-1.5">
              {D_PAIRS.map((pair) => {
                const slots = D_POS.map((pos) => `${pair}-${pos}`);
                if (!slots.some((s) => lineup.positions[s])) return null;
                return (
                  <div key={pair}>
                    <p className="mb-1 text-[9px] font-bold tracking-wider text-muted-foreground">{pair}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {D_POS.map((pos) => <Cell key={pos} label={pos} pid={lineup.positions[`${pair}-${pos}`] ?? null} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
          {lineup.positions["G-Start"] && (
            <Section label="Goalie">
              <Cell label="STARTER" pid={lineup.positions["G-Start"] ?? null} />
            </Section>
          )}
        </>
      )}
      {hasPP && (
        <Section label="Power Play">
          {Object.entries(lineup.pp_units).map(([unit, arr]) =>
            (arr ?? []).some(Boolean) ? (
              <div key={unit} className="mb-1.5">
                <p className="mb-1 text-[9px] font-bold tracking-wider text-muted-foreground">{unit}</p>
                <div className="grid grid-cols-5 gap-1">
                  {(arr ?? []).map((pid, i) => <Cell key={i} label={`#${i+1}`} pid={pid} />)}
                </div>
              </div>
            ) : null
          )}
        </Section>
      )}
      {hasPK && (
        <Section label="Penalty Kill">
          {Object.entries(lineup.pk_units).map(([unit, arr]) =>
            (arr ?? []).some(Boolean) ? (
              <div key={unit} className="mb-1.5">
                <p className="mb-1 text-[9px] font-bold tracking-wider text-muted-foreground">{unit}</p>
                <div className="grid grid-cols-4 gap-1">
                  {(arr ?? []).map((pid, i) => <Cell key={i} label={`#${i+1}`} pid={pid} />)}
                </div>
              </div>
            ) : null
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</p>
      {children}
    </div>
  );
}
