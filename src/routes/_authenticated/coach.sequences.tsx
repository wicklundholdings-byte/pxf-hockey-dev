import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Workflow, Plus, ArrowLeft, Trash2, Clock, Mail, Power, ChevronRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/coach/sequences")({
  head: () => ({ meta: [{ title: "Drip Sequences — Coach" }] }),
  component: SequencesScreen,
});

type Seq = {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  trigger_camp_id: string | null;
  inactivity_days: number | null;
  active: boolean;
};
type Step = {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  subject: string;
  body: string;
};

const TRIGGERS = [
  { id: "signup", label: "Welcome — on signup" },
  { id: "registration", label: "Post-registration" },
  { id: "post_camp", label: "Post-camp follow-up" },
  { id: "inactivity", label: "Re-engagement (inactivity)" },
  { id: "manual", label: "Manual enrollment" },
];

function SequencesScreen() {
  const { user } = useAuth();
  const [sequences, setSequences] = useState<Seq[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("email_sequences" as never)
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setSequences((data ?? []) as unknown as Seq[]);
  }
  useEffect(() => { load(); }, [user]);

  async function create() {
    if (!user) return;
    const { data } = await supabase
      .from("email_sequences" as never)
      .insert({ owner_id: user.id, name: "New sequence", trigger: "signup", active: false } as never)
      .select()
      .single();
    if (data) setOpenId((data as unknown as Seq).id);
    await load();
  }

  async function toggleActive(s: Seq) {
    await supabase.from("email_sequences" as never).update({ active: !s.active } as never).eq("id", s.id);
    await load();
  }

  if (openId) {
    return <SequenceEditor id={openId} onClose={() => { setOpenId(null); load(); }} />;
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
        <Workflow size={22} className="text-teal" /> Drip Sequences
      </h1>
      <p className="text-xs text-muted-foreground">Automate welcome series, post-camp follow-ups and re-engagement.</p>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5">
        <Info size={12} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-[10px] leading-relaxed text-amber-200/90">
          Sequences save and queue here. Live sending wires up when you connect your email provider.
        </p>
      </div>

      <button onClick={create} className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-teal py-2 text-xs font-bold text-background">
        <Plus size={14} /> New sequence
      </button>

      <div className="mt-4 space-y-2">
        {sequences.length === 0 && (
          <p className="py-6 text-center text-[11px] text-muted-foreground">No sequences yet.</p>
        )}
        {sequences.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setOpenId(s.id)} className="flex-1 text-left">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {TRIGGERS.find((t) => t.id === s.trigger)?.label ?? s.trigger}
                </p>
              </button>
              <button
                onClick={() => toggleActive(s)}
                className={`rounded-full px-2 py-1 text-[10px] font-bold ${s.active ? "bg-volt/15 text-volt" : "bg-surface text-muted-foreground"}`}
              >
                <Power size={10} className="mr-1 inline" />{s.active ? "Active" : "Paused"}
              </button>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SequenceEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const [seq, setSeq] = useState<Seq | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [camps, setCamps] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: s }, { data: st }, { data: cmp }] = await Promise.all([
      supabase.from("email_sequences" as never).select("*").eq("id", id).single(),
      supabase.from("email_sequence_steps" as never).select("*").eq("sequence_id", id).order("step_order"),
      supabase.from("camps").select("id,name").order("created_at", { ascending: false }),
    ]);
    setSeq((s ?? null) as unknown as Seq | null);
    setSteps((st ?? []) as unknown as Step[]);
    setCamps((cmp ?? []) as { id: string; name: string }[]);
  }
  useEffect(() => { load(); }, [id]);

  async function saveSeq() {
    if (!seq) return;
    setSaving(true);
    await supabase.from("email_sequences" as never).update({
      name: seq.name,
      description: seq.description,
      trigger: seq.trigger,
      trigger_camp_id: seq.trigger_camp_id,
      inactivity_days: seq.inactivity_days,
    } as never).eq("id", seq.id);
    setSaving(false);
  }

  async function addStep() {
    await supabase.from("email_sequence_steps" as never).insert({
      sequence_id: id,
      step_order: steps.length + 1,
      delay_days: steps.length === 0 ? 0 : 3,
      delay_hours: 0,
      subject: "New email",
      body: "Hi {{first_name}},\n\n",
    } as never);
    await load();
  }

  async function updateStep(s: Step, patch: Partial<Step>) {
    setSteps((prev) => prev.map((p) => (p.id === s.id ? { ...p, ...patch } : p)));
  }
  async function commitStep(s: Step) {
    await supabase.from("email_sequence_steps" as never).update({
      delay_days: s.delay_days,
      delay_hours: s.delay_hours,
      subject: s.subject,
      body: s.body,
    } as never).eq("id", s.id);
  }
  async function deleteStep(s: Step) {
    if (!confirm("Delete this step?")) return;
    await supabase.from("email_sequence_steps" as never).delete().eq("id", s.id);
    await load();
  }
  async function deleteSeq() {
    if (!seq || !confirm("Delete this sequence and all its steps?")) return;
    await supabase.from("email_sequences" as never).delete().eq("id", seq.id);
    onClose();
  }

  if (!seq) {
    return <div className="px-5 pt-4 text-xs text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-24 text-foreground">
      <button onClick={onClose} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> All sequences
      </button>

      <input
        value={seq.name}
        onChange={(e) => setSeq({ ...seq, name: e.target.value })}
        onBlur={saveSeq}
        className="mt-2 w-full bg-transparent font-display text-xl font-bold focus:outline-none"
      />
      <textarea
        value={seq.description ?? ""}
        onChange={(e) => setSeq({ ...seq, description: e.target.value })}
        onBlur={saveSeq}
        placeholder="Internal description…"
        rows={2}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
      />

      <div className="mt-3 rounded-2xl border border-border bg-card p-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trigger</h3>
        <select
          value={seq.trigger}
          onChange={(e) => setSeq({ ...seq, trigger: e.target.value })}
          onBlur={saveSeq}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        {(seq.trigger === "registration" || seq.trigger === "post_camp") && (
          <select
            value={seq.trigger_camp_id ?? ""}
            onChange={(e) => setSeq({ ...seq, trigger_camp_id: e.target.value || null })}
            onBlur={saveSeq}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Any camp</option>
            {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {seq.trigger === "inactivity" && (
          <label className="mt-2 block text-xs">
            <span className="text-[10px] uppercase text-muted-foreground">Inactive for (days)</span>
            <input
              type="number" min={1}
              value={seq.inactivity_days ?? 30}
              onChange={(e) => setSeq({ ...seq, inactivity_days: parseInt(e.target.value) || 30 })}
              onBlur={saveSeq}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2"
            />
          </label>
        )}
      </div>

      <h3 className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Mail size={11} /> Steps ({steps.length})
      </h3>

      <div className="mt-2 space-y-3">
        {steps.map((s, i) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">Step {i + 1}</span>
              <button onClick={() => deleteStep(s)} className="text-muted-foreground"><Trash2 size={12} /></button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Clock size={11} className="text-muted-foreground" />
              <span className="text-[10px] uppercase text-muted-foreground">Wait</span>
              <input
                type="number" min={0}
                value={s.delay_days}
                onChange={(e) => updateStep(s, { delay_days: parseInt(e.target.value) || 0 })}
                onBlur={() => commitStep({ ...s, delay_days: s.delay_days })}
                className="w-14 rounded border border-border bg-surface px-2 py-1"
              /> days
              <input
                type="number" min={0} max={23}
                value={s.delay_hours}
                onChange={(e) => updateStep(s, { delay_hours: parseInt(e.target.value) || 0 })}
                onBlur={() => commitStep({ ...s, delay_hours: s.delay_hours })}
                className="w-12 rounded border border-border bg-surface px-2 py-1"
              /> hrs
            </div>
            <input
              value={s.subject}
              onChange={(e) => updateStep(s, { subject: e.target.value })}
              onBlur={() => commitStep(s)}
              placeholder="Subject"
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold"
            />
            <textarea
              value={s.body}
              onChange={(e) => updateStep(s, { body: e.target.value })}
              onBlur={() => commitStep(s)}
              rows={5}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
            />
          </div>
        ))}
      </div>

      <button onClick={addStep} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2 text-xs font-bold text-muted-foreground">
        <Plus size={12} /> Add step
      </button>

      <button onClick={deleteSeq} className="mt-6 flex w-full items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-[11px] font-bold text-red-400">
        <Trash2 size={11} /> Delete sequence
      </button>

      {saving && <p className="mt-2 text-center text-[10px] text-muted-foreground">Saving…</p>}
    </div>
  );
}