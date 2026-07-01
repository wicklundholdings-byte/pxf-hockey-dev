import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Plus, DollarSign, Send, ChevronRight, X, Pencil, Check,
  CreditCard, Banknote, Users, ShieldCheck, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/payments")({
  component: PaymentsScreen,
});

// ---------- Mock data ----------

type Roster = { id: string; jersey: number; name: string; pos: "F" | "D" | "G"; parent: string };

const ROSTER: Roster[] = [
  { id: "p1",  jersey: 9,  name: "Andersson", pos: "F", parent: "Sarah Andersson" },
  { id: "p2",  jersey: 12, name: "Carter",    pos: "F", parent: "Mike Carter" },
  { id: "p3",  jersey: 7,  name: "Brooks",    pos: "F", parent: "Jen Brooks" },
  { id: "p4",  jersey: 21, name: "Jensen",    pos: "D", parent: "Kai Jensen" },
  { id: "p5",  jersey: 4,  name: "Callahan",  pos: "D", parent: "Erin Callahan" },
  { id: "p6",  jersey: 88, name: "Petrov",    pos: "F", parent: "Anya Petrov" },
  { id: "p7",  jersey: 17, name: "Miller",    pos: "F", parent: "Sam Miller" },
  { id: "p8",  jersey: 3,  name: "Nguyen",    pos: "D", parent: "Linh Nguyen" },
  { id: "p9",  jersey: 30, name: "Kim",       pos: "G", parent: "Joon Kim" },
  { id: "p10", jersey: 22, name: "Torres",    pos: "F", parent: "Luis Torres" },
  { id: "p11", jersey: 5,  name: "Walsh",     pos: "D", parent: "Cara Walsh" },
  { id: "p12", jersey: 14, name: "Davidson",  pos: "F", parent: "Tom Davidson" },
  { id: "p13", jersey: 11, name: "Park",      pos: "F", parent: "Su Park" },
  { id: "p14", jersey: 19, name: "Vella",     pos: "D", parent: "Rob Vella" },
];

type PayMethod = "Stripe" | "Manual";
type PaidRec = { playerId: string; date: string; method: PayMethod };

type Fee = {
  id: string;
  name: string;
  amount: number; // dollars
  due: string; // ISO date
  description?: string;
  assignedIds: string[];
  paid: PaidRec[];
  method: "Online" | "Cash" | "Both";
};

const initialFees: Fee[] = [
  {
    id: "f1",
    name: "Spring Classic Bus Fee",
    amount: 80,
    due: "2026-07-15",
    assignedIds: ROSTER.map((r) => r.id),
    method: "Both",
    paid: [
      "p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11","p12",
    ].map((id) => ({ playerId: id, date: "2026-06-24", method: "Stripe" as PayMethod })),
  },
  {
    id: "f2",
    name: "2026-27 Team Fee",
    amount: 1200,
    due: "2026-09-01",
    assignedIds: ROSTER.map((r) => r.id),
    method: "Online",
    paid: ["p1","p2","p3"].map((id) => ({ playerId: id, date: "2026-06-20", method: "Stripe" as PayMethod })),
  },
  {
    id: "f3",
    name: "Jersey Deposit",
    amount: 150,
    due: "2026-08-15",
    assignedIds: ROSTER.map((r) => r.id),
    method: "Manual" as any === "Manual" ? "Cash" : "Cash",
    paid: ROSTER.map((r) => ({ playerId: r.id, date: "2026-06-15", method: "Manual" as PayMethod })),
  },
];

function money(n: number) { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0 }); }
function daysBetween(a: Date, b: Date) { return Math.floor((a.getTime() - b.getTime()) / 86400000); }
function feeStats(fee: Fee) {
  const total = fee.assignedIds.length;
  const paidCount = fee.paid.length;
  const collected = paidCount * fee.amount;
  const outstanding = (total - paidCount) * fee.amount;
  const dueDate = new Date(fee.due + "T23:59:59");
  const today = new Date();
  const overdue = paidCount < total && dueDate < today;
  const daysOverdue = overdue ? daysBetween(today, dueDate) : 0;
  const pct = total > 0 ? Math.round((paidCount / total) * 100) : 0;
  return { total, paidCount, collected, outstanding, overdue, daysOverdue, pct };
}

// ---------- Screen ----------

type View =
  | { kind: "home" }
  | { kind: "detail"; feeId: string }
  | { kind: "create" };

