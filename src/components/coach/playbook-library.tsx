import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Filter, Clock, Users, Snowflake, Zap, Brain, Dumbbell } from "lucide-react";
import { CoachDrylandLibrary } from "./dryland-library";

type CatId = "all" | "skating" | "slip" | "gameiq" | "dryland";

type MockCard = {
  id: string;
  title: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  ages: string;
  duration: string;
  sessions: string;
  description: string;
  icon: typeof Snowflake;
  accent: "teal" | "cyan" | "amber" | "violet";
};

const SKATING: MockCard[] = [
  {
    id: "sk-1",
    title: "Edge Mastery Series",
    category: "SKATING",
    level: "INTERMEDIATE",
    ages: "Ages 10-16",
    duration: "30m",
    sessions: "6 sessions",
    description: "Full-ice edge work progressions for speed and agility development.",
    icon: Snowflake,
    accent: "teal",
  },
  {
    id: "sk-2",
    title: "Crossover Power Program",
    category: "SKATING",
    level: "ADVANCED",
    ages: "Ages 13+",
    duration: "25m",
    sessions: "4 sessions",
    description: "Build explosive crossover strength through progressive circuit work.",
    icon: Snowflake,
    accent: "teal",
  },
  {
    id: "sk-3",
    title: "Backward Skating Foundations",
    category: "SKATING",
    level: "BEGINNER",
    ages: "Ages 8-12",
    duration: "20m",
    sessions: "4 sessions",
    description: "Core backward skating mechanics — c-cuts, crossovers, pivots.",
    icon: Snowflake,
    accent: "teal",
  },
];

const SLIP: MockCard[] = [
  {
    id: "sl-1",
    title: "Slip Deke Figure 8",
    category: "SLIP CIRCUITS",
    level: "INTERMEDIATE",
    ages: "Ages 13+",
    duration: "8m",
    sessions: "3 items",
    description: "Slip-to-slip figure-8 patterns for controlled edge changes with the puck.",
    icon: Zap,
    accent: "cyan",
  },
  {
    id: "sl-2",
    title: "Tight Turn Slip",
    category: "SLIP CIRCUITS",
    level: "ADVANCED",
    ages: "Ages 13+",
    duration: "10m",
    sessions: "2 items",
    description: "Sharp tight-turn slip combinations for high-pressure escapes.",
    icon: Zap,
    accent: "cyan",
  },
  {
    id: "sl-3",
    title: "Slip Release Sequence",
    category: "SLIP CIRCUITS",
    level: "INTERMEDIATE",
    ages: "Ages 12+",
    duration: "12m",
    sessions: "4 items",
    description: "Combine slip moves into game-speed release sequences with puck.",
    icon: Zap,
    accent: "cyan",
  },
];

const GAMEIQ: MockCard[] = [
  {
    id: "gi-1",
    title: "Defensive Zone Coverage",
    category: "GAMEIQ",
    level: "INTERMEDIATE",
    ages: "Ages 12+",
    duration: "20m",
    sessions: "5 sessions",
    description: "Read and react defensive positioning, gap control, and angling concepts.",
    icon: Brain,
    accent: "amber",
  },
  {
    id: "gi-2",
    title: "Offensive Zone Entries",
    category: "GAMEIQ",
    level: "ADVANCED",
    ages: "Ages 13+",
    duration: "25m",
    sessions: "4 sessions",
    description: "Controlled and possession entry reads with 3-on-3 compete situations.",
    icon: Brain,
    accent: "amber",
  },
  {
    id: "gi-3",
    title: "2-on-1 Decision Making",
    category: "GAMEIQ",
    level: "INTERMEDIATE",
    ages: "Ages 11+",
    duration: "15m",
    sessions: "3 sessions",
    description: "Shooter vs. passer reads at game speed.",
    icon: Brain,
    accent: "amber",
  },
];

const CATS: { id: CatId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "skating", label: "Skating" },
  { id: "slip", label: "Slip Training" },
  { id: "gameiq", label: "GameIQ" },
  { id: "dryland", label: "Dryland" },
];

const ACCENT: Record<MockCard["accent"], { grad: string; text: string }> = {
  teal: { grad: "from-teal-400 to-cyan-500", text: "text-teal" },
  cyan: { grad: "from-cyan-400 to-sky-500", text: "text-cyan-400" },
  amber: { grad: "from-amber-400 to-orange-500", text: "text-amber-400" },
  violet: { grad: "from-violet-400 to-fuchsia-500", text: "text-violet-400" },
};

export function PlaybookLibrary() {
  const [cat, setCat] = useState<CatId>("all");
  const [query, setQuery] = useState("");

  const showSkating = cat === "all" || cat === "skating";
  const showSlip = cat === "all" || cat === "slip";
  const showGameIQ = cat === "all" || cat === "gameiq";
  const showDryland = cat === "all" || cat === "dryland";

  const q = query.trim().toLowerCase();
  const filter = (list: MockCard[]) =>
    !q ? list : list.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));

  return (
    <div className="pb-6">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">DRILL LIBRARY</p>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3 py-2">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-muted-foreground" aria-label="Filter">
          <Filter size={14} />
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold " +
              (cat === c.id ? "bg-teal text-background" : "bg-surface text-muted-foreground")
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-6">
        {showSkating && (
          <CategoryGroup
            title="Skating"
            blurb="Edge, crossover, and stride progressions for power and control."
            items={filter(SKATING)}
          />
        )}
        {showSlip && (
          <CategoryGroup
            title="Slip Training"
            blurb="Deceptive edge and puck-handling circuits built for game creativity."
            items={filter(SLIP)}
          />
        )}
        {showGameIQ && (
          <CategoryGroup
            title="GameIQ"
            blurb="Reads, positioning, and decision-making concepts for competitive play."
            items={filter(GAMEIQ)}
          />
        )}
        {showDryland && (
          <div>
            <CoachDrylandLibrary />
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryGroup({ title, blurb, items }: { title: string; blurb: string; items: MockCard[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">
        {title.toUpperCase()}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
      <div className="mt-3 space-y-3">
        {items.map((c) => (
          <MockCardRow key={c.id} card={c} />
        ))}
      </div>
    </section>
  );
}

function MockCardRow({ card }: { card: MockCard }) {
  const Icon = card.icon;
  const accent = ACCENT[card.accent];
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-4">
      <Link
        to="/playbook-drill/$drillId"
        params={{ drillId: card.id }}
        search={{ from: "library" }}
        className="flex items-center gap-3"
      >
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${accent.grad}`}>
          <Icon size={20} className="text-background" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{card.title}</p>
          <p className={`mt-0.5 text-[11px] uppercase tracking-wider ${accent.text}`}>
            {card.category} · {card.level}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{card.ages}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{card.duration}</span>
            <span className="flex items-center gap-1"><Dumbbell size={11} />{card.sessions}</span>
          </p>
        </div>
      </Link>
      <p className="mt-2 text-[11px] text-muted-foreground">{card.description}</p>
      <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-brand py-2 text-xs font-bold text-primary-foreground">
        <Users size={13} /> Assign to athletes
      </button>
    </div>
  );
}