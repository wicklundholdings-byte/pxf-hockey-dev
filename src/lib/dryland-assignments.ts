export type RosterAthlete = { id: string; jersey: number; name: string; team: string };

export const MOCK_CAMPS = [
  { id: "camp-summer-power", name: "Summer Power Camp" },
  { id: "camp-elite-dev-1", name: "Elite Dev Camp 1" },
];

export const MOCK_TEAMS = [
  { id: "team-elite-demo", name: "Elite Demo Team" },
  { id: "team-atom-rep", name: "Atom Rep" },
];

export const MOCK_ROSTER: RosterAthlete[] = [
  { id: "a-14", jersey: 14, name: "Liam Carter", team: "Elite Demo Team" },
  { id: "a-9",  jersey: 9,  name: "Jake Andersson", team: "Elite Demo Team" },
  { id: "a-21", jersey: 21, name: "Owen Brooks", team: "Elite Demo Team" },
  { id: "a-17", jersey: 17, name: "Noah Jensen", team: "Elite Demo Team" },
  { id: "a-22", jersey: 22, name: "Marco Callahan", team: "Elite Demo Team" },
  { id: "a-8",  jersey: 8,  name: "Tyler Petrov", team: "Elite Demo Team" },
  { id: "a-11", jersey: 11, name: "Marco Vella", team: "Elite Demo Team" },
  { id: "a-7",  jersey: 7,  name: "Ethan Park", team: "Elite Demo Team" },
  { id: "a-31", jersey: 31, name: "Ryan Miller", team: "Elite Demo Team" },
  { id: "a-4",  jersey: 4,  name: "Aiden Wu", team: "Atom Rep" },
  { id: "a-12", jersey: 12, name: "Cole Bishop", team: "Atom Rep" },
  { id: "a-19", jersey: 19, name: "Dylan Reeves", team: "Atom Rep" },
  { id: "a-23", jersey: 23, name: "Owen Zhang", team: "Atom Rep" },
];

export type StoredAssignment = {
  id: string;
  programId: string;
  programName: string;
  who: "camp" | "team" | "individual";
  targetLabel: string;
  startDate: string;
  message: string;
  athleteIds: string[];
  sessionCount: number;
  createdAt: string;
};

const KEY = "pxf.dryland.assignments.v1";

export function loadAssignments(): StoredAssignment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredAssignment[]) : [];
  } catch { return []; }
}

export function saveAssignment(
  input: Omit<StoredAssignment, "id" | "createdAt">,
): StoredAssignment {
  const record: StoredAssignment = {
    ...input,
    id: `asg-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    const list = loadAssignments();
    list.unshift(record);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 25)));
  }
  return record;
}

export function getAssignment(id: string): StoredAssignment | undefined {
  return loadAssignments().find((a) => a.id === id);
}