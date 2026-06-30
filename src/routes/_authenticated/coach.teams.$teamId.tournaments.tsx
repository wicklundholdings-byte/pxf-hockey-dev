import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Calendar, MapPin, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/tournaments")({
  component: TournamentsRoute,
});

const ACTIVE = [
  {
    id: "spring-classic",
    name: "BC Minor AAA Spring Classic",
    dates: "Jul 18–21, 2026",
    location: "Langley Events Centre",
    status: "REGISTERED",
    record: "1W · 0L · 0OT",
  },
];

const PAST = [
  {
    id: "winter-invitational",
    name: "Lower Mainland Winter Invitational",
    dates: "Feb 14–16, 2026",
    placement: "🥈 2nd Place",
    record: "3W · 1L · 1OT",
  },
];

function TournamentsRoute() {
  const { teamId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/coach/teams/${teamId}/tournaments`;

  if (pathname.replace(/\/+$/, "") !== base) {
    return <Outlet />;
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Tournaments</h2>
        <button className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-bold text-background shadow-glow-teal active:opacity-90">
          <Plus size={14} /> Add Tournament
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active</h3>
        <div className="space-y-2">
          {ACTIVE.map((t) => (
            <Link
              key={t.id}
              to="/coach/teams/$teamId/tournaments/$tournamentId"
              params={{ teamId, tournamentId: t.id } as any}
              className="block rounded-2xl border border-border bg-surface p-4 active:bg-surface-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold leading-tight">{t.name}</h4>
                <span className="shrink-0 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">{t.status}</span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar size={12} /> {t.dates}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={12} /> {t.location}</p>
              <p className="mt-2 text-xs font-bold text-foreground">{t.record}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Past</h3>
        <div className="space-y-2">
          {PAST.map((t) => (
            <Link
              key={t.id}
              to="/coach/teams/$teamId/tournaments/$tournamentId"
              params={{ teamId, tournamentId: t.id } as any}
              className="block rounded-2xl border border-border bg-surface p-4 active:bg-surface-2"
            >
              <h4 className="font-bold leading-tight">{t.name}</h4>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar size={12} /> {t.dates}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold">{t.placement}</span>
                <span className="text-xs text-muted-foreground">{t.record}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}