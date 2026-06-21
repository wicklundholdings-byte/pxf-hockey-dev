import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitBooking, previewCoupon } from "@/lib/booking.functions";
import { Calendar, MapPin, Clock, Users, CheckCircle2, Loader2, Tag, X, PenLine, Type as TypeIcon, FileText, Plus, Trash2, CalendarClock } from "lucide-react";


export const Route = createFileRoute("/book/$slug")({
  component: BookingPage,
  head: ({ params }) => ({
    meta: [
      { title: `Register — ${params.slug}` },
      { name: "description", content: "Sign up for this hockey camp." },
    ],
  }),
});

type Camp = {
  id: string; name: string; slug: string; description: string | null;
  hero_image: string | null; venue_name: string | null; address: string | null;
  location_type: string; start_date: string | null; end_date: string | null;
  start_time: string | null; end_time: string | null;
  price_cents: number; early_bird_price_cents: number | null;
  early_bird_expires_at: string | null; capacity: number; show_remaining: boolean;
  status: string;
  waiver_required: boolean;
  waiver_text: string | null;
  sibling_discount: boolean;
  sibling_discount_percent: number;
  payment_plan: "none" | "two" | "three";
};
type Field = { id: string; label: string; field_type: string; options: string[] | null; required: boolean; sort_order: number };

