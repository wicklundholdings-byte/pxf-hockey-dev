import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  component: AdminVerifications,
});

type Row = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  legal_first_name: string | null;
  legal_last_name: string | null;
  date_of_birth: string | null;
  address_city: string | null;
  address_region: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  profile?: { email: string | null; full_name: string | null } | null;
};

function AdminVerifications() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  async function load() {
    let q = supabase
      .from("coach_verifications")
      .select("id, user_id, status, legal_first_name, legal_last_name, date_of_birth, address_city, address_region, submitted_at, approved_at, expires_at, profile:profiles!coach_verifications_user_id_fkey(email, full_name)")
      .order("submitted_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows((data ?? []) as unknown as Row[]);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function approve(r: Row) {
    setBusy(r.id);
    const exp = new Date(); exp.setMonth(exp.getMonth() + 12);
    await supabase.from("coach_verifications").update({
      status: "approved",
      approved_at: new Date().toISOString(),
      expires_at: exp.toISOString(),
    }).eq("id", r.id);
    setBusy(null);
    void load();
  }
  async function reject(r: Row) {
    const reason = window.prompt("Reason for rejection?") ?? "";
    setBusy(r.id);
    await supabase.from("coach_verifications").update({
      status: "rejected",
      rejected_reason: reason,
    }).eq("id", r.id);
    setBusy(null);
    void load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <ShieldCheck size={18} className="text-sky-400" /> Coach Verifications
        </h1>
        <p className="text-xs text-muted-foreground">Approve identity & background-check submissions.</p>
      </div>

      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={"rounded-full px-3 py-1 text-[11px] font-semibold capitalize " + (filter === f ? "bg-teal text-background" : "border border-border text-muted-foreground")}
          >
            {f}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">No {filter} verifications</p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {r.legal_first_name} {r.legal_last_name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.profile?.email ?? r.user_id.slice(0, 8)} · {r.address_city}, {r.address_region}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  DOB {r.date_of_birth} · submitted {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
                </p>
              </div>
              <span className={
                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider " +
                (r.status === "pending" ? "bg-amber-500/15 text-amber-300" :
                 r.status === "approved" ? "bg-sky-500/15 text-sky-400" :
                 r.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")
              }>
                {r.status === "pending" && <Clock size={9} className="mr-0.5 inline" />}
                {r.status}
              </span>
            </div>
            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button disabled={busy === r.id} onClick={() => approve(r)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-500/20 py-2 text-[11px] font-bold text-sky-400 disabled:opacity-40">
                  <Check size={12} /> Approve
                </button>
                <button disabled={busy === r.id} onClick={() => reject(r)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-destructive/40 py-2 text-[11px] font-bold text-destructive disabled:opacity-40">
                  <X size={12} /> Reject
                </button>
              </div>
            )}
            {r.status === "approved" && r.expires_at && (
              <p className="mt-2 text-[10px] text-muted-foreground">Expires {new Date(r.expires_at).toLocaleDateString()}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}