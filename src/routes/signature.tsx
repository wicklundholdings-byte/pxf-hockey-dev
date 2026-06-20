import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { PenLine, Type } from "lucide-react";

export const Route = createFileRoute("/signature")({
  head: () => ({ meta: [{ title: "Sign Waiver — PXF Hockey" }] }),
  component: SignatureScreen,
});

function SignatureScreen() {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [agree, setAgree] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [mode]);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Standard Liability Waiver</h1>
      <p className="text-xs text-muted-foreground">Summer Elite Camp — please review and sign.</p>

      <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl border border-border bg-card p-4 text-xs text-foreground/90">
        <p>I, the undersigned parent or guardian, acknowledge the risks associated with ice hockey including but not limited to bodily injury…</p>
        <p className="mt-2">By signing this waiver I release PXF Hockey, the coach, and the facility from liability arising from participation in the camp…</p>
        <p className="mt-2">I confirm my athlete is in good physical condition and has medical clearance to participate.</p>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => setMode("draw")} className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold ${mode === "draw" ? "bg-teal text-background" : "border border-border text-muted-foreground"}`}>
          <PenLine size={14} /> Draw
        </button>
        <button onClick={() => setMode("type")} className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold ${mode === "type" ? "bg-teal text-background" : "border border-border text-muted-foreground"}`}>
          <Type size={14} /> Type
        </button>
      </div>

      {mode === "draw" ? (
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="mt-3 w-full rounded-2xl border border-border bg-card touch-none"
          onPointerDown={(e) => { drawing.current = true; const ctx = canvasRef.current!.getContext("2d")!; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); }}
          onPointerMove={(e) => { if (!drawing.current) return; const ctx = canvasRef.current!.getContext("2d")!; const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); }}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />
      ) : (
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type your full name"
          className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-6 text-center font-display text-2xl italic"
        />
      )}

      <label className="mt-4 flex items-start gap-2 text-xs">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
        I have read and agree to the terms of this waiver.
      </label>

      <button disabled={!agree} className="mt-5 w-full rounded-xl bg-teal py-3 text-sm font-bold text-background disabled:opacity-40">
        SUBMIT SIGNATURE
      </button>
    </div>
  );
}