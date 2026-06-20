import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Tag, Shuffle, Calendar, Users, Layers } from "lucide-react";

export const Route = createFileRoute("/payments/coupon")({
  head: () => ({ meta: [{ title: "New coupon — Coach" }] }),
  component: CouponCreatorScreen,
});

const campsList = [
  { id: "c1", name: "Elite Skills Camp" },
  { id: "c2", name: "Goalie Bootcamp" },
  { id: "c3", name: "Spring Power Skating" },
  { id: "c4", name: "U13 Game IQ Clinic" },
];

function CouponCreatorScreen() {
  const [code, setCode] = useState("SUMMER25");
  const [type, setType] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState(25);
  const [expiry, setExpiry] = useState("");
  const [limit, setLimit] = useState<number | "">(100);
  const [scope, setScope] = useState<"all" | "select">("all");
  const [selected, setSelected] = useState<string[]>([]);

  function shuffle() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c = "";
    for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)];
    setCode(c);
  }

  function toggle(id: string) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  const preview = type === "percent" ? `${value}% OFF` : `$${value} OFF`;

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-32">
      <Link to="/payments-preview" className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} /> Back</Link>

      <h1 className="mt-3 font-display text-2xl font-bold text-foreground">New coupon</h1>
      <p className="text-xs text-muted-foreground">Discounts apply at checkout before Stripe processes payment.</p>

      {/* Preview chip */}
      <div className="mt-4 rounded-2xl border-2 border-dashed border-teal/40 bg-teal/5 p-5 text-center">
        <Tag size={20} className="mx-auto text-teal" />
        <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-teal">{code || "CODE"}</p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{preview}</p>
      </div>

      <div className="mt-4 space-y-4">
        {/* Code */}
        <Field label="Code">
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER25" className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-sm tracking-wider text-foreground focus:border-teal focus:outline-none" />
            <button onClick={shuffle} className="flex items-center gap-1 rounded-xl border border-border bg-surface px-3 text-[11px] font-bold text-foreground">
              <Shuffle size={12} /> Auto
            </button>
          </div>
        </Field>

        {/* Type */}
        <Field label="Discount type">
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={type === "percent"} onClick={() => setType("percent")}>Percentage</Toggle>
            <Toggle active={type === "amount"} onClick={() => setType("amount")}>Fixed amount</Toggle>
          </div>
        </Field>

        {/* Value */}
        <Field label={type === "percent" ? "Percent off" : "Dollars off"}>
          <div className="flex items-center rounded-xl border border-border bg-surface px-3">
            {type === "amount" && <span className="text-sm text-muted-foreground">$</span>}
            <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground focus:outline-none" />
            {type === "percent" && <span className="text-sm text-muted-foreground">%</span>}
          </div>
        </Field>

        {/* Expiry */}
        <Field label="Expiry date" icon={Calendar}>
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-teal focus:outline-none" />
        </Field>

        {/* Limit */}
        <Field label="Usage limit" icon={Users}>
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Unlimited" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-teal focus:outline-none" />
        </Field>

        {/* Applies to */}
        <Field label="Applies to" icon={Layers}>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={scope === "all"} onClick={() => setScope("all")}>All camps</Toggle>
            <Toggle active={scope === "select"} onClick={() => setScope("select")}>Specific</Toggle>
          </div>
          {scope === "select" && (
            <ul className="mt-2 space-y-1">
              {campsList.map((c) => {
                const on = selected.includes(c.id);
                return (
                  <li key={c.id}>
                    <button onClick={() => toggle(c.id)} className={"flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs " + (on ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-foreground")}>
                      <span>{c.name}</span>
                      <span className={"h-4 w-4 rounded-full border-2 " + (on ? "border-teal bg-teal" : "border-border")} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Field>
      </div>

      <button className="mt-6 w-full rounded-full bg-teal py-3.5 text-sm font-bold text-black shadow-lg shadow-teal/30">
        Create coupon
      </button>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Tag; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon size={10} />} {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={"rounded-xl border py-2.5 text-xs font-bold " + (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>
      {children}
    </button>
  );
}