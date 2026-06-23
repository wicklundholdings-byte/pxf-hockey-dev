import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPublicCamp } from "@/lib/camps-public.functions";
import { CalendarDays, MapPin, Clock, Users, Share2, ChevronRight, Loader2, Shield } from "lucide-react";
import { VenueMap } from "@/components/venue-map";
import { VerifiedBadge, useCoachVerified } from "@/components/verified-badge";

export const Route = createFileRoute("/camps/$slug/")({
  loader: ({ params }) => getPublicCamp({ data: { slug: params.slug } }),
  head: ({ loaderData, params }) => {
    const camp = loaderData?.camp;
    const title = camp ? `${camp.name} — Register` : `Camp ${params.slug}`;
    const desc =
      camp?.description?.slice(0, 160) ??
      "Sign up your athlete for this hockey camp.";
    const image = camp?.hero_image ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(image ? [{ property: "og:image", content: image }] : []),
      ],
    };
  },
  component: CampPublicPage,
});

function fmtDate(d: string | null | undefined) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtRange(a: string | null | undefined, b: string | null | undefined) {
  if (!a) return "Dates TBA";
  if (!b || a === b) return fmtDate(a);
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}
function fmtTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${m} ${ampm}`;
}
function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function CampPublicPage() {
  const { slug } = useParams({ from: "/camps/$slug/" });
  const { camp, sessions, paidCount } = Route.useLoaderData();
  const [shared, setShared] = useState(false);
  const coachVerified = useCoachVerified((camp as { owner_id?: string } | null)?.owner_id ?? null);

  if (!camp) {
    return (
      <div className="min-h-screen bg-background px-6 py-20 text-center text-foreground">
        <h1 className="font-display text-2xl font-bold">Camp not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This event may have ended or moved.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-gradient-brand px-4 py-2 text-sm font-bold text-primary-foreground">Home</Link>
      </div>
    );
  }

  const earlyBird =
    camp.early_bird_price_cents != null &&
    camp.early_bird_expires_at != null &&
    new Date(camp.early_bird_expires_at) > new Date();
  const priceCents = earlyBird ? camp.early_bird_price_cents! : camp.price_cents;
  const spotsLeft = camp.show_remaining ? Math.max(0, camp.capacity - paidCount) : null;

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: camp!.name, url });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      {/* Hero */}
      <section className="relative">
        <div
          className="h-56 w-full bg-gradient-to-br from-teal/30 to-volt/20"
          style={
            camp.hero_image
              ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${camp.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <div className="mx-auto max-w-[480px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-bold tracking-widest text-teal backdrop-blur">
              <Shield size={10} /> LIVE
            </span>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white drop-shadow">{camp.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/85">
              <span>Hosted by your coach</span>
              {coachVerified && <VerifiedBadge size="xs" />}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[480px] px-5 pt-5">
        {/* Key info */}
        <div className="grid grid-cols-2 gap-2">
          <InfoCell icon={CalendarDays} label="Dates" value={fmtRange(camp.start_date, camp.end_date)} />
          <InfoCell icon={Clock} label="Time" value={camp.start_time ? `${fmtTime(camp.start_time)} – ${fmtTime(camp.end_time)}` : "TBA"} />
          <InfoCell icon={MapPin} label="Location" value={camp.venue_name ?? camp.address ?? "Online"} />
          <InfoCell
            icon={Users}
            label="Spots"
            value={spotsLeft != null ? `${spotsLeft} left` : `${camp.capacity} total`}
            highlight={spotsLeft != null && spotsLeft <= 5}
          />
        </div>

        {(camp.venue_name || camp.address) && (
          <div className="mt-3">
            <VenueMap venueName={camp.venue_name} address={camp.address} />
          </div>
        )}

        {/* Price */}
        <div className="mt-4 flex items-baseline justify-between rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price per athlete</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-foreground">{dollars(priceCents)}</span>
              {earlyBird && (
                <span className="text-xs text-muted-foreground line-through">{dollars(camp.price_cents)}</span>
              )}
            </div>
          </div>
          {earlyBird && (
            <span className="rounded-full bg-volt/15 px-2 py-1 text-[10px] font-bold tracking-wider text-volt">EARLY BIRD</span>
          )}
        </div>

        {/* Description */}
        {camp.description && (
          <Section title="About this camp">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{camp.description}</p>
          </Section>
        )}

        {/* Schedule */}
        {sessions.length > 0 && (
          <Section title="Daily schedule">
            <ul className="space-y-2">
              {sessions.map((s: { id: string; session_date: string; start_time: string | null; end_time: string | null; }, i: number) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Day {i + 1}</p>
                    <p className="text-sm font-semibold">{fmtDate(s.session_date)}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {s.start_time ? `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Coach bio (placeholder copy until profile wired) */}
        <Section title="About your coach">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal/40 to-volt/30 text-sm font-bold text-foreground">
              PXF
            </div>
            <div>
              <p className="text-sm font-semibold">PXF Hockey Coaching Staff</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Elite-level development for skating, puck control and hockey IQ. Trusted by hundreds of families.
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[480px] items-center gap-2">
          <button
            onClick={share}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 text-xs font-semibold"
          >
            <Share2 size={14} /> {shared ? "Copied!" : "Share"}
          </button>
          <Link
            to="/camps/$slug/register"
            params={{ slug }}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow-teal"
          >
            Register Now <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={"rounded-2xl border bg-card p-3 " + (highlight ? "border-volt/40" : "border-border")}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon size={11} className="text-teal" /> {label}
      </div>
      <p className={"mt-1 text-sm font-semibold " + (highlight ? "text-volt" : "text-foreground")}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-foreground">{title}</h2>
      <div className="mt-2 rounded-2xl border border-border bg-card p-4">{children}</div>
    </section>
  );
}

// Avoid unused-import lint when Loader2 is not used inline
export const _spinner = Loader2;