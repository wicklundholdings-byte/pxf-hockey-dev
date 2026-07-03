import { useRef, useState } from "react";
import { X, Video, Upload, Camera, RotateCcw, Circle } from "lucide-react";
import { ReviewTagSheet } from "./review-tag-sheet";

export type FilmingContext = {
  contextLabel: string; // "Coach Davis · Jul 3 Practice"
  attendeeIds?: string[]; // pre-shown athlete IDs
  isParent?: boolean; // parent uploads need approval
};

type PendingClip = { file: File; url: string; durationSec: number };

export function FilmingModeSheet({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context: FilmingContext;
}) {
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [queue, setQueue] = useState<PendingClip[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null);

  if (!open && !recorderOpen && queue.length === 0) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 5);
    const clips: PendingClip[] = [];
    for (const f of list) {
      const url = URL.createObjectURL(f);
      const duration = await new Promise<number>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => resolve(v.duration || 0);
        v.onerror = () => resolve(0);
        v.src = url;
      });
      clips.push({ file: f, url, durationSec: duration });
    }
    setQueue(clips);
    setReviewIdx(0);
    onClose();
  };

  const currentClip = queue[reviewIdx];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl border-t border-border bg-surface p-5 pb-8"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">FILMING MODE</p>
              <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">{context.contextLabel}</p>

            <div className="mt-5 space-y-3">
              {!context.isParent && (
                <button
                  onClick={() => { setRecorderOpen(true); onClose(); }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-4 py-4 text-sm font-bold text-primary-foreground shadow-glow-teal"
                >
                  <Video size={18} /> Record
                </button>
              )}
              <button
                onClick={() => uploadRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-4 text-sm font-bold text-foreground"
              >
                <Upload size={18} /> Upload from Camera Roll
              </button>
              {context.isParent && (
                <p className="pt-1 text-center text-[11px] text-muted-foreground">
                  Parent uploads are reviewed by your coach before your athlete sees them.
                </p>
              )}
            </div>

            <input
              ref={uploadRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>
      )}

      {recorderOpen && (
        <InAppRecorder
          onCancel={() => setRecorderOpen(false)}
          onRecorded={(clip) => {
            setRecorderOpen(false);
            setQueue([clip]);
            setReviewIdx(0);
          }}
        />
      )}

      {currentClip && (
        <ReviewTagSheet
          clip={currentClip}
          context={context}
          onDone={() => {
            URL.revokeObjectURL(currentClip.url);
            if (reviewIdx + 1 < queue.length) {
              setReviewIdx(reviewIdx + 1);
            } else {
              setQueue([]);
              setReviewIdx(0);
            }
          }}
          onCancel={() => {
            queue.forEach((c) => URL.revokeObjectURL(c.url));
            setQueue([]);
            setReviewIdx(0);
          }}
        />
      )}
    </>
  );
}

function InAppRecorder({
  onCancel,
  onRecorded,
}: {
  onCancel: () => void;
  onRecorded: (clip: PendingClip) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });
        const url = URL.createObjectURL(file);
        const dur = elapsed;
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onRecorded({ file, url, durationSec: dur });
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err: any) {
      // Fallback: native capture via file input
      setError(err?.message ?? "Camera not available — use camera roll capture");
      fileRef.current?.click();
    }
  };

  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    recorderRef.current?.stop();
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const flip = async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    if (streamRef.current && !recording) {
      cleanup();
      // restart preview
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next }, audio: true });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      } catch {}
    }
  };

  // Auto-start preview on mount
  if (!streamRef.current && !error) {
    // fire-and-forget
    setTimeout(start, 0);
  }

  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          onClick={() => { cleanup(); onCancel(); }}
          className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white"
        >
          Cancel
        </button>
        <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" style={{ opacity: recording ? 1 : 0.3 }} />
          {mm}:{ss}
        </div>
        <button
          onClick={flip}
          className="rounded-full bg-black/60 p-2 text-white"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {error && (
        <div className="relative z-10 mx-4 rounded-xl bg-black/70 p-3 text-xs text-white">
          {error}
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-center pb-10">
        <button
          onClick={recording ? stop : start}
          className="grid h-20 w-20 place-items-center rounded-full border-4 border-white"
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          <span className={"block rounded-" + (recording ? "md h-8 w-8 bg-red-500" : "full h-16 w-16 bg-red-500")} />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const url = URL.createObjectURL(f);
          const dur = await new Promise<number>((res) => {
            const v = document.createElement("video");
            v.preload = "metadata";
            v.onloadedmetadata = () => res(v.duration || 0);
            v.onerror = () => res(0);
            v.src = url;
          });
          onRecorded({ file: f, url, durationSec: dur });
        }}
      />
    </div>
  );
}