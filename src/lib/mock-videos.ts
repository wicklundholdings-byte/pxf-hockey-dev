import { useSyncExternalStore } from "react";

export type ClipType = "Skating" | "Shooting" | "Edges" | "Drill" | "Game Clip" | "Goalie" | "Other";
export const CLIP_TYPES: ClipType[] = ["Skating", "Shooting", "Edges", "Drill", "Game Clip", "Goalie", "Other"];

export type Visibility = "athlete_parents" | "staff_only";

export type VideoClip = {
  id: string;
  athleteIds: string[];
  type: ClipType;
  note: string;
  visibility: Visibility;
  fromLabel: string; // "Coach Davis · Jul 3 Practice"
  coach: string;
  createdAt: string; // ISO
  durationSec: number;
  thumbUrl?: string;
  videoUrl?: string; // object URL or remote
  pendingApproval?: boolean;
};

const KEY = "pxf:videos:v1";

function seed(): VideoClip[] {
  const jake = "jake-andersson";
  const now = new Date();
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
  return [
    {
      id: "vid_jake_1",
      athleteIds: [jake],
      type: "Skating",
      note: "Good edge work on the left. Watch knee bend on right turns.",
      visibility: "athlete_parents",
      fromLabel: "Coach Davis · Jul 3 Practice",
      coach: "Coach Davis",
      createdAt: iso(0),
      durationSec: 42,
    },
    {
      id: "vid_jake_2",
      athleteIds: [jake],
      type: "Shooting",
      note: "Release is quick — work on weight transfer before the shot.",
      visibility: "athlete_parents",
      fromLabel: "Coach Davis · Jun 28 Practice",
      coach: "Coach Davis",
      createdAt: iso(5),
      durationSec: 75,
    },
    {
      id: "vid_jake_3",
      athleteIds: [jake],
      type: "Drill",
      note: "2-on-1 read was excellent here. Use this as your benchmark.",
      visibility: "athlete_parents",
      fromLabel: "Coach Davis · Jun 21 Practice",
      coach: "Coach Davis",
      createdAt: iso(12),
      durationSec: 58,
    },
  ];
}

function read(): VideoClip[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as VideoClip[];
  } catch {
    return seed();
  }
}

let cache: VideoClip[] | null = null;
const listeners = new Set<() => void>();

function get(): VideoClip[] {
  if (cache === null) cache = read();
  return cache;
}
function set(next: VideoClip[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }
  listeners.forEach((l) => l());
}

export function addClip(clip: Omit<VideoClip, "id" | "createdAt"> & { id?: string; createdAt?: string }): VideoClip {
  const full: VideoClip = {
    ...clip,
    id: clip.id ?? `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: clip.createdAt ?? new Date().toISOString(),
  };
  set([full, ...get()]);
  return full;
}

export function approveClip(id: string) {
  set(get().map((c) => (c.id === id ? { ...c, pendingApproval: false } : c)));
}

export function deleteClip(id: string) {
  set(get().filter((c) => c.id !== id));
}

export function useClips(): VideoClip[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => get(),
    () => get(),
  );
}

export function clipsForAthlete(id: string): VideoClip[] {
  return get().filter((c) => c.athleteIds.includes(id));
}

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return iso; }
}