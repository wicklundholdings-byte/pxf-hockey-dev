import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Check } from "lucide-react";
import { markChargePaid } from "@/lib/team-payments.functions";

type Row = {
  charge_id: string;
  amount_cents: number;
  status: "pending" | "paid" | "cancelled";
  due_date: string | null;
  label: string;
  team_name: string;
  player_name: string;
};

function money(c: number) { return "$" + (c / 100).toFixed(2); }
function isOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d + "T23:59:59") < new Date();
}

export function OutstandingPayments({ variant = "card" }: { variant?: "card" | "list" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const pay = useServerFn(markChargePaid);

  const reload = async () => {
    const { data: charges } = await supabase
      .from("team_payment_charges")
      .select("id,amount_cents,status,team_player_id,request_id")
      .eq("status", "pending");
    const chargeList = (charges ?? []) as any[];
    if (chargeList.length === 0) { setRows([]); return; }
    const reqIds = Array.from(new Set(chargeList.map((c) => c.request_id)));
    const playerIds = Array.from(new Set(chargeList.map((c) => c.team_player_id)));
    const [reqs, plys] = await Promise.all([
      supabase.from("team_payment_requests").select("id,label,due_date,team_id").in("id", reqIds),
      supabase.from("team_players").select("id,display_name,team_id").in("id", playerIds),
    ]);
    const teamIds = Array.from(new Set(((reqs.data ?? []) as any[]).map((r) => r.team_id)));
    const teams = teamIds.length
      ? (await supabase.from("teams").select("id,name").in("id", teamIds)).data ?? []
      : [];
    const reqMap = new Map(((reqs.data ?? []) as any[]).map((r) => [r.id, r]));
    const plyMap = new Map(((plys.data ?? []) as any[]).map((p) => [p.id, p]));
    const teamMap = new Map((teams as any[]).map((t) => [t.id, t.name]));
    const built: Row[] = chargeList.map((c) => {
      const r = reqMap.get(c.request_id);
      const p = plyMap.get(c.team_player_id);
      return {
        charge_id: c.id,
        amount_cents: c.amount_cents,
        status: c.status,
        due_date: r?.due_date ?? null,
        label: r?.label ?? "Payment",
        team_name: teamMap.get(r?.team_id) ?? "Team",
        player_name: p?.display_name ?? "",
      };
    });
    setRows(built);
  };

  useEffect(() => { reload(); }, []);

  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.amount_cents, 0);

  if (variant === "card") {
    return (
      <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-amber-400" />
          <p className="text-[10px] font-bold tracking-[0.25em] text-amber-400">PAYMENT DUE</p>
        </div>
        <p className="mt-1 font-display text-lg font-bold">{money(total)} outstanding</p>
        <p className="text-[11px] text-muted-foreground">{rows.length} request{rows.length === 1 ? "" : "s"} from your team</p>
        <div className="mt-3 space-y-2">
          {rows.slice(0, 3).map((r) => (
            <PayRow key={r.charge_id} row={r} onPay={async () => { await pay({ data: { chargeId: r.charge_id } }); reload(); }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <PayRow key={r.charge_id} row={r} onPay={async () => { await pay({ data: { chargeId: r.charge_id } }); reload(); }} />
      ))}
    </div>
  );
}

function PayRow({ row, onPay }: { row: Row; onPay: () => Promise<void> }) {
  const overdue = isOverdue(row.due_date);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{row.label}</p>
        <p className="text-[11px] text-muted-foreground">
          {row.team_name}{row.player_name ? ` · ${row.player_name}` : ""}{row.due_date ? ` · due ${row.due_date}` : ""}{overdue ? " · overdue" : ""}
        </p>
      </div>
      <p className="font-display text-sm font-bold">{money(row.amount_cents)}</p>
      <button onClick={onPay} className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-background">
        <Check size={11} /> Pay
      </button>
    </div>
  );
}