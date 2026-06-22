import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DailyAttendance } from "@/components/coach/daily-attendance";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId/attendance")({
  component: AttendancePage,
});

type Session = { id: string; session_date: string; start_time: string | null; end_time: string | null };
type Reg = {
  id: string;
  attendees?: { full_name: string | null } | null;
  contacts?: { full_name: string | null; phone: string | null } | null;
};

function AttendancePage() {
  const { campId } = useParams({ from: "/_authenticated/coach/camps/$campId/attendance" });
  const [campName, setCampName] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, s, r] = await Promise.all([
        supabase.from("camps").select("name").eq("id", campId).maybeSingle(),
        supabase.from("camp_sessions").select("*").eq("camp_id", campId).order("session_date"),
        supabase
          .from("registrations")
          .select("id, attendees(full_name), contacts(full_name,phone)")
          .eq("camp_id", campId)
          .eq("status", "paid"),
      ]);
      setCampName(c.data?.name ?? "");
      setSessions((s.data ?? []) as Session[]);
      setRegs((r.data ?? []) as unknown as Reg[]);
      setLoading(false);
    })();
  }, [campId]);

  return (
    <div className="space-y-4">
      <Link to="/coach/camps/$campId" params={{ campId }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back to {campName || "camp"}
      </Link>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Attendance</p>
        <h1 className="font-display text-xl font-bold text-foreground">{campName}</h1>
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
      ) : (
        <DailyAttendance campId={campId} sessions={sessions} regs={regs} />
      )}
    </div>
  );
}