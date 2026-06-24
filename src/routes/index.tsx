import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, useHasCoachAccess } from "@/hooks/use-auth";
import {
  Flame,
  ChevronRight,
  ChevronLeft,
  Play,
  Brain,
  Layers,
  ArrowRight,
  Plus,
  CalendarDays,
  Clock,
  Disc3,
  Crown,
} from "lucide-react";
import { trainingCategories, type TrainingCategory } from "@/data/trainingCategories";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PXF Hockey — Train the Game" },
      { name: "description", content: "Power. Flow. Performance. Structured progressions for skating, puck control, shooting and game IQ." },
      { property: "og:title", content: "PXF Hockey — Train the Game" },
      { property: "og:description", content: "Structured progressions for elite hockey development." },
    ],
  }),
  component: Home,
});

const categoryToRoute: Record<TrainingCategory, "/drills" | "/gameiq"> = {
  "Slip Circuits": "/drills",
  "Dryland Skills": "/drills",
  "Game IQ Circuits": "/gameiq",
};

const categoryIcon: Record<TrainingCategory, React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>> = {
  "Slip Circuits": Layers,
  "Dryland Skills": Flame,
  "Game IQ Circuits": Brain,
};

const categories = trainingCategories.map(({ name, tint, comingSoon }) => ({
  label: name,
  icon: categoryIcon[name],
  tint,
  comingSoon,
  to: categoryToRoute[name],
}));

const quickAccess = [
  { label: "Build Session", icon: Plus, to: "/sessions" as const },
  { label: "Pathways", icon: Layers, to: "/programs" as const },
  { label: "GameIQ", icon: Brain, to: "/gameiq" as const },
  { label: "Membership", icon: Crown, to: "/membership" as const },
];

function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: roleLoading } = useHasCoachAccess(user?.id);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (user && hasAccess) navigate({ to: "/coach", replace: true });
  }, [authLoading, roleLoading, user, hasAccess, navigate]);

  return (
    <div className="px-5 pt-4">
      <button
        onClick={() => {
          if (window.history.length > 1) window.history.back();
          else navigate({ to: "/auth" });
        }}
        className="mb-3 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        aria-label="Go back"
      >
        <ChevronLeft size={14} />
        Back
      </button>
      <section className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">WELCOME BACK</p>
          <h1 className="mt-1 text-3xl font-bold text-gradient-brand">Coach Chris</h1>
          <p className="mt-1 text-sm text-muted-foreground">Train the game. Today's the day.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-volt/30 bg-surface px-3 py-2 shadow-glow-volt">
          <Flame size={18} className="text-volt" />
          <div className="leading-tight">
            <p className="font-display text-xl font-bold text-foreground">12</p>
            <p className="text-[10px] tracking-wider text-muted-foreground">DAY STREAK</p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-4 gap-2">
        {quickAccess.map(({ label, icon: Icon, to }) => (
          <Link key={label} to={to} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-surface px-2 py-3 text-center transition-colors hover:border-teal/40">
            <Icon size={18} className="text-teal" />
            <span className="text-[10px] font-semibold leading-tight text-foreground">{label}</span>
          </Link>
        ))}
      </section>

      <section className="mt-7">
        <SectionHeader title="Training Categories" to="/drills" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {categories.map(({ label, icon: Icon, tint, comingSoon, to }) => (
            <Link key={label} to={to} className={`group relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 transition-all ${comingSoon ? "border-soon/40 bg-surface hover:bg-soon/10" : "border-border/60 bg-surface hover:border-teal/40 hover:bg-surface-2"}`}>
              {comingSoon && <span className="absolute right-2 top-2 rounded-full bg-soon/20 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-soon">SOON</span>}
              <Icon size={22} strokeWidth={1.6} className={tint === "teal" ? "text-teal" : "text-volt"} />
              <span className="text-center text-[9.5px] font-semibold leading-tight text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Continue Training" to="/sessions" />
        <div className="mt-3 rounded-2xl border border-teal/30 bg-surface p-4 shadow-glow-teal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] text-teal">IN PROGRESS</p>
              <h3 className="mt-1 text-base font-bold text-foreground">Slip Circuits · Flow 2</h3>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Disc3 size={11} /> 4 of 6 drills</span>
                <span className="flex items-center gap-1"><Clock size={11} /> 22 min left</span>
              </div>
            </div>
            <span className="font-display text-xl font-bold text-teal">66%</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-2/3 rounded-full bg-gradient-brand" />
          </div>
          <Link to="/sessions" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-brand py-2.5 text-sm font-bold tracking-wide text-primary-foreground">
            RESUME <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Recommended Progression" to="/programs" />
        <Link to="/programs" className="mt-3 block overflow-hidden rounded-2xl border border-border/60 bg-surface">
          <div className="relative h-24 bg-gradient-to-br from-surface-2 to-background">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #00E5D6 0, transparent 55%), radial-gradient(circle at 80% 70%, #39FF14 0, transparent 55%)" }} />
            <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-teal backdrop-blur">PATHWAY</span>
            <span className="absolute right-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-volt backdrop-blur">NEXT UP</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-foreground">Puck Control · Flow 3 — Deception</h3>
              <p className="text-[11px] text-muted-foreground">Unlock after 2 more sessions in Flow 2.</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </div>
        </Link>
      </section>

      <section className="mt-7">
        <SectionHeader title="Upcoming Session" to="/sessions" />
        <Link to="/sessions" className="mt-3 flex items-center gap-4 rounded-2xl border border-border/60 bg-surface p-4">
          <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-surface-2 py-2">
            <span className="text-[10px] font-bold tracking-widest text-volt">WED</span>
            <span className="font-display text-base font-bold text-foreground">18</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-foreground">Slip Circuit · 5pm</h3>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarDays size={11} /> Northstar Rink</span>
              <span>·</span>
              <span>45 min</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      </section>

      <section className="mt-7">
        <SectionHeader title="Featured Drill" to="/drills" />
        <Link to="/drill-detail/$drillId" params={{ drillId: "figure-8-puck" }} className="mt-3 block overflow-hidden rounded-3xl border border-border/60 bg-surface">
          <div className="relative aspect-[16/9] bg-gradient-to-br from-surface-2 to-background">
            <FigureEightSvg className="absolute inset-0 h-full w-full" />
            <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-teal backdrop-blur">ADVANCED</span>
            <span aria-label="Play preview" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal">
              <Play size={16} fill="currentColor" />
            </span>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-volt">PUCK CONTROL</p>
              <h3 className="mt-1 text-lg font-bold text-foreground">Figure 8 Puck Control</h3>
              <p className="mt-1 text-sm text-muted-foreground">Tight figure-8 control with eyes up — blends edges, hands and posture.</p>
            </div>
            <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-bold tracking-wide text-primary-foreground shadow-glow-teal">
              VIEW DRILL <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      </section>

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

function SectionHeader({ title, to }: { title: string; to: "/drills" | "/sessions" | "/programs" | "/gameiq" }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-bold tracking-[0.25em] text-foreground/90">{title.toUpperCase()}</h2>
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
      <path d="M80,90 C80,40 160,40 160,90 C160,140 240,140 240,90 C240,40 160,40 160,90 C160,140 80,140 80,90 Z" fill="none" stroke="url(#fg8)" strokeWidth="2.5" strokeDasharray="6 4" />
      {[[80, 50], [80, 130], [240, 50], [240, 130], [160, 90]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#39FF14" />
      ))}
    </svg>
  );
}
