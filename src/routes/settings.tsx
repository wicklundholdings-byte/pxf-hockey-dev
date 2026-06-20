import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User, Building2, Bell, Lock, Link2, CreditCard, Trash2, Camera, Check } from "lucide-react";

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

function SettingsScreen() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ reg: true, msg: true, remind: true, wait: false, pay: true });

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="text-xs text-muted-foreground">Manage your account, notifications and subscription.</p>

      <div className="mt-5 space-y-4">
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

        <Section icon={Bell} title="Notifications">
          {notifTypes.map((n) => (
            <label key={n.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {n.label}
              <input type="checkbox" checked={prefs[n.id]} onChange={(e) => setPrefs({ ...prefs, [n.id]: e.target.checked })} className="accent-teal" />
            </label>
          ))}
        </Section>

        <Section icon={Lock} title="Privacy & Security">
          <label className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
            Show me on public coach search
            <input type="checkbox" defaultChecked className="accent-teal" />
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
      </div>
    </div>
  );
}