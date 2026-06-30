import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play, X, ChevronLeft, ChevronRight, Film, Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/media")({
  component: TeamMediaScreen,
});

const mockVideos = [
  { id: "v1", title: "Practice Highlights", date: "Jun 20" },
  { id: "v2", title: "Game vs Langley", date: "Jun 22" },
  { id: "v3", title: "Skating Drills", date: "Jun 18" },
  { id: "v4", title: "Power Play Session", date: "Jun 15" },
];

const mockPhotos = [
  { id: "p1", title: "Team Photo", date: "Jun 22" },
  { id: "p2", title: "Pre-game Warmup", date: "Jun 22" },
  { id: "p3", title: "Practice Candids", date: "Jun 20" },
  { id: "p4", title: "Awards Night", date: "Jun 10" },
];

function TeamMediaScreen() {
  const { teamId } = Route.useParams();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"video" | "photo" | null>(null);

  const hasContent = mockVideos.length > 0 || mockPhotos.length > 0;

  const openPreview = (id: string, type: "video" | "photo") => {
    setPreviewId(id);
    setPreviewType(type);
  };

  const closePreview = () => {
    setPreviewId(null);
    setPreviewType(null);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          to="/coach/teams/$teamId/more"
          params={{ teamId } as any}
          className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-surface px-3 py-1.5 text-[12px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
        >
          <ChevronLeft size={14} />
          <span>More</span>
        </Link>
        <h1 className="flex-1 text-center text-sm font-bold">Media</h1>
        <button className="rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-background shadow-glow-teal active:opacity-90">
          + Upload
        </button>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No media yet — upload your first photo or video
          </p>
        </div>
      ) : (
        <>
          {/* Film Section */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Film
              </h2>
              <button className="flex items-center gap-0.5 text-[11px] font-semibold text-teal">
                See All
                <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mockVideos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => openPreview(v.id, "video")}
                  className="relative h-[100px] overflow-hidden rounded-xl text-left"
                  style={{ backgroundColor: "#131313" }}
                >
                  {/* Film reel icon placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film size={24} className="text-foreground/20" />
                  </div>
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-lg">
                      <Play size={16} className="ml-0.5 text-black" fill="black" />
                    </div>
                  </div>
                  {/* Bottom gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pb-2 pt-6">
                    <p className="truncate text-[11px] font-bold text-white">{v.title}</p>
                    <p className="text-[10px] text-white/70">{v.date}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Photos Section */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Photos
              </h2>
              <button className="flex items-center gap-0.5 text-[11px] font-semibold text-teal">
                See All
                <ChevronRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mockPhotos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPreview(p.id, "photo")}
                  className="relative h-[100px] overflow-hidden rounded-xl text-left"
                  style={{ backgroundColor: "#131313" }}
                >
                  {/* Camera icon placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera size={24} className="text-foreground/20" />
                  </div>
                  {/* Bottom gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pb-2 pt-6">
                    <p className="truncate text-[11px] font-bold text-white">{p.title}</p>
                    <p className="text-[10px] text-white/70">{p.date}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Fullscreen Preview */}
      {previewId && previewType && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black"
          onClick={closePreview}
        >
          {/* Close button */}
          <div className="absolute top-0 right-0 z-10 p-4">
            <button
              onClick={closePreview}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 backdrop-blur-sm"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Content area */}
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              {previewType === "video" ? (
                <Film size={48} className="text-foreground/30" />
              ) : (
                <Camera size={48} className="text-foreground/30" />
              )}
              <p className="text-sm font-semibold text-white">
                {previewType === "video" ? "Video Preview" : "Photo Preview"}
              </p>
              <p className="text-xs text-muted-foreground">
                {previewType === "video"
                  ? mockVideos.find((v) => v.id === previewId)?.title
                  : mockPhotos.find((p) => p.id === previewId)?.title}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
