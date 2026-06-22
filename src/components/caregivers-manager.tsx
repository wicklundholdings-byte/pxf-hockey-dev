import { useEffect, useState } from "react";
import { Plus, Trash2, ShieldAlert, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Caregiver = {
  id: string;
  attendee_id: string;
  full_name: string;
  relationship: string;
  phone: string;
};

export function CaregiversManager({
  attendeeId,
  athleteName,
  compact = false,
}: { attendeeId: string; athleteName?: string; compact?: boolean }) {
  const [items, setItems] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ full_name: "", relationship: "", phone: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("authorized_caregivers")
      .select("id, attendee_id, full_name, relationship, phone")
      .eq("attendee_id", attendeeId)
      .order("created_at");
    setItems((data ?? []) as Caregiver[]);
    setLoading(false);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [attendeeId]);

  async function add() {
    if (!draft.full_name.trim() || !draft.relationship.trim() || !draft.phone.trim()) return;
    const { error } = await supabase.from("authorized_caregivers").insert({
      attendee_id: attendeeId,
      full_name: draft.full_name.trim(),
      relationship: draft.relationship.trim(),
      phone: draft.phone.trim(),
    });
    if (!error) {
      setDraft({ full_name: "", relationship: "", phone: "" });
      setAdding(false);
      void load();
    }
  }

  async function remove(id: string) {
    await supabase.from("authorized_caregivers").delete().eq("id", id);
    void load();
  }

  return (
    <div className={compact ? "" : "space-y-2"}>
      {!compact && athleteName && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Authorized caregivers for {athleteName}
        </p>
      )}

      {!loading && items.length === 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-300">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">No authorized caregivers yet</p>
            <p className="text-amber-300/80">Add anyone who can pick up your athlete (other than you).</p>
          </div>
        </div>
      )}

      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-teal/15 text-teal">
              <UserCheck size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{c.full_name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{c.relationship} · {c.phone}</p>
            </div>
            <button onClick={() => remove(c.id)} aria-label="Remove caregiver" className="text-muted-foreground hover:text-destructive">
              <Trash2 size={12} />
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="space-y-2 rounded-xl border border-border bg-background p-3">
          <input
            placeholder="Full name"
            value={draft.full_name}
            onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          />
          <input
            placeholder="Relationship (e.g. Grandparent, Nanny)"
            value={draft.relationship}
            onChange={(e) => setDraft({ ...draft, relationship: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          />
          <input
            placeholder="Phone"
            type="tel"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          />
          <div className="flex gap-2">
            <button onClick={add} className="flex-1 rounded-lg bg-teal py-2 text-[11px] font-bold text-background">Save</button>
            <button onClick={() => { setAdding(false); setDraft({ full_name: "", relationship: "", phone: "" }); }} className="rounded-lg border border-border px-3 py-2 text-[11px]">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:border-teal hover:text-teal"
        >
          <Plus size={12} /> Add caregiver
        </button>
      )}
    </div>
  );
}