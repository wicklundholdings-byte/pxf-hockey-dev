import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin, Calendar, ExternalLink, Phone, ChevronLeft,
  Bus, Swords, Utensils, BedDouble, Timer, ParkingCircle,
  Users, RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId/tournaments/$tournamentId")({
  component: TournamentDetail,
});

const ROSTER = [
  "Jake M", "Emma R", "Connor T", "Sofia K", "Liam P",
  "Noah J", "Owen B", "Ava L", "Ethan P", "Mia S",
  "Lucas W", "Chloe D", "Ben A", "Zoe K",
];

type TabKey = "overview" | "schedule" | "roster" | "logistics";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "schedule", label: "Schedule" },
  { key: "roster", label: "Roster" },
  { key: "logistics", label: "Logistics" },
];

type EventType = "TRANSPORT" | "GAME" | "MEAL" | "HOTEL";
const TYPE_STYLES: Record<EventType, { dot: string; chip: string; iconBg: string; iconColor: string }> = {
  TRANSPORT: { dot: "bg-orange-400", chip: "bg-orange-500/15 text-orange-300", iconBg: "bg-orange-500/15", iconColor: "text-orange-300" },
  GAME:      { dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-300" },
  MEAL:      { dot: "bg-fuchsia-400", chip: "bg-fuchsia-500/15 text-fuchsia-300", iconBg: "bg-fuchsia-500/15", iconColor: "text-fuchsia-300" },
  HOTEL:     { dot: "bg-sky-400", chip: "bg-sky-500/15 text-sky-300", iconBg: "bg-sky-500/15", iconColor: "text-sky-300" },
};

function TournamentDetail() {
  const { teamId } = Route.useParams();
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-5 px-5 pb-10 pt-2">
      <Link
        to="/parent/teams/$teamId/tournaments"
        params={{ teamId }}
        className="inline-flex items-center gap-1 text-xs font-bold text-teal"
      >
        <ChevronLeft size={14} /> Tournaments
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Spring Showdown</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar size={12} />
              <span>Apr 12–14</span>
              <span className="mx-1">·</span>
              <MapPin size={12} />
              <span>Oshawa, ON</span>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            IN PROGRESS
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition " +
              (tab === t.key
                ? "bg-gradient-brand text-background shadow-glow-teal"
                : "text-muted-foreground hover:text-white")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "schedule" && <ScheduleTab />}
      {tab === "roster" && <RosterTab />}
      {tab === "logistics" && <LogisticsTab />}
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Next Game</p>
        <p className="mt-2 text-base font-bold text-white">vs. Thunder Bay Kings</p>
        <p className="mt-1 text-xs text-muted-foreground">Today · 9:00 AM · Rink 3 · Oshawa Civic Arena</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Warmup starts in 25 min
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-xl border border-teal/30 bg-teal/5 p-3">
        <RefreshCw size={16} className="mt-0.5 shrink-0 text-teal" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Schedule synced with your calendar</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            All tournament events are on your device calendar. Updates arrive automatically.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Record So Far</p>
        <p className="mt-1 text-2xl font-bold text-white">0 – 0 – 0</p>
        <p className="text-xs text-muted-foreground">Pool play begins today</p>
      </section>
    </div>
  );
}

type TimelineItem = {
  time: string;
  type: EventType;
  title: string;
  location: string;
  icon: typeof Bus;
  rsvp?: boolean;
  result?: string;
};

const TIMELINE: TimelineItem[] = [
  { time: "6:30 AM", type: "TRANSPORT", title: "Bus Departure", location: "Surrey Sport & Leisure parking lot", icon: Bus, rsvp: true },
  { time: "9:00 AM", type: "GAME", title: "GAME 1 vs. Thunder Bay Kings", location: "Rink 3 · Oshawa Civic Arena", icon: Swords, result: "3-1 WIN" },
  { time: "12:00 PM", type: "MEAL", title: "Team Lunch", location: "Boston Pizza Oshawa", icon: Utensils, rsvp: true },
  { time: "3:00 PM", type: "HOTEL", title: "Hotel Check-in", location: "Holiday Inn Oshawa", icon: BedDouble },
];

function ScheduleTab() {
  return (
    <div className="relative space-y-3 pl-5">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
      {TIMELINE.map((it, i) => {
        const s = TYPE_STYLES[it.type];
        const Icon = it.icon;
        return (
          <div key={i} className="relative">
            <span className={`absolute -left-[18px] top-4 h-3 w-3 rounded-full ring-4 ring-background ${s.dot}`} />
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${s.iconBg}`}>
                  <Icon size={18} className={s.iconColor} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{it.time}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${s.chip}`}>
                      {it.type}
                    </span>
                    {it.result && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-300">
                        {it.result}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white">{it.title}</p>
                  <p className="text-[11px] text-muted-foreground">{it.location}</p>
                  {it.rsvp && (
                    <div className="mt-3 flex gap-2">
                      <button className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25">
                        Attending
                      </button>
                      <button className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-white">
                        Not Attending
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RosterTab() {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Users size={14} className="text-teal" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal">Roster</p>
        <span className="ml-auto text-xs font-bold text-white">14 of 16 confirmed</span>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {ROSTER.map((name, i) => {
          const initials = name.split(" ").map((n) => n[0]).join("");
          return (
            <div key={name} className="flex items-center gap-3 px-3 py-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{name}</p>
                <p className="text-[11px] text-muted-foreground">#{i + 4} · Forward</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                CONFIRMED
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogisticsTab() {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Hotel</p>
        <p className="mt-1 text-base font-bold text-white">Holiday Inn Oshawa</p>
        <p className="text-xs text-muted-foreground">Block rate $129/night</p>
        <p className="mt-1 text-xs text-amber-400">Deadline: Mar 28 · Rooms remaining: 4</p>
        <button className="mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-background shadow-glow-teal">
          Book Room <ExternalLink size={12} />
        </button>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
        <MapPin size={16} className="mt-0.5 shrink-0 text-teal" />
        <div>
          <p className="text-sm font-semibold text-white">Oshawa Civic Arena</p>
          <p className="text-xs text-muted-foreground">99 Athol St E, Oshawa, ON</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
        <ParkingCircle size={16} className="mt-0.5 shrink-0 text-teal" />
        <div>
          <p className="text-sm font-semibold text-white">Free parking</p>
          <p className="text-xs text-muted-foreground">East lot</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
        <Timer size={16} className="mt-0.5 shrink-0 text-teal" />
        <p className="text-sm font-semibold text-white">Arrive 45 min before game time</p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
        <Phone size={16} className="mt-0.5 shrink-0 text-teal" />
        <div>
          <p className="text-sm font-semibold text-white">Tournament Director: Mike Sands</p>
          <p className="text-xs text-muted-foreground">905-555-0192</p>
        </div>
      </div>
    </div>
  );
}
