
// ============= Practice Detail =============

type PracticeBlock = {
  id: string;
  name: string;
  minutes: number;
  drills?: Array<{ id: string; name: string; minutes: number }>;
};

const MOCK_PLAN: { focus: string; blocks: PracticeBlock[] } = {
  focus: "Defensive zone coverage + breakouts",
  blocks: [
    { id: "b1", name: "Warm-up Skate", minutes: 10 },
    { id: "b2", name: "Skating / Edges", minutes: 20 },
    {
      id: "b3",
      name: "Drill Block 1",
      minutes: 25,
      drills: [
        { id: "d1", name: "Figure 8 Edge Work", minutes: 10 },
        { id: "d2", name: "2-on-1 Rush", minutes: 15 },
      ],
    },
    { id: "b4", name: "Drill Block 2", minutes: 20 },
    { id: "b5", name: "Compete / Battle", minutes: 10 },
    { id: "b6", name: "Cooldown", minutes: 5 },
  ],
};

const MOCK_ROSTER: Player[] = [
  { id: "m1", display_name: "Andersson, L.", jersey_number: "9" },
  { id: "m2", display_name: "Brooks, T.", jersey_number: "11" },
  { id: "m3", display_name: "Carter, J.", jersey_number: "14" },
  { id: "m4", display_name: "Callahan, S.", jersey_number: "17" },
  { id: "m5", display_name: "Davidson, R.", jersey_number: "21" },
  { id: "m6", display_name: "Jensen, M.", jersey_number: "22" },
  { id: "m7", display_name: "Kim, D.", jersey_number: "27" },
  { id: "m8", display_name: "Miller, A.", jersey_number: "33" },
  { id: "m9", display_name: "Nguyen, P.", jersey_number: "44" },
  { id: "m10", display_name: "Park, H.", jersey_number: "55" },
  { id: "m11", display_name: "Petrov, V.", jersey_number: "61" },
  { id: "m12", display_name: "Torres, E.", jersey_number: "72" },
  { id: "m13", display_name: "Vella, N.", jersey_number: "88" },
  { id: "m14", display_name: "Walsh, K.", jersey_number: "91" },
];

const MOCK_RSVPS: Record<string, string> = {
  m1: "yes", m2: "yes", m3: "yes", m4: "yes", m5: "yes",
  m6: "yes", m7: "yes", m8: "yes", m9: "yes", m11: "yes", m12: "yes",
  m10: "no",
  m13: "maybe",
  // m14 -> no reply
};

