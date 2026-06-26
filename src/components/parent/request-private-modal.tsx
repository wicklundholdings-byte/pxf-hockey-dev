import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitBookingRequest } from "@/lib/hockey-schools.functions";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ownerId: string;
  coachName: string;
  instructorStaffId?: string | null;
  instructorName?: string | null;
  athletes: { id: string; name: string }[];
};

const TIMES = ["Morning", "Afternoon", "Evening"];
const LENGTHS = [30, 45, 60];

export function RequestPrivateModal({ open, onOpenChange, ownerId, coachName, instructorStaffId, instructorName, athletes }: Props) {
  const submit = useServerFn(submitBookingRequest);
  const [athleteName, setAthleteName] = useState(athletes[0]?.name ?? "");
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [date3, setDate3] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [length, setLength] = useState(60);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  function toggleTime(t: string) {
    setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleSubmit() {
    if (!athleteName.trim()) return toast.error("Select an athlete");
    const dates = [date1, date2, date3].filter(Boolean);
    if (!dates.length) return toast.error("Add at least one preferred date");
    if (!times.length) return toast.error("Pick a time of day");
    setSending(true);
    try {
      const res = await submit({
        data: {
          ownerId,
          instructorStaffId: instructorStaffId ?? null,
          athleteName: athleteName.trim(),
          preferredDates: dates,
          preferredTimes: times,
          sessionLengthMinutes: length,
          notes: notes.trim() || undefined,
        },
      });
      toast.success(`Request sent — ${res.coachName} will confirm your session shortly`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send request");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Private</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {instructorName ? `With ${instructorName} at ${coachName}` : coachName}
          </p>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Athlete</label>
            {athletes.length > 1 ? (
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
              >
                {athletes.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            ) : (
              <Input className="mt-1" value={athleteName} onChange={(e) => setAthleteName(e.target.value)} placeholder="Athlete name" />
            )}
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preferred dates (up to 3)</label>
            <div className="mt-1 space-y-2">
              <Input type="date" value={date1} onChange={(e) => setDate1(e.target.value)} />
              <Input type="date" value={date2} onChange={(e) => setDate2(e.target.value)} />
              <Input type="date" value={date3} onChange={(e) => setDate3(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time of day</label>
            <div className="mt-1 flex gap-2">
              {TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTime(t)}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${times.includes(t) ? "border-teal bg-teal/15 text-teal" : "border-border text-muted-foreground"}`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session length</label>
            <div className="mt-1 flex gap-2">
              {LENGTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLength(m)}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${length === m ? "border-teal bg-teal/15 text-teal" : "border-border text-muted-foreground"}`}
                >{m} min</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
            <Textarea className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Goals or specific requests" />
          </div>
          <Button onClick={handleSubmit} disabled={sending} className="w-full">
            {sending ? "Sending…" : "Send Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}