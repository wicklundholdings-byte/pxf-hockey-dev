import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, MessageSquare, DollarSign, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/contacts/$contactId")({
  component: ContactDetail,
});

function ContactDetail() {
  const { contactId } = useParams({ from: "/_authenticated/coach/contacts/$contactId" });
  const [note, setNote] = useState("Pays on time. Two kids, one in goalie program.");
  const [savedNote, setSavedNote] = useState(note);

  const contact = {
    name: "Sarah Walsh",
    email: "sarah.walsh@gmail.com",
    phone: "(416) 555-0182",
    location: "Toronto, ON",
    since: "Jan 2024",
  };
  const athletes = [
    { id: "a1", name: "Jordan Walsh", age: 11, position: "Forward" },
    { id: "a2", name: "Riley Walsh", age: 9, position: "Goalie" },
  ];
  const history = [
    { camp: "Elite Skills Camp", date: "Aug 12–16, 2025", amount: 420, status: "paid" },
    { camp: "Spring Power Skating", date: "Apr 6–10, 2025", amount: 320, status: "paid" },
    { camp: "Winter Goalie Clinic", date: "Jan 4–8, 2025", amount: 380, status: "refunded" },
  ];
  const messages = [
    { from: "Sarah", text: "Will Jordan need full gear for day 1?", date: "Aug 8" },
    { from: "You", text: "Yes — full gear all five days.", date: "Aug 8" },
    { from: "Sarah", text: "Thanks!", date: "Aug 8" },
  ];

  return (
    <div className="space-y-4">
      <Link to="/coach/contacts" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> All contacts
      </Link>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-teal/15 text-base font-bold text-teal">SW</div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold text-foreground">{contact.name}</h1>
            <p className="text-[10px] text-muted-foreground">Contact #{contactId.slice(0, 6)} · Since {contact.since}</p>
          </div>
          <button className="rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground">Message</button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] text-muted-foreground">
          <p className="flex items-center gap-2"><Mail size={11} /> {contact.email}</p>
          <p className="flex items-center gap-2"><Phone size={11} /> {contact.phone}</p>
          <p className="flex items-center gap-2"><MapPin size={11} /> {contact.location}</p>
        </div>
      </div>

      <Section title="Linked Athletes" icon={User}>
        <div className="space-y-2">
          {athletes.map((a) => (
            <Link key={a.id} to="/coach/attendees/$athleteId" params={{ athleteId: a.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-green-400/15 text-[10px] font-bold text-green-400">
                {a.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{a.name}</p>
                <p className="text-[10px] text-muted-foreground">{a.age} yrs · {a.position}</p>
              </div>
              <span className="text-[10px] text-teal">View →</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Registration History" icon={Calendar}>
        <ul className="space-y-2">
          {history.map((h, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl border border-border bg-surface p-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">{h.camp}</p>
                <p className="text-[10px] text-muted-foreground">{h.date}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">${h.amount}</p>
                <span className={"text-[9px] uppercase " + (h.status === "paid" ? "text-emerald-400" : "text-muted-foreground")}>{h.status}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between rounded-xl bg-teal/5 px-3 py-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><DollarSign size={11}/> Lifetime value</span>
          <span className="text-sm font-bold text-emerald-400">$1,120</span>
        </div>
      </Section>

      <Section title="Message History" icon={MessageSquare}>
        <ul className="space-y-1.5">
          {messages.map((m, i) => (
            <li key={i} className={"max-w-[80%] rounded-2xl px-3 py-2 text-xs " +
              (m.from === "You" ? "ml-auto bg-teal/15 text-foreground" : "bg-surface text-foreground")}>
              <p>{m.text}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">{m.from} · {m.date}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Private Notes">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
          placeholder="Notes only you can see…"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{note === savedNote ? "Saved" : "Unsaved changes"}</span>
          <button onClick={() => setSavedNote(note)} className="rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-bold text-primary-foreground">Save note</button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
        {Icon && <Icon size={11} />} {title}
      </h3>
      {children}
    </div>
  );
}