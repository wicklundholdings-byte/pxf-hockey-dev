import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRegistrationDraft, type ChildDraft } from "@/hooks/useRegistrationDraft";
import { RegistrationStepper } from "@/components/parent/registration-stepper";
import { ChevronRight, Loader2, Check, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/camps/$slug/register")({
  head: () => ({ meta: [{ title: "Register — PXF Hockey" }] }),
  component: RegisterScreen,
});

type CustomField = { id: string; label: string; field_type: string; options: string[] | null; required: boolean; sort_order: number };
type SavedAthlete = { id: string; full_name: string; birthday: string | null; position: string | null; skill_level: string | null };

const positions = ["Forward", "Defense", "Goalie", "Any"];
const levels = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

function RegisterScreen() {
  const { slug } = useParams({ from: "/camps/$slug/register" });
  const navigate = useNavigate();
  const { draft, update, hydrated } = useRegistrationDraft(slug);
  const { user } = useAuth();
  const [campId, setCampId] = useState<string | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SavedAthlete[]>([]);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("camps")
        .select("id")
        .eq("slug", slug)
        .eq("status", "live")
        .maybeSingle();
      if (c) {
        setCampId(c.id);
        const { data: f } = await supabase
          .from("camp_custom_fields")
          .select("*")
          .eq("camp_id", c.id)
          .order("sort_order");
        setFields((f ?? []) as unknown as CustomField[]);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (campId && draft.campId !== campId) update({ campId });
  }, [campId, draft.campId, update]);

  // Prefill parent info from signed-in profile + load saved athletes
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { data: kids }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        supabase
          .from("attendees")
          .select("id, full_name, birthday, position, skill_level")
          .eq("owner_id", user.id)
          .order("created_at"),
      ]);
      setSaved((kids ?? []) as SavedAthlete[]);
      update({
        parent: {
          full_name: draft.parent.full_name || prof?.full_name || "",
          email: draft.parent.email || prof?.email || user.email || "",
          phone: draft.parent.phone,
        },
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectedIds = new Set(draft.children.map((c) => c.id).filter(Boolean) as string[]);

  function toggleAthlete(a: SavedAthlete) {
    const exists = selectedIds.has(a.id);
    const next = exists
      ? draft.children.filter((c) => c.id !== a.id)
      : [
          ...draft.children,
          {
            id: a.id,
            full_name: a.full_name,
            birthday: a.birthday ?? "",
            position: a.position ?? "",
            skill_level: (a.skill_level ?? "").toLowerCase(),
          },
        ];
    update({ children: next });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/camps/$slug/waiver", params: { slug } });
  }

  if (loading || !hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="animate-spin text-teal" />
      </div>
    );
  }

  const hasPickedAthlete = draft.children.length > 0 && draft.children.every((c) => c.skill_level);
  const manualValid = draft.child.full_name.trim() && draft.child.skill_level;
  const valid =
    draft.parent.full_name.trim() &&
    draft.parent.email.trim() &&
    (hasPickedAthlete || manualValid) &&
    fields.every((f) => !f.required || (draft.customs[f.id] ?? "").toString().trim());

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <RegistrationStepper slug={slug} active={1} backTo={{ to: "/camps/$slug", params: { slug } }} />
      <form onSubmit={submit} className="mx-auto max-w-[480px] space-y-5 px-5 pt-5">
        <header>
          <h1 className="font-display text-2xl font-bold">Tell us about your athlete</h1>
          <p className="mt-1 text-xs text-muted-foreground">We'll use this to set up their spot.</p>
        </header>

        <FormSection title="Your info">
          <Field label="Your name" required value={draft.parent.full_name} onChange={(v) => update({ parent: { ...draft.parent, full_name: v } })} />
          <Field label="Email" type="email" required value={draft.parent.email} onChange={(v) => update({ parent: { ...draft.parent, email: v } })} />
          <Field label="Phone" type="tel" value={draft.parent.phone} onChange={(v) => update({ parent: { ...draft.parent, phone: v } })} />
        </FormSection>

        {saved.length > 0 && (
          <FormSection title={`Your athletes (${saved.length})`}>
            <p className="-mt-1 text-[11px] text-muted-foreground">
              Pick one or both — we'll use the info you've already saved.
            </p>
            <div className="space-y-2">
              {saved.map((a) => {
                const active = selectedIds.has(a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggleAthlete(a)}
                    className={
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors " +
                      (active ? "border-teal bg-teal/10" : "border-border bg-surface hover:border-teal/40")
                    }
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground">
                      {a.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.full_name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[a.position, a.skill_level].filter(Boolean).join(" · ") || "Tap to register"}
                      </p>
                    </div>
                    <div
                      className={
                        "grid h-6 w-6 place-items-center rounded-full border " +
                        (active ? "border-teal bg-teal text-background" : "border-border text-transparent")
                      }
                    >
                      <Check size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
            {!showManual && (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-teal hover:text-teal"
              >
                <Plus size={12} /> Register a new athlete instead
              </button>
            )}
          </FormSection>
        )}

        {draft.children.length > 0 && (
          <FormSection title="Additional info">
            <p className="-mt-1 text-[11px] text-muted-foreground">
              Set position and skill level for each athlete.
            </p>
            <div className="space-y-4">
              {draft.children.map((c, idx) => (
                <div key={c.id ?? idx} className="space-y-3 rounded-2xl border border-border bg-surface p-3">
                  <p className="text-xs font-semibold text-foreground">{c.full_name}</p>
                  <SelectField
                    label="Position"
                    value={c.position}
                    onChange={(v) => {
                      const next = [...draft.children];
                      next[idx] = { ...next[idx], position: v };
                      update({ children: next });
                    }}
                    options={positions}
                  />
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Skill level *</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {levels.map((l) => {
                        const active = c.skill_level === l.id;
                        return (
                          <button
                            type="button"
                            key={l.id}
                            onClick={() => {
                              const next = [...draft.children];
                              next[idx] = { ...next[idx], skill_level: l.id };
                              update({ children: next });
                            }}
                            className={
                              "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors " +
                              (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-background text-muted-foreground")
                            }
                          >
                            {l.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        )}

        {(saved.length === 0 || showManual) && (
        <FormSection title={saved.length === 0 ? "Athlete info" : "New athlete"}>
          <Field label="Child's full name" required value={draft.child.full_name} onChange={(v) => update({ child: { ...draft.child, full_name: v } })} />
          <Field label="Date of birth" type="date" value={draft.child.birthday} onChange={(v) => update({ child: { ...draft.child, birthday: v } })} />
          <SelectField label="Position" value={draft.child.position} onChange={(v) => update({ child: { ...draft.child, position: v } })} options={positions} />
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Skill level *</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {levels.map((l) => {
                const active = draft.child.skill_level === l.id;
                return (
                  <button
                    type="button"
                    key={l.id}
                    onClick={() => update({ child: { ...draft.child, skill_level: l.id } })}
                    className={
                      "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors " +
                      (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")
                    }
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        </FormSection>
        )}

        {fields.length > 0 && (
          <FormSection title="Additional info">
            {fields.map((f) => (
              <CustomFieldInput
                key={f.id}
                field={f}
                value={draft.customs[f.id] ?? ""}
                onChange={(v) => update({ customs: { ...draft.customs, [f.id]: v } })}
              />
            ))}
          </FormSection>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-[480px]">
          <button
            disabled={!valid}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-50 disabled:shadow-none"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}{required && " *"}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
      />
    </label>
  );
}

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function CustomFieldInput({
  field, value, onChange,
}: { field: CustomField; value: string; onChange: (v: string) => void }) {
  if (field.field_type === "textarea") {
    return (
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{field.label}{field.required && " *"}</span>
        <textarea
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 h-20 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
        />
      </label>
    );
  }
  if (field.field_type === "select" && field.options) {
    return <SelectField label={field.label + (field.required ? " *" : "")} value={value} onChange={onChange} options={field.options} />;
  }
  if (field.field_type === "checkbox") {
    return (
      <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
        {field.label}{field.required && " *"}
        <input type="checkbox" checked={value === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "")} className="accent-teal" />
      </label>
    );
  }
  return (
    <Field label={field.label + (field.required ? " *" : "")} value={value} onChange={onChange} type={field.field_type === "number" ? "number" : "text"} />
  );
}