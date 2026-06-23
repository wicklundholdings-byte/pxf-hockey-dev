import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, Calendar, TrendingUp, CheckCircle2, XCircle, Activity, Film } from "lucide-react";
import { AthleteMediaTab } from "@/components/athlete-media-tab";
import { DrylandCoachPanel } from "@/components/dryland-coach-panel";

export const Route = createFileRoute("/_authenticated/coach/attendees/$athleteId")({
  component: AthleteProfile,
});

function AthleteProfile() {
  const { athleteId } = useParams({ from: "/_authenticated/coach/attendees/$athleteId" });
  const [tab, setTab] = useState<"overview" | "media">("overview");
  const athlete = {
    name: "Jordan Walsh", birthday: "2014-03-12", age: 11, position: "Forward",
    skill: "Intermediate", gender: "M",
  };
  const parent = { name: "Sarah Walsh", email: "sarah.walsh@gmail.com", phone: "(416) 555-0182", id: "c1" };
  const camps = [
    { name: "Elite Skills Camp", date: "Aug 2025", status: "completed" },
    { name: "Spring Power Skating", date: "Apr 2025", status: "completed" },
    { name: "Winter Skills Clinic", date: "Jan 2025", status: "completed" },
    { name: "Fall Edge Work", date: "Oct 2024", status: "completed" },
  ];
  const skills = [
    { name: "Skating", scores: [3, 3, 4, 4, 5] },
    { name: "Puck Control", scores: [2, 3, 3, 4, 4] },
    { name: "Shooting", scores: [3, 3, 3, 4, 4] },
    { name: "Hockey IQ", scores: [3, 4, 4, 4, 5] },
    { name: "Compete", scores: [4, 4, 5, 5, 5] },
  ];
  const attendance = [
    { day: "Day 1", present: true }, { day: "Day 2", present: true },
    { day: "Day 3", present: false }, { day: "Day 4", present: true }, { day: "Day 5", present: true },
  ];

  return (
    <div className="space-y-4">
      <Link to="/coach/attendees" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> All attendees
      </Link>

      <Link
        to="/combine/$athleteId"
        params={{ athleteId }}
        className="flex items-center justify-between rounded-xl border border-teal/40 bg-teal/10 px-3 py-2 text-xs font-semibold text-teal"
      >
        <span className="flex items-center gap-2"><Activity size={14} /> View PXF Combine profile</span>
        <span>→</span>
      </Link>

      <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
        <button
          onClick={() => setTab("overview")}
          className={"flex-1 rounded-lg py-1.5 text-[11px] font-bold " + (tab === "overview" ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("media")}
          className={"flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold " + (tab === "media" ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")}
        >
          <Film size={12} /> Media
        </button>
      </div>

      {tab === "media" && (
        <AthleteMediaTab athleteId={athleteId} athleteName={athlete.name} />
      )}

      {tab === "overview" && (<>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-teal/15 text-base font-bold text-teal">JW</div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground">{athlete.name}</h1>
            <p className="text-[10px] text-muted-foreground">Athlete #{athleteId.slice(0,6)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <Cell k="Birthday" v={athlete.birthday} />
          <Cell k="Age" v={`${athlete.age} yrs`} />
          <Cell k="Position" v={athlete.position} />
          <Cell k="Skill level" v={athlete.skill} />
        </div>
      </div>

      <Section title="Parent / Guardian">
        <Link to="/coach/contacts/$contactId" params={{ contactId: parent.id }}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-400/15 text-[10px] font-bold text-amber-400">SW</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{parent.name}</p>
            <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Mail size={10}/> {parent.email}
            </p>
            <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Phone size={10}/> {parent.phone}
            </p>
          </div>
        </Link>
      </Section>

      <Section title="Camps Attended" icon={Calendar}>
        <ul className="space-y-2">
          {camps.map((c, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl border border-border bg-surface p-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.date}</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">{c.status}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evaluation History" icon={TrendingUp}>
        <p className="mb-2 text-[10px] text-muted-foreground">Skill rating trend across {skills[0].scores.length} camps</p>
        <div className="space-y-3">
          {skills.map((s) => {
            const latest = s.scores[s.scores.length - 1];
            const delta = latest - s.scores[0];
            return (
              <div key={s.name}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-bold text-foreground">
                    {latest} <span className={"ml-1 text-[10px] " + (delta >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {delta >= 0 ? "+" : ""}{delta}
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex h-6 items-end gap-1">
                  {s.scores.map((sc, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-teal/70" style={{ height: `${(sc / 5) * 100}%` }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Attendance Record" icon={CheckCircle2}>
        <p className="mb-2 text-[10px] text-muted-foreground">Latest camp — Elite Skills Camp</p>
        <div className="grid grid-cols-5 gap-2">
          {attendance.map((d) => (
            <div key={d.day} className="rounded-xl border border-border bg-surface p-2 text-center">
              {d.present ? <CheckCircle2 size={16} className="mx-auto text-emerald-400" /> : <XCircle size={16} className="mx-auto text-rose-400" />}
              <p className="mt-1 text-[9px] font-semibold text-muted-foreground">{d.day}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Overall: <span className="font-bold text-foreground">4 of 5 days</span> · 80% attendance
        </p>
      </Section>

      <DrylandCoachPanel athleteId={athleteId} />
      </>)}
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface p-2.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-foreground">{v}</p>
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