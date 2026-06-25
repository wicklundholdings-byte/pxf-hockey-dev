import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { acceptStaffInvite } from "@/lib/staff.functions";

export const Route = createFileRoute("/staff-invite/$token")({
  ssr: false,
  component: StaffInvitePage,
});

type Invite = { id: string; email: string; full_name: string | null; status: string; owner_name: string };

function StaffInvitePage() {
  const { token } = useParams({ from: "/staff-invite/$token" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_staff_invite_by_token", { _token: token });
      if (error) { setError(error.message); return; }
      setInvite(data as Invite);
    })();
  }, [token]);

  const accept = async () => {
    setBusy(true);
    try {
      await acceptStaffInvite({ data: { token } });
      navigate({ to: "/coach" });
    } catch (e: any) { setError(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  if (error) return <div className="p-6 text-sm text-red-400">{error}</div>;
  if (!invite) return <div className="p-6 text-sm text-muted-foreground">Loading invite…</div>;

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="font-display text-2xl font-bold">You're invited</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{invite.owner_name}</span> invited you to coach on PXF Hockey as a staff coach.
      </p>
      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Invite for</p>
        <p className="mt-1 text-sm font-semibold">{invite.email}</p>
        <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">Status</p>
        <p className="mt-1 text-sm font-semibold capitalize">{invite.status}</p>
      </div>
      {authLoading ? (
        <p className="mt-6 text-xs text-muted-foreground">Checking your session…</p>
      ) : !user ? (
        <div className="mt-6 space-y-2">
          <p className="text-xs text-muted-foreground">Sign in or create an account using <span className="font-semibold">{invite.email}</span> to accept.</p>
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "signup", redirect: `/staff-invite/${token}`, email: invite.email } as any })}
            className="w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground"
          >Create account</button>
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "login", redirect: `/staff-invite/${token}`, email: invite.email } as any })}
            className="w-full rounded-full border border-border py-3 text-sm font-semibold"
          >Sign in</button>
        </div>
      ) : (
        <button
          onClick={accept} disabled={busy}
          className="mt-6 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >{busy ? "Accepting…" : "Accept invite"}</button>
      )}
    </div>
  );
}