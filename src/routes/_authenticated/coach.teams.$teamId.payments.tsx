import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, DollarSign, Send, ChevronRight, X, Check } from "lucide-react";
import {
  createPaymentRequest,
  remindUnpaid,
  markChargePaid,
  closePaymentRequest,
} from "@/lib/team-payments.functions";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/payments")({
  component: TeamPaymentsScreen,
});

type Player = { id: string; display_name: string; jersey_number: string | null };
type Request = {
  id: string;
  request_type: "registration" | "one_off";
  label: string;
  description: string | null;
  amount_cents: number;
  due_date: string | null;
  status: string;
};
type Charge = {
  id: string;
  request_id: string;
  team_player_id: string;
  amount_cents: number;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  last_reminder_at: string | null;
};

function money(c: number) {
  return "$" + (c / 100).toFixed(2);
}
function isOverdue(due: string | null) {
  if (!due) return false;
  return new Date(due + "T23:59:59") < new Date();
}

function TeamPaymentsScreen() {
  const { teamId } = Route.useParams();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = async () => {
    const [p, r, c] = await Promise.all([
      supabase.from("team_players").select("id,display_name,jersey_number").eq("team_id", teamId).order("display_name"),
      supabase.from("team_payment_requests").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
      supabase.from("team_payment_charges").select("*").in("request_id",
        ((await supabase.from("team_payment_requests").select("id").eq("team_id", teamId)).data ?? []).map((x: any) => x.id).concat(["00000000-0000-0000-0000-000000000000"])
      ),
    ]);
    setPlayers((p.data ?? []) as Player[]);
    setRequests((r.data ?? []) as Request[]);
    setCharges((c.data ?? []) as Charge[]);
  };

  useEffect(() => { reload(); }, [teamId]);

  const totals = requests.reduce(
    (acc, r) => {
      const rc = charges.filter((c) => c.request_id === r.id);
      const collected = rc.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount_cents, 0);
      const outstanding = rc.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount_cents, 0);
      acc.collected += collected;
      acc.outstanding += outstanding;
      return acc;
    },
    { collected: 0, outstanding: 0 },
  );

  return (
    <div className="px-5 pt-4 pb-28">
      <Link to="/coach/teams/$teamId" params={{ teamId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Team
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Payments</h1>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-2 text-xs font-bold text-background">
          <Plus size={14} /> New
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-400">COLLECTED</p>
          <p className="mt-1 font-display text-xl font-bold">{money(totals.collected)}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-amber-400">OUTSTANDING</p>
          <p className="mt-1 font-display text-xl font-bold">{money(totals.outstanding)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {requests.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-xs text-muted-foreground">
            No payment requests yet. Tap New to create one.
          </p>
        )}
        {requests.map((r) => {
          const rc = charges.filter((c) => c.request_id === r.id);
          const paidCount = rc.filter((c) => c.status === "paid").length;
          const collected = rc.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount_cents, 0);
          const outstanding = rc.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount_cents, 0);
          const total = collected + outstanding;
          const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
          const overdue = isOverdue(r.due_date);
          const open = expanded === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-surface">
              <button onClick={() => setExpanded(open ? null : r.id)} className="flex w-full items-start gap-3 p-4 text-left">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal">
                  <DollarSign size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold">{r.label}</p>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-bold tracking-wider text-muted-foreground">
                      {r.request_type === "registration" ? "REG" : "ONE-OFF"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {money(r.amount_cents)}{r.due_date ? ` · due ${r.due_date}` : ""}{overdue ? " · overdue" : ""}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: pct + "%" }} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {paidCount}/{rc.length} paid · {money(collected)} collected · {money(outstanding)} outstanding
                  </p>
                </div>
                <ChevronRight size={16} className={"mt-2 text-muted-foreground transition-transform " + (open ? "rotate-90" : "")} />
              </button>
              {open && (
                <div className="border-t border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-wider text-muted-foreground">PLAYERS</p>
                    <BulkRemindButton requestId={r.id} chargeIds={rc.filter((c) => c.status === "pending").map((c) => c.id)} onDone={reload} />
                  </div>
                  <div className="space-y-1.5">
                    {rc.map((c) => {
                      const p = players.find((pl) => pl.id === c.team_player_id);
                      const overduePlayer = c.status === "pending" && overdue;
                      const label = c.status === "paid" ? "PAID" : overduePlayer ? "OVERDUE" : "PENDING";
                      const tone = c.status === "paid" ? "bg-emerald-500/15 text-emerald-400" : overduePlayer ? "bg-rose-500/15 text-rose-400" : "bg-amber-500/15 text-amber-400";
                      return (
                        <div key={c.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {p?.jersey_number ? `#${p.jersey_number} ` : ""}{p?.display_name ?? "—"}
                          </p>
                          <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + tone}>{label}</span>
                          {c.status === "pending" && (
                            <ChargeActions chargeId={c.id} requestId={r.id} onDone={reload} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {r.status === "active" && (
                    <CloseButton requestId={r.id} onDone={reload} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateRequestModal
          teamId={teamId}
          players={players}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload(); }}
        />
      )}
    </div>
  );
}

function ChargeActions({ chargeId, requestId, onDone }: { chargeId: string; requestId: string; onDone: () => void }) {
  const remind = useServerFn(remindUnpaid);
  const markPaid = useServerFn(markChargePaid);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={async () => { await remind({ data: { requestId, chargeIds: [chargeId] } }); onDone(); }}
        className="rounded-full bg-surface px-2 py-1 text-[10px] font-bold text-muted-foreground"
        title="Remind"
      >
        <Send size={11} />
      </button>
      <button
        onClick={async () => { await markPaid({ data: { chargeId } }); onDone(); }}
        className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400"
        title="Mark paid"
      >
        <Check size={11} />
      </button>
    </div>
  );
}

function BulkRemindButton({ requestId, chargeIds, onDone }: { requestId: string; chargeIds: string[]; onDone: () => void }) {
  const remind = useServerFn(remindUnpaid);
  if (chargeIds.length === 0) return null;
  return (
    <button
      onClick={async () => { await remind({ data: { requestId, chargeIds } }); onDone(); }}
      className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2.5 py-1 text-[10px] font-bold text-teal"
    >
      <Send size={11} /> Remind all ({chargeIds.length})
    </button>
  );
}

function CloseButton({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const close = useServerFn(closePaymentRequest);
  return (
    <button
      onClick={async () => { await close({ data: { requestId } }); onDone(); }}
      className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-muted-foreground"
    >
      Close request
    </button>
  );
}

function CreateRequestModal({
  teamId, players, onClose, onCreated,
}: { teamId: string; players: Player[]; onClose: () => void; onCreated: () => void }) {
  const create = useServerFn(createPaymentRequest);
  const [type, setType] = useState<"registration" | "one_off">("registration");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState<"all" | "select">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    const cents = Math.round(parseFloat(amount || "0") * 100);
    if (!label || cents <= 0) return;
    setSubmitting(true);
    try {
      await create({
        data: {
          teamId, requestType: type, label,
          description: desc || undefined,
          amountCents: cents,
          dueDate: dueDate || null,
          playerIds: target === "all" ? [] : selected,
        },
      });
      onCreated();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold">New payment request</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted-foreground"><X size={14} /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["registration", "one_off"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} className={"rounded-xl border px-3 py-2 text-xs font-bold " + (type === t ? "border-teal bg-teal/15 text-teal" : "border-border bg-surface-2 text-muted-foreground")}>
              {t === "registration" ? "Registration fee" : "One-off"}
            </button>
          ))}
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={type === "registration" ? "e.g. Spring Rep Team 2026" : "e.g. Apparel Order"} className="mt-3 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" placeholder="Amount ($)" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" />
          <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" />
        </div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Description (optional)" className="mt-2 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" />

        {type === "one_off" && (
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {(["all", "select"] as const).map((t) => (
                <button key={t} onClick={() => setTarget(t)} className={"rounded-xl border px-3 py-2 text-xs font-bold " + (target === t ? "border-teal bg-teal/15 text-teal" : "border-border bg-surface-2 text-muted-foreground")}>
                  {t === "all" ? "Entire team" : "Select players"}
                </button>
              ))}
            </div>
            {target === "select" && (
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface-2 p-2">
                {players.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                    <span>{p.jersey_number ? `#${p.jersey_number} ` : ""}{p.display_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <button disabled={submitting} onClick={submit} className="mt-4 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-background disabled:opacity-50">
          {submitting ? "Creating…" : "Send request"}
        </button>
      </div>
    </div>
  );
}