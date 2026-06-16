import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pxf:favorites";
const FOLDERS_KEY = "pxf:favorite-folders";
const ASSIGN_KEY = "pxf:favorite-assignments";
const EVT = "pxf:favorites-changed";

export type Folder = { id: string; name: string };
export type Assignments = Record<string, string[]>;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVT));
}

function readFolders(): Folder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f): f is Folder => f && typeof f.id === "string" && typeof f.name === "string");
  } catch {
    return [];
  }
}

function writeFolders(folders: Folder[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  window.dispatchEvent(new CustomEvent(EVT));
}

function readAssignments(): Assignments {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ASSIGN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Assignments = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string");
    }
    return out;
  } catch {
    return {};
  }
}

function writeAssignments(a: Assignments) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ASSIGN_KEY, JSON.stringify(a));
  window.dispatchEvent(new CustomEvent(EVT));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [assignments, setAssignments] = useState<Assignments>({});

  useEffect(() => {
    const syncAll = () => {
      setIds(read());
      setFolders(readFolders());
      setAssignments(readAssignments());
    };
    syncAll();
    const sync = () => syncAll();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    const current = read();
    const wasFav = current.includes(id);
    const next = wasFav ? current.filter((x) => x !== id) : [...current, id];
    write(next);
    setIds(next);
    if (wasFav) {
      const a = readAssignments();
      if (a[id]) {
        delete a[id];
        writeAssignments(a);
        setAssignments(a);
      }
    }
  }, []);

  const createFolder = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const next = [...readFolders(), { id: uid(), name: trimmed }];
    writeFolders(next);
    setFolders(next);
    return next[next.length - 1];
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = readFolders().map((f) => (f.id === id ? { ...f, name: trimmed } : f));
    writeFolders(next);
    setFolders(next);
  }, []);

  const deleteFolder = useCallback((id: string) => {
    const nextFolders = readFolders().filter((f) => f.id !== id);
    writeFolders(nextFolders);
    setFolders(nextFolders);
    const a = readAssignments();
    let changed = false;
    for (const k of Object.keys(a)) {
      if (a[k].includes(id)) {
        a[k] = a[k].filter((x) => x !== id);
        changed = true;
      }
    }
    if (changed) {
      writeAssignments(a);
      setAssignments(a);
    }
  }, []);

  const setDrillFolders = useCallback((drillId: string, folderIds: string[]) => {
    const a = readAssignments();
    if (folderIds.length === 0) delete a[drillId];
    else a[drillId] = Array.from(new Set(folderIds));
    writeAssignments(a);
    setAssignments(a);
  }, []);

  const toggleDrillFolder = useCallback((drillId: string, folderId: string) => {
    const a = readAssignments();
    const cur = a[drillId] ?? [];
    const next = cur.includes(folderId) ? cur.filter((x) => x !== folderId) : [...cur, folderId];
    if (next.length === 0) delete a[drillId];
    else a[drillId] = next;
    writeAssignments(a);
    setAssignments(a);
  }, []);

  const foldersForDrill = useCallback((id: string) => assignments[id] ?? [], [assignments]);

  return {
    ids,
    isFavorite,
    toggle,
    folders,
    assignments,
    createFolder,
    renameFolder,
    deleteFolder,
    setDrillFolders,
    toggleDrillFolder,
    foldersForDrill,
  };
}