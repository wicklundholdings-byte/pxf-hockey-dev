import { useEffect, useRef, useState } from "react";
import { X, Video as VideoIcon, Square, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createAthleteMedia } from "@/lib/athlete-media.functions";

type Roster = { id: string; full_name: string }[];

export function InSessionRecorder({
  roster,
  sessionId,
  onClose,
}: {
  roster: Roster;
  sessionId?: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const videoLiveRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalBlobRef = useRef<Blob | null>(null);
  const create = useServerFn(createAthleteMedia);

  const athlete = roster.find((r) => r.id === selected);
  const filtered = roster.filter((r) => r.full_name.toLowerCase().includes(filter.toLowerCase()));

  useEffect(() => {
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
      if (videoLiveRef.current) {
        videoLiveRef.current.srcObject = stream;
        videoLiveRef.current.play();
      }
    } catch (e) {
      console.error(e);
      alert("Camera not available");
    }
  }

  useEffect(() => {
    if (selected && !blobUrl) startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function startRec() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      finalBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
  }

  function stopRec() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function discard() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    finalBlobRef.current = null;
    setCaption("");
    // Re-open camera for next clip
  }

  async function save() {
    if (!finalBlobRef.current || !selected) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const path = `${uid}/${selected}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("athlete-media")
        .upload(path, finalBlobRef.current, { contentType: "video/webm" });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("athlete-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      await create({
        data: {
          athlete_id: selected,
          session_id: sessionId ?? null,
          video_url: signed?.signedUrl ?? path,
          caption: caption || null,
        },
      });
      // Reset for next athlete
      discard();
      setSelected(null);
    } catch (e: any) {
      alert(e?.message ?? "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-surface">
          <X size={14} />
        </button>
        <p className="text-[10px] font-bold tracking-[0.3em] text-teal">RECORD</p>
        <div className="w-8" />
      </div>

      {!selected && (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 text-[11px] text-muted-foreground">Pick athlete to film</p>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search roster…"
            className="mb-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          />
          {roster.length === 0 && (
            <p className="text-[11px] text-muted-foreground">No checked-in athletes.</p>
          )}
          <ul className="space-y-1.5">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">{r.full_name}</span>
                  <span className="text-[10px] text-teal">Select →</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && !blobUrl && (
        <div className="flex flex-1 flex-col">
          <div className="relative flex-1 bg-black">
            <video ref={videoLiveRef} className="h-full w-full object-cover" playsInline muted />
            <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
              {athlete?.full_name}
            </div>
            {recording && (
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 border-t border-border bg-background p-4">
            <button onClick={() => setSelected(null)} className="rounded-md border border-border bg-surface px-3 py-2 text-xs">
              Change
            </button>
            {!recording ? (
              <button onClick={startRec} className="grid h-16 w-16 place-items-center rounded-full bg-rose-500 text-white">
                <VideoIcon size={24} />
              </button>
            ) : (
              <button onClick={stopRec} className="grid h-16 w-16 place-items-center rounded-full bg-white text-rose-500">
                <Square size={24} />
              </button>
            )}
            <div className="w-[68px]" />
          </div>
        </div>
      )}

      {selected && blobUrl && (
        <div className="flex flex-1 flex-col gap-3 p-3">
          <video ref={previewRef} src={blobUrl} controls className="w-full rounded-2xl bg-black" />
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
    </div>
  );
}