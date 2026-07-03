import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useMockPrivates,
  addMockPrivate,
  fmtPrivateDate,
  RATE_PRESETS,
  type MockPrivate,
} from "@/lib/mock-privates";

export const Route = createFileRoute("/_authenticated/coach/privates/")({
  head: () => ({ meta: [{ title: "Private Sessions — Coach" }] }),
  component: PrivatesScreen,
});

function PrivatesScreen() {
  const privates = useMockPrivates();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showNew, setShowNew] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(
    () =>
      privates
        .filter((p) =>
          tab === "upcoming" ? p.date >= today && p.status !== "cancelled" : p.date < today || p.status === "past",
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [privates, tab, today],
  );

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold">Private Sessions</h1>
          <p className="text-[11px] text-muted-foreground">Manage 1-on-1 and small group bookings.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1 rounded-full bg-gradient-to-r from-teal to-cyan-500 px-3 py-2 text-[12px] font-semibold text-white shadow-lg shadow-teal/20"
        >
          <Plus size={14} /> New Session
        </button>
      </header>

      <div className="grid grid-cols-2 rounded-full border border-border bg-card p-1 text-[12px] font-semibold">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full py-1.5 capitalize transition-colors ${tab === t ? "bg-teal text-white" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No {tab} sessions.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <SessionCard key={p.id} p={p} />
          ))}
        </ul>
      )}

      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-border bg-background">
          <SheetHeader>
            <SheetTitle>New Private Session</SheetTitle>
          </SheetHeader>
          <NewSessionForm onDone={() => setShowNew(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SessionCard({ p }: { p: MockPrivate }) {
  const paidCount = p.athletes.filter((a) => a.paid).length;
  const isPending = paidCount < p.athletes.length;
  const names =
    p.type === "1-on-1"
      ? p.athletes[0]?.name ?? "—"
      : p.athletes.map((a) => a.name.split(" ")[0]).join(" · ");
  const priceLabel =
    p.type === "Small Group" ? `$${p.ratePerAthlete}/athlete` : `$${p.ratePerAthlete}`;
  return (
    <li>
      <Link
        to="/coach/privates/$sessionId"
        params={{ sessionId: p.id }}
        className="block rounded-2xl border border-border bg-card p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {fmtPrivateDate(p.date)} · {p.time} · {p.duration} min
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {names} · <span className="text-muted-foreground">{p.type}{p.type === "Small Group" ? ` (${p.athletes.length})` : ""}</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.location}</p>
            <p className="mt-1 truncate text-[11px] font-semibold text-teal">
              {p.focus} · <span className="text-emerald-400">{priceLabel}</span>
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isPending
                ? "bg-amber-500/15 text-amber-400"
                : "bg-emerald-500/15 text-emerald-400"
            }`}
          >
            {isPending ? "Pending" : "Confirmed"}
          </span>
        </div>
        {isPending && (
          <p className="mt-1 text-[10px] font-semibold text-amber-400">
            {p.athletes.length - paidCount} not yet paid
          </p>
        )}
      </Link>
    </li>
  );
}

// ─────────────────────────────────────────
// New Session form
// ─────────────────────────────────────────
function NewSessionForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [type, setType] = useState<"1-on-1" | "Small Group">("1-on-1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("06:00");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [focus, setFocus] = useState("");
  const [rate, setRate] = useState(85);
  const [chargeMode, setChargeMode] = useState<"session" | "athlete">("session");
  const [inviteOnly, setInviteOnly] = useState(true);
  const [athletes, setAthletes] = useState<{ name: string; email: string }[]>([{ name: "", email: "" }]);

  const canAdd = type === "Small Group" && athletes.length < 6;
  const maxAthletes = type === "1-on-1" ? 1 : 6;
  const effectiveAthletes = athletes.slice(0, maxAthletes);

  const submit = () => {
    const cleaned = effectiveAthletes.filter((a) => a.name.trim());
    if (!cleaned.length) return toast.error("Add at least one athlete");
    if (!location.trim()) return toast.error("Location required");
    const parsedTime = new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const created = addMockPrivate({
      type,
      date,
      time: parsedTime,
      duration,
      location,
      focus: focus || "Skills",
      ratePerAthlete: rate,
      chargeMode,
      inviteOnly,
      coach: "Coach Davis",
      athletes: cleaned.map((a, i) => ({
        id: `na_${Date.now()}_${i}`,
        name: a.name,
        email: a.email,
        paid: false,
        amount: rate,
      })),
      status: "pending",
    });
    toast.success("Session created — invites sent");
    onDone();
    navigate({ to: "/coach/privates/$sessionId", params: { sessionId: created.id } });
  };

  return (
    <div className="space-y-4 pb-6 pt-2">
      <Field label="Session Type">
        <div className="grid grid-cols-2 gap-2">
          {(["1-on-1", "Small Group"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-xl border px-3 py-2 text-[12px] font-semibold ${
                type === t ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>

      <Field label="Duration">
        <div className="flex flex-wrap gap-2">
          {[45, 60, 75, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                duration === d ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </Field>

      <Field label="Location / Rink">
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Rink 1 · Burnaby 8 Rinks" />
      </Field>

      <Field label="Focus / Notes">
        <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Skating + Edges" />
      </Field>

      <Field label="Rate">
        <div className="mb-2 flex flex-wrap gap-2">
          {RATE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setRate(p.price)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                rate === p.price ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"
              }`}
            >
              {p.label} ${p.price}
            </button>
          ))}
        </div>
        <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        <div className="mt-2 flex items-center justify-between rounded-xl bg-surface p-2 text-[11px]">
          <span className="text-muted-foreground">Charge per {chargeMode}</span>
          <button
            onClick={() => setChargeMode(chargeMode === "session" ? "athlete" : "session")}
            className="rounded-full border border-border px-2 py-0.5 font-semibold text-teal"
          >
            Switch to per {chargeMode === "session" ? "athlete" : "session"}
          </button>
        </div>
      </Field>

      <Field label="Visibility">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
          <div>
            <p className="text-[12px] font-semibold">Invite only</p>
            <p className="text-[10px] text-muted-foreground">
              {inviteOnly ? "Only accessible via unique link." : "Also visible on public booking page."}
            </p>
          </div>
          <Switch checked={inviteOnly} onCheckedChange={setInviteOnly} />
        </div>
      </Field>

      <Field label={type === "1-on-1" ? "Athlete" : `Athletes (up to 6)`}>
        <div className="space-y-2">
          {effectiveAthletes.map((a, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <Input
                value={a.name}
                onChange={(e) => {
                  const next = [...athletes];
                  next[i] = { ...next[i], name: e.target.value };
                  setAthletes(next);
                }}
                placeholder="Athlete name"
              />
              <Input
                value={a.email}
                onChange={(e) => {
                  const next = [...athletes];
                  next[i] = { ...next[i], email: e.target.value };
                  setAthletes(next);
                }}
                placeholder="Parent email"
              />
            </div>
          ))}
          {canAdd && (
            <button
              onClick={() => setAthletes([...athletes, { name: "", email: "" }])}
              className="w-full rounded-xl border border-dashed border-border py-2 text-[11px] font-semibold text-teal"
            >
              + Add athlete
            </button>
          )}
        </div>
      </Field>

      <button
        onClick={submit}
        className="w-full rounded-xl bg-gradient-to-r from-teal to-cyan-500 py-3 text-sm font-bold text-white shadow-lg shadow-teal/20"
      >
        Create & Send Invites
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export { Check, X };