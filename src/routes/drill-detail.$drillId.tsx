import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import {
  Play, ArrowLeft, BarChart3, Users, Wrench, Clock, ChevronRight, AlertTriangle,
  ListChecks, Heart, Plus, X, Sparkles, Calendar as CalendarIcon, CheckCircle2, Maximize2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { findDrill, relatedTo, type Drill } from "@/data/pxf";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/drill-detail/$drillId")({
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

const SESSIONS_KEY = "pxf:sessions:v2";
const AGE_GROUPS = ["U9+", "U11+", "U13+", "U15+"] as const;

type SessionBlock = { uid: string; drillId: string; mins: number };
type SavedSession = {
  id: string; name: string; date: string; age: string; level: string;
  totalMins: number; notes: string; blocks: SessionBlock[];
  completed?: boolean; completedAt?: string;
};

function readSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try { const raw = window.localStorage.getItem(SESSIONS_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function writeSessions(list: SavedSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("pxf:sessions-changed"));
}
function makeBlock(d: Drill): SessionBlock {
  return { uid: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, drillId: d.id, mins: d.durationMin };
}

function DrillDetail() {
  const d = Route.useLoaderData() as Drill;
  const router = useRouter();
  const related = relatedTo(d);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(d.id);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="bg-background pb-32">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/40 bg-background/85 px-4 py-3 backdrop-blur">
        <button onClick={() => router.history.back()} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface text-foreground">
          <ArrowLeft size={16} />
        </button>
        <p className="text-[10px] font-bold tracking-[0.32em] text-muted-foreground">DRILL DETAIL</p>
        <button
          onClick={() => { toggle(d.id); setToast(fav ? "Removed from favourites" : "Saved to favourites"); }}
          aria-label="Toggle favourite"
          className={"grid h-9 w-9 place-items-center rounded-full border transition-colors " + (fav ? "border-teal/60 bg-teal/15 text-teal" : "border-border/60 bg-surface text-muted-foreground")}
        >
          <Heart size={15} fill={fav ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mx-auto max-w-xl px-4 pt-5">
        {/* INFORMATION CARD */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-surface to-surface-2 p-5 shadow-xl">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-volt/10 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-bold tracking-[0.3em] text-teal">{d.category.toUpperCase()}</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-foreground">{d.name}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone="volt" icon={<BarChart3 size={11} />}>{d.difficulty}</Pill>
              <Pill tone="teal" icon={<Users size={11} />}>{d.ageGroup}</Pill>
              <Pill tone="teal" icon={<Clock size={11} />}>{d.durationMin} Minutes</Pill>
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-background/50 p-4">
              <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-volt">
                <Wrench size={11} /> REQUIRES
              </p>
              <ul className="mt-2 space-y-1.5">
                {d.equipment.map((e) => (
                  <li key={e} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* DRILL SETUP */}
        <SectionHeader>DRILL SETUP</SectionHeader>
        <div className="-mx-4 overflow-hidden border-y border-border/60 bg-black sm:mx-0 sm:rounded-3xl sm:border">
          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-[10px] font-bold tracking-[0.3em] text-teal">RINK SETUP</p>
            <span className="flex items-center gap-1 text-[10px] tracking-wider text-muted-foreground">
              <Maximize2 size={11} /> PINCH TO ZOOM
            </span>
          </div>
          <div className="w-full overflow-auto" style={{ touchAction: "pinch-zoom" }}>
            <RinkDiagram />
          </div>
          <SetupLegend />
        </div>

        {/* VIDEO DEMONSTRATION */}
        <SectionHeader>VIDEO DEMONSTRATION</SectionHeader>
        <div className="-mx-4 overflow-hidden border-y border-border/60 bg-black sm:mx-0 sm:rounded-3xl sm:border">
          <div className="relative aspect-video w-full">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(0,229,214,0.18),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(57,255,20,0.15),transparent_55%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <button aria-label="Play video" className="group grid h-20 w-20 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow-teal transition-transform hover:scale-105">
                <Play size={30} fill="currentColor" className="translate-x-0.5" />
              </button>
            </div>
            <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-wider">
              <span className="rounded-full bg-background/70 px-2 py-1 text-teal backdrop-blur">FULL SPEED</span>
              <span className="rounded-full bg-background/70 px-2 py-1 text-volt backdrop-blur">SLOW MOTION</span>
              <span className="rounded-full bg-background/70 px-2 py-1 text-foreground backdrop-blur">COACH DEMO</span>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <SectionHeader>OVERVIEW</SectionHeader>
        <p className="rounded-2xl border border-border/60 bg-surface px-4 py-4 text-sm leading-relaxed text-foreground">
          {d.blurb}
        </p>

        {/* COACHING POINTS */}
        <SectionHeader icon={<ListChecks size={12} className="text-teal" />}>COACHING POINTS</SectionHeader>
        <ul className="space-y-2">
          {d.notes.map((n) => (
            <li key={n} className="flex gap-3 rounded-2xl border border-border/60 bg-surface px-4 py-3 text-sm text-foreground">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal" />
              <span>{n}</span>
            </li>
          ))}
        </ul>

        {/* COMMON MISTAKES */}
        <SectionHeader icon={<AlertTriangle size={12} className="text-destructive" />}>COMMON MISTAKES</SectionHeader>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-destructive">
            <AlertTriangle size={11} /> AVOID
          </p>
          <ul className="mt-3 space-y-2">
            {d.mistakes.map((m) => (
              <li key={m} className="flex gap-3 text-sm text-foreground">
                <X size={16} className="mt-0.5 shrink-0 text-destructive" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* RELATED */}
        {related.length > 0 && (
          <>
            <SectionHeader>RELATED DRILLS</SectionHeader>
            <div className="space-y-2">
              {related.map((r) => (
                <Link key={r.id} to="/drill-detail/$drillId" params={{ drillId: r.id }} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface px-3 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-primary-foreground"><Play size={14} fill="currentColor" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-wider text-volt">{r.category.toUpperCase()}</p>
                    <p className="truncate text-sm font-bold text-foreground">{r.name}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
          <button
            onClick={() => { toggle(d.id); setToast(fav ? "Removed from favourites" : "Saved to favourites"); }}
            className={"flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition-colors " + (fav ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface text-foreground")}
          >
            <Heart size={16} fill={fav ? "currentColor" : "none"} />
            {fav ? "Favourited" : "Save"}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow-teal"
          >
            <Plus size={16} /> Add To Session
          </button>
        </div>
      </div>

      {addOpen && (
        <AddToSessionModal
          drill={d}
          onClose={() => setAddOpen(false)}
          onDone={(msg) => { setAddOpen(false); setToast(msg); }}
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

function Pill({ children, tone, icon }: { children: React.ReactNode; tone: "teal" | "volt"; icon?: React.ReactNode }) {
  const cls = tone === "teal" ? "border-teal/40 bg-teal/10 text-teal" : "border-volt/40 bg-volt/10 text-volt";
  return (
    <span className={"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold " + cls}>
      {icon}{children}
    </span>
  );
}

function SectionHeader({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-7 flex items-center gap-2 text-[11px] font-bold tracking-[0.32em] text-foreground/90">
      {icon}{children}
    </h2>
  );
}

function SetupLegend() {
  const items: { label: string; swatch: React.ReactNode }[] = [
    { label: "PXF Slip", swatch: <span className="block h-3 w-3 rounded-sm border border-teal bg-teal/30" /> },
    { label: "Cone", swatch: <span className="block h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-volt" /> },
    { label: "Puck", swatch: <span className="block h-2.5 w-2.5 rounded-full bg-foreground" /> },
    { label: "Player", swatch: <span className="grid h-4 w-4 place-items-center rounded-full bg-teal text-[8px] font-bold text-background">P</span> },
    { label: "Goalie", swatch: <span className="grid h-4 w-4 place-items-center rounded-full bg-volt text-[8px] font-bold text-background">G</span> },
    { label: "Net", swatch: <span className="block h-2.5 w-4 rounded-sm border border-foreground/70" /> },
    { label: "Pass", swatch: <span className="block h-0 w-5 border-t-2 border-dashed border-volt" /> },
    { label: "Skate", swatch: <span className="block h-0 w-5 border-t-2 border-teal" /> },
    { label: "Shot", swatch: <span className="block h-0 w-5 border-t-2 border-dotted border-destructive" /> },
  ];
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-2 border-t border-border/40 bg-background/60 px-4 py-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="grid w-6 place-items-center">{it.swatch}</span>
          {it.label}
        </div>
      ))}
    </div>
  );
}

function RinkDiagram() {
  return (
    <svg viewBox="0 0 640 360" className="block h-auto w-full min-w-[640px] select-none" role="img" aria-label="Drill setup diagram">
      <defs>
        <marker id="arrTeal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#00E5D6" />
        </marker>
        <marker id="arrVolt" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#39FF14" />
        </marker>
        <marker id="arrRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#ef4444" />
        </marker>
      </defs>
      {/* rink outline */}
      <rect x="8" y="8" width="624" height="344" rx="120" fill="#0b0b0d" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <line x1="320" y1="12" x2="320" y2="348" stroke="#00E5D6" strokeOpacity="0.35" strokeDasharray="6 4" />
      <circle cx="320" cy="180" r="36" fill="none" stroke="rgba(255,255,255,0.18)" />
      {/* goal lines */}
      <line x1="70" y1="40" x2="70" y2="320" stroke="rgba(255,0,0,0.35)" />
      <line x1="570" y1="40" x2="570" y2="320" stroke="rgba(255,0,0,0.35)" />
      {/* nets */}
      <rect x="52" y="160" width="18" height="40" fill="none" stroke="#fff" strokeWidth="1.5" />
      <rect x="570" y="160" width="18" height="40" fill="none" stroke="#fff" strokeWidth="1.5" />
      <text x="40" y="155" fontSize="10" fill="#94a3b8">NET</text>
      <text x="572" y="155" fontSize="10" fill="#94a3b8">NET</text>
      {/* PXF Slips */}
      {[[170, 110], [170, 250], [470, 110], [470, 250]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 9} y={y - 9} width="18" height="18" rx="3" fill="rgba(0,229,214,0.35)" stroke="#00E5D6" strokeWidth="1.5" />
          <text x={x + 14} y={y + 4} fontSize="9" fill="#00E5D6">SLIP</text>
        </g>
      ))}
      {/* Cones */}
      {[[260, 80], [260, 280], [380, 80], [380, 280]].map(([x, y], i) => (
        <g key={i}>
          <polygon points={`${x},${y - 8} ${x - 7},${y + 6} ${x + 7},${y + 6}`} fill="#39FF14" />
          <text x={x + 10} y={y + 8} fontSize="9" fill="#39FF14">CONE</text>
        </g>
      ))}
      {/* Pucks */}
      {[[120, 180], [130, 195], [140, 175], [150, 190], [160, 180]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#f8fafc" />
      ))}
      <text x="115" y="220" fontSize="9" fill="#94a3b8">PUCKS</text>
      {/* Player */}
      <circle cx="120" cy="180" r="10" fill="none" stroke="#00E5D6" strokeWidth="2" />
      <text x="116" y="184" fontSize="10" fill="#00E5D6" fontWeight="bold">P</text>
      <text x="100" y="158" fontSize="9" fill="#00E5D6">PLAYER</text>
      {/* Goalie */}
      <circle cx="585" cy="180" r="10" fill="none" stroke="#39FF14" strokeWidth="2" />
      <text x="581" y="184" fontSize="10" fill="#39FF14" fontWeight="bold">G</text>
      {/* Skating route (teal solid) */}
      <path d="M130,180 C200,80 280,260 360,140" fill="none" stroke="#00E5D6" strokeWidth="2.5" markerEnd="url(#arrTeal)" />
      {/* Passing route (volt dashed) */}
      <path d="M360,140 L470,170" fill="none" stroke="#39FF14" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#arrVolt)" />
      {/* Shooting route (red dotted) */}
      <path d="M470,170 L575,180" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="2 4" markerEnd="url(#arrRed)" />
    </svg>
  );
}

/* -------- Add to session modal (inline) -------- */
function AddToSessionModal({ drill, onClose, onDone }: { drill: Drill; onClose: () => void; onDone: (msg: string) => void }) {
  const [mode, setMode] = useState<"choose" | "existing" | "new">("choose");
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(`${drill.category} — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`);
  const [date, setDate] = useState(today);
  const [age, setAge] = useState<string>(drill.ageGroup ?? "U13+");
  const [duration, setDuration] = useState<number>(Math.max(60, Math.ceil(drill.durationMin / 5) * 5));

  useEffect(() => { setSessions(readSessions()); }, []);

  function togglePick(id: string) {
    setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function addToExisting() {
    if (picked.size === 0) return;
    const next = sessions.map((s) => picked.has(s.id) ? { ...s, blocks: [...s.blocks, makeBlock(drill)] } : s);
    writeSessions(next);
    onDone(`Drill Added To ${picked.size} Session${picked.size === 1 ? "" : "s"}`);
  }
  function createAndAdd() {
    if (!name.trim()) return;
    const fresh: SavedSession = {
      id: `s-${Date.now()}`, name: name.trim(), date, age,
      level: drill.difficulty ?? "Intermediate", totalMins: duration, notes: "",
      blocks: [makeBlock(drill)], completed: false,
    };
    writeSessions([fresh, ...sessions]);
    onDone("Drill Added To Session");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl border border-border/60 bg-surface p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] text-teal">ADD TO SESSION</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{drill.name}</h2>
            <p className="text-[11px] text-muted-foreground">{drill.category} · {drill.durationMin} min</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        {mode === "choose" && (
          <div className="mt-5 grid grid-cols-1 gap-2">
            <button onClick={() => setMode("existing")} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2 p-4 text-left hover:border-teal/40">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal"><ListChecks size={18} /></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Existing Session</p>
                <p className="text-[11px] text-muted-foreground">{sessions.length} saved · pick one or more</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <button onClick={() => setMode("new")} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-2 p-4 text-left hover:border-volt/40">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-volt/15 text-volt"><Sparkles size={18} /></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Create New Session</p>
                <p className="text-[11px] text-muted-foreground">Name, date, age, duration</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {mode === "existing" && (
          <div className="mt-5">
            <button onClick={() => setMode("choose")} className="text-[11px] font-semibold tracking-wider text-muted-foreground">← BACK</button>
            <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {sessions.length === 0 && (<p className="py-8 text-center text-sm text-muted-foreground">No saved sessions yet. Create one instead.</p>)}
              {sessions.map((s) => {
                const a = picked.has(s.id);
                return (
                  <button key={s.id} onClick={() => togglePick(s.id)} className={"flex w-full items-center gap-3 rounded-2xl border p-3 text-left " + (a ? "border-teal bg-teal/10" : "border-border/60 bg-surface-2")}>
                    <div className={"grid h-8 w-8 place-items-center rounded-full border " + (a ? "border-teal bg-teal text-background" : "border-border/60 text-muted-foreground")}>
                      {a ? <CheckCircle2 size={16} /> : <Plus size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.date} · {s.blocks.length} drills · {s.age}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button disabled={picked.size === 0} onClick={addToExisting} className="mt-4 w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-40">
              Add to {picked.size || 0} session{picked.size === 1 ? "" : "s"}
            </button>
          </div>
        )}

        {mode === "new" && (
          <div className="mt-5 space-y-3">
            <button onClick={() => setMode("choose")} className="text-[11px] font-semibold tracking-wider text-muted-foreground">← BACK</button>
            <Field label="Session Name">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Date" icon={<CalendarIcon size={12} />}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
              </Field>
              <Field label="Duration (min)">
                <input type="number" min={10} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 0)} className="w-full bg-transparent text-sm text-foreground focus:outline-none" />
              </Field>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground">AGE GROUP</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {AGE_GROUPS.map((g) => (
                  <button key={g} onClick={() => setAge(g)} className={"rounded-full border px-3 py-1 text-[11px] font-semibold " + (age === g ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface-2 text-muted-foreground")}>{g}</button>
                ))}
              </div>
            </div>
            <button onClick={createAndAdd} disabled={!name.trim()} className="mt-2 w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-40">
              Create & Add Drill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block rounded-xl border border-border/60 bg-surface-2 px-3 py-2">
      <p className="flex items-center gap-1 text-[9px] font-bold tracking-[0.3em] text-muted-foreground">{icon}{label}</p>
      <div className="mt-1">{children}</div>
    </label>
  );
}