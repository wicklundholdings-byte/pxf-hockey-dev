import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlaybookFolderKind = "drill" | "session" | "camp";
export type PlaybookFolder = { id: string; name: string; kind: PlaybookFolderKind };

export function usePlaybookFolders(kind: PlaybookFolderKind) {
  const [folders, setFolders] = useState<PlaybookFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setFolders([]); setLoading(false); return; }
    const { data } = await supabase
      .from("playbook_folders")
      .select("id,name,kind")
      .eq("owner_id", u.user.id)
      .eq("kind", kind)
      .order("name");
    setFolders((data ?? []) as PlaybookFolder[]);
    setLoading(false);
  }, [kind]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await supabase
      .from("playbook_folders")
      .insert({ owner_id: u.user.id, kind, name: trimmed })
      .select("id,name,kind")
      .single();
    if (error) return null;
    await load();
    return data as PlaybookFolder;
  }, [kind, load]);

  const rename = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await supabase.from("playbook_folders").update({ name: trimmed }).eq("id", id);
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("playbook_folders").delete().eq("id", id);
    await load();
  }, [load]);

  return { folders, loading, create, rename, remove, reload: load };
}