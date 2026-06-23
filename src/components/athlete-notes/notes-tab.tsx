import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAthleteNotes,
  createAthleteNote,
  deleteAthleteNote,
  updateAthleteNote,
} from "@/lib/athlete-notes.functions";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Star, Trash2, Video, X, Share2, Calendar as CalIcon, Tag,
} from "lucide-react";
import { toast } from "sonner";

type Note = {
  id: string;
  note_date: string;
  written_notes: string | null;
  drill_ids: string[];
  drill_freetext: string[];
  session_rating: number | null;
  is_shared: boolean;
  athlete_note_videos: {
    id: string; video_url: string; thumbnail_url: string | null; duration_seconds: number | null;
  }[];
};

export function NotesTab({ athleteId }: { athleteId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listAthleteNotes);
  const delFn = useServerFn(deleteAthleteNote);
  const updFn = useServerFn(updateAthleteNote);
  const [open, setOpen] = useState(false);
  const [filterDrill, setFilterDrill] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["athlete-notes", athleteId],
    queryFn: () => listFn({ data: { athleteId } }) as Promise<Note[]>,
  });

  const filtered = useMemo(() => {
    if (!filterDrill.trim()) return notes;
    const f = filterDrill.toLowerCase();
    return notes.filter((n) =>
      n.drill_freetext.some((d) => d.toLowerCase().includes(f))
    );
  }, [notes, filterDrill]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["athlete-notes", athleteId] }),
  });

  const shareMut = useMutation({
    mutationFn: (vars: { id: string; isShared: boolean }) =>
      updFn({ data: { id: vars.id, isShared: vars.isShared } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["athlete-notes", athleteId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter by drill tag…"
          value={filterDrill}
          onChange={(e) => setFilterDrill(e.target.value)}
          className="h-8 text-xs"
        />
        <Button size="sm" onClick={() => setOpen(true)} className="h-8 gap-1 bg-gradient-brand text-primary-foreground">
          <Plus size={14} /> Note
        </Button>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No notes yet. Tap <span className="font-semibold text-foreground">+ Note</span> to log your first session.
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            onDelete={() => {
              if (confirm("Delete this note?")) deleteMut.mutate(n.id);
            }}
            onToggleShare={(val) => {
              shareMut.mutate({ id: n.id, isShared: val });
              toast.success(val ? "Shared with parent" : "Unshared");
            }}
          />
        ))}
      </ul>

      <AddNoteSheet
        open={open}
        onClose={() => setOpen(false)}
        athleteId={athleteId}
      />
    </div>
  );
}

function NoteCard({
  note, onDelete, onToggleShare,
}: { note: Note; onDelete: () => void; onToggleShare: (v: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const tags = [...(note.drill_freetext || [])];
  const preview = note.written_notes ?? "";
  const isLong = preview.length > 140;

  return (
    <li className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <CalIcon size={11} />
          <span>{new Date(note.note_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
          {note.session_rating != null && (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={10} className={i < (note.session_rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
              ))}
            </span>
          )}
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-rose-400">
          <Trash2 size={13} />
        </button>
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold text-teal">
              <Tag size={9} /> {t}
            </span>
          ))}
        </div>
      )}

      {preview && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-foreground">
          {expanded || !isLong ? preview : preview.slice(0, 140) + "…"}
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="ml-1 text-[10px] font-semibold text-teal">
              {expanded ? "Less" : "More"}
            </button>
          )}
        </p>
      )}

      {note.athlete_note_videos.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {note.athlete_note_videos.map((v) => (
            <a key={v.id} href={v.video_url} target="_blank" rel="noreferrer"
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface">
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <Video size={16} className="text-muted-foreground" />
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Share2 size={10} /> Share with parent
        </span>
        <Switch checked={note.is_shared} onCheckedChange={onToggleShare} />
      </div>
    </li>
  );
}

function AddNoteSheet({
  open, onClose, athleteId,
}: { open: boolean; onClose: () => void; athleteId: string }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createAthleteNote);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [drillsText, setDrillsText] = useState("");
  const [written, setWritten] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [videos, setVideos] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setNoteDate(new Date().toISOString().slice(0, 10));
    setDrillsText(""); setWritten(""); setRating(null); setIsShared(false); setVideos([]);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const drillFreetext = drillsText.split(",").map((s) => s.trim()).filter(Boolean);
      return createFn({
        data: {
          athleteId, noteDate, writtenNotes: written, drillIds: [],
          drillFreetext, sessionRating: rating, isShared,
          videos: videos.map((v) => ({ video_url: v.url })),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athlete-notes", athleteId] });
      toast.success("Note saved");
      reset(); onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const onPickVideos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = 4 - videos.length;
    const list = Array.from(files).slice(0, slots);
    setUploading(true);
    try {
      const uploaded: { url: string; name: string }[] = [];
      for (const f of list) {
        const path = `notes/${athleteId}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("athlete-media").upload(path, f, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("athlete-media").getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, name: f.name });
      }
      setVideos((v) => [...v, ...uploaded]);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader><SheetTitle>Add session note</SheetTitle></SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Date</label>
            <Input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} className="h-9" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Drills covered</label>
            <Input
              placeholder="e.g. Edge work, C-cuts, Backhand passing"
              value={drillsText}
              onChange={(e) => setDrillsText(e.target.value)}
              className="h-9"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">Separate with commas</p>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Notes</label>
            <Textarea
              placeholder="What did you work on? What did you see?"
              value={written}
              onChange={(e) => setWritten(e.target.value)}
              rows={5}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Session rating</label>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                >
                  <Star size={22} className={n <= (rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">Video clips (up to 4)</label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {videos.map((v, i) => (
                <div key={i} className="relative aspect-square rounded-lg border border-border bg-surface">
                  <div className="grid h-full w-full place-items-center">
                    <Video size={18} className="text-teal" />
                  </div>
                  <button
                    onClick={() => setVideos((arr) => arr.filter((_, j) => j !== i))}
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {videos.length < 4 && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed border-border bg-surface text-muted-foreground hover:text-teal">
                  <Plus size={18} />
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickVideos(e.target.files)}
                  />
                </label>
              )}
            </div>
            {uploading && <p className="mt-1 text-[10px] text-muted-foreground">Uploading…</p>}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Share with athlete / parent</p>
              <p className="text-[10px] text-muted-foreground">Appears read-only in their app.</p>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-brand text-primary-foreground"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || uploading}
            >
              {saveMut.isPending ? "Saving…" : "Save note"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}