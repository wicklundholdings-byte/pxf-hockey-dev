import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CalendarDays, MapPin, Users, MessageCircle, Info, ChevronLeft, Clock, Check, X } from "lucide-react";

export const Route = createFileRoute("/parent/camp/$campId")({
  head: () => ({ meta: [{ title: "Camp — PXF Hockey" }] }),
  component: ParentCampDetail,
});

type Tab = "schedule" | "roster" | "inbox" | "info";

function fmtDate(d: string | null) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${m} ${ampm}`;
}
function daysUntil(d: string | null) {
  if (!d) return null;
  const ms = new Date(d + "T00:00:00").getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function ParentCampDetail() {
  const { campId } = useParams({ from: "/parent/camp/$campId" });
  const { user } = useAuth();
  const [camp, setCamp] = useState<{ id: string; name: string; venue_name: string | null; address: string | null; start_date: string | null; end_date: string | null } | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; session_date: string; start_time: string | null; end_time: string | null }>>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [tab, setTab] = useState<Tab>("schedule");
  const [myRegs, setMyRegs] = useState<Array<{ id: string; athlete_name: string }>>([]);
  const [rsvps, setRsvps] = useState<Array<{ id: string; camp_session_id: string; status: string; registration_id: string }>>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("camps")
        .select("id, name, venue_name, address, start_date, end_date")
        .eq("id", campId)
        .maybeSingle();
      setCamp(c ?? null);
      const [{ data: s }, { count }] = await Promise.all([
        supabase.from("camp_sessions").select("id, session_date, start_time, end_time").eq("camp_id", campId).order("session_date"),
        supabase.from("registrations").select("id", { count: "exact", head: true }).eq("camp_id", campId).eq("status", "paid"),
      ]);
      setSessions(s ?? []);
      setRosterCount(count ?? 0);

      // Find this parent's registrations for this camp via contacts(email)
      const parentEmail = user?.email ?? "";
      if (!parentEmail) return;
      const { data: contactRows } = await supabase.from("contacts").select("id").eq("email", parentEmail);
      const contactIds = (contactRows ?? []).map((c) => c.id);
      if (!contactIds.length) return;
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, attendees(full_name)")
        .eq("camp_id", campId)
        .in("contact_id", contactIds);
      const regList = ((regs ?? []) as any[]).map((r) => ({
        id: r.id as string,
        athlete_name: r.attendees?.full_name ?? "Athlete",
      }));
      setMyRegs(regList);

      if (regList.length) {
        const { data: rsvpRows } = await supabase
          .from("daily_rsvps")
          .select("id, camp_session_id, status, registration_id")
          .eq("camp_id", campId)
          .in("registration_id", regList.map((r) => r.id));
        setRsvps((rsvpRows ?? []) as any);
      }
    })();
  }, [campId, user?.email]);

  const countdown = daysUntil(camp?.start_date ?? null);

  async function setRsvpStatus(regId: string, sessionId: string, status: "attending" | "not_attending") {
    const key = regId + ":" + sessionId;
    setSavingKey(key);
    const existing = rsvps.find((r) => r.registration_id === regId && r.camp_session_id === sessionId);
    if (existing) {
      setRsvps((prev) => prev.map((r) => (r.id === existing.id ? { ...r, status } : r)));
      await supabase
        .from("daily_rsvps")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      const { data, error } = await supabase
        .from("daily_rsvps")
        .insert({ camp_id: campId, camp_session_id: sessionId, registration_id: regId, status, responded_at: new Date().toISOString() })
        .select("id, camp_session_id, status, registration_id")
        .maybeSingle();
      if (!error && data) setRsvps((prev) => [...prev, data as any]);
    }
    setSavingKey(null);
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <Link to="/parent" className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <ChevronLeft size={14} /> Back
        </Link>
      </header>

      <div className="px-5 pt-4">
        <h1 className="font-display text-2xl font-bold">{camp?.name ?? "Loading…"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{fmtDate(camp?.start_date ?? null)}{camp?.end_date && camp.end_date !== camp.start_date ? ` – ${fmtDate(camp.end_date)}` : ""}</p>
        {countdown != null && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs font-bold text-teal">
            <CalendarDays size={12} /> {countdown === 0 ? "Camp starts today!" : `${countdown} day${countdown === 1 ? "" : "s"} until camp`}
          </div>
        )}

        {/* Sub-tabs */}
        <div className="mt-5 flex gap-1 rounded-2xl border border-border bg-card p-1">
          {(["schedule", "roster", "inbox", "info"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "flex-1 rounded-xl py-2 text-[11px] font-semibold capitalize " +
                (tab === t ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "schedule" && (
            <ul className="space-y-2">
              {sessions.length === 0 && <p className="text-xs text-muted-foreground">No sessions scheduled yet.</p>}
              {sessions.map((s, i) => {
                  <li key={s.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Day {i + 1}</p>
                        <p className="text-sm font-semibold">{fmtDate(s.session_date)}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock size={11} /> {s.start_time ? `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}` : "TBA"}
                      </span>
                    </div>
                    {myRegs.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {myRegs.map((reg) => {
                          const rsvp = rsvps.find((rs) => rs.registration_id === reg.id && rs.camp_session_id === s.id);
                          const status = rsvp?.status ?? "no_response";
                          const key = reg.id + ":" + s.id;
                          return (
                          <div key={reg.id} className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-foreground">{reg.athlete_name}</p>
                            <div className="flex gap-1">
                              <button
                                disabled={savingKey === key}
                                onClick={() => setRsvpStatus(reg.id, s.id, "attending")}
                                className={
                                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition " +
                                  (status === "attending"
                                    ? "bg-teal text-black"
                                    : "border border-border bg-surface text-muted-foreground")
                                }
                              >
                                <Check size={10} /> Going
                              </button>
                              <button
                                disabled={savingKey === key}
                                onClick={() => setRsvpStatus(reg.id, s.id, "not_attending")}
                                className={
                                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition " +
                                  (status === "not_attending"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                    : "border border-border bg-surface text-muted-foreground")
                                }
                              >
                                <X size={10} /> Not
                              </button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
              ;})}
            </ul>
          )}

          {tab === "roster" && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Users size={28} className="mx-auto text-teal" />
              <p className="mt-3 font-display text-3xl font-bold">{rosterCount}</p>
              <p className="text-xs text-muted-foreground">athletes enrolled</p>
              <p className="mt-3 text-[11px] text-muted-foreground">Names are kept private for everyone's safety.</p>
            </div>
          )}

          {tab === "inbox" && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <MessageCircle size={28} className="mx-auto text-teal" />
              <p className="mt-3 text-sm font-semibold">Message your coach</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Conversations from this camp will appear here.</p>
              <Link to="/parent/inbox" className="mt-4 inline-flex rounded-xl bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground">Open inbox</Link>
            </div>
          )}

          {tab === "info" && (
            <div className="space-y-3">
              <InfoRow icon={MapPin} title="Venue" body={camp?.venue_name ?? "TBA"} sub={camp?.address ?? undefined} />
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Info size={12} className="text-teal" /> What to bring</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>Full hockey equipment</li>
                  <li>Two water bottles</li>
                  <li>Healthy snacks</li>
                  <li>Practice jersey (light & dark)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, title, body, sub }: { icon: typeof MapPin; title: string; body: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Icon size={12} className="text-teal" /> {title}</h3>
      <p className="mt-2 text-sm font-semibold">{body}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}