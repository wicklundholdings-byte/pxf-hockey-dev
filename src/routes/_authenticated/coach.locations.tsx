import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, MapPin, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEliteRole } from "@/hooks/use-elite-role";
import { TypeBadge, type Location } from "@/components/coach/location-picker";

export const Route = createFileRoute("/_authenticated/coach/locations")({
  ssr: false,
  component: LocationsPage,
});

type LocType = Location["location_type"];

function LocationsPage() {
  const { user } = useAuth();
  const { role, ownerId, loading: roleLoading } = useEliteRole();
  const [locations, setLocations] = useState<Location[]>([]);
  const [editing, setEditing] = useState<Location | "new" | null>(null);
  const [loading, setLoading] = useState(true);

  const canEdit = role !== "staff";
  const effectiveOwnerId = ownerId ?? user?.id ?? null;

  const reload = useCallback(async () => {
    if (!effectiveOwnerId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("rinks")
      .select("id,name,address,location_type,notes,cost_per_hour_cents")
      .eq("owner_id", effectiveOwnerId)
      .order("name");
    setLocations((data ?? []) as Location[]);
    setLoading(false);
  }, [effectiveOwnerId]);

  useEffect(() => {
    if (!roleLoading) reload();
  }, [reload, roleLoading]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Link to="/coach" className="flex items-center gap-1 text-xs text-muted-foreground">
          <ChevronLeft size={14} /> Back
        </Link>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1 rounded-xl bg-teal px-3 py-1.5 text-xs font-bold text-background"
          >
            <Plus size={14} /> Add Location
          </button>
        )}
      </div>

      <div>
        <h1 className="font-display text-xl font-bold">Locations</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Reusable venues for camps, sessions, and privates.
          {!canEdit && (
            <span className="ml-1 inline-flex items-center gap-1 text-amber-500">
              <Lock size={11} /> Read-only for staff
            </span>
          )}
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : locations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <MapPin className="mx-auto text-muted-foreground" size={20} />
          <p className="mt-2 text-sm">No locations yet.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-teal px-3 py-1.5 text-xs font-bold text-background"
            >
              <Plus size={14} /> Add your first location
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {locations.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => canEdit && setEditing(l)}
                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-left disabled:opacity-90"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
                    <TypeBadge type={l.location_type} />
                  </div>
                  {l.address && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{l.address}</p>
                  )}
                  {l.cost_per_hour_cents != null && (
                    <p className="mt-0.5 text-[11px] text-teal">
                      ${(l.cost_per_hour_cents / 100).toFixed(0)}/hr
                    </p>
                  )}
                </div>
                {canEdit && <Pencil size={14} className="mt-1 shrink-0 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && canEdit && effectiveOwnerId && (
        <LocationForm
          ownerId={effectiveOwnerId}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function LocationForm({
  ownerId,
  initial,
  onClose,
  onSaved,
}: {
  ownerId: string;
  initial: Location | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<LocType>((initial?.location_type as LocType) ?? "rink");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [costPerHour, setCostPerHour] = useState(
    initial?.cost_per_hour_cents != null ? String(initial.cost_per_hour_cents / 100) : "",
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }
    setSaving(true);
    setErr(null);
    const payload = {
      owner_id: ownerId,
      name: name.trim(),
      location_type: type,
      address: address.trim() || null,
      notes: notes.trim() || null,
      cost_per_hour_cents: costPerHour.trim() ? Math.round(parseFloat(costPerHour) * 100) : null,
    };
    const { error } = initial
      ? await (supabase as any).from("rinks").update(payload).eq("id", initial.id)
      : await (supabase as any).from("rinks").insert(payload);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved();
  }

  async function remove() {
    if (!initial) return;
    if (!confirm("Delete this location?")) return;
    setSaving(true);
    const { error } = await (supabase as any).from("rinks").delete().eq("id", initial.id);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved();
  }

  const types: { v: LocType; label: string }[] = [
    { v: "rink", label: "Rink" },
    { v: "gym", label: "Gym" },
    { v: "outdoor", label: "Outdoor" },
    { v: "other", label: "Other" },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold">{initial ? "Edit location" : "Add location"}</h3>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dev Arena"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</span>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {types.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={
                    "rounded-lg border py-2 text-xs font-semibold " +
                    (type === t.v
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-border bg-background text-muted-foreground")
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Rink Rd"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter through south doors, Rink B on the left"
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Cost per hour (optional)
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={costPerHour}
              onChange={(e) => setCostPerHour(e.target.value)}
              placeholder="$"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[10px] text-muted-foreground">
              Feeds Ice Costs on the Financials screen automatically.
            </span>
          </label>
          {err && <p className="text-[11px] text-red-400">{err}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          {initial && (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="rounded-xl border border-red-500/40 px-3 text-sm font-semibold text-red-400 disabled:opacity-60"
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-teal py-2 text-sm font-bold text-background disabled:opacity-60"
          >
            {saving ? "Saving…" : initial ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}