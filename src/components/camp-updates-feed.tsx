import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ThumbsUp, Image as ImageIcon, Video as VideoIcon, Loader2, Trash2, Pin, Download, Tag, Plus } from "lucide-react";

const BUCKET = "camp-media";

type Media = {
  id: string;
  update_id: string;
  media_type: "photo" | "video";
  url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  display_order: number;
  _signed?: string;
};
type Tag = { update_id: string; athlete_id: string; athlete_name?: string };
type Update = {
  id: string;
  camp_id: string;
  camp_day_date: string | null;
  post_type: "daily" | "wrap";
  caption: string | null;
  posted_by: string;
  created_at: string;
  media: Media[];
  tags: Tag[];
  reactions: number;
  i_reacted: boolean;
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function CampUpdatesFeed({ campId, canManage }: { campId: string; canManage: boolean }) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: upd } = await (supabase as any)
      .from("camp_updates")
      .select("id, camp_id, camp_day_date, post_type, caption, posted_by, created_at")
      .eq("camp_id", campId)
      .order("created_at", { ascending: false });
    const ups = (upd ?? []) as Update[];
    if (ups.length === 0) {
      setUpdates([]);
      setLoading(false);
      return;
    }
    const ids = ups.map((u) => u.id);
    const [{ data: mediaRows }, { data: tagRows }, { data: reactRows }] = await Promise.all([
      (supabase as any).from("camp_update_media").select("*").in("update_id", ids).order("display_order"),
      (supabase as any).from("camp_update_athlete_tags").select("update_id, athlete_id, attendees(full_name)").in("update_id", ids),
      (supabase as any).from("camp_update_reactions").select("update_id, parent_id").in("update_id", ids),
    ]);
    const mediaByUpdate = new Map<string, Media[]>();
    for (const m of (mediaRows ?? []) as Media[]) {
      const list = mediaByUpdate.get(m.update_id) ?? [];
      // Resolve signed URL (path stored in url field)
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(m.url, 60 * 60 * 4);
      list.push({ ...m, _signed: signed?.signedUrl });
      mediaByUpdate.set(m.update_id, list);
    }
    const tagsByUpdate = new Map<string, Tag[]>();
    for (const t of (tagRows ?? []) as any[]) {
      const list = tagsByUpdate.get(t.update_id) ?? [];
      list.push({ update_id: t.update_id, athlete_id: t.athlete_id, athlete_name: t.attendees?.full_name ?? "Athlete" });
      tagsByUpdate.set(t.update_id, list);
    }
    const reactCounts = new Map<string, number>();
    const reactMine = new Set<string>();
    for (const r of (reactRows ?? []) as any[]) {
      reactCounts.set(r.update_id, (reactCounts.get(r.update_id) ?? 0) + 1);
      if (user && r.parent_id === user.id) reactMine.add(r.update_id);
    }
    const sorted = ups
      .map((u) => ({
        ...u,
        media: mediaByUpdate.get(u.id) ?? [],
        tags: tagsByUpdate.get(u.id) ?? [],
        reactions: reactCounts.get(u.id) ?? 0,
        i_reacted: reactMine.has(u.id),
      }))
      // pinned wrap posts first
      .sort((a, b) => {
        if (a.post_type === b.post_type) return 0;
        return a.post_type === "wrap" ? -1 : 1;
      });
    setUpdates(sorted);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campId, user?.id]);

  async function react(u: Update) {
    if (!user) return;
    if (u.i_reacted) {
      await (supabase as any).from("camp_update_reactions").delete().eq("update_id", u.id).eq("parent_id", user.id);
      setUpdates((list) => list.map((x) => (x.id === u.id ? { ...x, reactions: Math.max(0, x.reactions - 1), i_reacted: false } : x)));
    } else {
      await (supabase as any).from("camp_update_reactions").insert({ update_id: u.id, parent_id: user.id });
      setUpdates((list) => list.map((x) => (x.id === u.id ? { ...x, reactions: x.reactions + 1, i_reacted: true } : x)));
    }
  }

  async function deleteUpdate(u: Update) {
    if (!confirm("Delete this update? All media will be removed.")) return;
    if (u.media.length) {
      await supabase.storage.from(BUCKET).remove(u.media.map((m) => m.url));
    }
    await (supabase as any).from("camp_updates").delete().eq("id", u.id);
    setUpdates((list) => list.filter((x) => x.id !== u.id));
  }

  async function saveMedia(m: Media) {
    if (!m._signed) return;
    const a = document.createElement("a");
    a.href = m._signed;
    a.download = "";
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (loading) return <div className="grid place-items-center py-10 text-muted-foreground"><Loader2 className="animate-spin" /></div>;

  if (updates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <ImageIcon size={28} className="mx-auto text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">No daily updates yet. Check back during camp days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((u) => (
        <article key={u.id} className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="flex items-center justify-between px-4 pt-3">
            <div className="flex items-center gap-2">
              {u.post_type === "wrap" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal">
                  <Pin size={10} /> Camp Wrap
                </span>
              )}
              {u.post_type === "daily" && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Day Update {u.camp_day_date ? `· ${new Date(u.camp_day_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{timeAgo(u.created_at)}</span>
          </header>

          {u.media.length > 0 && (
            <div className={"mt-3 " + (u.media.length === 1 ? "" : "-mx-1 overflow-x-auto")}>
              <div className={u.media.length === 1 ? "" : "flex gap-2 px-1"}>
                {u.media.map((m) => (
                  <div key={m.id} className={"relative shrink-0 overflow-hidden bg-surface " + (u.media.length === 1 ? "w-full" : "w-72 rounded-xl")}>
                    {m.media_type === "photo" ? (
                      m._signed ? (
                        <img src={m._signed} alt="" className="h-full max-h-96 w-full object-cover" />
                      ) : (
                        <div className="grid h-72 w-full place-items-center text-muted-foreground"><ImageIcon /></div>
                      )
                    ) : (
                      m._signed ? (
                        <video src={m._signed} controls playsInline preload="metadata" className="h-full max-h-96 w-full bg-black object-cover" />
                      ) : (
                        <div className="grid h-72 w-full place-items-center text-muted-foreground"><VideoIcon /></div>
                      )
                    )}
                    <button
                      onClick={() => saveMedia(m)}
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                      aria-label="Save"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {u.caption && <p className="px-4 pt-3 text-sm text-foreground">{u.caption}</p>}

          {u.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {u.tags.map((t) => (
                <span key={t.athlete_id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  <Tag size={9} /> {t.athlete_name}
                </span>
              ))}
            </div>
          )}

          <footer className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => react(u)}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition " +
                (u.i_reacted ? "bg-teal text-black" : "border border-border bg-surface text-muted-foreground")
              }
            >
              <ThumbsUp size={11} /> {u.reactions || ""}{u.i_reacted ? " You" : u.reactions ? "" : "React"}
            </button>
            {canManage && (
              <button onClick={() => deleteUpdate(u)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400">
                <Trash2 size={11} /> Delete
              </button>
            )}
          </footer>
        </article>
      ))}
    </div>
  );
}

/* -------- Composer -------- */

type Attendee = { id: string; full_name: string | null };

export function CampUpdateComposer({
  campId,
  onClose,
  onPosted,
}: {
  campId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<"daily" | "wrap">("daily");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [roster, setRoster] = useState<Attendee[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("registrations")
        .select("attendees(id, full_name)")
        .eq("camp_id", campId)
        .in("status", ["paid", "confirmed", "checked_in"]);
      const seen = new Set<string>();
      const list: Attendee[] = [];
      for (const r of (data ?? []) as any[]) {
        const a = r.attendees;
        if (a && !seen.has(a.id)) {
          seen.add(a.id);
          list.push(a);
        }
      }
      setRoster(list);
    })();
  }, [campId]);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = [...photos, ...Array.from(files)].slice(0, 6);
    setPhotos(next);
  }
  function addVideos(files: FileList | null) {
    if (!files) return;
    const next = [...videos, ...Array.from(files)].slice(0, 3);
    setVideos(next);
  }

  async function submit() {
    if (!user) {
      setError("Sign in required");
      return;
    }
    if (photos.length === 0 && videos.length === 0) {
      setError("Add at least one photo or video");
      return;
    }
    setPosting(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    const { data: updRow, error: updErr } = await (supabase as any)
      .from("camp_updates")
      .insert({
        camp_id: campId,
        camp_day_date: postType === "daily" ? today : null,
        post_type: postType,
        caption: caption.trim() || null,
        posted_by: user.id,
      })
      .select("id")
      .single();
    if (updErr || !updRow) {
      setError(updErr?.message ?? "Failed to create post");
      setPosting(false);
      return;
    }
    const updateId = updRow.id as string;
    let order = 0;
    const mediaRows: any[] = [];
    for (const f of photos) {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${campId}/${updateId}/p-${order}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
      if (upErr) continue;
      mediaRows.push({ update_id: updateId, media_type: "photo", url: path, display_order: order });
      order++;
    }
    for (const f of videos) {
      const ext = f.name.split(".").pop() ?? "mp4";
      const path = `${campId}/${updateId}/v-${order}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
      if (upErr) continue;
      mediaRows.push({ update_id: updateId, media_type: "video", url: path, display_order: order });
      order++;
    }
    if (mediaRows.length) {
      await (supabase as any).from("camp_update_media").insert(mediaRows);
    }
    if (tags.size) {
      await (supabase as any).from("camp_update_athlete_tags").insert(
        Array.from(tags).map((athlete_id) => ({ update_id: updateId, athlete_id })),
      );
    }
    setPosting(false);
    onPosted();
  }

  function toggleTag(id: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-background p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Post Update</h2>
          <button onClick={onClose} className="text-xs text-muted-foreground">Cancel</button>
        </div>

        <div className="mb-3 flex gap-1 rounded-2xl border border-border bg-card p-1">
          {(["daily", "wrap"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPostType(t)}
              className={"flex-1 rounded-xl py-2 text-[11px] font-semibold capitalize " + (postType === t ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")}
            >
              {t === "daily" ? "Today's Update" : "Camp Wrap"}
            </button>
          ))}
        </div>

        <label className="mb-2 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Photos ({photos.length}/6)</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {photos.map((f, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg bg-surface">
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl-lg bg-black/70 text-[10px] text-white">×</button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                <Plus size={16} />
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
              </label>
            )}
          </div>
        </label>

        <label className="mb-3 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Videos ({videos.length}/3, max 2 min each)</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {videos.map((f, i) => (
              <div key={i} className="relative flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg bg-surface text-[10px] text-muted-foreground">
                <VideoIcon size={14} className="mr-1" /> {f.name.slice(0, 8)}
                <button onClick={() => setVideos(videos.filter((_, j) => j !== i))} className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl-lg bg-black/70 text-[10px] text-white">×</button>
              </div>
            ))}
            {videos.length < 3 && (
              <label className="grid h-16 w-24 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                <Plus size={16} />
                <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => addVideos(e.target.files)} />
              </label>
            )}
          </div>
        </label>

        <label className="mb-3 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Caption</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 280))}
            maxLength={280}
            placeholder="What happened today?"
            className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm"
            rows={3}
          />
          <span className="text-[10px] text-muted-foreground">{caption.length}/280</span>
        </label>

        {roster.length > 0 && (
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tag athletes</span>
            <div className="mt-1 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {roster.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleTag(a.id)}
                  className={
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold transition " +
                    (tags.has(a.id) ? "bg-teal text-black" : "border border-border bg-surface text-muted-foreground")
                  }
                >
                  {a.full_name || "Athlete"}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={posting || (photos.length === 0 && videos.length === 0)}
          className="w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {posting ? "Publishing…" : "Publish update"}
        </button>
      </div>
    </div>
  );
}