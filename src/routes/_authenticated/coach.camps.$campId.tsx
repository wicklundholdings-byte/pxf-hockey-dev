import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Calendar, Users, Clock, DollarSign, Share2, Pencil, Download, Image as ImageIcon, CheckCircle2, Circle, Search } from "lucide-react";
import { StatusBadge } from "@/components/coach/status-badge";

export const Route = createFileRoute("/_authenticated/coach/camps/$campId")({
  component: CampDetailPage,
});

type Camp = {
  id: string; name: string; slug: string; status: string;
  start_date: string | null; end_date: string | null;
  start_time: string | null; end_time: string | null;
  capacity: number; price_cents: number;
  hero_image: string | null; venue_name: string | null; address: string | null;
  location_type: string; description: string | null; format: string;
  early_bird_price_cents: number | null; early_bird_expires_at: string | null;
};
type Reg = {
  id: string; camp_id: string; attendee_id: string | null; contact_id: string | null;
  status: string; amount_cents: number | null; created_at: string;
  attendees?: { full_name: string | null; position: string | null; skill_level: string | null } | null;
  contacts?: { full_name: string | null; email: string | null; phone: string | null } | null;
};
type Session = { id: string; session_date: string; start_time: string | null; end_time: string | null };
type Wait = { id: string; full_name: string; email: string; phone: string | null; created_at: string };
type Media = { id: string; storage_path: string; created_at: string };

type Tab = "overview" | "roster" | "waitlist" | "sessions" | "media";

