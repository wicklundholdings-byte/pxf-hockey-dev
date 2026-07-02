import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ChevronLeft, Play, Pause, Maximize, ChevronDown, ChevronUp, Plus,
  Calendar as CalendarIcon, CheckCircle2, X,
} from "lucide-react";

const searchSchema = z.object({
  from: z.enum(["library", "mydrills", "favorites"]).optional(),
});

export const Route = createFileRoute("/playbook-drill/$drillId")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Drill — Playbook" },
      { name: "description", content: "Drill detail with progressions and coaching notes." },
    ],
  }),
  component: PlaybookDrillDetail,
});

type Progression = { title: string; body: string };
type MockDrill = {
  id: string;
  name: string;
  category: string;
  level: string;
  ages: string;
  duration: string;
  description: string;
  videoUrl?: string;
  progressions: Progression[];
  coachNotes: string;
};

const DEFAULT_DRILL: MockDrill = {
  id: "edge-mastery",
  name: "Edge Mastery Series",
  category: "SKATING",
  level: "INTERMEDIATE",
  ages: "Ages 10-16",
  duration: "30m",
  description:
    "Full-ice edge work progressions building speed and agility through progressive circuit training.",
  progressions: [
    { title: "Base", body: "4 players start in corners. Skate to nearest blue line, tight turn, return to start. Focus on knee bend." },
    { title: "Add timing", body: "All 4 go simultaneously. Avoid collisions, maintain spacing." },
    { title: "Add puck", body: "Carry puck through full circuit. Maintain edge quality with puck." },
    { title: "Game speed", body: "Full competition speed. Coach calls direction changes randomly." },
  ],
  coachNotes:
    "Watch for lazy edges on backhand side. Demand knee bend through every turn. Stop and correct before moving to progressions.",
};

const DRILLS: Record<string, MockDrill> = {
  [DEFAULT_DRILL.id]: DEFAULT_DRILL,
  "sk-1": DEFAULT_DRILL,
  "fav-mock-edge": DEFAULT_DRILL,
};

type FromKey = "library" | "mydrills" | "favorites";
const BACK_LABEL: Record<FromKey, string> = {
  library: "Library",
  mydrills: "My Drills",
  favorites: "Favorites",
};

const UPCOMING_PRACTICES = [
  { id: "p1", label: "Thu Jul 3 · Elite Demo · 6:00 PM", short: "Jul 3" },
  { id: "p2", label: "Sat Jul 5 · Atom Rep · 4:00 PM", short: "Jul 5" },
];

