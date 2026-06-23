import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/messages")({
  component: Messages,
});

function Messages() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Broadcast to the whole team or open per-event threads.</p>
      <Link to="/coach/broadcast" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-primary-foreground"><Megaphone size={16} /></div>
        <div className="flex-1"><p className="text-sm font-semibold">Team broadcast</p><p className="text-[11px] text-muted-foreground">Email or SMS the roster</p></div>
      </Link>
      <Link to="/coach/inbox" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-foreground"><MessageSquare size={16} /></div>
        <div className="flex-1"><p className="text-sm font-semibold">Inbox</p><p className="text-[11px] text-muted-foreground">Per-parent conversations</p></div>
      </Link>
    </div>
  );
}