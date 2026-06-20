import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitBooking } from "@/lib/booking.functions";
import { Calendar, MapPin, Clock, Users, CheckCircle2, Loader2 } from "lucide-react";

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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [parent, setParent] = useState({ full_name: "", email: "", phone: "" });
  const [attendee, setAttendee] = useState({ full_name: "", birthday: "", position: "", skill_level: "", handedness: "", jersey_number: "" });
  const [customs, setCustoms] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ kind: "registered" | "waitlisted"; amountCents?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const isFull = spotsLeft === 0;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitBooking({
        data: {
          campId: camp!.id,
          parent,
          attendee,
          customFieldValues: customs,
        },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
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
              ? `We've reserved a spot for ${attendee.full_name}. Check ${parent.email} for payment instructions.`
              : `${camp.name} is full. We'll email ${parent.email} the moment a spot opens up.`}
          </p>
          {result.kind === "registered" && result.amountCents != null && (
            <p className="mt-4 text-3xl font-bold text-teal">${(result.amountCents / 100).toFixed(0)}</p>
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
          {[1, 2, 3].map((s) => (
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
              <Input label="Player name" value={attendee.full_name} onChange={(v) => setAttendee({ ...attendee, full_name: v })} />
              <Input label="Birthday" type="date" value={attendee.birthday} onChange={(v) => setAttendee({ ...attendee, birthday: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Position" value={attendee.position} onChange={(v) => setAttendee({ ...attendee, position: v })} />
                <Input label="Skill level" value={attendee.skill_level} onChange={(v) => setAttendee({ ...attendee, skill_level: v })} />
                <Input label="Handedness" value={attendee.handedness} onChange={(v) => setAttendee({ ...attendee, handedness: v })} />
                <Input label="Jersey #" value={attendee.jersey_number} onChange={(v) => setAttendee({ ...attendee, jersey_number: v })} />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-foreground">
                  Back
                </button>
                <button
                  disabled={!attendee.full_name}
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
              {fields.length > 0 && (
                <div className="space-y-3">
                  {fields.map((f) => (
                    <div key={f.id}>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {f.label}{f.required && <span className="text-amber-400"> *</span>}
                      </label>
                      {f.field_type === "select" && f.options ? (
                        <select
                          value={customs[f.id] ?? ""}
                          onChange={(e) => setCustoms({ ...customs, [f.id]: e.target.value })}
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                        >
                          <option value="">—</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.field_type === "number" ? "number" : "text"}
                          value={customs[f.id] ?? ""}
                          onChange={(e) => setCustoms({ ...customs, [f.id]: e.target.value })}
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-3 text-xs">
                <Row k="Parent" v={parent.full_name} />
                <Row k="Email" v={parent.email} />
                <Row k="Athlete" v={attendee.full_name} />
                <Row k={isFull ? "Status" : "Total"} v={isFull ? "Waitlist" : `$${(price / 100).toFixed(0)}`} highlight />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-foreground">
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-teal py-3 text-sm font-bold text-black disabled:opacity-40"
                >
                  {submitting ? "Submitting…" : isFull ? "Join waitlist" : "Confirm"}
                </button>
              </div>
            </div>
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