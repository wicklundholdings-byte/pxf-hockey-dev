import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/tournaments")({
  component: () => <Outlet />,
});
