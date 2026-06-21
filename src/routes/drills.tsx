import { createFileRoute } from "@tanstack/react-router";
import { Drills } from "@/components/drills-library";

export const Route = createFileRoute("/drills")({
  head: () => ({
    meta: [
      { title: "Drill Library — PXF Hockey" },
      { name: "description", content: "Drills organized by category with video, equipment, age and progression levels." },
      { property: "og:title", content: "Drill Library — PXF Hockey" },
      { property: "og:description", content: "Drills organized by category with video and progressions." },
    ],
  }),
  component: Drills,
});