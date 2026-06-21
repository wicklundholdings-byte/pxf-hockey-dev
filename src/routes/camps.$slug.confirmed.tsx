import { createFileRoute, useParams, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, CalendarPlus, Download, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/camps/$slug/confirmed")({
  validateSearch: (s: Record<string, unknown>) => ({
    kind: (s.kind === "waitlisted" ? "waitlisted" : "registered") as "registered" | "waitlisted",
    amount: typeof s.amount === "string" ? parseInt(s.amount, 10) || 0 : 0,
    plan: (s.plan ?? "none") as "none" | "two" | "three",
  }),
  head: () => ({ meta: [{ title: "You're registered! — PXF Hockey" }] }),
  component: ConfirmedScreen,
});

function dollars(c: number) {
  return `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
}

function ConfirmedScreen() {
  const { slug } = useParams({ from: "/camps/$slug/confirmed" });
  const { kind, amount } = useSearch({ from: "/camps/$slug/confirmed" });
  const [camp, setCamp] = useState<{ id: string; name: string; start_date: string | null; end_date: string | null; venue_name: string | null } | null>(null);
  const [sessions, setSessions] = useState<Array<{ session_date: string; start_time: string | null; end_time: string | null }>>([]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("camps")
        .select("id, name, start_date, end_date, venue_name")
        .eq("slug", slug)
        .maybeSingle();
      setCamp(c ?? null);
      if (c) {
        const { data: s } = await supabase
          .from("camp_sessions")
          .select("session_date, start_time, end_time")
          .eq("camp_id", c.id)
          .order("session_date");
        setSessions(s ?? []);
      }
    })();
  }, [slug]);

  function downloadIcs() {
    if (!camp) return;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PXF Hockey//Camp//EN",
    ];
    for (const s of sessions) {
      const dt = s.session_date.replace(/-/g, "");
      const st = (s.start_time ?? "09:00:00").replace(/:/g, "").slice(0, 6);
      const et = (s.end_time ?? "10:00:00").replace(/:/g, "").slice(0, 6);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${dt}-${st}-${camp.id}@pxfhockey`,
        `SUMMARY:${camp.name}`,
        `DTSTART:${dt}T${st}`,
        `DTEND:${dt}T${et}`,
        camp.venue_name ? `LOCATION:${camp.venue_name}` : "",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${camp.name.replace(/\s+/g, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (kind === "waitlisted") {
    return (
      <div className="min-h-screen bg-background px-5 pt-16 text-center text-foreground">
        <div className="mx-auto max-w-[420px] space-y-4">
          <h1 className="font-display text-2xl font-bold">You're on the waitlist</h1>
          <p className="text-sm text-muted-foreground">We'll email you the moment a spot opens up.</p>
          <Link to="/" className="inline-flex rounded-xl bg-gradient-brand px-5 py-3 text-sm font-bold text-primary-foreground">Done</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-10 pb-16 text-foreground">
      <div className="mx-auto max-w-[480px] space-y-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-teal/15 shadow-glow-teal animate-in zoom-in duration-500">
          <CheckCircle2 className="h-12 w-12 text-teal" strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">You're registered!</h1>
          <p className="mt-2 text-sm text-muted-foreground">{camp?.name ?? "Your camp"}</p>
        </div>

        {camp && (
          <div className="rounded-2xl border border-border bg-card p-4 text-left">
            <SummaryRow label="Camp" value={camp.name} />
            <SummaryRow label="Dates" value={`${formatDate(camp.start_date)}${camp.end_date && camp.end_date !== camp.start_date ? ` – ${formatDate(camp.end_date)}` : ""}`} />
            {amount > 0 && <SummaryRow label="Paid" value={dollars(amount)} />}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={downloadIcs} className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface text-xs font-semibold">
            <CalendarPlus size={14} className="text-teal" /> Add to calendar
          </button>
          <button onClick={() => window.print()} className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface text-xs font-semibold">
            <Download size={14} className="text-teal" /> Download receipt
          </button>
        </div>

        <p className="rounded-xl bg-surface px-4 py-3 text-left text-xs text-muted-foreground">
          You'll receive a confirmation email and SMS shortly. Your coach will be in touch before camp starts.
        </p>

        <Link
          to="/auth"
          search={{ mode: "signup", redirect: "/parent" }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow-teal"
        >
          View in app <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
function formatDate(d: string | null) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}