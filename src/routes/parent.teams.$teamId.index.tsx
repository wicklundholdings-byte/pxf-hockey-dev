import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/parent/teams/$teamId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/parent/teams/$teamId/schedule", params: { teamId: params.teamId } });
  },
  component: () => null,
});