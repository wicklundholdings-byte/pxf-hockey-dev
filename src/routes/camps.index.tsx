import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listLiveCamps } from "@/lib/camps-public.functions";
import { Calendar, MapPin, ArrowRight, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/camps")({
  head: () => ({
    meta: [
      { title: "Upcoming Hockey Camps — PXF Hockey" },
      { name: "description", content: "Browse and register for upcoming PXF Hockey camps, clinics, and training programs." },
      { property: "og:title", content: "Upcoming Hockey Camps — PXF Hockey" },
      { property: "og:description", content: "Browse and register for upcoming PXF Hockey camps." },
    ],
  }),
  component: CampsPage,
});

type Camp = {
  id: string;
  name: string;
  slug: string;
  hero_image: string | null;
  venue_name: string | null;
  location_type: string;
  start_date: string | null;
  end_date: string | null;
  price_cents: number;
  capacity: number;
};

function fmt(d: string | null) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await listLiveCamps();
        setCamps((res.camps ?? []) as Camp[]);
        setErr(res.error ?? null);
      } catch {
        setErr("Unable to load camps");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="border-b border-border/60 bg-gradient-to-b from-teal/10 to-transparent px-5 pt-10 pb-8">
        <div className="mx-auto max-w-4xl">
          <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">EVENTS</span>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">Upcoming camps</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Hand-picked clinics, weekend intensives, and skill-development camps. Register online in under two minutes.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-4xl px-5">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : err ? (
          <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
            {err}
          </div>
        ) : camps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface p-10 text-center">
            <CalendarDays className="mx-auto text-muted-foreground" size={32} />
            <p className="mt-3 text-sm font-semibold text-foreground">No camps scheduled right now</p>
            <p className="mt-1 text-xs text-muted-foreground">Check back soon for new sessions.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {camps.map((c) => (
              <Link
                key={c.id}
                to="/book/$slug"
                params={{ slug: c.slug }}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:border-teal"
              >
                <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-teal/30 to-transparent">
                  {c.hero_image && (
                    <img src={c.hero_image} alt={c.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-display text-base font-bold text-foreground">{c.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-teal" /> {fmt(c.start_date)}
                      {c.end_date && c.end_date !== c.start_date && ` – ${fmt(c.end_date)}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-teal" />
                      {c.venue_name ?? (c.location_type === "online" ? "Online" : "TBA")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="font-display text-xl font-bold text-teal">${(c.price_cents / 100).toFixed(0)}</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                      Register <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}