import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/schedule/$eventId")({
  component: () => <Outlet />,
});