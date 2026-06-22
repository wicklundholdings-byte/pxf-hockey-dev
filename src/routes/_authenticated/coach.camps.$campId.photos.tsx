import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Upload, Image as ImageIcon, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId/photos")({
  component: PhotosPage,
});

type Session = { id: string; session_date: string };
type Media = { id: string; storage_path: string; created_at: string; url?: string };

const BUCKET = "camp-images";

function PhotosPage() {
  const { campId } = useParams({ from: "/_authenticated/coach/camps/$campId/photos" });
  const [campName, setCampName] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from("camps").select("name").eq("id", campId).maybeSingle(),
        supabase.from("camp_sessions").select("id,session_date").eq("camp_id", campId).order("session_date"),
      ]);
      setCampName(c.data?.name ?? "");
      const sess = (s.data ?? []) as Session[];
      setSessions(sess);
      const today = new Date().toISOString().slice(0, 10);
      setActiveDate(sess.find((x) => x.session_date === today)?.session_date ?? sess[0]?.session_date ?? null);
    })();
  }, [campId]);

  useEffect(() => {
    if (!activeDate) return;
    void loadMedia(activeDate);
  }, [campId, activeDate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadMedia(date: string) {
    const prefix = `camps/${campId}/photos/${date}/`;
    const { data } = await supabase
      .from("camp_media")
      .select("id,storage_path,created_at")
      .eq("camp_id", campId)
      .like("storage_path", prefix + "%")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Media[];
    const withUrls = await Promise.all(
      rows.map(async (m) => {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(m.storage_path, 60 * 60 * 24);
        return { ...m, url: signed?.signedUrl };
      }),
    );
    setMedia(withUrls);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !activeDate) return;
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setUploading(false);
      setToast("Sign in required");
      return;
    }
    let ok = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `camps/${campId}/photos/${activeDate}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) continue;
      const { error: insErr } = await supabase.from("camp_media").insert({
        camp_id: campId,
        storage_path: path,
        uploaded_by: u.user.id,
      });
      if (!insErr) ok++;
    }
    setUploading(false);
    setToast(ok > 0 ? `Uploaded ${ok} photo${ok === 1 ? "" : "s"}` : "Upload failed");
    void loadMedia(activeDate);
  }

  async function removePhoto(m: Media) {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from(BUCKET).remove([m.storage_path]);
    await supabase.from("camp_media").delete().eq("id", m.id);
    setMedia((list) => list.filter((x) => x.id !== m.id));
  }

  return (
    <div className="space-y-4">
      <Link to="/coach/camps/$campId" params={{ campId }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back to {campName || "camp"}
      </Link>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Camp Photos</p>
        <h1 className="font-display text-xl font-bold text-foreground">{campName}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">Visible to registered parents.</p>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No camp days scheduled yet.
        </p>
      ) : (
        <>
          <div className="-mx-5 overflow-x-auto px-5">
            <div className="flex gap-2">
              {sessions.map((s, i) => {
                const active = s.session_date === activeDate;
                const d = new Date(s.session_date + "T00:00:00");
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveDate(s.session_date)}
                    className={"shrink-0 rounded-2xl border px-3 py-2 text-center transition-colors " + (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-foreground")}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wider">Day {i + 1}</p>
                    <p className="text-[11px] font-semibold">{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-teal/50 bg-teal/5 py-6 text-sm font-bold text-teal hover:bg-teal/10">
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> Uploading…</>
            ) : (
              <><Upload size={16} /> Upload photos for this day</>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          {media.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <ImageIcon size={28} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">No photos uploaded for this day yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {media.map((m) => (
                <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
                  {m.url ? (
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageIcon size={18} /></div>
                  )}
                  <button
                    onClick={() => removePhoto(m)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-red-300 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete photo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-teal px-4 py-2 text-xs font-bold text-black shadow-lg">{toast}</div>
      )}
    </div>
  );
}