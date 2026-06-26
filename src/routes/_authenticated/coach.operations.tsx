import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Calendar, Clock, MapPin, AlertCircle, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/coach/operations")({
  component: OperationsPage,
});

type StaffRow = { id: string; staff_user_id: string | null; full_name: string | null; email: string };
type AvailRow = { id: string; staff_id: string; day_of_week: number; start_time: string; end_time: string };
type IceRow = {
  id: string; slot_date: string; start_time: string; end_time: string;
  rink_id: string | null; camp_id: string | null; booked_by_coach_id: string | null;
  notes: string | null;
  rink?: { name: string | null } | null;
  camp?: { name: string | null } | null;
};
type BookingReq = {
  id: string; athlete_name: string; parent_name: string | null;
  preferred_dates: string | null; preferred_times: string | null;
  notes: string | null; status: string; created_at: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function OperationsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"avail" | "ice" | "wait">("avail");
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [avail, setAvail] = useState<AvailRow[]>([]);
  const [ice, setIce] = useState<IceRow[]>([]);
  const [requests, setRequests] = useState<BookingReq[]>([]);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [editingIce, setEditingIce] = useState<IceRow | null>(null);

  const reload = async () => {
    if (!user?.id) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const [s, a, i, r] = await Promise.all([
      (supabase as any).from("elite_staff_coaches")
        .select("id,staff_user_id,full_name,email").eq("owner_id", user.id).eq("status", "active"),
      (supabase as any).from("staff_availability")
        .select("id,staff_id,day_of_week,start_time,end_time").eq("owner_id", user.id),
      supabase.from("ice_slots")
        .select("id,slot_date,start_time,end_time,rink_id,camp_id,booked_by_coach_id,notes,rink:rinks(name),camp:camps(name)")
        .eq("owner_id", user.id).gte("slot_date", todayIso).order("slot_date").order("start_time"),
      (supabase as any).from("private_booking_requests")
        .select("id,athlete_name,parent_name,preferred_dates,preferred_times,notes,status,created_at")
        .eq("owner_id", user.id).in("status", ["pending", "waitlisted"]).order("created_at", { ascending: false }),
    ]);
    setStaff((s.data ?? []) as StaffRow[]);
    setAvail((a.data ?? []) as AvailRow[]);
    setIce((i.data ?? []) as any);
    setRequests((r.data ?? []) as BookingReq[]);
  };

  useEffect(() => { reload(); }, [user?.id]);

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Link to="/coach" className="rounded-full border border-border p-1.5 text-muted-foreground"><ChevronLeft size={14} /></Link>
        <h1 className="font-display text-xl font-bold">Operations</h1>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1">
        {([
          ["avail", "Staff"],
          ["ice", "Ice times"],
          ["wait", `Waitlist${requests.length ? ` (${requests.length})` : ""}`],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={"rounded-xl px-2 py-2 text-[11px] font-bold uppercase tracking-wider " +
              (tab === k ? "bg-teal text-black" : "text-muted-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "avail" && (
        <StaffAvailabilityList staff={staff} avail={avail} onEdit={setEditingStaff} />
      )}
      {tab === "ice" && (
        <IceAllocationList ice={ice} onTap={setEditingIce} />
      )}
      {tab === "wait" && (
        <WaitlistList requests={requests} ice={ice} staff={staff} avail={avail} ownerId={user?.id ?? ""} onChanged={reload} />
      )}

      {editingStaff && (
        <AvailabilityEditor
          staff={editingStaff}
          ownerId={user?.id ?? ""}
          initial={avail.filter((a) => a.staff_id === editingStaff.id)}
          onClose={() => setEditingStaff(null)}
          onSaved={async () => { setEditingStaff(null); await reload(); }}
        />
      )}
      {editingIce && (
        <IceAssignSheet
          slot={editingIce}
          staff={staff}
          avail={avail}
          onClose={() => setEditingIce(null)}
          onSaved={async () => { setEditingIce(null); await reload(); }}
        />
      )}
    </div>
  );
}

// ---------- Section 1: Staff availability ----------
function StaffAvailabilityList({ staff, avail, onEdit }: { staff: StaffRow[]; avail: AvailRow[]; onEdit: (s: StaffRow) => void }) {
  if (staff.length === 0) {
    return <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">No active staff coaches yet. Invite from the Staff screen.</p>;
  }
  return (
    <div className="space-y-2">
      {staff.map((s) => {
        const mine = avail.filter((a) => a.staff_id === s.id).sort((a, b) => a.day_of_week - b.day_of_week);
        const summary = mine.length === 0
          ? "No availability set"
          : mine.map((m) => `${DAYS[m.day_of_week]} ${m.start_time.slice(0, 5)}–${m.end_time.slice(0, 5)}`).join(" · ");
        return (
          <button key={s.id} onClick={() => onEdit(s)} className="w-full rounded-2xl border border-border bg-card p-3 text-left">
            <p className="text-sm font-bold">{s.full_name ?? s.email}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{summary}</p>
          </button>
        );
      })}
    </div>
  );
}

function AvailabilityEditor({ staff, ownerId, initial, onClose, onSaved }: {
  staff: StaffRow; ownerId: string; initial: AvailRow[]; onClose: () => void; onSaved: () => void;
}) {
  type Row = { id?: string; day_of_week: number; start_time: string; end_time: string };
  const [rows, setRows] = useState<Row[]>(initial.map((r) => ({ id: r.id, day_of_week: r.day_of_week, start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5) })));
  const [saving, setSaving] = useState(false);

  const add = () => setRows((r) => [...r, { day_of_week: 1, start_time: "16:00", end_time: "21:00" }]);
  const update = (idx: number, patch: Partial<Row>) => setRows((r) => r.map((x, i) => i === idx ? { ...x, ...patch } : x));
  const remove = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    await (supabase as any).from("staff_availability").delete().eq("staff_id", staff.id);
    if (rows.length > 0) {
      await (supabase as any).from("staff_availability").insert(rows.map((r) => ({
        staff_id: staff.id, owner_id: ownerId,
        day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time,
      })));
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold">{staff.full_name ?? staff.email}</h3>
        <p className="text-[11px] text-muted-foreground">Weekly availability</p>
        <div className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <select value={r.day_of_week} onChange={(e) => update(i, { day_of_week: Number(e.target.value) })}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                {DAYS.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
              </select>
              <input type="time" value={r.start_time} onChange={(e) => update(i, { start_time: e.target.value })}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
              <input type="time" value={r.end_time} onChange={(e) => update(i, { end_time: e.target.value })}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs" />
              <button onClick={() => remove(i)} className="text-red-400"><X size={14} /></button>
            </div>
          ))}
          <button onClick={add} className="text-[11px] font-semibold text-teal">+ Add window</button>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-teal py-2 text-sm font-bold text-black">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Section 2: Ice time allocation ----------
function statusFor(slot: IceRow): { color: string; label: string } {
  const hasCoach = !!slot.booked_by_coach_id;
  const hasAlloc = !!slot.camp_id;
  if (!hasAlloc && !hasCoach) return { color: "bg-muted-foreground/40", label: "Unallocated" };
  if (!hasCoach) return { color: "bg-red-500", label: "No instructor" };
  if (hasCoach && !hasAlloc) return { color: "bg-amber-500", label: "No bookings" };
  return { color: "bg-emerald-500", label: "Covered" };
}

function IceAllocationList({ ice, onTap }: { ice: IceRow[]; onTap: (s: IceRow) => void }) {
  if (ice.length === 0) {
    return <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">No upcoming ice times.</p>;
  }
  return (
    <div className="space-y-2">
      {ice.map((s) => {
        const st = statusFor(s);
        return (
          <button key={s.id} onClick={() => onTap(s)} className="w-full rounded-2xl border border-border bg-card p-3 text-left">
            <div className="flex items-center gap-2">
              <span className={"h-2 w-2 rounded-full " + st.color} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{st.label}</span>
            </div>
            <p className="mt-1 text-sm font-bold">{new Date(s.slot_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</p>
            <p className="text-[11px] text-muted-foreground">{s.rink?.name ?? "No rink"} · {s.camp?.name ?? "Unallocated"}</p>
          </button>
        );
      })}
    </div>
  );
}

function IceAssignSheet({ slot, staff, avail, onClose, onSaved }: {
  slot: IceRow; staff: StaffRow[]; avail: AvailRow[]; onClose: () => void; onSaved: () => void;
}) {
  const [coachId, setCoachId] = useState<string | null>(slot.booked_by_coach_id);
  const [saving, setSaving] = useState(false);

  const dow = new Date(slot.slot_date + "T00:00:00").getDay();
  const available = useMemo(() => {
    return staff.map((s) => {
      const windows = avail.filter((a) => a.staff_id === s.id && a.day_of_week === dow);
      const isAvail = windows.some((w) => w.start_time <= slot.start_time && w.end_time >= slot.end_time);
      return { staff: s, isAvail };
    });
  }, [staff, avail, dow, slot]);

  const save = async () => {
    setSaving(true);
    await supabase.from("ice_slots").update({ booked_by_coach_id: coachId }).eq("id", slot.id);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold">Assign instructor</h3>
        <p className="text-[11px] text-muted-foreground">
          {new Date(slot.slot_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
        </p>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 rounded-xl border border-border p-3">
            <input type="radio" checked={coachId === null} onChange={() => setCoachId(null)} />
            <span className="text-sm text-muted-foreground">— Not assigned —</span>
          </label>
          {available.map(({ staff: s, isAvail }) => {
            const selectable = isAvail || s.staff_user_id === coachId;
            return (
              <label key={s.id} className={"flex items-center gap-2 rounded-xl border border-border p-3 " + (selectable ? "" : "opacity-40")}>
                <input type="radio" disabled={!selectable} checked={coachId === s.staff_user_id} onChange={() => setCoachId(s.staff_user_id)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{s.full_name ?? s.email}</p>
                  <p className="text-[10px] text-muted-foreground">{isAvail ? "Available" : "Not available this window"}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-teal py-2 text-sm font-bold text-black">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Section 3: Waitlist ----------
function WaitlistList({ requests, ice, staff, avail, ownerId, onChanged }: {
  requests: BookingReq[]; ice: IceRow[]; staff: StaffRow[]; avail: AvailRow[]; ownerId: string; onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState<BookingReq | null>(null);

  const updateStatus = async (id: string, status: string, decline_message?: string) => {
    await (supabase as any).from("private_booking_requests").update({ status, decline_message: decline_message ?? null }).eq("id", id);
    onChanged();
  };

  if (requests.length === 0) {
    return <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">No pending booking requests.</p>;
  }
  return (
    <>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{r.athlete_name}</p>
              {r.status === "waitlisted" && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">Waitlisted</span>}
            </div>
            {r.parent_name && <p className="text-[11px] text-muted-foreground">Parent: {r.parent_name}</p>}
            {(r.preferred_dates || r.preferred_times) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {r.preferred_dates ?? ""}{r.preferred_dates && r.preferred_times ? " · " : ""}{r.preferred_times ?? ""}
              </p>
            )}
            {r.notes && <p className="mt-1 text-[11px] italic text-muted-foreground">"{r.notes}"</p>}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button onClick={() => setConfirming(r)} className="rounded-lg bg-emerald-500/15 py-1.5 text-[11px] font-bold text-emerald-400"><Check size={11} className="inline" /> Confirm</button>
              <button onClick={() => updateStatus(r.id, "waitlisted")} className="rounded-lg bg-amber-500/15 py-1.5 text-[11px] font-bold text-amber-400"><AlertCircle size={11} className="inline" /> Waitlist</button>
              <button onClick={() => {
                const msg = window.prompt("Decline message (optional)") ?? undefined;
                updateStatus(r.id, "declined", msg);
              }} className="rounded-lg bg-red-500/15 py-1.5 text-[11px] font-bold text-red-400"><X size={11} className="inline" /> Decline</button>
            </div>
          </div>
        ))}
      </div>
      {confirming && (
        <ConfirmBookingSheet
          request={confirming}
          ice={ice}
          staff={staff}
          avail={avail}
          ownerId={ownerId}
          onClose={() => setConfirming(null)}
          onSaved={async () => { setConfirming(null); onChanged(); }}
        />
      )}
    </>
  );
}

function ConfirmBookingSheet({ request, ice, staff, avail, ownerId, onClose, onSaved }: {
  request: BookingReq; ice: IceRow[]; staff: StaffRow[]; avail: AvailRow[]; ownerId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const openIce = ice.filter((s) => !s.camp_id);
  const [iceId, setIceId] = useState<string>("");
  const [coachId, setCoachId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSlot = openIce.find((s) => s.id === iceId) ?? null;
  const dow = selectedSlot ? new Date(selectedSlot.slot_date + "T00:00:00").getDay() : -1;
  const availableCoaches = selectedSlot
    ? staff.filter((s) => avail.some((a) => a.staff_id === s.id && a.day_of_week === dow && a.start_time <= selectedSlot.start_time && a.end_time >= selectedSlot.end_time))
    : staff;

  const confirm = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    const { data: session } = await (supabase as any).from("private_sessions").insert({
      owner_id: ownerId,
      athlete_name: request.athlete_name,
      session_date: selectedSlot.slot_date,
      start_time: selectedSlot.start_time,
      duration_minutes: 60,
      location: selectedSlot.rink?.name ?? null,
      assigned_coach_id: coachId,
    }).select("id").single();
    if (coachId) {
      await supabase.from("ice_slots").update({ booked_by_coach_id: coachId }).eq("id", selectedSlot.id);
    }
    await (supabase as any).from("private_booking_requests").update({
      status: "confirmed", resulting_session_id: session?.id ?? null,
    }).eq("id", request.id);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold">Confirm {request.athlete_name}</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ice time</label>
            <select value={iceId} onChange={(e) => setIceId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm">
              <option value="">Select an open ice time…</option>
              {openIce.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.slot_date} {s.start_time.slice(0, 5)} · {s.rink?.name ?? "—"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instructor</label>
            <select value={coachId ?? ""} onChange={(e) => setCoachId(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm">
              <option value="">— Not assigned —</option>
              {availableCoaches.map((s) => (
                <option key={s.id} value={s.staff_user_id ?? ""}>{s.full_name ?? s.email}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2 text-sm">Cancel</button>
          <button onClick={confirm} disabled={!iceId || saving} className="flex-1 rounded-xl bg-teal py-2 text-sm font-bold text-black disabled:opacity-50">{saving ? "Saving…" : "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}