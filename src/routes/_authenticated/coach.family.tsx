import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChildrenManager } from "@/components/children-manager";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/family")({
  component: CoachFamily,
});

function CoachFamily() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-surface p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal">My Family</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your own children as athlete profiles. Register them for any camp through the public booking flow — their PXF Combine data and camp history appear here.
        </p>
      </div>

      {uid ? <ChildrenManager ownerId={uid} title="Athletes" /> : <p className="text-xs text-muted-foreground">Loading…</p>}

      <Link
        to="/camps"
        className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-surface p-3 text-xs font-semibold"
      >
        <CalendarDays size={14} className="text-teal" /> Browse camps to register
      </Link>
    </div>
  );
}