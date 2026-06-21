import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Calendar, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/rsvp/$token")({
  ssr: false,
  component: RsvpPage,
});

type RsvpContext = {
  id: string;
  status: "attending" | "not_attending" | "no_response";
  reason: string | null;
  responded_at: string | null;
  camp_name: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  day_number: number;
  athlete_name: string;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : "";
}

function RsvpPage() {
  const { token } = useParams({ from: "/rsvp/$token" });
  const [ctx, setCtx] = useState<RsvpContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"choose" | "reason" | "done">("choose");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [chosen, setChosen] = useState<"attending" | "not_attending" | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_rsvp_by_token", { _token: token });
      if (error || !data) { setError("This RSVP link is invalid or has expired."); setLoading(false); return; }
      const c = data as unknown as RsvpContext;
      setCtx(c);
      if (c.status !== "no_response") setView("done");
      setLoading(false);
    })();
  }, [token]);

  async function submit(status: "attending" | "not_attending", explanation?: string) {
    setSubmitting(true);
    const { error } = await supabase.rpc("respond_to_rsvp", { _token: token, _status: status, _reason: explanation ?? null });
    setSubmitting(false);
    if (error) { setError("Could not save your response. Please try again."); return; }
    setCtx((prev) => prev ? { ...prev, status, reason: explanation ?? null, responded_at: new Date().toISOString() } : prev);
    setView("done");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={20} className="animate-spin text-teal" />
      </div>
    );
  }

  if (error || !ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <p className="text-base font-semibold text-foreground">{error ?? "Not found"}</p>
          <p className="mt-2 text-xs text-muted-foreground">If you think this is wrong, contact your coach.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-10 pb-12">
      <div className="mx-auto max-w-md">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">DAILY ATTENDANCE</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">{ctx.camp_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Day {ctx.day_number}</p>

        <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Calendar size={14} className="text-teal" /> {fmtDate(ctx.session_date)}
          </p>
          {ctx.start_time && (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Clock size={14} className="text-teal" /> {fmtTime(ctx.start_time)}{ctx.end_time ? ` – ${fmtTime(ctx.end_time)}` : ""}
            </p>
          )}
          <p className="pt-1 text-[11px] text-muted-foreground">
            Is <span className="font-bold text-foreground">{ctx.athlete_name}</span> attending tomorrow?
          </p>
        </div>

        {view === "choose" && (
          <div className="mt-5 space-y-2">
            <button
              disabled={submitting}
              onClick={() => submit("attending")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal py-4 text-base font-bold text-black disabled:opacity-50"
            >
              <Check size={18} /> Attending
            </button>
            <button
              disabled={submitting}
              onClick={() => { setChosen("not_attending"); setView("reason"); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/50 bg-red-500/10 py-4 text-base font-bold text-red-400 disabled:opacity-50"
            >
              <X size={18} /> Not Attending
            </button>
          </div>
        )}

        {view === "reason" && chosen === "not_attending" && (
          <div className="mt-5 space-y-3">
            <label className="block text-xs font-semibold text-foreground">Let the coach know why <span className="text-muted-foreground">(optional)</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Feeling under the weather, schedule conflict, etc."
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setView("choose")} className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground">Back</button>
              <button
                disabled={submitting}
                onClick={() => submit("not_attending", reason.trim() || undefined)}
                className="flex-1 rounded-full bg-teal py-2 text-xs font-bold text-black disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Submit"}
              </button>
            </div>
          </div>
        )}

        {view === "done" && (
          <div className="mt-5 rounded-2xl border border-teal/40 bg-teal/5 p-5 text-center">
            <div className={"mx-auto flex h-12 w-12 items-center justify-center rounded-full " + (ctx.status === "attending" ? "bg-teal/20 text-teal" : "bg-red-500/20 text-red-400")}>
              {ctx.status === "attending" ? <Check size={22} /> : <X size={22} />}
            </div>
            <p className="mt-3 text-base font-bold text-foreground">
              {ctx.status === "attending" ? "Thanks — see you tomorrow!" : "Got it — we'll mark them absent."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your coach has been notified. You can close this page.
            </p>
            {ctx.status === "no_response" ? null : (
              <button onClick={() => { setView("choose"); setReason(""); }} className="mt-4 text-[11px] font-semibold text-teal">Change response</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}