import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Upload, X, ChevronLeft } from "lucide-react";

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

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          to="/coach/teams/$teamId/more"
          params={{ teamId } as any}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface px-3 py-1.5 text-[12px] font-semibold text-foreground/80 transition-colors hover:text-foreground"
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
              <button className="text-[11px] font-semibold text-teal">+ Upload</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mockVideos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setPreviewId(v.id);
                    setPreviewType("video");
                  }}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2 text-left"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-background/60 backdrop-blur-sm">
                      <Play size={18} className="ml-0.5 text-foreground" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-2.5 pb-2 pt-8">
                    <p className="truncate text-[11px] font-bold">{v.title}</p>
                    <p className="text-[10px] text-muted-foreground">{v.date}</p>
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
              <button className="text-[11px] font-semibold text-teal">+ Upload</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mockPhotos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPreviewId(p.id);
                    setPreviewType("photo");
                  }}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2 text-left"
                >
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-2.5 pb-2 pt-8">
                    <p className="truncate text-[11px] font-bold">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">{p.date}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Preview Modal */}
      {previewId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          onClick={() => {
            setPreviewId(null);
            setPreviewType(null);
          }}
        >
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setPreviewId(null);
                setPreviewType(null);
              }}
              className="absolute top-3 right-3"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-2">
                {previewType === "video" ? (
                  <Play size={24} className="text-teal" />
                ) : (
                  <Upload size={24} className="text-teal" />
                )}
              </div>
              <p className="text-sm font-semibold">
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
