import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Award, Star, Calendar, MessageCircle } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { getPublicCoachProfile } from "@/lib/camps-public.functions";

export const Route = createFileRoute("/coaches/$slug")({
  loader: async ({ params }) => {
    const res = await getPublicCoachProfile({ data: { slug: params.slug } });
    if (!res.profile) throw notFound();
    return res;
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.profile?.full_name ?? "Coach";
    const city = loaderData?.profile?.city ?? "";
    const bio = loaderData?.profile?.bio ?? `Verified hockey coach on the PXF marketplace.`;
    const title = `${name}${city ? ` — ${city}` : ""} | PXF Hockey Coach`;
    const desc = bio.slice(0, 155);
    const url = `https://pxf-hockey-dev.lovable.app/coaches/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name,
          jobTitle: "Hockey Coach",
          address: city ? { "@type": "PostalAddress", addressLocality: city } : undefined,
          description: bio,
        }),
      }],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background px-5 pt-10 text-center text-sm text-muted-foreground">
      Coach not found, or this coach is not in the public marketplace.
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen bg-background px-5 pt-10 text-center text-sm text-muted-foreground">
      Couldn't load coach profile.
    </div>
  ),
  component: CoachPublicProfile,
});

function fmtDate(d: string | null) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CoachPublicProfile() {
  const { slug } = useParams({ from: "/coaches/$slug" });
  const { profile, camps, verified } = Route.useLoaderData();
  const coach = {
    name: profile!.full_name ?? "Coach",
    location: profile!.city ?? "Location TBA",
    credentials: [] as string[],
    bio: profile!.bio ?? "Verified hockey coach on the PXF marketplace.",
    avg: 4.9,
    reviewCount: 0,
  };
  const reviews: Array<{ name: string; stars: number; text: string }> = [];

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-32">
      <Link to="/camps/browse" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Browse coaches
      </Link>

      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-24 w-full bg-gradient-to-br from-teal/30 via-green-400/10 to-transparent" />
        <div className="-mt-10 px-4 pb-4">
          <div className="flex items-end gap-3">
            <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-card bg-teal/20 text-2xl font-bold text-teal">{coach.name.split(" ").map((p: string) => p[0]).join("").slice(0,2).toUpperCase()}</div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-xl font-bold text-foreground">{coach.name}</h1>
                {verified && <VerifiedBadge size="xs" />}
              </div>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin size={11}/> {coach.location} · @{slug}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {coach.reviewCount > 0 ? (
                <>
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="text-sm font-bold text-foreground">{coach.avg}</span>
                  <span className="text-[10px] text-muted-foreground">({coach.reviewCount} reviews)</span>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">New on PXF</span>
              )}
            </div>
            <button className="flex items-center gap-1 rounded-full bg-teal px-4 py-1.5 text-[11px] font-bold text-black">
              <MessageCircle size={12}/> Contact coach
            </button>
          </div>
          {coach.credentials.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {coach.credentials.map((c) => (
                <span key={c} className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-foreground">
                  <Award size={10}/> {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Section title="About">
        <p className="text-xs leading-relaxed text-muted-foreground">{coach.bio}</p>
      </Section>

      <Section title="Active Camps" icon={Calendar}>
        {camps.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No live camps right now. Check back soon.</p>
        ) : (
          <ul className="space-y-2">
            {camps.map((c: typeof camps[number]) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtDate(c.start_date)}{c.end_date && c.end_date !== c.start_date ? `–${fmtDate(c.end_date)}` : ""}
                    {c.venue_name ? ` · ${c.venue_name}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">${(c.price_cents / 100).toFixed(0)}</p>
                  <Link to="/camps/$slug" params={{ slug: c.slug }} className="text-[10px] font-bold text-teal">View →</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Reviews" icon={Star}>
        {reviews.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No reviews yet.</p>
        ) : (
        <ul className="space-y-2">
          {reviews.map((r, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">{r.name}</p>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={10} className={s <= r.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">"{r.text}"</p>
            </li>
          ))}
        </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Star; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
        {Icon && <Icon size={11}/>} {title}
      </h3>
      {children}
    </div>
  );
}