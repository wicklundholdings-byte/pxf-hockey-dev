import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPin, Calendar, Clock, ExternalLink, Phone, ChevronLeft,
  Swords, Car, Timer, ParkingCircle, Users, Trophy,
} from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId/tournaments/$tournamentId")({
  component: TournamentDetail,
});

const ROSTER = [
  "Jake M", "Emma R", "Connor T", "Sofia K", "Liam P",
  "Noah J", "Owen B", "Ava L", "Ethan P", "Mia S",
  "Lucas W", "Chloe D", "Ben A", "Zoe K",
];

function TournamentDetail() {
  const { teamId } = Route.useParams();

  return (
    <div className="space-y-5 px-5 pb-10 pt-2">
      {/* Back link */}
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
              <span>Oshawa Civic Arena · Oshawa, ON</span>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-teal/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-teal">
            REGISTERED
          </span>
        </div>
      </div>

      {/* Pool Play Schedule */}
      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Pool Play Schedule
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/15">
              <Swords size={16} className="text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">vs Thunder Bay Kings</p>
              <p className="text-[11px] text-muted-foreground">Fri Apr 12 · 6:00 PM · Rink 3</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/15">
              <Swords size={16} className="text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">vs Barrie Colts</p>
              <p className="text-[11px] text-muted-foreground">Sat Apr 13 · 10:30 AM · Rink 1</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/15">
              <Swords size={16} className="text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">vs Sudbury Wolves</p>
              <p className="text-[11px] text-muted-foreground">Sat Apr 13 · 3:00 PM · Rink 2</p>
            </div>
          </div>
        </div>
      </section>

      {/* Standings */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={14} className="text-teal" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal">Standings</p>
        </div>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="grid grid-cols-5 gap-2 border-b border-border bg-surface-2 px-3 py-2 text-[10px] font-bold tracking-wider text-muted-foreground">
            <span>Team</span>
            <span className="text-center">GP</span>
            <span className="text-center">W</span>
            <span className="text-center">L</span>
            <span className="text-center">PTS</span>
          </div>
          {[
            { name: "Lightning U14", gp: 0, w: 0, l: 0, pts: 0, me: true },
            { name: "Thunder Bay Kings", gp: 0, w: 0, l: 0, pts: 0 },
            { name: "Barrie Colts", gp: 0, w: 0, l: 0, pts: 0 },
            { name: "Sudbury Wolves", gp: 0, w: 0, l: 0, pts: 0 },
          ].map((r, i) => (
            <div
              key={r.name}
              className={
                "grid grid-cols-5 gap-2 px-3 py-2 text-xs " +
                (i > 0 ? "border-t border-border" : "") +
                (r.me ? " bg-teal/10 font-bold text-teal" : " text-foreground")
              }
            >
              <span className="truncate">{r.name}</span>
              <span className="text-center">{r.gp}</span>
              <span className="text-center">{r.w}</span>
              <span className="text-center">{r.l}</span>
              <span className="text-center">{r.pts}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Bracket */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Bracket</p>
        <p className="mt-1 text-sm font-semibold text-white">
          Bracket announced Apr 13 after pool play
        </p>
      </section>

      {/* Hotel */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Hotel</p>
        <p className="mt-1 text-base font-bold text-white">Holiday Inn Oshawa</p>
        <p className="text-xs text-muted-foreground">Block rate $129/night</p>
        <p className="mt-1 text-xs text-amber-400">Deadline: Mar 28</p>
        <p className="mt-1 text-xs text-muted-foreground">Rooms remaining: 4</p>
        <button className="mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-background shadow-glow-teal">
          Book Room <ExternalLink size={12} />
        </button>
      </section>

      {/* Logistics */}
      <section>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Logistics</p>
        <div className="space-y-2">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <MapPin size={16} className="mt-0.5 shrink-0 text-teal" />
            <div>
              <p className="text-sm font-semibold text-white">Oshawa Civic Arena</p>
              <p className="text-xs text-muted-foreground">99 Athol St E</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <ParkingCircle size={16} className="mt-0.5 shrink-0 text-teal" />
            <div>
              <p className="text-sm font-semibold text-white">Free parking</p>
              <p className="text-xs text-muted-foreground">East lot</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <Timer size={16} className="mt-0.5 shrink-0 text-teal" />
            <p className="text-sm font-semibold text-white">Arrive 45 min before game time</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
            <Phone size={16} className="mt-0.5 shrink-0 text-teal" />
            <div>
              <p className="text-sm font-semibold text-white">Tournament Director: Mike Sands</p>
              <p className="text-xs text-muted-foreground">905-555-0192</p>
            </div>
          </div>
        </div>
      </section>

      {/* Roster Attending */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-teal" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal">Roster Attending</p>
          <span className="ml-auto text-xs font-bold text-white">14 of 16 confirmed</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ROSTER.map((name) => {
            const initials = name.split(" ").map((n) => n[0]).join("");
            return (
              <div
                key={name}
                className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1.5"
              >
                <div className="grid h-6 w-6 place-items-center rounded-full bg-teal/15 text-[10px] font-bold text-teal">
                  {initials}
                </div>
                <span className="text-xs font-medium text-white">{name}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
