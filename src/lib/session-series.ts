export type SessionSeries = {
  id: string;
  name: string;
  days: string[]; // ordered sessionIds (from pxf:sessions:v2)
  createdAt: number;
};

const KEY = "pxf:session-series:v1";

export function readSeries(): SessionSeries[] {
  if (typeof window === "undefined") return [];
  try {
    const r = window.localStorage.getItem(KEY);
    return r ? (JSON.parse(r) as SessionSeries[]) : [];
  } catch {
    return [];
  }
}

export function writeSeries(list: SessionSeries[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("pxf:series-changed"));
}

export function upsertSeries(s: SessionSeries) {
  const list = readSeries();
  const idx = list.findIndex((x) => x.id === s.id);
  if (idx >= 0) list[idx] = s;
  else list.unshift(s);
  writeSeries(list);
}

export function deleteSeries(id: string) {
  writeSeries(readSeries().filter((s) => s.id !== id));
}

export function sigOf(session: { totalMins?: number; blocks?: unknown[] } | undefined | null): string {
  if (!session) return "";
  try {
    return JSON.stringify({ t: session.totalMins ?? 0, b: session.blocks ?? [] });
  } catch {
    return "";
  }
}

// Per-camp applied-series tracking
export type AppliedSeries = {
  seriesId: string;
  seriesName: string;
  appliedAt: number;
  mapping: { campSessionId: string; sourceSessionId: string; snapshotSessionId: string; sourceSig: string }[];
};

export function appliedSeriesKey(campId: string) {
  return `pxf:camp-series:${campId}`;
}

export function readAppliedSeries(campId: string): AppliedSeries | null {
  if (typeof window === "undefined") return null;
  try {
    const r = window.localStorage.getItem(appliedSeriesKey(campId));
    return r ? (JSON.parse(r) as AppliedSeries) : null;
  } catch {
    return null;
  }
}

export function writeAppliedSeries(campId: string, a: AppliedSeries | null) {
  if (a) window.localStorage.setItem(appliedSeriesKey(campId), JSON.stringify(a));
  else window.localStorage.removeItem(appliedSeriesKey(campId));
}
