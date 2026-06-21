import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Use getSession() (local, no network) so a flaky /auth/v1/user request
    // doesn't bounce a signed-in user back to /auth. Server-side calls still
    // re-validate the bearer token via requireSupabaseAuth.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "login", redirect: location.href } });
    }
    return { user };
  },
  component: () => <Outlet />,
});