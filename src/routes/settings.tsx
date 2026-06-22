import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Building2, Bell, Lock, Link2, CreditCard, Trash2, Camera, Check, Palette, Image as ImageIcon, MessageSquare, LogOut, ShieldCheck, ChevronRight, UserCog } from "lucide-react";
import { LayoutDashboard, CalendarDays, BookOpen, MessageSquare as InboxIcon, Users, Flag, MessageCircle } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth, useHasCoachAccess, useUserAppRole } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { useCoachVerified } from "@/components/verified-badge";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — PXF Hockey" }] }),
  component: SettingsScreen,
});

const notifTypes = [
  { id: "reg", label: "New registration" },
  { id: "msg", label: "New message" },
  { id: "remind", label: "Camp reminder" },
  { id: "wait", label: "Waitlist movement" },
  { id: "pay", label: "Payment received" },
];

const parentNotifTypes = [
  { id: "remind", label: "Camp reminder" },
  { id: "msg", label: "New message from coach" },
  { id: "eval", label: "Evaluation posted" },
  { id: "rsvp", label: "RSVP request" },
];

function Section({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold"><Icon size={16} className="text-teal" /> {title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input {...props} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function ParentSettings({ user, signOut }: { user: ReturnType<typeof useAuth>["user"]; signOut: () => Promise<{ error: import("@supabase/supabase-js").AuthError | null }> }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ remind: true, msg: true, eval: true, rsvp: true });

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data ?? null);
    });
  }, [user?.id]);

  const name = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Parent";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("");

  const parentNav = [
    { to: "/parent", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/parent/camps", label: "Camps", icon: Flag },
    { to: "/parent/inbox", label: "Inbox", icon: MessageCircle },
    { to: "/parent/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="text-xs text-muted-foreground">Manage your account and preferences.</p>

      <div className="mt-5 space-y-4">
        <Section icon={User} title="Profile">
          <div className="flex items-center gap-3">
            <div className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-teal/40 to-volt/30 text-xl font-bold text-foreground">
              {initials || "P"}
            </div>
            <button className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"><Camera size={12} /> Change photo</button>
          </div>
          <Field label="Name" defaultValue={name} />
          <Field label="Email" type="email" defaultValue={user?.email ?? ""} readOnly />
        </Section>

        <Section icon={Bell} title="Notifications">
          {parentNotifTypes.map((n) => (
            <label key={n.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {n.label}
              <input type="checkbox" checked={prefs[n.id]} onChange={(e) => setPrefs({ ...prefs, [n.id]: e.target.checked })} className="accent-teal" />
            </label>
          ))}
        </Section>

        <Section icon={Lock} title="Privacy & Security">
          <button className="w-full rounded-lg border border-border py-2 text-xs font-semibold">Change Password</button>
        </Section>

        <Section icon={Trash2} title="Danger Zone">
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Delete account</p>
            <p className="mt-1 text-xs text-muted-foreground">Permanently delete your account and all data. This cannot be undone.</p>
            <button className="mt-3 rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive">Delete Account</button>
          </div>
        </Section>

        <button
          onClick={async () => { await signOut(); navigate({ to: "/auth", search: { mode: "login" } }); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm font-semibold text-destructive"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
      <BottomNav items={parentNav} />
    </div>
  );
}

function CoachSettings({ user, signOut }: { user: ReturnType<typeof useAuth>["user"]; signOut: () => Promise<{ error: import("@supabase/supabase-js").AuthError | null }> }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ reg: true, msg: true, remind: true, wait: false, pay: true });
  const { hasAccess } = useHasCoachAccess(user?.id);
  const navigate = useNavigate();
  const verified = useCoachVerified(user?.id);
  const [marketplaceOn, setMarketplaceOn] = useState(false);
  const [marketplaceLoaded, setMarketplaceLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("marketplace_visible")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMarketplaceOn(!!data?.marketplace_visible);
        setMarketplaceLoaded(true);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleMarketplace = async (next: boolean) => {
    setMarketplaceOn(next);
    if (!user?.id) return;
    await supabase.from("profiles").update({ marketplace_visible: next }).eq("id", user.id);
  };

  const coachNav = [
    { to: "/coach", label: "Dashboard", icon: LayoutDashboard, exact: true, match: ["/coach"] },
    { to: "/coach/camps", label: "Events", icon: CalendarDays, match: ["/coach/camps", "/coach/bookings"] },
    { to: "/coach/playbook", label: "Playbook", icon: BookOpen, match: ["/coach/playbook"] },
    { to: "/coach/inbox", label: "Inbox", icon: InboxIcon, match: ["/coach/inbox", "/coach/broadcast"] },
    { to: "/coach/contacts", label: "Contacts", icon: Users, match: ["/coach/contacts", "/coach/attendees"] },
  ];

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="text-xs text-muted-foreground">Manage your account, notifications and subscription.</p>

      <div className="mt-5 space-y-4">
        {hasAccess && (
          <Link
            to="/get-verified"
            className={
              "block rounded-2xl border p-5 " +
              (verified
                ? "border-sky-500/40 bg-sky-500/5"
                : "border-teal/40 bg-gradient-to-br from-teal/10 to-volt/5")
            }
          >
            <div className="flex items-start gap-3">
              <span className={"grid h-10 w-10 place-items-center rounded-xl " + (verified ? "bg-sky-500/15 text-sky-400" : "bg-teal/15 text-teal")}>
                <ShieldCheck size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trust & Safety</p>
                <p className="font-display text-base font-bold text-foreground">
                  {verified ? "You're verified" : "Get Verified"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {verified
                    ? "The blue VERIFIED badge is showing on your profile and listings."
                    : "Earn the blue VERIFIED badge with a one-time $35 background check. Parents see this before registering."}
                </p>
              </div>
              <ChevronRight size={16} className="mt-1 text-muted-foreground" />
            </div>
          </Link>
        )}

        {hasAccess && (
          <Link
            to="/coach/team"
            className="block rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-volt/15 text-volt">
                <UserCog size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Academy</p>
                <p className="font-display text-base font-bold text-foreground">My Team</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Invite staff, set permission levels (Owner / Coach / Assistant) and assign them to specific camps.
                </p>
              </div>
              <ChevronRight size={16} className="mt-1 text-muted-foreground" />
            </div>
          </Link>
        )}

        <Section icon={User} title="Profile">
          <div className="flex items-center gap-3">
            <div className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-teal/40 to-volt/30 text-xl font-bold">R</div>
            <button className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"><Camera size={12} /> Change photo</button>
          </div>
          <Field label="Name" defaultValue="Coach Reilly" />
          <Field label="Email" type="email" defaultValue="reilly@pxfhockey.com" />
          <Field label="Phone" defaultValue="(905) 555-0188" />
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bio</span>
            <textarea defaultValue="OHL-trained skills coach. Building elite players from U10 to U18." className="mt-1 h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
        </Section>

        <Section icon={Building2} title="Program (Coach)">
          <Field label="Program name" defaultValue="PXF Skills Academy" />
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-background border border-border text-xs text-muted-foreground">Logo</div>
            <button className="rounded-lg border border-border px-3 py-2 text-xs">Upload</button>
          </div>
          <Field label="Location" defaultValue="Mississauga, ON" />
          <Field label="Website" defaultValue="https://pxfhockey.com" />
        </Section>

        <Section icon={Palette} title="Branding (Platinum)">
          <p className="text-[11px] text-muted-foreground">Your branding appears on your public booking page and in the app when your athletes log in.</p>
          <Field label="Tagline" defaultValue="Elite hockey training that moves the needle." />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Program logo</span>
            <div className="mt-1 flex items-center gap-3">
              <div className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-border bg-background text-muted-foreground"><ImageIcon size={18} /></div>
              <button className="rounded-lg border border-border px-3 py-2 text-xs">Upload logo</button>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Banner image</span>
            <div className="mt-1 flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-gradient-toe-to-br from-teal/15 to-volt/10 text-[11px] text-muted-foreground">
              1600 × 600 · click to upload
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary color</span>
            <div className="mt-2 flex items-center gap-2">
              {["#00C4B4", "#3DFF8F", "#3B82F6", "#A855F7", "#EF4444", "#F59E0B"].map((c, i) => (
                <button key={c} className={`h-8 w-8 rounded-full border-2 ${i === 0 ? "border-foreground" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
              <input defaultValue="#00C4B4" className="ml-2 w-24 rounded-lg border border-border bg-background px-2 py-1 text-xs" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/20 text-[10px] font-bold text-teal">PXF</div>
              <div>
                <p className="text-sm font-bold">PXF Skills Academy</p>
                <p className="text-[10px] text-muted-foreground">Elite hockey training that moves the needle.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Bell} title="Notifications">
          {notifTypes.map((n) => (
            <label key={n.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {n.label}
              <input type="checkbox" checked={prefs[n.id]} onChange={(e) => setPrefs({ ...prefs, [n.id]: e.target.checked })} className="accent-teal" />
            </label>
          ))}
        </Section>

        <Section icon={MessageSquare} title="SMS Sender">
          <p className="text-[11px] text-muted-foreground">
            Your verified business number for automated reminders and broadcasts. We'll wire this up to your SMS provider in a later step — for now save your sender details so they appear correctly in previews.
          </p>
          <Field label="Sender name (max 11 chars)" defaultValue="PXF Hockey" maxLength={11} />
          <Field label="Sender phone (E.164)" placeholder="+19055550188" type="tel" />
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signature appended to every SMS</span>
            <textarea
              defaultValue="— Coach Reilly, PXF Hockey. Reply STOP to opt out."
              maxLength={160}
              className="mt-1 h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="rounded-lg bg-surface/50 px-3 py-2 text-[10px] text-muted-foreground">
            Provider: <span className="font-semibold text-foreground">Not configured</span>. Connect Twilio or another SMS provider to start sending live messages.
          </div>
        </Section>

        <Section icon={Lock} title="Privacy & Security">
          <label className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <span>
              <span className="block font-semibold">Show my camps in the public PXF marketplace</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                When OFF, your camps are only reachable via your direct booking link.
                Logged-in parents you've registered will still see your camps inside their app.
              </span>
            </span>
            <input
              type="checkbox"
              checked={marketplaceOn}
              disabled={!marketplaceLoaded}
              onChange={(e) => toggleMarketplace(e.target.checked)}
              className="mt-1 accent-teal"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
            Two-factor authentication
            <input type="checkbox" className="accent-teal" />
          </label>
          <button className="w-full rounded-lg border border-border py-2 text-xs font-semibold">Change Password</button>
        </Section>

        <Section icon={Link2} title="Connected Accounts">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <div>
              <p className="font-semibold">Stripe Connect</p>
              <p className="text-[10px] text-muted-foreground">Payouts enabled · Bank ending 4421</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-volt/15 px-2 py-1 text-[10px] font-bold text-volt"><Check size={10} /> Connected</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <p className="font-semibold">Google Calendar</p>
            <button className="rounded-lg border border-border px-3 py-1 text-[10px]">Connect</button>
          </div>
        </Section>

        <Section icon={CreditCard} title="Subscription">
          <div className="rounded-xl border border-volt/40 bg-volt/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-volt">Current plan</p>
            <p className="mt-1 font-display text-lg font-bold">Platinum — $24.99/mo</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Founding member rate · renews Jul 14, 2026</p>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg bg-teal py-2 text-xs font-bold text-background">Manage Plan</button>
            <button className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold">View Invoices</button>
          </div>
        </Section>

        <Section icon={Trash2} title="Danger Zone">
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">Delete account</p>
            <p className="mt-1 text-xs text-muted-foreground">Permanently delete your account, camps, and all data. This cannot be undone.</p>
            <button className="mt-3 rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive">Delete Account</button>
          </div>
        </Section>

        <button
          onClick={async () => { await signOut(); navigate({ to: "/auth", search: { mode: "login" } }); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm font-semibold text-destructive"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
      {hasAccess && <BottomNav items={coachNav} />}
    </div>
  );
}

function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserAppRole(user?.id);

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      </div>
    );
  }

  if (role === "parent") {
    return <ParentSettings user={user} signOut={signOut} />;
  }

  return <CoachSettings user={user} signOut={signOut} />;
}