function PlaybookDrillDetail() {
  const { drillId } = Route.useParams();
  const { from } = Route.useSearch();
  const router = useRouter();
  const drill = DRILLS[drillId] ?? DEFAULT_DRILL;
  const backLabel = from ? BACK_LABEL[from as FromKey] : "Playbook";

  const [openIdx, setOpenIdx] = useState(0);
  const [notes, setNotes] = useState(drill.coachNotes);
  const [editingNotes, setEditingNotes] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="bg-background pb-28">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/40 bg-background/85 px-3 py-2.5 backdrop-blur">
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal"
        >
          <ChevronLeft size={18} /> {backLabel}
        </button>
        <p className="text-[10px] font-bold tracking-[0.32em] text-muted-foreground">DRILL</p>
        <div className="w-16" />
      </div>

      <VideoPlayer src={drill.videoUrl} />

      <div className="mx-auto max-w-xl px-4 pt-5">
        <p className="text-[10px] font-bold tracking-[0.3em] text-teal">{drill.category}</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-foreground">{drill.name}</h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-teal/40 bg-teal/10 px-2.5 py-1 text-[11px] font-bold text-teal">{drill.category}</span>
          <span className="rounded-full border border-volt/40 bg-volt/10 px-2.5 py-1 text-[11px] font-bold text-volt">{drill.level}</span>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-foreground">{drill.ages}</span>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-foreground">{drill.duration}</span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground/90">{drill.description}</p>

        <SectionHeader>RINK DIAGRAM</SectionHeader>
        <div className="-mx-4 overflow-hidden border-y border-border/60 bg-black sm:mx-0 sm:rounded-3xl sm:border">
          <RinkDiagram />
          <div className="flex justify-end px-4 py-2">
            <button className="text-[11px] font-semibold text-teal">View Full Screen</button>
          </div>
        </div>

        <SectionHeader>PROGRESSIONS</SectionHeader>
        <div className="space-y-2">
          {drill.progressions.map((p, i) => {
            const open = openIdx === i;
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-surface">
                <button
                  onClick={() => setOpenIdx(open ? -1 : i)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal/15 text-[12px] font-bold text-teal">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-foreground">{p.title}</span>
                  {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
                {open && (
                  <p className="border-t border-border/60 bg-background/40 px-4 py-3 text-sm text-foreground/90">
                    {p.body}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mb-3 mt-7 flex items-center justify-between">
          <h2 className="text-[11px] font-bold tracking-[0.32em] text-foreground/90">COACHING NOTES</h2>
          <button
            onClick={() => setEditingNotes((v) => !v)}
            className="text-[11px] font-semibold text-teal"
          >
            {editingNotes ? "Done" : "Edit"}
          </button>
        </div>
        {editingNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-border/60 bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-teal"
          />
        ) : (
          <p className="rounded-2xl border border-border/60 bg-surface px-4 py-4 text-sm leading-relaxed text-foreground/90">
            {notes.trim() ? notes : "Tap Edit to add coaching notes"}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 py-3">
          <button
            onClick={() => setAddOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow-teal"
          >
            <Plus size={16} /> Add to Practice Session
          </button>
        </div>
      </div>

      {addOpen && (
        <AddToSessionSheet
          onClose={() => setAddOpen(false)}
          onPick={(p) => {
            setAddOpen(false);
            setToast(`Added to ${p.short} practice ✓`);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-teal/40 bg-surface px-4 py-2 text-xs font-semibold text-teal shadow-glow-teal">
          {toast}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-7 text-[11px] font-bold tracking-[0.32em] text-foreground/90">{children}</h2>;
}

function VideoPlayer({ src }: { src?: string }) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoEl) videoEl.playbackRate = rate;
  }, [videoEl, rate]);

  if (!src) {
    return (
      <div className="flex h-56 w-full flex-col items-center justify-center gap-2 border-b border-border/60 bg-black text-muted-foreground">
        <Play size={32} />
        <p className="text-xs font-semibold">No video uploaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-black">
      <video
        ref={setVideoEl}
        src={src}
        controls
        playsInline
        className="aspect-video w-full"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-black/90 px-3 py-2">
        <button
          onClick={() => (playing ? videoEl?.pause() : videoEl?.play())}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground"
        >
          {playing ? <Pause size={12} /> : <Play size={12} />} {playing ? "Pause" : "Play"}
        </button>
        <div className="flex items-center gap-1">
          {([0.5, 1, 1.5, 2] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className={
                "rounded-full px-2 py-1 text-[10px] font-bold " +
                (rate === r ? "bg-teal text-background" : "bg-surface text-muted-foreground")
              }
            >
              {r}x
            </button>
          ))}
        </div>
        <button
          onClick={() => videoEl?.requestFullscreen?.()}
          className="rounded-full border border-border p-1.5 text-foreground"
          aria-label="Fullscreen"
        >
          <Maximize size={12} />
        </button>
      </div>
    </div>
  );
}

function RinkDiagram() {
  return (
    <svg viewBox="0 0 640 320" className="block h-auto w-full select-none" role="img" aria-label="Rink diagram">
      <defs>
        <marker id="pd-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#00E5D6" />
        </marker>
      </defs>
      <rect x="8" y="8" width="624" height="304" rx="110" fill="#0b0b0d" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <line x1="320" y1="12" x2="320" y2="308" stroke="#00E5D6" strokeOpacity="0.35" strokeDasharray="6 4" />
      <circle cx="320" cy="160" r="34" fill="none" stroke="rgba(255,255,255,0.18)" />
      {[
        { x: 120, y: 90, n: 1 },
        { x: 120, y: 230, n: 2 },
        { x: 520, y: 90, n: 3 },
        { x: 520, y: 230, n: 4 },
      ].map((p) => (
        <g key={p.n}>
          <circle cx={p.x} cy={p.y} r="14" fill="#00E5D6" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0b0b0d">{p.n}</text>
        </g>
      ))}
      {/* skating routes (solid) */}
      <path d="M134,90 C220,90 260,160 320,160" fill="none" stroke="#00E5D6" strokeWidth="2.5" markerEnd="url(#pd-arr)" />
      <path d="M134,230 C220,230 260,160 320,160" fill="none" stroke="#00E5D6" strokeWidth="2.5" markerEnd="url(#pd-arr)" />
      <path d="M506,90 C420,90 380,160 320,160" fill="none" stroke="#00E5D6" strokeWidth="2.5" markerEnd="url(#pd-arr)" />
      <path d="M506,230 C420,230 380,160 320,160" fill="none" stroke="#00E5D6" strokeWidth="2.5" markerEnd="url(#pd-arr)" />
      {/* pass path (dashed) */}
      <path d="M320,160 L440,120" fill="none" stroke="#39FF14" strokeWidth="2" strokeDasharray="6 4" />
      {/* puck movement (dotted) */}
      <path d="M200,200 L280,180" fill="none" stroke="#f8fafc" strokeWidth="2" strokeDasharray="2 4" />
    </svg>
  );
}

function AddToSessionSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (p: (typeof UPCOMING_PRACTICES)[number]) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-xl rounded-t-3xl border-t border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Add to which session?</p>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-foreground"><X size={14} /></button>
        </div>
        <ul className="space-y-2">
          {UPCOMING_PRACTICES.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-3 text-left"
              >
                <CalendarIcon size={16} className="text-teal" />
                <span className="flex-1 text-sm font-semibold text-foreground">{p.label}</span>
                <CheckCircle2 size={16} className="text-muted-foreground" />
              </button>
            </li>
          ))}
          <li>
            <button className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-background/30 px-4 py-3 text-left text-sm font-semibold text-teal">
              <Plus size={16} /> Create New Session
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

// keep unused import warning silent when video is absent
useMemo;