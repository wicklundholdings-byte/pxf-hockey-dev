import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Star, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId/feedback")({
  component: FeedbackScreen,
});

const RESPONSES = [
  { parent: "Sarah Walsh", athlete: "Jordan", stars: 5, comment: "Best camp Jordan has ever been to. Coach Marcus is incredible.", date: "Aug 17" },
  { parent: "Linda Chen", athlete: "Mason", stars: 5, comment: "Mason loved every minute. Already asking about next camp.", date: "Aug 17" },
  { parent: "Mike Thompson", athlete: "Ava", stars: 4, comment: "Great energy. Would love a little more goalie-specific work.", date: "Aug 17" },
  { parent: "Jin Park", athlete: "Lucas", stars: 5, comment: "Lucas's skating improved noticeably. Worth every dollar.", date: "Aug 18" },
  { parent: "Dana Brooks", athlete: "Ella", stars: 4, comment: "Daily updates from the coaches were a nice touch.", date: "Aug 18" },
  { parent: "Tom Riley", athlete: "Sam", stars: 5, comment: "Sam is hooked. See you in the fall!", date: "Aug 19" },
];

function FeedbackScreen() {
  const { campId } = useParams({ from: "/_authenticated/coach/camps/$campId/feedback" });
  const total = RESPONSES.length;
  const avg = RESPONSES.reduce((s, r) => s + r.stars, 0) / total;
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: RESPONSES.filter((r) => r.stars === n).length }));

  return (
    <div className="space-y-4">
      <Link to="/coach/camps/$campId" params={{ campId }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back to camp
      </Link>

      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Post-Camp Feedback</h1>
        <p className="text-[11px] text-muted-foreground">Auto-sent to parents the day after camp ends.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-3xl font-bold text-foreground">{avg.toFixed(1)}</p>
            <div className="mt-1 flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={14} className={s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"} />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{total} responses · {Math.round((total/24)*100)}% response rate</p>
          </div>
          <button className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-foreground">
            <Download size={12} /> Export
          </button>
        </div>
        <div className="mt-3 space-y-1.5">
          {counts.map(({ n, c }) => {
            const pct = (c / total) * 100;
            return (
              <div key={n} className="flex items-center gap-2 text-[10px]">
                <span className="w-3 text-muted-foreground">{n}</span>
                <Star size={10} className="fill-amber-400 text-amber-400" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-4 text-right text-muted-foreground">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Individual Responses</h2>
        <ul className="space-y-2">
          {RESPONSES.map((r, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{r.parent}</p>
                <span className="text-[10px] text-muted-foreground">{r.date}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={11} className={s <= r.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">Athlete: {r.athlete}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">"{r.comment}"</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}