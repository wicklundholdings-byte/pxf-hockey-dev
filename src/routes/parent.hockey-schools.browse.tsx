import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, ChevronRight, Search } from "lucide-react";
import { listAllHockeySchools } from "@/lib/hockey-schools.functions";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/parent/hockey-schools/browse")({
  component: BrowseSchools,
});

type School = { owner_id: string; name: string; head_coach: string | null; location: string | null; bio: string | null };

function BrowseSchools() {
  const fetch = useServerFn(listAllHockeySchools);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [rows, setRows] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => {
      fetch({ data: { q: q || undefined, location: location || undefined } })
        .then((r) => setRows(r as School[]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(id);
  }, [q, location, fetch]);

  return (
    <div className="px-5 pt-2 pb-10">
      <div className="flex items-center gap-2">
        <Link to="/parent/teams" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Find a Hockey School</span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold">Browse schools</h1>
      <div className="mt-3 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Input placeholder="Location (city)" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="mt-4 space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No schools match — try a different search.</p>
        )}
        {rows.map((s) => (
          <Link
            key={s.owner_id}
            to="/parent/hockey-school/$ownerId"
            params={{ ownerId: s.owner_id }}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-teal to-emerald-500 text-background">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {[s.head_coach ? `Coach ${s.head_coach}` : null, s.location].filter(Boolean).join(" · ") || "Hockey school"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}