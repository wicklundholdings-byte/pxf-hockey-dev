import { useCallback, useEffect, useState } from "react";

const KEY = "pxf:playbook-favs:v1";
const EVT = "pxf:playbook-favs-changed";
export type PlaybookFavKind = "session" | "camp";

type Store = { session: string[]; camp: string[] };
function read(): Store {
  if (typeof window === "undefined") return { session: [], camp: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { session: [], camp: [] };
    const p = JSON.parse(raw);
    return {
      session: Array.isArray(p?.session) ? p.session : [],
      camp: Array.isArray(p?.camp) ? p.camp : [],
    };
  } catch { return { session: [], camp: [] }; }
}
function write(s: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function usePlaybookFavorites() {
  const [store, setStore] = useState<Store>({ session: [], camp: [] });

  useEffect(() => {
    const sync = () => setStore(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isFav = useCallback((kind: PlaybookFavKind, id: string) => store[kind].includes(id), [store]);
  const toggle = useCallback((kind: PlaybookFavKind, id: string) => {
    const cur = read();
    const list = cur[kind];
    cur[kind] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    write(cur);
    setStore(cur);
  }, []);

  return { sessionIds: store.session, campIds: store.camp, isFav, toggle };
}