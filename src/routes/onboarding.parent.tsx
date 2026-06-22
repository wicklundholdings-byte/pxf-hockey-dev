import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChildrenManager } from "@/components/children-manager";

export const Route = createFileRoute("/onboarding/parent")({
  component: ParentOnboarding,
});

function ParentOnboarding() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate({ to: "/auth", search: { mode: "signup", redirect: "/onboarding/parent" } }); return; }
      setUid(data.user.id);
    });
  }, [navigate]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background px-5 pt-6 pb-12">
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-teal" />
        <div className="h-1 flex-1 rounded-full bg-teal" />
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step 2 of 2</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-teal/15 text-teal"><Users size={16} /></span>
        <div>
          <h1 className="font-display text-2xl font-bold">Add your athlete</h1>
          <p className="text-xs text-muted-foreground">You can add more than one. Each child gets their own profile.</p>
        </div>
      </div>

      <div className="mt-5">
        {uid ? <ChildrenManager ownerId={uid} title="Athletes" /> : <p className="text-xs text-muted-foreground">Loading…</p>}
      </div>

      <div className="mt-8 flex justify-end">
        <Link to="/parent" className="flex items-center gap-1 rounded-full bg-teal px-5 py-2.5 text-xs font-bold text-black">
          Continue <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}