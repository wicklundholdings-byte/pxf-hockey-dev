import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, uploadToBucket } from "@/lib/admin-utils";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Input, Textarea, FileInput } from "./admin.categories";

type Program = Database["public"]["Tables"]["training_programs"]["Row"];
type Drill = Database["public"]["Tables"]["drills"]["Row"];
type ProgramDrill = Database["public"]["Tables"]["program_drills"]["Row"];
type Difficulty = Database["public"]["Enums"]["difficulty_level"];

export const Route = createFileRoute("/_authenticated/admin/programs")({
  component: AdminPrograms,
});

function AdminPrograms() {
  const [items, setItems] = useState<Program[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [editing, setEditing] = useState<Partial<Program> | null>(null);
  const [linked, setLinked] = useState<ProgramDrill[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [p, d] = await Promise.all([
      supabase.from("training_programs").select("*").order("sort_order"),
      supabase.from("drills").select("*").order("title"),
    ]);
    setItems(p.data ?? []);
    setDrills(d.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function loadLinks(programId: string) {
    const { data } = await supabase.from("program_drills").select("*").eq("program_id", programId).order("day_number").order("sequence_order");
    setLinked(data ?? []);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const file = (document.getElementById("prog-img") as HTMLInputElement | null)?.files?.[0];
      let image_url = editing.image_url ?? null;
      if (file) image_url = await uploadToBucket("program-images", file);
      const payload = {
        title: editing.title ?? "",
        slug: editing.slug || slugify(editing.title ?? ""),
        description: editing.description ?? null,
        level: editing.level ?? null,
        age_group: editing.age_group ?? null,
        is_premium: editing.is_premium ?? false,
        is_published: editing.is_published ?? false,
        sort_order: editing.sort_order ?? 0,
        image_url,
      };
      if (editing.id) {
        await supabase.from("training_programs").update(payload).eq("id", editing.id);
      } else {
        const { data } = await supabase.from("training_programs").insert(payload).select().single();
        if (data) setEditing(data);
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally { setBusy(false); }
  }

  async function togglePublish(p: Program) {
    await supabase.from("training_programs").update({ is_published: !p.is_published }).eq("id", p.id);
    await load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this program?")) return;
    await supabase.from("training_programs").delete().eq("id", id);
    await load();
  }
  async function addLink(drillId: string, day: number) {
    if (!editing?.id) return;
    await supabase.from("program_drills").insert({
      program_id: editing.id, drill_id: drillId, day_number: day, sequence_order: linked.length,
    });
    await loadLinks(editing.id);
  }
  async function removeLink(id: string) {
    await supabase.from("program_drills").delete().eq("id", id);
    if (editing?.id) await loadLinks(editing.id);
  }

  useEffect(() => {
    if (editing?.id) loadLinks(editing.id);
    else setLinked([]);
  }, [editing?.id]);

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-3">
        <h2 className="font-display text-lg font-bold">{editing.id ? "Edit" : "New"} program</h2>
        <Input label="Title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} required />
        <Input label="Slug (auto)" value={editing.slug ?? ""} onChange={(v) => setEditing({ ...editing, slug: v })} />
        <Textarea label="Description" value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
        <label className="block">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground">LEVEL</span>
          <select value={editing.level ?? ""} onChange={(e) => setEditing({ ...editing, level: (e.target.value || null) as Difficulty | null })} className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm">
            <option value="">—</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="elite">Elite</option>
          </select>
        </label>
        <Input label="Age group" value={editing.age_group ?? ""} onChange={(v) => setEditing({ ...editing, age_group: v })} />
        <Input label="Sort order" type="number" value={String(editing.sort_order ?? 0)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) })} />
        <FileInput id="prog-img" label="Cover image" accept="image/*" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editing.is_premium ?? false} onChange={(e) => setEditing({ ...editing, is_premium: e.target.checked })} /> Premium
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editing.is_published ?? false} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} /> Published
        </label>

        {editing.id && (
          <div className="rounded-xl border border-border/60 bg-surface p-3">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">DRILLS IN PROGRAM</p>
            <ul className="mt-2 space-y-1.5">
              {linked.map((l) => {
                const drill = drills.find((d) => d.id === l.drill_id);
                return (
                  <li key={l.id} className="flex items-center gap-2 text-sm">
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px]">D{l.day_number}</span>
                    <span className="flex-1 truncate">{drill?.title ?? l.drill_id}</span>
                    <button type="button" onClick={() => removeLink(l.id)} className="text-destructive"><Trash2 size={12} /></button>
                  </li>
                );
              })}
              {linked.length === 0 && <li className="text-xs text-muted-foreground">No drills linked yet.</li>}
            </ul>
            <AddLink drills={drills} onAdd={addLink} />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button disabled={busy} className="flex-1 rounded-xl bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground">{busy ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-border/60 px-4 py-2.5 text-sm">Done</button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <button onClick={() => setEditing({ is_published: false, is_premium: false, sort_order: 0 })} className="mb-3 flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3 py-2 text-xs font-bold text-primary-foreground">
        <Plus size={14} /> New program
      </button>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{p.level ?? "—"} • {p.is_published ? "Published" : "Draft"}</p>
            </div>
            <button onClick={() => togglePublish(p)} className="grid h-8 w-8 place-items-center rounded-lg border border-border/60">
              {p.is_published ? <Eye size={14} className="text-teal" /> : <EyeOff size={14} />}
            </button>
            <button onClick={() => setEditing(p)} className="grid h-8 w-8 place-items-center rounded-lg border border-border/60"><Pencil size={14} /></button>
            <button onClick={() => remove(p.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-destructive/40 text-destructive"><Trash2 size={14} /></button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">No programs yet.</li>}
      </ul>
    </div>
  );
}

function AddLink({ drills, onAdd }: { drills: Drill[]; onAdd: (drillId: string, day: number) => void }) {
  const [drillId, setDrillId] = useState("");
  const [day, setDay] = useState(1);
  return (
    <div className="mt-3 flex gap-2">
      <select value={drillId} onChange={(e) => setDrillId(e.target.value)} className="flex-1 rounded-lg border border-border/60 bg-surface-2 px-2 py-1.5 text-xs">
        <option value="">Choose drill…</option>
        {drills.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
      </select>
      <input type="number" min={1} value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-14 rounded-lg border border-border/60 bg-surface-2 px-2 py-1.5 text-xs" />
      <button type="button" disabled={!drillId} onClick={() => { onAdd(drillId, day); setDrillId(""); }} className="rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-bold text-teal disabled:opacity-50">Add</button>
    </div>
  );
}