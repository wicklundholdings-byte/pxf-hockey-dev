import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, uploadToBucket } from "@/lib/admin-utils";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Cat = Database["public"]["Tables"]["drill_categories"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const [items, setItems] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("drill_categories").select("*").order("sort_order");
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const file = (document.getElementById("cat-img") as HTMLInputElement | null)?.files?.[0];
      let image_url = editing.image_url ?? null;
      if (file) image_url = await uploadToBucket("category-images", file);
      const payload = {
        title: editing.title ?? "",
        slug: editing.slug || slugify(editing.title ?? ""),
        description: editing.description ?? null,
        sort_order: editing.sort_order ?? 0,
        is_active: editing.is_active ?? true,
        image_url,
      };
      if (editing.id) {
        await supabase.from("drill_categories").update(payload).eq("id", editing.id);
      } else {
        await supabase.from("drill_categories").insert(payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    await supabase.from("drill_categories").delete().eq("id", id);
    await load();
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-3">
        <h2 className="font-display text-lg font-bold">{editing.id ? "Edit" : "New"} category</h2>
        <Input label="Title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} required />
        <Input label="Slug (auto)" value={editing.slug ?? ""} onChange={(v) => setEditing({ ...editing, slug: v })} />
        <Textarea label="Description" value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
        <Input label="Sort order" type="number" value={String(editing.sort_order ?? 0)} onChange={(v) => setEditing({ ...editing, sort_order: Number(v) })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
          Active
        </label>
        <FileInput id="cat-img" label="Image" />
        <div className="flex gap-2 pt-2">
          <button disabled={busy} className="flex-1 rounded-xl bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground">{busy ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-border/60 px-4 py-2.5 text-sm">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <button onClick={() => setEditing({ is_active: true, sort_order: 0 })} className="mb-3 flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3 py-2 text-xs font-bold text-primary-foreground">
        <Plus size={14} /> New category
      </button>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{c.slug} • {c.is_active ? "active" : "inactive"}</p>
            </div>
            <button onClick={() => setEditing(c)} className="grid h-8 w-8 place-items-center rounded-lg border border-border/60"><Pencil size={14} /></button>
            <button onClick={() => remove(c.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-destructive/40 text-destructive"><Trash2 size={14} /></button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">No categories yet.</li>}
      </ul>
    </div>
  );
}

export function Input({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-teal" />
    </label>
  );
}
export function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-teal" />
    </label>
  );
}
export function FileInput({ id, label, accept }: { id: string; label: string; accept?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <input id={id} type="file" accept={accept} className="mt-1 block w-full text-xs text-muted-foreground" />
    </label>
  );
}