import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/home-coach/inbox")({
  component: () => (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Messages from PXF support and coaches you follow.</p>
      {["Welcome to Home Coach!", "Tip: build your first session today"].map((m) => (
        <div key={m} className="rounded-2xl border border-border bg-card p-3 text-xs">{m}</div>
      ))}
    </div>
  ),
});