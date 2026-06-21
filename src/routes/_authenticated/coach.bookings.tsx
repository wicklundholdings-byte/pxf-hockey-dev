import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, MapPin, DollarSign, Calendar as CalIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/bookings")({
  head: () => ({ meta: [{ title: "1-on-1 Bookings — Coach" }] }),
  component: BookingsScreen,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["6a", "7a", "8a", "9a", "4p", "5p", "6p", "7p", "8p"];

const sessionTypes = [
  { id: "30", label: "30 min", price: 60 },
  { id: "45", label: "45 min", price: 85 },
  { id: "60", label: "60 min", price: 110 },
];

const upcoming = [
  { name: "Jordan Walsh", type: "45 min · On ice", when: "Tue Jun 24 · 5:00p", loc: "Iceland Arena" },
  { name: "Mason Chen", type: "60 min · Off ice", when: "Wed Jun 25 · 6:00p", loc: "Studio B" },
  { name: "Ella Brooks", type: "30 min · Online", when: "Thu Jun 26 · 7:00p", loc: "Zoom" },
];

function BookingsScreen() {
  const [grid, setGrid] = useState<Record<string, boolean>>({ "Tue-5p": true, "Tue-6p": true, "Wed-5p": true, "Thu-7p": true });
  const toggle = (k: string) => setGrid((g) => ({ ...g, [k]: !g[k] }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">1-on-1 Bookings</h2>
        <p className="text-[11px] text-muted-foreground">Set your availability. Parents pick a slot, pay, and you're booked.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Weekly Availability</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr><th></th>{DAYS.map((d) => <th key={d} className="px-1 py-1 font-bold text-muted-foreground">{d}</th>)}</tr>
            </thead>
            <tbody>
              {SLOTS.map((s) => (
                <tr key={s}>
                  <td className="pr-2 text-right font-bold text-muted-foreground">{s}</td>
                  {DAYS.map((d) => {
                    const k = `${d}-${s}`;
                    const on = grid[k];
                    return (
                      <td key={k} className="p-0.5">
                        <button onClick={() => toggle(k)} className={`h-6 w-full rounded ${on ? "bg-teal" : "bg-surface border border-border"}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session Types</h3>
        <div className="mt-3 space-y-2">
          {sessionTypes.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <Clock size={14} className="text-teal" />
              <span className="flex-1 text-sm font-semibold">{s.label}</span>
              <span className="flex items-center text-sm font-bold text-emerald-400"><DollarSign size={12} />{s.price}</span>
              <button className="text-[10px] text-muted-foreground">Edit</button>
            </div>
          ))}
          <button className="w-full rounded-xl border border-dashed border-border py-2 text-[11px] text-muted-foreground">+ Add session type</button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
          {["On ice", "Off ice", "Online"].map((l, i) => (
            <span key={l} className={`rounded-full border px-2 py-1 text-center font-semibold ${i === 0 ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"}`}>{l}</span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upcoming Sessions</h3>
        <div className="mt-2 space-y-2">
          {upcoming.map((u) => (
            <div key={u.name} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{u.name}</p>
                <span className="text-[10px] text-teal">{u.type}</span>
              </div>
              <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><CalIcon size={10} />{u.when}</span>
                <span className="flex items-center gap-1"><MapPin size={10} />{u.loc}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}