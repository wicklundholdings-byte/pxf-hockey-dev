import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home-coach/profile")({
  component: () => (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-semibold">Sarah Reilly</p>
        <p className="text-xs text-muted-foreground">Home Coach · trial</p>
      </div>
      <Link to="/settings" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs">
        <span className="flex items-center gap-2"><Settings size={14} /> Account Settings</span>
      </Link>
      <Link to="/coach/plans" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs">
        <span>Manage Subscription</span>
      </Link>
      <button className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-3 text-xs text-destructive">
        <LogOut size={14} /> Sign out
      </button>
    </div>
  ),
});