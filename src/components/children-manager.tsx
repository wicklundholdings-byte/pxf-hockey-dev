import { useEffect, useState } from "react";
import { Plus, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Attendee = {
  id: string;
  full_name: string;
  birthday: string | null;
  position: string | null;
  skill_level: string | null;
};

const POSITIONS = ["Forward", "Defense", "Goalie"];
const LEVELS = ["Beginner", "Intermediate", "Competitive", "Elite"];

export function ChildrenManager({ ownerId, title = "My Family" }: { ownerId: string; title?: string }) {
  const [kids, setKids] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", birthday: "", position: "Forward", skill_level: "Intermediate" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("attendees")
      .select("id, full_name, birthday, position, skill_level")
      .eq("owner_id", ownerId)
      .order("created_at");
    setKids((data ?? []) as Attendee[]);
    setLoading(false);
  }

  useEffect(() => { if (ownerId) load(); }, [ownerId]);

  async function addChild() {
    if (!form.full_name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr(null);
    const { error } = await supabase.from("attendees").insert({
      owner_id: ownerId,
      full_name: form.full_name.trim(),
      birthday: form.birthday || null,
      position: form.position,
      skill_level: form.skill_level,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setForm({ full_name: "", birthday: "", position: "Forward", skill_level: "Intermediate" });
    setShowForm(false);
    load();
  }

  async function removeChild(id: string) {
    if (!confirm("Remove this athlete profile?")) return;
    await supabase.from("attendees").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black"
          >
            <Plus size={12} /> Add athlete
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-muted-foreground">Loading…</p>
      ) : kids.length === 0 && !showForm ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-surface p-6 text-center">
          <User className="mx-auto text-muted-foreground" size={20} />
          <p className="mt-2 text-sm font-semibold">No athletes yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add your child to register them for camps and track progress.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {kids.map((k) => (
            <div key={k.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface p-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground">
                {k.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{k.full_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {[k.position, k.skill_level, k.birthday].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                onClick={() => removeChild(k.id)}
                aria-label="Remove athlete"
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border/60 bg-surface p-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm"
              placeholder="e.g. Jamie Smith"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date of birth</label>
            <input
              type="date"
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Position</label>
              <select
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm"
              >
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Skill level</label>
              <select
                value={form.skill_level}
                onChange={(e) => setForm({ ...form, skill_level: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm"
              >
                {LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {err && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowForm(false); setErr(null); }} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button
              onClick={addChild}
              disabled={saving}
              className="rounded-full bg-teal px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save athlete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}