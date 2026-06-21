import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/book/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/camps/$slug", params: { slug: params.slug }, replace: true });
  },
  component: () => null,
});
