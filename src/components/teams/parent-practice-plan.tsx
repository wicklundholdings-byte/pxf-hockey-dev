import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, StickyNote } from "lucide-react";

type Item = {
  id: string;
  item_type: "drill" | "note";
  drill_id: string | null;
  note_text: string | null;
  duration_minutes: number | null;
  display_order: number;
};
type Drill = { id: string; title: string };

export function ParentPracticePlan({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [drills, setDrills] = useState<Record<string, Drill>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: plan } = await supabase
        .from("practice_plans")
        .select("id")
        .eq("event_id", eventId)
        .maybeSingle();
      if (!plan) { setItems([]); setLoading(false); return; }
      const { data: rows } = await supabase
        .from("practice_plan_items")
        .select("id,item_type,drill_id,note_text,duration_minutes,display_order")
        .eq("plan_id", (plan as { id: string }).id)
        .order("display_order");
      const its = (rows ?? []) as Item[];
      setItems(its);
      const drillIds = its.map((i) => i.drill_id).filter((x): x is string => !!x);
      if (drillIds.length) {
        const { data: dr } = await supabase.from("drills").select("id,title").in("id", drillIds);
        const map: Record<string, Drill> = {};
        (dr ?? []).forEach((d: any) => { map[d.id] = d as Drill; });
        setDrills(map);
      }
      setLoading(false);
    })();
  }, [eventId]);

  if (loading) return <p className="text-xs text-muted-foreground">Loading…</p>;
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        No practice plan posted yet.
      </p>
    );
  }

  const total = items.reduce((a, b) => a + (b.duration_minutes || 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">WHAT TO EXPECT</p>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold">{total} min</span>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => {
          const isDrill = it.item_type === "drill";
          const label = isDrill
            ? (it.drill_id && drills[it.drill_id]?.title) || "Drill"
            : it.note_text || "Note";
          return (
            <div key={it.id} className="flex items-center gap-2 rounded-lg bg-background px-2.5 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-surface-2">
                {isDrill ? <Dumbbell size={12} className="text-teal" /> : <StickyNote size={12} className="text-muted-foreground" />}
              </div>
              <p className="flex-1 truncate text-xs font-semibold">{label}</p>
              {it.duration_minutes != null && (
                <span className="text-[10px] text-muted-foreground">{it.duration_minutes}m</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}