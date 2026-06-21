import { createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/parent/schedule")({
  component: ParentSchedule,
});

const days = [
  { date: "Mon Aug 12", camp: "Summer Elite Camp", session: "Edge Work & Power", time: "9:00–11:00 AM", venue: "Iceland Arena" },
  { date: "Tue Aug 13", camp: "Summer Elite Camp", session: "Shooting & Finishing", time: "9:00–11:00 AM", venue: "Iceland Arena" },
  { date: "Wed Aug 14", camp: "Summer Elite Camp", session: "1v1 Battles", time: "9:00–11:00 AM", venue: "Iceland Arena" },
  { date: "Thu Aug 15", camp: "Summer Elite Camp", session: "Game Situations", time: "9:00–11:00 AM", venue: "Iceland Arena" },
  { date: "Fri Aug 16", camp: "Summer Elite Camp", session: "Scrimmage Day", time: "9:00–11:00 AM", venue: "Iceland Arena" },
];

function ParentSchedule() {
  return (
    <div className="px-5 pt-5">
      <h1 className="font-display text-2xl font-bold">Schedule</h1>
      <p className="text-xs text-muted-foreground">Session plans set by your coach — read only.</p>
      <div className="mt-5 space-y-2">
        {days.map((d) => (
          <div key={d.date} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal">{d.date}</p>
              <span className="text-[10px] text-muted-foreground">{d.camp}</span>
            </div>
            <p className="mt-2 text-sm font-semibold">{d.session}</p>
            <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock size={10} /> {d.time}</span>
              <span className="flex items-center gap-1"><MapPin size={10} /> {d.venue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}