import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Check, Upload, Plus, Trash2, CalendarDays, MapPin, DollarSign, FileText } from "lucide-react";
import { StatusBadge } from "@/components/coach/status-badge";

export const Route = createFileRoute("/_authenticated/coach/camps/new")({
  component: NewCampWizard,
  validateSearch: (s: Record<string, unknown>) => ({
    ice_slot_id: typeof s.ice_slot_id === "string" ? s.ice_slot_id : undefined,
  }),
});

type Format = "camp" | "session";
type LocType = "venue" | "online" | "tba";
type PaymentPlan = "none" | "two" | "three";
type CustomField = { id: string; label: string; field_type: string; required: boolean };

const FIELD_PRESETS = [
  { label: "Position", type: "select", options: "Forward,Defense,Goalie" },
  { label: "Skill Level", type: "select", options: "Beginner,Intermediate,Advanced,Elite" },
  { label: "Jersey Number", type: "text", options: "" },
  { label: "Handedness", type: "select", options: "Left,Right" },
  { label: "Equipment Size", type: "text", options: "" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

function NewCampWizard() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [format, setFormat] = useState<Format>("camp");
  // Step 2
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [description, setDescription] = useState("");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  // Step 3
  const [locationType, setLocationType] = useState<LocType>("venue");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [timezone, setTimezone] = useState("America/New_York");
  // Step 4
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [showRemaining, setShowRemaining] = useState(true);
  const [earlyBird, setEarlyBird] = useState("");
  const [earlyBirdDate, setEarlyBirdDate] = useState("");
  const [siblingDiscount, setSiblingDiscount] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("none");
  const [waiverUrl, setWaiverUrl] = useState("");
  const [fields, setFields] = useState<CustomField[]>([]);
  const [linkedIceSlotId, setLinkedIceSlotId] = useState<string | null>(null);

  useEffect(() => {
    const id = search?.ice_slot_id;
    if (!id) return;
    (async () => {
      const { data: slot } = await (supabase as any)
        .from("ice_slots")
        .select("id, slot_date, start_time, end_time, rink_id, rinks(name, address)")
        .eq("id", id)
        .maybeSingle();
      if (!slot) return;
      setLinkedIceSlotId(slot.id);
      if (slot.slot_date) setStartDate(slot.slot_date);
      if (slot.start_time) setStartTime(String(slot.start_time).slice(0, 5));
      if (slot.end_time) setEndTime(String(slot.end_time).slice(0, 5));
      if (slot.rinks?.name) setVenueName(slot.rinks.name);
      if (slot.rinks?.address) setAddress(slot.rinks.address);
      setLocationType("venue");
    })();
  }, [search?.ice_slot_id]);

  function handleHero(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setHeroFile(f);
    setHeroPreview(URL.createObjectURL(f));
  }

  async function submit(status: "draft" | "live") {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      let hero_image: string | null = null;
      if (heroFile) {
        const path = `${u.user.id}/${Date.now()}-${heroFile.name}`;
        const up = await supabase.storage.from("camp-images").upload(path, heroFile, { upsert: false });
        if (up.error) throw up.error;
        const { data: signed } = await supabase.storage.from("camp-images").createSignedUrl(path, 60 * 60 * 24 * 365);
        hero_image = signed?.signedUrl ?? null;
      }

      const slug = slugify(name);
      const payload = {
        owner_id: u.user.id,
        format,
        name,
        slug,
        description: description || null,
        hero_image,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        featured,
        location_type: locationType,
        venue_name: locationType === "venue" ? venueName || null : null,
        address: locationType === "venue" ? address || null : null,
        start_date: startDate || null,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        timezone,
        price_cents: Math.round(Number(price || 0) * 100),
        capacity: Number(capacity || 0),
        show_remaining: showRemaining,
        early_bird_price_cents: earlyBird ? Math.round(Number(earlyBird) * 100) : null,
        early_bird_expires_at: earlyBirdDate ? new Date(earlyBirdDate).toISOString() : null,
        sibling_discount: siblingDiscount,
        payment_plan: paymentPlan,
        waiver_url: waiverUrl || null,
        status,
      };

      const { data: camp, error } = await supabase.from("camps").insert(payload).select().single();
      if (error) throw error;

      if (fields.length && camp) {
        await supabase.from("camp_custom_fields").insert(
          fields.map((f, i) => ({
            camp_id: camp.id,
            label: f.label,
            field_type: f.field_type,
            required: f.required,
            sort_order: i,
          })),
        );
      }

      if (linkedIceSlotId && camp) {
        const { error: linkErr } = await (supabase as any)
          .from("ice_slots")
          .update({ camp_id: camp.id })
          .eq("id", linkedIceSlotId);
        if (linkErr) {
          alert(`Camp created but ice slot link failed: ${linkErr.message}`);
        }
      }

      navigate({ to: "/coach/camps" });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create camp");
    } finally {
      setBusy(false);
    }
  }

  const steps = ["Format", "Details", "Location", "Registration", "Review"];
  const canNext =
    (step === 1) ||
    (step === 2 && name.trim().length > 0) ||
    (step === 3 && !!startDate) ||
    (step === 4 && !!price && !!capacity) ||
    step === 5;

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={s} className="flex flex-1 items-center gap-1.5">
              <div
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold " +
                  (done ? "bg-gradient-brand text-primary-foreground" : active ? "border border-teal text-teal" : "border border-border text-muted-foreground")
                }
              >
                {done ? <Check size={10} /> : n}
              </div>
              <span className={"hidden text-[10px] font-semibold sm:inline " + (active ? "text-foreground" : "text-muted-foreground")}>
                {s}
              </span>
              {i < steps.length - 1 && <div className={"h-px flex-1 " + (done ? "bg-teal" : "bg-border")} />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-border bg-card p-4">
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-foreground">Choose a format</h2>
            <p className="text-xs text-muted-foreground">This affects how registrations and scheduling work.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { v: "camp" as const, t: "Camp", d: "Multi-day event with a single registration." },
                { v: "session" as const, t: "Training Session", d: "One off/weekly/biweekly\u00a0" },
              ]).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setFormat(opt.v)}
                  className={
                    "rounded-xl border p-4 text-left transition " +
                    (format === opt.v ? "border-teal bg-teal/5" : "border-border bg-surface hover:border-border/80")
                  }
                >
                  <div className="font-display text-sm font-bold text-foreground">{opt.t}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{opt.d}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold text-foreground">Details</h2>
            <Field label="Main camp image">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-3">
                {heroPreview ? (
                  <img src={heroPreview} alt="hero" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-lg bg-card text-muted-foreground">
                    <Upload size={20} />
                  </div>
                )}
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{heroFile?.name ?? "Upload an image"}</p>
                  <p className="text-[11px] text-muted-foreground">Recommended 1200×630</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleHero} />
              </label>
            </Field>
            <Field label="Camp name *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Elite Skating Camp" />
            </Field>
            <Field label="Tags (comma separated)">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="skating, elite, summer" />
            </Field>
            <Toggle label="Featured camp" checked={featured} onChange={setFeatured} />
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="What this camp is about, what athletes will work on…"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold text-foreground">Location & time</h2>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: "venue" as const, t: "Venue" },
                { v: "online" as const, t: "Online" },
                { v: "tba" as const, t: "TBA" },
              ]).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setLocationType(opt.v)}
                  className={
                    "rounded-lg border py-2 text-xs font-semibold " +
                    (locationType === opt.v ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")
                  }
                >
                  {opt.t}
                </button>
              ))}
            </div>
            {locationType === "venue" && (
              <>
                <Field label="Venue name"><Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Westside Ice Arena" /></Field>
                <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="120 Rink Rd, Toronto ON" /></Field>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date *"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              <Field label="End date"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
              <Field label="Start time"><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
              <Field label="End time"><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
            </div>
            <Field label="Timezone">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-teal focus:outline-none"
              >
                <option value="America/New_York">Eastern (NY/Toronto)</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Los_Angeles">Pacific</option>
              </select>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold text-foreground">Registration settings</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (USD) *"><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="499" /></Field>
              <Field label="Available spots *"><Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="24" /></Field>
            </div>
            <Toggle label="Show remaining spots to parents" checked={showRemaining} onChange={setShowRemaining} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Early bird price"><Input type="number" value={earlyBird} onChange={(e) => setEarlyBird(e.target.value)} placeholder="449" /></Field>
              <Field label="Early bird expires"><Input type="date" value={earlyBirdDate} onChange={(e) => setEarlyBirdDate(e.target.value)} /></Field>
            </div>
            <Toggle label="Sibling discount" checked={siblingDiscount} onChange={setSiblingDiscount} />
            <Field label="Payment plan">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: "none" as const, t: "None" },
                  { v: "two" as const, t: "2 installments" },
                  { v: "three" as const, t: "3 installments" },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setPaymentPlan(opt.v)}
                    className={
                      "rounded-lg border py-2 text-[11px] font-semibold " +
                      (paymentPlan === opt.v ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")
                    }
                  >
                    {opt.t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Waiver URL (or upload later)">
              <Input value={waiverUrl} onChange={(e) => setWaiverUrl(e.target.value)} placeholder="https://…" />
            </Field>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Custom fields</span>
                <span className="text-[10px] text-muted-foreground">Collect extra info at registration</span>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {FIELD_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() =>
                      setFields((f) => [...f, { id: crypto.randomUUID(), label: p.label, field_type: p.type, required: false }])
                    }
                    className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-[10px] text-muted-foreground hover:border-teal hover:text-teal"
                  >
                    <Plus size={10} /> {p.label}
                  </button>
                ))}
              </div>
              {fields.length > 0 && (
                <ul className="space-y-1.5">
                  {fields.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
                      <span className="text-foreground">{f.label}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={f.required}
                            onChange={(e) => setFields((arr) => arr.map((x) => (x.id === f.id ? { ...x, required: e.target.checked } : x)))}
                          />
                          Required
                        </label>
                        <button
                          onClick={() => setFields((arr) => arr.filter((x) => x.id !== f.id))}
                          className="text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold text-foreground">Review & publish</h2>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-bold text-foreground">{name || "Untitled camp"}</h3>
                  <p className="text-[11px] text-muted-foreground capitalize">{format} · {locationType === "venue" ? venueName || "Venue TBA" : locationType.toUpperCase()}</p>
                </div>
                <StatusBadge status="draft" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <ReviewRow icon={CalendarDays} label="Dates" value={`${startDate || "—"} → ${endDate || "—"}`} />
                <ReviewRow icon={MapPin} label="Where" value={locationType === "venue" ? venueName || "—" : locationType} />
                <ReviewRow icon={DollarSign} label="Price" value={`$${price || 0}`} />
                <ReviewRow icon={FileText} label="Spots" value={capacity || "0"} />
              </div>
              {description && <p className="mt-3 line-clamp-3 text-[11px] text-muted-foreground">{description}</p>}
              {fields.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {fields.map((f) => (
                    <span key={f.id} className="rounded-full bg-card px-2 py-0.5 text-[10px] text-muted-foreground">{f.label}{f.required && " *"}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => submit("draft")}
                className="flex-1 rounded-full border border-border bg-surface py-2.5 text-xs font-bold text-foreground hover:border-teal disabled:opacity-50"
              >
                Save as draft
              </button>
              <button
                disabled={busy}
                onClick={() => submit("live")}
                className="flex-1 rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      {step < 5 && (
        <div className="flex gap-2">
          <button
            onClick={() => (step === 1 ? navigate({ to: "/coach/camps" }) : setStep(step - 1))}
            className="flex flex-1 items-center justify-center gap-1 rounded-full border border-border bg-surface py-2.5 text-xs font-bold text-foreground"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <button
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-brand py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
          >
            Next <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
    />
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5">
      <span className="text-xs text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={"relative h-5 w-9 rounded-full transition " + (checked ? "bg-teal" : "bg-border")}
      >
        <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-white transition " + (checked ? "left-4" : "left-0.5")} />
      </button>
    </label>
  );
}
function ReviewRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-teal" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-semibold text-foreground">{value}</span>
    </div>
  );
}