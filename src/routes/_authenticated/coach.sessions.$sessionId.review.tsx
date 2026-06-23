import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SessionVideoReview } from "@/components/session-video-review";

export const Route = createFileRoute("/_authenticated/coach/sessions/$sessionId/review")({
  component: SessionReview,
});

function SessionReview() {
  const { sessionId } = useParams({ from: "/_authenticated/coach/sessions/$sessionId/review" });
  return (
    <div className="space-y-4">
      <Link to="/coach" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back
      </Link>
      <h1 className="font-display text-xl font-bold">Video Review</h1>
      <SessionVideoReview sessionId={sessionId} />
    </div>
  );
}