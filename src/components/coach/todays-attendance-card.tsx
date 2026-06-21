import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Today = {
  campId: string;
  campName: string;
  total: number;
  attending: number;
  notAttending: number;
  noResponse: number;
};

export function TodaysAttendanceCard() {
  const [items, setItems] = useState<Today[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: sessions } = await supabase
        .from("camp_sessions")
        .select("id, camp_id, camps:camp_id(name)")
        .eq("session_date", today);
      const list = (sessions ?? []) as { id: string; camp_id: string; camps: { name: string } | null }[];
      if (list.length === 0) { setItems([]); setLoading(false); return; }
      const sessionIds = list.map((s) => s.id);
      const { data: rsvps } = await supabase
        .from("daily_rsvps")
        .select("camp_id,status,camp_session_id")
        .in("camp_session_id", sessionIds);
      const byCamp = new Map<string, Today>();
      for (const s of list) {
        byCamp.set(s.camp_id, { campId: s.camp_id, campName: s.camps?.name ?? "Camp", total: 0, attending: 0, notAttending: 0, noResponse: 0 });
      }
      for (const r of rsvps ?? []) {
        const t = byCamp.get(r.camp_id);
        if (!t) continue;
        t.total++;
        if (r.status === "attending") t.attending++;
        else if (r.status === "not_attending") t.notAttending++;
        else t.noResponse++;
      }
      setItems([...byCamp.values()].filter((x) => x.total > 0));
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-teal/40 bg-teal/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
          <ClipboardCheck size={14} className="text-teal" /> Today's attendance
        </h2>
      </div>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.campId}>
            <Link
              to="/coach/camps/$campId"
              params={{ campId: t.campId }}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{t.campName}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  <span className="font-bold text-teal">{t.attending}</span> attending · <span className="text-red-400">{t.notAttending}</span> not · <span>{t.noResponse}</span> no reply
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${t.total ? (t.attending / t.total) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-bold text-foreground">{t.attending}<span className="text-xs text-muted-foreground">/{t.total}</span></p>
                <ChevronRight size={14} className="ml-auto text-muted-foreground" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}