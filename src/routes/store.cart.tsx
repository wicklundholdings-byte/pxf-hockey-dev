import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/store/cart")({
  component: CartPage,
});

function CartPage() {
  const [items, setItems] = useState([
    {
      id: "pxf-slip-v1",
      name: "PXF Slip V1 — Fixed Slip Unit",
      price: 149,
      qty: 1,
      image: "https://images.unsplash.com/photo-1515703407324-5f51d2c4929c?w=400&q=80",
    },
  ]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 0 ? (subtotal >= 100 ? 0 : 15) : 0;
  const total = subtotal + shipping;

  return (
    <div className="mx-auto max-w-[480px] space-y-4 p-5">
      <Link to="/store" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> Continue shopping
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground">Your Cart</h1>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
          Your cart is empty.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li key={it.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                  <img src={it.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{it.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">${it.price.toFixed(2)} each</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full bg-surface px-2.5 py-1">
                      <button onClick={() => {
                        const next = [...items];
                        next[idx] = { ...it, qty: Math.max(1, it.qty - 1) };
                        setItems(next);
                      }} className="text-foreground"><Minus size={12} /></button>
                      <span className="w-5 text-center text-xs font-bold text-foreground">{it.qty}</span>
                      <button onClick={() => {
                        const next = [...items];
                        next[idx] = { ...it, qty: it.qty + 1 };
                        setItems(next);
                      }} className="text-foreground"><Plus size={12} /></button>
                    </div>
                    <button
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground">${(it.price * it.qty).toFixed(2)}</p>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground">Order summary</h3>
            <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            <Row label="Shipping" value={shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`} accent={shipping === 0} />
            <div className="mt-2 border-t border-border pt-2">
              <Row label="Total" value={`$${total.toFixed(2)}`} bold />
            </div>
          </div>

          <Link
            to="/payments/checkout"
            className="block w-full rounded-full bg-teal py-3 text-center text-sm font-bold text-black"
          >
            Checkout
          </Link>
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={(bold ? "text-sm font-bold text-foreground" : "text-xs text-muted-foreground")}>{label}</span>
      <span className={
        (bold ? "text-base font-bold text-teal" : accent ? "text-xs font-bold text-emerald-400" : "text-xs font-semibold text-foreground")
      }>{value}</span>
    </div>
  );
}