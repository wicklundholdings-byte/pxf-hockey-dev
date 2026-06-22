import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/parent/inbox")({
  component: () => {
    const camps = [
      {
        camp: "Summer Elite Camp",
        coach: "Power Edge Pro",
        threads: [
          { from: "Coach Reilly", last: "Reminder: bring water bottle Friday.", time: "2h", unread: true },
          { from: "Camp Updates", last: "Day 2 schedule posted.", time: "1d" },
        ],
      },
      {
        camp: "Skating Power Clinic",
        coach: "Coach Park Hockey",
        threads: [
          { from: "Coach Park", last: "Great work this week, Jake!", time: "1d" },
        ],
      },
      {
        camp: "PXF Summer Intensive",
        coach: "PXF Skills Academy",
        threads: [
          { from: "PXF Front Desk", last: "Welcome packet attached.", time: "3d", unread: true },
        ],
      },
    ];
    return (
      <div className="px-5 pt-5">
        <h1 className="font-display text-2xl font-bold">Inbox</h1>
        <p className="text-xs text-muted-foreground">Messages grouped by camp — no toggles.</p>
        <div className="mt-5 space-y-5">
          {camps.map((c) => (
            <section key={c.camp}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">{c.camp}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal">{c.coach}</span>
              </div>
              <div className="space-y-2">
                {c.threads.map((t) => (
                  <div key={t.from} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{t.from}</p>
                      <span className="text-[10px] text-muted-foreground">{t.time}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.last}</p>
                    {t.unread && <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-teal" />}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  },
});