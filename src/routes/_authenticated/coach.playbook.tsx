import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Drills } from "@/components/drills-library";
import { PlaybookSessions } from "@/components/coach/playbook-sessions";
import { PlaybookFavorites } from "@/components/coach/playbook-favorites";
import { CoachDrylandLibrary } from "@/components/coach/dryland-library";

export const Route = createFileRoute("/_authenticated/coach/playbook")({
  component: PlaybookPage,
});

type Tab = "drills" | "practices" | "dryland" | "favorites";

function PlaybookPage() {
  const [tab, setTab] = useState<Tab>("drills");

  return (
    <div className="-mx-5 -mt-2">
      <div className="px-5 pb-3 pt-2">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">PLAYBOOK</p>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-full border border-border bg-surface p-1">
          {([
            ["drills", "Drills"],
            ["practices", "Practices"],
            ["dryland", "Dryland"],
            ["favorites", "Favorites"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={"rounded-full py-1.5 text-[10px] font-bold tracking-wide transition-colors " + (tab === id ? "bg-teal text-background" : "text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5">
        {tab === "drills" && <Drills />}
        {tab === "practices" && <PlaybookSessions />}
        {tab === "dryland" && <CoachDrylandLibrary />}
        {tab === "favorites" && <PlaybookFavorites />}
      </div>
    </div>
  );
}