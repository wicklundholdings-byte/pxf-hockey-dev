import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PxfLogo } from "@/components/app-shell";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "signup" ? "signup" : "login") as "login" | "signup",
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — PXF Hockey" },
      { name: "description", content: "Sign in or create your PXF Hockey account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode, redirect } = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: redirect as "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-10">
      <div className="flex justify-center"><PxfLogo /></div>
      <h1 className="mt-8 text-center font-display text-2xl font-bold text-foreground">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {isSignup ? "Start training with PXF Hockey." : "Sign in to continue."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-3">
        {isSignup && (
          <Field label="Full name" value={fullName} onChange={setFullName} type="text" required />
        )}
        <Field label="Email" value={email} onChange={setEmail} type="email" required />
        <Field label="Password" value={password} onChange={setPassword} type="password" required minLength={6} />

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-60"
        >
          {busy ? "Please wait…" : isSignup ? "CREATE ACCOUNT" : "SIGN IN"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account? " : "New to PXF Hockey? "}
        <Link
          to="/auth"
          search={{ mode: isSignup ? "login" : "signup", redirect }}
          className="font-semibold text-teal"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label, value, onChange, type, required, minLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type: string; required?: boolean; minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-wider text-muted-foreground">{label.toUpperCase()}</span>
      <input
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-teal"
      />
    </label>
  );
}