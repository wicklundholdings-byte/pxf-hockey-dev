import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Check, Play, Clock, ChevronRight } from "lucide-react";
import { PATHWAYS } from "@/data/pxf";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "Pathways — PXF Hockey" },
      { name: "description", content: "Progression pathways: unlock the next flow when you complete the current one." },
      { property: "og:title", content: "Pathways — PXF Hockey" },
      { property: "og:description", content: "Progression pathways for elite hockey development." },
    ],
  }),
  component: Programs,
});

function Programs() {
  return (
    <div className="px-5 pt-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PROGRESSION PATHWAYS</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Pathways</h1>
        <p className="mt-1 text-sm text-muted-foreground">Follow the flow. Complete one to unlock the next.</p>
      </div>

      <div className="mt-6 space-y-5">
        {PATHWAYS.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-3xl border border-border/60 bg-surface">
            <div className="relative h-20 bg-gradient-to-br from-surface-2 to-background">
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #00E5D6 0, transparent 55%), radial-gradient(circle at 80% 70%, #39FF14 0, transparent 55%)" }} />
              <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-teal backdrop-blur">{p.category.toUpperCase()}</span>
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-volt backdrop-blur">
                <Clock size={11} /> {p.estimatedHours}h
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-bold text-foreground">{p.title}</h2>
                <span className="font-display text-lg font-bold text-teal">{p.percent}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${p.percent}%` }} />
              </div>

              <ol className="mt-5 space-y-0">
                {p.flows.map((f, i) => (
                  <li key={f.name} className="relative pl-10">
                    {i < p.flows.length - 1 && (
                      <span className={"absolute left-4 top-8 h-full w-px " + (f.status === "done" ? "bg-teal/60" : "bg-border")} />
                    )}
                    <div className="flex items-center gap-3 py-2.5">
                      <span
                        className={
                          "absolute left-0 grid h-8 w-8 place-items-center rounded-full text-xs font-bold " +
                          (f.status === "done"
                            ? "bg-gradient-brand text-primary-foreground shadow-glow-teal"
                            : f.status === "active"
                            ? "border-2 border-teal bg-background text-teal"
                            : "border border-border bg-surface-2 text-muted-foreground")
                        }
                      >
                        {f.status === "done" ? <Check size={14} /> : f.status === "locked" ? <Lock size={12} /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={"text-sm font-semibold " + (f.status === "locked" ? "text-muted-foreground" : "text-foreground")}>
                          {f.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {f.status === "done" ? "Completed" : f.status === "active" ? "In progress" : "Locked"}
                        </p>
                      </div>
                      {f.status === "active" && (
                        <Link to="/sessions" className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-primary-foreground" aria-label="Continue">
                          <Play size={12} fill="currentColor" />
                        </Link>
                      )}
                      {f.status === "done" && <ChevronRight size={16} className="text-muted-foreground" />}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}