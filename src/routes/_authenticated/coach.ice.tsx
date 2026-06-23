import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { parseIceContract, type ParsedSlot } from "@/lib/ice.functions";
import { Upload, Loader2, Plus, AlertTriangle, Check, Trash2, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/ice")({
  ssr: false,
  component: IcePage,
});

type Rink = { id: string; name: string; address: string | null; color: string };
type Slot = {
  id: string;
  rink_id: string | null;
  slot_date: string;
  start_time: string;
  end_time: string;
  surface_type: string;
  camp_id: string | null;
  notes: string | null;
  batch_id: string | null;
};
type CampLite = { id: string; name: string };

const SURFACE_LABELS: Record<string, string> = {
  full_ice: "Full Ice",
  half_ice: "Half Ice",
  shooting_area: "Shooting Area",
  unknown: "Unknown",
};

const PALETTE = ["#14b8a6", "#3b82f6", "#a855f7", "#f97316", "#ef4444", "#eab308", "#10b981", "#ec4899"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function IcePage() {
  const [tab, setTab] = useState<"log" | "import" | "rinks">("log");
  const [rinks, setRinks] = useState<Rink[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [camps, setCamps] = useState<CampLite[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  const reload = useCallback(async () => {
    const [r, s, c] = await Promise.all([
      (supabase as any).from("rinks").select("*").order("name"),
      (supabase as any).from("ice_slots").select("*").order("slot_date", { ascending: true }),
      supabase.from("camps").select("id,name"),
    ]);
    setRinks((r.data ?? []) as Rink[]);
    setSlots((s.data ?? []) as Slot[]);
    setCamps((c.data ?? []) as CampLite[]);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const slotsByDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const arr = m.get(s.slot_date) ?? [];
      arr.push(s);
      m.set(s.slot_date, arr);
    }
    return m;
  }, [slots]);

  const rinkById = useMemo(() => new Map(rinks.map((r) => [r.id, r])), [rinks]);
  const campById = useMemo(() => new Map(camps.map((c) => [c.id, c])), [camps]);

  // Monthly summary
  const monthSummary = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    let totalMin = 0;
    let linked = 0;
    const perRink = new Map<string, number>();
    for (const s of slots) {
      const d = new Date(s.slot_date);
      if (d.getMonth() !== m || d.getFullYear() !== y) continue;
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      const min = (eh * 60 + em) - (sh * 60 + sm);
      totalMin += min;
      if (s.camp_id) linked++;
      const name = (s.rink_id && rinkById.get(s.rink_id)?.name) || "Unassigned";
      perRink.set(name, (perRink.get(name) ?? 0) + min);
    }
    return {
      hours: (totalMin / 60).toFixed(1),
      perRink: Array.from(perRink.entries()).map(([k, v]) => ({ name: k, hours: (v / 60).toFixed(1) })),
      linkedPct: slots.length ? Math.round((linked / slots.length) * 100) : 0,
    };
  }, [slots, rinkById]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-foreground">Ice Time</h2>
        <Link to="/coach/camps" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">← Events</Link>
      </div>

      <div className="flex gap-1 rounded-full border border-border bg-surface p-1 text-[11px] font-semibold">
        {(["log", "import", "rinks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={"flex-1 rounded-full py-1.5 transition " + (tab === t ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground")}
          >
            {t === "log" ? "Log" : t === "import" ? "AI Import" : "Rinks"}
          </button>
        ))}
      </div>

      {tab === "log" && (
        <LogView
          days={days}
          weekStart={weekStart}
          setWeekStart={setWeekStart}
          slotsByDay={slotsByDay}
          rinkById={rinkById}
          campById={campById}
          rinks={rinks}
          reload={reload}
          monthSummary={monthSummary}
        />
      )}
      {tab === "import" && <ImportView rinks={rinks} reload={reload} setTab={setTab} />}
      {tab === "rinks" && <RinksView rinks={rinks} reload={reload} />}
    </div>
  );
}

