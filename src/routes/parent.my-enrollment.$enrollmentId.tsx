import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft, Calendar, MapPin, User as UserIcon, Clock,
  CheckCircle2, Download, Receipt, StickyNote, Info,
} from "lucide-react";

export const Route = createFileRoute("/parent/my-enrollment/$enrollmentId")({
  head: () => ({ meta: [{ title: "My Enrollment — PXF Hockey" }] }),
  component: EnrollmentDetail,
});

type CampData = {
  kind: "camp";
  name: string;
  dates: string;
  host: string;
  coach: string;
  location: string;
  athlete: string;
  checkInStatus: "CONFIRMED" | "PENDING";
  paid: number;
  paidOn: string;
  days: Array<{ label: string; ice: string; rink: string; bring: string }>;
};

type PrivateData = {
  kind: "private";
  name: string;
  date: string;
  time: string;
  location: string;
  coach: string;
  athlete: string;
  notes: string[];
  paid: number;
  paidOn: string;
};

const DATA: Record<string, CampData | PrivateData> = {
  "summer-elite": {
    kind: "camp",
    name: "Summer Elite Camp",
    dates: "Jul 14–18",
    host: "PXF Skills Academy",
    coach: "Coach Reilly",
    location: "Surrey Sport & Leisure — Rink A",
    athlete: "Alex Dev",
    checkInStatus: "CONFIRMED",
    paid: 450,
    paidOn: "Jun 12, 2026",
    days: [
      { label: "Mon Jul 14", ice: "9:00 – 11:00 AM", rink: "Rink A", bring: "Full gear · 2 water bottles" },
      { label: "Tue Jul 15", ice: "9:00 – 11:00 AM", rink: "Rink A", bring: "Full gear · practice jersey (light)" },
      { label: "Wed Jul 16", ice: "9:00 – 11:00 AM", rink: "Rink B", bring: "Full gear · practice jersey (dark)" },
      { label: "Thu Jul 17", ice: "9:00 – 11:00 AM", rink: "Rink A", bring: "Full gear · snacks for lunch" },
      { label: "Fri Jul 18", ice: "9:00 – 12:00 PM", rink: "Rink A", bring: "Full gear · showcase jersey" },
    ],
  },
  "skating-power": {
    kind: "private",
    name: "Skating Power Clinic",
    date: "Mon Jul 21, 2026",
    time: "4:30 – 5:30 PM",
    location: "Guildford Recreation Centre — Rink 2",
    coach: "Coach Park",
    athlete: "Alex Dev",
    notes: [
      "Focus: edge work & crossovers",
      "Bring skates, helmet, gloves, stick",
      "Arrive 15 min early for warm-up",
    ],
    paid: 120,
    paidOn: "Jul 1, 2026",
  },
};

function EnrollmentDetail() {
  const { enrollmentId } = Route.useParams();
  const data = DATA[enrollmentId];

  if (!data) {
    return (
      <div className="px-5 pt-4">
        <Link to="/parent/teams" className="inline-flex items-center gap-1 text-xs font-bold text-teal">
          <ChevronLeft size={14} /> My Clubs
        </Link>
        <p className="mt-6 text-sm text-muted-foreground">Enrollment not found.</p>
      </div>
    );
  }

  return data.kind === "camp" ? <CampDetail data={data} /> : <PrivateDetail data={data} />;
}

function BackLink() {
  return (
    <Link to="/parent/teams" className="inline-flex items-center gap-1 text-xs font-bold text-teal">
      <ChevronLeft size={14} /> My Clubs
    </Link>
  );
}

type Tab = "overview" | "schedule" | "roster" | "payments";

