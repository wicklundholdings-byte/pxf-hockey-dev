import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Video as VideoIcon, Square, Save, Trash2, X, Search, Tag, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createAthleteMedia,
  listCoachMedia,
  listCoachRoster,
  listCoachSessions,
  tagMediaAthlete,
} from "@/lib/athlete-media.functions";
import { VideoAnalysisPlayer } from "@/components/video-analysis-player";

export const Route = createFileRoute("/_authenticated/coach/film")({
  component: FilmScreen,
});

type Tab = "record" | "review";

function FilmScreen() {
  const [tab, setTab] = useState<Tab>("record");
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold">Film</h2>
        <p className="text-[11px] text-muted-foreground">Record, review and send clips to athletes.</p>
      </div>
      <div className="flex gap-2">
        {(["record", "review"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-full border px-3 py-2 text-xs font-bold capitalize " +
              (tab === t ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "record" ? <RecordPanel /> : <ReviewPanel />}
    </div>
  );
}

function RecordPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <p className="mb-4 text-xs text-muted-foreground">
        Tap record to open the camera. Tag the athlete before or after recording.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-rose-500 text-white shadow-lg active:scale-95"
        aria-label="Open camera"
      >
        <Camera size={36} />
      </button>
      <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-rose-500">Record</p>
      {open && <StandaloneRecorder onClose={() => setOpen(false)} />}
    </div>
  );
}

