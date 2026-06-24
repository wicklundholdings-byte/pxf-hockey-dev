import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Film, Image as ImageIcon, ListVideo, Play } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parent/teams/$teamId/media")({
  component: ParentTeamMedia,
});

type Media = {
  id: string;
  media_type: "photo" | "video";
  label: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  athlete_tags: string[];
  created_at: string;
};
type Reel = { id: string; title: string; created_at: string };

function ParentTeamMedia() {
  const { teamId } = Route.useParams();
  const { user } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "photo" | "video" | "mine">("all");
  const [myPlayerIds, setMyPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: r }] = await Promise.all([
        supabase.from("game_media").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
        supabase.from("game_highlight_reels").select("id,title,created_at").eq("team_id", teamId).eq("is_shared", true).order("created_at", { ascending: false }),
      ]);
      const list = ((m ?? []) as any[]).map((x) => ({ ...x, athlete_tags: (x.athlete_tags ?? []) as string[] })) as Media[];
      setMedia(list);
      setReels((r ?? []) as Reel[]);

      const paths = list.flatMap((x) => [x.url, x.thumbnail_url].filter(Boolean) as string[]);
      if (paths.length) {
        const { data: signedRes } = await supabase.storage.from("game-media").createSignedUrls(paths, 3600);
        const map: Record<string, string> = {};
        (signedRes ?? []).forEach((s: any) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
        setSigned(map);
      }
    })();
  }, [teamId]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const ids = await (supabase as any).rpc("current_user_contact_ids");
      const contactIds = (ids.data ?? []) as string[];
      if (!contactIds.length) return;
      const { data: ps } = await supabase.from("team_players").select("id").eq("team_id", teamId).in("parent_contact_id", contactIds);
      setMyPlayerIds(((ps ?? []) as { id: string }[]).map((p) => p.id));
    })();
  }, [user?.id, teamId]);

  const filtered = useMemo(() => {
    if (filter === "all") return media;
    if (filter === "photo") return media.filter((m) => m.media_type === "photo");
    if (filter === "video") return media.filter((m) => m.media_type === "video");
    return media.filter((m) => m.athlete_tags.some((t) => myPlayerIds.includes(t)));
  }, [media, filter, myPlayerIds]);

  return (
    <div className="px-5 pb-6">
      {reels.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-1"><ListVideo size={14} /> Highlight reels</h3>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {reels.map((r) => (
              <div key={r.id} className="min-w-[180px] rounded-2xl border border-border bg-surface p-3">
                <Film size={18} className="text-teal" />
                <p className="mt-2 text-xs font-semibold">{r.title}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
        {(["all", "photo", "video", "mine"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={"flex-1 rounded-full py-1.5 text-[11px] font-bold capitalize " + (filter === f ? "bg-teal text-background" : "text-muted-foreground")}>
            {f === "mine" ? "My Athlete" : f === "all" ? "All" : f === "photo" ? "Photos" : "Videos"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {filtered.length === 0 && (
          <p className="col-span-2 rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
            No media yet.
          </p>
        )}
        {filtered.map((m) => {
          const url = signed[m.url];
          const thumb = m.thumbnail_url ? signed[m.thumbnail_url] : null;
          return (
            <div key={m.id} className="relative overflow-hidden rounded-xl border border-border bg-surface">
              {m.media_type === "photo" && url ? (
                <img src={url} alt={m.caption || ""} className="aspect-square w-full object-cover" />
              ) : (
                <div className="relative aspect-square w-full">
                  {thumb ? (
                    <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-surface-2"><ImageIcon size={20} className="text-muted-foreground" /></div>
                  )}
                  <div className="absolute inset-0 grid place-items-center bg-background/40">
                    <Play size={26} className="text-white" />
                  </div>
                </div>
              )}
              {url && (
                <a href={url} download
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/80 text-foreground">
                  <Download size={12} />
                </a>
              )}
              {m.athlete_tags.some((t) => myPlayerIds.includes(t)) && (
                <span className="absolute left-1 top-1 rounded-full bg-teal/90 px-1.5 py-0.5 text-[9px] font-bold text-background">YOUR ATHLETE</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}