function fmt(d: string | null) {
  if (!d) return "TBA";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function CampDetailPage() {
  const { campId } = useParams({ from: "/_authenticated/coach/camps/$campId" });
  const [camp, setCamp] = useState<Camp | null>(null);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [wait, setWait] = useState<Wait[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, r, s, w, m] = await Promise.all([
        supabase.from("camps").select("*").eq("id", campId).maybeSingle(),
        supabase
          .from("registrations")
          .select("*, attendees(full_name,position,skill_level), contacts(full_name,email,phone)")
          .eq("camp_id", campId)
          .order("created_at", { ascending: false }),
        supabase.from("camp_sessions").select("*").eq("camp_id", campId).order("session_date"),
        supabase.from("waitlist_entries").select("*").eq("camp_id", campId).order("created_at"),
        supabase.from("camp_media").select("*").eq("camp_id", campId).order("created_at", { ascending: false }),
      ]);
      setCamp((c.data ?? null) as Camp | null);
      setRegs((r.data ?? []) as unknown as Reg[]);
      setSessions((s.data ?? []) as Session[]);
      setWait((w.data ?? []) as Wait[]);
      setMedia((m.data ?? []) as Media[]);
      setLoading(false);
    })();
  }, [campId]);

  const stats = useMemo(() => {
    const paid = regs.filter((r) => r.status === "paid");
    const revenue = paid.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
    return { paid: paid.length, revenue, pending: regs.filter((r) => r.status === "pending").length };
  }, [regs]);

  if (loading) return <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>;
  if (!camp) return (
    <div className="py-10 text-center">
      <p className="text-sm text-muted-foreground">Camp not found.</p>
      <Link to="/coach/camps" className="mt-3 inline-flex items-center gap-1 text-xs text-teal">
        <ArrowLeft size={12} /> Back to events
      </Link>
    </div>
  );

  const pct = camp.capacity ? Math.min(100, (stats.paid / camp.capacity) * 100) : 0;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "roster", label: "Roster", count: regs.length },
    { id: "waitlist", label: "Waitlist", count: wait.length },
    { id: "sessions", label: "Sessions", count: sessions.length },
    { id: "media", label: "Media", count: media.length },
  ];

  return (
    <div className="space-y-4">
      <Link to="/coach/camps" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> All events
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {camp.hero_image ? (
          <div className="relative h-32 w-full">
            <img src={camp.hero_image} alt={camp.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
        ) : (
          <div className="h-20 w-full bg-gradient-to-br from-teal/20 to-transparent" />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground">{camp.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin size={11} /> {camp.venue_name ?? (camp.location_type === "online" ? "Online" : "TBA")}
                {camp.address ? <span className="text-muted-foreground/70"> · {camp.address}</span> : null}
              </p>
            </div>
            <StatusBadge status={camp.status} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Info icon={Calendar} label="Dates" value={`${fmt(camp.start_date)} → ${fmt(camp.end_date)}`} />
            <Info icon={Clock} label="Time" value={camp.start_time ? `${camp.start_time.slice(0, 5)}–${camp.end_time?.slice(0, 5) ?? ""}` : "TBA"} />
            <Info icon={Users} label="Capacity" value={`${stats.paid}/${camp.capacity}`} />
            <Info icon={DollarSign} label="Price" value={`$${(camp.price_cents / 100).toFixed(0)}`} />
          </div>

          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-teal" style={{ width: pct + "%" }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{Math.round(pct)}% full · {camp.capacity - stats.paid} spots left</p>
          </div>

          <div className="mt-3 flex gap-2">
            <a
              href={`/book/${camp.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1 rounded-full bg-teal py-2 text-[11px] font-bold text-black"
            >
              <Share2 size={12} /> Booking page
            </a>
            <button className="flex items-center justify-center gap-1 rounded-full border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-foreground">
              <Pencil size={12} /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Paid" value={String(stats.paid)} tone="green" />
        <Stat label="Pending" value={String(stats.pending)} tone="amber" />
        <Stat label="Revenue" value={`$${(stats.revenue / 100).toLocaleString()}`} tone="teal" />
      </div>

      {/* Tabs */}
      <nav className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold " +
                  (active
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-border bg-card text-muted-foreground")
                }
              >
                {t.label}
                {typeof t.count === "number" && (
                  <span className={"rounded-full px-1.5 text-[9px] " + (active ? "bg-teal/20" : "bg-surface")}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {tab === "overview" && <OverviewTab camp={camp} />}
      {tab === "roster" && <RosterTab regs={regs} />}
      {tab === "waitlist" && <WaitlistTab entries={wait} />}
      {tab === "sessions" && <SessionsTab sessions={sessions} regs={regs} campId={campId} />}
      {tab === "media" && <MediaTab media={media} />}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface p-2.5">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Icon size={10} /> {label}
      </p>
      <p className="mt-1 text-[12px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "teal" }) {
  const color = tone === "green" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-teal";
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <p className={"font-display text-lg font-bold " + color}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function OverviewTab({ camp }: { camp: Camp }) {
  return (
    <div className="space-y-3">
      <Section title="Description">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {camp.description ?? "No description added yet."}
        </p>
      </Section>
      {camp.early_bird_price_cents && (
        <Section title="Pricing">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Standard</span>
            <span className="font-semibold text-foreground">${(camp.price_cents / 100).toFixed(0)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Early bird</span>
            <span className="font-semibold text-emerald-400">${(camp.early_bird_price_cents / 100).toFixed(0)}</span>
          </div>
          {camp.early_bird_expires_at && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Ends {new Date(camp.early_bird_expires_at).toLocaleDateString()}
            </p>
          )}
        </Section>
      )}
      <Section title="Format & Location">
        <Row k="Format" v={camp.format} />
        <Row k="Location type" v={camp.location_type} />
        <Row k="Slug" v={`/${camp.slug}`} />
      </Section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 text-xs last:border-b-0">
      <span className="capitalize text-muted-foreground">{k}</span>
      <span className="font-semibold text-foreground">{v}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function RosterTab({ regs }: { regs: Reg[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "refunded">("all");
  const filtered = regs.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!q) return true;
    const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "";
    return name.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search registrants…"
            className="w-full rounded-full border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
          />
        </div>
        <button className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-semibold text-muted-foreground">
          <Download size={11} /> CSV
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "paid", "pending", "refunded"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full border px-3 py-1 text-[10px] font-semibold capitalize " +
              (filter === f ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No registrations yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "Unknown";
            const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    <span className={
                      "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase " +
                      (r.status === "paid"
                        ? "bg-emerald-400/15 text-emerald-400"
                        : r.status === "pending"
                          ? "bg-amber-400/15 text-amber-400"
                          : "bg-muted text-muted-foreground")
                    }>
                      {r.status}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {r.attendees?.position ?? "—"} · {r.attendees?.skill_level ?? "—"} · {r.contacts?.email ?? r.contacts?.phone ?? ""}
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-400">
                  ${((r.amount_cents ?? 0) / 100).toFixed(0)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function WaitlistTab({ entries }: { entries: Wait[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        Waitlist is empty.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {entries.map((w, i) => (
        <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400/15 text-[10px] font-bold text-amber-400">
            #{i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{w.full_name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{w.email} {w.phone ? `· ${w.phone}` : ""}</p>
          </div>
          <button className="rounded-full bg-teal px-3 py-1 text-[10px] font-bold text-black">Invite</button>
        </li>
      ))}
    </ul>
  );
}

function SessionsTab({ sessions, regs, campId }: { sessions: Session[]; regs: Reg[]; campId: string }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessions[0]?.id ?? null);
  const [attendance, setAttendance] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!activeSessionId) return;
    supabase
      .from("attendance")
      .select("registration_id,present")
      .eq("session_id", activeSessionId)
      .then(({ data }) => {
        const m = new Map<string, boolean>();
        (data ?? []).forEach((row: { registration_id: string; present: boolean }) => m.set(row.registration_id, row.present));
        setAttendance(m);
      });
  }, [activeSessionId]);

  async function toggle(regId: string) {
    if (!activeSessionId) return;
    const next = !(attendance.get(regId) ?? false);
    const m = new Map(attendance);
    m.set(regId, next);
    setAttendance(m);
    await supabase.from("attendance").upsert(
      { registration_id: regId, session_id: activeSessionId, present: next, marked_at: new Date().toISOString() },
      { onConflict: "registration_id,session_id" },
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        No sessions scheduled. Add sessions from the camp edit screen.
      </p>
    );
  }

  const paid = regs.filter((r) => r.status === "paid");

  return (
    <div className="space-y-3">
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2">
          {sessions.map((s, i) => {
            const active = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={
                  "rounded-xl border px-3 py-2 text-left text-[10px] " +
                  (active ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
                }
              >
                <p className="font-bold uppercase">Day {i + 1}</p>
                <p>{new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              </button>
            );
          })}
        </div>
      </div>

      {paid.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No paid registrations to mark attendance for.
        </p>
      ) : (
        <ul className="space-y-2">
          {paid.map((r) => {
            const name = r.attendees?.full_name ?? r.contacts?.full_name ?? "Unknown";
            const present = attendance.get(r.id) ?? false;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <button onClick={() => toggle(r.id)} className="text-foreground">
                  {present ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <Circle size={20} className="text-muted-foreground" />
                  )}
                </button>
                <p className="flex-1 text-sm font-semibold text-foreground">{name}</p>
                <span className={"text-[10px] font-bold uppercase " + (present ? "text-emerald-400" : "text-muted-foreground")}>
                  {present ? "Present" : "Absent"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-center text-[10px] text-muted-foreground">Camp ID: {campId.slice(0, 8)}</p>
    </div>
  );
}

function MediaTab({ media }: { media: Media[] }) {
  if (media.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <ImageIcon size={28} className="mx-auto text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">No photos or videos uploaded yet.</p>
        <button className="mt-3 rounded-full bg-teal px-4 py-1.5 text-[11px] font-bold text-black">Upload</button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {media.map((m) => (
        <div key={m.id} className="aspect-square overflow-hidden rounded-xl border border-border bg-surface">
          <img src={m.storage_path} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}