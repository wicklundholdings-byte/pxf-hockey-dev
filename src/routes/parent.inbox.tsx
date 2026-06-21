import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/parent/inbox")({
  component: () => {
    const threads = [
      { coach: "Coach Reilly", last: "Reminder: bring water bottle Friday.", time: "2h", unread: true },
      { coach: "Coach Park", last: "Great work this week, Jake!", time: "1d" },
    ];
    return (
      <div className="px-5 pt-5">
        <h1 className="font-display text-2xl font-bold">Inbox</h1>
        <p className="text-xs text-muted-foreground">Direct messages with your coach.</p>
        <div className="mt-5 space-y-2">
          {threads.map((t) => (
            <div key={t.coach} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t.coach}</p>
                <span className="text-[10px] text-muted-foreground">{t.time}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t.last}</p>
              {t.unread && <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-teal" />}
            </div>
          ))}
        </div>
      </div>
    );
  },
});