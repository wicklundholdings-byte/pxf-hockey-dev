import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft, Bell, Download, CheckCircle2, Circle, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { getAssignment, MOCK_ROSTER } from "@/lib/dryland-assignments";

export const Route = createFileRoute("/dryland-progress/$assignmentId")({
  head: () => ({
    meta: [
      { title: "Program Progress — Dryland" },
      { name: "description", content: "Track athlete progress on assigned dryland programs." },
    ],
  }),
  component: DrylandProgress,
});

type Row = {
  id: string;
  jersey: number;
  name: string;
  completed: number;
  total: number;
  sessions: { title: string; date: string | null }[];
};

const DEFAULT_TOTAL = 4;

// Mock progress rows that match the spec.
const MOCK_ROWS: Row[] = [
  row("a-14", 14, "Liam Carter",     4, ["Jun 25", "Jun 27", "Jun 29", "Jul 1"]),
  row("a-9",  9,  "Jake Andersson",  3, ["Jun 28", "Jun 30", "Jul 2", null]),
  row("a-21", 21, "Owen Brooks",     2, ["Jun 28", "Jul 1", null, null]),
  row("a-17", 17, "Noah Jensen",     2, ["Jun 29", "Jul 1", null, null]),
  row("a-22", 22, "Marco Callahan",  1, ["Jun 30", null, null, null]),
  row("a-8",  8,  "Tyler Petrov",    1, ["Jul 1", null, null, null]),
  row("a-11", 11, "Marco Vella",     0, [null, null, null, null]),
  row("a-7",  7,  "Ethan Park",      0, [null, null, null, null]),
  row("a-31", 31, "Ryan Miller",     0, [null, null, null, null]),
];

function row(id: string, jersey: number, name: string, completed: number, dates: (string | null)[]): Row {
  return {
    id, jersey, name, completed, total: DEFAULT_TOTAL,
    sessions: dates.map((d, i) => ({ title: `Session ${i + 1}`, date: d })),
  };
}

function DrylandProgress() {
  const { assignmentId } = Route.useParams();
  const assignment = useMemo(() => getAssignment(assignmentId), [assignmentId]);
  const [filter, setFilter] = useState<"all" | "ontrack" | "behind" | "complete">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showReminder, setShowReminder] = useState(false);

  const programName = assignment?.programName ?? "Shooting Foundations";
  const target = assignment?.targetLabel ?? "Elite Demo Team";
  const assignedDate = assignment ? new Date(assignment.createdAt) : new Date();

  const rows = MOCK_ROWS;
  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "complete") return r.completed >= r.total;
    if (filter === "ontrack") return r.completed > 0 && r.completed < r.total && r.completed >= r.total / 2;
    if (filter === "behind") return r.completed < r.total / 2;
    return true;
  });

  const stats = {
    complete: 3,
    inProgress: 8,
    notStarted: 3,
  };

  const downloadReport = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${programName} — Progress Report</title>
