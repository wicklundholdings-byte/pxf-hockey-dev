import { createFileRoute } from "@tanstack/react-router";
import { CoachDrylandLibrary } from "@/components/coach/dryland-library";

export const Route = createFileRoute("/_authenticated/coach/train")({
  component: () => (
    <div className="-mx-5 -mt-2 px-5 pt-2">
      <CoachDrylandLibrary />
    </div>
  ),
});