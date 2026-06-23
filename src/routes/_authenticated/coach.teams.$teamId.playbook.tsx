import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/playbook")({
  component: TeamPlaybook,
});

function TeamPlaybook() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Your full Playbook library — drills, sessions, camp templates, and dryland programs — is available to build practice plans for this team.</p>
      <Link to="/coach/playbook" className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal"><BookOpen size={18} /></div>
          <div>
            <p className="text-sm font-semibold">Open Playbook</p>
            <p className="text-[11px] text-muted-foreground">Browse drills + sessions</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">→</span>
      </Link>
      <p className="text-center text-[11px] text-muted-foreground">Tip: open a practice and tap “Practice plan” to assemble drills directly.</p>
    </div>
  );
}