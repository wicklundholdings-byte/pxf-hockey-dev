import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Lock } from "lucide-react";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "Programs — PXF Hockey" },
      { name: "description", content: "Structured progression pathways that build elite hockey skills layer by layer." },
      { property: "og:title", content: "Programs — PXF Hockey" },
      { property: "og:description", content: "Structured progression pathways for player development." },
    ],
  }),
  component: Programs,
});

const programs = [
  {
    title: "Edge Foundations",
    level: "Foundation",
    weeks: 4,
    sessions: 16,
    desc: "Master inside and outside edges, control your center of mass, and unlock effortless transitions.",
    progress: 65,
  },
  {
    title: "Puck Mastery",
    level: "Developmental",
    weeks: 6,
    sessions: 24,
    desc: "Build hands that work under pressure — tight stickhandling, deception and protection.",
    progress: 30,
  },
  {
    title: "Power Skating",
    level: "Advanced",
    weeks: 8,
    sessions: 32,
    desc: "Explosive starts, top-end speed and recovery skating engineered for game pace.",
    progress: 0,
  },
  {
    title: "Game IQ & Decision Speed",
    level: "Elite",
    weeks: 6,
    sessions: 18,
    desc: "Read, react and decide faster. Scan habits, support play and exit reads.",
    progress: 0,
    locked: true,
  },
];

function Programs() {
  return (
    <div className="px-5 pt-4">
      <Header />
      <ProgressionPath />
      <div className="mt-8 space-y-4">
        {programs.map((p) => (
          <ProgramCard key={p.title} {...p} />
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">
        DEVELOPMENT SYSTEM
      </p>
      <h1 className="mt-1 text-3xl font-bold text-foreground">Programs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Follow structured progressions that build skills layer by layer.
      </p>
    </div>
  );
}

function ProgressionPath() {
  const steps = ["Foundation", "Developmental", "Advanced", "Elite"];
  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-surface p-4">
      <p className="text-[10px] font-bold tracking-[0.3em] text-volt">YOUR PATHWAY</p>
      <div className="mt-3 flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center">
            <div
              className={
                "grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold " +
                (i <= 1
                  ? "bg-gradient-brand text-primary-foreground shadow-glow-teal"
                  : "border border-border bg-surface-2 text-muted-foreground")
              }
            >
              {i + 1}
            </div>
            <span className={"mt-2 text-[10px] font-semibold tracking-wider " + (i <= 1 ? "text-foreground" : "text-muted-foreground")}>
              {s.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-2/5 rounded-full bg-gradient-brand" />
      </div>
    </div>
  );
}

function ProgramCard(p: { title: string; level: string; weeks: number; sessions: number; desc: string; progress: number; locked?: boolean }) {
  return (
    <button className="group block w-full overflow-hidden rounded-2xl border border-border/60 bg-surface text-left transition-colors hover:border-teal/40">
      <div className="relative h-28 bg-gradient-to-br from-surface-2 to-background">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #00E5D6 0, transparent 50%), radial-gradient(circle at 80% 80%, #39FF14 0, transparent 50%)" }} />
        <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-teal backdrop-blur">
          {p.level.toUpperCase()}
        </span>
        {p.locked && (
          <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground backdrop-blur">
            <Lock size={14} />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-foreground">{p.title}</h3>
          <ChevronRight className="mt-1 shrink-0 text-muted-foreground" size={18} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
        <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold tracking-wider text-muted-foreground">
          <span>{p.weeks} WEEKS</span>
          <span className="text-border">•</span>
          <span>{p.sessions} SESSIONS</span>
        </div>
        {p.progress > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-muted-foreground">PROGRESS</span>
              <span className="text-teal">{p.progress}%</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${p.progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}