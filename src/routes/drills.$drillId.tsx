import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import {
  Play, ArrowLeft, BarChart3, Users, Wrench, Clock, ChevronRight, AlertTriangle, ListChecks, Layers,
} from "lucide-react";
import { findDrill, relatedTo, type Drill } from "@/data/pxf";

export const Route = createFileRoute("/drills/$drillId")({
  head: ({ params }) => {
    const d = params ? findDrill(params.drillId) : undefined;
    return {
      meta: [
        { title: d ? `${d.name} — PXF Hockey` : "Drill — PXF Hockey" },
        { name: "description", content: d?.blurb ?? "Drill detail." },
        { property: "og:title", content: d ? `${d.name} — PXF Hockey` : "Drill — PXF Hockey" },
        { property: "og:description", content: d?.blurb ?? "Drill detail." },
      ],
    };
  },
  loader: ({ params }) => {
    const d = findDrill(params.drillId);
    if (!d) throw notFound();
    return d;
  },
  notFoundComponent: () => (
    <div className="px-5 pt-10 text-center">
      <p className="text-sm text-muted-foreground">Drill not found.</p>
      <Link to="/drills" className="mt-3 inline-flex text-sm font-semibold text-teal">Back to drills</Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="px-5 pt-10 text-center">
      <p className="text-sm text-destructive">Something went wrong.</p>
      <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-3 text-sm font-semibold text-teal">Try again</button>
    </div>
  ),
  component: DrillDetail,
});

function DrillDetail() {
  const d = Route.useLoaderData() as Drill;
  const router = useRouter();
  const related = relatedTo(d);

  return (
    <div>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-surface-2 to-background">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 25% 30%, #00E5D6 0, transparent 55%), radial-gradient(circle at 80% 70%, #39FF14 0, transparent 55%)" }} />
        <button aria-label="Play video" className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal">
          <Play size={26} fill="currentColor" />
        </button>
        <button onClick={() => router.history.back()} aria-label="Back" className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur">
          <ArrowLeft size={16} />
        </button>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <span className="rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-teal backdrop-blur">{d.category.toUpperCase()}</span>
          <span className="rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-volt backdrop-blur">L{d.level}</span>
        </div>
      </div>

      <div className="px-5 pt-5">
        <h1 className="text-2xl font-bold text-foreground">{d.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{d.blurb}</p>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <Meta icon={BarChart3} value={d.difficulty} label="LEVEL" />
          <Meta icon={Users} value={d.ageGroup} label="AGE" />
          <Meta icon={Clock} value={`${d.durationMin}m`} label="TIME" />
          <Meta icon={Wrench} value={String(d.equipment.length)} label="GEAR" />
        </div>

        <Section icon={Wrench} title="Equipment">
          <div className="flex flex-wrap gap-2">
            {d.equipment.map((e) => (
              <span key={e} className="rounded-full border border-border/60 bg-surface-2 px-3 py-1 text-[11px] font-semibold text-foreground">{e}</span>
            ))}
          </div>
        </Section>

        <Section title="Diagram">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface p-3">
            <RinkDiagram />
          </div>
        </Section>

        <Section icon={ListChecks} title="Coaching Notes">
          <ul className="space-y-2">
            {d.notes.map((n) => (
              <li key={n} className="flex gap-2 rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={AlertTriangle} title="Common Mistakes">
          <ul className="space-y-2">
            {d.mistakes.map((m) => (
              <li key={m} className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Layers} title="Progressions">
          <ol className="space-y-2">
            {d.progressions.map((p, i) => (
              <li key={p} className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface px-3 py-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-brand text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                <span className="text-sm text-foreground">{p}</span>
              </li>
            ))}
          </ol>
        </Section>

        {related.length > 0 && (
          <Section title="Related Drills">
            <div className="space-y-2">
              {related.map((r) => (
                <Link key={r.id} to="/drills/$drillId" params={{ drillId: r.id }} className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface px-3 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-primary-foreground"><Play size={14} fill="currentColor" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-wider text-volt">{r.category.toUpperCase()}</p>
                    <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Section>
        )}

        <div className="sticky bottom-24 mt-8 mb-4">
          <Link to="/sessions" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-4 text-sm font-bold tracking-wide text-primary-foreground shadow-glow-teal">
            START SESSION
          </Link>
        </div>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, value, label }: { icon: typeof Play; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface p-2.5 text-center">
      <Icon size={14} className="mx-auto text-teal" />
      <p className="mt-1 font-display text-sm font-bold text-foreground">{value}</p>
      <p className="text-[9px] tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Play; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-foreground/90">
        {Icon ? <Icon size={13} className="text-teal" /> : null}
        {title.toUpperCase()}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function RinkDiagram() {
  return (
    <svg viewBox="0 0 320 140" className="h-auto w-full">
      <rect x="2" y="2" width="316" height="136" rx="60" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <line x1="160" y1="6" x2="160" y2="134" stroke="#00E5D6" strokeOpacity="0.5" strokeDasharray="4 3" />
      <circle cx="160" cy="70" r="22" fill="none" stroke="rgba(255,255,255,0.15)" />
      <path d="M70,70 C70,40 130,40 130,70 C130,100 190,100 190,70 C190,40 250,40 250,70 C250,100 190,100 190,70 C190,40 130,40 130,70 C130,100 70,100 70,70 Z" fill="none" stroke="#39FF14" strokeWidth="2" strokeDasharray="5 3" />
      {[[70, 50], [70, 90], [250, 50], [250, 90]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#00E5D6" />
      ))}
    </svg>
  );
}