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
    tagline: "Team & practice management.",
    features: [
      "Team management",
      "Drill library",
      "Session builder",
      "Practices & games",
    ],
    restrictions: [
      "No private camp booking",
      "No Stripe payouts",
      "No revenue collection",
    ],
  },
  {
    id: "team",
    name: "Team Coach",
    price: 24.99,
    trialDays: 14,
    coach: true,
    tagline: "Everything in Association + private sessions.",
    features: [
      "Everything in Association Coach",
      "Private session booking",
      "1-on-1 scheduling",
    ],
    restrictions: [
      "No full camp management",
      "No public registration flow",
    ],
  },
  {
    id: "elite",
    name: "Elite Coach",
    price: 49.99,
    trialDays: 14,
    coach: true,
    popular: true,
    tagline: "Full platform for coaches running camps.",
    features: [
      "Camps & public registration",
      "Stripe payouts",
      "Film & combine",
      "Ice time management",
      "Every Elite feature unlocked",
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
      "Everything in Elite",
      "Multiple coaches under one org",
      "Staff management",
      "Organization-wide analytics",
    ],
  },
];

export const COACH_TIERS = TIERS.filter((t) => t.coach) as (Tier & {
  id: CoachTierId;
})[];

const RANK: Record<TierId, number> = {
  parent: 0,
  association: 1,
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
  campManagement: "elite",
  publicRegistration: "elite",
  stripePayouts: "elite",
  privateBooking: "team",
  teamManagement: "association",
  drillLibrary: "association",
  multipleCoaches: "academy",
};

export function gateMessage(feature: keyof typeof FEATURE_MIN_TIER): string {
  const min = FEATURE_MIN_TIER[feature];
  const tier = getTier(min);
  switch (feature) {
    case "campManagement":
    case "publicRegistration":
    case "stripePayouts":
      return `${tier.name === "Elite Coach" ? "This feature" : tier.name} is available on ${tier.name} and above`;
    case "privateBooking":
      return "Private session booking is available on Team Coach and above";
    case "multipleCoaches":
      return "Multi-coach organizations are available on Academy";
    default:
      return `Available on ${tier.name} and above`;
  }
}