import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Save, Trash2, Copy, RotateCw, Move, Pencil, Tag,
  Layers, Cone, Disc, Users, ShieldCheck, Goal, Cpu, Sparkles,
  MousePointer2, Square, Slash, Spline, Undo2, Plus, X, Check, Heart,
} from "lucide-react";
import { CATEGORIES } from "@/data/pxf";

export const Route = createFileRoute("/drill-builder")({
  head: () => ({
    meta: [
      { title: "Drill Builder — PXF Hockey" },
      { name: "description", content: "Design your own hockey drills with the PXF Drill Builder." },
    ],
  }),
  component: DrillBuilder,
});

/* ---------- Storage ---------- */

const CUSTOM_DRILLS_KEY = "pxf:custom-drills:v1";
const FAV_CUSTOM_KEY = "pxf:custom-drills-fav:v1";
const SESSIONS_KEY = "pxf:sessions:v2";

type RinkTemplate = "full" | "half" | "offensive" | "defensive" | "neutral" | "station";

type EquipmentKind =
  | "slip" | "cone" | "puck" | "player" | "goalie" | "net" | "pod";

type CanvasItem = {
  id: string;
  kind: EquipmentKind;
  x: number; // 0..1 of canvas width
  y: number; // 0..1 of canvas height
  rot: number;
  scale: number;
  label?: string;
};

type RouteStyle = "skate" | "pass" | "shoot" | "return" | "decision";

type DrillRoute = {
  id: string;
  style: RouteStyle;
  points: { x: number; y: number }[];
};

type CustomDrill = {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  ageGroup: string;
  durationMin: number;
  equipment: string[];
  description: string;
  coachingPoints: string[];
  commonMistakes: string[];
  progressions: string[];
  template: RinkTemplate;
  items: CanvasItem[];
  routes: DrillRoute[];
  createdAt: string;
  updatedAt: string;
};

function loadDrills(): CustomDrill[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_DRILLS_KEY);
    return raw ? (JSON.parse(raw) as CustomDrill[]) : [];
  } catch { return []; }
}
function saveDrills(list: CustomDrill[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_DRILLS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("pxf:custom-drills-changed"));
}
function loadFavSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(FAV_CUSTOM_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function saveFavSet(s: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAV_CUSTOM_KEY, JSON.stringify([...s]));
}

/* ---------- Constants ---------- */

