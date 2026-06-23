import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Image as ImageIcon, Video, X, Tag, Film, Play, Download, ListVideo, Share2, Plus, Trash2 } from "lucide-react";

type Player = { id: string; display_name: string; jersey_number: string | null };
type Media = {
  id: string;
  media_type: "photo" | "video";
  label: string;
  url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  caption: string | null;
  athlete_tags: string[];
  created_at: string;
};
type Reel = { id: string; title: string; clip_ids: string[]; is_shared: boolean; created_at: string };

const LABELS = ["highlight", "full_game", "period_1", "period_2", "period_3", "warmup", "other"] as const;
const LABEL_NAMES: Record<string, string> = {
  highlight: "Highlight", full_game: "Full Game", period_1: "Period 1", period_2: "Period 2", period_3: "Period 3", warmup: "Warmup", other: "Other",
};

export function GameMediaTab({ teamId, eventId, isCoach, currentUserId, currentPlayerId }: {
  teamId: string;
  eventId: string;
  isCoach: boolean;
  currentUserId: string | null;
  currentPlayerId?: string | null;
}) {
  const [media, setMedia] = useState<Media[]>([]);
  const [signed, setSigned] = useState<Record<string, { url: string; thumb: string | null }>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState<"all" | "photo" | "highlight" | "full_game" | "mine">("all");
  const [viewer, setViewer] = useState<number | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [reelBuilder, setReelBuilder] = useState(false);

  async function load() {
    const [m, p, r] = await Promise.all([
      supabase.from("game_media").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
      supabase.from("team_players").select("id,display_name,jersey_number").eq("team_id", teamId).order("display_name"),
      supabase.from("game_highlight_reels").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
    ]);
    const list = ((m.data ?? []) as any[]).map((x) => ({ ...x, athlete_tags: (x.athlete_tags ?? []) as string[] })) as Media[];
    setMedia(list);
    setPlayers((p.data ?? []) as Player[]);
    setReels(((r.data ?? []) as any[]).map((x) => ({ ...x, clip_ids: (x.clip_ids ?? []) as string[] })) as Reel[]);
    // generate signed URLs (private bucket)
    const paths: string[] = [];
    const thumbPaths: string[] = [];
    list.forEach((x) => { paths.push(x.url); if (x.thumbnail_url) thumbPaths.push(x.thumbnail_url); });
    const map: Record<string, { url: string; thumb: string | null }> = {};
    if (paths.length) {
      const { data: signedFiles } = await supabase.storage.from("game-media").createSignedUrls(paths, 3600);
      const thumbSigned = thumbPaths.length ? (await supabase.storage.from("game-media").createSignedUrls(thumbPaths, 3600)).data ?? [] : [];
      list.forEach((x, i) => {
        const url = signedFiles?.[i]?.signedUrl ?? "";
        const tIdx = x.thumbnail_url ? thumbPaths.indexOf(x.thumbnail_url) : -1;
        const thumb = tIdx >= 0 ? thumbSigned[tIdx]?.signedUrl ?? null : null;
        map[x.id] = { url, thumb };
      });
    }
    setSigned(map);
  }

  useEffect(() => { load(); }, [eventId, teamId]);

  const filtered = useMemo(() => {
    return media.filter((m) => {
      if (filter === "photo") return m.media_type === "photo";
      if (filter === "highlight") return m.label === "highlight";
      if (filter === "full_game") return m.label === "full_game";
      if (filter === "mine") return currentPlayerId ? m.athlete_tags.includes(currentPlayerId) : false;
      return true;
    });
  }, [media, filter, currentPlayerId]);

  return (
    <div className="space-y-3">
      {reels.filter((r) => r.is_shared).map((r) => (
        <FeaturedReel key={r.id} reel={r} media={media} signed={signed} onPlay={(i) => setViewer(media.findIndex((m) => m.id === r.clip_ids[i]))} />
      ))}

      {isCoach && <UploadBar teamId={teamId} eventId={eventId} userId={currentUserId} players={players} onDone={load} />}

      <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
        {(["all", "photo", "highlight", "full_game", "mine"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={"shrink-0 rounded-full px-3 py-1 " + (filter === k ? "bg-teal text-background" : "bg-surface text-muted-foreground")}>
            {k === "all" ? "All" : k === "photo" ? "Photos" : k === "highlight" ? "Highlights" : k === "full_game" ? "Full Game" : "Tagged"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No media yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((m) => {
            const s = signed[m.id];
            const idx = media.findIndex((x) => x.id === m.id);
            return (
              <button key={m.id} onClick={() => setViewer(idx)} className="relative aspect-square overflow-hidden rounded-lg bg-surface">
                {m.media_type === "photo" ? (
                  <img src={s?.url} alt={m.caption ?? ""} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <>
                    {s?.thumb ? <img src={s.thumb} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full w-full place-items-center bg-surface-2"><Film size={20} className="text-muted-foreground" /></div>}
                    <div className="absolute inset-0 grid place-items-center bg-black/30"><Play size={20} className="text-white" /></div>
                  </>
                )}
                <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white">{LABEL_NAMES[m.label]}</span>
                {m.athlete_tags.length > 0 && <span className="absolute right-1 top-1 rounded-full bg-teal/80 px-1 py-0.5 text-[8px] font-bold text-background"><Tag size={8} /></span>}
              </button>
            );
          })}
        </div>
      )}

      {isCoach && (
        <div className="rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <h4 className="inline-flex items-center gap-1.5 text-xs font-bold"><ListVideo size={14} /> Highlight Reels</h4>
            <button onClick={() => setReelBuilder(!reelBuilder)} className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
              <Plus size={10} /> {reelBuilder ? "Cancel" : "New Reel"}
            </button>
          </div>
          {reelBuilder && (
            <ReelBuilder teamId={teamId} eventId={eventId} userId={currentUserId} videos={media.filter((m) => m.media_type === "video")} onDone={() => { setReelBuilder(false); load(); }} />
          )}
          <div className="mt-2 space-y-1.5">
            {reels.map((r) => (
              <ReelRow key={r.id} reel={r} onUpdate={load} />
            ))}
            {reels.length === 0 && !reelBuilder && <p className="text-[11px] text-muted-foreground">No reels yet</p>}
          </div>
        </div>
      )}

      {viewer !== null && media[viewer] && (
        <Viewer items={media} signed={signed} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} />
      )}
    </div>
  );
}

function UploadBar({ teamId, eventId, userId, players, onDone }: { teamId: string; eventId: string; userId: string | null; players: Player[]; onDone: () => void }) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<{ file: File; progress: number; caption: string; tags: string[]; label: string; error?: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  function add(files: FileList | null, kind: "photo" | "video") {
    if (!files) return;
    const max = kind === "photo" ? 20 : 10;
    const arr = Array.from(files).slice(0, max).map((f) => ({ file: f, progress: 0, caption: "", tags: [] as string[], label: kind === "photo" ? "other" : "highlight" }));
    setQueue((q) => [...q, ...arr]);
  }

  async function uploadAll() {
    if (!userId) { alert("Sign in required"); return; }
    setUploading(true);
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        const ext = item.file.name.split(".").pop() || "bin";
        const path = `${teamId}/${eventId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("game-media").upload(path, item.file, { upsert: false, contentType: item.file.type });
        if (upErr) throw upErr;
        setQueue((q) => q.map((x, j) => j === i ? { ...x, progress: 100 } : x));
        const media_type = item.file.type.startsWith("video/") ? "video" : "photo";
        const { error: insErr } = await supabase.from("game_media").insert({
          event_id: eventId, team_id: teamId, uploaded_by: userId,
          media_type, label: item.label as any, url: path,
          caption: item.caption || null, athlete_tags: item.tags as any,
        });
        if (insErr) throw insErr;
      } catch (e: any) {
        setQueue((q) => q.map((x, j) => j === i ? { ...x, error: e?.message ?? "failed" } : x));
      }
    }
    setQueue([]);
    setUploading(false);
    onDone();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <h4 className="inline-flex items-center gap-1.5 text-xs font-bold"><Upload size={14} /> Upload Media</h4>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button onClick={() => photoRef.current?.click()} className="flex flex-col items-center gap-1 rounded-xl bg-background py-3 text-[10px] font-bold"><ImageIcon size={16} /> Photos</button>
        <button onClick={() => videoRef.current?.click()} className="flex flex-col items-center gap-1 rounded-xl bg-background py-3 text-[10px] font-bold"><Video size={16} /> Videos</button>
        <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-1 rounded-xl bg-background py-3 text-[10px] font-bold"><Video size={16} /> Record</button>
      </div>
      <input ref={photoRef} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files, "photo")} />
      <input ref={videoRef} type="file" accept="video/*" multiple hidden onChange={(e) => add(e.target.files, "video")} />
      <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" hidden onChange={(e) => add(e.target.files, "video")} />

      {queue.length > 0 && (
        <div className="mt-2 space-y-2">
          {queue.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate font-semibold">{q.file.name}</span>
                <button onClick={() => setQueue((arr) => arr.filter((_, j) => j !== i))} className="rounded-full bg-surface p-1"><X size={10} /></button>
              </div>
              <input value={q.caption} onChange={(e) => setQueue((arr) => arr.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))} placeholder="Caption (optional)" className="mt-1.5 w-full rounded-lg bg-surface px-2 py-1 text-[11px]" />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {LABELS.map((l) => (
                  <button key={l} onClick={() => setQueue((arr) => arr.map((x, j) => j === i ? { ...x, label: l } : x))} className={"rounded-full px-2 py-0.5 text-[9px] font-bold " + (q.label === l ? "bg-teal text-background" : "bg-surface text-muted-foreground")}>{LABEL_NAMES[l]}</button>
                ))}
              </div>
              <details className="mt-1.5">
                <summary className="cursor-pointer text-[10px] text-muted-foreground">Tag athletes ({q.tags.length})</summary>
                <div className="mt-1 flex flex-wrap gap-1">
                  {players.map((p) => {
                    const on = q.tags.includes(p.id);
                    return <button key={p.id} onClick={() => setQueue((arr) => arr.map((x, j) => j === i ? { ...x, tags: on ? x.tags.filter((t) => t !== p.id) : [...x.tags, p.id] } : x))} className={"rounded-full px-2 py-0.5 text-[10px] " + (on ? "bg-teal text-background" : "bg-surface text-muted-foreground")}>{p.jersey_number ? `#${p.jersey_number} ` : ""}{p.display_name}</button>;
                  })}
                </div>
              </details>
              {q.progress > 0 && <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface"><div className="h-full bg-teal transition-all" style={{ width: `${q.progress}%` }} /></div>}
              {q.error && <p className="mt-1 text-[10px] text-red-400">{q.error}</p>}
            </div>
          ))}
          <button onClick={uploadAll} disabled={uploading} className="w-full rounded-full bg-gradient-brand py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            {uploading ? "Uploading…" : `Upload ${queue.length} file${queue.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}

