import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, Eye, Zap, Activity, Crosshair, Cpu, Check } from "lucide-react";

export const Route = createFileRoute("/gameiq")({
  head: () => ({
    meta: [
      { title: "GameIQ — PXF Hockey" },
      { name: "description", content: "GameIQ Pods — Coming Soon. Join the waitlist." },
      { property: "og:title", content: "GameIQ — PXF Hockey" },
      { property: "og:description", content: "GameIQ Pods — Coming Soon. Join the waitlist." },
    ],
  }),
  component: GameIQ,
});

const pillars = [
  { name: "Decision Making", icon: Brain, tint: "teal" as const },
  { name: "Reaction Speed", icon: Zap, tint: "volt" as const },
  { name: "Scanning", icon: Eye, tint: "teal" as const },
  { name: "Awareness", icon: Activity, tint: "volt" as const },
  { name: "Visual Cue", icon: Crosshair, tint: "teal" as const },
];

function GameIQ() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  return (
    <div className="px-5 pt-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PXF · INTELLIGENCE LAYER</p>
        <h1 className="mt-1 text-3xl font-bold text-gradient-brand">GameIQ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Coming Soon — train how you see, decide and react before the puck arrives.</p>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-3xl border border-teal/30 bg-surface p-5 shadow-glow-teal">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 25% 30%, #00E5D6 0, transparent 55%), radial-gradient(circle at 80% 70%, #39FF14 0, transparent 55%)" }} />
        <div className="relative">
          <Cpu size={26} className="text-teal" />
          <p className="mt-3 text-[10px] font-bold tracking-[0.3em] text-volt">COMING SOON</p>
          <h2 className="mt-3 font-display text-2xl font-bold text-foreground">PODS · The Reaction System</h2>
          <p className="mt-1 text-sm text-muted-foreground">Visual cues, decision pressure, measurable response data. Built for ice + dryland. Launching after PXF Core.</p>
        </div>
      </div>

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">FOCUS PILLARS</h2>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {pillars.map(({ name, icon: Icon, tint }) => (
          <div key={name} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-surface p-2 text-center">
            <Icon size={18} className={tint === "teal" ? "text-teal" : "text-volt"} />
            <span className="text-[9px] font-semibold leading-tight text-foreground">{name}</span>
          </div>
        ))}
      </div>

      <div className="mt-7 mb-6 overflow-hidden rounded-3xl border border-volt/30 bg-surface p-5 shadow-glow-volt">
        <p className="text-[10px] font-bold tracking-[0.3em] text-volt">JOIN THE WAITLIST</p>
        <h2 className="mt-2 font-display text-xl font-bold text-foreground">Be first to try GameIQ</h2>
        <p className="mt-1 text-sm text-muted-foreground">We'll email you when GameIQ Pods go live.</p>
        {joined ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-teal/50 bg-teal/10 px-3 py-2.5 text-xs font-semibold text-teal">
            <Check size={14} /> You're on the list. We'll be in touch.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setJoined(true);
            }}
            className="mt-4 flex gap-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-volt"
            />
            <button
              type="submit"
              className="rounded-xl bg-volt px-4 py-2.5 text-[11px] font-bold tracking-wider text-background"
            >
              JOIN
            </button>
          </form>
        )}
      </div>
    </div>
  );
}