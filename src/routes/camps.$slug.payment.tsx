import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitBooking, previewCoupon } from "@/lib/booking.functions";
import { useRegistrationDraft } from "@/hooks/useRegistrationDraft";
import { RegistrationStepper } from "@/components/parent/registration-stepper";
import { Tag, Loader2, CreditCard, Lock, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/camps/$slug/payment")({
  head: () => ({ meta: [{ title: "Payment — PXF Hockey" }] }),
  component: PaymentScreen,
});

type Camp = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  price_cents: number;
  early_bird_price_cents: number | null;
  early_bird_expires_at: string | null;
  payment_plan: "none" | "two" | "three";
  waiver_required: boolean;
  waiver_text: string | null;
};

function dollars(c: number) {
  return `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function PaymentScreen() {
  const { slug } = useParams({ from: "/camps/$slug/payment" });
  const navigate = useNavigate();
  const { draft, update, clear, hydrated } = useRegistrationDraft(slug);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoOpen, setPromoOpen] = useState(false);
  const [couponInput, setCouponInput] = useState(draft.couponCode ?? "");
  const [coupon, setCoupon] = useState<{ baseCents: number; discountCents: number; finalCents: number; label: string } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("camps")
        .select("id, name, start_date, end_date, price_cents, early_bird_price_cents, early_bird_expires_at, payment_plan, waiver_required, waiver_text")
        .eq("slug", slug)
        .eq("status", "live")
        .maybeSingle();
      setCamp((data as Camp | null) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  // Guard: must have draft data
  useEffect(() => {
    if (!hydrated) return;
    if (submitted || submittedRef.current) return;
    if (!draft.child.full_name || !draft.parent.email) {
      navigate({ to: "/camps/$slug/register", params: { slug }, replace: true });
    }
  }, [hydrated, submitted, draft.child.full_name, draft.parent.email, navigate, slug]);

  if (loading || !camp || !hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="animate-spin text-teal" />
      </div>
    );
  }

  const earlyBird =
    camp.early_bird_price_cents != null &&
    camp.early_bird_expires_at != null &&
    new Date(camp.early_bird_expires_at) > new Date();
  const priceCents = earlyBird ? camp.early_bird_price_cents! : camp.price_cents;
  const totalCents = coupon?.finalCents ?? priceCents;
  const depositCents = camp.payment_plan === "two" ? Math.round(totalCents * 0.25) : Math.round(totalCents / 3);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponErr(null);
    try {
      const r = await previewCoupon({ data: { campId: camp!.id, code: couponInput.trim() } });
      if (r.ok) {
        setCoupon({ baseCents: r.baseCents, discountCents: r.discountCents, finalCents: r.finalCents, label: r.label });
        update({ couponCode: couponInput.trim() });
      } else {
        setCouponErr(r.error ?? "Invalid code");
      }
    } catch (e) {
      setCouponErr(e instanceof Error ? e.message : "Could not check code");
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function pay() {
    if (!camp) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitBooking({
        data: {
          campId: camp.id,
          parent: { full_name: draft.parent.full_name, email: draft.parent.email, phone: draft.parent.phone || null },
          attendees: [
            {
              full_name: draft.child.full_name,
              birthday: draft.child.birthday || null,
              position: draft.child.position || null,
              skill_level: draft.child.skill_level || null,
              customFieldValues: draft.customs,
            },
          ],
          couponCode: draft.couponCode || null,
          paymentPlan: draft.paymentPlan,
          waiver: camp.waiver_required && draft.waiver
            ? {
                signer_name: draft.waiver.signer_name,
                signature_method: "typed",
                signature_data: draft.waiver.signer_name,
                waiver_text_snapshot: (camp.waiver_text ?? "").slice(0, 49000) || "Standard waiver agreed.",
              }
            : null,
        },
      });
      submittedRef.current = true;
      setSubmitted(true);
      navigate({
        to: "/camps/$slug/confirmed",
        params: { slug },
        search: {
          kind: res.kind,
          amount: String("amountCents" in res ? res.amountCents : 0),
          plan: draft.paymentPlan,
        },
      });
      clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <RegistrationStepper slug={slug} active={3} backTo={{ to: "/camps/$slug/waiver", params: { slug } }} />
      <div className="mx-auto max-w-[480px] space-y-4 px-5 pt-5">
        <header>
          <h1 className="font-display text-2xl font-bold">Review & pay</h1>
          <p className="mt-1 text-xs text-muted-foreground">Secure checkout, instant confirmation.</p>
        </header>

        {/* Payment plan picker */}
        {camp.payment_plan !== "none" && (
          <div className="grid grid-cols-2 gap-2">
            <PlanCard
              active={draft.paymentPlan === "none"}
              onClick={() => update({ paymentPlan: "none" })}
              title="Pay in full"
              amount={dollars(totalCents)}
              caption="One payment, done"
            />
            <PlanCard
              active={draft.paymentPlan !== "none"}
              onClick={() => update({ paymentPlan: camp.payment_plan })}
              title="Pay deposit"
              amount={dollars(depositCents)}
              caption={`${dollars(totalCents - depositCents)} due later`}
            />
          </div>
        )}

        {/* Order summary */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider">Order summary</h2>
          <div className="mt-3 space-y-2 text-sm">
            <SummaryRow label={camp.name} value={dollars(priceCents)} />
            <SummaryRow label={`Dates`} value={`${fmtDate(camp.start_date)}${camp.end_date && camp.end_date !== camp.start_date ? ` – ${fmtDate(camp.end_date)}` : ""}`} muted />
            <SummaryRow label="Athlete" value={draft.child.full_name} muted />
            {coupon && (
              <SummaryRow label={`Promo ${coupon.label}`} value={`–${dollars(coupon.discountCents)}`} accent />
            )}
            <div className="my-2 h-px bg-border" />
            {draft.paymentPlan === "none" ? (
              <SummaryRow label="Total today" value={dollars(totalCents)} bold />
            ) : (
              <>
                <SummaryRow label="Due today" value={dollars(depositCents)} bold />
                <SummaryRow label="Balance" value={dollars(totalCents - depositCents)} muted />
              </>
            )}
          </div>
        </section>

        {/* Promo code */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <button
            type="button"
            onClick={() => setPromoOpen((o) => !o)}
            className="flex w-full items-center justify-between text-sm font-semibold"
          >
            <span className="flex items-center gap-2"><Tag size={14} className="text-teal" /> Have a promo code?</span>
            <ChevronDown size={16} className={"text-muted-foreground transition-transform " + (promoOpen ? "rotate-180" : "")} />
          </button>
          {promoOpen && (
            <div className="mt-3 flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Enter code"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase tracking-wider outline-none focus:border-teal"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={checkingCoupon || !couponInput.trim()}
                className="rounded-xl bg-gradient-brand px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {checkingCoupon ? "…" : "Apply"}
              </button>
            </div>
          )}
          {couponErr && <p className="mt-2 text-[11px] text-destructive">{couponErr}</p>}
        </section>

        {/* Payment form (placeholder; mirrors current booking flow) */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={12} className="text-teal" /> Payment details
            </h2>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Lock size={10} /> Secure</span>
          </div>
          <div className="mt-3 space-y-2">
            <input
              placeholder="Card number"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal"
              defaultValue="4242 4242 4242 4242"
            />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="MM / YY" defaultValue="12 / 28" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal" />
              <input placeholder="CVC" defaultValue="123" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-teal" />
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">Demo payment — no card will be charged.</p>
        </section>

        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          By paying you confirm the <Link to="/camps/$slug/waiver" params={{ slug }} className="text-teal underline">waiver agreement</Link>.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-[480px]">
          <button
            disabled={submitting}
            onClick={pay}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? "Processing…" : `Pay ${dollars(draft.paymentPlan === "none" ? totalCents : depositCents)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  active, onClick, title, amount, caption,
}: { active: boolean; onClick: () => void; title: string; amount: string; caption: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-2xl border bg-card p-4 text-left transition-colors " +
        (active ? "border-teal shadow-glow-teal" : "border-border")
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 font-display text-xl font-bold">{amount}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{caption}</p>
    </button>
  );
}

function SummaryRow({
  label, value, muted, bold, accent,
}: { label: string; value: string; muted?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-xs text-muted-foreground" : "text-sm"}>{label}</span>
      <span className={(bold ? "font-display text-lg font-bold " : "text-sm font-semibold ") + (accent ? "text-volt" : muted ? "text-muted-foreground" : "")}>
        {value}
      </span>
    </div>
  );
}