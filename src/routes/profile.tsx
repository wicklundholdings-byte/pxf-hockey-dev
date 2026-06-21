import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Settings, Shield, Bell, HelpCircle, LogOut, LogIn, ChevronRight, Award, Users, Crown, Heart, ClipboardList, CalendarDays, ShieldCheck } from "lucide-react";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PxfCombine } from "@/components/pxf-combine";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — PXF Hockey" },
      { name: "description", content: "Manage your profile, team, and coaching preferences." },
      { property: "og:title", content: "Profile — PXF Hockey" },
      { property: "og:description", content: "Manage your PXF Hockey profile." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useIsAdmin(user?.id);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setFullName(data?.full_name ?? null));
  }, [user]);

  if (loading) return <div className="px-5 pt-10 text-center text-sm text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="px-5 pt-10 text-center">
        <h1 className="font-display text-xl font-bold">Sign in to PXF Hockey</h1>
        <p className="mt-2 text-sm text-muted-foreground">Save favourites, track progress, and unlock training programs.</p>
        <Link to="/auth" search={{ mode: "login", redirect: "/profile" }} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-sm font-bold text-primary-foreground">
          <LogIn size={16} /> SIGN IN
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">
          New here? <Link to="/auth" search={{ mode: "signup", redirect: "/profile" }} className="font-semibold text-teal">Create an account</Link>
        </p>
      </div>
    );
  }

  const initials = (fullName || user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="px-5 pt-4">
      <div className="rounded-3xl border border-border/60 bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-brand font-display text-2xl font-bold text-primary-foreground shadow-glow-teal">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.3em] text-volt">{isAdmin ? "ADMIN" : "ATHLETE"}</p>
            <h1 className="mt-0.5 text-xl font-bold text-foreground">{fullName || user.email}</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground">
            <Settings size={16} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-border/60 rounded-2xl bg-surface-2 py-3 text-center">
          <Stat label="PXF SCORE" value="784" />
          <Stat label="PROGRAMS" value="3" />
          <Stat label="ATHLETES" value="24" />
        </div>
      </div>

      <PxfCombine />

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">ACHIEVEMENTS</h2>
      <div className="mt-3 -mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex gap-3">
          {[
            { label: "10 Day Streak", tint: "volt" as const, icon: Award },
            { label: "Edge Master", tint: "teal" as const, icon: Award },
            { label: "First Program", tint: "teal" as const, icon: Award },
            { label: "Squad Builder", tint: "volt" as const, icon: Users },
          ].map((a) => (
            <div key={a.label} className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/60 bg-surface p-3 text-center">
              <div className={"grid h-10 w-10 place-items-center rounded-full " + (a.tint === "teal" ? "bg-teal/15 text-teal" : "bg-volt/15 text-volt")}>
                <a.icon size={18} />
              </div>
              <span className="text-[11px] font-semibold leading-tight text-foreground">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-7 text-xs font-bold tracking-[0.25em] text-foreground/90">ACCOUNT</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-surface">
        {([
          ...(isAdmin ? [{ label: "Admin Console", icon: ShieldCheck, to: "/admin" as const }] : []),
          { label: "Membership", icon: Crown, to: "/membership" as const },
          { label: "My Team", icon: Users, to: "/team" as const },
          { label: "Favourites", icon: Heart, to: "/favourites" as const },
          { label: "Saved Sessions", icon: ClipboardList, to: "/saved-sessions" as const },
          { label: "Session Calendar", icon: CalendarDays, to: "/calendar" as const },
          { label: "Notifications", icon: Bell },
          { label: "Privacy & Data", icon: Shield },
          { label: "Help & Support", icon: HelpCircle },
        ] as const).map((r) => (
          (r as { to?: string }).to ? (
            <Link key={r.label} to={(r as { to: "/membership" | "/team" | "/favourites" | "/saved-sessions" | "/calendar" | "/admin" }).to} className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3.5 last:border-b-0">
              <r.icon size={16} className="text-teal" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">{r.label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          ) : (
            <button key={r.label} className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3.5 last:border-b-0">
              <r.icon size={16} className="text-teal" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">{r.label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          )
        ))}
      </div>

      <button
        onClick={async () => { await signOut(); navigate({ to: "/" }); }}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-3 text-sm font-bold text-destructive"
      >
        <LogOut size={16} /> SIGN OUT
      </button>

      <div className="mt-6 text-center">
        <p className="font-display text-[11px] font-bold tracking-[0.4em]">
          <span className="text-teal">POWER.</span>{" "}
          <span className="text-volt">FLOW.</span>{" "}
          <span className="text-foreground">PERFORMANCE.</span>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2">
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}