import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Share2, Lock, TrendingUp, Loader2 } from "lucide-react";
import { RecoveryCard } from "@/components/recovery-card";

export const Route = createFileRoute("/combine/$athleteId")({
  head: () => ({ meta: [{ title: "PXF Combine Profile — PXF Hockey" }] }),
  component: CombineProfile,
});

type CombineCategory =
  | "speed_power" | "jumping_explosiveness" | "shot_power"
  | "shot_speed" | "agility_circuits" | "recovery_wellness";

const CATEGORIES: { key: CombineCategory; label: string; metrics: string; source: string; comingSoon: boolean }[] = [
  { key: "speed_power",          label: "Speed & Power",           metrics: "First-step accel · top speed · power/stride",  source: "PXF Resistance Trainer", comingSoon: true },
  { key: "jumping_explosiveness", label: "Jumping & Explosiveness", metrics: "Vertical · peak force · RFD",                  source: "PXF Force Plate",       comingSoon: true },
  { key: "shot_power",           label: "Shot Power",              metrics: "Peak shot force · direction · shot type",      source: "PXF Shot Plate",        comingSoon: true },
  { key: "shot_speed",           label: "Shot Speed",              metrics: "Puck velocity by shot type",                   source: "Radar / manual entry",  comingSoon: false },
  { key: "agility_circuits",     label: "Agility & Circuits",      metrics: "Timed circuits · edge-to-edge",                source: "PXF Speed Gates",       comingSoon: true },
  { key: "recovery_wellness",    label: "Recovery & Wellness",     metrics: "HRV · sleep · recovery",                       source: "Apple Health / Whoop / Garmin", comingSoon: false },
];

type Score = { category: CombineCategory; score: number; percentile: number | null; global_rank: number | null };
type Test = { id: string; category: CombineCategory; metric: string; value: number; unit: string; tested_at: string };

function CombineProfile() {
  const { athleteId } = useParams({ from: "/combine/$athleteId" });
  const [athlete, setAthlete] = useState<{ full_name: string | null } | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [share, setShare] = useState<{ token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    (async () => {
      const [{ data: a }, { data: s }, { data: t }, { data: sh }] = await Promise.all([
        supabase.from("attendees").select("full_name").eq("id", athleteId).maybeSingle(),
        (supabase as any).from("combine_scores").select("category, score, percentile, global_rank").eq("athlete_id", athleteId),
        (supabase as any).from("combine_tests").select("id, category, metric, value, unit, tested_at").eq("athlete_id", athleteId).order("tested_at", { ascending: false }),
        (supabase as any).from("combine_public_shares").select("token").eq("athlete_id", athleteId).is("revoked_at", null).maybeSingle(),
      ]);
      if (cancelled) return;
      setAthlete(a ?? null);
      setScores((s as Score[]) ?? []);
      setTests((t as Test[]) ?? []);
      setShare(sh ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [athleteId]);

  const overall = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : null;

  const createShare = async () => {
    const { data } = await (supabase as any)
      .from("combine_public_shares")
      .insert({ athlete_id: athleteId })
      .select("token")
      .maybeSingle();
    if (data) setShare(data);
  };

  const copyShare = () => {
    if (!share) return;
    const url = `${window.location.origin}/combine/share/${share.token}`;
    void navigator.clipboard.writeText(url);
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="animate-spin text-teal" /></div>;
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-16 text-foreground">
      <div className="mx-auto max-w-[480px]">
        <div className="flex items-center justify-between">
          <Link to="/parent" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface"><ArrowLeft size={16} /></Link>
          <button
            onClick={share ? copyShare : createShare}
            className="flex items-center gap-1.5 rounded-full bg-teal/15 px-3 py-1.5 text-[11px] font-bold text-teal"
          >
            <Share2 size={12} /> {share ? "Copy share link" : "Create share link"}
          </button>
        </div>

        <div className="mt-5 rounded-3xl border border-border bg-gradient-to-b from-surface to-surface-2 p-5 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-volt">PXF COMBINE SCORE</p>
          <p className="font-display text-6xl font-black text-foreground">{overall ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground">/ 1000 · {athlete?.full_name ?? "Athlete"}</p>
        </div>

        <div className="mt-5 space-y-3">
          {CATEGORIES.map((c) => {
            const sc = scores.find((s) => s.category === c.key) ?? null;
            const catTests = tests.filter((t) => t.category === c.key);
            return <CategoryCard key={c.key} cat={c} score={sc} tests={catTests} athleteId={athleteId} />;
          })}
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  cat, score, tests, athleteId,
}: {
  cat: typeof CATEGORIES[number];
  score: Score | null;
  tests: Test[];
  athleteId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const pending = !score;

  if (cat.key === "recovery_wellness") {
    return (
      <div>
        <RecoveryCard athleteId={athleteId} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-start justify-between text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{cat.label}</p>
            {cat.comingSoon && (
              <span className="rounded-full bg-volt/15 px-2 py-0.5 text-[9px] font-bold tracking-widest text-volt">COMING SOON</span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{cat.metrics}</p>
          <p className="text-[10px] text-muted-foreground">Source: {cat.source}</p>
        </div>
        <div className="text-right">
          {pending ? (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Lock size={10} /> Test Pending
            </span>
          ) : (
            <>
              <p className="font-display text-2xl font-black text-foreground">{score!.score}</p>
              <p className="text-[10px] text-muted-foreground">
                {score!.percentile != null ? `${score!.percentile.toFixed(0)}th pctl` : "—"}
              </p>
            </>
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingUp size={10} /> History
          </p>
          {tests.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">No tests recorded yet.</p>
          ) : (
            <MiniLine tests={tests} />
          )}
        </div>
      )}
    </div>
  );
}

function MiniLine({ tests }: { tests: Test[] }) {
  const sorted = [...tests].sort((a, b) => +new Date(a.tested_at) - +new Date(b.tested_at));
  const values = sorted.map((t) => Number(t.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 280;
  const h = 60;
  const pts = sorted.map((t, i) => {
    const x = (i / Math.max(1, sorted.length - 1)) * w;
    const y = h - ((Number(t.value) - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="mt-2 overflow-x-auto">
      <svg width={w} height={h}>
        <polyline points={pts} fill="none" stroke="#2dd4bf" strokeWidth={2} />
        {sorted.map((t, i) => {
          const x = (i / Math.max(1, sorted.length - 1)) * w;
          const y = h - ((Number(t.value) - min) / range) * h;
          return <circle key={t.id} cx={x} cy={y} r={3} fill="#84cc16" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
        <span>{new Date(sorted[0].tested_at).toLocaleDateString()}</span>
        <span>{new Date(sorted[sorted.length - 1].tested_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}