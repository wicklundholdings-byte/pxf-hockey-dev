import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { Drills } from "@/routes/drills";

export const Route = createFileRoute("/_authenticated/coach/library")({
  component: CoachLibrary,
});

function CoachLibrary() {
  return (
    <div className="-mx-5 -mt-2">
      <div className="px-5 pb-3">
        <Link
          to="/sessions"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Layers size={14} className="text-teal" /> Saved Sessions
          </span>
          <span className="text-[11px] font-semibold text-teal">Open →</span>
        </Link>
      </div>
      <Drills />
    </div>
  );
}