function StandaloneRecorder({ onClose }: { onClose: () => void }) {
  const rosterFn = useServerFn(listCoachRoster);
  const sessionsFn = useServerFn(listCoachSessions);
  const create = useServerFn(createAthleteMedia);
  const [roster, setRoster] = useState<{ id: string; full_name: string }[]>([]);
  const [sessions, setSessions] = useState<{ id: string; label: string }[]>([]);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | "">("");
  const [caption, setCaption] = useState("");
  const [filter, setFilter] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const finalBlob = useRef<Blob | null>(null);

  useEffect(() => {
    rosterFn().then((r) => setRoster(r as any));
    sessionsFn().then((s) => setSessions(s as any));
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        liveRef.current.play();
      }
    } catch {
      alert("Camera not available");
    }
  }

  function startRec() {
    if (!streamRef.current) return;
    chunks.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: "video/webm" });
      finalBlob.current = blob;
      setBlobUrl(URL.createObjectURL(blob));
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
  }
  function stopRec() {
    recRef.current?.stop();
    setRecording(false);
  }
  function discard() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    finalBlob.current = null;
  }

  async function save() {
    if (!finalBlob.current) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not signed in");
      const path = `${uid}/${athleteId ?? "untagged"}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("athlete-media")
        .upload(path, finalBlob.current, { contentType: "video/webm" });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("athlete-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      await create({
        data: {
          athlete_id: athleteId,
          session_id: sessionId || null,
          video_url: signed?.signedUrl ?? path,
          caption: caption || null,
        },
      });
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  const athlete = roster.find((r) => r.id === athleteId);
  const filtered = roster.filter((r) => r.full_name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-surface">
          <X size={14} />
        </button>
        <p className="text-[10px] font-bold tracking-[0.3em] text-teal">FILM</p>
        <div className="w-8" />
      </div>

      {!blobUrl && (
        <div className="flex flex-1 flex-col">
          <div className="relative flex-1 bg-black">
            <video ref={liveRef} className="h-full w-full object-cover" playsInline muted />
            <button
              onClick={() => setShowPicker(true)}
              className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white"
            >
              <Tag size={12} /> {athlete?.full_name ?? "Tag athlete (optional)"}
            </button>
            {recording && (
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 border-t border-border p-4">
            {!recording ? (
              <button onClick={startRec} className="grid h-16 w-16 place-items-center rounded-full bg-rose-500 text-white">
                <VideoIcon size={24} />
              </button>
            ) : (
              <button onClick={stopRec} className="grid h-16 w-16 place-items-center rounded-full bg-white text-rose-500">
                <Square size={24} />
              </button>
            )}
          </div>
        </div>
      )}

      {blobUrl && (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
          <video src={blobUrl} controls className="w-full rounded-2xl bg-black" />
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2"><Tag size={12} /> Athlete</span>
            <span className={athlete ? "font-semibold" : "text-muted-foreground"}>
              {athlete?.full_name ?? "Untagged"}
            </span>
          </button>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">No session (optional)</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)…"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="mt-auto flex gap-2">
            <button onClick={discard} className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border bg-surface py-3 text-xs font-bold">
              <Trash2 size={14} /> Discard
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="flex flex-[1.4] items-center justify-center gap-1 rounded-2xl bg-gradient-brand py-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              <Save size={14} /> {saving ? "Saving…" : "Save clip"}
            </button>
          </div>
        </div>
      )}

      {showPicker && (
        <div className="absolute inset-0 z-10 flex flex-col bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold">Tag athlete</p>
            <button onClick={() => setShowPicker(false)} className="text-xs text-muted-foreground">Close</button>
          </div>
          <div className="relative mb-3">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search roster…"
              className="w-full rounded-full border border-border bg-surface py-2 pl-8 pr-3 text-sm"
            />
          </div>
          <button
            onClick={() => { setAthleteId(null); setShowPicker(false); }}
            className="mb-2 rounded-xl border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground"
          >
            Leave untagged (tag later in Review)
          </button>
          <ul className="flex-1 space-y-1.5 overflow-y-auto">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => { setAthleteId(r.id); setShowPicker(false); }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm"
                >
                  {r.full_name}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground">No athletes.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}

type Clip = {
  id: string;
  athlete_id: string | null;
  athlete_name: string | null;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  annotation_status: "raw" | "reviewed" | "annotated";
  recorded_at: string;
  is_shared: boolean;
};

function ReviewPanel() {
  const listFn = useServerFn(listCoachMedia);
  const rosterFn = useServerFn(listCoachRoster);
  const tagFn = useServerFn(tagMediaAthlete);
  const [clips, setClips] = useState<Clip[]>([]);
  const [roster, setRoster] = useState<{ id: string; full_name: string }[]>([]);
  const [filter, setFilter] = useState<"all" | "unreviewed" | "untagged">("all");
  const [groupBy, setGroupBy] = useState<"athlete" | "date">("athlete");
  const [open, setOpen] = useState<Clip | null>(null);
  const [tagging, setTagging] = useState<Clip | null>(null);
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const rows = (await listFn({ data: { filter } })) as Clip[];
      setClips(rows);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  useEffect(() => {
    rosterFn().then((r) => setRoster(r as any));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const untagged = clips.filter((c) => !c.athlete_id);
  const tagged = clips.filter((c) => c.athlete_id);

  const groups = useMemo(() => {
    const map = new Map<string, Clip[]>();
    for (const c of tagged) {
      const key =
        groupBy === "athlete"
          ? c.athlete_name ?? "Unknown"
          : new Date(c.recorded_at).toLocaleDateString();
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [tagged, groupBy]);

  const filteredRoster = roster.filter((r) => r.full_name.toLowerCase().includes(tagFilter.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "unreviewed", "untagged"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full border px-3 py-1 text-[10px] font-bold capitalize " +
              (filter === f ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
            }
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => setGroupBy(groupBy === "athlete" ? "date" : "athlete")}
          className="ml-auto rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold text-muted-foreground"
        >
          Group: {groupBy}
        </button>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {untagged.length > 0 && filter !== "unreviewed" && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Untagged ({untagged.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {untagged.map((c) => (
              <UntaggedCard key={c.id} clip={c} onOpen={() => setOpen(c)} onTag={() => { setTagging(c); setTagFilter(""); }} />
            ))}
          </div>
        </div>
      )}

      {!loading && clips.length === 0 && (
        <p className="text-xs text-muted-foreground">No clips yet. Record one from the Record tab.</p>
      )}

      {groups.map(([key, items]) => (
        <div key={key} className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-teal">{key}</p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((c) => (
              <ClipCard key={c.id} clip={c} onOpen={() => setOpen(c)} />
            ))}
          </div>
        </div>
      ))}

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background p-3">
          <div className="mb-2 flex justify-end">
            <button onClick={() => { setOpen(null); refresh(); }} className="rounded-md border border-border bg-surface px-3 py-1 text-xs">
              Close
            </button>
          </div>
          <VideoAnalysisPlayer
            videoUrl={open.video_url}
            mediaId={open.id}
            athleteName={open.athlete_name ?? undefined}
            onSendToAthlete={() => refresh()}
          />
        </div>
      )}

      {tagging && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold">Tag athlete</p>
            <button onClick={() => setTagging(null)} className="text-xs text-muted-foreground">Close</button>
          </div>
          <input
            autoFocus
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Search roster…"
            className="mb-3 w-full rounded-full border border-border bg-surface py-2 px-3 text-sm"
          />
          <ul className="flex-1 space-y-1.5 overflow-y-auto">
            {filteredRoster.map((r) => (
              <li key={r.id}>
                <button
                  onClick={async () => {
                    await tagFn({ data: { id: tagging.id, athlete_id: r.id } });
                    setTagging(null);
                    refresh();
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm"
                >
                  {r.full_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ClipCard({ clip, onOpen }: { clip: Clip; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="overflow-hidden rounded-xl border border-border bg-surface text-left">
      <div className="relative aspect-video bg-black">
        {clip.thumbnail_url ? (
          <img src={clip.thumbnail_url} alt="" className="h-full w-full object-cover" />
        ) : null}
        <span className={"absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold " + statusClass(clip.annotation_status)}>
          {clip.annotation_status.toUpperCase()}
        </span>
      </div>
      <div className="p-1.5">
        <p className="truncate text-[11px] font-semibold">{clip.athlete_name ?? "Untagged"}</p>
        <p className="text-[9px] text-muted-foreground">{new Date(clip.recorded_at).toLocaleString()}</p>
      </div>
    </button>
  );
}

function UntaggedCard({ clip, onOpen, onTag }: { clip: Clip; onOpen: () => void; onTag: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-amber-400/40 bg-surface">
      <button onClick={onOpen} className="relative block aspect-video w-full bg-black">
        {clip.thumbnail_url && <img src={clip.thumbnail_url} alt="" className="h-full w-full object-cover" />}
      </button>
      <div className="space-y-1 p-1.5">
        <p className="text-[9px] text-muted-foreground">{new Date(clip.recorded_at).toLocaleString()}</p>
        <button onClick={onTag} className="w-full rounded-md bg-amber-400 px-2 py-1 text-[10px] font-bold text-background">
          Tag Athlete
        </button>
      </div>
    </div>
  );
}

function statusClass(s: string) {
  if (s === "annotated") return "bg-teal text-background";
  if (s === "reviewed") return "bg-amber-400 text-background";
  return "bg-card text-muted-foreground";
}