import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveGameLineup, saveGamePlan, saveCoachGameNotes } from "@/lib/teams.functions";
import { ArrowLeft, Share2, Plus, X, Lock, Users2, ClipboardList, NotebookPen, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/$eventId/game-prep")({
  component: GamePrep,
});

type Player = { id: string; display_name: string; jersey_number: string | null };
type Drill = { id: string; name: string };
type Matchup = { ourPlayer: string; theirPlayer: string; notes: string };

const FWD_LINES = ["L1", "L2", "L3", "L4"] as const;
const FWD_POS = ["LW", "C", "RW"] as const;
const D_PAIRS = ["D1", "D2", "D3"] as const;
const D_POS = ["LD", "RD"] as const;

function GamePrep() {
  const { teamId, eventId } = Route.useParams();
  const [tab, setTab] = useState<"lines" | "plan" | "notes">("lines");

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link to="/coach/teams/$teamId/schedule/$eventId" params={{ teamId, eventId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft size={14} /> Back
        </Link>
        <Link to="/coach/teams/$teamId/schedule/$eventId/game-summary" params={{ teamId, eventId }} className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-glow-teal">
          <FileText size={12} /> Summary
        </Link>
      </div>
      <h3 className="mt-2 font-display text-lg font-bold">Game Preparation</h3>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1 text-[11px] font-bold">
        <TabBtn active={tab === "lines"} onClick={() => setTab("lines")} icon={<Users2 size={12} />} label="Lines" />
        <TabBtn active={tab === "plan"} onClick={() => setTab("plan")} icon={<ClipboardList size={12} />} label="Plan" />
        <TabBtn active={tab === "notes"} onClick={() => setTab("notes")} icon={<NotebookPen size={12} />} label="Notes" />
      </div>

      <div className="mt-4">
        {tab === "lines" && <LinesTab teamId={teamId} eventId={eventId} />}
        {tab === "plan" && <GamePlanTab teamId={teamId} eventId={eventId} />}
        {tab === "notes" && <CoachNotesTab teamId={teamId} eventId={eventId} />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={"inline-flex items-center justify-center gap-1 rounded-full px-2 py-2 transition " + (active ? "bg-gradient-brand text-primary-foreground shadow-glow-teal" : "text-muted-foreground")}>
      {icon} {label}
    </button>
  );
}

/* ===================== LINES TAB ===================== */
function LinesTab({ teamId, eventId }: { teamId: string; eventId: string }) {
  const save = useServerFn(saveGameLineup);
  const [players, setPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<Record<string, string | null>>({});
  const [ppUnits, setPpUnits] = useState<Record<string, (string | null)[]>>({ PP1: [null, null, null, null, null], PP2: [null, null, null, null, null] });
  const [pkUnits, setPkUnits] = useState<Record<string, (string | null)[]>>({ PK1: [null, null, null, null], PK2: [null, null, null, null] });
  const [scratches, setScratches] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [unitTab, setUnitTab] = useState<"even" | "pp" | "pk">("even");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await supabase.from("team_players").select("id,display_name,jersey_number").eq("team_id", teamId).order("display_name");
      setPlayers((p.data ?? []) as Player[]);
      const l = await supabase.from("game_lineups").select("*").eq("event_id", eventId).maybeSingle();
      if (l.data) {
        setPositions((l.data.positions as any) ?? {});
        setPpUnits((l.data.pp_units as any) ?? { PP1: [null, null, null, null, null], PP2: [null, null, null, null, null] });
        setPkUnits((l.data.pk_units as any) ?? { PK1: [null, null, null, null], PK2: [null, null, null, null] });
        setScratches((l.data.scratches as any) ?? []);
        setTemplateName(l.data.template_name ?? "");
        setIsShared(!!l.data.is_shared);
      }
    })();
  }, [teamId, eventId]);

  const usedEven = useMemo(() => new Set(Object.values(positions).filter(Boolean) as string[]), [positions]);

  function setPos(slot: string, pid: string | null) {
    setPositions((prev) => ({ ...prev, [slot]: pid }));
  }
  function setPpSlot(unit: string, idx: number, pid: string | null) {
    setPpUnits((prev) => ({ ...prev, [unit]: prev[unit].map((v, i) => (i === idx ? pid : v)) }));
  }
  function setPkSlot(unit: string, idx: number, pid: string | null) {
    setPkUnits((prev) => ({ ...prev, [unit]: prev[unit].map((v, i) => (i === idx ? pid : v)) }));
  }
  function toggleScratch(pid: string) {
    setScratches((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  }

  async function persist() {
    setSaving(true);
    try {
      await save({ data: { teamId, eventId, positions, ppUnits, pkUnits, scratches, templateName: templateName || null, isShared } });
      alert("Lineup saved");
    } catch (e: any) { alert(e?.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1 text-[10px] font-bold">
        {(["even", "pp", "pk"] as const).map((k) => (
          <button key={k} onClick={() => setUnitTab(k)} className={"rounded-lg px-2 py-1.5 " + (unitTab === k ? "bg-teal text-background" : "text-muted-foreground")}>
            {k === "even" ? "Even Strength" : k === "pp" ? "Power Play" : "Penalty Kill"}
          </button>
        ))}
      </div>

      {unitTab === "even" && (
        <>
          <Section title="Forward Lines">
            {FWD_LINES.map((line) => (
              <div key={line} className="rounded-xl border border-border bg-surface p-2">
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{line}</p>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {FWD_POS.map((pos) => {
                    const slot = `${line}-${pos}`;
                    return <SlotSelect key={slot} label={pos} value={positions[slot] || null} onChange={(v) => setPos(slot, v)} players={players} disable={usedEven} />;
                  })}
                </div>
              </div>
            ))}
          </Section>
          <Section title="Defense Pairs">
            {D_PAIRS.map((pair) => (
              <div key={pair} className="rounded-xl border border-border bg-surface p-2">
                <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{pair}</p>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {D_POS.map((pos) => {
                    const slot = `${pair}-${pos}`;
                    return <SlotSelect key={slot} label={pos} value={positions[slot] || null} onChange={(v) => setPos(slot, v)} players={players} disable={usedEven} />;
                  })}
                </div>
              </div>
            ))}
          </Section>
          <Section title="Goalies">
            <div className="grid grid-cols-2 gap-1.5">
              <SlotSelect label="Starter" value={positions["G-Start"] || null} onChange={(v) => setPos("G-Start", v)} players={players} disable={usedEven} />
              <SlotSelect label="Backup" value={positions["G-Backup"] || null} onChange={(v) => setPos("G-Backup", v)} players={players} disable={usedEven} />
            </div>
          </Section>
          <Section title="Healthy Scratches">
            <div className="flex flex-wrap gap-1.5">
              {players.map((p) => {
                const on = scratches.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleScratch(p.id)} className={"rounded-full border px-2 py-1 text-[11px] " + (on ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-border bg-surface text-muted-foreground")}>
                    {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.display_name}
                  </button>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {unitTab === "pp" && (
        <>
          {(["PP1", "PP2"] as const).map((unit) => (
            <Section key={unit} title={`${unit} — 5 skaters`}>
              <div className="grid grid-cols-5 gap-1.5">
                {ppUnits[unit].map((pid, i) => (
                  <SlotSelect key={i} label={`#${i + 1}`} value={pid} onChange={(v) => setPpSlot(unit, i, v)} players={players} />
                ))}
              </div>
            </Section>
          ))}
        </>
      )}

      {unitTab === "pk" && (
        <>
          {(["PK1", "PK2"] as const).map((unit) => (
            <Section key={unit} title={`${unit} — 4 skaters`}>
              <div className="grid grid-cols-4 gap-1.5">
                {pkUnits[unit].map((pid, i) => (
                  <SlotSelect key={i} label={`#${i + 1}`} value={pid} onChange={(v) => setPkSlot(unit, i, v)} players={players} />
                ))}
              </div>
            </Section>
          ))}
        </>
      )}

      <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
        <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Save as template (e.g. Standard Lines)" className="w-full rounded-lg bg-background px-2 py-1.5 text-xs" />
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
          <Share2 size={12} /> Share lines + positions with players & parents
        </label>
      </div>

      <button onClick={persist} disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving…" : "Save Lineup"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-bold tracking-wider text-muted-foreground">{title.toUpperCase()}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SlotSelect({ label, value, onChange, players, disable }: { label: string; value: string | null; onChange: (v: string | null) => void; players: Player[]; disable?: Set<string> }) {
  return (
    <div className="rounded-lg bg-background p-1.5">
      <p className="text-[9px] font-bold tracking-wider text-muted-foreground">{label}</p>
      <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} className="mt-0.5 w-full bg-transparent text-[11px] outline-none">
        <option value="">—</option>
        {players.map((p) => (
          <option key={p.id} value={p.id} disabled={disable?.has(p.id) && value !== p.id}>
            {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.display_name}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ===================== GAME PLAN TAB ===================== */
function GamePlanTab({ teamId, eventId }: { teamId: string; eventId: string }) {
  const save = useServerFn(saveGamePlan);
  const [players, setPlayers] = useState<Player[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [opponentNotes, setOpponentNotes] = useState("");
  const [ourGameplan, setOurGameplan] = useState("");
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [drillIds, setDrillIds] = useState<string[]>([]);
  const [videoClips, setVideoClips] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [drillPicker, setDrillPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await supabase.from("team_players").select("id,display_name,jersey_number").eq("team_id", teamId).order("display_name");
      setPlayers((p.data ?? []) as Player[]);
      const d = await supabase.from("drills").select("id,title").order("title").limit(200);
      setDrills(((d.data ?? []) as Array<{ id: string; title: string }>).map((x) => ({ id: x.id, name: x.title })));
      const gp = await supabase.from("game_plans").select("*").eq("event_id", eventId).maybeSingle();
      if (gp.data) {
        setOpponentNotes(gp.data.opponent_notes ?? "");
        setOurGameplan(gp.data.our_gameplan ?? "");
        setMatchups(((gp.data.matchups as any) ?? []) as Matchup[]);
        setDrillIds(((gp.data.drill_ids as any) ?? []) as string[]);
        setVideoClips((((gp.data.video_clip_ids as any) ?? []) as string[]).join("\n"));
      }
    })();
  }, [teamId, eventId]);

  async function persist() {
    setSaving(true);
    try {
      await save({ data: {
        teamId, eventId, opponentNotes, ourGameplan, matchups,
        drillIds, videoClipIds: videoClips.split("\n").map((s) => s.trim()).filter(Boolean),
      } });
      alert("Game plan saved");
    } catch (e: any) { alert(e?.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Opponent notes">
        <textarea value={opponentNotes} onChange={(e) => setOpponentNotes(e.target.value)} rows={4} placeholder="Tendencies, key players to watch, their power play style…" className="w-full rounded-lg bg-background px-2 py-1.5 text-xs" />
      </Field>
      <Field label="Our game plan">
        <textarea value={ourGameplan} onChange={(e) => setOurGameplan(e.target.value)} rows={4} placeholder="What we want to do well tonight, systems focus…" className="w-full rounded-lg bg-background px-2 py-1.5 text-xs" />
      </Field>

      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold tracking-wider text-muted-foreground">KEY MATCHUPS</h4>
          <button onClick={() => setMatchups([...matchups, { ourPlayer: "", theirPlayer: "", notes: "" }])} className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[10px] font-bold">
            <Plus size={10} /> Add
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {matchups.map((m, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <select value={m.ourPlayer} onChange={(e) => setMatchups(matchups.map((x, j) => j === i ? { ...x, ourPlayer: e.target.value } : x))} className="flex-1 rounded-lg bg-background px-2 py-1.5 text-xs">
                  <option value="">Our player…</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.jersey_number ? `#${p.jersey_number} ` : ""}{p.display_name}</option>)}
                </select>
                <span className="text-[10px] font-bold text-muted-foreground">vs</span>
                <input value={m.theirPlayer} onChange={(e) => setMatchups(matchups.map((x, j) => j === i ? { ...x, theirPlayer: e.target.value } : x))} placeholder="Their player" className="flex-1 rounded-lg bg-background px-2 py-1.5 text-xs" />
                <button onClick={() => setMatchups(matchups.filter((_, j) => j !== i))} className="rounded-full bg-surface-2 p-1.5"><X size={12} /></button>
              </div>
              <input value={m.notes} onChange={(e) => setMatchups(matchups.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} placeholder="Notes" className="w-full rounded-lg bg-background px-2 py-1.5 text-[11px]" />
            </div>
          ))}
          {matchups.length === 0 && <p className="text-[11px] text-muted-foreground">No matchups yet.</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold tracking-wider text-muted-foreground">DRILLS TO REFERENCE</h4>
          <button onClick={() => setDrillPicker(!drillPicker)} className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[10px] font-bold">
            <Plus size={10} /> {drillPicker ? "Done" : "Add"}
          </button>
        </div>
        {drillPicker && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-surface p-2 space-y-1">
            {drills.map((d) => {
              const on = drillIds.includes(d.id);
              return (
                <label key={d.id} className="flex items-center gap-2 text-[11px]">
                  <input type="checkbox" checked={on} onChange={() => setDrillIds(on ? drillIds.filter((x) => x !== d.id) : [...drillIds, d.id])} />
                  {d.name}
                </label>
              );
            })}
            {drills.length === 0 && <p className="text-[11px] text-muted-foreground">No drills in your Playbook yet.</p>}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {drillIds.map((id) => {
            const d = drills.find((x) => x.id === id);
            return d ? <span key={id} className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">{d.name}</span> : null;
          })}
        </div>
      </div>

      <Field label="Video clip IDs (one per line)">
        <textarea value={videoClips} onChange={(e) => setVideoClips(e.target.value)} rows={2} placeholder="Optional — paste film library IDs" className="w-full rounded-lg bg-background px-2 py-1.5 text-[11px] font-mono" />
      </Field>

      <button onClick={persist} disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving…" : "Save Game Plan"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</p>
      {children}
    </div>
  );
}

/* ===================== COACH NOTES TAB ===================== */
function CoachNotesTab({ teamId, eventId }: { teamId: string; eventId: string }) {
  const save = useServerFn(saveCoachGameNotes);
  const [pepTalk, setPepTalk] = useState("");
  const [periodNotes, setPeriodNotes] = useState<{ p1: string; p2: string; p3: string }>({ p1: "", p2: "", p3: "" });
  const [postGameNotes, setPostGameNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const n = await supabase.from("coach_game_notes").select("*").eq("event_id", eventId).maybeSingle();
      if (n.data) {
        setPepTalk(n.data.pep_talk ?? "");
        const pn = (n.data.period_notes as any) ?? {};
        setPeriodNotes({ p1: pn.p1 ?? "", p2: pn.p2 ?? "", p3: pn.p3 ?? "" });
        setPostGameNotes(n.data.post_game_notes ?? "");
      }
    })();
  }, [eventId]);

  async function persist() {
    setSaving(true);
    try {
      await save({ data: { teamId, eventId, pepTalk, periodNotes, postGameNotes } });
      alert("Notes saved");
    } catch (e: any) { alert(e?.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">
        <Lock size={10} /> Private — coaching staff only
      </div>

      <Field label="Pre-game pep talk">
        <textarea value={pepTalk} onChange={(e) => setPepTalk(e.target.value)} rows={5} placeholder="Speech, bullet points, themes…" className="w-full rounded-lg bg-background px-2 py-1.5 text-xs" />
      </Field>

      <Field label="Between periods">
        <div className="space-y-2">
          {(["p1", "p2", "p3"] as const).map((k, i) => (
            <div key={k} className="rounded-xl border border-border bg-surface p-2">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">PERIOD {i + 1}</p>
              <textarea value={periodNotes[k]} onChange={(e) => setPeriodNotes({ ...periodNotes, [k]: e.target.value })} rows={3} placeholder="Adjustments and messaging…" className="mt-1 w-full rounded-lg bg-background px-2 py-1.5 text-xs" />
            </div>
          ))}
        </div>
      </Field>

      <Field label="Post-game notes">
        <textarea value={postGameNotes} onChange={(e) => setPostGameNotes(e.target.value)} rows={5} placeholder="What went well, what to fix, themes for next practice…" className="w-full rounded-lg bg-background px-2 py-1.5 text-xs" />
      </Field>
      <p className="text-[10px] text-muted-foreground">These notes feed into athlete session notes for individual evaluations.</p>

      <button onClick={persist} disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving…" : "Save Notes"}
      </button>
    </div>
  );
}