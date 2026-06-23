import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/combine/share/$token")({
  head: () => ({ meta: [
    { title: "PXF Combine — Athlete Profile" },
    { name: "description", content: "Public PXF Combine performance profile." },
  ] }),
  component: PublicCombineShare,
});

type Score = { category: string; score: number; percentile: number | null; global_rank: number | null };
type Athlete = { full_name: string | null; age_group: string | null; position: string | null };

const LABELS: Record<string, string> = {
  speed_power: "Speed & Power",
  jumping_explosiveness: "Jumping & Explosiveness",
  shot_power: "Shot Power",
  shot_speed: "Shot Speed",
  agility_circuits: "Agility & Circuits",
  recovery_wellness: "Recovery & Wellness",
};

function PublicCombineShare() {
  const { token } = useParams({ from: "/combine/share/$token" });
  const [scores, setScores] = useState<Score[]>([]);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc("get_combine_share", { _token: token });
      if (cancelled) return;
      if (data) {
        setAthlete(data.athlete as Athlete);
        setScores((data.scores ?? []) as Score[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="animate-spin text-teal" /></div>;

  if (!athlete) {
    return <div className="grid min-h-screen place-items-center bg-background text-foreground"><p>Share link expired or invalid.</p></div>;
  }

  const overall = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : null;

  return (
    <div className="min-h-screen bg-background px-5 pt-8 pb-16 text-foreground">
      <div className="mx-auto max-w-[480px]">
        <p className="text-[10px] font-bold tracking-[0.3em] text-teal">PXF COMBINE · PUBLIC PROFILE</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{athlete.full_name ?? "Athlete"}</h1>
        <p className="text-xs text-muted-foreground">
          {athlete.age_group ?? "—"}{athlete.position ? ` · ${athlete.position}` : ""}
        </p>

        <div className="mt-5 rounded-3xl border border-border bg-gradient-to-b from-surface to-surface-2 p-5 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-volt">OVERALL SCORE</p>
          <p className="font-display text-6xl font-black">{overall ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground">/ 1000</p>
        </div>

        <div className="mt-5 space-y-2">
          {scores.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface px-3 py-3 text-center text-xs text-muted-foreground">No scores recorded yet.</p>
          ) : scores.map((s) => (
            <div key={s.category} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-3">
              <div>
                <p className="text-sm font-semibold">{LABELS[s.category] ?? s.category}</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.percentile != null ? `${s.percentile.toFixed(0)}th percentile` : "—"}
                  {s.global_rank != null ? ` · Global rank #${s.global_rank}` : ""}
                </p>
              </div>
              <p className="font-display text-2xl font-black">{s.score}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">Powered by PXF Hockey</p>
      </div>
    </div>
  );
}