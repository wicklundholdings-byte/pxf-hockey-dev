import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Trophy,
  Flame,
  Calendar,
  Activity,
  Layers,
  Zap,
  Brain,
  Target,
  Lock,
  Award,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — PXF Hockey" },
      { name: "description", content: "Earn badges across consistency, skill development, and game intelligence." },
      { property: "og:title", content: "Achievements — PXF Hockey" },
      { property: "og:description", content: "Unlock PXF Hockey achievement badges." },
    ],
  }),
  component: Achievements,
});

type Tier = "bronze" | "silver" | "gold" | "elite";
type Category =
  | "Consistency"
  | "Skill Development"
  | "Skating Flow"
  | "Edge Control"
  | "Puck Control"
  | "Reaction Training"
  | "GameIQ";

type Achievement = {
  id: string;
  name: string;
  desc: string;
  category: Category;
  icon: LucideIcon;
  tier: Tier;
  progress: number; // 0-100
  unlocked: boolean;
};

const achievements: Achievement[] = [
  { id: "a1", name: "10 Day Streak", desc: "Train 10 days in a row", category: "Consistency", icon: Flame, tier: "bronze", progress: 100, unlocked: true },
  { id: "a2", name: "30 Day Streak", desc: "Train 30 days in a row", category: "Consistency", icon: Calendar, tier: "silver", progress: 40, unlocked: false },
  { id: "a3", name: "100 Sessions", desc: "Complete 100 training sessions", category: "Consistency", icon: Activity, tier: "gold", progress: 46, unlocked: false },
  { id: "a4", name: "First Pathway", desc: "Complete your first progression", category: "Skill Development", icon: Layers, tier: "bronze", progress: 100, unlocked: true },
  { id: "a5", name: "All-Around Athlete", desc: "Reach L3 in 5 categories", category: "Skill Development", icon: Sparkles, tier: "gold", progress: 60, unlocked: false },
  { id: "a6", name: "Flow Master", desc: "Complete all Skating Flow tiers", category: "Skating Flow", icon: Zap, tier: "elite", progress: 75, unlocked: false },
  { id: "a7", name: "Edge Master", desc: "Master every Edge Control drill", category: "Edge Control", icon: Activity, tier: "gold", progress: 100, unlocked: true },
  { id: "a8", name: "Puck Wizard", desc: "Hit 95% on Puck Control circuits", category: "Puck Control", icon: Target, tier: "silver", progress: 80, unlocked: false },
  { id: "a9", name: "Reaction Specialist", desc: "Top 10% reaction time", category: "Reaction Training", icon: Zap, tier: "gold", progress: 100, unlocked: true },
  { id: "a10", name: "GameIQ Certified", desc: "Pass all GameIQ assessments", category: "GameIQ", icon: Brain, tier: "elite", progress: 35, unlocked: false },
];

const categories: ("All" | Category)[] = [
  "All",
  "Consistency",
  "Skill Development",
  "Skating Flow",
  "Edge Control",
  "Puck Control",
  "Reaction Training",
  "GameIQ",
];

const tierColors: Record<Tier, { ring: string; chip: string; glow: string; label: string }> = {
  bronze: { ring: "from-amber-700 to-amber-500", chip: "bg-amber-500/15 text-amber-400", glow: "shadow-[0_0_30px_-8px_rgba(245,158,11,0.6)]", label: "BRONZE" },
  silver: { ring: "from-slate-400 to-slate-200", chip: "bg-slate-300/15 text-slate-300", glow: "shadow-[0_0_30px_-8px_rgba(203,213,225,0.5)]", label: "SILVER" },
  gold: { ring: "from-yellow-500 to-amber-300", chip: "bg-yellow-400/15 text-yellow-300", glow: "shadow-[0_0_32px_-6px_rgba(250,204,21,0.65)]", label: "GOLD" },
  elite: { ring: "from-teal to-volt", chip: "bg-volt/15 text-volt", glow: "shadow-glow-volt", label: "ELITE" },
};

function Achievements() {
  const [active, setActive] = useState<(typeof categories)[number]>("All");
  const list = active === "All" ? achievements : achievements.filter((a) => a.category === active);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;
  const percent = Math.round((unlockedCount / total) * 100);

  return (
    <div className="px-5 pt-4 pb-6">
      <Link to="/progress" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Hero */}
      <div className="relative mt-3 overflow-hidden rounded-3xl border border-border/60 bg-surface p-5">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-brand opacity-20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow-teal">
            <Trophy size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.35em] text-volt">ACHIEVEMENTS</p>
            <h1 className="mt-0.5 text-2xl font-bold text-foreground">Trophy Hall</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unlockedCount} of {total} unlocked
            </p>
          </div>
        </div>
        <div className="relative mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] tracking-wider text-muted-foreground">
            <span>COMPLETION</span>
            <span className="text-foreground">{percent}%</span>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="mt-5 -mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex gap-2">
          {categories.map((c) => {
            const isActive = c === active;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors " +
                  (isActive
                    ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow-teal"
                    : "border-border/60 bg-surface text-muted-foreground hover:text-foreground")
                }
              >
                {c.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {list.map((a) => (
          <BadgeCard key={a.id} achievement={a} />
        ))}
      </div>

      {/* Footer call-out */}
      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-border/60 bg-surface px-4 py-4">
        <Award size={22} className="text-teal" />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Keep stacking trophies</p>
          <p className="text-[11px] text-muted-foreground">Train daily to maintain streaks and unlock elite tier badges.</p>
        </div>
      </div>
    </div>
  );
}

function BadgeCard({ achievement }: { achievement: Achievement }) {
  const t = tierColors[achievement.tier];
  const Icon = achievement.icon;
  const locked = !achievement.unlocked;

  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border bg-surface p-4 " +
        (locked ? "border-border/60" : "border-border/60 " + t.glow)
      }
    >
      <div className="flex items-start justify-between">
        <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest " + t.chip}>
          {t.label}
        </span>
        {locked && <Lock size={12} className="text-muted-foreground" />}
      </div>

      <div className="mt-3 flex justify-center">
        <div className="relative">
          <div
            className={
              "grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br p-[2px] " +
              t.ring +
              (locked ? " opacity-40 grayscale" : "")
            }
          >
            <div className="grid h-full w-full place-items-center rounded-full bg-surface-2">
              <Icon
                size={28}
                className={locked ? "text-muted-foreground" : "text-foreground"}
                strokeWidth={2}
              />
            </div>
          </div>
          {locked && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-background/40 backdrop-blur-[1px]">
              <Lock size={20} className="text-foreground/80" />
            </div>
          )}
        </div>
      </div>

      <p className={"mt-3 text-center text-sm font-bold leading-tight " + (locked ? "text-muted-foreground" : "text-foreground")}>
        {achievement.name}
      </p>
      <p className="mt-1 text-center text-[10px] leading-snug text-muted-foreground">
        {achievement.desc}
      </p>

      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={"h-full rounded-full " + (locked ? "bg-muted-foreground/50" : "bg-gradient-brand")}
            style={{ width: `${achievement.progress}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] tracking-wider text-muted-foreground">
          <span>{achievement.category.toUpperCase()}</span>
          <span>{achievement.progress}%</span>
        </div>
      </div>
    </div>
  );
}