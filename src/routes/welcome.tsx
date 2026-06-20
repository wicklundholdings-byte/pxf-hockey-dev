import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Star, Zap, CalendarDays, MessageSquare, ShoppingBag, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "PXF Hockey — The Complete Hockey Coaching Platform" },
      { name: "description", content: "Training tools, camp management, team communication and more — built for elite hockey." },
      { property: "og:title", content: "PXF Hockey — The Complete Hockey Coaching Platform" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <p className="font-display text-xl font-bold tracking-tight">PXF<span className="text-teal">.</span></p>
        <nav className="hidden gap-6 text-xs text-muted-foreground md:flex">
          <a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#testimonials">Coaches</a>
        </nav>
        <Link to="/auth" className="rounded-lg bg-teal px-3 py-2 text-xs font-bold text-background">Sign In</Link>
      </header>

      {/* Hero */}
      <section className="px-6 py-16 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal">PXF Hockey</p>
        <h1 className="mt-3 font-display text-4xl font-bold md:text-6xl">The Complete Hockey Coaching Platform</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
          Training tools, camp management, team communication, and a store — all in one place for coaches and parents.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/onboarding" className="flex items-center gap-2 rounded-xl bg-teal px-6 py-3 text-sm font-bold text-background">Coach Sign Up <ArrowRight size={14} /></Link>
          <Link to="/camps/browse" className="rounded-xl border border-border px-6 py-3 text-sm font-bold">Find a Camp</Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border px-6 py-16">
        <h2 className="text-center font-display text-3xl font-bold">Built for the entire game</h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, t: "Training Tools", d: "Drill library, sessions, builder, GameIQ." },
            { icon: CalendarDays, t: "Camp Management", d: "Roster, attendance, evals, waitlist." },
            { icon: MessageSquare, t: "Team Communication", d: "Inbox, broadcasts, email marketing." },
            { icon: ShoppingBag, t: "Store", d: "PXF Slip, gear, GameIQ POD coming soon." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-card p-5">
              <f.icon size={20} className="text-teal" />
              <p className="mt-3 font-semibold">{f.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border px-6 py-16">
        <h2 className="text-center font-display text-3xl font-bold">Founding member pricing</h2>
        <p className="mt-2 text-center text-xs text-muted-foreground">Lock in your rate forever. 37 of 50 spots left.</p>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
          {[
            { name: "Basic", price: "Free", popular: false, items: ["Browse camps", "Player profile"] },
            { name: "Elite", price: "$9.99/mo", popular: false, items: ["Drill library", "2 camps active", "Team messaging"], note: "Rises to $29.99" },
            { name: "Platinum", price: "$24.99/mo", popular: true, items: ["Unlimited camps", "Stripe payouts", "Email marketing", "Waivers"], note: "Rises to $79.99" },
          ].map((p) => (
            <div key={p.name} className={`relative rounded-2xl border bg-card p-5 ${p.popular ? "border-volt" : "border-border"}`}>
              {p.popular && <span className="absolute -top-2 left-5 rounded-full bg-volt px-2 py-0.5 text-[9px] font-bold text-background">MOST POPULAR</span>}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.name}</p>
              <p className="mt-1 font-display text-2xl font-bold">{p.price}</p>
              {p.note && <p className="mt-1 text-[10px] text-volt">{p.note}</p>}
              <ul className="mt-3 space-y-2 text-xs">
                {p.items.map((i) => (
                  <li key={i} className="flex items-start gap-2"><Check size={12} className="mt-0.5 text-teal" />{i}</li>
                ))}
              </ul>
              <Link to="/membership" className="mt-4 block rounded-xl bg-teal py-2 text-center text-xs font-bold text-background">Select</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="border-t border-border px-6 py-16">
        <h2 className="text-center font-display text-3xl font-bold">Coaches love PXF</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
          {[
            { name: "Coach Reilly", quote: "Cut my admin work in half. The roster + waivers flow is unreal." },
            { name: "Coach Park", quote: "Parents finally have one place to see everything. Game changer." },
            { name: "Coach Smith", quote: "Stripe payouts arrive next day. No more chasing e-transfers." },
          ].map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={12} className="fill-volt text-volt" />)}</div>
              <p className="mt-3 text-sm">"{t.quote}"</p>
              <p className="mt-3 text-[11px] text-muted-foreground">— {t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PXF Slip feature */}
      <section className="border-t border-border bg-gradient-to-br from-teal/10 to-volt/5 px-6 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal">Featured Product</p>
            <h2 className="mt-2 font-display text-3xl font-bold">PXF Slip Trainer</h2>
            <p className="mt-3 text-sm text-muted-foreground">A portable synthetic surface designed for edges, transitions, and stickhandling at home. Used by pros, built for everyone.</p>
            <Link to="/store" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-background">Shop the Slip <ArrowRight size={12} /></Link>
          </div>
          <div className="aspect-square rounded-3xl bg-gradient-to-br from-teal/40 to-volt/30" />
        </div>
      </section>

      {/* GameIQ POD coming soon */}
      <section className="border-t border-border px-6 py-16 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-volt">Coming Soon</p>
        <h2 className="mt-2 font-display text-3xl font-bold">GameIQ POD</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Personal hockey IQ training pod. Sign up to be first when we ship.</p>
        <button className="mt-4 rounded-xl border border-volt px-4 py-2 text-xs font-bold text-volt">Notify Me</button>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-[11px] text-muted-foreground">
        <div className="mb-3 flex justify-center gap-5">
          <a href="#">About</a><a href="#">Contact</a><a href="#">Privacy</a><a href="#">Terms</a>
        </div>
        © 2026 PXF Hockey
      </footer>
    </div>
  );
}