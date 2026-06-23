import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, Check, X, ScanLine, Users, ShieldAlert, UserCheck, Phone, HeartPulse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QRScannerModal } from "@/components/coach/qr-scanner";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId/checkin")({
  component: CheckinPage,
});

type Session = { id: string; session_date: string };
type Reg = {
  id: string;
  status: string;
  attendee_id: string | null;
  attendees?: { full_name: string | null } | null;
  contacts?: { full_name: string | null } | null;
};
type Caregiver = { id: string; attendee_id: string; full_name: string; relationship: string; phone: string };

type EmergencyContact = { name: string; relationship: string; phone: string };
type HealthProfileRow = {
  athlete_id: string;
  allergies: { categories: string[]; notes: string } | null;
  medications: string | null;
  conditions: string | null;
  emergency_contacts: EmergencyContact[] | null;
};

function CheckinPage() {
  const { campId } = useParams({ from: "/_authenticated/coach/camps/$campId/checkin" });
  const [campName, setCampName] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Map<string, boolean>>(new Map());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);
  const [recent, setRecent] = useState<{ name: string; at: string }[]>([]);
  const [caregivers, setCaregivers] = useState<Map<string, Caregiver[]>>(new Map());
  const [pickupFor, setPickupFor] = useState<Reg | null>(null);
  const [health, setHealth] = useState<Map<string, HealthProfileRow>>(new Map());
  const [medicalFor, setMedicalFor] = useState<Reg | null>(null);

  useEffect(() => {
    (async () => {
      const [c, s, r] = await Promise.all([
        supabase.from("camps").select("name").eq("id", campId).maybeSingle(),
        supabase.from("camp_sessions").select("id,session_date").eq("camp_id", campId).order("session_date"),
        supabase
          .from("registrations")
          .select("id,status, attendee_id, attendees(full_name), contacts(full_name)")
          .eq("camp_id", campId)
          .eq("status", "paid"),
      ]);
      setCampName(c.data?.name ?? "");
      const sess = (s.data ?? []) as Session[];
      setSessions(sess);
      const regsData = (r.data ?? []) as unknown as Reg[];
      setRegs(regsData);
      const today = new Date().toISOString().slice(0, 10);
      setActiveSessionId(sess.find((x) => x.session_date === today)?.id ?? sess[0]?.id ?? null);

      // load caregivers for all attendees in this camp
      const attendeeIds = Array.from(new Set(regsData.map((x) => x.attendee_id).filter((v): v is string => !!v)));
      if (attendeeIds.length) {
        const { data: cg } = await supabase
          .from("authorized_caregivers")
          .select("id, attendee_id, full_name, relationship, phone")
          .in("attendee_id", attendeeIds);
        const m = new Map<string, Caregiver[]>();
        (cg ?? []).forEach((c: Caregiver) => {
          const arr = m.get(c.attendee_id) ?? [];
          arr.push(c);
          m.set(c.attendee_id, arr);
        });
        setCaregivers(m);

        const { data: hp } = await supabase
          .from("athlete_health_profiles")
          .select("athlete_id, allergies, medications, conditions, emergency_contacts")
          .in("athlete_id", attendeeIds);
        const hm = new Map<string, HealthProfileRow>();
        (hp ?? []).forEach((row) => {
          hm.set(row.athlete_id, row as unknown as HealthProfileRow);
        });
        setHealth(hm);
      }
    })();
  }, [campId]);

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

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  function handleScan(text: string) {
    setScannerOpen(false);
    const id = text.trim();
    const reg = regs.find((r) => r.id === id || r.id.startsWith(id) || id.includes(r.id));
    if (!reg || !activeSessionId) {
      setFlash({ ok: false, msg: "Unknown QR code" });
      return;
    }
    const m = new Map(attendance);
    m.set(reg.id, true);
    setAttendance(m);
    void supabase.from("attendance").upsert(
      { registration_id: reg.id, session_id: activeSessionId, present: true, marked_at: new Date().toISOString(), method: "qr" },
      { onConflict: "registration_id,session_id" },
    );
    const name = reg.attendees?.full_name ?? reg.contacts?.full_name ?? "Attendee";
    setFlash({ ok: true, msg: `${name} checked in` });
    setRecent((list) => [{ name, at: new Date().toISOString() }, ...list].slice(0, 8));
  }

  const checkedIn = useMemo(() => regs.filter((r) => attendance.get(r.id) === true).length, [regs, attendance]);

  return (
    <div className="space-y-4">
      <Link to="/coach/camps/$campId" params={{ campId }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back to {campName || "camp"}
      </Link>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Door Check-in</p>
        <h1 className="font-display text-xl font-bold text-foreground">{campName}</h1>
      </div>

      {sessions.length > 1 && (
        <div className="-mx-5 overflow-x-auto px-5">
          <div className="flex gap-2">
            {sessions.map((s, i) => {
              const active = s.id === activeSessionId;
              const d = new Date(s.session_date + "T00:00:00");
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={"shrink-0 rounded-2xl border px-3 py-2 text-center transition-colors " + (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-foreground")}
                >
                  <p className="text-[9px] font-bold uppercase tracking-wider">Day {i + 1}</p>
                  <p className="text-[11px] font-semibold">{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="font-display text-2xl font-bold text-teal">{checkedIn}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Checked in</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="font-display text-2xl font-bold text-foreground">{regs.length - checkedIn}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
        </div>
      </div>

      <button
        onClick={() => setScannerOpen(true)}
        disabled={!activeSessionId || regs.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand py-5 text-base font-bold text-primary-foreground shadow-glow-teal disabled:opacity-40"
      >
        <ScanLine size={20} /> Open Scanner
      </button>
      <p className="text-center text-[10px] text-muted-foreground">Point camera at athlete's QR badge</p>

      {flash && (
        <div className={"flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold " + (flash.ok ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-red-500/40 bg-red-500/10 text-red-400")}>
          {flash.ok ? <Check size={16} /> : <X size={16} />} {flash.msg}
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent scans</p>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-[11px] text-muted-foreground">
            <Camera size={14} className="mx-auto mb-1" /> No scans yet
          </p>
        ) : (
          <ul className="space-y-1">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <Check size={12} className="text-emerald-400" /> {r.name}
                </span>
                <span className="text-[10px] text-muted-foreground">{new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {scannerOpen && <QRScannerModal onScan={handleScan} onClose={() => setScannerOpen(false)} />}

      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Users size={11} /> Roster ({regs.length})
        </p>
        {regs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-[11px] text-muted-foreground">
            No paid registrations yet
          </p>
        ) : (
          <ul className="space-y-1.5">
            {regs.map((r) => {
              const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "Athlete";
              const cgList = r.attendee_id ? (caregivers.get(r.attendee_id) ?? []) : [];
              const noCaregivers = r.attendee_id && cgList.length === 0;
              const present = attendance.get(r.id) === true;
              return (
                <li key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                  <span className={"grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold " + (present ? "bg-emerald-500/20 text-emerald-400" : "bg-surface text-muted-foreground")}>
                    {present ? <Check size={12} /> : name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-foreground">{name}</p>
                      {noCaregivers && (
                        <span title="No authorized caregivers on file" className="flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                          <ShieldAlert size={9} /> NO PICKUP
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {cgList.length > 0 ? `${cgList.length} authorized caregiver${cgList.length === 1 ? "" : "s"}` : "Parent pickup only"}
                    </p>
                  </div>
                  {r.attendee_id && (
                    <button
                      onClick={() => setPickupFor(r)}
                      aria-label={`Show pickup info for ${name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-teal hover:bg-teal/10"
                    >
                      <UserCheck size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pickupFor && (
        <PickupSheet
          reg={pickupFor}
          caregivers={(pickupFor.attendee_id && caregivers.get(pickupFor.attendee_id)) || []}
          onClose={() => setPickupFor(null)}
        />
      )}
    </div>
  );
}

function PickupSheet({ reg, caregivers, onClose }: { reg: Reg; caregivers: Caregiver[]; onClose: () => void }) {
  const name = reg.attendees?.full_name ?? reg.contacts?.full_name ?? "Athlete";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-background p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Authorized for pickup</p>
            <h2 className="font-display text-lg font-bold text-foreground">{name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground"><X size={18} /></button>
        </div>

        {caregivers.length === 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-300">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">No authorized caregivers on file</p>
              <p className="mt-0.5 text-amber-300/80">Release this athlete only to their registered parent/guardian. Confirm ID before pickup.</p>
            </div>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {caregivers.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-teal/15 text-teal">
                  <UserCheck size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.full_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{c.relationship}</p>
                </div>
                <a href={`tel:${c.phone}`} className="flex items-center gap-1 rounded-lg bg-teal/15 px-2.5 py-1.5 text-[11px] font-bold text-teal">
                  <Phone size={11} /> {c.phone}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}