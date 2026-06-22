import { useState } from "react";
import { CalendarPlus, X } from "lucide-react";

export type CalSession = {
  session_date: string;
  start_time: string | null;
  end_time: string | null;
};

export type CalCamp = {
  id: string;
  name: string;
  venue_name?: string | null;
  address?: string | null;
  description?: string | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalCompact(dateISO: string, time: string | null, fallback: string) {
  const t = (time ?? fallback).padEnd(8, "0");
  const [h, m, s] = t.split(":");
  return `${dateISO.replace(/-/g, "")}T${pad(parseInt(h ?? "9", 10))}${pad(parseInt(m ?? "0", 10))}${pad(parseInt(s ?? "0", 10))}`;
}

function buildIcs(camp: CalCamp, sessions: CalSession[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PXF Hockey//Camp//EN",
    "CALSCALE:GREGORIAN",
  ];
  const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  for (const s of sessions) {
    const dtStart = toLocalCompact(s.session_date, s.start_time, "09:00:00");
    const dtEnd = toLocalCompact(s.session_date, s.end_time, "10:00:00");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${camp.id}-${s.session_date}@pxfhockey`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcs(camp.name)}`,
      camp.address ? `LOCATION:${escapeIcs(`${camp.venue_name ? camp.venue_name + " — " : ""}${camp.address}`)}` : camp.venue_name ? `LOCATION:${escapeIcs(camp.venue_name)}` : "",
      camp.description ? `DESCRIPTION:${escapeIcs(camp.description)}` : "",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

function escapeIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function downloadIcs(camp: CalCamp, sessions: CalSession[]) {
  const ics = buildIcs(camp, sessions);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${camp.name.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function googleCalendarUrl(camp: CalCamp, s: CalSession) {
  const dtStart = toLocalCompact(s.session_date, s.start_time, "09:00:00");
  const dtEnd = toLocalCompact(s.session_date, s.end_time, "10:00:00");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: camp.name,
    dates: `${dtStart}/${dtEnd}`,
    details: camp.description ?? "",
    location: `${camp.venue_name ? camp.venue_name + " — " : ""}${camp.address ?? ""}`.trim(),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function CalendarSyncButton({
  camp,
  sessions,
  variant = "default",
}: {
  camp: CalCamp;
  sessions: CalSession[];
  variant?: "default" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const disabled = sessions.length === 0;

  function handleGoogle() {
    // Google Calendar deep links one event at a time; open the first day and
    // also download an ICS so multi-day series imports cleanly.
    if (sessions[0]) {
      window.open(googleCalendarUrl(camp, sessions[0]), "_blank", "noopener");
    }
    if (sessions.length > 1) downloadIcs(camp, sessions);
    setOpen(false);
  }
  function handleIcs() {
    downloadIcs(camp, sessions);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          variant === "compact"
            ? "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-foreground disabled:opacity-40"
            : "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-xs font-semibold text-foreground disabled:opacity-40"
        }
      >
        <CalendarPlus size={14} className="text-teal" /> Add to calendar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Add to calendar</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground"><X size={16} /></button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {sessions.length} {sessions.length === 1 ? "day" : "days"} · {camp.venue_name ?? "Location TBA"}
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={handleGoogle}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Google Calendar</p>
                  <p className="text-[10px] text-muted-foreground">Opens in browser{sessions.length > 1 ? " + downloads .ics" : ""}</p>
                </div>
                <span className="text-[10px] font-bold text-teal">OPEN</span>
              </button>
              <button
                onClick={handleIcs}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Apple Calendar (iCal)</p>
                  <p className="text-[10px] text-muted-foreground">Downloads a .ics file</p>
                </div>
                <span className="text-[10px] font-bold text-teal">DOWNLOAD</span>
              </button>
              <button
                onClick={handleIcs}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">Outlook</p>
                  <p className="text-[10px] text-muted-foreground">Downloads a .ics file</p>
                </div>
                <span className="text-[10px] font-bold text-teal">DOWNLOAD</span>
              </button>
            </div>
            <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-[10px] text-muted-foreground">
              If your coach updates the schedule, you'll get a notification — re-sync to refresh your calendar.
            </p>
          </div>
        </div>
      )}
    </>
  );
}