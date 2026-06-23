import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRegistrationDraft, emptyHealthProfile, type HealthProfile } from "@/hooks/useRegistrationDraft";
import { RegistrationStepper } from "@/components/parent/registration-stepper";
import { ChevronRight, HeartPulse, ShieldAlert, Phone, UserRound, FileUp, Loader2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/camps/$slug/health")({
  head: () => ({ meta: [{ title: "Health Profile — PXF Hockey" }] }),
  component: HealthScreen,
});

const ALLERGY_OPTIONS = [
  { id: "food", label: "Food" },
  { id: "medication", label: "Medication" },
  { id: "environmental", label: "Environmental" },
  { id: "none", label: "None" },
] as const;

function HealthScreen() {
  const { slug } = useParams({ from: "/camps/$slug/health" });
  const navigate = useNavigate();
  const { draft, update, hydrated } = useRegistrationDraft(slug);

  const athletes = useMemo(() => {
    if (draft.children.length > 0) return draft.children.map((c) => c.full_name || "Athlete");
    return [draft.child.full_name || "Athlete"];
  }, [draft.children, draft.child.full_name]);

  const [profiles, setProfiles] = useState<HealthProfile[]>(() => {
    const base = draft.healthProfiles.length === athletes.length
      ? draft.healthProfiles
      : athletes.map((_, i) => draft.healthProfiles[i] ?? { ...emptyHealthProfile });
    return base;
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const hasAthlete = athletes.some((n) => n && n.trim().length > 0);
    if (!hasAthlete || !draft.parent.email) {
      navigate({ to: "/camps/$slug/register", params: { slug }, replace: true });
    }
  }, [hydrated, athletes, draft.parent.email, navigate, slug]);

  function setField<K extends keyof HealthProfile>(idx: number, key: K, value: HealthProfile[K]) {
    setProfiles((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  }

  function toggleAllergy(idx: number, cat: string) {
    setProfiles((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      let next: string[];
      if (cat === "none") {
        next = p.allergyCategories.includes("none") ? [] : ["none"];
      } else {
        const withoutNone = p.allergyCategories.filter((c) => c !== "none");
        next = withoutNone.includes(cat) ? withoutNone.filter((c) => c !== cat) : [...withoutNone, cat];
      }
      return { ...p, allergyCategories: next };
    }));
  }

  function setEmergency(idx: number, slot: 0 | 1, key: "name" | "relationship" | "phone", value: string) {
    setProfiles((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      const ecs = [...p.emergency_contacts];
      ecs[slot] = { ...ecs[slot], [key]: value };
      return { ...p, emergency_contacts: ecs };
    }));
  }

  async function handleUpload(idx: number, file: File) {
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sign in to upload clearance documents.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${uid}/${slug}-${idx}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("medical-docs").upload(path, file, { upsert: true });
      if (error) throw error;
      setField(idx, "clearance_doc_url", path);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function validProfile(p: HealthProfile) {
    if (p.allergyCategories.length === 0) return false;
    const ec1 = p.emergency_contacts[0];
    return !!(ec1?.name.trim() && ec1?.relationship.trim() && ec1?.phone.trim());
  }

  function submit() {
    if (!profiles.every(validProfile)) return;
    update({ healthProfiles: profiles });
    navigate({ to: "/camps/$slug/payment", params: { slug } });
  }

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="animate-spin text-teal" />
      </div>
    );
  }

  const p = profiles[activeIdx];
  const allValid = profiles.every(validProfile);

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <RegistrationStepper slug={slug} active={3} backTo={{ to: "/camps/$slug/waiver", params: { slug } }} />
      <div className="mx-auto max-w-[480px] space-y-4 px-5 pt-5">
        <header>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-red-500/15 text-red-400">
              <HeartPulse size={16} />
            </span>
            <h1 className="font-display text-2xl font-bold">Health profile</h1>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Visible only to coaches and emergency personnel. Encrypted at rest.
          </p>
        </header>

        {athletes.length > 1 && (
          <div className="-mx-5 overflow-x-auto px-5">
            <div className="flex gap-2">
              {athletes.map((name, i) => {
                const valid = validProfile(profiles[i]);
                const active = i === activeIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={
                      "shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold " +
                      (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-foreground")
                    }
                  >
                    {name}
                    <span className={"ml-2 inline-block h-1.5 w-1.5 rounded-full " + (valid ? "bg-emerald-400" : "bg-amber-400")} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Allergies */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider">Allergies <span className="text-red-400">*</span></h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ALLERGY_OPTIONS.map((opt) => {
              const on = p.allergyCategories.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleAllergy(activeIdx, opt.id)}
                  className={
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold " +
                    (on ? "border-teal bg-teal/15 text-teal" : "border-border bg-background text-foreground")
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {!p.allergyCategories.includes("none") && p.allergyCategories.length > 0 && (
            <textarea
              value={p.allergyNotes}
              onChange={(e) => setField(activeIdx, "allergyNotes", e.target.value)}
              placeholder="Describe allergies (e.g. peanuts — anaphylaxis, carries EpiPen)"
              className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
              rows={2}
            />
          )}
        </section>

        {/* Meds + conditions */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <FieldLabel>Current medications</FieldLabel>
          <textarea
            value={p.medications}
            onChange={(e) => setField(activeIdx, "medications", e.target.value)}
            placeholder="Optional — name, dosage, when taken"
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
          />
          <FieldLabel>Conditions coaches should know about</FieldLabel>
          <textarea
            value={p.conditions}
            onChange={(e) => setField(activeIdx, "conditions", e.target.value)}
            placeholder="Optional — asthma, concussion history, etc."
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
          />
        </section>

        {/* Physician */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><UserRound size={12} className="text-teal" /> Physician</h2>
          <input
            value={p.physician_name}
            onChange={(e) => setField(activeIdx, "physician_name", e.target.value)}
            placeholder="Doctor's name"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
          />
          <input
            value={p.physician_phone}
            onChange={(e) => setField(activeIdx, "physician_phone", e.target.value)}
            placeholder="Phone number"
            inputMode="tel"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
          />
        </section>

        {/* Emergency contacts */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Phone size={12} className="text-red-400" /> Emergency contacts
          </h2>
          <EmergencyFields
            label="Contact 1"
            required
            value={p.emergency_contacts[0]}
            onChange={(k, v) => setEmergency(activeIdx, 0, k, v)}
          />
          <EmergencyFields
            label="Contact 2 (optional)"
            value={p.emergency_contacts[1]}
            onChange={(k, v) => setEmergency(activeIdx, 1, k, v)}
          />
        </section>

        {/* Clearance doc */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <FileUp size={12} className="text-teal" /> Medical clearance (optional)
          </h2>
          {p.clearance_doc_url ? (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-xs">
              <span className="truncate text-emerald-400">✓ Uploaded</span>
              <button
                type="button"
                onClick={() => setField(activeIdx, "clearance_doc_url", null)}
                className="flex items-center gap-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ) : (
            <label className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background text-xs font-semibold text-muted-foreground hover:border-teal hover:text-teal">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              {uploading ? "Uploading…" : "Upload PDF or image"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(activeIdx, f);
                }}
              />
            </label>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">Sign in required for uploads. You can also add this later from your parent profile.</p>
        </section>

        {/* Insurance */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider">Insurance (optional)</h2>
          <input
            value={p.insurance_provider}
            onChange={(e) => setField(activeIdx, "insurance_provider", e.target.value)}
            placeholder="Provider"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
          />
          <input
            value={p.insurance_policy_number}
            onChange={(e) => setField(activeIdx, "insurance_policy_number", e.target.value)}
            placeholder="Policy #"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
          />
        </section>

        <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
          <ShieldAlert size={11} className="mt-0.5 shrink-0 text-amber-400" />
          Medical info is visible only to verified coaches and emergency personnel — never to other parents.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-[480px]">
          <button
            disabled={!allValid}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-50 disabled:shadow-none"
          >
            Continue to payment <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{children}</span>;
}

function EmergencyFields({
  label, required, value, onChange,
}: {
  label: string;
  required?: boolean;
  value: { name: string; relationship: string; phone: string };
  onChange: (key: "name" | "relationship" | "phone", value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-red-400">*</span>}
      </p>
      <input
        value={value?.name ?? ""}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="Full name"
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={value?.relationship ?? ""}
          onChange={(e) => onChange("relationship", e.target.value)}
          placeholder="Relationship"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
        />
        <input
          value={value?.phone ?? ""}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="Phone"
          inputMode="tel"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
        />
      </div>
    </div>
  );
}