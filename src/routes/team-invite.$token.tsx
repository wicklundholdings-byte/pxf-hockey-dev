import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/team-invite/$token")({
  component: TeamInvitePage,
});

type Contact = { name: string; relationship: string; phone: string };

function TeamInvitePage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    athlete_dob: "",
    parent_name: "",
    parent_phone: "",
    allergies: "",
    medications: "",
    conditions: "",
    physician_name: "",
    physician_phone: "",
    insurance_provider: "",
    insurance_policy_number: "",
  });
  const [contacts, setContacts] = useState<Contact[]>([
    { name: "", relationship: "", phone: "" },
  ]);

  useEffect(() => {
    (supabase as any)
      .rpc("get_team_invite_by_token", { _token: token })
      .then(({ data, error }: any) => {
        if (error) { setErr(error.message); return; }
        setInfo(data);
        setForm((f) => ({
          ...f,
          athlete_dob: data?.athlete_dob ?? "",
          parent_name: data?.parent1_name ?? "",
          parent_phone: data?.parent1_phone ?? "",
        }));
        if (data?.submitted_at) setDone(true);
      });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.parent_name.trim() || !form.parent_phone.trim()) {
      setErr("Parent name and phone are required."); return;
    }
    const validContacts = contacts.filter((c) => c.name.trim() && c.phone.trim());
    if (validContacts.length === 0) {
      setErr("Add at least one emergency contact."); return;
    }
    setSaving(true); setErr(null);
    const submission = {
      health: {
        allergies: form.allergies,
        medications: form.medications,
        conditions: form.conditions,
        physician_name: form.physician_name,
        physician_phone: form.physician_phone,
      },
      insurance: {
        provider: form.insurance_provider,
        policy_number: form.insurance_policy_number,
      },
      emergency_contacts: validContacts,
    };
    const { error } = await (supabase as any).rpc("submit_team_invite", {
      _token: token,
      _athlete_dob: form.athlete_dob || null,
      _parent_name: form.parent_name,
      _parent_phone: form.parent_phone,
      _submission: submission,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  }

  if (err && !info) return <div className="mx-auto max-w-md p-6 text-center text-sm text-red-400">{err}</div>;
  if (!info) return <div className="mx-auto max-w-md p-6 text-center text-xs text-muted-foreground"><Loader2 className="mx-auto animate-spin" size={18} /></div>;

  if (done) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal text-background"><Check size={24} /></div>
        <h1 className="mt-4 font-display text-2xl font-bold">All set!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks — your details have been sent to the {info.team_name} coach for {info.athlete_first_name}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-5">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground">TEAM INVITE</p>
      <h1 className="mt-1 font-display text-2xl font-bold">{info.team_name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Complete {info.athlete_first_name}'s profile so the coach can reach you about practices, games, and any emergencies.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <Section title="Athlete">
          <Field label="Date of birth" type="date" value={form.athlete_dob} onChange={(v) => setForm({ ...form, athlete_dob: v })} />
        </Section>

        <Section title="Parent / guardian">
          <Field label="Full name" value={form.parent_name} onChange={(v) => setForm({ ...form, parent_name: v })} required />
          <Field label="Phone" type="tel" value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} required />
        </Section>

        <Section title="Emergency contacts">
          {contacts.map((c, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground">CONTACT {i + 1}</span>
                {contacts.length > 1 && (
                  <button type="button" onClick={() => setContacts(contacts.filter((_, j) => j !== i))} className="text-muted-foreground"><Trash2 size={14} /></button>
                )}
              </div>
              <Field label="Name" value={c.name} onChange={(v) => setContacts(contacts.map((x, j) => j === i ? { ...x, name: v } : x))} />
              <Field label="Relationship" value={c.relationship} onChange={(v) => setContacts(contacts.map((x, j) => j === i ? { ...x, relationship: v } : x))} placeholder="e.g. Grandparent" />
              <Field label="Phone" type="tel" value={c.phone} onChange={(v) => setContacts(contacts.map((x, j) => j === i ? { ...x, phone: v } : x))} />
            </div>
          ))}
          {contacts.length < 3 && (
            <button type="button" onClick={() => setContacts([...contacts, { name: "", relationship: "", phone: "" }])} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground">
              <Plus size={12} /> Add another contact
            </button>
          )}
        </Section>

        <Section title="Health (optional)">
          <Field label="Allergies" value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} />
          <Field label="Medications" value={form.medications} onChange={(v) => setForm({ ...form, medications: v })} />
          <Field label="Conditions" value={form.conditions} onChange={(v) => setForm({ ...form, conditions: v })} />
          <Field label="Physician name" value={form.physician_name} onChange={(v) => setForm({ ...form, physician_name: v })} />
          <Field label="Physician phone" type="tel" value={form.physician_phone} onChange={(v) => setForm({ ...form, physician_phone: v })} />
        </Section>

        <Section title="Insurance (optional)">
          <Field label="Provider" value={form.insurance_provider} onChange={(v) => setForm({ ...form, insurance_provider: v })} />
          <Field label="Policy #" value={form.insurance_policy_number} onChange={(v) => setForm({ ...form, insurance_policy_number: v })} />
        </Section>

        {err && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}

        <button disabled={saving} className="w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {saving ? "Sending…" : "Send to coach"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <input type={type} required={required} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}