function LogView({
  days, weekStart, setWeekStart, slotsByDay, rinkById, campById, rinks, reload, monthSummary,
}: {
  days: Date[]; weekStart: Date; setWeekStart: (d: Date) => void;
  slotsByDay: Map<string, Slot[]>; rinkById: Map<string, Rink>; campById: Map<string, CampLite>;
  rinks: Rink[]; reload: () => Promise<void>;
  monthSummary: { hours: string; perRink: { name: string; hours: string }[]; linkedPct: number };
}) {
  const [showAdd, setShowAdd] = useState(false);

  async function deleteSlot(id: string) {
    if (!confirm("Delete this slot?")) return;
    await (supabase as any).from("ice_slots").delete().eq("id", id);
    reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-full border border-border bg-surface p-1.5"><ChevronLeft size={14} /></button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold">Today</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-full border border-border bg-surface p-1.5"><ChevronRight size={14} /></button>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
          <Plus size={12} /> Add Single Slot
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 rounded-2xl border border-border bg-card p-2">
        {days.map((d) => {
          const key = isoDate(d);
          const list = slotsByDay.get(key) ?? [];
          const isToday = isoDate(new Date()) === key;
          return (
            <div key={key} className="min-h-[120px] space-y-1">
              <div className={"rounded-md px-1 py-0.5 text-center text-[10px] font-bold " + (isToday ? "bg-teal/15 text-teal" : "text-muted-foreground")}>
                <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className="text-[11px] text-foreground">{d.getDate()}</div>
              </div>
              {list.map((s) => {
                const rink = s.rink_id ? rinkById.get(s.rink_id) : null;
                const camp = s.camp_id ? campById.get(s.camp_id) : null;
                const color = rink?.color ?? "#64748b";
                return (
                  <div key={s.id} className="rounded-md border p-1 text-[9px]" style={{ borderColor: color, background: `${color}15` }}>
                    <div className="font-bold text-foreground">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</div>
                    <div className="truncate text-muted-foreground">{rink?.name ?? "No rink"}</div>
                    {camp ? (
                      <div className="mt-0.5 flex items-center gap-0.5 text-emerald-500"><Check size={8} /><span className="truncate">{camp.name}</span></div>
                    ) : (
                      <Link
                        to="/coach/camps/new"
                        search={{ ice_slot_id: s.id } as any}
                        className="mt-0.5 block rounded bg-orange-500/20 px-1 py-0.5 text-center font-bold text-orange-400"
                      >
                        Build Camp
                      </Link>
                    )}
                    <button onClick={() => deleteSlot(s.id)} className="mt-0.5 text-muted-foreground hover:text-red-400"><Trash2 size={8} /></button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">This Month</div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label="Total hours" value={monthSummary.hours} />
          <Stat label="Linked to camps" value={`${monthSummary.linkedPct}%`} />
          <Stat label="Rinks used" value={String(monthSummary.perRink.length)} />
        </div>
        {monthSummary.perRink.length > 0 && (
          <div className="mt-2 space-y-1">
            {monthSummary.perRink.map((r) => (
              <div key={r.name} className="flex justify-between text-[11px]"><span className="text-muted-foreground">{r.name}</span><span className="font-semibold text-foreground">{r.hours}h</span></div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <SingleSlotSheet rinks={rinks} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); reload(); }} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2">
      <div className="font-display text-base font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SingleSlotSheet({ rinks, onClose, onSaved }: { rinks: Rink[]; onClose: () => void; onSaved: () => void }) {
  const [rinkId, setRinkId] = useState(rinks[0]?.id ?? "");
  const [date, setDate] = useState(isoDate(new Date()));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:30");
  const [surface, setSurface] = useState("full_ice");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await (supabase as any).from("ice_slots").insert({
        owner_id: u.user.id,
        rink_id: rinkId || null,
        slot_date: date,
        start_time: start,
        end_time: end,
        surface_type: surface,
        notes: notes || null,
        booked_by_coach_id: u.user.id,
      });
      if (error) throw error;
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-foreground">Add Ice Slot</h3>
          <button onClick={onClose}><X size={14} /></button>
        </div>
        <Field label="Rink">
          <select value={rinkId} onChange={(e) => setRinkId(e.target.value)} className="input">
            <option value="">— None —</option>
            {rinks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></Field>
          <Field label="Start"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input" /></Field>
          <Field label="End"><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input" /></Field>
        </div>
        <Field label="Surface">
          <select value={surface} onChange={(e) => setSurface(e.target.value)} className="input">
            {Object.entries(SURFACE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" /></Field>
        <button disabled={busy} onClick={save} className="w-full rounded-full bg-gradient-brand py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "Saving…" : "Save Slot"}
        </button>
      </div>
      <style>{`.input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--surface));padding:0.5rem 0.75rem;font-size:0.75rem;color:hsl(var(--foreground));}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ImportView({ rinks, reload, setTab }: { rinks: Rink[]; reload: () => Promise<void>; setTab: (t: "log" | "import" | "rinks") => void }) {
  const parseFn = useServerFn(parseIceContract);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<(ParsedSlot & { include: boolean })[] | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setError(null);
    setSourceFile(f);
    try {
      let kind: "pdf" | "image" | "text" = "pdf";
      let data = "";
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        kind = "pdf";
        data = await fileToBase64(f);
      } else if (f.type.startsWith("image/")) {
        kind = "image";
        data = await fileToBase64(f);
      } else {
        kind = "text";
        data = await f.text();
      }
      const result = await parseFn({ data: { kind, data, filename: f.name, mime: f.type } });
      setParsed(result.slots.map((s) => ({ ...s, include: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse");
    } finally {
      setBusy(false);
    }
  }

  async function importAll() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      // Upload source file
      let source_file_url: string | null = null;
      let source_file_name: string | null = null;
      if (sourceFile) {
        const path = `${u.user.id}/${Date.now()}-${sourceFile.name}`;
        const up = await supabase.storage.from("ice-contracts").upload(path, sourceFile);
        if (!up.error) {
          source_file_url = path;
          source_file_name = sourceFile.name;
        }
      }

      // Create batch
      const { data: batch, error: bErr } = await (supabase as any).from("ice_import_batches").insert({
        owner_id: u.user.id,
        uploaded_by: u.user.id,
        source_file_url,
        source_file_name,
      }).select().single();
      if (bErr) throw bErr;

      // Resolve or create rinks by name (case-insensitive)
      const nameToId = new Map(rinks.map((r) => [r.name.toLowerCase(), r.id]));
      const toInsert: any[] = [];
      const rinkInserts: { name: string; color: string }[] = [];
      const seenNew = new Set<string>();
      let palIdx = rinks.length;

      for (const s of parsed) {
        if (!s.include) continue;
        if (!s.date || !s.start_time || !s.end_time) continue;
        let rinkId: string | null = null;
        if (s.rink_name) {
          const key = s.rink_name.toLowerCase();
          rinkId = nameToId.get(key) ?? null;
          if (!rinkId && !seenNew.has(key)) {
            seenNew.add(key);
            rinkInserts.push({ name: s.rink_name, color: PALETTE[palIdx++ % PALETTE.length] });
          }
        }
        toInsert.push({ s, rink_name_key: s.rink_name?.toLowerCase() ?? null });
      }

      if (rinkInserts.length) {
        const { data: newRinks, error: rErr } = await (supabase as any).from("rinks").insert(
          rinkInserts.map((r) => ({ owner_id: u.user.id, name: r.name, color: r.color })),
        ).select();
        if (rErr) throw rErr;
        for (const r of newRinks ?? []) nameToId.set(r.name.toLowerCase(), r.id);
      }

      const rows = toInsert.map(({ s, rink_name_key }) => ({
        owner_id: u.user.id,
        batch_id: batch.id,
        rink_id: rink_name_key ? nameToId.get(rink_name_key) ?? null : null,
        slot_date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        surface_type: s.surface_type && s.surface_type !== "unknown" ? s.surface_type : "full_ice",
        notes: s.notes || null,
        booked_by_coach_id: u.user.id,
        ambiguous: !!s.ambiguous,
      }));

      const { error: insErr } = await (supabase as any).from("ice_slots").insert(rows);
      if (insErr) throw insErr;

      await reload();
      setParsed(null);
      setSourceFile(null);
      setTab("log");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const ambiguousCount = parsed?.filter((p) => p.ambiguous).length ?? 0;
  const includedCount = parsed?.filter((p) => p.include).length ?? 0;

  return (
    <div className="space-y-3">
      {!parsed && (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
          {busy ? (
            <>
              <Loader2 className="animate-spin text-teal" size={32} />
              <div className="font-display text-sm font-bold text-foreground">Reading your contract…</div>
              <div className="text-[11px] text-muted-foreground">This usually takes 10–20 seconds.</div>
            </>
          ) : (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-primary-foreground"><Upload size={20} /></div>
              <div className="font-display text-base font-bold text-foreground">Import Ice Contract</div>
              <div className="text-[11px] text-muted-foreground">PDF, JPG/PNG, or text file. AI will extract slots.</div>
              <input type="file" accept=".pdf,image/*,.txt,text/plain" className="hidden" onChange={handleFile} />
            </>
          )}
        </label>
      )}

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-400">{error}</div>}

      {parsed && (
        <div className="space-y-3">
          {ambiguousCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-[11px] text-orange-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>We weren't sure about {ambiguousCount} {ambiguousCount === 1 ? "entry" : "entries"} — please review the highlighted rows.</span>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card">
            {parsed.map((row, i) => (
              <div key={i} className={"flex flex-wrap items-center gap-2 border-b border-border p-2 text-[11px] last:border-0 " + (row.ambiguous ? "bg-orange-500/5" : "")}>
                <input type="checkbox" checked={row.include} onChange={(e) => setParsed((p) => p && p.map((x, j) => j === i ? { ...x, include: e.target.checked } : x))} />
                <input className="input flex-1 min-w-[80px]" placeholder="Rink" value={row.rink_name ?? ""} onChange={(e) => setParsed((p) => p && p.map((x, j) => j === i ? { ...x, rink_name: e.target.value } : x))} />
                <input type="date" className="input w-[110px]" value={row.date ?? ""} onChange={(e) => setParsed((p) => p && p.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
                <input type="time" className="input w-[80px]" value={row.start_time ?? ""} onChange={(e) => setParsed((p) => p && p.map((x, j) => j === i ? { ...x, start_time: e.target.value } : x))} />
                <input type="time" className="input w-[80px]" value={row.end_time ?? ""} onChange={(e) => setParsed((p) => p && p.map((x, j) => j === i ? { ...x, end_time: e.target.value } : x))} />
                <select className="input w-[100px]" value={row.surface_type ?? "full_ice"} onChange={(e) => setParsed((p) => p && p.map((x, j) => j === i ? { ...x, surface_type: e.target.value } : x))}>
                  {Object.entries(SURFACE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setParsed(null); setSourceFile(null); }} className="flex-1 rounded-full border border-border bg-surface py-2 text-xs font-bold">Cancel</button>
            <button disabled={busy || includedCount === 0} onClick={importAll} className="flex-1 rounded-full bg-gradient-brand py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              {busy ? "Importing…" : `Add ${includedCount} Ice Slot${includedCount === 1 ? "" : "s"}`}
            </button>
          </div>
          {sourceFile && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <FileText size={12} /> Attached: {sourceFile.name}
            </div>
          )}
        </div>
      )}
      <style>{`.input{border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--surface));padding:0.35rem 0.5rem;font-size:0.7rem;color:hsl(var(--foreground));}`}</style>
    </div>
  );
}

function RinksView({ rinks, reload }: { rinks: Rink[]; reload: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await (supabase as any).from("rinks").insert({ owner_id: u.user.id, name: name.trim(), address: address || null, color });
    setName(""); setAddress(""); setBusy(false);
    reload();
  }

  async function remove(id: string) {
    if (!confirm("Delete this rink? Slots will remain but unlinked.")) return;
    await (supabase as any).from("rinks").delete().eq("id", id);
    reload();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
        <div className="font-display text-sm font-bold text-foreground">Add Rink</div>
        <input className="input" placeholder="Westside Ice Arena" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="flex gap-1.5">
          {PALETTE.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={"h-6 w-6 rounded-full border-2 " + (color === c ? "border-foreground" : "border-transparent")} style={{ background: c }} />
          ))}
        </div>
        <button disabled={busy} onClick={add} className="w-full rounded-full bg-gradient-brand py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">Add Rink</button>
      </div>
      <ul className="space-y-1.5">
        {rinks.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-foreground">{r.name}</div>
              {r.address && <div className="truncate text-[10px] text-muted-foreground">{r.address}</div>}
            </div>
            <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-red-400"><Trash2 size={12} /></button>
          </li>
        ))}
        {rinks.length === 0 && <li className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">No rinks yet. Add one above, or import a contract — rinks are created automatically.</li>}
      </ul>
      <style>{`.input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--surface));padding:0.5rem 0.75rem;font-size:0.75rem;color:hsl(var(--foreground));}`}</style>
    </div>
  );
}