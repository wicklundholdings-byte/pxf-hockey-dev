import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, Send, Save, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId/evaluations/$athleteId")({
  head: () => ({ meta: [{ title: "Player Evaluation — Coach" }] }),
  component: EvaluationScreen,
});

const SKILLS = ["Skating", "Puck Control", "Passing", "Shooting", "Hockey Sense", "Compete Level"] as const;
type Skill = typeof SKILLS[number];

function EvaluationScreen() {
  const { campId, athleteId } = Route.useParams();
  const [scores, setScores] = useState<Record<Skill, number>>({
    Skating: 4, "Puck Control": 4, Passing: 3, Shooting: 4, "Hockey Sense": 5, "Compete Level": 5,
  });
  const [strengths, setStrengths] = useState("");
  const [improve, setImprove] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState(false);

  const overall = (Object.values(scores).reduce((a, b) => a + b, 0) / SKILLS.length).toFixed(1);

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <Link to="/coach/camps/$campId" params={{ campId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back to camp
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-teal/40 to-volt/30 text-lg font-bold">J</div>
        <div>
          <h1 className="font-display text-2xl font-bold">Jake Mitchell</h1>
          <p className="text-xs text-muted-foreground">U12 · Athlete #{athleteId}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Overall</p>
          <p className="font-display text-2xl font-bold text-teal">{overall}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-4 space-y-4">
        {SKILLS.map((s) => (
          <div key={s}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{s}</p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setScores({ ...scores, [s]: n })}>
                    <Star size={18} className={n <= scores[s] ? "fill-volt text-volt" : "text-muted-foreground"} />
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range" min={1} max={5} step={1}
              value={scores[s]}
              onChange={(e) => setScores({ ...scores, [s]: Number(e.target.value) })}
              className="mt-1 w-full accent-teal"
            />
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Strengths</p>
          <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} className="mt-1 h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="Explosive first step, great vision in the offensive zone…" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Areas to improve</p>
          <textarea value={improve} onChange={(e) => setImprove(e.target.value)} className="mt-1 h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="Work on backhand release and defensive stick…" />
        </div>
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coach notes <span className="rounded bg-muted/30 px-1 text-[9px] text-muted-foreground">PRIVATE</span></p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="Internal notes — not shared with the parent." />
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={() => setPreview(true)} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-3 text-xs font-bold"><Eye size={14} /> Preview</button>
        <button className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-3 text-xs font-bold"><Save size={14} /> Draft</button>
        <button className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-teal py-3 text-xs font-bold text-background"><Send size={14} /> Send to Parent</button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={() => setPreview(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Parent will see</p>
            <h3 className="mt-2 font-display text-lg font-bold">Jake's Evaluation — Summer Elite</h3>
            <p className="text-xs text-muted-foreground">From Coach Reilly</p>
            <div className="mt-3 space-y-2">
              {SKILLS.map((s) => (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span>{s}</span>
                  <div className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} className={n <= scores[s] ? "fill-volt text-volt" : "text-muted-foreground"} />)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs"><span className="text-muted-foreground">Strengths: </span>{strengths || "—"}</div>
            <div className="mt-1 text-xs"><span className="text-muted-foreground">Improve: </span>{improve || "—"}</div>
            <p className="mt-3 text-[10px] text-muted-foreground">Private coach notes are not shown to the parent.</p>
            <button onClick={() => setPreview(false)} className="mt-4 w-full rounded-xl border border-border py-2 text-xs font-bold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}