import { useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Location = {
  id: string;
  name: string;
  address: string | null;
  location_type: "rink" | "gym" | "outdoor" | "other";
  notes: string | null;
  cost_per_hour_cents: number | null;
};

const TYPE_LABEL: Record<string, string> = {
  rink: "RINK",
  gym: "GYM",
  outdoor: "OUTDOOR",
  other: "OTHER",
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded bg-teal/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-teal">
      {TYPE_LABEL[type] ?? type.toUpperCase()}
    </span>
  );
}

/**
 * Selector for saved locations. Falls back to a free-text input when
 * the user picks "Enter manually" or has no saved locations.
 */
export function LocationPicker({
  ownerId,
  valueId,
  manualValue,
  onChange,
  placeholder,
}: {
  ownerId?: string | null;
  valueId: string | null;
  manualValue: string;
  onChange: (next: { locationId: string | null; manual: string; selected: Location | null }) => void;
  placeholder?: string;
}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [mode, setMode] = useState<"select" | "manual">(valueId ? "select" : manualValue ? "manual" : "select");

  useEffect(() => {
    (async () => {
      let q = (supabase as any).from("rinks").select("id,name,address,location_type,notes,cost_per_hour_cents").order("name");
      if (ownerId) q = q.eq("owner_id", ownerId);
      const { data } = await q;
      setLocations((data ?? []) as Location[]);
    })();
  }, [ownerId]);

  if (mode === "manual" || locations.length === 0) {
    return (
      <div className="space-y-1.5">
        <input
          value={manualValue}
          onChange={(e) => onChange({ locationId: null, manual: e.target.value, selected: null })}
          placeholder={placeholder ?? "Rink or studio"}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {locations.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMode("select");
              onChange({ locationId: null, manual: "", selected: null });
            }}
            className="text-[11px] text-teal underline"
          >
            Pick a saved location
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <select
        value={valueId ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__manual__") {
            setMode("manual");
            onChange({ locationId: null, manual: "", selected: null });
            return;
          }
          const sel = locations.find((l) => l.id === v) ?? null;
          onChange({ locationId: sel?.id ?? null, manual: "", selected: sel });
        }}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">Select a location…</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} · {TYPE_LABEL[l.location_type] ?? "OTHER"}
          </option>
        ))}
        <option value="__manual__">＋ Enter manually</option>
      </select>
      {valueId && (() => {
        const sel = locations.find((l) => l.id === valueId);
        if (!sel) return null;
        return (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin size={11} /> {sel.address ?? "No address"}
          </p>
        );
      })()}
    </div>
  );
}

export function ManageLocationsLink() {
  return (
    <a href="/coach/locations" className="inline-flex items-center gap-1 text-[11px] text-teal">
      <Plus size={11} /> Manage saved locations
    </a>
  );
}