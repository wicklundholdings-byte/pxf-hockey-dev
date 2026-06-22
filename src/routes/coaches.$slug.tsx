import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Award, Star, Calendar, MessageCircle } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";

export const Route = createFileRoute("/coaches/$slug")({
  head: () => ({
    meta: [
      { title: "Coach Profile — PXF Hockey" },
      { name: "description", content: "Find elite hockey coaches near you." },
    ],
  }),
  component: CoachPublicProfile,
});

function CoachPublicProfile() {
  const { slug } = useParams({ from: "/coaches/$slug" });
  const coach = {
    name: "Marcus Reilly",
    location: "Toronto, ON",
    credentials: ["NCCP Level 3", "Former OHL", "USA Hockey Certified"],
    bio: "10+ years developing competitive players ages 8–17. Specializing in skating mechanics, puck control, and high-IQ offensive systems. Former OHL captain with a player-first coaching philosophy.",
    avg: 4.9,
    reviewCount: 47,
  };
  const camps = [
    { slug: "elite-skills-fall-2025", name: "Elite Skills Camp", date: "Oct 14–18, 2025", price: 420, spots: 4 },
    { slug: "power-skating-nov-2025", name: "Power Skating Intensive", date: "Nov 4–6, 2025", price: 280, spots: 11 },
    { slug: "winter-skills-jan-2026", name: "Winter Skills Clinic", date: "Jan 5–9, 2026", price: 380, spots: 16 },
  ];
  const reviews = [
    { name: "Sarah W.", stars: 5, text: "Best camp my son has ever attended. Coach Marcus genuinely cares." },
    { name: "Linda C.", stars: 5, text: "Mason came home talking about it every night. Worth every penny." },
    { name: "Mike T.", stars: 4, text: "Great energy, very organized. Highly recommend." },
  ];

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-32">
      <Link to="/camps" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Browse coaches
      </Link>

      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-24 w-full bg-gradient-to-br from-teal/30 via-green-400/10 to-transparent" />
        <div className="-mt-10 px-4 pb-4">
          <div className="flex items-end gap-3">
            <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-card bg-teal/20 text-2xl font-bold text-teal">MR</div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-xl font-bold text-foreground">{coach.name}</h1>
                <VerifiedBadge size="xs" />
              </div>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin size={11}/> {coach.location} · @{slug}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-foreground">{coach.avg}</span>
              <span className="text-[10px] text-muted-foreground">({coach.reviewCount} reviews)</span>
            </div>
            <button className="flex items-center gap-1 rounded-full bg-teal px-4 py-1.5 text-[11px] font-bold text-black">
              <MessageCircle size={12}/> Contact coach
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {coach.credentials.map((c) => (
              <span key={c} className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold text-foreground">
                <Award size={10}/> {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Section title="About">
        <p className="text-xs leading-relaxed text-muted-foreground">{coach.bio}</p>
      </Section>

      <Section title="Upcoming Camps" icon={Calendar}>
        <ul className="space-y-2">
          {camps.map((c) => (
            <li key={c.slug} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.date} · {c.spots} spots left</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">${c.price}</p>
                <Link to="/book/$slug" params={{ slug: c.slug }} className="text-[10px] font-bold text-teal">Book →</Link>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Reviews" icon={Star}>
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