function Viewer({ items, signed, index, onClose, onIndex }: { items: Media[]; signed: Record<string, { url: string; thumb: string | null }>; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const m = items[index];
  const s = signed[m.id];
  async function download() {
    if (!s?.url) return;
    try {
      const res = await fetch(s.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = m.caption ? m.caption.replace(/\W+/g, "_") : `media-${m.id}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* noop */ }
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-[11px] font-bold">{index + 1} / {items.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={download} className="rounded-full bg-white/10 p-2"><Download size={14} /></button>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2"><X size={14} /></button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-2">
        {m.media_type === "photo" ? (
          <img src={s?.url} alt={m.caption ?? ""} className="max-h-full max-w-full object-contain" />
        ) : (
          <video src={s?.url} controls autoPlay className="max-h-full max-w-full" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3 text-white">
        <button disabled={index === 0} onClick={() => onIndex(index - 1)} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold disabled:opacity-30">Prev</button>
        <p className="flex-1 truncate text-center text-[11px]">{m.caption}</p>
        <button disabled={index === items.length - 1} onClick={() => onIndex(index + 1)} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

function ReelBuilder({ teamId, eventId, userId, videos, onDone }: { teamId: string; eventId: string; userId: string | null; videos: Media[]; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setOrder((o) => o.includes(id) ? o.filter((x) => x !== id) : [...o, id]);
  }
  function move(i: number, dir: -1 | 1) {
    setOrder((o) => { const c = [...o]; const j = i + dir; if (j < 0 || j >= c.length) return o; [c[i], c[j]] = [c[j], c[i]]; return c; });
  }
  async function save() {
    if (!userId || !title || order.length === 0) { alert("Title + at least one clip required"); return; }
    setBusy(true);
    const { error } = await supabase.from("game_highlight_reels").insert({ event_id: eventId, team_id: teamId, title, clip_ids: order as any, created_by: userId });
    setBusy(false);
    if (error) alert(error.message); else onDone();
  }

  return (
    <div className="mt-2 rounded-xl border border-border bg-background p-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reel title (e.g. Wildcats vs Raiders — Top Moments)" className="w-full rounded-lg bg-surface px-2 py-1.5 text-xs" />
      <p className="mt-2 text-[10px] font-bold tracking-wider text-muted-foreground">CLIPS (tap to add, then reorder)</p>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {videos.map((v) => {
          const on = order.includes(v.id);
          return <button key={v.id} onClick={() => toggle(v.id)} className={"aspect-square rounded-lg border-2 bg-surface text-[9px] " + (on ? "border-teal text-teal" : "border-transparent text-muted-foreground")}>
            <Film size={14} className="mx-auto" /> {LABEL_NAMES[v.label]}
          </button>;
        })}
        {videos.length === 0 && <p className="col-span-4 p-2 text-[11px] text-muted-foreground">Upload video clips first</p>}
      </div>
      {order.length > 0 && (
        <div className="mt-2 space-y-1">
          {order.map((id, i) => {
            const v = videos.find((x) => x.id === id);
            return (
              <div key={id} className="flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-[11px]">
                <span className="font-bold text-teal">{i + 1}.</span>
                <span className="flex-1 truncate">{v?.caption || LABEL_NAMES[v?.label ?? "other"]}</span>
                <button onClick={() => move(i, -1)} className="rounded bg-background px-1.5 py-0.5 text-[9px]">↑</button>
                <button onClick={() => move(i, 1)} className="rounded bg-background px-1.5 py-0.5 text-[9px]">↓</button>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={save} disabled={busy} className="mt-2 w-full rounded-full bg-gradient-brand py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save Reel"}</button>
      <p className="mt-1 text-[9px] text-muted-foreground">Note: clips play back-to-back. Stitching into one file is a follow-up.</p>
    </div>
  );
}

function ReelRow({ reel, onUpdate }: { reel: Reel; onUpdate: () => void }) {
  async function toggleShare() {
    await supabase.from("game_highlight_reels").update({ is_shared: !reel.is_shared }).eq("id", reel.id);
    onUpdate();
  }
  async function del() {
    if (!confirm("Delete reel?")) return;
    await supabase.from("game_highlight_reels").delete().eq("id", reel.id);
    onUpdate();
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-background p-2">
      <ListVideo size={14} className="text-teal" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{reel.title}</p>
        <p className="text-[10px] text-muted-foreground">{reel.clip_ids.length} clip{reel.clip_ids.length === 1 ? "" : "s"}</p>
      </div>
      <button onClick={toggleShare} className={"rounded-full px-2 py-1 text-[10px] font-bold " + (reel.is_shared ? "bg-teal text-background" : "bg-surface text-muted-foreground")}>
        <Share2 size={10} className="inline" /> {reel.is_shared ? "Shared" : "Share"}
      </button>
      <button onClick={del} className="rounded-full bg-surface p-1.5 text-muted-foreground"><Trash2 size={10} /></button>
    </div>
  );
}

function FeaturedReel({ reel, media, signed, onPlay }: { reel: Reel; media: Media[]; signed: Record<string, { url: string; thumb: string | null }>; onPlay: (i: number) => void }) {
  const clips = reel.clip_ids.map((id) => media.find((m) => m.id === id)).filter(Boolean) as Media[];
  return (
    <div className="rounded-2xl border border-teal/40 bg-gradient-to-br from-teal/10 to-emerald-500/10 p-3">
      <div className="flex items-center gap-2">
        <ListVideo size={14} className="text-teal" />
        <p className="flex-1 truncate text-xs font-bold">{reel.title}</p>
        <span className="rounded-full bg-teal px-2 py-0.5 text-[9px] font-bold text-background">FEATURED REEL</span>
      </div>
      <div className="mt-2 flex gap-1 overflow-x-auto">
        {clips.map((c, i) => {
          const s = signed[c.id];
          return (
            <button key={c.id} onClick={() => onPlay(i)} className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface">
              {s?.thumb ? <img src={s.thumb} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center"><Film size={16} /></div>}
              <div className="absolute inset-0 grid place-items-center bg-black/30"><Play size={16} className="text-white" /></div>
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[8px] font-bold text-white">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}