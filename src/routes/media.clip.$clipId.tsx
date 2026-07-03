import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Share2 } from "lucide-react";
import { useClips, fmtShortDate } from "@/lib/mock-videos";

export const Route = createFileRoute("/media/clip/$clipId")({
  head: () => ({ meta: [{ title: "Video — PXF Hockey" }] }),
  component: ClipView,
});

function ClipView() {
  const { clipId } = Route.useParams();
  const clips = useClips();
  const clip = useMemo(() => clips.find((c) => c.id === clipId), [clips, clipId]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState(1);
  const navigate = useNavigate();

  if (!clip) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Clip not found.</p>
        <button onClick={() => navigate({ to: "/parent/playbook" })} className="mt-3 text-xs font-bold text-teal">Back to Playbook</button>
      </div>
    );
  }

  const setRateAndApply = (r: number) => {
    setRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
  };

  const share = async () => {
    if (!clip.videoUrl) return;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: "PXF Clip", url: clip.videoUrl });
      } else {
        const a = document.createElement("a");
        a.href = clip.videoUrl;
        a.download = `pxf-${clip.type}-${clip.id}.webm`;
        a.click();
      }
    } catch {}
  };

  return (
    <div className="-mx-5 -mt-2 bg-background pb-10">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => history.back()} className="inline-flex items-center gap-1 text-[13px] font-bold text-teal">
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={share} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold">
          <Share2 size={12} /> Share
        </button>
      </div>

      {clip.videoUrl ? (
        <video ref={videoRef} src={clip.videoUrl} controls playsInline className="w-full bg-black" />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-black text-xs text-white/60">
          Video preview unavailable
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 px-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Speed</p>
        {[0.5, 1, 1.5].map((r) => (
          <button
            key={r}
            onClick={() => setRateAndApply(r)}
            className={"rounded-full px-3 py-1 text-[11px] font-bold " + (rate === r ? "bg-teal text-background" : "border border-border text-muted-foreground")}
          >
            {r}x
          </button>
        ))}
      </div>

      <div className="mt-4 px-4">
        <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">{clip.type}</span>
        <p className="mt-2 text-[13px] leading-relaxed">{clip.note || <span className="text-muted-foreground">No note.</span>}</p>
        <p className="mt-3 text-[11px] text-muted-foreground">From: {clip.fromLabel} · {fmtShortDate(clip.createdAt)}</p>
        {clip.pendingApproval && (
          <p className="mt-2 rounded-xl bg-amber-500/15 px-3 py-2 text-[11px] font-bold text-amber-400">Pending coach approval</p>
        )}
      </div>

      <div className="mt-6 px-4">
        <Link to="/parent/playbook" className="text-[12px] font-bold text-teal">← All videos</Link>
      </div>
    </div>
  );
}