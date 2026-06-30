import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MapPin, Calendar, X, Link2, FileText, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/tournaments/")({
  component: TournamentsTab,
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

function TournamentsTab() {
  const { teamId } = Route.useParams();
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Tournaments</h2>
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-bold text-background shadow-glow-teal active:opacity-90">
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

      {addOpen && <AddTournamentSheet onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddTournamentSheet({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [imported, setImported] = useState<null | { games: Array<{ opp: string; date: string; time: string; rink: string; conf: "high" | "low" }> }>(null);

  function doImport() {
    if (!url.trim()) return;
    setImported({
      games: [
        { opp: "Burnaby Winter Club", date: "Jul 18", time: "9:00 AM", rink: "Rink 1", conf: "high" },
        { opp: "Coquitlam Express", date: "Jul 19", time: "2:00 PM", rink: "Rink 3", conf: "high" },
        { opp: "North Delta Lightning", date: "Jul 20", time: "11:00 AM", rink: "Rink 2", conf: "low" },
      ],
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-base font-bold">Add Tournament</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <section className="rounded-2xl border border-teal/40 bg-teal/5 p-4">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal">
              <Sparkles size={12} /> 📎 Import Schedule
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">AI extracts games and pre-fills your itinerary.</p>

            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tournament website URL</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  className="flex-1 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs"
                />
                <button onClick={doImport} className="rounded-full border border-teal px-3 py-1.5 text-[11px] font-bold text-teal">
                  <Link2 size={12} className="mr-1 inline" /> Import
                </button>
              </div>
            </div>

            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-surface-2 px-3 py-2.5 text-xs font-bold">
              <FileText size={14} /> or upload tournament PDF
            </button>

            {imported && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extracted games — review & correct</p>
                {imported.games.map((g, i) => (
                  <div key={i} className="rounded-md border border-border bg-surface p-2">
                    <p className="text-xs font-bold">vs. {g.opp}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className={g.conf === "low" ? "rounded bg-amber-500/20 px-1 text-amber-400" : ""}>{g.date}</span>
                      {" · "}
                      <span className={g.conf === "low" ? "rounded bg-amber-500/20 px-1 text-amber-400" : ""}>{g.time}</span>
                      {" · "}{g.rink}
                    </p>
                  </div>
                ))}
                <p className="text-[10px] text-amber-400">Amber fields are uncertain — tap to correct.</p>
              </div>
            )}
          </section>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">or enter manually</p>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <input placeholder="Tournament name" className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Start date" className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-xs" />
              <input placeholder="End date" className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-xs" />
            </div>
            <input placeholder="Location / City" className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-xs" />
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <button onClick={onClose} className="w-full rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-background shadow-glow-teal">
            Create Tournament
          </button>
        </div>
      </div>
    </div>
  );
}
