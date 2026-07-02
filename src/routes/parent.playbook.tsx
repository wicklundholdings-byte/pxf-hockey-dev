import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PlaybookLibrary } from "@/components/coach/playbook-library";
import { PlaybookFavorites } from "@/components/coach/playbook-favorites";
import { MyTraining } from "@/components/parent/my-training";

export const Route = createFileRoute("/parent/playbook")({
  head: () => ({
    meta: [
      { title: "Playbook — PXF Hockey" },
      { name: "description", content: "Programs your coach has assigned and library drills." },
    ],
  }),
  component: ParentPlaybookPage,
});

type Tab = "library" | "training" | "favorites";

function ParentPlaybookPage() {
  const [tab, setTab] = useState<Tab>("training");
  return (
    <div className="-mx-5 -mt-2">
      <div className="px-5 pb-3 pt-2">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PLAYBOOK</p>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1">
          {([
            ["library", "Library"],
            ["training", "My Training"],
            ["favorites", "Favorites"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={
                "rounded-full py-1.5 text-[11px] font-bold tracking-wide transition-colors " +
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
        {tab === "favorites" && <PlaybookFavorites />}
      </div>
    </div>
  );
}