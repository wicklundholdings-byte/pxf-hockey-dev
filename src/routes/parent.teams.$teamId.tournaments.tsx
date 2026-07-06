import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { MapPin, Calendar, Clock, ExternalLink, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/parent/teams/$teamId/tournaments")({
  component: TournamentsTab,
});

function TournamentsTab() {
  const { teamId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/parent/teams/${teamId}/tournaments`;
  const isList = pathname === base || pathname === base + "/";

  return (
    <div className="space-y-4 px-5 pb-8 pt-2">
      {/* Spring Showdown */}
      <Link
        to="/parent/teams/$teamId/tournaments/$tournamentId"
        params={{ teamId, tournamentId: "spring-showdown" }}
        className="block rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4 transition-colors hover:border-teal/30"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Spring Showdown</h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#A0A0A0]">
              <Calendar size={12} />
              <span>Apr 12–14</span>
              <span className="mx-1">·</span>
              <MapPin size={12} />
              <span>Oshawa</span>
            </div>
          </div>
          <span className="rounded-full bg-teal/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-teal">
            REGISTERED
          </span>
        </div>

        <div className="mt-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#222222] p-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#A0A0A0]">HOTEL</p>
          <p className="mt-1 text-sm font-semibold text-white">Holiday Inn Oshawa</p>
          <p className="text-xs text-[#A0A0A0]">Block rate $129/night</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-teal">
            Book Room <ExternalLink size={12} />
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#A0A0A0]">SCHEDULE</p>
          <div className="flex items-center gap-2 rounded-lg bg-[#222222] px-3 py-2">
            <span className="text-[10px] font-bold text-teal">FRI</span>
            <Clock size={11} className="text-[#A0A0A0]" />
            <span className="text-xs text-[#A0A0A0]">6:00 PM</span>
            <span className="text-xs font-semibold text-white">vs Thunder Bay</span>
            <span className="ml-auto text-[10px] text-[#A0A0A0]">Rink 3</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[#222222] px-3 py-2">
            <span className="text-[10px] font-bold text-teal">SAT</span>
            <Clock size={11} className="text-[#A0A0A0]" />
            <span className="text-xs text-[#A0A0A0]">10:30 AM</span>
            <span className="text-xs font-semibold text-white">vs Barrie Colts</span>
            <span className="ml-auto text-[10px] text-[#A0A0A0]">Rink 1</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[#222222] px-3 py-2">
            <span className="text-[10px] font-bold text-teal">SAT</span>
            <Clock size={11} className="text-[#A0A0A0]" />
            <span className="text-xs text-[#A0A0A0]">3:00 PM</span>
            <span className="text-xs font-semibold text-white">vs Sudbury Wolves</span>
            <span className="ml-auto text-[10px] text-[#A0A0A0]">Rink 2</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-teal">
          View Details <ChevronRight size={14} />
        </div>
      </Link>

      {/* Summer Cup */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A] p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Summer Cup</h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#A0A0A0]">
              <Calendar size={12} />
              <span>Jun 20–22</span>
              <span className="mx-1">·</span>
              <MapPin size={12} />
              <span>Toronto</span>
            </div>
          </div>
          <span className="rounded-full bg-[#333333] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#A0A0A0]">
            UPCOMING
          </span>
        </div>
      </div>
    </div>
  );
}