const AGE_GROUPS = ["U9+", "U11+", "U13+", "U15+"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"] as const;

const EQUIPMENT: { kind: EquipmentKind; label: string; Icon: typeof Cone }[] = [
  { kind: "slip",   label: "PXF Slip",   Icon: Sparkles },
  { kind: "cone",   label: "Cone",       Icon: Cone },
  { kind: "puck",   label: "Puck",       Icon: Disc },
  { kind: "player", label: "Player",     Icon: Users },
  { kind: "goalie", label: "Goalie",     Icon: ShieldCheck },
  { kind: "net",    label: "Net",        Icon: Goal },
  { kind: "pod",    label: "GameIQ Pod", Icon: Cpu },
];

const TEMPLATES: { key: RinkTemplate; label: string }[] = [
  { key: "full",       label: "Full Ice" },
  { key: "half",       label: "Half Ice" },
  { key: "offensive",  label: "Offensive Zone" },
  { key: "defensive",  label: "Defensive Zone" },
  { key: "neutral",    label: "Neutral Zone" },
  { key: "station",    label: "Station Layout" },
];

const ROUTE_STYLES: { key: RouteStyle; label: string; color: string; dash?: string; arrow: "solid" | "open" | "barb" }[] = [
  { key: "skate",    label: "Skate",    color: "#00E5D6", arrow: "solid" },
  { key: "pass",     label: "Pass",     color: "#39FF14", dash: "2 6", arrow: "open" },
  { key: "shoot",    label: "Shoot",    color: "#FF3B5C", dash: "10 4 2 4", arrow: "barb" },
  { key: "return",   label: "Return",   color: "#9AE6FF", dash: "6 4", arrow: "solid" },
  { key: "decision", label: "Decision", color: "#FFD166", dash: "1 6", arrow: "open" },
];

type Tool =
  | { kind: "select" }
  | { kind: "place"; equipment: EquipmentKind }
  | { kind: "draw"; style: RouteStyle };

/* ---------- Component ---------- */

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function DrillBuilder() {
  const navigate = useNavigate();
  const [tool, setTool] = useState<Tool>({ kind: "select" });
  const [template, setTemplate] = useState<RinkTemplate>("full");
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [routes, setRoutes] = useState<DrillRoute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // details
  const [name, setName] = useState("Untitled Drill");
  const [category, setCategory] = useState<string>(CATEGORIES[0].name);
  const [difficulty, setDifficulty] = useState<string>("Intermediate");
  const [ageGroup, setAgeGroup] = useState<string>("U13+");
  const [durationMin, setDurationMin] = useState<number>(10);
  const [equipmentList, setEquipmentList] = useState<string>("Cones, Pucks");
  const [description, setDescription] = useState("");
  const [coachingPoints, setCoachingPoints] = useState("");
  const [commonMistakes, setCommonMistakes] = useState("");
  const [progressions, setProgressions] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const draftRouteRef = useRef<DrillRoute | null>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  function getPoint(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    const p = getPoint(e);
    if (tool.kind === "place") {
      const it: CanvasItem = { id: uid("it"), kind: tool.equipment, x: p.x, y: p.y, rot: 0, scale: 1 };
      setItems((s) => [...s, it]);
      setSelectedId(it.id);
      setSelectedRouteId(null);
      setTool({ kind: "select" });
      return;
    }
    if (tool.kind === "draw") {
      const r: DrillRoute = { id: uid("rt"), style: tool.style, points: [p] };
      draftRouteRef.current = r;
      setRoutes((s) => [...s, r]);
      setSelectedRouteId(r.id);
      setSelectedId(null);
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    // select on empty
    setSelectedId(null);
    setSelectedRouteId(null);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    const p = getPoint(e);
    if (tool.kind === "draw" && draftRouteRef.current) {
      const id = draftRouteRef.current.id;
      setRoutes((s) =>
        s.map((r) => (r.id === id ? { ...r, points: [...r.points, p] } : r)),
      );
      return;
    }
    if (dragRef.current) {
      const { id, offX, offY } = dragRef.current;
      setItems((s) =>
        s.map((i) =>
          i.id === id ? { ...i, x: clamp(p.x - offX, 0, 1), y: clamp(p.y - offY, 0, 1) } : i,
        ),
      );
    }
  }

  function onCanvasPointerUp(e: React.PointerEvent) {
    if (tool.kind === "draw") {
      draftRouteRef.current = null;
      setTool({ kind: "select" });
    }
    dragRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  function startDragItem(e: React.PointerEvent, it: CanvasItem) {
    if (tool.kind !== "select") return;
    e.stopPropagation();
    setSelectedId(it.id);
    setSelectedRouteId(null);
    const p = getPoint(e);
    dragRef.current = { id: it.id, offX: p.x - it.x, offY: p.y - it.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function deleteSelected() {
    if (selectedId) setItems((s) => s.filter((i) => i.id !== selectedId));
    if (selectedRouteId) setRoutes((s) => s.filter((r) => r.id !== selectedRouteId));
    setSelectedId(null); setSelectedRouteId(null);
  }
  function duplicateSelected() {
    if (selectedItem) {
      const n = { ...selectedItem, id: uid("it"), x: clamp(selectedItem.x + 0.04, 0, 1), y: clamp(selectedItem.y + 0.04, 0, 1) };
      setItems((s) => [...s, n]);
      setSelectedId(n.id);
    } else if (selectedRoute) {
      const n = { ...selectedRoute, id: uid("rt"), points: selectedRoute.points.map((p) => ({ x: clamp(p.x + 0.03, 0, 1), y: clamp(p.y + 0.03, 0, 1) })) };
      setRoutes((s) => [...s, n]);
      setSelectedRouteId(n.id);
    }
  }
  function rotateSelected() {
    if (!selectedItem) return;
    setItems((s) => s.map((i) => i.id === selectedItem.id ? { ...i, rot: (i.rot + 15) % 360 } : i));
  }
  function resizeSelected(delta: number) {
    if (!selectedItem) return;
    setItems((s) => s.map((i) => i.id === selectedItem.id ? { ...i, scale: clamp(i.scale + delta, 0.5, 2.5) } : i));
  }
  function relabelSelected(label: string) {
    if (!selectedItem) return;
    setItems((s) => s.map((i) => i.id === selectedItem.id ? { ...i, label } : i));
  }
  function changeRouteStyle(style: RouteStyle) {
    if (!selectedRoute) return;
    setRoutes((s) => s.map((r) => r.id === selectedRoute.id ? { ...r, style } : r));
  }
  function clearCanvas() {
    setItems([]); setRoutes([]); setSelectedId(null); setSelectedRouteId(null);
  }

  function buildDrill(id?: string): CustomDrill {
    const now = new Date().toISOString();
    return {
      id: id ?? uid("cd"),
      name: name.trim() || "Untitled Drill",
      category, difficulty, ageGroup,
      durationMin: Math.max(1, Math.min(120, Number(durationMin) || 10)),
      equipment: equipmentList.split(",").map((s) => s.trim()).filter(Boolean),
      description,
      coachingPoints: splitLines(coachingPoints),
      commonMistakes: splitLines(commonMistakes),
      progressions: splitLines(progressions),
      template, items, routes,
      createdAt: now, updatedAt: now,
    };
  }

  function saveToMyDrills(opts: { favourite?: boolean; addToSession?: string | null; duplicate?: boolean }) {
    const all = loadDrills();
    const drill = buildDrill();
    const next = [drill, ...all];
    if (opts.duplicate) next.unshift({ ...drill, id: uid("cd"), name: `${drill.name} (Copy)` });
    saveDrills(next);
    if (opts.favourite) {
      const set = loadFavSet();
      set.add(drill.id);
      saveFavSet(set);
    }
    if (opts.addToSession) addDrillToSession(opts.addToSession, drill);
    setShowSave(false);
    setToast("Drill saved to My Drills");
    setTimeout(() => navigate({ to: "/drills" }), 800);
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-2 border-b border-border/60 bg-surface/80 px-3 py-2 backdrop-blur">
        <Link to="/drills" aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.3em] text-teal">DRILL BUILDER</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full truncate bg-transparent text-base font-bold text-foreground focus:outline-none"
          />
        </div>
        <button onClick={() => setShowDetails(true)} className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-foreground" aria-label="Details">
          <Layers size={15} />
        </button>
        <button onClick={() => setShowSave(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-brand px-3 text-[12px] font-bold text-primary-foreground shadow-glow-teal">
          <Save size={14} /> SAVE
        </button>
      </header>

      {/* Template row */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border/60 bg-surface/60 px-3 py-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTemplate(t.key)}
            className={"shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors " +
              (template === t.key
                ? "border-teal bg-teal/15 text-teal"
                : "border-border/60 bg-surface-2 text-muted-foreground")}
          >{t.label}</button>
        ))}
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden bg-background">
        <div className="absolute inset-2 overflow-hidden rounded-2xl border border-border/60 bg-[oklch(0.97_0.01_220)]">
          <svg
            ref={svgRef}
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            className="h-full w-full touch-none select-none"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
          >
            <Rink template={template} />
            <defs>
              {ROUTE_STYLES.map((rs) => (
                <marker key={rs.key} id={`arrow-${rs.key}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  {rs.arrow === "open" ? (
                    <path d="M0,0 L10,5 L0,10" fill="none" stroke={rs.color} strokeWidth="2" />
                  ) : rs.arrow === "barb" ? (
                    <path d="M0,0 L10,5 L0,10 L4,5 z" fill={rs.color} />
                  ) : (
                    <path d="M0,0 L10,5 L0,10 z" fill={rs.color} />
                  )}
                </marker>
              ))}
            </defs>

            {/* Routes */}
            {routes.map((r) => {
              const style = ROUTE_STYLES.find((s) => s.key === r.style)!;
              if (r.points.length < 2) return null;
              const d = toSmoothPath(r.points);
              const isSel = r.id === selectedRouteId;
              return (
                <g key={r.id} onPointerDown={(e) => { e.stopPropagation(); setSelectedRouteId(r.id); setSelectedId(null); }}>
                  <path d={d} transform="scale(1000 600)" fill="none" stroke="transparent" strokeWidth="20" />
                  <path
                    d={d}
                    transform="scale(1000 600)"
                    fill="none"
                    stroke={style.color}
                    strokeWidth={isSel ? 4 : 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={style.dash}
                    markerEnd={`url(#arrow-${style.key})`}
                    opacity={isSel ? 1 : 0.95}
                  />
                </g>
              );
            })}

            {/* Items */}
            {items.map((it) => (
              <ItemNode
                key={it.id}
                item={it}
                selected={it.id === selectedId}
                onPointerDown={(e) => startDragItem(e, it)}
              />
            ))}
          </svg>
        </div>

        {/* Floating action chips (selection) */}
        {(selectedItem || selectedRoute) && (
          <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-teal/40 bg-surface/95 px-2 py-1.5 shadow-glow-teal backdrop-blur">
            {selectedItem && (
              <>
                <ChipBtn onClick={rotateSelected} title="Rotate"><RotateCw size={14} /></ChipBtn>
                <ChipBtn onClick={() => resizeSelected(0.15)} title="Bigger"><Plus size={14} /></ChipBtn>
                <ChipBtn onClick={() => resizeSelected(-0.15)} title="Smaller">−</ChipBtn>
                <ChipBtn onClick={() => {
                  const v = window.prompt("Label", selectedItem.label ?? "");
                  if (v !== null) relabelSelected(v);
                }} title="Label"><Tag size={14} /></ChipBtn>
              </>
            )}
            {selectedRoute && (
              <div className="flex items-center gap-1">
                {ROUTE_STYLES.map((rs) => (
                  <button
                    key={rs.key}
                    onClick={() => changeRouteStyle(rs.key)}
                    title={rs.label}
                    className={"h-6 w-6 rounded-full border " + (selectedRoute.style === rs.key ? "border-foreground" : "border-transparent")}
                    style={{ background: rs.color }}
                  />
                ))}
              </div>
            )}
            <ChipBtn onClick={duplicateSelected} title="Duplicate"><Copy size={14} /></ChipBtn>
            <ChipBtn onClick={deleteSelected} title="Delete" danger><Trash2 size={14} /></ChipBtn>
          </div>
        )}

        <button
          onClick={clearCanvas}
          className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full border border-border/60 bg-surface/90 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground backdrop-blur"
        ><Undo2 size={12} /> Clear</button>
      </div>

      {/* Tool dock */}
      <div className="border-t border-border/60 bg-surface px-3 pb-3 pt-2">
        <p className="mb-1 text-[10px] font-bold tracking-[0.3em] text-volt">EQUIPMENT</p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
          <ToolBtn
            active={tool.kind === "select"}
            onClick={() => setTool({ kind: "select" })}
            Icon={MousePointer2}
            label="Select"
          />
          {EQUIPMENT.map((e) => (
            <ToolBtn
              key={e.kind}
              active={tool.kind === "place" && tool.equipment === e.kind}
              onClick={() => setTool({ kind: "place", equipment: e.kind })}
              Icon={e.Icon}
              label={e.label}
            />
          ))}
        </div>
        <p className="mb-1 mt-1 text-[10px] font-bold tracking-[0.3em] text-teal">ROUTES</p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
          {ROUTE_STYLES.map((rs) => (
            <button
              key={rs.key}
              onClick={() => setTool({ kind: "draw", style: rs.key })}
              className={"shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors " +
                (tool.kind === "draw" && tool.style === rs.key
                  ? "border-teal bg-teal/15 text-teal"
                  : "border-border/60 bg-surface-2 text-muted-foreground")}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: rs.color }} />
              {rs.label}
            </button>
          ))}
        </div>
      </div>

      {/* Details sheet */}
      {showDetails && (
        <Sheet onClose={() => setShowDetails(false)} title="Drill Details">
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Difficulty">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputCls}>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Age Group">
              <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className={inputCls}>
                {AGE_GROUPS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Duration (min)">
              <input type="number" min={1} max={120} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className={inputCls} />
            </Field>
          </div>
          <Field label="Equipment Required (comma separated)">
            <input value={equipmentList} onChange={(e) => setEquipmentList(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Coaching Points (one per line)">
            <textarea rows={3} value={coachingPoints} onChange={(e) => setCoachingPoints(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Common Mistakes (one per line)">
            <textarea rows={3} value={commonMistakes} onChange={(e) => setCommonMistakes(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Progressions (one per line)">
            <textarea rows={3} value={progressions} onChange={(e) => setProgressions(e.target.value)} className={inputCls} />
          </Field>
          <button
            onClick={() => setShowDetails(false)}
            className="mt-2 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground shadow-glow-teal"
          >Done</button>
        </Sheet>
      )}

      {/* Save sheet */}
      {showSave && (
        <SaveSheet
          onClose={() => setShowSave(false)}
          onSave={saveToMyDrills}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-5">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-teal/40 bg-surface/95 px-4 py-2.5 text-sm font-semibold text-teal shadow-glow-teal backdrop-blur">
            <Check size={16} /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ChipBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={"grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold " +
        (danger ? "bg-destructive/20 text-destructive" : "bg-surface-2 text-foreground")}
    >{children}</button>
  );
}

function ToolBtn({ active, onClick, Icon, label }: { active: boolean; onClick: () => void; Icon: typeof Cone; label: string }) {
  return (
    <button
      onClick={onClick}
      className={"shrink-0 flex w-16 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-semibold transition-colors " +
        (active ? "border-teal bg-teal/15 text-teal" : "border-border/60 bg-surface-2 text-muted-foreground")}
    >
      <Icon size={16} />
      <span className="truncate">{label}</span>
    </button>
  );
}

const inputCls = "w-full rounded-xl border border-border/60 bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal/60 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold tracking-[0.3em] text-muted-foreground">{label.toUpperCase()}</p>
      {children}
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border/60 bg-surface p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground" aria-label="Close"><X size={14} /></button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function SaveSheet({ onClose, onSave }: { onClose: () => void; onSave: (opts: { favourite?: boolean; addToSession?: string | null; duplicate?: boolean }) => void }) {
  const [favourite, setFavourite] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [sessionId, setSessionId] = useState<string | "">("");
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSIONS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setSessions(list.map((s: any) => ({ id: s.id, name: s.name })));
    } catch {}
  }, []);
  return (
    <Sheet title="Save Drill" onClose={onClose}>
      <p className="text-sm text-muted-foreground">Choose where this drill goes.</p>
      <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm text-foreground"><Heart size={14} className="text-teal" /> Add to Favourites</span>
        <input type="checkbox" checked={favourite} onChange={(e) => setFavourite(e.target.checked)} className="h-4 w-4 accent-teal" />
      </label>
      <label className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-2 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm text-foreground"><Copy size={14} className="text-volt" /> Also save a duplicate to edit later</span>
        <input type="checkbox" checked={duplicate} onChange={(e) => setDuplicate(e.target.checked)} className="h-4 w-4 accent-teal" />
      </label>
      <Field label="Add to a Session (optional)">
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className={inputCls}>
          <option value="">— None —</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <button
        onClick={() => onSave({ favourite, duplicate, addToSession: sessionId || null })}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground shadow-glow-teal"
      ><Save size={14} /> Save to My Drills</button>
    </Sheet>
  );
}

/* ---------- Canvas pieces ---------- */

function ItemNode({ item, selected, onPointerDown }: { item: CanvasItem; selected: boolean; onPointerDown: (e: React.PointerEvent) => void }) {
  const cx = item.x * 1000;
  const cy = item.y * 600;
  const s = item.scale;
  return (
    <g
      transform={`translate(${cx} ${cy}) rotate(${item.rot}) scale(${s})`}
      onPointerDown={onPointerDown}
      style={{ cursor: "grab" }}
    >
      {selected && <circle r={26} fill="none" stroke="#00E5D6" strokeWidth={2} strokeDasharray="3 3" />}
      <ItemGlyph kind={item.kind} />
      {item.label && (
        <text y={32} textAnchor="middle" fontSize="12" fontWeight={700} fill="#0E1116">{item.label}</text>
      )}
    </g>
  );
}

function ItemGlyph({ kind }: { kind: EquipmentKind }) {
  switch (kind) {
    case "cone":
      return <polygon points="0,-16 12,12 -12,12" fill="#FF7A00" stroke="#222" strokeWidth={1.5} />;
    case "puck":
      return <ellipse rx={10} ry={4} fill="#111" />;
    case "player":
      return <g>
        <circle r={12} fill="#0F3DDE" stroke="#fff" strokeWidth={2} />
        <text textAnchor="middle" dy={4} fontSize="12" fontWeight={800} fill="#fff">P</text>
      </g>;
    case "goalie":
      return <g>
        <circle r={12} fill="#39FF14" stroke="#0E1116" strokeWidth={2} />
        <text textAnchor="middle" dy={4} fontSize="12" fontWeight={800} fill="#0E1116">G</text>
      </g>;
    case "net":
      return <g>
        <rect x={-18} y={-10} width={36} height={20} fill="#fff" stroke="#C00" strokeWidth={2} rx={2} />
        <line x1={-18} y1={-10} x2={18} y2={10} stroke="#C00" strokeWidth={1} />
        <line x1={18} y1={-10} x2={-18} y2={10} stroke="#C00" strokeWidth={1} />
      </g>;
    case "pod":
      return <g>
        <rect x={-12} y={-12} width={24} height={24} rx={6} fill="#00E5D6" stroke="#0E1116" strokeWidth={2} />
        <circle r={4} fill="#0E1116" />
      </g>;
    case "slip":
      return <g>
        <rect x={-14} y={-7} width={28} height={14} rx={7} fill="url(#slipGrad)" stroke="#0E1116" strokeWidth={1.5} />
        <defs>
          <linearGradient id="slipGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#00E5D6" />
            <stop offset="1" stopColor="#39FF14" />
          </linearGradient>
        </defs>
      </g>;
  }
}

function Rink({ template }: { template: RinkTemplate }) {
  // Use white ice with red/blue/teal markings, viewBox 1000x600.
  const ice = <rect x="0" y="0" width="1000" height="600" fill="#F4F8FB" />;
  const board = <rect x="6" y="6" width="988" height="588" rx="80" fill="none" stroke="#0E1116" strokeWidth="3" />;

  if (template === "full") {
    return (
      <g>
        {ice}{board}
        {/* center red line */}
        <line x1="500" y1="6" x2="500" y2="594" stroke="#D62828" strokeWidth="4" />
        <circle cx="500" cy="300" r="50" fill="none" stroke="#0F3DDE" strokeWidth="2" />
        <circle cx="500" cy="300" r="3" fill="#0F3DDE" />
        {/* blue lines */}
        <line x1="340" y1="6" x2="340" y2="594" stroke="#0F3DDE" strokeWidth="6" />
        <line x1="660" y1="6" x2="660" y2="594" stroke="#0F3DDE" strokeWidth="6" />
        {/* goal lines */}
        <line x1="100" y1="60" x2="100" y2="540" stroke="#D62828" strokeWidth="2" />
        <line x1="900" y1="60" x2="900" y2="540" stroke="#D62828" strokeWidth="2" />
        {/* faceoff circles */}
        {[[200,170],[200,430],[800,170],[800,430]].map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="40" fill="none" stroke="#D62828" strokeWidth="2" />
            <circle cx={x} cy={y} r="2" fill="#D62828" />
          </g>
        ))}
        {/* nets */}
        <rect x="92" y="285" width="16" height="30" fill="#fff" stroke="#D62828" strokeWidth="2" />
        <rect x="892" y="285" width="16" height="30" fill="#fff" stroke="#D62828" strokeWidth="2" />
        {/* creases */}
        <path d="M100,280 A30 30 0 0 1 100 320" fill="#9AD0FF" stroke="#D62828" strokeWidth="2" />
        <path d="M900,280 A30 30 0 0 0 900 320" fill="#9AD0FF" stroke="#D62828" strokeWidth="2" />
      </g>
    );
  }
  if (template === "half") {
    return (
      <g>
        {ice}{board}
        <line x1="500" y1="6" x2="500" y2="594" stroke="#D62828" strokeWidth="4" />
        <line x1="180" y1="6" x2="180" y2="594" stroke="#0F3DDE" strokeWidth="6" />
        <rect x="92" y="285" width="16" height="30" fill="#fff" stroke="#D62828" strokeWidth="2" />
        {[[260,170],[260,430]].map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="40" fill="none" stroke="#D62828" strokeWidth="2" />
          </g>
        ))}
      </g>
    );
  }
  if (template === "offensive" || template === "defensive") {
    return (
      <g>
        {ice}{board}
        <line x1="200" y1="6" x2="200" y2="594" stroke="#0F3DDE" strokeWidth="8" />
        <line x1="850" y1="60" x2="850" y2="540" stroke="#D62828" strokeWidth="2" />
        <rect x="842" y="285" width="16" height="30" fill="#fff" stroke="#D62828" strokeWidth="2" />
        <path d="M850,280 A30 30 0 0 0 850 320" fill="#9AD0FF" stroke="#D62828" strokeWidth="2" />
        {[[700,170],[700,430],[400,170],[400,430]].map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="40" fill="none" stroke="#D62828" strokeWidth="2" />
            <circle cx={x} cy={y} r="2" fill="#D62828" />
          </g>
        ))}
      </g>
    );
  }
  if (template === "neutral") {
    return (
      <g>
        {ice}{board}
        <line x1="200" y1="6" x2="200" y2="594" stroke="#0F3DDE" strokeWidth="8" />
        <line x1="800" y1="6" x2="800" y2="594" stroke="#0F3DDE" strokeWidth="8" />
        <line x1="500" y1="6" x2="500" y2="594" stroke="#D62828" strokeWidth="4" />
        <circle cx="500" cy="300" r="50" fill="none" stroke="#0F3DDE" strokeWidth="2" />
        <circle cx="500" cy="300" r="3" fill="#0F3DDE" />
        {[[330,170],[330,430],[670,170],[670,430]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="#D62828" />
        ))}
      </g>
    );
  }
  // station
  return (
    <g>
      {ice}{board}
      {[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]].map(([cx,cy],i) => (
        <rect key={i} x={60 + cx*310} y={60 + cy*250} width={280} height={220} rx={20}
          fill="none" stroke="#00E5D6" strokeWidth="2" strokeDasharray="8 6" />
      ))}
    </g>
  );
}

/* ---------- helpers ---------- */

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function splitLines(s: string) { return s.split("\n").map((l) => l.trim()).filter(Boolean); }
function toSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
  // simple polyline; smoothed via quadratic averaging
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function addDrillToSession(sessionId: string, drill: CustomDrill) {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = list.map((s: any) => s.id === sessionId
      ? { ...s, blocks: [...s.blocks, { uid: `b-${Date.now()}`, drillId: drill.id, mins: drill.durationMin }] }
      : s);
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("pxf:sessions-changed"));
  } catch {}
}

/* ensure unused-import bundler doesn't trim icons we keep for future */
void [Move, Pencil, Square, Slash, Spline];