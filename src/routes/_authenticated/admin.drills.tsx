import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, uploadToBucket } from "@/lib/admin-utils";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Input, Textarea, FileInput } from "./admin.categories";

type Drill = Database["public"]["Tables"]["drills"]["Row"];
type Cat = Database["public"]["Tables"]["drill_categories"]["Row"];
type Difficulty = Database["public"]["Enums"]["difficulty_level"];

export const Route = createFileRoute("/_authenticated/admin/drills")({
  component: AdminDrills,
});

function AdminDrills() {
  const [items, setItems] = useState<Drill[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Partial<Drill> | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [d, c] = await Promise.all([
      supabase.from("drills").select("*").order("sort_order"),
      supabase.from("drill_categories").select("*").order("sort_order"),
    ]);
    setItems(d.data ?? []);
    setCats(c.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const videoFile = (document.getElementById("drill-vid") as HTMLInputElement | null)?.files?.[0];
      const thumbFile = (document.getElementById("drill-thumb") as HTMLInputElement | null)?.files?.[0];
      const diagramFile = (document.getElementById("drill-diagram") as HTMLInputElement | null)?.files?.[0];
      console.log("videoFile", videoFile);
      let video_url = editing.video_url ?? null;
      let thumbnail_url = editing.thumbnail_url ?? null;
      let diagram_url = editing.diagram_url ?? null;
      if (videoFile) video_url = await uploadToBucket("drill-videos", videoFile);
      console.log("video_url after upload", video_url);
      if (thumbFile) thumbnail_url = await uploadToBucket("drill-thumbnails", thumbFile);
      if (diagramFile) diagram_url = await uploadToBucket("drill-thumbnails", diagramFile);

      const payload = {
        title: editing.title ?? "",
        slug: editing.slug || slugify(editing.title ?? ""),
        category_id: editing.category_id ?? null,
        short_description: editing.short_description ?? null,
        full_description: editing.full_description ?? null,
        coaching_points: editing.coaching_points ?? null,
        equipment_needed: editing.equipment_needed ?? null,
        difficulty_level: editing.difficulty_level ?? null,
        age_group: editing.age_group ?? null,
        skill_focus: editing.skill_focus ?? null,
        duration_minutes: editing.duration_minutes ?? null,
        is_premium: editing.is_premium ?? false,
        is_published: editing.is_published ?? false,
        sort_order: editing.sort_order ?? 0,
        video_url, thumbnail_url, diagram_url,
      };
      console.log("payload before save", payload);
      if (editing.id) {
        const result = await supabase.from("drills").update(payload).eq("id", editing.id);
        console.log("supabase update result", result);
        if (result.error) console.error("supabase update error", result.error);
      } else {
        await supabase.from("drills").insert(payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally { setBusy(false); }
  }

  async function togglePublish(d: Drill) {
    await supabase.from("drills").update({ is_published: !d.is_published }).eq("id", d.id);
    await load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this drill?")) return;
    await supabase.from("drills").delete().eq("id", id);
    await load();
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-3">
        <h2 className="font-display text-lg font-bold">{editing.id ? "Edit" : "New"} drill</h2>
        <Input label="Title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} required />
        <Input label="Slug (auto)" value={editing.slug ?? ""} onChange={(v) => setEditing({ ...editing, slug: v })} />
        <Select label="Category" value={editing.category_id ?? ""} onChange={(v) => setEditing({ ...editing, category_id: v || null })}>
          <option value="">— none —</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
        <Textarea label="Short description" value={editing.short_description ?? ""} onChange={(v) => setEditing({ ...editing, short_description: v })} />
        <Textarea label="Full description" value={editing.full_description ?? ""} onChange={(v) => setEditing({ ...editing, full_description: v })} />
        <Textarea label="Coaching points" value={editing.coaching_points ?? ""} onChange={(v) => setEditing({ ...editing, coaching_points: v })} />
        <Input label="Equipment needed" value={editing.equipment_needed ?? ""} onChange={(v) => setEditing({ ...editing, equipment_needed: v })} />
        <Select label="Difficulty" value={editing.difficulty_level ?? ""} onChange={(v) => setEditing({ ...editing, difficulty_level: (v || null) as Difficulty | null })}>
          <option value="">—</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="elite">Elite</option>
        </Select>
        <Input label="Age group" value={editing.age_group ?? ""} onChange={(v) => setEditing({ ...editing, age_group: v })} />
        <Input label="Skill focus" value={editing.skill_focus ?? ""} onChange={(v) => setEditing({ ...editing, skill_focus: v })} />
        <Input label="Duration (minutes)" type="number" value={String(editing.duration_minutes ?? "")} onChange={(v) => setEditing({ ...editing, duration_minutes: v ? Number(v) : null })} />
        <Input label="Sort order" type="number" value={String(editing.sort_order ?? 0)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) })} />
        <FileInput id="drill-vid" label="Video file" accept="video/*" />
        <FileInput id="drill-thumb" label="Thumbnail" accept="image/*" />
        <FileInput id="drill-diagram" label="Drill Diagram (rink setup image)" accept="image/*" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editing.is_premium ?? false} onChange={(e) => setEditing({ ...editing, is_premium: e.target.checked })} />
          Premium content
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editing.is_published ?? false} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
          Published
        </label>
        <div className="flex gap-2 pt-2">
          <button disabled={busy} className="flex-1 rounded-xl bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground">{busy ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-border/60 px-4 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <button onClick={() => setEditing({ is_published: false, is_premium: false, sort_order: 0 })} className="mb-3 flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3 py-2 text-xs font-bold text-primary-foreground">
        <Plus size={14} /> New drill
      </button>
      <ul className="space-y-2">
        {items.map((d) => (
          <li key={d.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {d.difficulty_level ?? "—"} • {d.is_published ? "Published" : "Draft"} {d.is_premium ? "• Premium" : ""}
              </p>
            </div>
            <button title={d.is_published ? "Unpublish" : "Publish"} onClick={() => togglePublish(d)} className="grid h-8 w-8 place-items-center rounded-lg border border-border/60">
              {d.is_published ? <Eye size={14} className="text-teal" /> : <EyeOff size={14} />}
            </button>
            <button onClick={() => setEditing(d)} className="grid h-8 w-8 place-items-center rounded-lg border border-border/60"><Pencil size={14} /></button>
            <button onClick={() => remove(d.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-destructive/40 text-destructive"><Trash2 size={14} /></button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">No drills yet.</li>}
      </ul>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-teal">
        {children}
      </select>
    </label>
  );
}