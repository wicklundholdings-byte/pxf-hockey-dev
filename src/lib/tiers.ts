// Subscription tier definitions for PXF Hockey.
// Founding promo: first 500 signups → free until Dec 31, 2027.

export type TierId =
  | "parent"
  | "association"
  | "team"
  | "elite"
  | "academy";

export type CoachTierId = Exclude<TierId, "parent">;

export type Tier = {
  id: TierId;
  name: string;
  price: number; // USD / month
  trialDays: number;
  tagline: string;
  features: string[];
  restrictions?: string[];
  popular?: boolean;
  coach: boolean;
};

export const FOUNDING_MEMBER_LIMIT = 500;
export const FOUNDING_MEMBER_END = "December 31, 2027";

export const TIERS: Tier[] = [
  {
    id: "parent",
    name: "Parent",
    price: 7.99,
    trialDays: 7,
    coach: false,
    tagline: "For athletes & families.",
    features: [
      "Dryland programs",
      "Athlete profile & progress",
      "Team schedule & RSVP",
      "Camp updates & media",
      "Messaging with coaches",
    ],
    restrictions: ["No coach console access"],
  },
  {
    id: "association",
    name: "Association Coach",
    price: 14.99,
    trialDays: 14,
    coach: true,
    tagline: "Placeholder for v2 — same access as Team Coach.",
    features: [
      "Everything in Team Coach",
      "Multiple teams (no cap)",
      "Full team management",
      "Team fee collection",
      "Practice plan builder",
    ],
    restrictions: [
      "Association dashboard coming in v2",
      "No camp creation",
      "No camp revenue collection",
    ],
  },
  {
    id: "team",
    name: "Team Coach",
    price: 24.99,
    trialDays: 14,
    coach: true,
    tagline: "Run your teams end-to-end.",
    features: [
      "Multiple teams (no cap)",
      "Full team management: schedule, roster, RSVP",
      "Game prep: lines, game plan, coach notes, publish",
      "Game stats & film / video analysis",
      "Practice plan builder & athlete session notes",
      "Health forms & parent game day view",
      "Dryland leaderboard",
      "Team fee collection (parents pay in-app)",
    ],
    restrictions: [
      "No camp creation",
      "No camp revenue collection",
      "No broadcast push to all parents",
    ],
  },
  {
    id: "elite",
    name: "Elite Coach",
    price: 49.99,
    trialDays: 14,
    coach: true,
    popular: true,
    tagline: "Everything in Team Coach + camps & revenue.",
    features: [
      "Everything in Team Coach",
      "Camp creation & scheduling (full builder)",
      "Sessions, ice time & capacity limits",
      "Camp registration payments & pricing tiers",
      "Discount codes & payout management",
      "Broadcast push to all parents at once",
      "Advanced analytics dashboard",
    ],
    restrictions: [
      "Single coach account (no multi-staff)",
    ],
  },
  {
    id: "academy",
    name: "Academy",
    price: 99,
    trialDays: 14,
    coach: true,
    tagline: "Organizations with multiple coaches.",
    features: [
      "Everything in Elite Coach",
      "Unlimited teams and camps",
      "Multi-staff accounts: manager, assistant coach, content creator",
      "Full role-based permission controls",
      "Organization-wide analytics",
    ],
  },
];

export const COACH_TIERS = TIERS.filter((t) => t.coach) as (Tier & {
  id: CoachTierId;
})[];

const RANK: Record<TierId, number> = {
  parent: 0,
  association: 2,
  team: 2,
  elite: 3,
  academy: 4,
};

export function tierAtLeast(current: TierId | null | undefined, min: TierId) {
  if (!current) return false;
  return RANK[current] >= RANK[min];
}

export function nextTier(current: TierId): Tier | null {
  const ordered = TIERS.filter((t) => t.coach);
  const idx = ordered.findIndex((t) => t.id === current);
  if (idx < 0 || idx === ordered.length - 1) return null;
  return ordered[idx + 1];
}

export function getTier(id: TierId): Tier {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

// Feature gate keys → minimum tier required.
export const FEATURE_MIN_TIER: Record<string, TierId> = {
  // Team management features — available on Team Coach (and Association, same rank)
  teamManagement: "team",
  drillLibrary: "team",
  multipleTeams: "team",
  gameStats: "team",
  filmAnalysis: "team",
  gamePrep: "team",
  practicePlanBuilder: "team",
  drylandLeaderboard: "team",
  teamFeeCollection: "team",
  privateSessionBooking: "team",
  // Camp + revenue features — Elite and above
  campManagement: "elite",
  publicRegistration: "elite",
  stripePayouts: "elite",
  broadcast: "elite",
  advancedAnalytics: "elite",
  // Academy-only
  staffManagement: "academy",
  academyFeatures: "academy",
  multipleCoaches: "academy",
};

export function gateMessage(feature: keyof typeof FEATURE_MIN_TIER): string {
  const min = FEATURE_MIN_TIER[feature];
  const tier = getTier(min);
  switch (feature) {
    case "campManagement":
      return "Camp creation is available on Elite Coach and above";
    case "publicRegistration":
      return "Public camp registration is available on Elite Coach and above";
    case "stripePayouts":
      return "Camp revenue collection & payouts are available on Elite Coach and above";
    case "broadcast":
      return "Broadcast push to all parents is available on Elite Coach and above";
    case "advancedAnalytics":
      return "Advanced analytics is available on Elite Coach and above";
    case "teamFeeCollection":
      return "Team fee collection is available on Team Coach and above";
    case "privateSessionBooking":
      return "Available on Team Coach and above";
    case "staffManagement":
      return "Multi-staff accounts are available on Academy";
    case "academyFeatures":
    case "multipleCoaches":
      return "Multi-coach organizations are available on Academy";
    default:
      return `Available on ${tier.name} and above`;
  }
}

// Map subscriptions.plan_name (stored in DB) → TierId. Case-insensitive.
export function tierFromPlanName(planName?: string | null): TierId | null {
  if (!planName) return null;
  const p = planName.toLowerCase();
  if (p.includes("academy")) return "academy";
  if (p.includes("elite")) return "elite";
  if (p.includes("team")) return "team";
  if (p.includes("association")) return "association";
  if (p.includes("parent")) return "parent";
  return null;
}