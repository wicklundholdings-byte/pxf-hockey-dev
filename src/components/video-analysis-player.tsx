import { useEffect, useRef, useState } from "react";
import { Pause, Play, Circle, Minus, Eraser, Mic, Send, Camera, PencilLine } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveAnnotation } from "@/lib/athlete-media.functions";

type Tool = "freehand" | "line" | "circle" | null;
const COLORS = ["#ef4444", "#facc15", "#ffffff"] as const;
const SPEEDS = [1, 0.5, 0.25] as const;

export function VideoAnalysisPlayer({
  videoUrl,
  mediaId,
  athleteName,
  onSendToAthlete,
}: {
  videoUrl: string;
  mediaId?: string;
  athleteName?: string;
  onSendToAthlete?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [tool, setTool] = useState<Tool>(null);
  const [color, setColor] = useState<string>(COLORS[0]);
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const drawState = useRef<{ drawing: boolean; startX: number; startY: number }>({
    drawing: false,
    startX: 0,
    startY: 0,
  });
  const mediaRec = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const saveAnno = useServerFn(saveAnnotation);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  // size canvas to video
  useEffect(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const sync = () => {
      c.width = v.clientWidth;
      c.height = v.clientHeight;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(v);
    return () => ro.disconnect();
  }, [duration]);

  function getPoint(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!tool || !canvasRef.current) return;
    const p = getPoint(e);
    drawState.current = { drawing: true, startX: p.x, startY: p.y };
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    if (tool === "freehand") {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = drawState.current;
    if (!s.drawing || !tool || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const p = getPoint(e);
    if (tool === "freehand") {
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    const s = drawState.current;
    if (!s.drawing || !tool || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const p = getPoint(e);
    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(s.startX, s.startY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else if (tool === "circle") {
      const r = Math.hypot(p.x - s.startX, p.y - s.startY);
      ctx.beginPath();
      ctx.arc(s.startX, s.startY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawState.current.drawing = false;
  }

  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  function stepFrame(dir: number) {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setPlaying(false);
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + dir * (1 / 30)));
  }

  function saveFrame() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const out = document.createElement("canvas");
    out.width = v.videoWidth;
    out.height = v.videoHeight;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(v, 0, 0, out.width, out.height);
    // overlay drawing scaled
    ctx.drawImage(c, 0, 0, out.width, out.height);
    const url = out.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `frame-${Date.now()}.png`;
    a.click();
  }

  async function toggleVoiceover() {
    if (recording) {
      mediaRec.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      audioChunks.current = [];
      rec.ondataavailable = (e) => e.data.size && audioChunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!mediaId) return;
        // Stub: in build phase upload to storage, then save URL
        await saveAnno({
          data: {
            media_id: mediaId,
            frame_timestamp: time,
            annotation_type: "voiceover",
            voiceover_url: null,
          },
        });
      };
      rec.start();
      mediaRec.current = rec;
      setRecording(true);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          playsInline
          onClick={togglePlay}
        />
        <canvas
          ref={canvasRef}
          className={"absolute inset-0 h-full w-full " + (tool ? "cursor-crosshair" : "pointer-events-none")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        {athleteName && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
            {athleteName}
          </div>
        )}
      </div>

      {/* Scrub bar */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={1 / 30}
        value={time}
        onChange={(e) => {
          const v = videoRef.current;
          if (!v) return;
          v.currentTime = Number(e.target.value);
        }}
        className="w-full accent-teal"
      />

      {/* Playback row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={togglePlay} className="grid h-8 w-8 place-items-center rounded-full bg-gradient-brand text-primary-foreground">
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={() => stepFrame(-1)} className="rounded-md border border-border bg-surface px-2 py-1 text-[10px]">−1f</button>
        <button onClick={() => stepFrame(1)} className="rounded-md border border-border bg-surface px-2 py-1 text-[10px]">+1f</button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={"rounded-md px-2 py-1 text-[10px] " + (speed === s ? "bg-teal text-background" : "border border-border bg-surface")}
          >
            {s === 1 ? "1x" : `${s}x`}
          </button>
        ))}
      </div>

      {/* Tools row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ToolBtn active={tool === "freehand"} onClick={() => setTool(tool === "freehand" ? null : "freehand")} icon={<PencilLine size={12} />} label="Free" />
        <ToolBtn active={tool === "line"} onClick={() => setTool(tool === "line" ? null : "line")} icon={<Minus size={12} />} label="Line" />
        <ToolBtn active={tool === "circle"} onClick={() => setTool(tool === "circle" ? null : "circle")} icon={<Circle size={12} />} label="Circle" />
        <button onClick={clearCanvas} className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[10px]">
          <Eraser size={12} /> Clear
        </button>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`color ${c}`}
            className={"h-6 w-6 rounded-full border-2 " + (color === c ? "border-teal" : "border-border")}
            style={{ background: c }}
          />
        ))}
      </div>

      {/* Voiceover & actions */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={toggleVoiceover}
          className={"flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold " + (recording ? "bg-rose-500 text-white" : "border border-border bg-surface")}
        >
          <Mic size={12} /> {recording ? "Stop" : "Voiceover"}
        </button>
        <button onClick={saveFrame} className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[10px]">
          <Camera size={12} /> Save frame
        </button>
        {onSendToAthlete && (
          <button
            onClick={onSendToAthlete}
            className="ml-auto flex items-center gap-1 rounded-md bg-gradient-brand px-3 py-1 text-[10px] font-bold text-primary-foreground"
          >
            <Send size={12} /> Send to athlete
          </button>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={"flex items-center gap-1 rounded-md px-2 py-1 text-[10px] " + (active ? "bg-teal text-background" : "border border-border bg-surface")}
    >
      {icon} {label}
    </button>
  );
}