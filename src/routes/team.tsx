import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Flame,
  TrendingUp,
  Clock,
  MoreVertical,
  ClipboardList,
  Dumbbell,
  LineChart,
  MessageSquare,
  Users,
  X,
} from "lucide-react";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "My Team — PXF Hockey" },
      { name: "description", content: "Manage your roster, assign programs, and track athlete progression." },
      { property: "og:title", content: "My Team — PXF Hockey" },
      { property: "og:description", content: "Coach dashboard for managing PXF Hockey athletes." },
    ],
  }),
  component: TeamPage,
});

type Player = {
  id: string;
  name: string;
  initials: string;
  age: number;
  progression: string;
  progressionLevel: number;
  pxfScore: number;
  streak: number;
  lastActivity: string;
  tint: "teal" | "volt";
};

const TEAM_NAME = "Northstar U15 AAA";

const players: Player[] = [
  { id: "1", name: "Mason Riley", initials: "MR", age: 14, progression: "Edge Control · L3", progressionLevel: 60, pxfScore: 812, streak: 12, lastActivity: "2h ago", tint: "teal" },
  { id: "2", name: "Jaxon Pelletier", initials: "JP", age: 15, progression: "Slip Circuits · L2", progressionLevel: 45, pxfScore: 764, streak: 8, lastActivity: "Yesterday", tint: "volt" },
  { id: "3", name: "Cole Andersen", initials: "CA", age: 14, progression: "Puck Control · L4", progressionLevel: 80, pxfScore: 891, streak: 21, lastActivity: "30m ago", tint: "teal" },
  { id: "4", name: "Eli Bergstrom", initials: "EB", age: 15, progression: "Shooting · L2", progressionLevel: 35, pxfScore: 702, streak: 4, lastActivity: "2d ago", tint: "volt" },
  { id: "5", name: "Hudson Klein", initials: "HK", age: 14, progression: "Dryland · L3", progressionLevel: 55, pxfScore: 748, streak: 9, lastActivity: "4h ago", tint: "teal" },
  { id: "6", name: "Noah Whitlock", initials: "NW", age: 15, progression: "GameIQ · L2", progressionLevel: 40, pxfScore: 689, streak: 3, lastActivity: "3d ago", tint: "volt" },
];

function TeamPage() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const filtered = players.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const avgScore = Math.round(players.reduce((s, p) => s + p.pxfScore, 0) / players.length);
  const activeToday = players.filter((p) => p.lastActivity.includes("h") || p.lastActivity.includes("m")).length;

  return (
    <div className="px-5 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <Link to="/profile" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ArrowLeft size={14} /> Back
        </Link>
        <button className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface text-foreground">
          <Plus size={16} />
        </button>
      </div>

      {/* Team header card */}
      <div className="mt-3 overflow-hidden rounded-3xl border border-border/60 bg-surface">
        <div className="relative bg-gradient-brand px-5 py-5 text-primary-foreground">
          <p className="text-[10px] font-bold tracking-[0.35em] opacity-80">TEAM</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{TEAM_NAME}</h1>
          <p className="mt-0.5 text-xs opacity-85">2025/26 Season · Head Coach</p>
          <Users size={84} className="pointer-events-none absolute -right-2 -bottom-3 opacity-15" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-border/60 bg-surface-2 py-3 text-center">
          <Stat label="ATHLETES" value={String(players.length)} />
          <Stat label="AVG PXF" value={String(avgScore)} />
          <Stat label="ACTIVE TODAY" value={String(activeToday)} />
        </div>
      </div>

      {/* Search */}
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border/60 bg-surface px-3 py-2.5">
        <Search size={16} className="text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roster"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-[0.25em] text-foreground/90">ROSTER</h2>
        <span className="text-[11px] font-medium text-muted-foreground">{filtered.length} players</span>
      </div>

      <div className="mt-3 space-y-3">
        {filtered.map((p) => (
          <PlayerCard key={p.id} player={p} onAction={() => setActiveId(p.id)} />
        ))}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border/60 bg-surface px-4 py-6 text-center text-xs text-muted-foreground">
            No athletes match "{query}"
          </p>
        )}
      </div>

      {activeId && (
        <ActionSheet
          player={players.find((p) => p.id === activeId)!}
          onClose={() => setActiveId(null)}
        />
      )}
    </div>
  );
}

function PlayerCard({ player, onAction }: { player: Player; onAction: () => void }) {
  const tintBg = player.tint === "teal" ? "bg-teal/15 text-teal" : "bg-volt/15 text-volt";
  const barColor = player.tint === "teal" ? "bg-teal" : "bg-volt";
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className={"grid h-12 w-12 place-items-center rounded-2xl font-display text-base font-bold " + tintBg}>
          {player.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-foreground">{player.name}</p>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Age {player.age}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{player.progression}</p>
        </div>
        <button
          onClick={onAction}
          aria-label="Coach actions"
          className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-medium tracking-wider text-muted-foreground">
          <span>PROGRESSION</span>
          <span>{player.progressionLevel}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className={"h-full rounded-full " + barColor} style={{ width: `${player.progressionLevel}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric icon={TrendingUp} label="PXF" value={String(player.pxfScore)} tint="teal" />
        <Metric icon={Flame} label="STREAK" value={`${player.streak}d`} tint="volt" />
        <Metric icon={Clock} label="LAST" value={player.lastActivity} tint="teal" />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <QuickAction icon={ClipboardList} label="Program" />
        <QuickAction icon={Dumbbell} label="Drill" />
        <QuickAction icon={LineChart} label="Progress" />
        <QuickAction icon={MessageSquare} label="Message" />
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  tint: "teal" | "volt";
}) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2">
      <div className="flex items-center gap-1">
        <Icon size={11} className={tint === "teal" ? "text-teal" : "text-volt"} />
        <span className="text-[9px] font-bold tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-0.5 font-display text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label }: { icon: typeof Flame; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-surface-2 py-2 text-[10px] font-semibold text-foreground transition-colors hover:border-teal/60 hover:text-teal">
      <Icon size={14} />
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2">
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function ActionSheet({ player, onClose }: { player: Player; onClose: () => void }) {
  const actions = [
    { icon: ClipboardList, label: "Assign Program", desc: "Select a training program" },
    { icon: Dumbbell, label: "Assign Drill", desc: "Pick a drill from the library" },
    { icon: LineChart, label: "View Progress", desc: "Detailed performance metrics" },
    { icon: MessageSquare, label: "Send Message", desc: "Direct message to athlete" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-3xl border-t border-border/60 bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">COACH ACTIONS</p>
            <h3 className="mt-0.5 text-base font-bold text-foreground">{player.name}</h3>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface-2 px-4 py-3 text-left transition-colors hover:border-teal/60"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal">
                <a.icon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{a.label}</p>
                <p className="text-[11px] text-muted-foreground">{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}