<style>
body{font-family:-apple-system,Segoe UI,sans-serif;padding:32px;color:#111}
h1{margin:0 0 4px} .muted{color:#666;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:24px}
th,td{border-bottom:1px solid #eee;padding:8px 6px;text-align:left;font-size:13px}
.bar{background:#eee;height:8px;border-radius:4px;overflow:hidden;width:120px;display:inline-block;vertical-align:middle;margin-right:8px}
.fill{background:#14b8a6;height:100%}
@media print{button{display:none}}
</style></head><body>
<h1>${programName}</h1>
<div class="muted">Assigned ${assignedDate.toLocaleDateString()} · ${target}</div>
<div class="muted">Complete: ${stats.complete} · In Progress: ${stats.inProgress} · Not Started: ${stats.notStarted}</div>
<table><thead><tr><th>#</th><th>Athlete</th><th>Progress</th><th>Sessions</th></tr></thead><tbody>
${rows.map((r) => `
<tr><td>${r.jersey}</td><td>${r.name}</td>
<td><span class="bar"><span class="fill" style="width:${(r.completed / r.total) * 100}%"></span></span>${r.completed}/${r.total}</td>
<td>${r.sessions.map((s, i) => s.date ? `✓ S${i + 1} ${s.date}` : `○ S${i + 1}`).join(" · ")}</td></tr>`).join("")}
</tbody></table>
<button onclick="window.print()" style="margin-top:16px;padding:10px 16px">Save as PDF</button>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/coach/playbook" className="flex items-center gap-1 text-sm font-semibold text-teal">
          <ChevronLeft size={18} /> Dryland
        </Link>
      </div>

      <div className="px-4 pt-4">
        <h1 className="text-lg font-bold text-foreground">{programName}</h1>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Assigned {assignedDate.toLocaleDateString()} · {target}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile label="Complete" value={stats.complete} accent="teal" />
          <StatTile label="In Progress" value={stats.inProgress} accent="amber" />
          <StatTile label="Not Started" value={stats.notStarted} accent="muted" />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {([
            { id: "all", label: "All" },
            { id: "ontrack", label: "On Track" },
            { id: "behind", label: "Behind" },
            { id: "complete", label: "Complete" },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold " +
                (filter === f.id ? "bg-teal text-background" : "bg-surface text-muted-foreground")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((r) => {
            const isExpanded = expanded === r.id;
            const pct = (r.completed / r.total) * 100;
            const done = r.completed >= r.total;
            const started = r.completed > 0;
            return (
              <div key={r.id} className="rounded-2xl border border-border/60 bg-surface">
                <button
                  onClick={() => setExpanded(isExpanded ? null : r.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background text-xs font-bold text-foreground">
                    {r.jersey}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">
                      {r.completed}/{r.total}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {done ? "Complete" : started ? "sessions" : "Not started"}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-border/60 p-3">
                    <ul className="space-y-1.5">
                      {r.sessions.map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          {s.date ? (
                            <CheckCircle2 size={14} className="text-teal" />
                          ) : (
                            <Circle size={14} className="text-muted-foreground" />
                          )}
                          <span className={s.date ? "text-foreground" : "text-muted-foreground"}>
                            {s.title} · {s.date ? `Completed ${s.date}` : "Not started"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-[480px] gap-2">
          <button
            onClick={() => setShowReminder(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-teal py-2.5 text-sm font-bold text-teal"
          >
            <Bell size={14} /> Send Reminder
          </button>
          <button
            onClick={downloadReport}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-sm font-bold text-foreground"
          >
            <Download size={14} /> Download Report
          </button>
        </div>
      </div>

      {showReminder && (
        <ReminderSheet
          programName={programName}
          notStarted={rows.filter((r) => r.completed === 0)}
          onClose={() => setShowReminder(false)}
        />
      )}

      {/* Keeps MOCK_ROSTER referenced for tree-shakers when future features use it */}
      <span className="hidden">{MOCK_ROSTER.length}</span>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: "teal" | "amber" | "muted" }) {
  const color =
    accent === "teal" ? "text-teal" : accent === "amber" ? "text-amber-400" : "text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function ReminderSheet({
  programName, notStarted, onClose,
}: { programName: string; notStarted: Row[]; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(notStarted.map((r) => r.id)));
  const [msg, setMsg] = useState(`Don't forget to complete your ${programName} sessions this week!`);
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [sent, setSent] = useState(false);

  const toggle = (id: string) => setSelected((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const send = () => {
    setSent(true);
    setTimeout(onClose, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Send Reminder</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {sent ? (
          <p className="rounded-xl bg-teal/10 p-4 text-sm font-semibold text-teal">
            Reminder sent to {selected.size} athlete{selected.size === 1 ? "" : "s"} ✓
          </p>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Athletes ({selected.size} selected · pre-filtered to Not Started)
            </p>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {notStarted.length === 0 ? (
                <p className="rounded-xl bg-surface p-3 text-xs text-muted-foreground">
                  Everyone has started — nice work.
                </p>
              ) : notStarted.map((r) => {
                const on = selected.has(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left " +
                      (on ? "border-teal bg-teal/10" : "border-border bg-surface")
                    }
                  >
                    <span className="text-sm text-foreground">
                      <span className="mr-2 text-muted-foreground">#{r.jersey}</span>
                      {r.name}
                    </span>
                    {on && <CheckCircle2 size={16} className="text-teal" />}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Message
            </label>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
            />

            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Send via
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setPush((p) => !p)}
                className={
                  "flex-1 rounded-full border px-3 py-2 text-xs font-bold " +
                  (push ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")
                }
              >
                Push {push ? "✓" : ""}
              </button>
              <button
                onClick={() => setEmail((e) => !e)}
                className={
                  "flex-1 rounded-full border px-3 py-2 text-xs font-bold " +
                  (email ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")
                }
              >
                Email {email ? "✓" : ""}
              </button>
            </div>

            <button
              onClick={send}
              disabled={!selected.size || (!push && !email)}
              className="mt-5 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              Send Reminder
            </button>
          </>
        )}
      </div>
    </div>
  );
}