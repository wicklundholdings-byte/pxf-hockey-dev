import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PxfLogo } from "@/components/app-shell";
import { Users } from "lucide-react";
import { getUserAppRole, roleHome } from "@/lib/user-role";
import { DevPanel } from "@/components/dev-panel";

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
  const [role, setRole] = useState<"parent" | "coach">("parent");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);

  const handleLogoTap = () => {
    const next = logoTaps + 1;
    if (next >= 5) {
      setLogoTaps(0);
      setDevOpen(true);
    } else {
      setLogoTaps(next);
      // Reset the tap counter after 1.5s of inactivity.
      window.setTimeout(() => setLogoTaps((n) => (n === next ? 0 : n)), 1500);
    }
  };

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
            data: { full_name: fullName, signup_role: role },
          },
        });
        if (error) throw error;
        // If they signed up as a coach, immediately grant the admin role and
        // send them straight to the coach console.
          if (role === "coach") {
            await supabase.rpc("claim_coach_role").then(() => {}, () => {});
          navigate({ to: "/coach" });
          return;
        }
        // Parent / athlete signup → onboarding flow that captures children.
        navigate({ to: "/onboarding/parent" });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // After auth, always route from the database role into the correct shell.
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      let dest: string = "/parent";
      if (uid) {
        const appRole = await getUserAppRole(uid);
        dest = roleHome(appRole);
      }
      navigate({ to: dest as "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-10">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleLogoTap}
          aria-label="PXF Hockey"
          className="rounded-md focus:outline-none"
        >
          <PxfLogo />
        </button>
      </div>
      <h1 className="mt-8 text-center font-display text-2xl font-bold text-foreground">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {isSignup ? "Start training with PXF Hockey." : "Sign in to continue."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-3">
        {isSignup && (
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground">I AM A</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <RoleCard
                active={role === "parent"}
                onClick={() => setRole("parent")}
                icon={<Users size={16} />}
                title="Parent / Athlete"
                sub="Register kids, book camps, track progress"
              />
              <RoleCard
                active={role === "coach"}
                onClick={() => setRole("coach")}
                icon={<span className="font-display text-base font-bold">C</span>}
                title="Coach"
                sub="Run camps, build sessions, manage rosters"
              />
            </div>
          </div>
        )}
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

function RoleCard({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition " +
        (active ? "border-teal bg-teal/10" : "border-border/60 bg-surface")
      }
    >
      <span className={"grid h-7 w-7 place-items-center rounded-full " + (active ? "bg-teal text-black" : "bg-surface-2 text-muted-foreground")}>
        {icon}
      </span>
      <span className="text-sm font-bold leading-tight">{title}</span>
      <span className="text-[10px] leading-tight text-muted-foreground">{sub}</span>
    </button>
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