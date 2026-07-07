import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Star,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Lock,
  Play,
  Camera,
  Dumbbell,
  Calendar,
  Flame,
} from "lucide-react";

export const Route = createFileRoute("/parent/athlete/$athleteId")({
  head: () => ({ meta: [{ title: "Athlete Profile — PXF Hockey" }] }),
  component: AthleteProfile,
});

type AthleteData = {
  id: string;
  name: string;
  initials: string;
  age: number;
  position: string;
  jersey: string;
  team: string;
};

const ATHLETES: Record<string, AthleteData> = {
  alex: { id: "alex", name: "Alex Dev", initials: "AD", age: 12, position: "Forward", jersey: "#14", team: "Lightning U14" },
  sam: { id: "sam", name: "Sam Dev", initials: "SD", age: 10, position: "Defense", jersey: "#7", team: "Lightning U12" },
};

const TABS = ["Overview", "Training", "Evaluations", "Media", "Stats", "Combine"] as const;
type Tab = (typeof TABS)[number];

function AthleteProfile() {
  const { athleteId } = Route.useParams();
  const navigate = useNavigate();
  const athlete = ATHLETES[athleteId] ?? ATHLETES.alex;
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-[480px] px-5 pt-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <Link to="/parent" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
            {Object.values(ATHLETES).map((a) => (
              <button
                key={a.id}
                onClick={() => navigate({ to: "/parent/athlete/$athleteId", params: { athleteId: a.id } })}
                className={
                  "rounded-full px-3 py-1 text-[11px] font-bold " +
                  (a.id === athlete.id ? "bg-teal text-background" : "text-muted-foreground")
                }
              >
                {a.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Identity */}
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-teal/40 to-volt/20 font-display text-2xl font-black text-teal ring-2 ring-teal/50">
            {athlete.initials}
          </div>
          <p className="mt-2 font-display text-xl font-bold">{athlete.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Age {athlete.age} · {athlete.position} · {athlete.jersey}
          </p>
          <span className="mt-2 rounded-full bg-volt/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-volt">
            {athlete.team}
          </span>
        </div>

        {/* Tabs */}
        <div className="mt-5 -mx-1 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold " +
                (tab === t ? "bg-teal text-background" : "border border-border bg-surface text-muted-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "Overview" && <OverviewTab athlete={athlete} />}
          {tab === "Training" && <TrainingTab />}
          {tab === "Evaluations" && <EvaluationsTab />}
          {tab === "Media" && <MediaTab athlete={athlete} />}
          {tab === "Stats" && <StatsTab athlete={athlete} />}
          {tab === "Combine" && <CombineTab />}
        </div>
      </div>
    </div>
  );
}

function Stars({ n, of = 5 }: { n: number; of?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: of }).map((_, i) => (
        <Star key={i} size={12} className={i < n ? "fill-volt text-volt" : "text-border"} />
      ))}
    </span>
  );
}

function OverviewTab({ athlete }: { athlete: AthleteData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Latest Evaluation</p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Summer Elite Camp</p>
            <p className="text-[11px] text-muted-foreground">Coach Reilly · Jul 3</p>
          </div>
          <Stars n={4} />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          "Great edge work on the left side today. Keep working on knee bend during right-turn crossovers."
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Next Up</p>
        <div className="mt-2 flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-teal/15 text-teal">
            <Calendar size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Summer Elite Camp — Session 4</p>
            <p className="text-[11px] text-muted-foreground">Tomorrow · 4:30 PM · Burnaby 8 Rinks</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">
          <Flame size={11} className="text-volt" /> Dryland Streak
        </p>
        <p className="mt-1 font-display text-2xl font-black">
          2 <span className="text-sm font-bold text-muted-foreground">of 3 this week</span>
        </p>
        <div className="mt-2 flex gap-1.5">
          {[true, true, false].map((done, i) => (
            <div key={i} className={"h-2 flex-1 rounded-full " + (done ? "bg-teal" : "bg-surface")} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Recent Media</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {["Edge Work", "Skating", "Shooting"].map((tag, i) => (
            <div key={i} className="aspect-square rounded-xl border border-border bg-surface p-2">
              <div className="grid h-full place-items-center">
                <Play size={22} className="text-teal" />
              </div>
              <p className="mt-1 truncate text-center text-[9px] text-muted-foreground">{tag}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{athlete.name} · tagged clips</p>
      </div>
    </div>
  );
}

function TrainingTab() {
  const programs = [
    { name: "Edge Work Fundamentals", pct: 65, sessions: "9 of 14" },
    { name: "Shot Power Program", pct: 30, sessions: "3 of 10" },
  ];
  const history = [
    { name: "Dryland — Hand Speed", date: "Jul 5", done: true },
    { name: "Skating — Crossovers", date: "Jul 3", done: true },
    { name: "Dryland — Reaction", date: "Jul 1", done: true },
    { name: "Skating — Edge Work", date: "Jun 28", done: true },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {programs.map((p) => (
          <div key={p.name} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{p.sessions} sessions</p>
              </div>
              <button className="flex items-center gap-1 rounded-full bg-teal px-3 py-1 text-[11px] font-bold text-background">
                Continue <ChevronRight size={12} />
              </button>
            </div>
            <div className="mt-3 h-2 rounded-full bg-surface">
              <div className="h-full rounded-full bg-gradient-to-r from-teal to-volt" style={{ width: `${p.pct}%` }} />
            </div>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{p.pct}%</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Session History</p>
        <div className="mt-2 space-y-1.5">
          {history.map((h, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
              <div className="flex items-center gap-2">
                <Dumbbell size={14} className="text-teal" />
                <p className="text-[12px] font-semibold">{h.name}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">{h.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvaluationsTab() {
  const evals = [
    {
      date: "Jul 3",
      coach: "Coach Reilly",
      camp: "Summer Elite Camp",
      rows: [
        { skill: "Skating", stars: 4, trend: "up" as const },
        { skill: "Puck Control", stars: 4, trend: "up" as const },
        { skill: "Shooting", stars: 3, trend: "down" as const },
        { skill: "Hockey IQ", stars: 4, trend: "up" as const },
      ],
      note: "Great edge work on the left. Keep working on knee bend during right-turn crossovers.",
    },
    {
      date: "Jun 20",
      coach: "Coach Davis",
      camp: "Skating Power Clinic",
      rows: [
        { skill: "Skating", stars: 3, trend: "up" as const },
        { skill: "Puck Control", stars: 3, trend: "up" as const },
        { skill: "Shooting", stars: 4, trend: "up" as const },
        { skill: "Hockey IQ", stars: 3, trend: "up" as const },
      ],
      note: "Strong first-step acceleration. Focus on head-up puck handling next.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {evals.map((e, idx) => (
        <div key={idx} className="rounded-2xl border border-border bg-card p-4">
          <button className="flex w-full items-center justify-between" onClick={() => setOpen(open === idx ? null : idx)}>
            <div className="text-left">
              <p className="text-sm font-bold">{e.camp}</p>
              <p className="text-[11px] text-muted-foreground">{e.coach} · {e.date}</p>
            </div>
            <ChevronDown size={14} className={"text-muted-foreground transition-transform " + (open === idx ? "rotate-180" : "")} />
          </button>
          <div className="mt-3 space-y-2">
            {e.rows.map((r) => (
              <div key={r.skill} className="flex items-center justify-between">
                <p className="text-[12px] font-semibold">{r.skill}</p>
                <div className="flex items-center gap-2">
                  <Stars n={r.stars} />
                  {r.trend === "up" ? (
                    <TrendingUp size={12} className="text-teal" />
                  ) : (
                    <TrendingDown size={12} className="text-rose-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {open === idx && (
            <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">
              "{e.note}"
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function MediaTab({ athlete }: { athlete: AthleteData }) {
  const [filter, setFilter] = useState<"All" | "Videos" | "Photos">("All");
  const items = [
    { id: 1, kind: "video" as const, tag: "Edge Work", date: "Jul 5" },
    { id: 2, kind: "video" as const, tag: "Skating", date: "Jul 3" },
    { id: 3, kind: "photo" as const, tag: "Team Photo", date: "Jul 1" },
    { id: 4, kind: "video" as const, tag: "Shooting", date: "Jun 28" },
    { id: 5, kind: "photo" as const, tag: "Off-Ice", date: "Jun 25" },
    { id: 6, kind: "video" as const, tag: "Drills", date: "Jun 21" },
  ];
  const shown = items.filter((i) =>
    filter === "All" ? true : filter === "Videos" ? i.kind === "video" : i.kind === "photo",
  );
  const [open, setOpen] = useState<null | (typeof items)[number]>(null);
  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {(["All", "Videos", "Photos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3 py-1 text-[11px] font-bold " +
              (filter === f ? "bg-teal text-background" : "border border-border bg-surface text-muted-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {shown.map((m) => (
          <button
            key={m.id}
            onClick={() => setOpen(m)}
            className="aspect-square rounded-xl border border-border bg-surface p-2 text-left"
          >
            <div className="grid h-3/4 place-items-center">
              {m.kind === "video" ? <Play size={22} className="text-teal" /> : <Camera size={22} className="text-teal" />}
            </div>
            <p className="truncate text-[9px] font-semibold text-foreground">{m.tag}</p>
            <p className="truncate text-[9px] text-muted-foreground">{m.date}</p>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-bold">{athlete.name}</p>
              <p className="text-[10px] text-muted-foreground">{open.tag} · {open.date}</p>
            </div>
            <button onClick={() => setOpen(null)} className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-bold">Close</button>
          </div>
          <div className="grid flex-1 place-items-center bg-black">
            {open.kind === "video" ? <Play size={64} className="text-teal" /> : <Camera size={64} className="text-teal" />}
          </div>
          <div className="border-t border-border p-4">
            <p className="text-[11px] text-muted-foreground">Coach note: Good edge work on the left side. Watch knee bend.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsTab({ athlete }: { athlete: AthleteData }) {
  const teams = [
    { team: athlete.team, gp: 22, g: 14, a: 19, pts: 33, plus: 12 },
    { team: "Summer Elite Camp", gp: 6, g: 3, a: 5, pts: 8, plus: 4 },
  ];
  const totals = teams.reduce(
    (acc, t) => ({ gp: acc.gp + t.gp, g: acc.g + t.g, a: acc.a + t.a, pts: acc.pts + t.pts, plus: acc.plus + t.plus }),
    { gp: 0, g: 0, a: 0, pts: 0, plus: 0 },
  );
  return (
    <div className="space-y-3">
      {teams.map((t) => (
        <div key={t.team} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold">{t.team}</p>
          <div className="mt-3 grid grid-cols-5 gap-2 text-center">
            {[
              ["GP", t.gp],
              ["G", t.g],
              ["A", t.a],
              ["PTS", t.pts],
              ["+/-", t.plus],
            ].map(([label, val]) => (
              <div key={label as string}>
                <p className="font-display text-lg font-black">{val}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-teal/40 bg-teal/10 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-teal">Season Totals</p>
        <div className="mt-3 grid grid-cols-5 gap-2 text-center">
          {[
            ["GP", totals.gp],
            ["G", totals.g],
            ["A", totals.a],
            ["PTS", totals.pts],
            ["+/-", totals.plus],
          ].map(([label, val]) => (
            <div key={label as string}>
              <p className="font-display text-lg font-black text-foreground">{val}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CombineTab() {
  const cats = [
    "Speed & Power",
    "Jumping & Explosiveness",
    "Shot Power",
    "Shot Speed",
    "Agility & Circuits",
    "Recovery & Wellness",
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-teal/40 bg-teal/10 p-3 text-center">
        <p className="text-[11px] font-bold text-teal">Unlocks with PXF hardware</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cats.map((c) => (
          <div key={c} className="rounded-2xl border border-border bg-card p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-teal/15 text-teal">
              <Lock size={14} />
            </div>
            <p className="mt-2 text-[12px] font-bold leading-tight">{c}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Locked</p>
          </div>
        ))}
      </div>
    </div>
  );
}