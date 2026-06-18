import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, FolderTree, ListChecks, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ drills: 0, published: 0, categories: 0, programs: 0, users: 0 });

  useEffect(() => {
    (async () => {
      const [d, p, c, pr, u] = await Promise.all([
        supabase.from("drills").select("*", { count: "exact", head: true }),
        supabase.from("drills").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("drill_categories").select("*", { count: "exact", head: true }),
        supabase.from("training_programs").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        drills: d.count ?? 0,
        published: p.count ?? 0,
        categories: c.count ?? 0,
        programs: pr.count ?? 0,
        users: u.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Drills", value: `${stats.published}/${stats.drills}`, sub: "published/total", icon: Dumbbell, to: "/admin/drills" },
    { label: "Categories", value: stats.categories, sub: "total", icon: FolderTree, to: "/admin/categories" },
    { label: "Programs", value: stats.programs, sub: "total", icon: ListChecks, to: "/admin/programs" },
    { label: "Users", value: stats.users, sub: "registered", icon: Users },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => {
        const inner = (
          <div className="rounded-2xl border border-border/60 bg-surface p-4">
            <c.icon size={16} className="text-teal" />
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-[11px] tracking-wider text-muted-foreground">{c.label.toUpperCase()}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{c.sub}</p>
          </div>
        );
        return "to" in c && c.to ? (
          <Link key={c.label} to={c.to}>{inner}</Link>
        ) : (
          <div key={c.label}>{inner}</div>
        );
      })}
    </div>
  );
}