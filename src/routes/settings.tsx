import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Building2, Bell, Lock, Link2, CreditCard, Trash2, Camera, Check, Palette, Image as ImageIcon, MessageSquare, LogOut, ShieldCheck, ChevronRight, UserCog, Calculator, Megaphone, Mail, Clock as ClockIcon } from "lucide-react";
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
  const [accounting, setAccounting] = useState<Record<string, { status: string; account_name: string | null; last_synced_at: string | null }>>({});
  const [pixelId, setPixelId] = useState("");
  const [pixelSaving, setPixelSaving] = useState(false);
  const [pixelSaved, setPixelSaved] = useState(false);
  const [emailMarketing, setEmailMarketing] = useState<Record<string, { status: string; account_name: string | null; list_name: string | null }>>({});
  const [bufferMin, setBufferMin] = useState<number>(30);
  const [bufferSaving, setBufferSaving] = useState(false);
  const [bufferSaved, setBufferSaved] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("accounting_connections")
      .select("provider, status, account_name, last_synced_at")
      .eq("owner_id", user.id)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, { status: string; account_name: string | null; last_synced_at: string | null }> = {};
        for (const row of data) {
          map[row.provider as string] = {
            status: row.status,
            account_name: row.account_name,
            last_synced_at: row.last_synced_at,
          };
        }
        setAccounting(map);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (supabase as any)
      .from("coach_marketing_settings")
      .select("meta_pixel_id")
      .eq("coach_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { meta_pixel_id: string | null } | null }) => {
        if (cancelled) return;
        setPixelId(data?.meta_pixel_id ?? "");
      });
    (supabase as any)
      .from("profiles")
      .select("min_buffer_minutes")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { min_buffer_minutes?: number } | null }) => {
        if (cancelled) return;
        if (data && typeof data.min_buffer_minutes === "number") setBufferMin(data.min_buffer_minutes);
      });
    supabase
      .from("email_marketing_connections")
      .select("provider, status, account_name, list_name")
      .eq("owner_id", user.id)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, { status: string; account_name: string | null; list_name: string | null }> = {};
        for (const row of data) {
          map[row.provider as string] = {
            status: row.status,
            account_name: row.account_name,
            list_name: row.list_name,
          };
        }
        setEmailMarketing(map);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const savePixel = async () => {
    if (!user?.id) return;
    setPixelSaving(true);
    setPixelSaved(false);
    const trimmed = pixelId.trim();
    await (supabase as any)
      .from("coach_marketing_settings")
      .upsert(
        { coach_id: user.id, meta_pixel_id: trimmed || null },
        { onConflict: "coach_id" },
      );
    setPixelSaving(false);
    setPixelSaved(true);
    setTimeout(() => setPixelSaved(false), 1800);
  };

  const saveBuffer = async () => {
    if (!user?.id) return;
    setBufferSaving(true);
    setBufferSaved(false);
    const val = Math.max(0, Math.min(240, Math.round(bufferMin)));
    await (supabase as any).from("profiles").update({ min_buffer_minutes: val }).eq("id", user.id);
    setBufferSaving(false);
    setBufferSaved(true);
    setTimeout(() => setBufferSaved(false), 1800);
  };

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

        <Section icon={Calculator} title="Connect Accounting">
          <p className="text-[11px] text-muted-foreground">
            Sync every camp registration payment to your accounting software. Each transaction posts with the camp name, parent name, amount, and date.
          </p>
          {([
            { id: "quickbooks", label: "QuickBooks", tint: "from-emerald-500/20 to-emerald-700/10", badge: "QB" },
            { id: "xero", label: "Xero", tint: "from-sky-500/20 to-sky-700/10", badge: "X" },
          ] as const).map((p) => {
            const conn = accounting[p.id];
            const connected = conn?.status === "connected";
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${p.tint} text-[10px] font-bold`}>{p.badge}</div>
                  <div>
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {connected
                        ? `Connected${conn?.account_name ? ` · ${conn.account_name}` : ""}`
                        : "Auto-post payments as sales receipts"}
                    </p>
                  </div>
                </div>
                {connected ? (
                  <span className="flex items-center gap-1 rounded-full bg-volt/15 px-2 py-1 text-[10px] font-bold text-volt"><Check size={10} /> Connected</span>
                ) : (
                  <button className="rounded-lg border border-border px-3 py-1 text-[10px]">Connect</button>
                )}
              </div>
            );
          })}
        </Section>

        <Section icon={ClockIcon} title="Scheduling buffer">
          <p className="text-[11px] text-muted-foreground">
            Minimum minutes between back-to-back assignments for any team member. If a coach's gap is shorter than this, we'll warn before confirming the assignment.
          </p>
          <label className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={240}
              value={bufferMin}
              onChange={(e) => setBufferMin(Number(e.target.value) || 0)}
              className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="text-[11px] text-muted-foreground">minutes</span>
            <button
              onClick={saveBuffer}
              disabled={bufferSaving}
              className="ml-auto rounded-lg bg-teal px-4 py-2 text-xs font-bold text-background disabled:opacity-60"
            >
              {bufferSaving ? "Saving…" : bufferSaved ? "Saved" : "Save"}
            </button>
          </label>
        </Section>

        <Section icon={Megaphone} title="Meta Pixel">
          <p className="text-[11px] text-muted-foreground">
            Paste your Facebook / Instagram Pixel ID to track ad conversions. We'll fire a Purchase event with the camp name and amount whenever a registration completes.
          </p>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pixel ID</span>
            <input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="e.g. 1234567890123456"
              inputMode="numeric"
              maxLength={32}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tracking-wider"
            />
          </label>
          <button
            onClick={savePixel}
            disabled={pixelSaving}
            className="rounded-lg bg-teal px-4 py-2 text-xs font-bold text-background disabled:opacity-60"
          >
            {pixelSaving ? "Saving…" : pixelSaved ? "Saved" : "Save Pixel ID"}
          </button>
        </Section>

        <Section icon={Mail} title="Email Marketing">
          <p className="text-[11px] text-muted-foreground">
            Auto-add new registrants to your email list. Pick a provider, then choose which list new parents should join.
          </p>
          {([
            { id: "mailchimp", label: "Mailchimp", tint: "from-yellow-500/20 to-yellow-700/10", badge: "MC" },
            { id: "klaviyo", label: "Klaviyo", tint: "from-fuchsia-500/20 to-fuchsia-700/10", badge: "K" },
          ] as const).map((p) => {
            const conn = emailMarketing[p.id];
            const connected = conn?.status === "connected";
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${p.tint} text-[10px] font-bold`}>{p.badge}</div>
                  <div>
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {connected
                        ? `Syncing to ${conn?.list_name ?? "selected list"}`
                        : "Connect with API key, then pick a list"}
                    </p>
                  </div>
                </div>
                {connected ? (
                  <span className="flex items-center gap-1 rounded-full bg-volt/15 px-2 py-1 text-[10px] font-bold text-volt"><Check size={10} /> Connected</span>
                ) : (
                  <button className="rounded-lg border border-border px-3 py-1 text-[10px]">Connect</button>
                )}
              </div>
            );
          })}
        </Section>

        <Section icon={CreditCard} title="Subscription">
          <div className="rounded-xl border border-volt/40 bg-volt/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-volt">Current plan</p>
            <p className="mt-1 font-display text-lg font-bold">Elite Coach — $49.99/mo</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Founding Member — free until Dec 31, 2027 · next billing Jan 1, 2028</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upgrade</p>
            <p className="mt-1 text-sm font-semibold">Academy — $99/mo</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Multiple coaches under one organization, staff management, org-wide analytics.</p>
            <button className="mt-3 w-full rounded-lg bg-gradient-brand py-2 text-xs font-bold text-primary-foreground">Upgrade to Academy</button>
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

  if (!user) {
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