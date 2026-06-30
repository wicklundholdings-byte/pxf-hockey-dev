import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Calendar, Users, Clock, DollarSign, Share2, Pencil, Download, Image as ImageIcon, CheckCircle2, Circle, Search, FileText, Settings2, Tag, CreditCard, Plus, X, ListChecks, BookOpen, ListPlus, ShieldCheck, QrCode, Bell, ChevronDown, ChevronRight, ClipboardList, MessageSquare, Camera, Hourglass, Star, Wallet, Lock, PlayCircle, Check } from "lucide-react";
import { VenueMap } from "@/components/venue-map";
import { StatusBadge } from "@/components/coach/status-badge";
import { QRScannerModal } from "@/components/coach/qr-scanner";
import { ApplyCampTemplate } from "@/components/coach/apply-camp-template";
import { SessionRunner, SessionSummary, readCampCompletions, writeCampCompletion, type RunnerBlock, type RunnerSummary, type SessionRunRecord } from "@/components/session-runner";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { useHasFeature } from "@/hooks/use-tier";
import { gateMessage } from "@/lib/tiers";
import { BlockForStaff } from "@/components/block-for-staff";
import { useHasStaff } from "@/hooks/use-has-staff";

function PublishLinkButtons({ slug }: { slug: string }) {
  const { allowed } = useHasFeature("publicRegistration");
  if (!allowed) {
    return (
      <Link
        to="/coach/plans"
        className="flex flex-1 items-center justify-center gap-1 rounded-full border border-teal/40 bg-teal/10 py-2 text-[11px] font-semibold text-teal"
        title={gateMessage("publicRegistration")}
      >
        <Lock size={12} /> Upgrade to publish publicly
      </Link>
    );
  }
  return (
    <>
      <a
        href={`/camps/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-brand py-2 text-[11px] font-bold text-primary-foreground"
      >
        <Share2 size={12} /> Booking page
      </a>
      <a
        href={`/camps/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1 rounded-full border border-teal/40 bg-teal/10 px-3 py-2 text-[11px] font-semibold text-teal"
      >
        Preview as parent
      </a>
    </>
  );
}

export const Route = createFileRoute("/_authenticated/coach/camps/$campId")({
  component: () => (
    <BlockForStaff>
      <CampDetailPage />
    </BlockForStaff>
  ),
});

type Camp = {
  id: string; name: string; slug: string; status: string;
  start_date: string | null; end_date: string | null;
  start_time: string | null; end_time: string | null;
  capacity: number; price_cents: number;
  hero_image: string | null; venue_name: string | null; address: string | null;
  location_type: string; description: string | null; format: string;
  early_bird_price_cents: number | null; early_bird_expires_at: string | null;
  waiver_required: boolean; waiver_text: string | null;
  payment_plan: string; sibling_discount: boolean; sibling_discount_percent: number;
  reminder_7day?: boolean; reminder_1day?: boolean; reminder_morning?: boolean;
  absent_alert?: boolean; absent_alert_minutes?: number; confirmation_sms?: boolean;
};
type Reg = {
  id: string; camp_id: string; attendee_id: string | null; contact_id: string | null;
  status: string; amount_cents: number | null; created_at: string;
  payment_status?: "paid" | "pending" | "overdue";
  attendees?: { full_name: string | null; position: string | null; skill_level: string | null } | null;
  contacts?: { full_name: string | null; email: string | null; phone: string | null } | null;
};
type Session = { id: string; session_date: string; start_time: string | null; end_time: string | null };
type Wait = {
  id: string;
  position: number;
  status: string;
  created_at: string;
  contacts?: { full_name: string | null; email: string | null; phone: string | null } | null;
  attendees?: { full_name: string | null } | null;
};
type Media = { id: string; storage_path: string; created_at: string };

function fmt(d: string | null) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function CampDetailPage() {
  const { campId } = useParams({ from: "/_authenticated/coach/camps/$campId" });
  const [camp, setCamp] = useState<Camp | null>(null);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [wait, setWait] = useState<Wait[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState<null | "waitlist" | "media" | "evaluations" | "financials">(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFlash, setScanFlash] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Map<string, boolean>>(new Map());
  const [completions, setCompletions] = useState<Record<string, SessionRunRecord>>({});

  useEffect(() => {
    setCompletions(readCampCompletions(campId));
  }, [campId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, r, s, w, m, ps] = await Promise.all([
        supabase.from("camps").select("*").eq("id", campId).maybeSingle(),
        supabase
          .from("registrations")
          .select("*, attendees(full_name,position,skill_level), contacts(full_name,email,phone)")
          .eq("camp_id", campId)
          .order("created_at", { ascending: false }),
        supabase.from("camp_sessions").select("*").eq("camp_id", campId).order("session_date"),
        supabase
          .from("waitlist_entries")
          .select("*, contacts(full_name,email,phone), attendees(full_name)")
          .eq("camp_id", campId)
          .order("position"),
        supabase.from("camp_media").select("*").eq("camp_id", campId).order("created_at", { ascending: false }),
        (supabase as any).from("attendee_payment_status").select("registration_id, payment_status").eq("camp_id", campId),
      ]);
      const campRow = (c.data ?? null) as Camp | null;
      setCamp(campRow);
      const statusMap = new Map<string, "paid" | "pending" | "overdue">();
      ((ps as { data: { registration_id: string; payment_status: "paid" | "pending" | "overdue" }[] | null }).data ?? []).forEach((row) => {
        statusMap.set(row.registration_id, row.payment_status);
      });
      const regsWithPay = ((r.data ?? []) as unknown as Reg[]).map((reg: any) => ({ ...reg, payment_status: statusMap.get(reg.id) ?? reg.status }));
      setRegs(regsWithPay as unknown as Reg[]);
      let sess = (s.data ?? []) as Session[];
      // Backfill: if no camp_sessions exist but the camp has a date range, create one per day.
      if (sess.length === 0 && campRow?.start_date && campRow?.end_date) {
        const rows: { camp_id: string; session_date: string; start_time: string | null; end_time: string | null; sort_order: number }[] = [];
        const start = new Date(campRow.start_date + "T00:00:00");
        const end = new Date(campRow.end_date + "T00:00:00");
        let i = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          rows.push({
            camp_id: campRow.id,
            session_date: d.toISOString().slice(0, 10),
            start_time: campRow.start_time,
            end_time: campRow.end_time,
            sort_order: i++,
          });
        }
        if (rows.length > 0) {
          const { data: inserted } = await supabase
            .from("camp_sessions")
            .insert(rows)
            .select("*");
          if (inserted) sess = inserted as Session[];
        }
      }
      setSessions(sess);
      setWait((w.data ?? []) as unknown as Wait[]);
      setMedia((m.data ?? []) as Media[]);
      setLoading(false);
    })();
  }, [campId]);

  const stats = useMemo(() => {
    const paid = regs.filter((r) => r.status === "paid");
    const revenue = paid.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
    return { paid: paid.length, revenue, pending: regs.filter((r) => r.status === "pending").length };
  }, [regs]);

  const todaySession = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return sessions.find((s) => s.session_date === today) ?? null;
  }, [sessions]);

  useEffect(() => {
    if (!todaySession) return;
    supabase
      .from("attendance")
      .select("registration_id,present")
      .eq("session_id", todaySession.id)
      .then(({ data }) => {
        const m = new Map<string, boolean>();
        (data ?? []).forEach((r: { registration_id: string; present: boolean }) => m.set(r.registration_id, r.present));
        setTodayAttendance(m);
      });
  }, [todaySession]);

  if (loading) return <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>;
  if (!camp) return (
    <div className="py-10 text-center">
      <p className="text-sm text-muted-foreground">Camp not found.</p>
      <Link to="/coach/camps" className="mt-3 inline-flex items-center gap-1 text-xs text-teal">
        <ArrowLeft size={12} /> Back to events
      </Link>
    </div>
  );

  const pct = camp.capacity ? Math.min(100, (stats.paid / camp.capacity) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const isLive = !!(camp.start_date && camp.end_date && camp.start_date <= today && today <= camp.end_date);
  const paidRegs = regs.filter((r) => r.status === "paid");
  const todayAttending = paidRegs.filter((r) => todayAttendance.get(r.id) === true).length;
  const todayNotAttending = paidRegs.filter((r) => todayAttendance.get(r.id) === false).length;
  const todayNoResponse = paidRegs.length - todayAttending - todayNotAttending;

  function handleScan(text: string) {
    setScannerOpen(false);
    const id = text.trim();
    const reg = regs.find((r) => r.id === id || r.id.startsWith(id) || id.includes(r.id));
    if (!reg || !todaySession) {
      setScanFlash("✗ Unknown QR code");
      setTimeout(() => setScanFlash(null), 2500);
      return;
    }
    const m = new Map(todayAttendance);
    m.set(reg.id, true);
    setTodayAttendance(m);
    supabase.from("attendance").upsert(
      { registration_id: reg.id, session_id: todaySession.id, present: true, marked_at: new Date().toISOString(), method: "qr" },
      { onConflict: "registration_id,session_id" },
    );
    const name = reg.attendees?.full_name ?? reg.contacts?.full_name ?? "Attendee";
    setScanFlash(`✓ ${name} checked in`);
    setTimeout(() => setScanFlash(null), 2500);
  }

  return (
    <div className="space-y-4">
      <Link to="/coach/camps" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> All events
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {camp.hero_image ? (
          <div className="relative h-32 w-full">
            <img src={camp.hero_image} alt={camp.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
        ) : (
          <div className="h-20 w-full bg-gradient-to-br from-teal/20 to-transparent" />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold text-foreground">{camp.name}</h1>
                {isLive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Live
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin size={11} /> {camp.venue_name ?? (camp.location_type === "online" ? "Online" : "TBA")}
                {camp.address ? <span className="text-muted-foreground/70"> · {camp.address}</span> : null}
              </p>
            </div>
            <StatusBadge status={camp.status} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Info icon={Calendar} label="Dates" value={`${fmt(camp.start_date)} → ${fmt(camp.end_date)}`} />
            <Info icon={Clock} label="Time" value={camp.start_time ? `${camp.start_time.slice(0, 5)}–${camp.end_time?.slice(0, 5) ?? ""}` : "TBA"} />
            <Info icon={Users} label="Capacity" value={`${stats.paid}/${camp.capacity}`} />
            <Info icon={DollarSign} label="Price" value={`$${(camp.price_cents / 100).toFixed(0)}`} />
          </div>

          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-teal" style={{ width: pct + "%" }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{Math.round(pct)}% full · {camp.capacity - stats.paid} spots left</p>
          </div>

          <div className="mt-3 flex gap-2">
            <PublishLinkButtons slug={camp.slug} />
            <button className="flex items-center justify-center gap-1 rounded-full border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-foreground">
              <Pencil size={12} /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Paid" value={String(stats.paid)} tone="green" />
        <Stat label="Pending" value={String(stats.pending)} tone="amber" />
        <Stat label="Revenue" value={`$${(stats.revenue / 100).toLocaleString()}`} tone="teal" />
      </div>

      {(camp.venue_name || camp.address) && camp.location_type !== "online" && (
        <VenueMap venueName={camp.venue_name} address={camp.address} />
      )}

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/coach/camps/$campId/session-plans"
          params={{ campId }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-4 text-sm font-bold text-primary-foreground"
        >
          <ClipboardList size={16} /> Session Plans
        </Link>
        <Link
          to="/coach/broadcast"
          search={{ campId } as never}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-4 text-sm font-bold text-primary-foreground"
        >
          <MessageSquare size={16} /> Message Group
        </Link>
      </div>

      <CampStaffSection campId={campId} />

      {/* Quick links to dedicated sub-routes */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          to="/coach/camps/$campId/checkin"
          params={{ campId }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 text-[11px] font-semibold text-foreground hover:border-teal/40"
        >
          <QrCode size={16} className="text-teal" /> Check-in
        </Link>
        <Link
          to="/coach/camps/$campId/attendance"
          params={{ campId }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 text-[11px] font-semibold text-foreground hover:border-teal/40"
        >
          <ClipboardList size={16} className="text-teal" /> Attendance
        </Link>
        <Link
          to="/coach/camps/$campId/photos"
          params={{ campId }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 text-[11px] font-semibold text-foreground hover:border-teal/40"
        >
          <Camera size={16} className="text-teal" /> Photos
        </Link>
        <Link
          to="/coach/camps/$campId/updates"
          params={{ campId }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 text-[11px] font-semibold text-foreground hover:border-teal/40"
        >
          <Bell size={16} className="text-teal" /> Updates
        </Link>
      </div>

      {/* Visual camp schedule */}
      <section id="session-plans" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Camp schedule</h2>
          <span className="text-[10px] text-muted-foreground">{sessions.length} {sessions.length === 1 ? "day" : "days"}</span>
        </div>
        <CampProgress sessions={sessions} completions={completions} />
        <CampSchedule
          sessions={sessions}
          campId={campId}
          completions={completions}
          registeredCount={regs.filter((r) => r.status === "paid").length}
          onSessionsChange={(next) => setSessions(next)}
          onCompleted={(sessionId, rec) => {
            writeCampCompletion(campId, sessionId, rec);
            setCompletions((prev) => ({ ...prev, [sessionId]: rec }));
          }}
        />
      </section>

      {/* Roster + Today's RSVP */}
      <div className="grid grid-cols-2 gap-2">
        <RosterCard regs={regs} />
        <TodayRsvpCard
          attending={todayAttending}
          notAttending={todayNotAttending}
          noResponse={todayNoResponse}
          hasSession={!!todaySession}
          campId={campId}
        />
      </div>

      {/* QR check-in */}
      <button
        onClick={() => setScannerOpen(true)}
        disabled={!todaySession || paidRegs.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-teal/40 bg-card py-3 text-sm font-bold text-teal disabled:opacity-40"
      >
        <Camera size={16} /> Start Check-in
      </button>
      {scanFlash && (
        <div className="rounded-xl border border-border bg-surface px-3 py-2 text-center text-xs font-semibold text-foreground">
          {scanFlash}
        </div>
      )}

      {/* More section */}
      <section className="space-y-2 pt-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-foreground">More</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <MoreRow icon={Hourglass} label="Waitlist" count={wait.length} open={more === "waitlist"} onClick={() => setMore(more === "waitlist" ? null : "waitlist")} />
          {more === "waitlist" && <div className="border-t border-border p-3"><WaitlistTab entries={wait} /></div>}
          <MoreRow icon={ImageIcon} label="Media" count={media.length} open={more === "media"} onClick={() => setMore(more === "media" ? null : "media")} />
          {more === "media" && <div className="border-t border-border p-3"><MediaTab media={media} /></div>}
          <MoreRow icon={Star} label="Evaluations" count={regs.length} open={more === "evaluations"} onClick={() => setMore(more === "evaluations" ? null : "evaluations")} />
          {more === "evaluations" && <div className="border-t border-border p-3"><EvaluationsTab regs={regs} campId={campId} /></div>}
          <MoreRow icon={Wallet} label="Financials" count={stats.paid} open={more === "financials"} onClick={() => setMore(more === "financials" ? null : "financials")} last />
          {more === "financials" && <div className="border-t border-border p-3"><FinancialsPanel regs={regs} /></div>}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <details className="overflow-hidden rounded-2xl border border-border bg-card">
            <summary className="cursor-pointer list-none px-3 py-3 text-[11px] font-semibold text-foreground">Description & details</summary>
            <div className="border-t border-border p-3"><OverviewTab camp={camp} /></div>
          </details>
          <details className="overflow-hidden rounded-2xl border border-border bg-card">
            <summary className="cursor-pointer list-none px-3 py-3 text-[11px] font-semibold text-foreground">Settings & pricing</summary>
            <div className="border-t border-border p-3"><OptionsTab camp={camp} /></div>
          </details>
        </div>
      </section>

      {scannerOpen && (
        <QRScannerModal onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  );
}

function MoreRow({ icon: Icon, label, count, open, onClick, last }: { icon: typeof Calendar; label: string; count?: number; open: boolean; onClick: () => void; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={"flex w-full items-center gap-3 px-3 py-3 text-left " + (last ? "" : "border-b border-border")}
    >
      <Icon size={16} className="text-muted-foreground" />
      <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
      {typeof count === "number" && (
        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{count}</span>
      )}
      {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
    </button>
  );
}

function CampProgress({ sessions, completions }: { sessions: Session[]; completions: Record<string, SessionRunRecord> }) {
  if (sessions.length === 0) return null;
  const completedCount = sessions.filter((s) => completions[s.id]).length;
  const pct = (completedCount / sessions.length) * 100;
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-foreground">
          Day {completedCount} of {sessions.length} complete
        </p>
        <p className="text-[10px] text-muted-foreground">{Math.round(pct)}%</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-teal transition-all" style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

function formatDur(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CampSchedule({
  sessions,
  campId,
  completions,
  onCompleted,
  registeredCount,
  onSessionsChange,
}: {
  sessions: Session[];
  campId: string;
  completions: Record<string, SessionRunRecord>;
  onCompleted: (sessionId: string, rec: SessionRunRecord) => void;
  registeredCount: number;
  onSessionsChange: (next: Session[]) => void;
}) {
  const planKey = `pxf:camp-plans:${campId}`;
  const [library, setLibrary] = useState<SavedSession[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [runningSessionId, setRunningSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ sessionId: string; rec: SessionRunRecord } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Session | null>(null);

  useEffect(() => {
    setLibrary(readSavedSessions());
    try {
      const raw = window.localStorage.getItem(planKey);
      if (raw) setAssignments(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [planKey]);

  function assign(sessionId: string, savedId: string | null) {
    const next = { ...assignments };
    if (savedId) next[sessionId] = savedId;
    else delete next[sessionId];
    setAssignments(next);
    window.localStorage.setItem(planKey, JSON.stringify(next));
    setPickerFor(null);
  }

  function notifyParents(message: string) {
    if (registeredCount > 0) {
      toast.success(`Schedule updated — push + SMS sent to ${registeredCount} registered ${registeredCount === 1 ? "parent" : "parents"}.`, { description: message });
    } else {
      toast.success("Schedule updated.", { description: message });
    }
  }

  async function updateDay(s: Session, patch: Partial<Session>) {
    const next = sessions.map((x) => (x.id === s.id ? { ...x, ...patch } : x)).sort((a, b) => a.session_date.localeCompare(b.session_date));
    onSessionsChange(next);
    const { error } = await supabase.from("camp_sessions").update(patch).eq("id", s.id);
    if (error) { toast.error("Couldn't save day change"); return; }
    notifyParents(`${new Date((patch.session_date ?? s.session_date) + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`);
  }

  async function deleteDay(s: Session) {
    const next = sessions.filter((x) => x.id !== s.id);
    onSessionsChange(next);
    setConfirmDelete(null);
    const { error } = await supabase.from("camp_sessions").delete().eq("id", s.id);
    if (error) { toast.error("Couldn't delete day"); return; }
    if (assignments[s.id]) assign(s.id, null);
    notifyParents(`Day removed: ${new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`);
  }

  async function addDay() {
    const last = sessions[sessions.length - 1];
    const baseDate = last ? new Date(last.session_date + "T00:00:00") : new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    const newDate = baseDate.toISOString().slice(0, 10);
    const payload = {
      camp_id: campId,
      session_date: newDate,
      start_time: last?.start_time ?? "09:00:00",
      end_time: last?.end_time ?? "10:00:00",
      sort_order: sessions.length,
    };
    const { data, error } = await supabase.from("camp_sessions").insert(payload).select("id, session_date, start_time, end_time").maybeSingle();
    if (error || !data) { toast.error("Couldn't add day"); return; }
    onSessionsChange([...sessions, data as Session]);
    notifyParents(`New day added: ${new Date(newDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`);
  }

  async function swapDays(i: number, j: number) {
    if (i < 0 || j < 0 || i >= sessions.length || j >= sessions.length) return;
    const a = sessions[i]; const b = sessions[j];
    // Swap dates so order changes.
    const aDate = a.session_date; const bDate = b.session_date;
    const next = sessions.map((x) => x.id === a.id ? { ...x, session_date: bDate } : x.id === b.id ? { ...x, session_date: aDate } : x).sort((x, y) => x.session_date.localeCompare(y.session_date));
    onSessionsChange(next);
    await Promise.all([
      supabase.from("camp_sessions").update({ session_date: bDate }).eq("id", a.id),
      supabase.from("camp_sessions").update({ session_date: aDate }).eq("id", b.id),
    ]);
    notifyParents("Camp days reordered.");
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        <p>No camp days scheduled yet.</p>
        <button onClick={addDay} className="mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
          <Plus size={12} /> Add first day
        </button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  // Active = earliest non-completed session whose date <= today.
  const activeSessionId = sessions.find(
    (s) => !completions[s.id] && s.session_date <= today,
  )?.id ?? null;

  function stateFor(s: Session): "completed" | "active" | "upcoming" {
    if (completions[s.id]) return "completed";
    if (s.id === activeSessionId) return "active";
    return "upcoming";
  }

  // Default expanded = active session.
  const effectiveExpanded = expanded ?? activeSessionId ?? sessions[0]?.id ?? null;
  const expandedSession = sessions.find((s) => s.id === effectiveExpanded) ?? null;
  const expandedAssigned = expandedSession ? library.find((l) => l.id === assignments[expandedSession.id]) : null;
  const expandedState = expandedSession ? stateFor(expandedSession) : null;
  const expandedCompletion = expandedSession ? completions[expandedSession.id] : null;
  const expandedBlocks = ((expandedAssigned?.blocks ?? []) as RunnerBlock[]).filter((b) => b && b.drillId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => { setEditMode((v) => !v); setEditingDay(null); }}
          className={"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition " + (editMode ? "border-teal bg-teal/15 text-teal" : "border-border bg-surface text-muted-foreground")}
        >
          <Pencil size={10} /> {editMode ? "Done" : "Edit days"}
        </button>
      </div>
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {sessions.map((s, i) => {
            const assignedId = assignments[s.id];
            const assigned = library.find((l) => l.id === assignedId);
            const state = stateFor(s);
            const isOpen = effectiveExpanded === s.id;
            const date = new Date(s.session_date + "T00:00:00");
            const baseBorder =
              state === "completed"
                ? "border-emerald-400/50 bg-emerald-400/10"
                : state === "active"
                ? "border-teal bg-teal/10"
                : "border-border bg-card opacity-60";
            const ringIfOpen = isOpen ? " ring-2 ring-teal/60" : "";
            if (editMode) {
              const isEditing = editingDay === s.id;
              return (
                <div key={s.id} className={"relative flex w-40 shrink-0 flex-col gap-1.5 rounded-2xl border border-teal/40 bg-card p-3 text-left"}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Day {i + 1}</p>
                    <button
                      onClick={() => setConfirmDelete(s)}
                      className="rounded-full bg-red-500/15 p-1 text-red-400"
                      aria-label="Delete day"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="date"
                        value={s.session_date}
                        onChange={(e) => updateDay(s, { session_date: e.target.value })}
                        className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-foreground"
                      />
                      <div className="flex gap-1">
                        <input
                          type="time"
                          value={(s.start_time ?? "09:00:00").slice(0, 5)}
                          onChange={(e) => updateDay(s, { start_time: e.target.value + ":00" })}
                          className="w-full rounded-lg border border-border bg-surface px-1.5 py-1 text-[10px] text-foreground"
                        />
                        <input
                          type="time"
                          value={(s.end_time ?? "10:00:00").slice(0, 5)}
                          onChange={(e) => updateDay(s, { end_time: e.target.value + ":00" })}
                          className="w-full rounded-lg border border-border bg-surface px-1.5 py-1 text-[10px] text-foreground"
                        />
                      </div>
                      <button onClick={() => setEditingDay(null)} className="w-full rounded-lg bg-gradient-brand py-1 text-[10px] font-bold text-primary-foreground">Done</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingDay(s.id)} className="text-left">
                      <p className="font-display text-xl font-bold text-foreground leading-none">{date.getDate()}</p>
                      <p className="text-[10px] text-muted-foreground">{date.toLocaleDateString("en-US", { weekday: "short", month: "short" })}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {(s.start_time ?? "09:00").slice(0, 5)} – {(s.end_time ?? "10:00").slice(0, 5)}
                      </p>
                    </button>
                  )}
                  <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5">
                    <button disabled={i === 0} onClick={() => swapDays(i, i - 1)} className="rounded-full p-1 text-muted-foreground disabled:opacity-30">
                      <ArrowUp size={12} />
                    </button>
                    <button disabled={i === sessions.length - 1} onClick={() => swapDays(i, i + 1)} className="rounded-full p-1 text-muted-foreground disabled:opacity-30">
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={s.id}
                onClick={() => setExpanded(isOpen ? null : s.id)}
                className={
                  "relative flex w-32 shrink-0 flex-col gap-1 rounded-2xl border p-3 text-left transition-colors " +
                  baseBorder + ringIfOpen
                }
              >
                <div className="flex items-center justify-between">
                  <p className={"text-[10px] font-bold uppercase tracking-wider " + (state === "completed" ? "text-emerald-400" : state === "active" ? "text-teal" : "text-muted-foreground")}>
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  {state === "completed" && <Check size={12} className="text-emerald-400" />}
                  {state === "active" && <PlayCircle size={12} className="text-teal" />}
                  {state === "upcoming" && <Lock size={11} className="text-muted-foreground" />}
                </div>
                <p className="font-display text-2xl font-bold text-foreground leading-none">
                  {date.getDate()}
                </p>
                <p className="text-[10px] text-muted-foreground">Day {i + 1}</p>
                <p className={"mt-1 truncate text-[11px] font-semibold " + (assigned ? "text-foreground" : "text-muted-foreground/70")}>
                  {assigned ? assigned.name : "No session yet"}
                </p>
              </button>
            );
          })}
          {editMode && (
            <button
              onClick={addDay}
              className="flex w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-teal/50 bg-teal/5 p-3 text-teal"
            >
              <Plus size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Add day</span>
            </button>
          )}
        </div>
      </div>

      {expandedSession && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {new Date(expandedSession.session_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <p className="text-sm font-semibold text-foreground">{expandedAssigned?.name ?? "No session assigned"}</p>
            </div>
            {expandedState !== "completed" && (
              <button
                onClick={() => setPickerFor(expandedSession.id)}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-foreground"
              >
                {expandedAssigned ? "Change" : "Assign"}
              </button>
            )}
          </div>

          {expandedState === "completed" && expandedCompletion ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-emerald-400">Session complete</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(expandedCompletion.completedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="font-display text-lg font-bold text-foreground">{formatDur(expandedCompletion.totalSeconds)}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total time</p>
                </div>
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="font-display text-lg font-bold text-foreground">
                    {expandedCompletion.drillsCompleted}/{expandedCompletion.totalDrills}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Drills run</p>
                </div>
              </div>
              {expandedAssigned && expandedBlocks.length > 0 && (
                <ul className="space-y-1">
                  {expandedBlocks.map((b, idx) => (
                    <li key={b.uid ?? idx} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
                      <span className="font-semibold text-foreground">Drill {idx + 1}</span>
                      <span className="text-[10px] text-muted-foreground">{b.mins} min</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : expandedAssigned ? (
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] text-muted-foreground">
                {expandedAssigned.blocks?.length ?? 0} drills · {expandedAssigned.totalMins ?? 0} min
              </p>
              {expandedAssigned.blocks && expandedAssigned.blocks.length > 0 ? (
                <ul className="space-y-1">
                  {(expandedAssigned.blocks as Array<{ name?: string; title?: string; minutes?: number }>).map((b, idx) => (
                    <li key={idx} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
                      <span className="font-semibold text-foreground">{b.name ?? b.title ?? `Drill ${idx + 1}`}</span>
                      {typeof b.minutes === "number" && (
                        <span className="text-[10px] text-muted-foreground">{b.minutes} min</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-surface p-3 text-center text-[10px] text-muted-foreground">
                  Session has no drills yet.
                </p>
              )}
              {expandedState === "active" && expandedBlocks.length > 0 && (
                <button
                  onClick={() => setRunningSessionId(expandedSession.id)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-4 text-sm font-bold text-primary-foreground shadow-glow-teal"
                >
                  <PlayCircle size={18} /> Start Session
                </button>
              )}
              {expandedState === "upcoming" && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-3 text-[11px] text-muted-foreground">
                  <Lock size={12} /> Available on {new Date(expandedSession.session_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setPickerFor(expandedSession.id)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-teal/40 hover:text-teal"
            >
              <Plus size={12} /> Assign from Library
            </button>
          )}
        </div>
      )}

      <ApplyCampTemplate
        campSessions={sessions.map((s) => ({ id: s.id }))}
        planKey={planKey}
        onApplied={() => {
          try {
            const raw = window.localStorage.getItem(planKey);
            if (raw) setAssignments(JSON.parse(raw));
            setLibrary(readSavedSessions());
          } catch { /* ignore */ }
        }}
      />

      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setPickerFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Pick a saved session</h3>
              <button onClick={() => setPickerFor(null)} className="text-muted-foreground"><X size={14} /></button>
            </div>
            {library.length === 0 ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-xs text-muted-foreground">No saved sessions yet.</p>
                <Link to="/drill-builder" className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-4 py-1.5 text-[11px] font-bold text-primary-foreground">
                  <Plus size={12} /> Build one now
                </Link>
              </div>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {library.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => assign(pickerFor, l.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left hover:border-teal/40"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{l.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {l.blocks?.length ?? 0} drills · {l.totalMins ?? 0} min
                        </p>
                      </div>
                      <Plus size={14} className="text-teal" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {runningSessionId && (() => {
        const s = sessions.find((x) => x.id === runningSessionId);
        const assigned = s ? library.find((l) => l.id === assignments[s.id]) : null;
        const blocks = ((assigned?.blocks ?? []) as RunnerBlock[]).filter((b) => b && b.drillId);
        if (!s || !assigned) return null;
        return (
          <SessionRunner
            title={assigned.name}
            blocks={blocks}
            onClose={() => setRunningSessionId(null)}
            onComplete={(rec: RunnerSummary) => {
              setSummary({ sessionId: s.id, rec });
              setRunningSessionId(null);
            }}
          />
        );
      })()}

      {summary && (() => {
        const s = sessions.find((x) => x.id === summary.sessionId);
        const assigned = s ? library.find((l) => l.id === assignments[s.id]) : null;
        return (
          <SessionSummary
            title={assigned?.name ?? "Session"}
            summary={summary.rec}
            onDone={() => {
              onCompleted(summary.sessionId, summary.rec);
              const idx = sessions.findIndex((x) => x.id === summary.sessionId);
              const next = sessions[idx + 1];
              setExpanded(next ? next.id : null);
              setSummary(null);
            }}
          />
        );
      })()}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-bold text-foreground">Delete this day?</h3>
            {assignments[confirmDelete.id] && (
              <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-300">
                ⚠️ This day has a session plan attached. Deleting it will remove the session assignment.
              </p>
            )}
            {registeredCount > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {registeredCount} registered {registeredCount === 1 ? "parent" : "parents"} will be notified by push + SMS.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-border bg-surface py-2 text-xs font-semibold text-foreground">Cancel</button>
              <button onClick={() => deleteDay(confirmDelete)} className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-bold text-white">Delete day</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CampStaffSection({ campId }: { campId: string }) {
  type TM = { id: string; email: string; title: string; permission_level: "owner" | "coach" | "assistant"; status: string };
  const [team, setTeam] = useState<TM[]>([]);
  const [assigned, setAssigned] = useState<Array<{ id: string; team_member_id: string }>>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from("team_members").select("id, email, title, permission_level, status").eq("owner_id", u.user.id),
        (supabase as any).from("camp_staff").select("id, team_member_id").eq("camp_id", campId),
      ]);
      setTeam((t ?? []) as TM[]);
      setAssigned((a ?? []) as Array<{ id: string; team_member_id: string }>);
    })();
  }, [campId]);

  async function toggle(memberId: string) {
    const existing = assigned.find((x) => x.team_member_id === memberId);
    if (existing) {
      setAssigned((p) => p.filter((x) => x.id !== existing.id));
      await (supabase as any).from("camp_staff").delete().eq("id", existing.id);
    } else {
      const { data } = await (supabase as any)
        .from("camp_staff")
        .insert({ camp_id: campId, team_member_id: memberId })
        .select("id, team_member_id")
        .maybeSingle();
      if (data) setAssigned((p) => [...p, data]);
    }
  }

  const assignedTeam = team.filter((m) => assigned.some((a) => a.team_member_id === m.id));
  const unassignedTeam = team.filter((m) => !assigned.some((a) => a.team_member_id === m.id));

  return (
    <section className="rounded-2xl border border-teal/30 bg-teal/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Staff</h2>
          {assignedTeam.length > 0 && (
            <span className="rounded-full bg-teal/20 px-2 py-0.5 text-[10px] font-bold text-teal">
              {assignedTeam.length}
            </span>
          )}
        </div>
        <button onClick={() => setPicking((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-foreground">
          <Plus size={10} /> {picking ? "Done" : "Assign Staff"}
        </button>
      </div>

      {assignedTeam.length === 0 && !picking && (
        <button onClick={() => setPicking(true)} className="mt-3 w-full rounded-2xl border border-dashed border-border bg-card p-4 text-center text-[11px] font-semibold text-muted-foreground">
          No staff assigned yet. Tap to assign a coach.
        </button>
      )}

      {assignedTeam.length > 0 && !picking && (
        <ul className="mt-3 space-y-2">
          {assignedTeam.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">{m.email.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.permission_level}</span>
              <button
                onClick={() => toggle(m.id)}
                title="Remove from camp"
                className="ml-1 rounded-full bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/25"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {picking && (
        <div className="mt-3 space-y-2">
          {assignedTeam.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned</p>
              {assignedTeam.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-teal bg-teal/10 px-3 py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-card text-[11px] font-bold text-foreground">{m.email.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.email} · {m.permission_level}</p>
                  </div>
                  <button onClick={() => toggle(m.id)} className="rounded-full bg-destructive/15 px-3 py-1.5 text-[10px] font-bold text-destructive">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {unassignedTeam.length > 0 && (
            <div className="space-y-2">
              {assignedTeam.length > 0 && <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available</p>}
              {unassignedTeam.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-surface text-[11px] font-bold text-foreground">{m.email.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.email} · {m.permission_level}</p>
                  </div>
                  <button onClick={() => toggle(m.id)} className="rounded-full bg-gradient-brand px-3 py-1.5 text-[10px] font-bold text-primary-foreground">
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
          {team.length === 0 && (
            <p className="py-3 text-center text-[11px] text-muted-foreground">
              No team members yet. Invite some from Settings → My Team.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function RosterCard({ regs }: { regs: Reg[] }) {
  const visible = regs.slice(0, 5);
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Roster</p>
        <Users size={12} className="text-muted-foreground" />
      </div>
      <p className="mt-1 font-display text-xl font-bold text-foreground">{regs.length}</p>
      <p className="text-[10px] text-muted-foreground">registered</p>
      {visible.length > 0 && (
        <div className="mt-2 flex -space-x-2">
          {visible.map((r) => {
            const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "?";
            const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={r.id} className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-teal/15 text-[10px] font-bold text-teal">
                {initials}
              </div>
            );
          })}
          {regs.length > visible.length && (
            <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-surface text-[9px] font-bold text-muted-foreground">
              +{regs.length - visible.length}
            </div>
          )}
        </div>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer list-none text-[11px] font-semibold text-teal">View All</summary>
        <div className="mt-2"><RosterTab regs={regs} /></div>
      </details>
    </div>
  );
}

function TodayRsvpCard({ attending, notAttending, noResponse, hasSession, campId: _campId }: { attending: number; notAttending: number; noResponse: number; hasSession: boolean; campId: string }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today's RSVP</p>
        <Bell size={12} className="text-muted-foreground" />
      </div>
      {hasSession ? (
        <div className="mt-2 space-y-1">
          <RsvpRow color="bg-emerald-400" label="Attending" value={attending} />
          <RsvpRow color="bg-red-400" label="Not Attending" value={notAttending} />
          <RsvpRow color="bg-muted-foreground" label="No Response" value={noResponse} />
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">No session today.</p>
      )}
      <button
        onClick={() => setSent(true)}
        disabled={!hasSession || noResponse === 0}
        className={"mt-3 w-full rounded-full px-3 py-1.5 text-[10px] font-bold disabled:opacity-40 " + (sent ? "bg-emerald-400/15 text-emerald-400" : "bg-gradient-brand text-primary-foreground")}
      >
        {sent ? "Sent ✓" : "Send Reminder"}
      </button>
    </div>
  );
}

function RsvpRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={"h-2 w-2 rounded-full " + color} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function FinancialsPanel({ regs }: { regs: Reg[] }) {
  const paid = regs.filter((r) => r.status === "paid");
  const pending = regs.filter((r) => r.status === "pending");
  const refunded = regs.filter((r) => r.status === "refunded");
  const revenue = paid.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
  const outstanding = pending.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-surface p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Collected</p>
          <p className="font-display text-lg font-bold text-emerald-400">${(revenue / 100).toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-surface p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Outstanding</p>
          <p className="font-display text-lg font-bold text-amber-400">${(outstanding / 100).toLocaleString()}</p>
        </div>
      </div>
      <div className="rounded-xl bg-surface p-3 text-xs">
        <Row k="Paid registrations" v={String(paid.length)} />
        <Row k="Pending" v={String(pending.length)} />
        <Row k="Refunded" v={String(refunded.length)} />
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface p-2.5">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Icon size={10} /> {label}
      </p>
      <p className="mt-1 text-[12px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "teal" }) {
  const color = tone === "green" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-teal";
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <p className={"font-display text-lg font-bold " + color}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function OverviewTab({ camp }: { camp: Camp }) {
  return (
    <div className="space-y-3">
      <Section title="Description">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {camp.description ?? "No description added yet."}
        </p>
      </Section>
      {camp.early_bird_price_cents && (
        <Section title="Pricing">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Standard</span>
            <span className="font-semibold text-foreground">${(camp.price_cents / 100).toFixed(0)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Early bird</span>
            <span className="font-semibold text-emerald-400">${(camp.early_bird_price_cents / 100).toFixed(0)}</span>
          </div>
          {camp.early_bird_expires_at && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Ends {new Date(camp.early_bird_expires_at).toLocaleDateString()}
            </p>
          )}
        </Section>
      )}
      <Section title="Format & Location">
        <Row k="Format" v={camp.format} />
        <Row k="Location type" v={camp.location_type} />
        <Row k="Slug" v={`/${camp.slug}`} />
      </Section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 text-xs last:border-b-0">
      <span className="capitalize text-muted-foreground">{k}</span>
      <span className="font-semibold text-foreground">{v}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function RosterTab({ regs }: { regs: Reg[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const filtered = regs.filter((r) => {
    const ps = r.payment_status ?? (r.status === "paid" ? "paid" : "pending");
    if (filter !== "all" && ps !== filter) return false;
    if (!q) return true;
    const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "";
    return name.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search registrants…"
            className="w-full rounded-full border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
          />
        </div>
        <button className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-semibold text-muted-foreground">
          <Download size={11} /> CSV
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "paid", "pending", "overdue"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full border px-3 py-1 text-[10px] font-semibold capitalize " +
              (filter === f ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No registrations yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "Unknown";
            const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    {(() => {
                      const ps = r.payment_status ?? (r.status === "paid" ? "paid" : "pending");
                      const cls = ps === "paid"
                        ? "bg-emerald-400/15 text-emerald-400"
                        : ps === "overdue"
                          ? "bg-red-500/15 text-red-500"
                          : "bg-amber-400/15 text-amber-400";
                      return (
                        <span className={"rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase " + cls}>{ps}</span>
                      );
                    })()}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {r.attendees?.position ?? "—"} · {r.attendees?.skill_level ?? "—"} · {r.contacts?.email ?? r.contacts?.phone ?? ""}
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-400">
                  ${((r.amount_cents ?? 0) / 100).toFixed(0)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function WaitlistTab({ entries }: { entries: Wait[] }) {
  const [local, setLocal] = useState<Wait[]>(entries);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function invite(w: Wait) {
    setBusyId(w.id);
    const phone = w.contacts?.phone ?? null;
    const name = w.contacts?.full_name ?? "there";
    const childName = w.attendees?.full_name ?? "your child";
    const { data: u } = await supabase.auth.getUser();
    const ownerId = u.user?.id;
    if (ownerId) {
      await supabase.from("sms_logs").insert({
        owner_id: ownerId,
        recipient_phone: phone,
        recipient_name: name,
        body: `Hi ${name}, a spot just opened for ${childName}! Reply YES within 24 hours to claim it.`,
        kind: "waitlist_promo",
        status: phone ? "queued" : "mock",
      });
    }
    const now = new Date().toISOString();
    await supabase
      .from("waitlist_entries")
      .update({ promoted_at: now, notified_at: now, status: "offered" })
      .eq("id", w.id);
    setLocal((prev) => prev.map((e) => (e.id === w.id ? { ...e, status: "offered" } : e)));
    setBusyId(null);
  }

  if (local.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        Waitlist is empty.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {local.map((w, i) => {
        const invited = w.status === "offered" || w.status === "claimed";
        return (
          <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400/15 text-[10px] font-bold text-amber-400">
              #{w.position ?? i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {w.attendees?.full_name ?? w.contacts?.full_name ?? "Unknown"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {w.contacts?.email ?? ""} {w.contacts?.phone ? `· ${w.contacts.phone}` : ""}
              </p>
            </div>
            {invited ? (
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-bold text-emerald-400">Invited ✓</span>
            ) : (
              <button
                onClick={() => invite(w)}
                disabled={busyId === w.id}
                className="rounded-full bg-gradient-brand px-3 py-1 text-[10px] font-bold text-primary-foreground disabled:opacity-50"
              >
                {busyId === w.id ? "…" : "Invite"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SessionsTab({ sessions, regs, campId }: { sessions: Session[]; regs: Reg[]; campId: string }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessions[0]?.id ?? null);
  const [attendance, setAttendance] = useState<Map<string, boolean>>(new Map());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFlash, setScanFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSessionId) return;
    supabase
      .from("attendance")
      .select("registration_id,present")
      .eq("session_id", activeSessionId)
      .then(({ data }) => {
        const m = new Map<string, boolean>();
        (data ?? []).forEach((row: { registration_id: string; present: boolean }) => m.set(row.registration_id, row.present));
        setAttendance(m);
      });
  }, [activeSessionId]);

  async function mark(regId: string, present: boolean, method: "manual" | "qr") {
    if (!activeSessionId) return;
    const m = new Map(attendance);
    m.set(regId, present);
    setAttendance(m);
    await supabase.from("attendance").upsert(
      { registration_id: regId, session_id: activeSessionId, present, marked_at: new Date().toISOString(), method },
      { onConflict: "registration_id,session_id" },
    );
  }

  async function toggle(regId: string) {
    await mark(regId, !(attendance.get(regId) ?? false), "manual");
  }

  function handleScan(text: string) {
    setScannerOpen(false);
    // QR encodes registration_id (uuid). Match against paid registrations.
    const id = text.trim();
    const reg = regs.find((r) => r.id === id || r.id.startsWith(id) || id.includes(r.id));
    if (!reg) {
      setScanFlash("✗ Unknown QR code");
      setTimeout(() => setScanFlash(null), 2500);
      return;
    }
    mark(reg.id, true, "qr");
    const name = reg.attendees?.full_name ?? reg.contacts?.full_name ?? "Attendee";
    setScanFlash(`✓ ${name} checked in`);
    setTimeout(() => setScanFlash(null), 2500);
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        No sessions scheduled. Add sessions from the camp edit screen.
      </p>
    );
  }

  const paid = regs.filter((r) => r.status === "paid");
  const presentCount = paid.filter((r) => attendance.get(r.id)).length;
  const unscannedCount = paid.length - presentCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="flex-1 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[9px] uppercase text-muted-foreground">Present</p><p className="text-sm font-bold text-emerald-400">{presentCount}</p></div>
          <div><p className="text-[9px] uppercase text-muted-foreground">Absent</p><p className="text-sm font-bold text-amber-400">{unscannedCount}</p></div>
          <div><p className="text-[9px] uppercase text-muted-foreground">Total</p><p className="text-sm font-bold text-foreground">{paid.length}</p></div>
        </div>
        <button
          onClick={() => setScannerOpen(true)}
          disabled={!activeSessionId || paid.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-40"
        >
          <QrCode size={14} /> Scan
        </button>
      </div>
      {scanFlash && (
        <div className="rounded-xl border border-border bg-surface px-3 py-2 text-center text-xs font-semibold text-foreground">
          {scanFlash}
        </div>
      )}

      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {sessions.map((s, i) => {
            const active = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={
                  "rounded-xl border px-3 py-2 text-left text-[10px] " +
                  (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
                }
              >
                <p className="font-bold uppercase">Day {i + 1}</p>
                <p>{new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              </button>
            );
          })}
        </div>
      </div>

      {paid.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No paid registrations to mark attendance for.
        </p>
      ) : (
        <ul className="space-y-2">
          {paid.map((r) => {
            const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "Unknown";
            const present = attendance.get(r.id) ?? false;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <button onClick={() => toggle(r.id)} className="text-foreground">
                  {present ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <Circle size={20} className="text-muted-foreground" />
                  )}
                </button>
                <p className="flex-1 text-sm font-semibold text-foreground">{name}</p>
                <span className={"text-[10px] font-bold uppercase " + (present ? "text-emerald-400" : "text-muted-foreground")}>
                  {present ? "Present" : "Absent"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-center text-[10px] text-muted-foreground">Camp ID: {campId.slice(0, 8)}</p>
      {scannerOpen && (
        <QRScannerModal onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  );
}

function EvaluationsTab({ regs, campId: _campId }: { regs: Reg[]; campId: string }) {
  const skills = ["Skating", "Puck Control", "Shooting", "Hockey IQ", "Compete"];
  const seed = (s: string, i: number) => 2 + ((s.charCodeAt(0) + i) % 4); // 2-5
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  if (regs.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        No athletes to evaluate yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">Rate each athlete 1–5 across core skills. Send the report card to parents when ready.</p>
      {regs.map((r) => {
        const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "Unknown";
        const sent = sentTo.has(r.id);
        return (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <button
                onClick={() => setSentTo((p) => new Set(p).add(r.id))}
                className={
                  "rounded-full px-3 py-1 text-[10px] font-bold " +
                  (sent ? "bg-emerald-400/15 text-emerald-400" : "bg-gradient-brand text-primary-foreground")
                }
              >
                {sent ? "Sent ✓" : "Send to parent"}
              </button>
            </div>
            <div className="mt-2 space-y-1.5">
              {skills.map((sk, i) => {
                const rating = seed(name + sk, i);
                return (
                  <div key={sk} className="flex items-center gap-3">
                    <span className="w-24 text-[11px] text-muted-foreground">{sk}</span>
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={
                            "h-2 flex-1 rounded-full " +
                            (n <= rating ? "bg-teal" : "bg-surface")
                          }
                        />
                      ))}
                    </div>
                    <span className="w-6 text-right text-[11px] font-bold text-foreground">{rating}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MediaTab({ media }: { media: Media[] }) {
  if (media.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <ImageIcon size={28} className="mx-auto text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">No photos or videos uploaded yet.</p>
        <button className="mt-3 rounded-full bg-gradient-brand px-4 py-1.5 text-[11px] font-bold text-primary-foreground">Upload</button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {media.map((m) => (
        <div key={m.id} className="aspect-square overflow-hidden rounded-xl border border-border bg-surface">
          <img src={m.storage_path} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function DescriptionTab({ camp }: { camp: Camp }) {
  const [val, setVal] = useState(camp.description ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-teal/30 bg-teal/5 p-2.5">
        <FileText size={12} className="mt-0.5 shrink-0 text-teal" />
        <p className="text-[10px] leading-relaxed text-foreground/80">
          Edit the public camp description shown on the booking page. Markdown supported.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {["B", "I", "H1", "H2", "• List", "1. List", "Link", "Image"].map((b) => (
            <button key={b} className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-teal">
              {b}
            </button>
          ))}
        </div>
        <textarea
          value={val}
          onChange={(e) => { setVal(e.target.value); setSaved(false); }}
          rows={14}
          placeholder="Write your camp description…"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{val.length} characters</span>
          <button
            onClick={() => setSaved(true)}
            className="rounded-full bg-gradient-brand px-4 py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            {saved ? "Saved ✓" : "Save description"}
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground">Preview</p>
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
          {val || "Nothing to preview yet."}
        </p>
      </div>
    </div>
  );
}

type CouponRow = {
  id: string; code: string;
  percent_off: number | null; amount_off_cents: number | null;
  expires_at: string | null; usage_limit: number | null; used_count: number;
};
type FieldRow = {
  id: string; label: string; field_type: string;
  options: string[]; required: boolean; sort_order: number;
};

function OptionsTab({ camp }: { camp: Camp }) {
  // Pricing + capacity
  const [price, setPrice] = useState((camp.price_cents / 100).toString());
  const [capacity, setCapacity] = useState(String(camp.capacity));
  const [ebPrice, setEbPrice] = useState(((camp.early_bird_price_cents ?? 0) / 100).toString());
  const [ebDate, setEbDate] = useState(camp.early_bird_expires_at?.slice(0, 10) ?? "");
  // Payment plan
  const [paymentPlan, setPaymentPlan] = useState<string>(camp.payment_plan ?? "none");
  const [siblingDiscount, setSiblingDiscount] = useState<boolean>(camp.sibling_discount);
  const [siblingPercent, setSiblingPercent] = useState<string>(String(camp.sibling_discount_percent ?? 10));
  // Waiver
  const [waiverRequired, setWaiverRequired] = useState<boolean>(camp.waiver_required);
  const [waiverText, setWaiverText] = useState<string>(camp.waiver_text ?? "");
  // Reminders
  const [confirmSms, setConfirmSms] = useState<boolean>(camp.confirmation_sms ?? true);
  const [rem7, setRem7] = useState<boolean>(camp.reminder_7day ?? true);
  const [rem1, setRem1] = useState<boolean>(camp.reminder_1day ?? true);
  const [remMorning, setRemMorning] = useState<boolean>(camp.reminder_morning ?? true);
  const [absent, setAbsent] = useState<boolean>(camp.absent_alert ?? true);
  const [absentMin, setAbsentMin] = useState<string>(String(camp.absent_alert_minutes ?? 15));
  // Persisted records
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: cps }, { data: fs }] = await Promise.all([
        supabase.from("coupons").select("*").eq("camp_id", camp.id).order("created_at", { ascending: false }),
        supabase.from("camp_custom_fields").select("*").eq("camp_id", camp.id).order("sort_order"),
      ]);
      setCoupons((cps ?? []) as unknown as CouponRow[]);
      setFields((fs ?? []) as unknown as FieldRow[]);
    })();
  }, [camp.id]);

  async function saveCamp() {
    setSaving(true);
    const eb = parseFloat(ebPrice || "0");
    const updates = {
      price_cents: Math.round(parseFloat(price || "0") * 100),
      capacity: parseInt(capacity || "0", 10),
      payment_plan: paymentPlan as "none" | "two" | "three",
      sibling_discount: siblingDiscount,
      sibling_discount_percent: Math.max(0, Math.min(100, parseInt(siblingPercent || "0", 10) || 0)),
      waiver_required: waiverRequired,
      waiver_text: waiverText || null,
      early_bird_price_cents: eb > 0 ? Math.round(eb * 100) : null,
      early_bird_expires_at: ebDate ? new Date(ebDate).toISOString() : null,
      confirmation_sms: confirmSms,
      reminder_7day: rem7,
      reminder_1day: rem1,
      reminder_morning: remMorning,
      absent_alert: absent,
      absent_alert_minutes: Math.max(0, Math.min(120, parseInt(absentMin || "0", 10) || 0)),
    };
    await supabase.from("camps").update(updates as never).eq("id", camp.id);
    setSaving(false);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5">
        <Settings2 size={12} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-[10px] leading-relaxed text-amber-200/90">
          Configure registration. Pricing changes don't affect already-paid registrations.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <DollarSign size={11} /> Pricing & capacity
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Standard price ($)" value={price} onChange={setPrice} />
          <Field label="Available spots" value={capacity} onChange={setCapacity} />
          <Field label="Early bird price ($)" value={ebPrice} onChange={setEbPrice} />
          <Field label="Early bird ends" value={ebDate} onChange={setEbDate} type="date" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <CreditCard size={11} /> Payment plans
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { v: "none", label: "Pay in full" },
            { v: "two", label: "2 installments" },
            { v: "three", label: "3 installments" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setPaymentPlan(opt.v)}
              className={"rounded-lg border px-2 py-2 text-[10px] font-semibold " +
                (paymentPlan === opt.v ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs text-foreground">
          <input type="checkbox" checked={siblingDiscount} onChange={(e) => setSiblingDiscount(e.target.checked)} className="h-3.5 w-3.5" />
          Offer sibling discount on additional children
        </label>
        {siblingDiscount && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs text-foreground">
            <span className="text-muted-foreground">Discount %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={siblingPercent}
              onChange={(e) => setSiblingPercent(e.target.value)}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
            />
            <span className="text-muted-foreground">off each additional child</span>
          </div>
        )}
      </div>

      <WaiverEditor
        required={waiverRequired}
        setRequired={setWaiverRequired}
        text={waiverText}
        setText={setWaiverText}
      />

      <div className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <Bell size={11} /> Automated reminders
        </h3>
        <p className="mb-2 text-[10px] text-muted-foreground">
          Sent via SMS and email to opted-in parents. Configure your SMS sender in Settings.
        </p>
        <div className="space-y-1.5">
          {([
            ["Registration confirmation", confirmSms, setConfirmSms, "Immediately after sign-up"],
            ["7-day reminder", rem7, setRem7, "1 week before camp start"],
            ["1-day reminder", rem1, setRem1, "Day before each session"],
            ["Morning-of reminder", remMorning, setRemMorning, "2 hours before start time"],
            ["Absent alert", absent, setAbsent, "If athlete not checked in"],
          ] as const).map(([label, val, set, hint]) => (
            <label key={label} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
              <span>
                <span className="font-semibold">{label}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">· {hint}</span>
              </span>
              <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="h-3.5 w-3.5 accent-teal" />
            </label>
          ))}
        </div>
        {absent && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs">
            <span className="text-muted-foreground">Alert parent if not checked in within</span>
            <input
              type="number"
              min={5}
              max={120}
              value={absentMin}
              onChange={(e) => setAbsentMin(e.target.value)}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
            <span className="text-muted-foreground">minutes of start</span>
          </div>
        )}
      </div>

      <PromoCodesPanel campId={camp.id} coupons={coupons} setCoupons={setCoupons} />

      <CustomFieldsPanel campId={camp.id} fields={fields} setFields={setFields} />

      <button
        onClick={saveCamp}
        disabled={saving}
        className="w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Saving…" : savedTick ? "Saved ✓" : "Save event settings"}
      </button>
    </div>
  );
}

function WaiverEditor({
  required, setRequired, text, setText,
}: { required: boolean; setRequired: (v: boolean) => void; text: string; setText: (v: string) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <ShieldCheck size={11} /> Liability waiver
        </h3>
        <button
          onClick={() => setRequired(!required)}
          className={"rounded-full px-2.5 py-0.5 text-[10px] font-bold " +
            (required ? "bg-gradient-brand text-primary-foreground" : "bg-surface text-muted-foreground")}
        >
          {required ? "Required" : "Off"}
        </button>
      </div>
      {required && (
        <>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Parents must agree and sign this text before completing registration.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste or write your liability waiver text…"
            className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-teal focus:outline-none"
          />
        </>
      )}
    </div>
  );
}

function PromoCodesPanel({
  campId, coupons, setCoupons,
}: { campId: string; coupons: CouponRow[]; setCoupons: (c: CouponRow[]) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "amount">("percent");
  const [val, setVal] = useState("");
  const [limit, setLimit] = useState("");
  const [expires, setExpires] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setErr(null);
    if (!code.trim() || !val.trim()) { setErr("Code and value are required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const ownerId = u.user?.id;
    if (!ownerId) { setErr("Not signed in"); return; }
    const row = {
      owner_id: ownerId,
      camp_id: campId,
      code: code.trim().toUpperCase(),
      percent_off: type === "percent" ? parseInt(val, 10) : null,
      amount_off_cents: type === "amount" ? Math.round(parseFloat(val) * 100) : null,
      usage_limit: limit ? parseInt(limit, 10) : null,
      expires_at: expires ? new Date(expires).toISOString() : null,
    };
    const { data, error } = await supabase.from("coupons").insert(row).select("*").single();
    if (error) { setErr(error.message); return; }
    setCoupons([data as unknown as CouponRow, ...coupons]);
    setCode(""); setVal(""); setLimit(""); setExpires(""); setOpen(false);
  }

  async function remove(id: string) {
    await supabase.from("coupons").delete().eq("id", id);
    setCoupons(coupons.filter((c) => c.id !== id));
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <Tag size={11} /> Promo codes
        </h3>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-full bg-gradient-brand px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
          <Plus size={10} /> Add
        </button>
      </div>

      {open && (
        <div className="mb-3 space-y-2 rounded-xl border border-border bg-surface p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Code" value={code} onChange={(v) => setCode(v.toUpperCase())} />
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
              <div className="flex gap-1">
                <button onClick={() => setType("percent")} className={"flex-1 rounded-md px-2 py-2 text-[10px] font-bold " + (type === "percent" ? "bg-gradient-brand text-primary-foreground" : "bg-card text-muted-foreground")}>% off</button>
                <button onClick={() => setType("amount")} className={"flex-1 rounded-md px-2 py-2 text-[10px] font-bold " + (type === "amount" ? "bg-gradient-brand text-primary-foreground" : "bg-card text-muted-foreground")}>$ off</button>
              </div>
            </div>
            <Field label={type === "percent" ? "Percent" : "Amount ($)"} value={val} onChange={setVal} />
            <Field label="Usage limit (opt)" value={limit} onChange={setLimit} />
            <Field label="Expires (opt)" value={expires} onChange={setExpires} type="date" />
          </div>
          {err && <p className="text-[10px] text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-border bg-card py-2 text-[10px] font-semibold text-muted-foreground">Cancel</button>
            <button onClick={add} className="flex-1 rounded-lg bg-gradient-brand py-2 text-[10px] font-bold text-primary-foreground">Create code</button>
          </div>
        </div>
      )}

      {coupons.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-3 text-center text-[10px] text-muted-foreground">
          No promo codes yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {coupons.map((c) => {
            const off = c.percent_off ? `${c.percent_off}% off` : `$${((c.amount_off_cents ?? 0) / 100).toFixed(0)} off`;
            const uses = `${c.used_count} / ${c.usage_limit ?? "∞"}`;
            return (
              <li key={c.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                <div>
                  <p className="font-mono text-xs font-bold text-foreground">{c.code}</p>
                  <p className="text-[10px] text-muted-foreground">{off} · {uses}{c.expires_at ? ` · exp ${new Date(c.expires_at).toLocaleDateString()}` : ""}</p>
                </div>
                <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-red-400"><X size={12} /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const FIELD_PRESETS: { label: string; type: string; options?: string[] }[] = [
  { label: "Jersey size", type: "select", options: ["YS", "YM", "YL", "AS", "AM", "AL", "AXL"] },
  { label: "Skill level", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
  { label: "Position", type: "select", options: ["Forward", "Defense", "Goalie"] },
  { label: "Medical conditions", type: "text" },
  { label: "Allergies", type: "text" },
  { label: "Emergency contact name", type: "text" },
  { label: "Emergency contact phone", type: "text" },
];

function CustomFieldsPanel({
  campId, fields, setFields,
}: { campId: string; fields: FieldRow[]; setFields: (f: FieldRow[]) => void }) {
  async function addPreset(preset: typeof FIELD_PRESETS[number]) {
    if (fields.some((f) => f.label.toLowerCase() === preset.label.toLowerCase())) return;
    const row = {
      camp_id: campId,
      label: preset.label,
      field_type: preset.type,
      options: preset.options ?? [],
      required: false,
      sort_order: fields.length,
    };
    const { data } = await supabase.from("camp_custom_fields").insert(row).select("*").single();
    if (data) setFields([...fields, data as unknown as FieldRow]);
  }
  async function toggleRequired(f: FieldRow) {
    await supabase.from("camp_custom_fields").update({ required: !f.required }).eq("id", f.id);
    setFields(fields.map((x) => x.id === f.id ? { ...x, required: !x.required } : x));
  }
  async function remove(id: string) {
    await supabase.from("camp_custom_fields").delete().eq("id", id);
    setFields(fields.filter((f) => f.id !== id));
  }
  const activeLabels = new Set(fields.map((f) => f.label.toLowerCase()));

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
        <ListPlus size={11} /> Custom registration form
      </h3>
      <p className="mb-2 text-[10px] text-muted-foreground">
        Tap a field to add it to the parent registration form. Toggle required as needed.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FIELD_PRESETS.map((p) => {
          const on = activeLabels.has(p.label.toLowerCase());
          return (
            <button
              key={p.label}
              onClick={() => !on && addPreset(p)}
              disabled={on}
              className={"rounded-full border px-2.5 py-1 text-[10px] font-semibold " +
                (on ? "border-teal/40 bg-teal/10 text-teal/60" : "border-border bg-surface text-foreground hover:border-teal")}
            >
              {on ? "✓ " : "+ "}{p.label}
            </button>
          );
        })}
      </div>
      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-3 text-center text-[10px] text-muted-foreground">
          No custom fields added.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{f.label}</p>
                <p className="text-[10px] text-muted-foreground">{f.field_type}{f.options?.length ? ` · ${f.options.length} options` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRequired(f)}
                  className={"rounded-full px-2 py-0.5 text-[9px] font-bold uppercase " +
                    (f.required ? "bg-amber-400/15 text-amber-400" : "bg-card text-muted-foreground")}
                >
                  {f.required ? "Required" : "Optional"}
                </button>
                <button onClick={() => remove(f.id)} className="text-muted-foreground hover:text-red-400"><X size={12} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
      />
    </div>
  );
}

type SavedSession = { id: string; name: string; totalMins?: number; blocks?: unknown[] };

function readSavedSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("pxf:sessions:v2");
    return raw ? (JSON.parse(raw) as SavedSession[]) : [];
  } catch { return []; }
}

function PlansTab({ sessions, campId }: { sessions: Session[]; campId: string }) {
  const planKey = `pxf:camp-plans:${campId}`;
  const [library, setLibrary] = useState<SavedSession[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  useEffect(() => {
    setLibrary(readSavedSessions());
    try {
      const raw = window.localStorage.getItem(planKey);
      if (raw) setAssignments(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [planKey]);

  function assign(sessionId: string, savedId: string | null) {
    const next = { ...assignments };
    if (savedId) next[sessionId] = savedId;
    else delete next[sessionId];
    setAssignments(next);
    window.localStorage.setItem(planKey, JSON.stringify(next));
    setPickerFor(null);
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        No camp days scheduled yet. Add days from the camp edit screen to assign session plans.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-teal/30 bg-teal/5 p-2.5">
        <ListChecks size={12} className="mt-0.5 shrink-0 text-teal" />
        <p className="text-[10px] leading-relaxed text-foreground/80">
          Pull a session from your Library and assign it to a camp day — or build a new one inline. New sessions save back to your Library automatically.
        </p>
      </div>

      <ApplyCampTemplate
        campSessions={sessions.map((s) => ({ id: s.id }))}
        planKey={planKey}
        onApplied={() => {
          try {
            const raw = window.localStorage.getItem(planKey);
            if (raw) setAssignments(JSON.parse(raw));
            setLibrary(readSavedSessions());
          } catch { /* ignore */ }
        }}
      />
      <div className="flex gap-2">
        <Link to="/coach/playbook" className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border bg-card py-2 text-[11px] font-semibold text-foreground">
          <BookOpen size={12} /> Open Playbook
        </Link>
        <Link to="/drill-builder" className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-brand py-2 text-[11px] font-bold text-primary-foreground">
          <Plus size={12} /> Build new session
        </Link>
      </div>

      <ul className="space-y-2">
        {sessions.map((s, i) => {
          const assignedId = assignments[s.id];
          const assigned = library.find((l) => l.id === assignedId);
          return (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day {i + 1}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
                {assigned ? (
                  <button onClick={() => assign(s.id, null)} className="text-[10px] font-semibold text-muted-foreground hover:text-red-400">
                    Remove
                  </button>
                ) : null}
              </div>

              {assigned ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-teal/30 bg-teal/5 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-teal">{assigned.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {assigned.blocks?.length ?? 0} drills · {assigned.totalMins ?? 0} min
                    </p>
                  </div>
                  <button onClick={() => setPickerFor(s.id)} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-foreground">
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPickerFor(s.id)}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-teal/40 hover:text-teal"
                >
                  <Plus size={12} /> Assign from Library
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setPickerFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Pick a saved session</h3>
              <button onClick={() => setPickerFor(null)} className="text-muted-foreground"><X size={14} /></button>
            </div>
            {library.length === 0 ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-xs text-muted-foreground">No saved sessions yet.</p>
                <Link to="/drill-builder" className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-4 py-1.5 text-[11px] font-bold text-primary-foreground">
                  <Plus size={12} /> Build one now
                </Link>
              </div>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {library.map((l) => (
                  <li key={l.id}>
                    <button
                      onClick={() => assign(pickerFor, l.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left hover:border-teal/40"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{l.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {l.blocks?.length ?? 0} drills · {l.totalMins ?? 0} min
                        </p>
                      </div>
                      <Plus size={14} className="text-teal" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}