export type Category =
  | "Skating Flow"
  | "Edge Control"
  | "Puck Control"
  | "Passing"
  | "Shooting"
  | "Reaction Training"
  | "GameIQ"
  | "Circuits";

export const CATEGORIES: { name: Category; tint: "teal" | "volt"; blurb: string }[] = [
  { name: "Skating Flow", tint: "teal", blurb: "Stride efficiency, flow patterns, transitions." },
  { name: "Edge Control", tint: "volt", blurb: "Inside/outside edges, mohawks, pivots." },
  { name: "Puck Control", tint: "teal", blurb: "Hands under pressure, deception, protection." },
  { name: "Passing", tint: "volt", blurb: "Reception, timing, weight, deception." },
  { name: "Shooting", tint: "teal", blurb: "Release, accuracy, deception, in-stride." },
  { name: "Reaction Training", tint: "volt", blurb: "Visual cues, response speed, decision." },
  { name: "GameIQ", tint: "teal", blurb: "Scanning, support, reads, anticipation." },
  { name: "Circuits", tint: "volt", blurb: "Slip circuits, station flow, integrated work." },
];

export type Drill = {
  id: string;
  name: string;
  category: Category;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Elite";
  ageGroup: string;
  equipment: string[];
  level: number; // progression level 1-4
  durationMin: number;
  blurb: string;
  notes: string[];
  mistakes: string[];
  progressions: string[];
  related: string[];
  videoUrl?: string;
  posterUrl?: string;
  diagramUrl?: string;
};

