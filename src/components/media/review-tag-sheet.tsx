import { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { MOCK_ATHLETES } from "@/routes/_authenticated/coach.athletes.index";
import { addClip, CLIP_TYPES, ClipType, Visibility } from "@/lib/mock-videos";
import type { FilmingContext } from "./filming-mode-sheet";

type PendingClip = { file: File; url: string; durationSec: number };

export function ReviewTagSheet({
  clip,
  context,
  onDone,
  onCancel,
}: {
  clip: PendingClip;
  context: FilmingContext;
  onDone: () => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(clip.durationSec || 0);
  const [phase, setPhase] = useState<"trim" | "tag">("trim");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(context.attendeeIds ?? []),
  );
  const [type, setType] = useState<ClipType>("Skating");
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("athlete_parents");
  const [q, setQ] = useState("");

  useEffect(() => {
    setTrimEnd(clip.durationSec || 0);
  }, [clip]);

  const attendeeIds = new Set(context.attendeeIds ?? []);
  const athletes = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = MOCK_ATHLETES.filter((a) => !query || a.name.toLowerCase().includes(query));
    // Attendees first
    return [...list].sort((a, b) => Number(attendeeIds.has(b.id)) - Number(attendeeIds.has(a.id)));
  }, [q]);

  const share = () => {
    if (selected.size === 0) {
      toast.error("Assign at least one athlete");
      return;
    }
    const clipRec = addClip({
      athleteIds: Array.from(selected),
      type,
      note: note.trim(),
      visibility,
      fromLabel: context.contextLabel,
      coach: context.isParent ? "Parent upload" : "Coach Davis",
      durationSec: Math.max(1, Math.round(trimEnd - trimStart)),
      videoUrl: clip.url,
      pendingApproval: !!context.isParent,
    });
    toast.success(
      context.isParent
        ? "Uploaded — pending coach approval"
        : `Shared with ${selected.size} athlete${selected.size === 1 ? "" : "s"}`,
    );
    if (!context.isParent) {
      // Simulated push notification
      console.info("[push] Video shared", clipRec.id);
    }
    onDone();
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-bold">{phase === "trim" ? "Review & Trim" : "Tag Clip"}</p>
        <button onClick={onCancel} aria-label="Close"><X size={20} className="text-muted-foreground" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <video
          ref={videoRef}
          src={clip.url}
          controls
          playsInline
          className="w-full rounded-2xl bg-black"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {clip.file.name} · {(clip.file.size / (1024 * 1024)).toFixed(1)} MB · {Math.round(clip.durationSec)}s
        </p>

        {phase === "trim" && clip.durationSec > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <p className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground">TRIM</p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-semibold text-teal">{trimStart.toFixed(1)}s</span>
              <input
                type="range"
                min={0}
                max={clip.durationSec}
                step={0.1}
                value={trimStart}
                onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.5))}
                className="flex-1"
              />
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px]">
              <span className="font-semibold text-teal">{trimEnd.toFixed(1)}s</span>
              <input
                type="range"
                min={0}
                max={clip.durationSec}
                step={0.1}
                value={trimEnd}
                onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))}
                className="flex-1"
              />
            </div>
          </div>
        )}

        {phase === "tag" && (
          <>
            <section className="mt-4">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">ASSIGN TO ATHLETE(S)</p>
              <div className="mt-2 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2">
                <Search size={14} className="text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search athletes"
                  className="flex-1 bg-transparent text-[13px] outline-none"
                />
              </div>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-border bg-surface p-2">
                {athletes.map((a) => {
                  const isChecked = selected.has(a.id);
                  const isAttendee = attendeeIds.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggle(a.id)}
                      className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left hover:bg-surface-2"
                    >
                      <div>
                        <p className="text-[13px] font-semibold">{a.name} <span className="text-muted-foreground">#{a.jersey}</span></p>
                        <p className="text-[10px] text-muted-foreground">{a.team}{isAttendee ? " · in session" : ""}</p>
                      </div>
                      <span className={"grid h-5 w-5 place-items-center rounded border " + (isChecked ? "border-teal bg-teal text-background" : "border-border")}>
                        {isChecked && <Check size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-4">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">CLIP TYPE</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CLIP_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={
                      "rounded-full px-3 py-1.5 text-[11px] font-bold " +
                      (type === t ? "bg-teal text-background" : "border border-border text-muted-foreground")
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-4">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">COACHING NOTE (OPTIONAL)</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="e.g. Great edge work on the left turn. Watch the right — losing your knee bend."
                className="mt-2 w-full rounded-2xl border border-border bg-surface p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </section>

            <section className="mt-4">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">WHO CAN SEE THIS?</p>
              <div className="mt-2 space-y-2">
                {([
                  ["athlete_parents", "Athlete + Parents only"],
                  ["staff_only", "Coaching staff only"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className="flex w-full items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-left"
                  >
                    <span className={"grid h-4 w-4 place-items-center rounded-full border " + (visibility === v ? "border-teal" : "border-border")}>
                      {visibility === v && <span className="h-2 w-2 rounded-full bg-teal" />}
                    </span>
                    <span className="text-[13px] font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <div className="border-t border-border bg-surface p-3">
        {phase === "trim" ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setPhase("tag")} className="text-[12px] font-bold text-teal underline">
              Skip
            </button>
            <button
              onClick={() => setPhase("tag")}
              className="ml-auto rounded-full bg-teal px-5 py-2.5 text-[12px] font-bold text-background"
            >
              Trim & Continue
            </button>
          </div>
        ) : (
          <button
            onClick={share}
            className="w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal"
          >
            Share Clip
          </button>
        )}
      </div>
    </div>
  );
}