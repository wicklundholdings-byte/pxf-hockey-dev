import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings, LogOut, CreditCard, BookOpen } from "lucide-react";

export const Route = createFileRoute("/parent/profile")({
  component: () => (
    <div className="px-5 pt-5 space-y-3">
      <h1 className="font-display text-2xl font-bold">Profile</h1>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-semibold">Sarah Reilly</p>
        <p className="text-xs text-muted-foreground">Parent · Jake Reilly (U12)</p>
      </div>
      <Link to="/bookings" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs">
        <span className="flex items-center gap-2"><BookOpen size={14} /> My Bookings</span>
      </Link>
      <Link to="/settings" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs">
        <span className="flex items-center gap-2"><Settings size={14} /> Account Settings</span>
      </Link>
      <Link to="/payments-preview" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs">
        <span className="flex items-center gap-2"><CreditCard size={14} /> Payment Methods</span>
      </Link>
      <button className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-3 text-xs text-destructive">
        <LogOut size={14} /> Sign out
      </button>
    </div>
  ),
});