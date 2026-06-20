import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CalendarPlus, Smartphone, ChevronRight, MapPin, CalendarDays, Mail } from "lucide-react";

export const Route = createFileRoute("/payments/confirmation")({
  head: () => ({ meta: [{ title: "Payment Confirmed — PXF Hockey" }] }),
  component: ConfirmationScreen,
});

function ConfirmationScreen() {
  return (
    <div className="min-h-screen bg-background px-5 pt-10 pb-24">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span className="absolute inset-0 -m-3 animate-ping rounded-full bg-emerald-400/20" />
          <span className="absolute inset-0 -m-6 animate-pulse rounded-full bg-emerald-400/10" />
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal shadow-2xl shadow-emerald-400/40">
            <Check size={36} strokeWidth={3} className="text-black" />
          </div>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-foreground">You're in!</h1>
        <p className="mt-1 text-sm text-muted-foreground">Payment received. Jordan is registered.</p>
        <p className="mt-3 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] text-muted-foreground">
          Order <span className="text-foreground">#PXF-8K2-4M9R</span>
        </p>
      </div>

      <div className="mt-7 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Camp details</p>
        <h2 className="mt-1 font-display text-lg font-bold text-foreground">Elite Skills Camp</h2>
        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2"><CalendarDays size={12} className="text-teal" /> Aug 12 – Aug 16 · 9 AM – 12 PM</li>
          <li className="flex items-center gap-2"><MapPin size={12} className="text-teal" /> Scotiabank Arena, Toronto</li>
          <li className="flex items-center gap-2"><Mail size={12} className="text-teal" /> Receipt sent to parent@email.com</li>
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">Amount charged</span>
          <span className="font-bold text-foreground">$474.60</span>
        </div>
      </div>

      <button className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal/15 text-teal"><CalendarPlus size={16} /></span>
          <span className="text-left">
            <p className="text-sm font-semibold text-foreground">Add to calendar</p>
            <p className="text-[10px] text-muted-foreground">Apple, Google, Outlook</p>
          </span>
        </span>
        <ChevronRight size={16} className="text-muted-foreground" />
      </button>

      <div className="mt-3 overflow-hidden rounded-2xl border border-teal/30 bg-gradient-to-br from-teal/10 to-emerald-400/5 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal to-emerald-400 text-black shadow-lg shadow-teal/30">
            <Smartphone size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Download the PXF Hockey app</p>
            <p className="text-[11px] text-muted-foreground">Drills, sessions & camp updates on the go.</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="rounded-xl bg-black px-3 py-2 text-[11px] font-bold text-white">App Store</button>
          <button className="rounded-xl bg-black px-3 py-2 text-[11px] font-bold text-white">Google Play</button>
        </div>
      </div>

      <Link to="/payments-preview" className="mt-6 block text-center text-[11px] text-muted-foreground underline">
        Back to mockups
      </Link>
    </div>
  );
}