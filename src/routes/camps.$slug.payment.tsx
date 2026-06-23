import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitBooking, previewCoupon } from "@/lib/booking.functions";
import { useRegistrationDraft } from "@/hooks/useRegistrationDraft";
import { RegistrationStepper } from "@/components/parent/registration-stepper";
import { Tag, Loader2, CreditCard, Lock, ChevronDown, Smartphone } from "lucide-react";

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
  const [walletKind, setWalletKind] = useState<"apple" | "google" | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod|Macintosh/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua)) {
      setWalletKind("apple");
    } else if (/Android/i.test(ua)) {
      setWalletKind("google");
    } else {
      setWalletKind(null);
    }
  }, []);

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
    const hasAthlete = draft.children.length > 0 || draft.child.full_name;
    if (!hasAthlete || !draft.parent.email) {
      navigate({ to: "/camps/$slug/register", params: { slug }, replace: true });
    }
  }, [hydrated, submitted, draft.children.length, draft.child.full_name, draft.parent.email, navigate, slug]);

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
  const attendeeCount = Math.max(1, draft.children.length);
  const perAthlete = earlyBird ? camp.early_bird_price_cents! : camp.price_cents;
  const priceCents = perAthlete * attendeeCount;
  const couponFinal = coupon != null ? coupon.finalCents * attendeeCount : null;
  const totalCents = couponFinal ?? priceCents;
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
      const attendeesList = draft.children.length > 0
        ? draft.children.map((c) => ({
            full_name: c.full_name,
            birthday: c.birthday || null,
            position: c.position || null,
            skill_level: c.skill_level || null,
            customFieldValues: draft.customs,
          }))
        : [
            {
              full_name: draft.child.full_name,
              birthday: draft.child.birthday || null,
              position: draft.child.position || null,
              skill_level: draft.child.skill_level || null,
              customFieldValues: draft.customs,
            },
          ];
      const res = await submitBooking({
        data: {
          campId: camp.id,
          parent: { full_name: draft.parent.full_name, email: draft.parent.email, phone: draft.parent.phone || null },
          attendees: attendeesList,
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
        replace: true,
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
            <SummaryRow
              label={draft.children.length > 1 ? "Athletes" : "Athlete"}
              value={draft.children.length > 0 ? draft.children.map((c) => c.full_name).join(", ") : draft.child.full_name}
              muted
            />
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

        {/* Wallet (Apple Pay / Google Pay) */}
        {walletKind && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Smartphone size={12} className="text-teal" /> Express checkout
            </h2>
            <button
              type="button"
              disabled={submitting}
              onClick={pay}
              className={
                "mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold disabled:opacity-60 " +
                (walletKind === "apple"
                  ? "bg-black text-white"
                  : "bg-white text-black border border-border")
              }
            >
              {walletKind === "apple" ? (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.41 2.21-1.23 3.03-.83.84-1.95 1.41-3.03 1.31-.13-1.1.42-2.27 1.18-3.02C14.1 1.91 15.31 1.46 16.365 1.43zM20.5 17.55c-.55 1.27-.81 1.83-1.52 2.95-.98 1.54-2.36 3.46-4.07 3.48-1.52.01-1.91-.99-3.97-.98-2.06.01-2.49.99-4.01.98-1.71-.03-3.02-1.77-4-3.31C.18 16.43-.32 11.34 1.65 8.66c1.4-1.9 3.61-3.02 5.69-3.02 2.12 0 3.45.99 5.2.99 1.7 0 2.73-.99 5.18-.99 1.86 0 3.82 1.01 5.22 2.76-4.6 2.52-3.85 9.09 1.56 11.15z"/></svg>
                  Pay with Apple Pay
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Pay with Google Pay
                </>
              )}
            </button>
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or pay with card <span className="h-px flex-1 bg-border" />
            </div>
          </section>
        )}

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