function fmtOffset(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function PracticeDetail({
  teamId,
  eventId,
  event,
  players,
  rsvps,
  attendance,
  onSetAttendance,
  practiceSessionId,
  currentUserId,
}: {
  teamId: string;
  eventId: string;
  event: Event;
  players: Player[];
  rsvps: Record<string, string>;
  attendance: Record<string, string>;
  onSetAttendance: (pid: string, status: "present" | "late" | "absent") => void;
  practiceSessionId: string | null;
  currentUserId: string | null;
}) {
  const useMock = players.length === 0;
  const roster = useMock ? MOCK_ROSTER : players;
  const rsvpMap = useMock ? MOCK_RSVPS : rsvps;

  const counts = { yes: 0, no: 0, maybe: 0, none: 0 };
  for (const p of roster) {
    const r = rsvpMap[p.id];
    if (r === "yes") counts.yes++;
    else if (r === "no") counts.no++;
    else if (r === "maybe") counts.maybe++;
    else counts.none++;
  }

  const plan = MOCK_PLAN;
  const totalMin = plan.blocks.reduce((s, b) => s + b.minutes, 0);
  const [notes, setNotes] = useState<string>("");

  const dateLabel = (() => {
    try {
      const d = new Date(`${event.event_date}T${event.start_time ?? "00:00"}`);
      return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    } catch { return event.event_date; }
  })();
  const endLabel = (() => {
    if (!event.start_time) return "";
    try {
      const [h, m] = event.start_time.split(":").map(Number);
      const end = new Date();
      end.setHours(h, m + 90, 0, 0);
      return end.toTimeString().slice(0, 5);
    } catch { return ""; }
  })();

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <Link to="/coach/teams/$teamId/schedule" params={{ teamId }} className="inline-flex items-center gap-1 text-xs text-teal">
        <ArrowLeft size={14} /> Schedule
      </Link>

      {/* Header card */}
      <div className="mt-2 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">PRACTICE</p>
        <h3 className="mt-1 font-display text-lg font-bold">{dateLabel}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {event.start_time ?? "—"}{endLabel ? ` – ${endLabel}` : ""} · 90 min
        </p>
        {event.venue && <p className="text-xs text-muted-foreground">{event.venue}</p>}
        <button
          onClick={() => event.venue && window.open(`https://maps.google.com/?q=${encodeURIComponent(event.venue)}`, "_blank")}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-3 py-1.5 text-[11px] font-bold text-teal"
        >
          <Navigation size={12} /> Get Directions
        </button>
      </div>

      {/* RSVP summary */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat label="YES" value={counts.yes} tone="text-emerald-400" />
        <Stat label="NO" value={counts.no} tone="text-red-400" />
        <Stat label="MAYBE" value={counts.maybe} tone="text-amber-400" />
        <Stat label="NO REPLY" value={counts.none} tone="text-muted-foreground" />
      </div>

      {/* Main buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => scrollTo("practice-plan")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow-teal"
        >
          <ClipboardList size={14} /> Practice Plan
        </button>
        <button
          onClick={() => scrollTo("attendance")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal/40 bg-teal/10 px-3 py-2 text-xs font-bold text-teal"
        >
          <Users size={14} /> Attendance
        </button>
      </div>

      {/* Attendance */}
      <h4 id="attendance" className="mt-4 text-xs font-bold">Attendance</h4>
      <div className="mt-2 space-y-2">
        {roster.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-[11px] font-bold">{p.jersey_number || "—"}</div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{p.display_name}</p>
              <p className="text-[10px] text-muted-foreground">RSVP: {rsvpMap[p.id] || "—"}</p>
            </div>
            {(["present", "late", "absent"] as const).map((s) => (
              <button
                key={s}
                onClick={() => !useMock && onSetAttendance(p.id, s)}
                className={
                  "rounded-full px-2 py-1 text-[10px] font-bold " +
                  (attendance[p.id] === s
                    ? s === "present" ? "bg-emerald-500/20 text-emerald-400"
                      : s === "late" ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                    : "bg-surface-2 text-muted-foreground")
                }
              >
                {s === "present" ? "PRESENT" : s === "late" ? "LATE" : "ABSENT"}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Practice Plan */}
      <div id="practice-plan" className="mt-6 flex items-center justify-between">
        <h4 className="text-xs font-bold">Practice Plan</h4>
        <Link
          to="/coach/teams/$teamId/schedule/$eventId/practice-plan"
          params={{ teamId, eventId }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-teal"
        >
          <Pencil size={11} /> Edit Plan
        </Link>
      </div>

      <div className="mt-2 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">FOCUS</p>
        <p className="mt-0.5 text-sm font-semibold">{plan.focus}</p>

        <div className="mt-3 space-y-2">
          {(() => {
            let offset = 0;
            return plan.blocks.map((b) => {
              const start = offset;
              offset += b.minutes;
              return (
                <div key={b.id} className="rounded-xl border border-border bg-surface-2 p-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-bold text-teal">{fmtOffset(start)}</span>
                    <span className="flex-1 text-xs font-semibold">{b.name}</span>
                    <span className="text-[10px] text-muted-foreground">{b.minutes} min</span>
                  </div>
                  {b.drills && b.drills.length > 0 && (
                    <div className="mt-1.5 ml-8 space-y-1">
                      {b.drills.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => alert(`Open drill: ${d.name}`)}
                          className="flex w-full items-baseline gap-2 rounded-lg bg-background/40 px-2 py-1 text-left"
                        >
                          <span className="text-teal">→</span>
                          <span className="flex-1 text-[11px] text-foreground">{d.name}</span>
                          <span className="text-[10px] text-muted-foreground">{d.minutes} min</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        <p className="mt-3 text-right text-[10px] text-muted-foreground">Total: {totalMin} min</p>

        {practiceSessionId && (
          <Link
            to="/session-detail/$sessionId"
            params={{ sessionId: practiceSessionId }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow-teal"
          >
            Start Session
          </Link>
        )}
      </div>

      {/* Notes */}
      <h4 className="mt-6 text-xs font-bold">Coach Notes <span className="ml-1 text-[9px] font-normal text-muted-foreground">(private)</span></h4>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes for this practice…"
        rows={3}
        className="mt-2 w-full rounded-xl border border-border bg-surface p-2.5 text-xs"
      />

      {/* Media */}
      <h4 className="mt-6 text-xs font-bold">Media</h4>
      <div className="mt-2">
        <GameMediaTab teamId={teamId} eventId={eventId} isCoach currentUserId={currentUserId} />
      </div>
    </div>
  );
}