function PaymentsScreen() {
  const { teamId } = Route.useParams();
  const [fees, setFees] = useState<Fee[]>(initialFees);
  const [view, setView] = useState<View>({ kind: "home" });
  const [stripeConnected, setStripeConnected] = useState(false);
  const [showStripePrompt, setShowStripePrompt] = useState(false);

  const headline = fees[0];

  return (
    <div className="px-5 pt-4 pb-28">
      {view.kind === "home" && (
        <>
          <Link to="/coach/teams/$teamId/more" params={{ teamId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft size={14} /> More
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">Payments</h1>
            {stripeConnected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                <ShieldCheck size={11} /> Stripe Connected
              </span>
            )}
          </div>

          {headline && <HeadlineCard fee={headline} />}

          <div className="mt-5 space-y-3">
            {fees.map((f) => (
              <FeeCard key={f.id} fee={f} onOpen={() => setView({ kind: "detail", feeId: f.id })} />
            ))}
          </div>

          <button
            onClick={() => {
              if (!stripeConnected) { setShowStripePrompt(true); return; }
              setView({ kind: "create" });
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-background shadow-glow-teal active:opacity-90"
          >
            <Plus size={16} /> Create Fee
          </button>
        </>
      )}

      {view.kind === "detail" && (
        <FeeDetail
          fee={fees.find((f) => f.id === view.feeId)!}
          onBack={() => setView({ kind: "home" })}
          onUpdate={(next) => setFees((prev) => prev.map((f) => (f.id === next.id ? next : f)))}
        />
      )}

      {view.kind === "create" && (
        <CreateFee
          onBack={() => setView({ kind: "home" })}
          onCreate={(f) => { setFees((p) => [f, ...p]); setView({ kind: "home" }); }}
        />
      )}

      {showStripePrompt && (
        <StripeConnectSheet
          onClose={() => setShowStripePrompt(false)}
          onConnected={() => { setStripeConnected(true); setShowStripePrompt(false); setView({ kind: "create" }); }}
        />
      )}
    </div>
  );
}

// ---------- Home cards ----------

function HeadlineCard({ fee }: { fee: Fee }) {
  const s = feeStats(fee);
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold tracking-[0.2em] text-teal">FEATURED</p>
      <p className="mt-0.5 font-display text-lg font-bold">{fee.name}</p>
      <p className="mt-1 text-xs text-foreground">
        {money(s.collected)} collected · <span className="text-amber-400">{money(s.outstanding)} outstanding</span> · {s.paidCount}/{s.total} paid
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-teal" style={{ width: s.pct + "%" }} />
      </div>
    </div>
  );
}

function FeeCard({ fee, onOpen }: { fee: Fee; onOpen: () => void }) {
  const s = feeStats(fee);
  const tone =
    s.paidCount === s.total ? "bg-emerald-500/15 text-emerald-400" :
    s.overdue ? "bg-rose-500/15 text-rose-400" :
    "bg-amber-500/15 text-amber-400";
  return (
    <button onClick={onOpen} className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left active:bg-surface-2">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal">
        <DollarSign size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold">{fee.name}</p>
          <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + tone}>
            {s.paidCount}/{s.total} paid
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {money(fee.amount)} · due {fee.due}{s.overdue ? ` · ${s.daysOverdue}d overdue` : ""}
        </p>
      </div>
      <ChevronRight size={16} className="mt-2 text-muted-foreground" />
    </button>
  );
}

// ---------- Fee Detail ----------

function FeeDetail({ fee, onBack, onUpdate }: { fee: Fee; onBack: () => void; onUpdate: (f: Fee) => void }) {
  const [tab, setTab] = useState<"paid" | "unpaid">("unpaid");
  const [selected, setSelected] = useState<string[]>([]);
  const [remindOpen, setRemindOpen] = useState<{ targets: string[] } | null>(null);
  const [editing, setEditing] = useState(false);

  const s = feeStats(fee);
  const paidIds = new Set(fee.paid.map((p) => p.playerId));
  const paidPlayers = fee.assignedIds.filter((id) => paidIds.has(id));
  const unpaidPlayers = fee.assignedIds.filter((id) => !paidIds.has(id));

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const markPaid = (ids: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const additions = ids
      .filter((id) => !paidIds.has(id))
      .map<PaidRec>((id) => ({ playerId: id, date: today, method: "Manual" }));
    onUpdate({ ...fee, paid: [...fee.paid, ...additions] });
    setSelected([]);
  };

  const markUnpaid = (id: string) => {
    onUpdate({ ...fee, paid: fee.paid.filter((p) => p.playerId !== id) });
  };

  return (
    <>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Payments
      </button>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold">{fee.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{money(fee.amount)} · due {fee.due}</p>
          </div>
          <button onClick={() => setEditing(true)} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-teal">
            <Pencil size={14} />
          </button>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-teal" style={{ width: s.pct + "%" }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {money(s.collected)} collected · {money(s.outstanding)} outstanding · {s.paidCount}/{s.total} paid
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-border bg-surface p-1">
        {(["paid", "unpaid"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected([]); }}
            className={"rounded-full py-2 text-xs font-bold " + (tab === t ? "bg-gradient-brand text-background" : "text-muted-foreground")}
          >
            {t === "paid" ? `Paid (${paidPlayers.length})` : `Unpaid (${unpaidPlayers.length})`}
          </button>
        ))}
      </div>

      {tab === "paid" && (
        <div className="mt-3 space-y-1.5">
          {paidPlayers.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-xs text-muted-foreground">No payments yet.</p>
          )}
          {paidPlayers.map((id) => {
            const r = ROSTER.find((x) => x.id === id)!;
            const rec = fee.paid.find((p) => p.playerId === id)!;
            return (
              <div key={id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-teal">#{r.jersey}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-[10px] text-emerald-400/80">Paid {rec.date} · {rec.method}</p>
                </div>
                <button onClick={() => markUnpaid(id)} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                  Mark Unpaid
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "unpaid" && (
        <div className="mt-3 space-y-2">
          {unpaidPlayers.length > 0 && (
            <button
              onClick={() => setRemindOpen({ targets: unpaidPlayers })}
              className="w-full rounded-full border border-teal py-2 text-xs font-bold text-teal active:bg-teal/10"
            >
              Send Reminder to All ({unpaidPlayers.length})
            </button>
          )}
          {unpaidPlayers.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-xs text-muted-foreground">Everyone has paid — nice.</p>
          )}
          <div className="space-y-1.5">
            {unpaidPlayers.map((id) => {
              const r = ROSTER.find((x) => x.id === id)!;
              const checked = selected.includes(id);
              return (
                <label key={id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
                  <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="h-4 w-4 accent-teal" />
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-teal">#{r.jersey}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    {s.overdue && <p className="text-[10px] font-semibold text-rose-400">{s.daysOverdue} days overdue</p>}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {tab === "unpaid" && selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mx-auto flex max-w-[480px] items-center gap-2">
            <p className="flex-1 text-xs font-bold">{selected.length} selected</p>
            <button
              onClick={() => setRemindOpen({ targets: selected })}
              className="inline-flex items-center gap-1 rounded-full border border-teal px-3 py-2 text-xs font-bold text-teal"
            >
              <Send size={12} /> Send Reminder
            </button>
            <button
              onClick={() => markPaid(selected)}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-2 text-xs font-bold text-background"
            >
              <Check size={12} /> Mark as Paid
            </button>
          </div>
        </div>
      )}

      {remindOpen && (
        <SendReminderSheet fee={fee} targetIds={remindOpen.targets} onClose={() => setRemindOpen(null)} />
      )}

      {editing && (
        <EditFeeSheet fee={fee} onClose={() => setEditing(false)} onSave={(f) => { onUpdate(f); setEditing(false); }} />
      )}
    </>
  );
}

// ---------- Send Reminder Sheet ----------

function SendReminderSheet({ fee, targetIds, onClose }: { fee: Fee; targetIds: string[]; onClose: () => void }) {
  const first = ROSTER.find((r) => r.id === targetIds[0]);
  const defaultMsg =
    `Hi ${first?.parent ?? "[Parent name]"}, just a reminder that ${fee.name} of ${money(fee.amount)} is due ${fee.due}. Pay securely here: [link]`;
  const [msg, setMsg] = useState(defaultMsg);
  const [ch, setCh] = useState({ push: true, email: true, sms: true });
  const [sent, setSent] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Remind {targetIds.length} {targetIds.length === 1 ? "family" : "families"} about {fee.name}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted-foreground"><X size={14} /></button>
        </div>
        <p className="mt-3 text-[10px] font-bold tracking-wider text-muted-foreground">MESSAGE</p>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
        />
        <p className="mt-3 text-[10px] font-bold tracking-wider text-muted-foreground">SEND VIA</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([["push","Push"],["email","Email"],["sms","SMS"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setCh((c) => ({ ...c, [k]: !c[k] }))}
              className={"rounded-xl border px-3 py-2 text-xs font-bold " + (ch[k] ? "border-teal bg-teal/15 text-teal" : "border-border bg-surface-2 text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          disabled={sent}
          onClick={() => { setSent(true); setTimeout(onClose, 700); }}
          className="mt-4 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-background disabled:opacity-60"
        >
          {sent ? "Sent ✓" : "Send Reminder"}
        </button>
      </div>
    </div>
  );
}

// ---------- Create Fee ----------

function CreateFee({ onBack, onCreate }: { onBack: () => void; onCreate: (f: Fee) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [desc, setDesc] = useState("");
  const [assign, setAssign] = useState<"all" | "select" | "pos">("all");
  const [posSel, setPosSel] = useState<Record<"F" | "D" | "G", boolean>>({ F: true, D: true, G: true });
  const [picked, setPicked] = useState<string[]>([]);
  const [method, setMethod] = useState<"Online" | "Cash" | "Both">("Online");

  const assignedIds = useMemo(() => {
    if (assign === "all") return ROSTER.map((r) => r.id);
    if (assign === "select") return picked;
    return ROSTER.filter((r) => posSel[r.pos]).map((r) => r.id);
  }, [assign, picked, posSel]);

  const canCreate = name.trim() && parseFloat(amount) > 0 && due && assignedIds.length > 0;

  const submit = () => {
    if (!canCreate) return;
    onCreate({
      id: "f" + Date.now(),
      name: name.trim(),
      amount: parseFloat(amount),
      due,
      description: desc || undefined,
      assignedIds,
      method,
      paid: [],
    });
  };

  return (
    <>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Payments
      </button>
      <h1 className="mt-3 font-display text-2xl font-bold">Create Fee</h1>

      <div className="mt-4 space-y-3">
        <Field label="Fee name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Classic Bus Fee" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Amount ($)">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="1" placeholder="80" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm" />
          </Field>
          <Field label="Due date">
            <input value={due} onChange={(e) => setDue(e.target.value)} type="date" className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm" />
          </Field>
        </div>
        <Field label="Description (optional)">
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm" />
        </Field>

        <div>
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground">ASSIGN TO</p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {([["all","All"],["select","Select"],["pos","By Position"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setAssign(v)} className={"rounded-xl border px-2 py-2 text-xs font-bold " + (assign === v ? "border-teal bg-teal/15 text-teal" : "border-border bg-surface-2 text-muted-foreground")}>
                {label}
              </button>
            ))}
          </div>
          {assign === "pos" && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["F","D","G"] as const).map((p) => (
                <button key={p} onClick={() => setPosSel((s) => ({ ...s, [p]: !s[p] }))} className={"rounded-full border px-3 py-1.5 text-[11px] font-bold " + (posSel[p] ? "border-teal bg-teal/15 text-teal" : "border-border bg-surface-2 text-muted-foreground")}>
                  {p === "F" ? "Forwards" : p === "D" ? "Defence" : "Goalies"}
                </button>
              ))}
            </div>
          )}
          {assign === "select" && (
            <div className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface-2 p-2">
              {ROSTER.map((r) => {
                const on = picked.includes(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                    <input type="checkbox" checked={on} onChange={() => setPicked((p) => on ? p.filter((x) => x !== r.id) : [...p, r.id])} className="h-4 w-4 accent-teal" />
                    <span>#{r.jersey} {r.name}</span>
                  </label>
                );
              })}
            </div>
          )}
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users size={11} /> {assignedIds.length} player{assignedIds.length === 1 ? "" : "s"} assigned
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground">PAYMENT METHOD</p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {([["Online", CreditCard],["Cash", Banknote],["Both", DollarSign]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setMethod(v)} className={"flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold " + (method === v ? "border-teal bg-teal/15 text-teal" : "border-border bg-surface-2 text-muted-foreground")}>
                <Icon size={12} /> {v === "Online" ? "Online" : v === "Cash" ? "Cash" : "Both"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        disabled={!canCreate}
        onClick={submit}
        className="mt-6 flex w-full items-center justify-center rounded-full bg-gradient-brand py-3 text-sm font-bold text-background shadow-glow-teal disabled:opacity-50"
      >
        Create & Notify Team
      </button>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// ---------- Edit Fee (light) ----------

function EditFeeSheet({ fee, onClose, onSave }: { fee: Fee; onClose: () => void; onSave: (f: Fee) => void }) {
  const [name, setName] = useState(fee.name);
  const [amount, setAmount] = useState(String(fee.amount));
  const [due, setDue] = useState(fee.due);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Edit Fee</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted-foreground"><X size={14} /></button>
        </div>
        <div className="mt-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" />
            <input value={due} onChange={(e) => setDue(e.target.value)} type="date" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={() => onSave({ ...fee, name, amount: parseFloat(amount) || fee.amount, due })} className="mt-4 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-background">Save</button>
      </div>
    </div>
  );
}

// ---------- Stripe Connect prompt ----------

function StripeConnectSheet({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal"><CreditCard size={18} /></div>
          <h3 className="font-display text-base font-bold">Connect your bank account to collect payments</h3>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Set up Stripe Connect to accept card payments from families. Funds land directly in your team account, usually within 2 business days.
        </p>
        <button
          disabled={loading}
          onClick={() => { setLoading(true); setTimeout(onConnected, 900); }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-bold text-background disabled:opacity-60"
        >
          {loading ? "Opening Stripe…" : (<><ExternalLink size={14} /> Set up Stripe</>)}
        </button>
        <button onClick={onClose} className="mt-2 w-full rounded-full border border-border py-2.5 text-xs font-bold text-muted-foreground">
          Not now
        </button>
      </div>
    </div>
  );
}
