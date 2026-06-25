import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { X, LogIn, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEV_ACCOUNTS, DEV_PASSWORD, seedDevAccounts } from "@/lib/dev-accounts.functions";
import { setMockTier } from "@/hooks/use-tier";

/**
 * Dev-only login & seed panel. Rendered on /auth either via 5-tap on the PXF
 * logo, or via a "DEV" corner button shown only when import.meta.env.DEV.
 */
export function DevPanel({ onClose }: { onClose: () => void }) {
  const seed = useServerFn(seedDevAccounts);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const autoRan = useRef(false);

  // Auto-seed on first open so "Login as" works immediately. Seeding 5
  // accounts + mock data takes ~30-60s; we block the login buttons until
  // it finishes so users don't tap into invalid_credentials.
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    (async () => {
      setSeeding(true);
      try {
        await seed({});
        setSeeded(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Seeding failed");
      }
      setSeeding(false);
    })();
  }, [seed]);

  async function loginAs(account: (typeof DEV_ACCOUNTS)[number]) {
    setErr(null);
    setBusy(account.email);
    const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: DEV_PASSWORD });
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    setMockTier(account.tier);
    onClose();
    navigate({ to: "/" });
  }

  async function reseed() {
    setErr(null);
    setSeeding(true);
    try {
      await seed({});
      setSeeded(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Seeding failed");
    }
    setSeeding(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-teal/40 bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal">Dev Tools</p>
            <h2 className="font-display text-lg font-bold text-foreground">Test Accounts</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              One per tier. Password: <code className="rounded bg-surface-2 px-1 text-foreground">{DEV_PASSWORD}</code>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-surface p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Close dev tools"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {DEV_ACCOUNTS.map((a) => (
            <div
              key={a.email}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{a.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{a.email}</p>
              </div>
              <button
                onClick={() => loginAs(a)}
                disabled={!!busy || seeding}
                className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
              >
                <LogIn size={11} />
                {busy === a.email ? "Signing in…" : "Login as"}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={reseed}
          disabled={seeding || !!busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-teal/40 bg-teal/10 py-2.5 text-xs font-bold text-teal disabled:opacity-50"
        >
          <RefreshCw size={12} className={seeding ? "animate-spin" : ""} />
          {seeding ? "Seeding mock data…" : seeded ? "Re-seed mock data" : "Seed / refresh mock data"}
        </button>

        {err && (
          <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            {err}
          </p>
        )}
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          This panel is hidden in production builds.
        </p>
      </div>
    </div>
  );
}