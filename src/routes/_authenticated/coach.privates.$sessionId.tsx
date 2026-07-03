import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, MessageSquare, Plus, Video } from "lucide-react";
import { FilmingModeSheet } from "@/components/media/filming-mode-sheet";
import { toast } from "sonner";
import {
  useMockPrivates,
  updateMockPrivate,
  fmtPrivateDate,
} from "@/lib/mock-privates";

export const Route = createFileRoute("/_authenticated/coach/privates/$sessionId")({
  head: () => ({ meta: [{ title: "Private Session — Coach" }] }),
  component: SessionDetail,
});

function SessionDetail() {
  const { sessionId } = useParams({ from: "/_authenticated/coach/privates/$sessionId" });
  const privates = useMockPrivates();
  const navigate = useNavigate();
  const p = privates.find((x) => x.id === sessionId);
  const [addingName, setAddingName] = useState("");
  const [filmingOpen, setFilmingOpen] = useState(false);

  if (!p) {
    return <div className="p-6 text-sm text-muted-foreground">Session not found.</div>;
  }

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/book/private/${p.id}`
      : `/book/private/${p.id}`;

  const canAdd = p.type === "Small Group" && p.athletes.length < 6;

  const addAthlete = () => {
    if (!addingName.trim()) return;
    updateMockPrivate(p.id, {
      athletes: [
        ...p.athletes,
        {
          id: `na_${Date.now()}`,
          name: addingName.trim(),
          paid: false,
          amount: p.ratePerAthlete,
        },
      ],
    });
    setAddingName("");
    toast.success("Athlete invited");
  };

  const cancel = () => {
    updateMockPrivate(p.id, { status: "cancelled" });
    toast.success("Session cancelled");
    navigate({ to: "/coach/privates" });
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-end">
        <button
          onClick={() => setFilmingOpen(true)}
          aria-label="Filming Mode"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-teal"
        >
          <Video size={16} />
        </button>
      </div>
      <FilmingModeSheet
        open={filmingOpen}
        onClose={() => setFilmingOpen(false)}
        context={{ contextLabel: `${fmtPrivateDate(p.date)} · Private (${p.type})` }}
      />
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {fmtPrivateDate(p.date)} · {p.time} · {p.duration} min
        </p>
        <h1 className="mt-1 font-display text-lg font-bold">
          {p.type} {p.type === "Small Group" ? `(${p.athletes.length})` : ""}
        </h1>
        <p className="mt-1 text-[12px] text-muted-foreground">{p.location}</p>
        <p className="mt-2 text-[12px] font-semibold text-teal">{p.focus}</p>
        <p className="mt-1 text-[12px] font-bold text-emerald-400">
          ${p.ratePerAthlete}
          {p.type === "Small Group" && p.chargeMode === "athlete" ? "/athlete" : ""}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Athletes</h2>
        <ul className="space-y-2">
          {p.athletes.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-semibold">{a.name}</p>
                {a.email && <p className="text-[10px] text-muted-foreground">{a.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    a.paid ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {a.paid ? "Paid ✓" : "Unpaid"}
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">${a.amount}</span>
              </div>
            </li>
          ))}
        </ul>
        {canAdd && (
          <div className="mt-2 flex gap-2">
            <input
              value={addingName}
              onChange={(e) => setAddingName(e.target.value)}
              placeholder="Athlete name"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[12px]"
            />
            <button
              onClick={addAthlete}
              className="flex items-center gap-1 rounded-xl border border-teal/40 bg-teal/10 px-3 text-[12px] font-semibold text-teal"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Invite Link</h2>
        <div className="space-y-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(inviteLink);
              toast.success("Invite link copied");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground/90 py-3 text-[12px] font-semibold text-background"
          >
            <Copy size={14} /> Copy Invite Link
          </button>
          <button
            onClick={() => navigate({ to: "/coach/inbox" })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal/40 bg-transparent py-2.5 text-[12px] font-semibold text-teal"
          >
            <MessageSquare size={14} /> Share via Inbox →
          </button>
          <p className="truncate rounded-lg bg-surface px-3 py-2 text-[10px] text-muted-foreground">{inviteLink}</p>
        </div>
      </section>

      <button
        onClick={cancel}
        className="w-full py-3 text-[12px] font-semibold text-red-400"
      >
        Cancel Session
      </button>
    </div>
  );
}