import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, ChevronRight, Play, Snowflake, Target, Brain, Zap, Activity, Dumbbell, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PXF Hockey — Train the Game" },
      { name: "description", content: "Power. Flow. Performance. Structured player development for skating, puck control, shooting and game IQ." },
      { property: "og:title", content: "PXF Hockey — Train the Game" },
      { property: "og:description", content: "Structured progressions for elite hockey development." },
    ],
  }),
  component: Home,
});

const categories = [
  { label: "Slip Circuits", icon: Zap, color: "teal" as const },
  { label: "GameIQ PODS", icon: Brain, color: "volt" as const },
  { label: "Skating", icon: Snowflake, color: "teal" as const },
  { label: "Shooting", icon: Target, color: "volt" as const },
  { label: "Dryland Skills", icon: Activity, color: "teal" as const },
  { label: "Dryland Fitness", icon: Dumbbell, color: "volt" as const },
];

function Home() {
  return (
    <div className="px-5 pt-4">
      {/* Welcome */}
      <section className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">WELCOME BACK</p>
          <h1 className="mt-1 text-3xl font-bold text-gradient-brand">Coach</h1>
          <p className="mt-1 text-sm text-muted-foreground">What are we working on today?</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface px-3 py-2">
          <Flame size={18} className="text-volt" />
          <div className="leading-tight">
            <p className="font-display text-xl font-bold text-foreground">12</p>
            <p className="text-[10px] tracking-wider text-muted-foreground">DAY STREAK</p>
          </div>
        </div>
      </section>

      {/* Training categories */}
      <section className="mt-7">
        <SectionHeader title="Training Categories" to="/drills" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {categories.map(({ label, icon: Icon, color }) => (
            <button
              key={label}
              className="group relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border/60 bg-surface p-3 transition-all hover:border-teal/40 hover:bg-surface-2"
            >
              <Icon
                size={28}
                strokeWidth={1.6}
                className={color === "teal" ? "text-teal" : "text-volt"}
              />
              <span className="text-center text-[11px] font-semibold leading-tight text-foreground">
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured drill */}
      <section className="mt-8">
        <SectionHeader title="Featured Drill" to="/drills" />
        <div className="mt-3 overflow-hidden rounded-3xl border border-border/60 bg-surface">
          <div className="relative aspect-[16/9] bg-gradient-to-br from-surface-2 to-background">
            <FigureEightSvg className="absolute inset-0 h-full w-full" />
            <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-teal backdrop-blur">
              ADVANCED
            </span>
            <button
              aria-label="Play preview"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal"
            >
              <Play size={16} fill="currentColor" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-volt">PUCK CONTROL</p>
              <h3 className="mt-1 text-lg font-bold text-foreground">Figure 8 Puck Control</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Improve puck control, edges, and body positioning through tight turns and transitions.
              </p>
            </div>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-bold tracking-wide text-primary-foreground shadow-glow-teal">
              VIEW DRILL <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* My session */}
      <section className="mt-8">
        <SectionHeader title="My Session" to="/sessions" />
        <div className="mt-3 rounded-2xl border border-border/60 bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Development Session</h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Disc3 size={12} /> 6 Drills</span>
                <span className="flex items-center gap-1"><Clock size={12} /> 60 min</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-teal">3/6</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-1/2 rounded-full bg-gradient-brand" />
          </div>
          <Link
            to="/sessions"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-teal/40 bg-teal/10 py-2.5 text-sm font-bold text-teal"
          >
            CONTINUE <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Tagline */}
      <div className="mt-10 mb-6 text-center">
        <p className="font-display text-sm font-semibold tracking-[0.3em]">
          <span className="text-teal">POWER.</span>{" "}
          <span className="text-volt">FLOW.</span>{" "}
          <span className="text-foreground">PERFORMANCE.</span>
        </p>
        <p className="mt-1 text-[10px] tracking-[0.4em] text-muted-foreground">TRAIN THE GAME</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-bold tracking-[0.25em] text-foreground/90">
        {title.toUpperCase()}
      </h2>
      <Link to={to} className="flex items-center gap-1 text-xs font-semibold text-teal">
        See all <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function FigureEightSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 180" className={className} aria-hidden>
      <defs>
        <linearGradient id="fg8" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#00E5D6" />
          <stop offset="1" stopColor="#39FF14" />
        </linearGradient>
      </defs>
      <path
        d="M80,90 C80,40 160,40 160,90 C160,140 240,140 240,90 C240,40 160,40 160,90 C160,140 80,140 80,90 Z"
        fill="none"
        stroke="url(#fg8)"
        strokeWidth="2.5"
        strokeDasharray="6 4"
      />
      {[
        [80, 50], [80, 130], [240, 50], [240, 130], [160, 90],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#39FF14" />
      ))}
    </svg>
  );
}
