import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CampUpdatesFeed, CampUpdateComposer } from "@/components/camp-updates-feed";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId/updates")({
  component: CampUpdatesPage,
});

function CampUpdatesPage() {
  const { campId } = useParams({ from: "/_authenticated/coach/camps/$campId/updates" });
  const [campName, setCampName] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("camps").select("name").eq("id", campId).maybeSingle();
      setCampName(data?.name ?? "");
    })();
  }, [campId]);

  return (
    <div className="space-y-4">
      <Link to="/coach/camps/$campId" params={{ campId }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back to {campName || "camp"}
      </Link>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Updates</p>
          <h1 className="font-display text-xl font-bold text-foreground">{campName}</h1>
          <p className="mt-1 text-[11px] text-muted-foreground">Visible to registered parents only.</p>
        </div>
        <button
          onClick={() => setComposerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-2 text-[11px] font-bold text-primary-foreground"
        >
          <Plus size={12} /> Post Update
        </button>
      </div>

      <CampUpdatesFeed key={reloadKey} campId={campId} canManage />

      {composerOpen && (
        <CampUpdateComposer
          campId={campId}
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}