import { useEffect, useRef } from "react";

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined") return;
    const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> } }).wakeLock;
    if (!wl) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await wl.request("screen");
        if (cancelled) {
          await s.release().catch(() => {});
          return;
        }
        sentinelRef.current = s;
        s.addEventListener("release", () => {
          if (sentinelRef.current === s) sentinelRef.current = null;
        });
      } catch {
        // ignore — wake lock unsupported or denied
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s && !s.released) void s.release().catch(() => {});
    };
  }, [active]);
}