import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, DollarSign, Trophy, ClipboardList, ChevronRight, Plus, X } from "lucide-react";
import { createEvent } from "@/lib/teams.functions";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/more")({
  component: TeamMoreTab,
});

function TeamMoreTab() {
  const { teamId } = Route.useParams();
  const [createOpen, setCreateOpen] = useState(false);

  const rows: { to: any; label: string; subtitle: string; Icon: any }[] = [
    { to: "/coach/teams/$teamId/playbook", label: "Media", subtitle: "2 videos · 4 photos", Icon: Camera },
    { to: "/coach/teams/$teamId/payments", label: "Payments", subtitle: "$700 outstanding", Icon: DollarSign },
    { to: "/coach/teams/$teamId/schedule", label: "Tournaments", subtitle: "0 active tournaments", Icon: Trophy },
    { to: "/coach/teams/$teamId/schedule", label: "Practice Plans", subtitle: "3 saved plans", Icon: ClipboardList },
  ];

  return (
    <div className="space-y-3 pb-10">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map(({ to, label, Icon }, i) => (
          <Link
            key={label}
            to={to}
            params={{ teamId } as any}
            className={
              "flex items-center gap-3 px-4 py-3.5 active:bg-surface-2 " +
              (i > 0 ? "border-t border-border" : "")
            }
          >
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2">
              <Icon size={16} className="text-teal" />
            </div>
            <span className="flex-1 text-sm font-bold">{label}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        ))}
      </div>

      <button
        onClick={() => setCreateOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-background shadow-glow-teal active:opacity-90"
      >
        <Plus size={16} /> Create Practice
      </button>

      {createOpen && (
        <CreatePracticeSheet teamId={teamId} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}

function CreatePracticeSheet({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const create = useServerFn(createEvent);
  const [form, setForm] = useState({
    eventDate: new Date().toISOString().slice(0, 10),
    startTime: "",
    venue: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await create({
        data: {
          teamId,
          eventType: "practice",
          title: "",
          opponentName: "",
          homeAway: "home",
          venue: form.venue,
          eventDate: form.eventDate,
          startTime: form.startTime,
          notes: form.notes,
        } as any,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Create Practice</h3>
          <button onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Venue
            <input
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
              placeholder="Rink name"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Time
              <input
                type="time"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-2 flex w-full items-center justify-center rounded-full bg-gradient-brand py-3 text-sm font-bold text-background shadow-glow-teal active:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create Practice"}
          </button>
        </form>
      </div>
    </div>
  );
}