import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/coach/teams/$teamId/schedule", params: { teamId: params.teamId } });
  },
  component: () => null,
});