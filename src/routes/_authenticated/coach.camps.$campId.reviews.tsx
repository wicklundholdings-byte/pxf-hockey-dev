import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star, ArrowLeft, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Camp" }] }),
  component: ReviewsScreen,
});

const reviews = [
  { id: "r1", parent: "Sarah Mitchell", rating: 5, date: "2026-06-10", comment: "Jake came home pumped every day. Coach pushed him in all the right ways.", reply: null as string | null },
  { id: "r2", parent: "Mark Chen", rating: 5, date: "2026-06-09", comment: "Best camp Lily has done. Loved the small group ratios.", reply: "Thanks Mark — see you next session!" },
  { id: "r3", parent: "Diana Park", rating: 4, date: "2026-06-08", comment: "Great structure. Would love more goalie-specific work next time.", reply: null },
];

const breakdown = [
  { stars: 5, count: 18 },
  { stars: 4, count: 6 },
  { stars: 3, count: 1 },
  { stars: 2, count: 0 },
  { stars: 1, count: 0 },
];

function ReviewsScreen() {
  const { campId } = Route.useParams();
  const [reply, setReply] = useState<Record<string, string>>({});
  const total = breakdown.reduce((a, b) => a + b.count, 0);
  const avg = (breakdown.reduce((a, b) => a + b.stars * b.count, 0) / total).toFixed(1);

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <Link to="/coach/camps/$campId" params={{ campId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back to camp
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold">Reviews</h1>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-display text-4xl font-bold">{avg}</p>
            <div className="mt-1 flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={14} className={s <= Math.round(Number(avg)) ? "fill-volt text-volt" : "text-muted-foreground"} />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{total} reviews</p>
          </div>
          <div className="flex-1 space-y-1">
            {breakdown.map((b) => (
              <div key={b.stars} className="flex items-center gap-2 text-[11px]">
                <span className="w-3 text-muted-foreground">{b.stars}</span>
                <Star size={10} className="text-muted-foreground" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                  <div className="h-full bg-teal" style={{ width: `${(b.count / total) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-muted-foreground">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Reviews appear on your public coach profile.</p>
      </div>

      <div className="mt-5 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{r.parent}</p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={12} className={s <= r.rating ? "fill-volt text-volt" : "text-muted-foreground"} />
                ))}
              </div>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{r.date}</p>
            <p className="mt-2 text-xs text-foreground/90">{r.comment}</p>
            {r.reply ? (
              <div className="mt-3 rounded-lg border border-teal/40 bg-teal/5 p-2 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Your reply</p>
                <p className="mt-1 text-foreground/90">{r.reply}</p>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <input
                  value={reply[r.id] ?? ""}
                  onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })}
                  placeholder="Reply to this review…"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
                <button className="flex items-center gap-1 rounded-lg bg-teal px-3 text-xs font-bold text-background">
                  <MessageSquare size={12} /> Reply
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}