import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, Lock, FileText, CreditCard, Check, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/settings/verification")({
  head: () => ({ meta: [{ title: "Get Verified — PXF Hockey" }] }),
  component: VerificationFlow,
});

type VerifRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  submitted_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  rejected_reason: string | null;
};

function VerificationFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [existing, setExisting] = useState<VerifRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    legal_first_name: "",
    legal_last_name: "",
    date_of_birth: "",
    address_line1: "",
    address_line2: "",
    address_city: "",
    address_region: "",
    address_postal: "",
    address_country: "CA",
  });
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coach_verifications")
      .select("id, status, submitted_at, approved_at, expires_at, rejected_reason")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setExisting((data as VerifRow | null) ?? null);
        setLoading(false);
      });
  }, [user]);

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 12);
    const payload = {
      user_id: user.id,
      status: "pending" as const,
      ...form,
      consent_given_at: now.toISOString(),
      fee_paid_at: now.toISOString(), // stub: would be set after Checkr fee charge
      submitted_at: now.toISOString(),
      expires_at: expires.toISOString(),
    };
    const { data, error } = await supabase
      .from("coach_verifications")
      .upsert(payload, { onConflict: "user_id" })
      .select("id, status, submitted_at, approved_at, expires_at, rejected_reason")
      .maybeSingle();
    setSubmitting(false);
    if (!error && data) {
      setExisting(data as VerifRow);
      setStep(3);
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background text-xs text-muted-foreground">Loading…</div>;
  }

  // Already has a record (pending / approved / rejected / expired)
  if (existing && step !== 3) {
    return (
      <div className="min-h-screen bg-background px-5 pt-5 pb-24">
        <Link to="/settings" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ArrowLeft size={12} /> Back to settings
        </Link>
        <StatusCard row={existing} onResubmit={() => { setExisting(null); setStep(1); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-5 pb-32">
      <button onClick={() => (step === 1 ? navigate({ to: "/settings" }) : setStep((s) => (s - 1) as 1 | 2))} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back
      </button>

      <div className="mt-3 flex items-center gap-2">
        <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-teal" : "bg-surface"}`} />
        <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-teal" : "bg-surface"}`} />
        <div className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-teal" : "bg-surface"}`} />
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step {step} of 3</p>

      {step === 1 && (
        <>
          <Header icon={ShieldCheck} title="Confirm your identity" subtitle="Provide your legal info exactly as it appears on government ID." />
          <div className="mt-5 space-y-3">
            <Row>
              <Input label="Legal first name" value={form.legal_first_name} onChange={(v) => setForm({ ...form, legal_first_name: v })} />
              <Input label="Legal last name" value={form.legal_last_name} onChange={(v) => setForm({ ...form, legal_last_name: v })} />
            </Row>
            <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
            <Input label="Street address" value={form.address_line1} onChange={(v) => setForm({ ...form, address_line1: v })} />
            <Input label="Apt / suite (optional)" value={form.address_line2} onChange={(v) => setForm({ ...form, address_line2: v })} />
            <Row>
              <Input label="City" value={form.address_city} onChange={(v) => setForm({ ...form, address_city: v })} />
              <Input label="Province / state" value={form.address_region} onChange={(v) => setForm({ ...form, address_region: v })} />
            </Row>
            <Row>
              <Input label="Postal code" value={form.address_postal} onChange={(v) => setForm({ ...form, address_postal: v })} />
              <Input label="Country" value={form.address_country} onChange={(v) => setForm({ ...form, address_country: v })} />
            </Row>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
              <Lock size={12} className="text-teal" /> Encrypted in transit and only used for your background check.
            </div>
          </div>
          <BottomBar>
            <button
              disabled={!form.legal_first_name || !form.legal_last_name || !form.date_of_birth || !form.address_line1 || !form.address_city}
              onClick={() => setStep(2)}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              Continue to consent
            </button>
          </BottomBar>
        </>
      )}

      {step === 2 && (
        <>
          <Header icon={FileText} title="Background check consent" subtitle="We partner with Checkr to run a standard background check." />
          <div className="mt-5 space-y-3 text-xs leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-semibold text-foreground">What we check</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-start gap-2"><Check size={12} className="mt-0.5 shrink-0 text-teal" /> National criminal records search</li>
                <li className="flex items-start gap-2"><Check size={12} className="mt-0.5 shrink-0 text-teal" /> Sex offender registry across all jurisdictions</li>
                <li className="flex items-start gap-2"><Check size={12} className="mt-0.5 shrink-0 text-teal" /> Global watchlist and sanctions</li>
                <li className="flex items-start gap-2"><Check size={12} className="mt-0.5 shrink-0 text-teal" /> Identity verification</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-semibold text-foreground">Your rights</p>
              <p className="mt-1">You may request a copy of your report. Results are confidential and used only to grant or deny verification. Verification is valid for 12 months; we'll remind you 30 days before expiry.</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <span className="flex items-center gap-2 text-foreground"><CreditCard size={14} className="text-teal" /> One-time verification fee</span>
              <span className="font-display text-lg font-bold text-foreground">$35.00</span>
            </div>
            <label className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-[11px] text-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-teal" />
              <span>I authorize PXF Hockey and Checkr to obtain a background report about me, and I agree to the $35 verification fee.</span>
            </label>
          </div>
          <BottomBar>
            <button
              disabled={!consent || submitting}
              onClick={submit}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Pay $35 & Submit"}
            </button>
          </BottomBar>
        </>
      )}

      {step === 3 && existing && (
        <div className="mt-8 rounded-2xl border border-teal/40 bg-teal/5 p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal/15 text-teal">
            <Clock size={24} />
          </div>
          <h1 className="mt-3 font-display text-xl font-bold">Verification submitted</h1>
          <p className="mt-1 text-xs text-muted-foreground">We've sent your details to Checkr. Most checks complete in 1–3 business days.</p>
          <p className="mt-3 text-[11px] text-muted-foreground">You'll get an email and in-app notice the moment it's approved.</p>
          <Link to="/settings" className="mt-5 inline-flex rounded-full bg-teal px-5 py-2 text-[11px] font-bold text-background">Back to settings</Link>
        </div>
      )}
    </div>
  );
}

function StatusCard({ row, onResubmit }: { row: VerifRow; onResubmit: () => void }) {
  if (row.status === "approved") {
    const exp = row.expires_at ? new Date(row.expires_at) : null;
    const daysLeft = exp ? Math.floor((exp.getTime() - Date.now()) / 86400000) : null;
    const renewSoon = daysLeft != null && daysLeft <= 30;
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-sky-500/40 bg-sky-500/5 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-sky-400" />
            <h1 className="font-display text-lg font-bold text-foreground">You're verified</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The blue VERIFIED badge appears on your coach profile and public camp listings.
          </p>
          {exp && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Valid until <span className="font-semibold text-foreground">{exp.toLocaleDateString()}</span>
            </p>
          )}
        </div>
        {renewSoon && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-300"><AlertCircle size={14} /> Renewal reminder</p>
            <p className="mt-1 text-[11px] text-amber-300/80">Your verification expires in {daysLeft} days. Renew now to keep your badge active.</p>
            <button onClick={onResubmit} className="mt-3 rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-300">Renew now</button>
          </div>
        )}
      </div>
    );
  }
  if (row.status === "pending") {
    return (
      <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-300"><Clock size={16} /> Verification pending</p>
        <p className="mt-1 text-xs text-amber-300/80">Submitted {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : "recently"}. Most checks complete in 1–3 business days.</p>
      </div>
    );
  }
  if (row.status === "rejected") {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertCircle size={16} /> Verification not approved</p>
          {row.rejected_reason && <p className="mt-1 text-xs text-destructive/80">{row.rejected_reason}</p>}
        </div>
        <button onClick={onResubmit} className="w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground">Try again</button>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">Your verification has expired</p>
        <p className="mt-1 text-xs text-muted-foreground">Re-verify to restore your VERIFIED badge.</p>
      </div>
      <button onClick={onResubmit} className="w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground">Re-verify</button>
    </div>
  );
}

function Header({ icon: Icon, title, subtitle }: { icon: typeof ShieldCheck; title: string; subtitle: string }) {
  return (
    <div className="mt-4 flex items-start gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal"><Icon size={18} /></span>
      <div>
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-3">{children}</div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal" />
    </label>
  );
}
function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-[480px]">{children}</div>
    </div>
  );
}