function CampDetail({ data }: { data: CampData }) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "schedule", label: "Schedule" },
    { key: "roster", label: "Roster" },
    { key: "payments", label: "Payments" },
  ];

  return (
    <div className="space-y-5 px-5 pb-10 pt-2">
      <BackLink />

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{data.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/80">
              <span className="inline-flex items-center gap-1"><Calendar size={12} />{data.dates}</span>
              <span>·</span>
              <span>{data.host}</span>
            </div>
            <p className="mt-1 text-xs text-white/70">Coach: {data.coach}</p>
          </div>
          <span className="shrink-0 rounded-full bg-teal/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-teal">
            CAMP
          </span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition " +
              (tab === t.key
                ? "bg-gradient-brand text-background shadow-glow-teal"
                : "text-muted-foreground hover:text-white")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Dates</p>
            <p className="mt-1 text-sm font-semibold text-white">{data.dates}, 2026 · 5 days</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
            <MapPin size={16} className="mt-0.5 shrink-0 text-teal" />
            <div>
              <p className="text-sm font-semibold text-white">{data.location}</p>
              <p className="text-[11px] text-white/70">{data.host}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Daily Schedule</p>
            <p className="mt-1 text-sm font-semibold text-white">9:00 – 11:00 AM · On-ice</p>
            <p className="text-xs text-white/70">Followed by 30 min classroom video review</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{data.athlete}</p>
              <p className="text-[11px] text-white/70">Athlete check-in</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              {data.checkInStatus}
            </span>
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <div className="space-y-2">
          {data.days.map((d, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">{d.label}</p>
                <span className="text-[10px] font-bold tracking-wider text-teal">DAY {i + 1}</span>
              </div>
              <div className="mt-2 space-y-1.5 text-xs text-white/85">
                <p className="flex items-center gap-2"><Clock size={12} className="text-teal" /> {d.ice}</p>
                <p className="flex items-center gap-2"><MapPin size={12} className="text-teal" /> {d.rink}</p>
                <p className="flex items-start gap-2"><Info size={12} className="mt-0.5 text-teal" /> {d.bring}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "roster" && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">My Athlete</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{data.athlete}</p>
              <p className="text-[11px] text-white/70">Enrolled · Check-in confirmed</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
              CONFIRMED
            </span>
          </div>
          <p className="mt-4 text-[11px] text-white/60">
            Other athletes' names are kept private.
          </p>
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total Paid</p>
                <p className="mt-1 text-2xl font-bold text-white">${data.paid.toFixed(2)}</p>
                <p className="text-[11px] text-white/70">Paid in full on {data.paidOn}</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                PAID
              </span>
            </div>
          </div>
          <button className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 transition hover:border-teal/40">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal/15">
                <Receipt size={16} className="text-teal" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Receipt</p>
                <p className="text-[11px] text-white/70">PDF · Summer Elite Camp</p>
              </div>
            </div>
            <Download size={16} className="text-teal" />
          </button>
        </div>
      )}
    </div>
  );
}

function PrivateDetail({ data }: { data: PrivateData }) {
  return (
    <div className="space-y-5 px-5 pb-10 pt-2">
      <BackLink />

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{data.name}</h2>
            <p className="mt-1 text-xs text-white/80">{data.date}</p>
          </div>
          <span className="shrink-0 rounded-full bg-fuchsia-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-fuchsia-300">
            PRIVATE
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <Clock size={16} className="shrink-0 text-teal" />
          <div>
            <p className="text-sm font-semibold text-white">{data.time}</p>
            <p className="text-[11px] text-white/70">60-minute session</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
          <MapPin size={16} className="mt-0.5 shrink-0 text-teal" />
          <p className="text-sm font-semibold text-white">{data.location}</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <UserIcon size={16} className="shrink-0 text-teal" />
          <div>
            <p className="text-sm font-semibold text-white">{data.coach}</p>
            <p className="text-[11px] text-white/70">Instructor</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <StickyNote size={14} className="text-teal" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal">Session Notes</p>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs text-white/85">
            {data.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal" />
                {n}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Payment</p>
              <p className="mt-1 text-2xl font-bold text-white">${data.paid.toFixed(2)}</p>
              <p className="text-[11px] text-white/70">Paid on {data.paidOn}</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
              PAID
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}