import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileSignature, Plus, Eye, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/waivers")({
  head: () => ({ meta: [{ title: "Waivers — Coach" }] }),
  component: WaiversScreen,
});

const waivers = [
  { id: "w1", name: "Standard Liability Waiver", camps: ["Summer Elite", "Skills Camp"], signatures: 42 },
  { id: "w2", name: "Photo/Media Release", camps: ["Summer Elite"], signatures: 38 },
  { id: "w3", name: "Concussion Acknowledgement", camps: ["Skills Camp", "Goalie Clinic"], signatures: 27 },
];

const sigs = [
  { parent: "Sarah Mitchell", athlete: "Jake Mitchell", date: "2026-06-14", ip: "24.81.112.45" },
  { parent: "Mark Chen", athlete: "Lily Chen", date: "2026-06-13", ip: "70.49.221.18" },
  { parent: "Diana Park", athlete: "Owen Park", date: "2026-06-12", ip: "99.246.10.7" },
];

function WaiversScreen() {
  const [builder, setBuilder] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Waivers</h1>
          <p className="text-xs text-muted-foreground">Manage waivers and collected signatures.</p>
        </div>
        <button onClick={() => setBuilder(true)} className="flex items-center gap-1 rounded-xl bg-teal px-3 py-2 text-xs font-bold text-background">
          <Plus size={14} /> Create Waiver
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {waivers.map((w) => (
          <div key={w.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold"><FileSignature size={16} className="text-teal" />{w.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Attached: {w.camps.join(" · ")}</p>
                <p className="mt-2 text-[11px] text-volt">{w.signatures} signatures collected</p>
              </div>
              <button onClick={() => setViewing(w.id)} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                <Eye size={12} /> View
              </button>
            </div>
          </div>
        ))}
      </div>

      {builder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={() => setBuilder(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">New Waiver</h3>
              <button onClick={() => setBuilder(false)}><X size={16} /></button>
            </div>
            <input placeholder="Waiver title" className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <textarea placeholder="Waiver content (rich text)…" className="mt-2 h-32 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" defaultChecked /> Require signature</label>
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Attach to camps</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Summer Elite", "Skills Camp", "Goalie Clinic"].map((c) => (
                  <label key={c} className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px]"><input type="checkbox" /> {c}</label>
                ))}
              </div>
            </div>
            <button className="mt-4 w-full rounded-xl bg-teal py-2 text-xs font-bold text-background">SAVE WAIVER</button>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Signatures</h3>
              <button onClick={() => setViewing(null)}><X size={16} /></button>
            </div>
            <table className="mt-3 w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr><th className="text-left py-1">Parent</th><th className="text-left">Athlete</th><th className="text-left">Date</th><th className="text-left">IP</th></tr>
              </thead>
              <tbody>
                {sigs.map((s) => (
                  <tr key={s.parent} className="border-t border-border">
                    <td className="py-2">{s.parent}</td><td>{s.athlete}</td><td className="text-muted-foreground">{s.date}</td><td className="text-muted-foreground">{s.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}