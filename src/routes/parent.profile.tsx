import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, LogOut, CreditCard, BookOpen, Pencil, Plus, ChevronRight, ShieldCheck } from "lucide-react";
import { ChildrenManager } from "@/components/children-manager";
import { CaregiversManager } from "@/components/caregivers-manager";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/parent/profile")({
  head: () => ({ meta: [{ title: "Profile — PXF Hockey" }] }),
  component: ParentProfile,
});

type Kid = { id: string; full_name: string; birthday: string | null; position: string | null };

function ageFrom(b: string | null) {
  if (!b) return null;
  return Math.floor((Date.now() - new Date(b + "T00:00:00").getTime()) / (365.25 * 86400000));
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function ParentProfile() {
  const { user, signOut } = useAuth();
  const [kids, setKids] = useState<Kid[]>([]);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("attendees")
        .select("id, full_name, birthday, position")
        .eq("owner_id", user.id)
        .order("created_at");
      setKids((data ?? []) as Kid[]);
    })();
  }, [user?.id, showManager]);

  const name = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Parent";

  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Profile</h1>

      {/* Header card */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-teal/15 font-display text-base font-bold text-teal">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Link to="/settings" aria-label="Edit profile" className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground">
          <Pencil size={14} />
        </Link>
      </div>

      {/* Athletes */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">Children's Athlete Profiles</h2>
          <button onClick={() => setShowManager((v) => !v)} className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[10px] font-bold text-background">
            <Plus size={11} /> {showManager ? "Done" : "Add Athlete"}
          </button>
        </div>
        {showManager && user ? (
          <div className="mt-2 rounded-2xl border border-border bg-card p-4">
            <ChildrenManager ownerId={user.id} title="Manage athletes" />
          </div>
        ) : kids.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">No athletes yet</p>
        ) : (
          <div className="mt-2 flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 snap-x">
            {kids.map((k) => (
              <div key={k.id} className="min-w-[180px] snap-start rounded-2xl border border-border bg-card p-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-teal/15 font-display text-sm font-bold text-teal">
                  {initials(k.full_name)}
                </div>
                <p className="mt-3 truncate font-semibold">{k.full_name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {[ageFrom(k.birthday) != null ? `Age ${ageFrom(k.birthday)}` : null, k.position].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Account links */}
      <section className="mt-6 space-y-2">
        {kids.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] text-muted-foreground">
              <ShieldCheck size={12} className="text-teal" /> Authorized Caregivers
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              People allowed to pick up your athletes at camp check-out.
            </p>
            <div className="mt-3 space-y-4">
              {kids.map((k) => (
                <div key={k.id} className="rounded-xl border border-border/60 bg-surface/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">{k.full_name}</p>
                  <CaregiversManager attendeeId={k.id} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        <Link to="/bookings" className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <span className="flex items-center gap-3 text-sm font-semibold"><BookOpen size={16} className="text-teal" /> My Bookings</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
        <Link to="/payments-preview" className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <span className="flex items-center gap-3 text-sm font-semibold"><CreditCard size={16} className="text-teal" /> Payment Methods</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
        <Link to="/settings" className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <span className="flex items-center gap-3 text-sm font-semibold"><Settings size={16} className="text-teal" /> Account Settings</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      </section>

      <button
        onClick={() => signOut()}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-bold text-destructive"
      >
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}