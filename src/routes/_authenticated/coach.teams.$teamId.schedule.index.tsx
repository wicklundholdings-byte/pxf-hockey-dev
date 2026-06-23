import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createEvent } from "@/lib/teams.functions";
import { Plus, X } from "lucide-react";
import { TeamEventRow } from "@/components/teams/team-event-row";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/")({
  component: Schedule,
});

type EventRow = { id: string; event_type: "game" | "practice" | "team_event"; title: string | null; opponent_name: string | null; venue: string | null; event_date: string; start_time: string | null };

function Schedule() {
  const { teamId } = Route.useParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [adding, setAdding] = useState(false);

  async function refresh() {
    const { data } = await supabase
      .from("team_events")
      .select("id,event_type,title,opponent_name,venue,event_date,start_time")
      .eq("team_id", teamId)
      .order("event_date", { ascending: true });
    setEvents((data ?? []) as EventRow[]);
  }
  useEffect(() => { refresh(); }, [teamId]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Schedule</h3>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full bg-teal px-3 py-1 text-[11px] font-bold text-background">
          <Plus size={12} /> Add event
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {events.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">No events scheduled yet.</p>
        )}
        {events.map((e) => (
          <Link key={e.id} to="/coach/teams/$teamId/schedule/$eventId" params={{ teamId, eventId: e.id }}>
            <TeamEventRow event={e} />
          </Link>
        ))}
      </div>
      {adding && <AddEventSheet teamId={teamId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />}
    </div>
  );
}

function AddEventSheet({ teamId, onClose, onSaved }: { teamId: string; onClose: () => void; onSaved: () => void }) {
  const create = useServerFn(createEvent);
  const [form, setForm] = useState({
    eventType: "practice" as "game" | "practice" | "team_event",
    title: "", opponentName: "", homeAway: "home" as "home" | "away" | "neutral",
    venue: "", eventDate: new Date().toISOString().slice(0, 10), startTime: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await create({ data: { teamId, ...form } });
      onSaved();
    } catch (err: any) {
      alert(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Add event</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-background p-1">
            {(["practice", "game", "team_event"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, eventType: t })}
                className={"rounded-full py-1.5 text-[11px] font-bold " + (form.eventType === t ? "bg-teal text-background" : "text-muted-foreground")}>
                {t === "team_event" ? "Event" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {form.eventType === "game" && (
            <>
              <Field label="Opponent" value={form.opponentName} onChange={(v) => setForm({ ...form, opponentName: v })} />
              <div className="grid grid-cols-3 gap-1 rounded-full bg-background p-1">
                {(["home", "away", "neutral"] as const).map((h) => (
                  <button key={h} type="button" onClick={() => setForm({ ...form, homeAway: h })}
                    className={"rounded-full py-1.5 text-[11px] font-bold " + (form.homeAway === h ? "bg-teal text-background" : "text-muted-foreground")}>
                    {h.charAt(0).toUpperCase() + h.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
          {form.eventType === "team_event" && (
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Team dinner" />
          )}
          <Field label="Venue" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date" type="date" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} />
            <Field label="Start time" type="time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} />
          </div>
          <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <button disabled={saving} className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
    </label>
  );
}