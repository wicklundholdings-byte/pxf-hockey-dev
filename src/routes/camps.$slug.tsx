import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/camps/$slug")({
  component: () => <Outlet />,
});