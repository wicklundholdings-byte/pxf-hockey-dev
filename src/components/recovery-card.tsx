import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Heart, Moon, Zap as Strain, Loader2 } from "lucide-react";

type Provider = "apple_health" | "whoop" | "garmin";
type Connection = {
  provider: Provider;
  last_synced_at: string | null;
  resting_hr: number | null;
  hrv: number | null;
  sleep_score: number | null;
  recovery_score: number | null;
  daily_strain: number | null;
};

const PROVIDERS: { id: Provider; label: string; subtitle: string; iosOnly?: boolean }[] = [
  { id: "apple_health", label: "Apple Health", subtitle: "HealthKit", iosOnly: true },
  { id: "whoop", label: "Whoop", subtitle: "OAuth" },
  { id: "garmin", label: "Garmin Connect", subtitle: "OAuth" },
];

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

export function RecoveryCard({ athleteId }: { athleteId: string | null | undefined }) {
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Provider | null>(null);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    let cancelled = false;
    supabase
      .from("athlete_device_connections" as never)
      .select("provider, last_synced_at, resting_hr, hrv, sleep_score, recovery_score, daily_strain")
      .eq("athlete_id", athleteId)
      .then(({ data }: { data: Connection[] | null }) => {
        if (cancelled) return;
        setConns(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [athleteId]);

  const connect = async (provider: Provider) => {
    if (!athleteId) return;
    setBusy(provider);
    // TODO (build phase): trigger real OAuth / HealthKit permission flow.
    if (provider === "apple_health" && isIOS()) {
      // Stub: would call window.webkit.messageHandlers.healthkit.postMessage(...)
      // for a native bridge; or use a WKWebView postMessage in a wrapper app.
    }
    const stub: Partial<Connection> = {
      last_synced_at: new Date().toISOString(),
      resting_hr: 54,
      hrv: 78,
      sleep_score: 86,
      recovery_score: 72,
      daily_strain: 14.2,
    };
    const { data, error } = await supabase
      .from("athlete_device_connections" as never)
      .upsert(
        { athlete_id: athleteId, provider, access_token: "stub_token", ...stub },
        { onConflict: "athlete_id,provider" },
      )
      .select("provider, last_synced_at, resting_hr, hrv, sleep_score, recovery_score, daily_strain")
      .maybeSingle();
    setBusy(null);
    if (error || !data) return;
    setConns((prev) => {
      const others = prev.filter((p) => p.provider !== provider);
      return [...others, data as Connection];
    });
  };

  const visibleProviders = PROVIDERS.filter((p) => !p.iosOnly || isIOS() || true); // keep all visible; iOS triggers HealthKit
  const active = conns.find((c) => c.recovery_score != null) ?? conns[0];

  return (
    <section className="mt-5 rounded-3xl border border-border/60 bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Heart size={14} className="text-teal" /> Recovery & Wellness
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {active ? "Live" : "Not connected"}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-teal" size={16} /></div>
      ) : active ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Metric icon={Heart} label="Resting HR" value={active.resting_hr} unit="bpm" />
            <Metric icon={Activity} label="HRV" value={active.hrv} unit="ms" />
            <Metric icon={Moon} label="Sleep" value={active.sleep_score} unit="/100" />
            <Metric icon={Heart} label="Recovery" value={active.recovery_score} unit="/100" />
            <Metric icon={Strain} label="Strain" value={active.daily_strain} unit="" />
          </div>
          {active.last_synced_at && (
            <p className="mt-3 text-[10px] text-muted-foreground">
              Synced {new Date(active.last_synced_at).toLocaleString()}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Connect a device to track HRV, sleep, recovery, and daily strain.
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2">
        {visibleProviders.map((p) => {
          const conn = conns.find((c) => c.provider === p.id);
          const connected = !!conn;
          return (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">{p.subtitle}</p>
              </div>
              <button
                disabled={busy === p.id}
                onClick={() => connect(p.id)}
                className={
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-60 " +
                  (connected ? "border border-border text-foreground" : "bg-teal text-background")
                }
              >
                {busy === p.id ? "…" : connected ? "Reconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value, unit }: { icon: typeof Heart; label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-2 py-2 text-center">
      <Icon size={12} className="mx-auto text-teal" />
      <p className="mt-1 font-display text-base font-black leading-none text-foreground">{value ?? "—"}</p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}{unit && ` ${unit}`}</p>
    </div>
  );
}