import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, StickyNote, ChevronDown, ChevronUp } from "lucide-react";

type Item = {
  id: string;
  item_type: "drill" | "note";
  drill_id: string | null;
  note_text: string | null;
  duration_minutes: number | null;
  display_order: number;
};
type Drill = {
  id: string;
  title: string;
  short_description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  skill_focus: string | null;
  coaching_points: string | null;
};

export function ParentPracticePlan({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [drills, setDrills] = useState<Record<string, Drill>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

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
        const { data: dr } = await supabase
          .from("drills")
          .select("id,title,short_description,video_url,thumbnail_url,duration_minutes,skill_focus,coaching_points")
          .in("id", drillIds);
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
          const drill = isDrill && it.drill_id ? drills[it.drill_id] : null;
          const label = isDrill
            ? drill?.title || "Drill"
            : it.note_text || "Note";
          const isOpen = !!open[it.id];
          const hasDetail = !!drill && (!!drill.video_url || !!drill.short_description || !!drill.coaching_points || !!drill.thumbnail_url);
          return (
            <div key={it.id} className="rounded-lg bg-background">
              <button
                type="button"
                onClick={() => hasDetail && setOpen((o) => ({ ...o, [it.id]: !o[it.id] }))}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
              >
                <div className="grid h-7 w-7 place-items-center rounded-md bg-surface-2">
                  {isDrill ? <Dumbbell size={12} className="text-teal" /> : <StickyNote size={12} className="text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{label}</p>
                  {drill?.skill_focus && <p className="truncate text-[10px] text-muted-foreground">{drill.skill_focus}</p>}
                </div>
                {it.duration_minutes != null && (
                  <span className="text-[10px] text-muted-foreground">{it.duration_minutes}m</span>
                )}
                {hasDetail && (isOpen ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />)}
              </button>
              {hasDetail && isOpen && drill && (
                <div className="border-t border-border/60 px-2.5 py-2 space-y-2">
                  {drill.video_url && (
                    <video
                      src={drill.video_url}
                      poster={drill.thumbnail_url ?? undefined}
                      controls
                      preload="metadata"
                      className="w-full rounded-md bg-black"
                    />
                  )}
                  {!drill.video_url && drill.thumbnail_url && (
                    <img src={drill.thumbnail_url} alt={drill.title} className="w-full rounded-md" />
                  )}
                  {drill.short_description && (
                    <p className="text-[11px] text-muted-foreground">{drill.short_description}</p>
                  )}
                  {drill.coaching_points && (
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">COACHING POINTS</p>
                      <p className="mt-0.5 whitespace-pre-line text-[11px]">{drill.coaching_points}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}