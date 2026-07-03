import { useSyncExternalStore } from "react";

export type PrivateAthlete = {
  id: string;
  name: string;
  email?: string;
  paid: boolean;
  amount: number;
};

export type MockPrivate = {
  id: string;
  type: "1-on-1" | "Small Group";
  date: string; // ISO date
  time: string; // "6:00 AM"
  duration: number; // minutes
  location: string;
  focus: string;
  ratePerAthlete: number;
  chargeMode: "session" | "athlete";
  inviteOnly: boolean;
  athletes: PrivateAthlete[];
  status: "confirmed" | "pending" | "past" | "cancelled";
  coach?: string;
};

const seed: MockPrivate[] = [
  {
    id: "pv1",
    type: "1-on-1",
    date: "2026-07-03",
    time: "6:00 AM",
    duration: 60,
    location: "Rink 4 · Burnaby 8 Rinks",
    focus: "Skating + Edges",
    ratePerAthlete: 85,
    chargeMode: "athlete",
    inviteOnly: true,
    athletes: [{ id: "a1", name: "Jake Andersson", email: "parent.jake@email.com", paid: true, amount: 85 }],
    status: "confirmed",
    coach: "Coach Davis",
  },
  {
    id: "pv2",
    type: "1-on-1",
    date: "2026-07-04",
    time: "7:00 AM",
    duration: 60,
    location: "Rink 2 · Burnaby 8 Rinks",
    focus: "Shooting Focus",
    ratePerAthlete: 85,
    chargeMode: "athlete",
    inviteOnly: true,
    athletes: [{ id: "a2", name: "Liam Carter", email: "parent.liam@email.com", paid: true, amount: 85 }],
    status: "confirmed",
    coach: "Coach Davis",
  },
  {
    id: "pv3",
    type: "1-on-1",
    date: "2026-07-05",
    time: "8:00 AM",
    duration: 45,
    location: "Rink 1 · Burnaby 8 Rinks",
    focus: "Goalie Training",
    ratePerAthlete: 75,
    chargeMode: "athlete",
    inviteOnly: true,
    athletes: [{ id: "a3", name: "Emma Walsh", email: "parent.emma@email.com", paid: true, amount: 75 }],
    status: "confirmed",
    coach: "Coach Davis",
  },
  {
    id: "pv4",
    type: "Small Group",
    date: "2026-07-10",
    time: "5:00 PM",
    duration: 75,
    location: "Rink 2 · Burnaby 8 Rinks",
    focus: "Power Skating",
    ratePerAthlete: 55,
    chargeMode: "athlete",
    inviteOnly: false,
    athletes: [
      { id: "a4", name: "Liam Carter", paid: true, amount: 55 },
      { id: "a5", name: "Jake Andersson", paid: true, amount: 55 },
      { id: "a6", name: "Ryan Brooks", paid: false, amount: 55 },
    ],
    status: "pending",
    coach: "Coach Davis",
  },
  {
    id: "pv0",
    type: "1-on-1",
    date: "2026-06-20",
    time: "6:00 AM",
    duration: 60,
    location: "Rink 3 · Burnaby 8 Rinks",
    focus: "Skating",
    ratePerAthlete: 85,
    chargeMode: "athlete",
    inviteOnly: true,
    athletes: [{ id: "a1", name: "Jake Andersson", paid: true, amount: 85 }],
    status: "past",
    coach: "Coach Davis",
  },
];

let store: MockPrivate[] = [...seed];
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function useMockPrivates(): MockPrivate[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => store,
    () => store,
  );
}

export function getMockPrivate(id: string): MockPrivate | undefined {
  return store.find((p) => p.id === id);
}

export function addMockPrivate(p: Omit<MockPrivate, "id" | "status"> & { status?: MockPrivate["status"] }): MockPrivate {
  const id = `pv_${Date.now()}`;
  const created: MockPrivate = { ...p, id, status: p.status ?? "confirmed" };
  store = [created, ...store];
  emit();
  return created;
}

export function updateMockPrivate(id: string, patch: Partial<MockPrivate>) {
  store = store.map((p) => (p.id === id ? { ...p, ...patch } : p));
  emit();
}

export function markAthletePaid(sessionId: string, athleteId: string) {
  store = store.map((p) => {
    if (p.id !== sessionId) return p;
    const athletes = p.athletes.map((a) => (a.id === athleteId ? { ...a, paid: true } : a));
    const allPaid = athletes.every((a) => a.paid);
    return { ...p, athletes, status: allPaid ? "confirmed" : "pending" };
  });
  emit();
}

export const RATE_PRESETS = [
  { label: "Skating", price: 85 },
  { label: "Shooting", price: 85 },
  { label: "Goalie", price: 75 },
  { label: "Skills", price: 90 },
  { label: "Group", price: 55 },
];

export function fmtPrivateDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}