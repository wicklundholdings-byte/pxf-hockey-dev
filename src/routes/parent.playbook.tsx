import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PlaybookLibrary } from "@/components/coach/playbook-library";
import { PlaybookFavorites } from "@/components/coach/playbook-favorites";
import { MyTraining } from "@/components/parent/my-training";
import { VideosGrid } from "@/components/media/videos-grid";
import { clipsForAthlete, useClips } from "@/lib/mock-videos";
import { FilmingModeSheet } from "@/components/media/filming-mode-sheet";
import { useState as useLocalState } from "react";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/parent/playbook")({
  head: () => ({
    meta: [
      { title: "Playbook — PXF Hockey" },
      { name: "description", content: "Programs your coach has assigned and library drills." },
    ],
  }),
  component: ParentPlaybookPage,
});

type Tab = "library" | "training" | "videos" | "favorites";

function ParentPlaybookPage() {
  const [tab, setTab] = useState<Tab>("training");
  const allClips = useClips();
  // In this mock the "logged-in athlete" for parent view is Jake Andersson
  const athleteId = "jake-andersson";
  const clips = allClips.filter((c) => c.athleteIds.includes(athleteId) && c.visibility === "athlete_parents");
  const [filmingOpen, setFilmingOpen] = useLocalState(false);
  return (
    <div className="-mx-5 -mt-2">
      <div className="px-5 pb-3 pt-2">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PLAYBOOK</p>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-full border border-border bg-surface p-1">
          {([
            ["library", "Library"],
            ["training", "My Training"],
            ["videos", "My Videos"],
            ["favorites", "Favorites"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={
                "rounded-full py-1.5 text-[10px] font-bold tracking-wide transition-colors " +
                (tab === id ? "bg-teal text-background" : "text-muted-foreground")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5">
        {tab === "library" && <PlaybookLibrary />}
        {tab === "training" && <MyTraining />}
        {tab === "videos" && (
          <div className="space-y-3">
            <button
              onClick={() => setFilmingOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[12px] font-bold text-teal"
            >
              <Upload size={14} /> Upload video for coach review
            </button>
            <VideosGrid clips={clips} showApprovalBadges />
            <FilmingModeSheet
              open={filmingOpen}
              onClose={() => setFilmingOpen(false)}
              context={{
                contextLabel: "My Videos · Parent upload",
                attendeeIds: [athleteId],
                isParent: true,
              }}
            />
          </div>
        )}
        {tab === "favorites" && <PlaybookFavorites />}
      </div>
    </div>
  );
}