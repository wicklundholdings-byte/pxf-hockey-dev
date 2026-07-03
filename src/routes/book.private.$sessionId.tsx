import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, CheckCircle2, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { getMockPrivate, markAthletePaid, fmtPrivateDate } from "@/lib/mock-privates";

export const Route = createFileRoute("/book/private/$sessionId")({
  head: () => ({ meta: [{ title: "Book Private Session" }] }),
  component: BookPrivate,
});

function BookPrivate() {
  const { sessionId } = useParams({ from: "/book/private/$sessionId" });
  const p = getMockPrivate(sessionId);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [parent, setParent] = useState({ name: "", email: "", phone: "" });
  const [athlete, setAthlete] = useState({ name: "", age: "" });
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });

  if (!p) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-sm text-muted-foreground">
        Session not found or no longer available.
      </div>
    );
  }

  const price = p.ratePerAthlete;

  const downloadIcs = () => {
    const dt = new Date(`${p.date}T00:00:00`);
    const stamp = dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${p.id}@pxfhockey\nDTSTAMP:${stamp}\nDTSTART:${stamp}\nSUMMARY:Private Session — ${p.focus}\nLOCATION:${p.location}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const pay = () => {
    if (!card.number || !card.exp || !card.cvc) return toast.error("Card details required");
    const targetAthlete = p.athletes.find((a) => !a.paid) ?? p.athletes[0];
    if (targetAthlete) markAthletePaid(p.id, targetAthlete.id);
    setStep(4);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background p-4 text-foreground">
      <header className="mb-4">
        <h1 className="font-display text-xl font-bold">Book Your Session</h1>
        <p className="text-[11px] text-muted-foreground">Coach {p.coach ?? "Davis"} invited you.</p>
      </header>

      {step === 1 && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {fmtPrivateDate(p.date)}
            </p>
            <h2 className="mt-1 text-lg font-bold">{p.focus}</h2>
            <div className="mt-3 space-y-1.5 text-[12px] text-muted-foreground">
              <p className="flex items-center gap-2"><Clock size={12} /> {p.time} · {p.duration} min</p>
              <p className="flex items-center gap-2"><MapPin size={12} /> {p.location}</p>
              <p className="flex items-center gap-2"><Calendar size={12} /> {p.type}</p>
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-400">${price}</p>
          </section>
          <button
            onClick={() => setStep(2)}
            className="w-full rounded-xl bg-gradient-to-r from-teal to-cyan-500 py-3 text-sm font-bold text-white"
          >
            Book This Session
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold">Your Details</h2>
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="Parent name" value={parent.name} onChange={(e) => setParent({ ...parent, name: e.target.value })} />
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="Email" value={parent.email} onChange={(e) => setParent({ ...parent, email: e.target.value })} />
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="Phone" value={parent.phone} onChange={(e) => setParent({ ...parent, phone: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="Athlete name" value={athlete.name} onChange={(e) => setAthlete({ ...athlete, name: e.target.value })} />
            <input className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="Age" value={athlete.age} onChange={(e) => setAthlete({ ...athlete, age: e.target.value })} />
          </div>
          <button
            onClick={() => {
              if (!parent.name || !parent.email || !athlete.name) return toast.error("Fill required fields");
              setStep(3);
            }}
            className="w-full rounded-xl bg-gradient-to-r from-teal to-cyan-500 py-3 text-sm font-bold text-white"
          >
            Continue to Payment
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold">Payment</h2>
          <input className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="Card number" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="MM / YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} />
            <input className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="CVC" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
          </div>
          <button onClick={pay} className="w-full rounded-xl bg-gradient-to-r from-teal to-cyan-500 py-3 text-sm font-bold text-white">
            Pay ${price} & Confirm
          </button>
          <p className="text-center text-[10px] text-muted-foreground">Secure Stripe checkout · Test mode</p>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <CheckCircle2 size={40} className="text-emerald-400" />
            <h2 className="text-lg font-bold">You're booked! ✓</h2>
            <p className="text-[11px] text-muted-foreground">A confirmation was sent to {parent.email || "your email"}.</p>
          </div>
          <section className="rounded-2xl border border-border bg-card p-4 text-[12px] space-y-1">
            <p className="font-semibold">{p.focus}</p>
            <p className="text-muted-foreground">{fmtPrivateDate(p.date)} · {p.time}</p>
            <p className="text-muted-foreground">{p.location}</p>
            <p className="text-muted-foreground">{p.duration} min · ${price}</p>
          </section>
          <button onClick={downloadIcs} className="w-full py-2 text-[12px] font-semibold text-teal">Add to Calendar</button>
          <a href="/parent" className="block text-center text-[12px] font-semibold text-teal">View in App</a>
        </div>
      )}
    </div>
  );
}