function fmt(d: string | null) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function BookingPage() {
  const { slug } = useParams({ from: "/book/$slug" });
  const [camp, setCamp] = useState<Camp | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [paidCount, setPaidCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [parent, setParent] = useState({ full_name: "", email: "", phone: "" });
  type AthleteForm = { full_name: string; birthday: string; position: string; skill_level: string; handedness: string; jersey_number: string; customs: Record<string, string> };
  const blankAthlete = (): AthleteForm => ({ full_name: "", birthday: "", position: "", skill_level: "", handedness: "", jersey_number: "", customs: {} });
  const [athletes, setAthletes] = useState<AthleteForm[]>([blankAthlete()]);
  const [paymentPlan, setPaymentPlan] = useState<"none" | "two" | "three">("none");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { kind: "registered"; amountCents: number; count: number; paymentPlan: "none" | "two" | "three" }
    | { kind: "waitlisted"; count: number }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ baseCents: number; discountCents: number; finalCents: number; label: string } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [waiverAgree, setWaiverAgree] = useState(false);
  const [waiverMode, setWaiverMode] = useState<"drawn" | "typed">("drawn");
  const [waiverTyped, setWaiverTyped] = useState("");
  const [waiverDrawn, setWaiverDrawn] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("camps")
        .select("*")
        .eq("slug", slug)
        .eq("status", "live")
        .maybeSingle();
      if (c) {
        const [{ data: f }, { count }] = await Promise.all([
          supabase.from("camp_custom_fields").select("*").eq("camp_id", c.id).order("sort_order"),
          supabase.from("registrations").select("id", { count: "exact", head: true }).eq("camp_id", c.id).eq("status", "paid"),
        ]);
        setFields((f ?? []) as unknown as Field[]);
        setPaidCount(count ?? 0);
      }
      setCamp((c ?? null) as Camp | null);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-16 text-center">
        <Loader2 className="mx-auto animate-spin text-teal" />
      </div>
    );
  }
  if (!camp) {
    return (
      <div className="min-h-screen bg-background px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Camp not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This event may have ended or moved.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-teal px-4 py-2 text-sm font-bold text-black">Home</Link>
      </div>
    );
  }

  const earlyBird =
    camp.early_bird_price_cents != null &&
    camp.early_bird_expires_at != null &&
    new Date(camp.early_bird_expires_at) > new Date();
  const price = earlyBird ? camp.early_bird_price_cents! : camp.price_cents;
  const spotsLeft = Math.max(0, camp.capacity - paidCount);
  const isFull = spotsLeft < athletes.length;
  const siblingPct = camp.sibling_discount ? (camp.sibling_discount_percent ?? 0) : 0;

  // Per-child base after sibling discount (children #2+)
  const childBases = athletes.map((_, i) =>
    i === 0 || siblingPct === 0 ? price : Math.max(0, price - Math.round((price * siblingPct) / 100)),
  );
  const subtotal = childBases.reduce((a, b) => a + b, 0);
  const couponDiscount = coupon
    ? childBases.reduce((sum, base) => {
        const off = coupon.baseCents === 0 ? 0 : Math.round((base / coupon.baseCents) * coupon.discountCents);
        return sum + off;
      }, 0)
    : 0;
  const totalCents = Math.max(0, subtotal - couponDiscount);
  const installments = paymentPlan === "two" ? 2 : paymentPlan === "three" ? 3 : 1;
  const installmentAmount = Math.ceil(totalCents / installments);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const waiverPayload =
        camp!.waiver_required && camp!.waiver_text
          ? {
              signer_name: parent.full_name,
              signature_method: waiverMode,
              signature_data: waiverMode === "typed" ? waiverTyped.trim() : (waiverDrawn ?? ""),
              waiver_text_snapshot: camp!.waiver_text,
            }
          : null;
      const res = await submitBooking({
        data: {
          campId: camp!.id,
          parent,
          attendees: athletes.map((a) => ({
            full_name: a.full_name,
            birthday: a.birthday,
            position: a.position,
            skill_level: a.skill_level,
            handedness: a.handedness,
            jersey_number: a.jersey_number,
            customFieldValues: a.customs,
          })),
          couponCode: coupon ? couponCode : null,
          paymentPlan,
          waiver: waiverPayload,
        },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function applyCoupon() {
    if (!camp || !couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponErr(null);
    try {
      const res = await previewCoupon({ data: { campId: camp.id, code: couponCode.trim() } });
      if (res.ok) {
        setCoupon({ baseCents: res.baseCents, discountCents: res.discountCents, finalCents: res.finalCents, label: res.label });
      } else {
        setCoupon(null);
        setCouponErr(res.error);
      }
    } finally {
      setCheckingCoupon(false);
    }
  }

  function clearCoupon() {
    setCoupon(null);
    setCouponCode("");
    setCouponErr(null);
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background px-5 py-12">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-400/15">
            <CheckCircle2 className="text-emerald-400" size={28} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
            {result.kind === "registered" ? "You're in!" : "Added to waitlist"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.kind === "registered"
              ? result.count > 1
                ? `We've reserved ${result.count} spots. Check ${parent.email} for payment instructions.`
                : `We've reserved a spot for ${athletes[0].full_name}. Check ${parent.email} for payment instructions.`
              : `${camp.name} is full. We'll email ${parent.email} the moment a spot opens up.`}
          </p>
          {result.kind === "registered" && (
            <>
              <p className="mt-4 text-3xl font-bold text-teal">${(result.amountCents / 100).toFixed(0)}</p>
              {result.paymentPlan !== "none" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {result.paymentPlan === "two" ? "2" : "3"} monthly installments scheduled.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Hero */}
      <div className="relative">
        {camp.hero_image ? (
          <img src={camp.hero_image} alt={camp.name} className="h-48 w-full object-cover" />
        ) : (
          <div className="h-32 w-full bg-gradient-to-br from-teal/30 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="mx-auto -mt-16 max-w-md px-5">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-xl">
          <h1 className="font-display text-2xl font-bold text-foreground">{camp.name}</h1>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Pill icon={Calendar} text={`${fmt(camp.start_date)} → ${fmt(camp.end_date)}`} />
            <Pill icon={Clock} text={camp.start_time ? `${camp.start_time.slice(0, 5)}–${camp.end_time?.slice(0, 5) ?? ""}` : "TBA"} />
            <Pill icon={MapPin} text={camp.venue_name ?? (camp.location_type === "online" ? "Online" : "TBA")} />
            <Pill icon={Users} text={camp.show_remaining ? `${spotsLeft} spots left` : `${camp.capacity} spots`} />
          </div>
          {camp.description && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{camp.description}</p>
          )}
          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{earlyBird ? "Early bird" : "Price"}</p>
              <p className="font-display text-3xl font-bold text-teal">${(price / 100).toFixed(0)}</p>
              {earlyBird && (
                <p className="text-[10px] text-muted-foreground line-through">${(camp.price_cents / 100).toFixed(0)}</p>
              )}
            </div>
            {isFull && (
              <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase text-amber-400">
                Waitlist only
              </span>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-6 flex justify-center gap-2">
          {(camp.waiver_required ? [1, 2, 3, 4] : [1, 2, 3]).map((s) => (
            <div key={s} className={"h-1.5 w-12 rounded-full " + (s <= step ? "bg-teal" : "bg-surface")} />
          ))}
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">Parent / Guardian</h2>
              <Input label="Full name" value={parent.full_name} onChange={(v) => setParent({ ...parent, full_name: v })} />
              <Input label="Email" type="email" value={parent.email} onChange={(v) => setParent({ ...parent, email: v })} />
              <Input label="Phone (optional)" type="tel" value={parent.phone} onChange={(v) => setParent({ ...parent, phone: v })} />
              <button
                disabled={!parent.full_name || !parent.email}
                onClick={() => setStep(2)}
                className="mt-4 w-full rounded-full bg-teal py-3 text-sm font-bold text-black disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">Athlete details</h2>
              {athletes.map((a, idx) => (
                <div key={idx} className="space-y-2 rounded-2xl border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                      Child {idx + 1}
                      {idx > 0 && siblingPct > 0 && (
                        <span className="ml-2 rounded-full bg-teal/15 px-2 py-0.5 text-[9px] text-teal">
                          {siblingPct}% sibling off
                        </span>
                      )}
                    </span>
                    {athletes.length > 1 && (
                      <button
                        onClick={() => setAthletes(athletes.filter((_, i) => i !== idx))}
                        className="text-muted-foreground"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <Input label="Player name" value={a.full_name} onChange={(v) => setAthletes(athletes.map((x, i) => i === idx ? { ...x, full_name: v } : x))} />
                  <Input label="Birthday" type="date" value={a.birthday} onChange={(v) => setAthletes(athletes.map((x, i) => i === idx ? { ...x, birthday: v } : x))} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Position" value={a.position} onChange={(v) => setAthletes(athletes.map((x, i) => i === idx ? { ...x, position: v } : x))} />
                    <Input label="Skill level" value={a.skill_level} onChange={(v) => setAthletes(athletes.map((x, i) => i === idx ? { ...x, skill_level: v } : x))} />
                    <Input label="Handedness" value={a.handedness} onChange={(v) => setAthletes(athletes.map((x, i) => i === idx ? { ...x, handedness: v } : x))} />
                    <Input label="Jersey #" value={a.jersey_number} onChange={(v) => setAthletes(athletes.map((x, i) => i === idx ? { ...x, jersey_number: v } : x))} />
                  </div>
                </div>
              ))}
              {athletes.length < 6 && (
                <button
                  onClick={() => setAthletes([...athletes, blankAthlete()])}
                  className="flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-surface py-3 text-xs font-semibold text-teal"
                >
                  <Plus size={14} /> Add another child{camp.sibling_discount && siblingPct > 0 ? ` (${siblingPct}% sibling discount)` : ""}
                </button>
              )}
              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-foreground">
                  Back
                </button>
                <button
                  disabled={athletes.some((a) => !a.full_name.trim())}
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-full bg-teal py-3 text-sm font-bold text-black disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-foreground">Review & confirm</h2>
              {fields.length > 0 && athletes.map((a, idx) => (
                <div key={idx} className="space-y-2 rounded-2xl border border-border bg-surface p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal">
                    {a.full_name || `Child ${idx + 1}`} — extra info
                  </p>
                  {fields.map((f) => (
                    <div key={f.id}>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {f.label}{f.required && <span className="text-amber-400"> *</span>}
                      </label>
                      {f.field_type === "select" && f.options ? (
                        <select
                          value={a.customs[f.id] ?? ""}
                          onChange={(e) => setAthletes(athletes.map((x, i) => i === idx ? { ...x, customs: { ...x.customs, [f.id]: e.target.value } } : x))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                          <option value="">—</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.field_type === "number" ? "number" : "text"}
                          value={a.customs[f.id] ?? ""}
                          onChange={(e) => setAthletes(athletes.map((x, i) => i === idx ? { ...x, customs: { ...x.customs, [f.id]: e.target.value } } : x))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}

              <div className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-3 text-xs">
                <Row k="Parent" v={parent.full_name} />
                <Row k="Email" v={parent.email} />
                {athletes.map((a, i) => (
                  <Row
                    key={i}
                    k={a.full_name || `Child ${i + 1}`}
                    v={`$${(childBases[i] / 100).toFixed(0)}${i > 0 && siblingPct > 0 ? ` (−${siblingPct}%)` : ""}`}
                  />
                ))}
                {!isFull && athletes.length > 1 && (
                  <Row k="Subtotal" v={`$${(subtotal / 100).toFixed(0)}`} />
                )}
                {!isFull && coupon && (
                  <Row k={`Coupon (${coupon.label})`} v={`-$${(couponDiscount / 100).toFixed(0)}`} />
                )}
                <Row
                  k={isFull ? "Status" : "Total"}
                  v={isFull ? "Waitlist" : `$${(totalCents / 100).toFixed(0)}`}
                  highlight
                />
              </div>

              {!isFull && camp.payment_plan !== "none" && (
                <div className="rounded-2xl border border-border bg-surface p-3">
                  <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <CalendarClock size={11} /> Payment plan
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { v: "none" as const, label: "Pay in full" },
                      camp.payment_plan === "two" || camp.payment_plan === "three" ? { v: "two" as const, label: "2 payments" } : null,
                      camp.payment_plan === "three" ? { v: "three" as const, label: "3 payments" } : null,
                    ].filter(Boolean) as { v: "none" | "two" | "three"; label: string }[]).map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => setPaymentPlan(opt.v)}
                        className={"rounded-lg border px-2 py-2 text-[10px] font-semibold " +
                          (paymentPlan === opt.v ? "border-teal bg-teal/10 text-teal" : "border-border bg-background text-muted-foreground")}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {paymentPlan !== "none" && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      ≈ ${(installmentAmount / 100).toFixed(0)} due today, then {installments - 1} monthly {installments - 1 === 1 ? "payment" : "payments"}.
                    </p>
                  )}
                </div>
              )}

              {!isFull && (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-3">
                  <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Tag size={11} /> Promo code
                  </label>
                  {coupon ? (
                    <div className="flex items-center justify-between rounded-xl bg-teal/10 px-3 py-2">
                      <span className="text-xs font-semibold text-teal">{couponCode.toUpperCase()} · {coupon.label}</span>
                      <button onClick={clearCoupon} className="text-teal"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="SUMMER20"
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground uppercase placeholder:text-muted-foreground/60 placeholder:normal-case"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={checkingCoupon || !couponCode.trim()}
                        className="rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background disabled:opacity-40"
                      >
                        {checkingCoupon ? "…" : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponErr && <p className="mt-1 text-[11px] text-red-400">{couponErr}</p>}
                </div>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-foreground">
                  Back
                </button>
                <button
                  onClick={() => {
                    if (camp.waiver_required && !isFull) {
                      setStep(4);
                    } else {
                      handleSubmit();
                    }
                  }}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-teal py-3 text-sm font-bold text-black disabled:opacity-40"
                >
                  {submitting
                    ? "Submitting…"
                    : isFull
                      ? "Join waitlist"
                      : camp.waiver_required
                        ? "Continue to waiver"
                        : "Confirm"}
                </button>
              </div>
            </div>
          )}

          {step === 4 && camp.waiver_required && (
            <WaiverStep
              waiverText={camp.waiver_text ?? ""}
              signerName={parent.full_name}
              agree={waiverAgree}
              setAgree={setWaiverAgree}
              mode={waiverMode}
              setMode={setWaiverMode}
              typed={waiverTyped}
              setTyped={setWaiverTyped}
              drawn={waiverDrawn}
              setDrawn={setWaiverDrawn}
              onBack={() => setStep(3)}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">Powered by PXF Hockey</p>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, text }: { icon: typeof Calendar; text: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface px-2.5 py-2">
      <Icon size={11} className="text-teal" />
      <span className="truncate text-[11px] text-foreground">{text}</span>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
      />
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={"font-semibold " + (highlight ? "text-teal" : "text-foreground")}>{v}</span>
    </div>
  );
}

function WaiverStep({
  waiverText, signerName, agree, setAgree, mode, setMode, typed, setTyped, drawn, setDrawn,
  onBack, onSubmit, submitting, error,
}: {
  waiverText: string; signerName: string;
  agree: boolean; setAgree: (v: boolean) => void;
  mode: "drawn" | "typed"; setMode: (m: "drawn" | "typed") => void;
  typed: string; setTyped: (v: string) => void;
  drawn: string | null; setDrawn: (v: string | null) => void;
  onBack: () => void; onSubmit: () => void; submitting: boolean; error: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function clearCanvas() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setDrawn(null);
  }

  const hasSignature = mode === "typed" ? typed.trim().length > 0 : !!drawn;
  const canSubmit = agree && hasSignature && !submitting;

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
        <FileText size={16} className="text-teal" /> Liability waiver
      </h2>
      <div className="max-h-44 overflow-y-auto rounded-2xl border border-border bg-surface p-3 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {waiverText || "No waiver text provided."}
      </div>

      <label className="flex items-start gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>I have read and agree to the terms of this waiver on behalf of {signerName || "the athlete"}.</span>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("drawn")}
          className={"flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold " +
            (mode === "drawn" ? "bg-teal text-background" : "border border-border text-muted-foreground")}
        >
          <PenLine size={14} /> Draw
        </button>
        <button
          type="button"
          onClick={() => setMode("typed")}
          className={"flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold " +
            (mode === "typed" ? "bg-teal text-background" : "border border-border text-muted-foreground")}
        >
          <TypeIcon size={14} /> Type
        </button>
      </div>

      {mode === "drawn" ? (
        <div className="space-y-1">
          <canvas
            ref={canvasRef}
            width={600}
            height={160}
            className="w-full rounded-2xl border border-border bg-surface touch-none"
            onPointerDown={(e) => {
              drawing.current = true;
              const ctx = canvasRef.current!.getContext("2d")!;
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.lineCap = "round";
              const { x, y } = pos(e);
              ctx.beginPath();
              ctx.moveTo(x, y);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const ctx = canvasRef.current!.getContext("2d")!;
              const { x, y } = pos(e);
              ctx.lineTo(x, y);
              ctx.stroke();
            }}
            onPointerUp={() => {
              drawing.current = false;
              const c = canvasRef.current;
              if (c) setDrawn(c.toDataURL("image/png"));
            }}
            onPointerLeave={() => { drawing.current = false; }}
          />
          <button onClick={clearCanvas} className="text-[10px] font-semibold text-muted-foreground">Clear</button>
        </div>
      ) : (
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type your full legal name"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-5 text-center font-display text-xl italic text-foreground"
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button onClick={onBack} className="flex-1 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-foreground">
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex-1 rounded-full bg-teal py-3 text-sm font-bold text-black disabled:opacity-40"
        >
          {submitting ? "Submitting…" : "Sign & confirm"}
        </button>
      </div>
    </div>
  );
}