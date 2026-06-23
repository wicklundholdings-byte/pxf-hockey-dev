import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveGameLineup } from "@/lib/teams.functions";
import { ArrowLeft, Printer, Share2, Users2, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/$eventId/game-summary")({
  component: GameSummary,
});

type Player = { id: string; display_name: string; jersey_number: string | null };
type EventRow = { id: string; event_type: string; title: string | null; opponent_name: string | null; home_away: string | null; venue: string | null; event_date: string; start_time: string | null; team_id: string };
type TeamRow = { id: string; name: string };
type Matchup = { ourPlayer: string; theirPlayer: string; notes: string };

const FWD_LINES = ["L1", "L2", "L3", "L4"] as const;
const FWD_POS = ["LW", "C", "RW"] as const;
const D_PAIRS = ["D1", "D2", "D3"] as const;
const D_POS = ["LD", "RD"] as const;

function GameSummary() {
  const { teamId, eventId } = Route.useParams();
  const saveLineup = useServerFn(saveGameLineup);

  const [team, setTeam] = useState<TeamRow | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [notes, setNotes] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, e, p, l, gp, n] = await Promise.all([
        supabase.from("teams").select("id,name").eq("id", teamId).maybeSingle(),
        supabase.from("team_events").select("*").eq("id", eventId).maybeSingle(),
        supabase.from("team_players").select("id,display_name,jersey_number").eq("team_id", teamId).order("display_name"),
        supabase.from("game_lineups").select("*").eq("event_id", eventId).maybeSingle(),
        supabase.from("game_plans").select("*").eq("event_id", eventId).maybeSingle(),
        supabase.from("coach_game_notes").select("*").eq("event_id", eventId).maybeSingle(),
      ]);
      setTeam((t.data as TeamRow) ?? null);
      setEvent((e.data as EventRow) ?? null);
      setPlayers((p.data ?? []) as Player[]);
      setLineup(l.data ?? null);
      setPlan(gp.data ?? null);
      setNotes(n.data ?? null);
    })();
  }, [teamId, eventId]);

  const pmap = useMemo(() => {
    const m: Record<string, Player> = {};
    players.forEach((p) => { m[p.id] = p; });
    return m;
  }, [players]);

  function pname(pid: string | null | undefined) {
    if (!pid) return "—";
    const p = pmap[pid];
    if (!p) return "—";
    return (p.jersey_number ? `#${p.jersey_number} ` : "") + p.display_name;
  }

  const positions = (lineup?.positions ?? {}) as Record<string, string | null>;
  const ppUnits = (lineup?.pp_units ?? { PP1: [], PP2: [] }) as Record<string, (string | null)[]>;
  const pkUnits = (lineup?.pk_units ?? { PK1: [], PK2: [] }) as Record<string, (string | null)[]>;
  const scratches = (lineup?.scratches ?? []) as string[];
  const matchups = (plan?.matchups ?? []) as Matchup[];
  const periodNotes = (notes?.period_notes ?? {}) as { p1?: string; p2?: string; p3?: string };

  function buildText(): string {
    const lines: string[] = [];
    lines.push(`${team?.name ?? "Team"} ${event?.home_away === "away" ? "@" : "vs"} ${event?.opponent_name ?? "Opponent"}`);
    lines.push(`${event?.event_date ?? ""}${event?.start_time ? " · " + event.start_time : ""}${event?.venue ? " · " + event.venue : ""}`);
    lines.push("");
    lines.push("FORWARD LINES");
    FWD_LINES.forEach((ln) => {
      lines.push(`${ln}: ${FWD_POS.map((pos) => pname(positions[`${ln}-${pos}`])).join(" — ")}`);
    });
    lines.push("\nDEFENSE PAIRS");
    D_PAIRS.forEach((pr) => {
      lines.push(`${pr}: ${D_POS.map((pos) => pname(positions[`${pr}-${pos}`])).join(" — ")}`);
    });
    lines.push(`\nGoalies: Starter ${pname(positions["G-Start"])} · Backup ${pname(positions["G-Backup"])}`);
    if (scratches.length) lines.push(`Scratches: ${scratches.map(pname).join(", ")}`);
    lines.push("\nPOWER PLAY");
    ["PP1", "PP2"].forEach((u) => lines.push(`${u}: ${(ppUnits[u] ?? []).map(pname).join(" — ")}`));
    lines.push("\nPENALTY KILL");
    ["PK1", "PK2"].forEach((u) => lines.push(`${u}: ${(pkUnits[u] ?? []).map(pname).join(" — ")}`));
    if (plan?.opponent_notes) lines.push(`\nOPPONENT NOTES\n${plan.opponent_notes}`);
    if (plan?.our_gameplan) lines.push(`\nOUR GAME PLAN\n${plan.our_gameplan}`);
    if (matchups.length) {
      lines.push("\nKEY MATCHUPS");
      matchups.forEach((m) => lines.push(`- ${pname(m.ourPlayer)} vs ${m.theirPlayer}${m.notes ? " — " + m.notes : ""}`));
    }
    if (notes?.pep_talk) lines.push(`\nPEP TALK\n${notes.pep_talk}`);
    (["p1", "p2", "p3"] as const).forEach((k, i) => {
      if (periodNotes[k]) lines.push(`\nPERIOD ${i + 1}\n${periodNotes[k]}`);
    });
    if (notes?.post_game_notes) lines.push(`\nPOST-GAME\n${notes.post_game_notes}`);
    return lines.join("\n");
  }

  async function shareStaff() {
    const text = buildText();
    try {
      if (navigator.share) await navigator.share({ title: "Game Summary", text });
      else { await navigator.clipboard.writeText(text); alert("Summary copied — paste in coach chat"); }
    } catch { /* user cancelled */ }
  }

  async function shareLines() {
    if (!lineup) { alert("No lineup saved yet"); return; }
    setBusy(true);
    try {
      await saveLineup({ data: {
        teamId, eventId,
        positions: lineup.positions ?? {},
        ppUnits: lineup.pp_units ?? {},
        pkUnits: lineup.pk_units ?? {},
        scratches: lineup.scratches ?? [],
        templateName: lineup.template_name ?? null,
        isShared: true,
      } });
      setLineup({ ...lineup, is_shared: true });
      alert("Lines shared with players & parents");
    } catch (e: any) { alert(e?.message); } finally { setBusy(false); }
  }

  if (!event) return <p className="text-xs text-muted-foreground">Loading…</p>;

  return (
    <div className="print:bg-white print:text-black">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/coach/teams/$teamId/schedule/$eventId/game-prep" params={{ teamId, eventId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft size={14} /> Back to Game Prep
        </Link>
      </div>

      <div className="mt-2 rounded-2xl border border-border bg-surface p-4 print:border-black">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">GAME SUMMARY · {event.home_away === "away" ? "AWAY" : "HOME"}</p>
        <h3 className="mt-1 font-display text-xl font-bold">{team?.name ?? "Team"} {event.home_away === "away" ? "@" : "vs"} {event.opponent_name ?? "Opponent"}</h3>
        <p className="text-xs text-muted-foreground">{event.event_date}{event.start_time ? ` · ${event.start_time}` : ""}{event.venue ? ` · ${event.venue}` : ""}</p>
      </div>

      <SummarySection title="Forward Lines">
        <div className="grid grid-cols-1 gap-2">
          {FWD_LINES.map((ln) => (
            <LineCard key={ln} label={ln} slots={FWD_POS.map((pos) => ({ pos, name: pname(positions[`${ln}-${pos}`]) }))} />
          ))}
        </div>
      </SummarySection>

      <SummarySection title="Defense Pairs">
        <div className="grid grid-cols-1 gap-2">
          {D_PAIRS.map((pr) => (
            <LineCard key={pr} label={pr} slots={D_POS.map((pos) => ({ pos, name: pname(positions[`${pr}-${pos}`]) }))} />
          ))}
        </div>
      </SummarySection>

      <SummarySection title="Goalies">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="STARTER" value={pname(positions["G-Start"])} />
          <StatCard label="BACKUP" value={pname(positions["G-Backup"])} />
        </div>
      </SummarySection>

      <SummarySection title="Power Play">
        {(["PP1", "PP2"] as const).map((u) => (
          <UnitRow key={u} label={u} names={(ppUnits[u] ?? []).map(pname)} />
        ))}
      </SummarySection>

      <SummarySection title="Penalty Kill">
        {(["PK1", "PK2"] as const).map((u) => (
          <UnitRow key={u} label={u} names={(pkUnits[u] ?? []).map(pname)} />
        ))}
      </SummarySection>

      {scratches.length > 0 && (
        <SummarySection title="Healthy Scratches">
          <div className="flex flex-wrap gap-1.5">
            {scratches.map((id) => (
              <span key={id} className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300 print:border-black print:bg-transparent print:text-black">{pname(id)}</span>
            ))}
          </div>
        </SummarySection>
      )}

      {(plan?.opponent_notes || plan?.our_gameplan || matchups.length > 0) && (
        <SummarySection title="Game Plan">
          {plan?.opponent_notes && <TextBlock label="Opponent notes" body={plan.opponent_notes} />}
          {plan?.our_gameplan && <TextBlock label="Our game plan" body={plan.our_gameplan} />}
          {matchups.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground">KEY MATCHUPS</p>
              <div className="space-y-1.5">
                {matchups.map((m, i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface p-2 text-xs print:border-black">
                    <p className="font-semibold">{pname(m.ourPlayer)} <span className="text-muted-foreground">vs</span> {m.theirPlayer || "—"}</p>
                    {m.notes && <p className="mt-0.5 text-[11px] text-muted-foreground">{m.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SummarySection>
      )}

      {(notes?.pep_talk || periodNotes.p1 || periodNotes.p2 || periodNotes.p3 || notes?.post_game_notes) && (
        <SummarySection title="Coach's Notes">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300 print:bg-transparent print:text-black">
            <Lock size={10} /> Private — coaching staff only
          </div>
          {notes?.pep_talk && <TextBlock label="Pep talk" body={notes.pep_talk} />}
          {(["p1", "p2", "p3"] as const).map((k, i) => periodNotes[k] ? <TextBlock key={k} label={`Period ${i + 1}`} body={periodNotes[k]!} /> : null)}
          {notes?.post_game_notes && <TextBlock label="Post-game" body={notes.post_game_notes} />}
        </SummarySection>
      )}

      <div className="mt-6 grid grid-cols-1 gap-2 print:hidden">
        <button onClick={shareStaff} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground">
          <Share2 size={14} /> Share with coaching staff
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface py-2.5 text-sm font-bold">
          <Printer size={14} /> Print / Export as PDF
        </button>
        <button onClick={shareLines} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full border border-teal/50 bg-teal/10 py-2.5 text-sm font-bold text-teal disabled:opacity-50">
          <Users2 size={14} /> {lineup?.is_shared ? "Lines shared with team ✓" : "Share Lines with Team"}
        </button>
      </div>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-[11px] font-bold tracking-wider text-muted-foreground">{title.toUpperCase()}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function LineCard({ label, slots }: { label: string; slots: { pos: string; name: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5 print:border-black">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs font-semibold">
        {slots.map((s, i) => (
          <div key={s.pos} className="flex-1 text-center">
            <p className="text-[9px] font-bold tracking-wider text-muted-foreground">{s.pos}</p>
            <p className="mt-0.5 truncate">{s.name}</p>
            {i < slots.length - 1 && <span className="sr-only">—</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5 print:border-black">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-semibold truncate">{value}</p>
    </div>
  );
}

function UnitRow({ label, names }: { label: string; names: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2 print:border-black">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs">{names.length ? names.map((n, i) => <span key={i}>{i > 0 ? " — " : ""}{n}</span>) : <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function TextBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</p>
      <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface p-2 text-xs print:border-black">{body}</p>
    </div>
  );
}