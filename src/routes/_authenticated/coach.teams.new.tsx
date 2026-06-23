import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createTeam } from "@/lib/teams.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/new")({
  component: NewTeam,
});

function NewTeam() {
  const nav = useNavigate();
  const create = useServerFn(createTeam);
  const [form, setForm] = useState({ name: "", season: "", division: "", age_group: "", association_name: "", primary_color: "#14b8a6" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const r = await create({ data: form });
      nav({ to: "/coach/teams/$teamId", params: { teamId: r.id } });
    } catch (err: any) {
      alert(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-mx-5 -mt-2 px-5 pb-6 pt-2">
      <Link to="/coach/teams" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> Back
      </Link>
      <h2 className="mt-2 font-display text-xl font-bold">Create team</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input label="Team name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Season" value={form.season} onChange={(v) => setForm({ ...form, season: v })} placeholder="2025–26" />
          <Input label="Division" value={form.division} onChange={(v) => setForm({ ...form, division: v })} placeholder="AA" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Age group" value={form.age_group} onChange={(v) => setForm({ ...form, age_group: v })} placeholder="U13" />
          <Input label="Association" value={form.association_name} onChange={(v) => setForm({ ...form, association_name: v })} />
        </div>
        <div>
          <label className="text-[11px] font-bold tracking-wider text-muted-foreground">PRIMARY COLOR</label>
          <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="mt-1 block h-10 w-20 rounded-lg border border-border bg-surface" />
        </div>
        <button disabled={saving} className="mt-4 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {saving ? "Creating…" : "Create team"}
        </button>
        <p className="text-center text-[11px] text-muted-foreground">You can add roster (manual, CSV, or copy from a camp) after creating.</p>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal"
      />
    </label>
  );
}