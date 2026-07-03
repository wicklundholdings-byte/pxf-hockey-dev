import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Phone, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { MOCK_ATHLETES } from "./coach.athletes.index";

export const Route = createFileRoute("/_authenticated/coach/athletes/$athleteId")({
  component: AthleteProfile,
});

type Tab = "overview" | "stats" | "training" | "notes";

const GAME_LOG = [
  { date: "Jun 28", opp: "vs North Delta", g: 1, a: 2, pts: 3, plus: 2 },
  { date: "Jun 21", opp: "vs Coquitlam", g: 2, a: 0, pts: 2, plus: 1 },
  { date: "Jun 14", opp: "vs Burnaby", g: 0, a: 1, pts: 1, plus: 0 },
  { date: "Jun 7", opp: "vs Richmond", g: 1, a: 2, pts: 3, plus: 3 },
];

const ACTIVE_PROGRAMS = [
  { name: "Shooting Foundations", assigned: "Coach Davis · Jul 1", done: 3, total: 4, next: "Session 4 · 25 min", complete: false },
  { name: "Stick Skills Starter", assigned: "Coach Davis · Jun 15", done: 4, total: 4, next: "", complete: true, completedOn: "Jun 29" },
];

const INITIAL_NOTES = `Jul 1 — Great compete level in practice. Needs to work on backhand release — telegraphing the shot too early.

Jun 21 — Strong game vs Coquitlam. Leadership on the bench is improving. Consider for alternate captain next season.`;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function AthleteProfile() {
  const { athleteId } = Route.useParams();
  const athlete = MOCK_ATHLETES.find((a) => a.id === athleteId) ?? MOCK_ATHLETES[0];
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="space-y-4 pb-10">
      <Link to="/coach/athletes" className="inline-flex items-center gap-1 text-[13px] font-bold text-teal">
        <ChevronLeft size={16} /> Athletes
      </Link>

      {/* Header card */}
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-5 text-center">
        <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-brand text-2xl font-bold text-background">
          {initials(athlete.name)}
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-background text-[11px] font-bold text-teal">
            {athlete.jersey}
          </span>
        </div>
        <p className="mt-3 font-display text-xl font-bold">{athlete.name} <span className="text-muted-foreground">#{athlete.jersey}</span></p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{athlete.position} · {athlete.team} · 2025-26</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
        {(["overview", "stats", "training", "notes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-full py-1.5 text-[11px] font-bold capitalize " +
              (tab === t ? "bg-teal text-background" : "text-muted-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "stats" && <StatsTab />}
      {tab === "training" && <TrainingTab />}
      {tab === "notes" && <NotesTab />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-muted-foreground">{title}</p>
      <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold text-foreground">{v}</span>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      <Section title="PLAYER INFO">
        <Row k="Date of birth" v="Aug 12, 2010 · Age 15" />
        <Row k="Position" v="Left Wing" />
        <Row k="Shoots" v="Left" />
        <Row k="Height / Weight" v={`5'9" · 158 lbs`} />
        <Row k="Jersey" v="#14" />
      </Section>

      <Section title="CONTACT">
        <p className="text-[11px] font-bold tracking-wider text-teal">PLAYER</p>
        <a href="tel:6045550142" className="flex items-center gap-2 text-[12px] font-semibold"><Phone size={12} className="text-teal" /> 604-555-0142</a>
        <a href="mailto:liam.carter@email.com" className="flex items-center gap-2 text-[12px] font-semibold"><Mail size={12} className="text-teal" /> liam.carter@email.com</a>
        <div className="my-1 h-px bg-border" />
        <p className="text-[11px] font-bold tracking-wider text-teal">PARENT / GUARDIAN</p>
        <Row k="Name" v="Sarah Carter" />
        <a href="tel:6045550183" className="flex items-center gap-2 text-[12px] font-semibold"><Phone size={12} className="text-teal" /> 604-555-0183</a>
        <a href="mailto:sarah.carter@email.com" className="flex items-center gap-2 text-[12px] font-semibold"><Mail size={12} className="text-teal" /> sarah.carter@email.com</a>
        <div className="my-1 h-px bg-border" />
        <p className="text-[11px] font-bold tracking-wider text-teal">EMERGENCY CONTACT</p>
        <Row k="Name" v="Mike Carter (Father)" />
        <a href="tel:6045550199" className="flex items-center gap-2 text-[12px] font-semibold"><Phone size={12} className="text-teal" /> 604-555-0199</a>
      </Section>

      <Section title="MEDICAL NOTES · COACH ONLY">
        <p className="text-[12px] leading-relaxed text-foreground">
          Mild peanut allergy. Previous right shoulder strain (recovered).
        </p>
      </Section>
    </div>
  );
}

function StatsTab() {
  return (
    <div className="space-y-4">
      <Section title="SEASON SUMMARY">
        <div className="grid grid-cols-6 gap-1 text-center">
          {[
            ["GP", 14], ["G", 8], ["A", 12], ["PTS", 20], ["+/-", "+6"], ["PIM", 4],
          ].map(([k, v]) => (
            <div key={k as string}>
              <p className="font-display text-lg font-bold">{v}</p>
              <p className="text-[9px] font-bold tracking-wider text-muted-foreground">{k}</p>
            </div>
          ))}
        </div>
      </Section>

      <section>
        <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-muted-foreground">GAME LOG</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-[64px_1fr_28px_28px_36px_36px] gap-1 border-b border-border bg-surface-2 px-3 py-2 text-[10px] font-bold tracking-wider text-muted-foreground">
            <span>DATE</span><span>OPP</span><span className="text-right">G</span><span className="text-right">A</span><span className="text-right">PTS</span><span className="text-right">+/-</span>
          </div>
          {GAME_LOG.map((r) => (
            <div key={r.date} className="grid grid-cols-[64px_1fr_28px_28px_36px_36px] gap-1 border-b border-border/60 px-3 py-2 text-[12px] last:border-b-0">
              <span className="font-bold text-teal">{r.date}</span>
              <span className="truncate">{r.opp}</span>
              <span className="text-right font-semibold">{r.g}</span>
              <span className="text-right font-semibold">{r.a}</span>
              <span className="text-right font-bold">{r.pts}</span>
              <span className={"text-right font-semibold " + (r.plus > 0 ? "text-emerald-400" : r.plus < 0 ? "text-red-400" : "text-muted-foreground")}>{r.plus > 0 ? `+${r.plus}` : r.plus}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-teal/30 bg-teal/10 p-3 text-center text-[12px] font-bold text-teal">
        Career high: 3 PTS (Jun 28 vs North Delta)
      </div>
    </div>
  );
}

function TrainingTab() {
  const [showCompleted, setShowCompleted] = useState(false);
  const active = ACTIVE_PROGRAMS.filter((p) => !p.complete);
  const done = ACTIVE_PROGRAMS.filter((p) => p.complete);

  return (
    <div className="space-y-4">
      <section>
        <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-muted-foreground">ACTIVE</p>
        <div className="space-y-2">
          {active.map((p) => {
            const pct = Math.round((p.done / p.total) * 100);
            return (
              <div key={p.name} className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-sm font-bold">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">Assigned by {p.assigned}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[11px] font-bold">{p.done}/{p.total} sessions · {pct}%</p>
                {p.next && <p className="mt-0.5 text-[11px] text-muted-foreground">Next: {p.next}</p>}
                <button className="mt-2 text-[11px] font-bold text-teal">View Program →</button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <button onClick={() => setShowCompleted((s) => !s)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
          <span className="text-[11px] font-bold tracking-wider text-muted-foreground">COMPLETED ({done.length})</span>
          {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showCompleted && (
          <div className="mt-2 space-y-2">
            {done.map((p) => (
              <div key={p.name} className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-sm font-bold">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">Assigned by {p.assigned}</p>
                <p className="mt-1 text-[11px] font-bold text-emerald-400">✓ Complete · {p.total}/{p.total} sessions · {p.completedOn}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NotesTab() {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-3">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">DEVELOPMENT NOTES · COACH ONLY</p>
          <button onClick={() => setEditing((e) => !e)} className="text-[11px] font-bold text-teal">{editing ? "Done" : "Edit"}</button>
        </div>
        {editing ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            className="w-full rounded-2xl border border-border bg-surface p-4 text-[12px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal"
          />
        ) : (
          <div className="whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-[12px] leading-relaxed">
            {notes || <span className="text-muted-foreground">No notes yet.</span>}
          </div>
        )}
      </section>

      {adding ? (
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="New note…"
            className="w-full rounded-xl border border-border bg-background p-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-teal"
          />
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setDraft(""); }} className="flex-1 rounded-full border border-border py-2 text-[11px] font-bold">Cancel</button>
            <button
              onClick={() => {
                if (!draft.trim()) return;
                const stamp = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
                setNotes(`${stamp} — ${draft.trim()}\n\n${notes}`);
                setDraft(""); setAdding(false);
              }}
              className="flex-1 rounded-full bg-gradient-brand py-2 text-[11px] font-bold text-background"
            >Save Note</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-[12px] font-bold text-teal">+ Add Note</button>
      )}
    </div>
  );
}