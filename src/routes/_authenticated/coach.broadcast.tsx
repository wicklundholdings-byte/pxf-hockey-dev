import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Megaphone, Bell, Calendar, Eye, Send, Mail, Smartphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/broadcast")({
  head: () => ({ meta: [{ title: "Broadcast — Coach" }] }),
  component: BroadcastScreen,
});

const sent = [
  { id: "b1", title: "Friday session moved indoors", audience: "Summer Elite", date: "Jun 18", reach: 24 },
  { id: "b2", title: "Welcome to summer camp!", audience: "All Members", date: "Jun 10", reach: 142 },
  { id: "b3", title: "U12 parking change", audience: "U12 age group", date: "Jun 02", reach: 38 },
];

function BroadcastScreen() {
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [preview, setPreview] = useState(false);

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold"><Megaphone size={22} className="text-teal" /> Broadcast</h1>
      <p className="text-xs text-muted-foreground">One-way announcement to your members.</p>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Audience</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {[
              { id: "all", label: "All Members" },
              { id: "camp", label: "Specific Camp" },
              { id: "age", label: "Age Group" },
            ].map((a) => (
              <button key={a.id} onClick={() => setAudience(a.id)} className={`rounded-lg border px-3 py-2 font-semibold ${audience === a.id ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"}`}>
                {a.label}
              </button>
            ))}
          </div>
          {audience === "camp" && (
            <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option>Summer Elite Camp</option><option>Skills Camp</option><option>Goalie Clinic</option>
            </select>
          )}
          {audience === "age" && (
            <select className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option>U10</option><option>U12</option><option>U14</option><option>U16</option>
            </select>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Friday session moved indoors" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Message</p>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hey team — due to rain we're moving…" className="mt-2 h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Channels</p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
              <span className="flex items-center gap-2"><Smartphone size={14} className="text-teal" /> In-app push notification <span className="text-muted-foreground">· all members</span></span>
              <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} className="accent-teal" />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
              <span className="flex items-center gap-2"><Mail size={14} className="text-teal" /> Email <span className="text-muted-foreground">· opted-in contacts only</span></span>
              <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="accent-teal" />
            </label>
            <p className="rounded-lg bg-surface/50 px-3 py-2 text-[10px] text-muted-foreground">
              <Bell size={10} className="mr-1 inline text-teal" />
              Contacts who opted out at registration still receive the in-app notification. Unsubscribe is handled automatically in every email.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button onClick={() => setWhen("now")} className={`rounded-lg border px-3 py-2 font-semibold ${when === "now" ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"}`}>Send Now</button>
          <button onClick={() => setWhen("schedule")} className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 font-semibold ${when === "schedule" ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"}`}><Calendar size={12} /> Schedule</button>
        </div>
        {when === "schedule" && (
          <input type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        )}

        <div className="flex gap-2">
          <button onClick={() => setPreview(true)} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-bold"><Eye size={12} /> Preview</button>
          <button className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-teal py-2 text-xs font-bold text-background"><Send size={12} /> {when === "now" ? "Send Broadcast" : "Schedule"}</button>
        </div>
      </div>

      <h2 className="mt-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sent broadcasts</h2>
      <div className="mt-2 space-y-2">
        {sent.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{s.title}</p>
              <span className="text-[10px] text-muted-foreground">{s.date}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{s.audience} · reached {s.reach}</p>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={() => setPreview(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Preview · Push notification</p>
            <div className="mt-3 rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-bold">PXF Hockey</p>
              <p className="mt-1 text-sm font-semibold">{title || "Your title here"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{body || "Your message here"}</p>
            </div>
            <button onClick={() => setPreview(false)} className="mt-4 w-full rounded-xl border border-border py-2 text-xs font-bold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}