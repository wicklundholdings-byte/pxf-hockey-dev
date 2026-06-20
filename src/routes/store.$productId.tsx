import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, Truck, ShieldCheck, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/store/$productId")({
  component: ProductDetail,
});

const IMAGES = [
  "https://images.unsplash.com/photo-1515703407324-5f51d2c4929c?w=1000&q=80",
  "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1000&q=80",
  "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=1000&q=80",
];

function ProductDetail() {
  const { productId } = useParams({ from: "/store/$productId" });
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);

  return (
    <div className="mx-auto max-w-[480px] space-y-4 p-5">
      <Link to="/store" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Back to store
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="aspect-square w-full overflow-hidden bg-surface">
          <img src={IMAGES[active]} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="flex gap-2 p-3">
          {IMAGES.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={"h-14 w-14 overflow-hidden rounded-lg border-2 " + (active === i ? "border-teal" : "border-border")}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h1 className="font-display text-xl font-bold text-foreground">PXF Slip V1 — Fixed Slip Unit</h1>
        <p className="mt-1 font-display text-2xl font-bold text-teal">$149.00</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Description</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          The PXF Slip V1 is a precision training surface for stickhandling, edge work, and shot release.
          Engineered for off-ice repetition with the feel of fresh ice.
        </p>
        <div className="mt-3 space-y-1 text-[11px]">
          {[
            ["Dimensions", "30\" × 60\""],
            ["Weight", "12 lbs"],
            ["Surface", "Glide-X polymer"],
            ["Warranty", "1 year"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-border/40 py-1 last:border-0">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-semibold text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qty</span>
        <div className="flex items-center gap-3 rounded-full bg-surface px-3 py-1.5">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="text-foreground"><Minus size={14} /></button>
          <span className="w-6 text-center text-sm font-bold text-foreground">{qty}</span>
          <button onClick={() => setQty(qty + 1)} className="text-foreground"><Plus size={14} /></button>
        </div>
        <Link to="/store/cart" className="ml-auto flex items-center gap-1 rounded-full bg-teal px-4 py-2 text-[11px] font-bold text-black">
          <ShoppingCart size={12} /> Add to Cart
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <Truck size={14} className="text-teal" />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-foreground">Free shipping</p>
          <p className="text-[10px] text-muted-foreground">Orders over $100</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <ShieldCheck size={14} className="text-emerald-400" />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-foreground">30-day returns</p>
          <p className="text-[10px] text-muted-foreground">No questions asked</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">You might also like</h3>
        <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-[11px] text-muted-foreground">
          More products coming soon. ({productId})
        </p>
      </div>
    </div>
  );
}