export const DRILLS: Drill[] = [
  {
    id: "figure-8-puck",
    name: "Figure 8 Puck Control",
    category: "Puck Control",
    difficulty: "Advanced",
    ageGroup: "U13+",
    equipment: ["2 Cones", "Puck", "Stick"],
    level: 3,
    durationMin: 12,
    blurb: "Tight figure-8 puck control with eyes up, blending edges and stickhandling.",
    notes: [
      "Knees bent, chest tall, eyes up off the puck.",
      "Pull puck through the body on every turn.",
      "Use inside edges to carve the figure 8 — no shuffling.",
    ],
    mistakes: [
      "Looking down at the puck.",
      "Stickhandling too wide and losing the puck on turns.",
      "Standing tall — losing edge depth.",
    ],
    progressions: ["Stationary handles", "Walking 8", "Skating 8", "Skating 8 with deke at top"],
    related: ["mohawk-transitions", "tight-turn-stops"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    posterUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
  },
  {
    id: "tight-turn-stops",
    name: "Tight Turn Stops & Starts",
    category: "Skating Flow",
    difficulty: "Beginner",
    ageGroup: "U9+",
    equipment: ["Cones"],
    level: 1,
    durationMin: 8,
    blurb: "Foundational stop-start pattern building flow and recovery.",
    notes: ["Stay low on every stop.", "Explode out on first 3 strides."],
    mistakes: ["Rising up between reps.", "Slow first step out of the stop."],
    progressions: ["2-cone stop", "4-cone stop", "Stop + crossover start", "Game-pace pattern"],
    related: ["inside-edge-crossovers"],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    posterUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
  },
  {
    id: "inside-edge-crossovers",
    name: "Inside Edge Crossovers",
    category: "Edge Control",
    difficulty: "Intermediate",
    ageGroup: "U11+",
    equipment: ["Circles"],
    level: 2,
    durationMin: 10,
    blurb: "Sharper inside-edge crossovers for tighter turns and acceleration.",
    notes: ["Drive the under-leg push.", "Shoulders square to the circle."],
    mistakes: ["Crossing too high — loses power.", "Leaning back."],
    progressions: ["Glide crossovers", "Power crossovers", "Tight circle reps", "Game transfer"],
    related: ["mohawk-transitions"],
  },
  {
    id: "mohawk-transitions",
    name: "Mohawk Transitions",
    category: "Edge Control",
    difficulty: "Advanced",
    ageGroup: "U13+",
    equipment: ["Open Ice"],
    level: 3,
    durationMin: 12,
    blurb: "Forward-to-backward mohawk reads with stick on puck.",
    notes: ["Open the hip fully.", "Hold the stick on the ice."],
    mistakes: ["Half-turning the hip.", "Picking the stick up mid-transition."],
    progressions: ["Stationary mohawk", "Glide mohawk", "Pivot to backskate", "Mohawk w/ puck"],
    related: ["figure-8-puck"],
  },
  {
    id: "quick-release-snap",
    name: "Quick Release Snap Shot",
    category: "Shooting",
    difficulty: "Intermediate",
    ageGroup: "U11+",
    equipment: ["Pucks", "Net"],
    level: 2,
    durationMin: 15,
    blurb: "Fast catch-and-release snap shot off the pass.",
    notes: ["Load the bottom hand.", "Punch through the puck, follow through low."],
    mistakes: ["Telegraphing the release.", "Off-foot timing."],
    progressions: ["Stationary snap", "One-touch snap", "In-stride snap", "Deception snap"],
    related: ["figure-8-puck"],
  },
  {
    id: "scan-support",
    name: "Scan & Support Decisions",
    category: "GameIQ",
    difficulty: "Advanced",
    ageGroup: "U13+",
    equipment: ["Pods", "Pucks"],
    level: 3,
    durationMin: 20,
    blurb: "Pre-scan habits and supporting the puck carrier under cue.",
    notes: ["Scan before the puck arrives.", "Show a passing lane."],
    mistakes: ["Watching the puck instead of the ice.", "Standing in the same lane as the carrier."],
    progressions: ["1v0 scan", "1v1 support", "2v2 support", "3v3 reads"],
    related: ["reaction-cue-shoot"],
  },
  {
    id: "reaction-cue-shoot",
    name: "Reaction Cue Shoot",
    category: "Reaction Training",
    difficulty: "Intermediate",
    ageGroup: "U11+",
    equipment: ["PODs", "Pucks", "Net"],
    level: 2,
    durationMin: 10,
    blurb: "Light-cued release training to compress decision time.",
    notes: ["Eyes up on cue light.", "Release inside 0.6s of cue."],
    mistakes: ["Looking at puck, missing cue.", "Slow shoulder turn."],
    progressions: ["Cue catch", "Cue release", "Cue deke + release", "Cue pass-or-shoot"],
    related: ["scan-support"],
  },
  {
    id: "tape-to-tape-flow",
    name: "Tape-to-Tape Flow",
    category: "Passing",
    difficulty: "Beginner",
    ageGroup: "U9+",
    equipment: ["Puck", "Partner"],
    level: 1,
    durationMin: 8,
    blurb: "Crisp give-and-go reps focused on receiving in motion.",
    notes: ["Stick on the ice, receive soft.", "Pass to the lead foot."],
    mistakes: ["Stick off the ice on reception.", "Hard passes to the back foot."],
    progressions: ["Stationary", "Skating give-go", "Across the body", "Saucer in stride"],
    related: ["quick-release-snap"],
  },
  {
    id: "slip-circuit-a",
    name: "Slip Circuit A",
    category: "Circuits",
    difficulty: "Advanced",
    ageGroup: "U13+",
    equipment: ["Cones", "Pucks", "Net"],
    level: 3,
    durationMin: 18,
    blurb: "Integrated circuit: edges → handles → release at game pace.",
    notes: ["Hit each station at game pace.", "Reset breathing between blocks."],
    mistakes: ["Pacing the circuit.", "Cutting station footwork."],
    progressions: ["Half pace", "Game pace", "Game pace + cue", "Game pace + opponent"],
    related: ["figure-8-puck", "quick-release-snap"],
  },
];

export function drillsByCategory() {
  const map = new Map<Category, Drill[]>();
  for (const c of CATEGORIES) map.set(c.name, []);
  for (const d of DRILLS) map.get(d.category)!.push(d);
  return map;
}

export type Pathway = {
  id: string;
  category: Category;
  title: string;
  estimatedHours: number;
  percent: number;
  flows: { name: string; status: "done" | "active" | "locked" }[];
};

export const PATHWAYS: Pathway[] = [
  {
    id: "skating-flow",
    category: "Skating Flow",
    title: "Skating Flow Pathway",
    estimatedHours: 8,
    percent: 55,
    flows: [
      { name: "Flow 1 — Stride Base", status: "done" },
      { name: "Flow 2 — Transitions", status: "done" },
      { name: "Flow 3 — Game Pace", status: "active" },
      { name: "Flow 4 — Integration", status: "locked" },
    ],
  },
  {
    id: "edge-control",
    category: "Edge Control",
    title: "Edge Control Pathway",
    estimatedHours: 10,
    percent: 30,
    flows: [
      { name: "Flow 1 — Edge Map", status: "done" },
      { name: "Flow 2 — Mohawks", status: "active" },
      { name: "Flow 3 — Tight Turns", status: "locked" },
      { name: "Flow 4 — Game Edges", status: "locked" },
    ],
  },
  {
    id: "puck-control",
    category: "Puck Control",
    title: "Puck Control Pathway",
    estimatedHours: 9,
    percent: 45,
    flows: [
      { name: "Flow 1 — Handles", status: "done" },
      { name: "Flow 2 — Protection", status: "active" },
      { name: "Flow 3 — Deception", status: "locked" },
      { name: "Flow 4 — Pressure Reps", status: "locked" },
    ],
  },
  {
    id: "passing",
    category: "Passing",
    title: "Passing Pathway",
    estimatedHours: 6,
    percent: 20,
    flows: [
      { name: "Flow 1 — Tape to Tape", status: "active" },
      { name: "Flow 2 — Saucers", status: "locked" },
      { name: "Flow 3 — Deception", status: "locked" },
      { name: "Flow 4 — In-Stride Reads", status: "locked" },
    ],
  },
  {
    id: "shooting",
    category: "Shooting",
    title: "Shooting Pathway",
    estimatedHours: 8,
    percent: 0,
    flows: [
      { name: "Flow 1 — Release", status: "locked" },
      { name: "Flow 2 — Accuracy", status: "locked" },
      { name: "Flow 3 — Deception", status: "locked" },
      { name: "Flow 4 — Game Release", status: "locked" },
    ],
  },
  {
    id: "reaction",
    category: "Reaction Training",
    title: "Reaction Training Pathway",
    estimatedHours: 7,
    percent: 12,
    flows: [
      { name: "Flow 1 — Cue Base", status: "active" },
      { name: "Flow 2 — Cue Release", status: "locked" },
      { name: "Flow 3 — Cue Decisions", status: "locked" },
      { name: "Flow 4 — Game Transfer", status: "locked" },
    ],
  },
  {
    id: "gameiq",
    category: "GameIQ",
    title: "GameIQ Pathway",
    estimatedHours: 12,
    percent: 0,
    flows: [
      { name: "Flow 1 — Scanning", status: "locked" },
      { name: "Flow 2 — Support", status: "locked" },
      { name: "Flow 3 — Reads", status: "locked" },
      { name: "Flow 4 — Decisions", status: "locked" },
    ],
  },
];

export function findDrill(id: string) {
  return DRILLS.find((d) => d.id === id);
}

export function relatedTo(d: { related: string[] }) {
  return d.related.map(findDrill).filter(Boolean) as Drill[];
}