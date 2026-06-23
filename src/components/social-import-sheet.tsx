import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Instagram, Music2, Link as LinkIcon } from "lucide-react";

export type SocialImport = { source_url: string; source_credit: string | null };

export function SocialImportSheet({
  trigger,
  onImport,
}: {
  trigger: React.ReactNode;
  onImport: (data: SocialImport) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [credit, setCredit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    // TODO (build phase): fetch video via oEmbed (Instagram Graph / TikTok oEmbed)
    //   or platform API and pull thumbnail + duration.
    await onImport({ source_url: url.trim(), source_credit: credit.trim() || null });
    setSubmitting(false);
    setUrl("");
    setCredit("");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl border-border bg-surface p-5">
        <SheetHeader>
          <SheetTitle className="text-left font-display text-lg font-bold">Import from social</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3 py-2">
            <Instagram size={16} className="text-pink-400" />
            <Music2 size={16} className="text-foreground" />
            <span className="text-[11px] text-muted-foreground">Instagram Reel or TikTok video</span>
          </div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paste Instagram or TikTok link</span>
            <div className="mt-1 flex items-center rounded-xl border border-border bg-background px-3">
              <LinkIcon size={14} className="text-muted-foreground" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground focus:outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Credit original creator (optional)</span>
            <input
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              placeholder="@coachname"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none"
            />
          </label>
          <button
            onClick={submit}
            disabled={!url.trim() || submitting}
            className="h-11 w-full rounded-xl bg-gradient-brand text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "Importing…" : "Import video"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Placeholder thumbnail shown until the real video is fetched. */
export function SocialImportThumb({ url }: { url: string }) {
  const platform = /tiktok/i.test(url) ? "TikTok" : /instagram/i.test(url) ? "Instagram" : "Video";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-surface-2 px-3 py-3">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-brand text-[10px] font-bold text-primary-foreground">{platform}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{url}</p>
        <p className="text-[10px] text-muted-foreground">Fetching video preview…</p>
      </div>
    </div>
  );
}