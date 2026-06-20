import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart, Bell, Package } from "lucide-react";

export const Route = createFileRoute("/store/")({
  component: StoreIndex,
});

const PRODUCTS = [
  {
    id: "pxf-slip-v1",
    name: "PXF Slip V1 — Fixed Slip Unit",
    price: 149,
    short: "Precision hockey training aid for stickhandling and edge work.",
    image: "https://images.unsplash.com/photo-1515703407324-5f51d2c4929c?w=800&q=80",
  },
];

function StoreIndex() {
  return (
    <div className="mx-auto max-w-[480px] space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shop</p>
          <h1 className="font-display text-2xl font-bold text-foreground">PXF Store</h1>
        </div>
        <Link to="/store/cart" className="relative grid h-10 w-10 place-items-center rounded-full bg-card border border-border text-foreground">
          <ShoppingCart size={16} />
          <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-teal text-[9px] font-bold text-black">1</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {PRODUCTS.map((p) => (
          <Link
            key={p.id}
            to="/store/$productId"
            params={{ productId: p.id }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-surface">
              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <h3 className="font-display text-base font-bold text-foreground">{p.name}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{p.short}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display text-xl font-bold text-teal">${p.price}</span>
                <span className="rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black">Add to Cart</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-amber-400/40 bg-amber-400/5 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-400">
            <Package size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Coming soon</p>
            <h3 className="font-display text-base font-bold text-foreground">GameIQ POD</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">On-ice cognitive trainer. Limited first run launching this fall.</p>
            <button className="mt-3 flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold text-amber-400">
              <Bell size={11} /> Notify me
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}