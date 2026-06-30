import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { addPlayerWithInvite } from "@/lib/teams.functions";
import { Plus, X, UserCircle2, Copy, Check, User, Lock, Phone, Mail, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/teams/$teamId/roster")({
  component: Roster,
});

type Player = { id: string; display_name: string; jersey_number: string | null; position: string | null };

interface RosterPlayer {
  id: string;
  name: string;
  jersey: string;
  position: string;
  unavailable?: boolean;
}

interface PlayerProfile {
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  stats: { g: number; a: number; pts: number; plusMinus: number; pim: number };
  last5: ("went" | "missed" | "pending")[];
  note?: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  badge: "owner" | "staff";
}

interface StaffProfile {
  phone: string;
  email: string;
}

const playerProfiles: Record<string, PlayerProfile> = {
  f1: { parentName: "Sarah Carter", parentPhone: "+1 (604) 555-0111", parentEmail: "sarah.carter@example.com", stats: { g: 12, a: 14, pts: 26, plusMinus: 8, pim: 14 }, last5: ["went","went","went","went","went"], note: "Strong on faceoffs. Push him on backcheck consistency." },
  f2: { parentName: "Mike Brooks", parentPhone: "+1 (604) 555-0122", parentEmail: "mike.brooks@example.com", stats: { g: 9, a: 11, pts: 20, plusMinus: 5, pim: 8 }, last5: ["went","went","missed","went","went"] },
  f3: { parentName: "Jen MacDonald", parentPhone: "+1 (604) 555-0133", parentEmail: "jen.macdonald@example.com", stats: { g: 4, a: 6, pts: 10, plusMinus: 1, pim: 6 }, last5: ["missed","missed","went","pending","pending"], note: "Lower body injury. Re-eval next week." },
  f4: { parentName: "Tom Jensen", parentPhone: "+1 (604) 555-0144", parentEmail: "tom.jensen@example.com", stats: { g: 6, a: 8, pts: 14, plusMinus: 3, pim: 4 }, last5: ["went","went","went","went","missed"] },
  f5: { parentName: "Anna Petrov", parentPhone: "+1 (604) 555-0155", parentEmail: "anna.petrov@example.com", stats: { g: 5, a: 7, pts: 12, plusMinus: 2, pim: 10 }, last5: ["went","went","went","went","went"] },
  f6: { parentName: "Rob Callahan", parentPhone: "+1 (604) 555-0166", parentEmail: "rob.callahan@example.com", stats: { g: 4, a: 5, pts: 9, plusMinus: 0, pim: 6 }, last5: ["went","missed","went","went","pending"] },
  f7: { parentName: "Linh Nguyen", parentPhone: "+1 (604) 555-0177", parentEmail: "linh.nguyen@example.com", stats: { g: 3, a: 6, pts: 9, plusMinus: 1, pim: 2 }, last5: ["went","went","went","went","went"] },
  d1: { parentName: "Pat Reilly", parentPhone: "+1 (604) 555-0211", parentEmail: "pat.reilly@example.com", stats: { g: 3, a: 4, pts: 7, plusMinus: 6, pim: 12 }, last5: ["went","went","went","went","went"] },
  d2: { parentName: "Eva Kowalski", parentPhone: "+1 (604) 555-0222", parentEmail: "eva.kowalski@example.com", stats: { g: 2, a: 5, pts: 7, plusMinus: 4, pim: 10 }, last5: ["went","went","missed","went","went"] },
  d3: { parentName: "Gio Marchetti", parentPhone: "+1 (604) 555-0233", parentEmail: "gio.marchetti@example.com", stats: { g: 1, a: 4, pts: 5, plusMinus: 2, pim: 8 }, last5: ["went","went","went","missed","went"] },
  d4: { parentName: "Dana Thompson", parentPhone: "+1 (604) 555-0244", parentEmail: "dana.thompson@example.com", stats: { g: 2, a: 3, pts: 5, plusMinus: 3, pim: 6 }, last5: ["went","went","went","went","pending"] },
  g1: { parentName: "Karl Eriksson", parentPhone: "+1 (604) 555-0311", parentEmail: "karl.eriksson@example.com", stats: { g: 0, a: 1, pts: 1, plusMinus: 0, pim: 0 }, last5: ["went","went","went","went","went"], note: "SV%: .918. Battling rebound control." },
  g2: { parentName: "Yuki Yamamoto", parentPhone: "+1 (604) 555-0322", parentEmail: "yuki.yamamoto@example.com", stats: { g: 0, a: 0, pts: 0, plusMinus: 0, pim: 2 }, last5: ["pending","went","missed","went","went"] },
};

const staffProfiles: Record<string, StaffProfile> = {
  s1: { phone: "+1 (604) 555-0400", email: "headcoach@example.com" },
  s2: { phone: "+1 (604) 555-0401", email: "assistant@example.com" },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const mockForwards: RosterPlayer[] = [
  { id: "f1", name: "Carter", jersey: "11", position: "C" },
  { id: "f2", name: "Brooks", jersey: "7", position: "RW" },
  { id: "f3", name: "MacDonald", jersey: "19", position: "LW", unavailable: true },
  { id: "f4", name: "Jensen", jersey: "10", position: "C" },
  { id: "f5", name: "Petrov", jersey: "22", position: "LW" },
  { id: "f6", name: "Callahan", jersey: "17", position: "RW" },
  { id: "f7", name: "Nguyen", jersey: "9", position: "C" },
];

const mockDefence: RosterPlayer[] = [
  { id: "d1", name: "Reilly", jersey: "4", position: "LD" },
  { id: "d2", name: "Kowalski", jersey: "6", position: "RD" },
  { id: "d3", name: "Marchetti", jersey: "3", position: "LD" },
  { id: "d4", name: "Thompson", jersey: "8", position: "RD" },
];

const mockGoalies: RosterPlayer[] = [
  { id: "g1", name: "Eriksson", jersey: "30", position: "G" },
  { id: "g2", name: "Yamamoto", jersey: "31", position: "G" },
];

const mockStaff: StaffMember[] = [
  { id: "s1", name: "Head Coach", role: "OWNER", badge: "owner" },
  { id: "s2", name: "Assistant Coach", role: "STAFF", badge: "staff" },
];

function PlayerRow({ player, onOpen }: { player: RosterPlayer; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2/50 active:bg-surface-2"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-sm font-bold text-teal">
        #{player.jersey}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{player.name}</p>
          {player.unavailable && (
            <span className="rounded-full bg-soon/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-soon">
              UNAVAILABLE
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{player.position}</p>
      </div>
      <User size={18} className="text-teal" />
    </button>
  );
}

function StaffRow({ member, onOpen }: { member: StaffMember; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2/50 active:bg-surface-2"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
        <UserCircle2 size={18} className="text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{member.name}</p>
        <span
          className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${
            member.badge === "owner"
              ? "bg-teal/15 text-teal"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {member.role}
        </span>
      </div>
    </button>
  );
}

function PlayerProfileSheet({ player, onClose }: { player: RosterPlayer; onClose: () => void }) {
  const profile = playerProfiles[player.id] ?? {
    parentName: "—",
    parentPhone: "",
    parentEmail: "",
    stats: { g: 0, a: 0, pts: 0, plusMinus: 0, pim: 0 },
    last5: ["pending","pending","pending","pending","pending"] as ("went"|"missed"|"pending")[],
  };
  const [note, setNote] = useState(profile.note ?? "");
  const attended = profile.last5.filter((s) => s === "went").length;
  const dotColor = (s: string) => s === "went" ? "bg-teal" : s === "missed" ? "bg-destructive" : "bg-soon";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[480px] max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
        <button onClick={onClose} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
          <ChevronLeft size={14} /> Roster
        </button>

        {/* Header */}
        <div className="mt-3 flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-surface-2 text-lg font-extrabold text-teal">
            #{player.jersey}
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
            {initials(player.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">{player.name}</h3>
              {player.unavailable && (
                <span className="rounded-full bg-soon/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-soon">UNAVAILABLE</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{player.position}</p>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-4 rounded-2xl border border-border bg-background p-3">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground">PARENT / GUARDIAN</p>
          <p className="mt-1 text-sm font-semibold">{profile.parentName}</p>
          <div className="mt-2 flex gap-2">
            <a href={`tel:${profile.parentPhone}`} className="inline-flex flex-1 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[12px]">
              <Phone size={12} className="text-teal" /> {profile.parentPhone}
            </a>
            <a href={`mailto:${profile.parentEmail}`} className="inline-flex flex-1 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[12px]">
              <Mail size={12} className="text-teal" /> Email
            </a>
          </div>
        </div>

        {/* Season stats */}
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground">SEASON STATS</p>
          <div className="grid grid-cols-5 gap-2">
            {[
              { l: "G", v: profile.stats.g },
              { l: "A", v: profile.stats.a },
              { l: "PTS", v: profile.stats.pts },
              { l: "+/-", v: (profile.stats.plusMinus >= 0 ? "+" : "") + profile.stats.plusMinus },
              { l: "PIM", v: profile.stats.pim },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-border bg-background py-2 text-center">
                <p className="text-sm font-extrabold">{s.v}</p>
                <p className="text-[9px] font-bold tracking-wider text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="mt-4 rounded-2xl border border-border bg-background p-3">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground">AVAILABILITY</p>
          <div className="mt-2 flex items-center gap-2">
            {profile.last5.map((s, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-full ${dotColor(s)}`} />
            ))}
            <span className="ml-2 text-[11px] text-muted-foreground">{attended} of last 5 games attended</span>
          </div>
        </div>

        {/* Coach notes */}
        <div className="mt-4 rounded-2xl border border-border bg-background p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <Lock size={11} className="text-muted-foreground" />
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">COACH NOTES · PRIVATE</p>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-[12px]"
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-full border border-teal py-2.5 text-[12px] font-bold text-teal">
            Message Player
          </button>
          <button className="flex-1 rounded-full bg-surface-2 py-2.5 text-[12px] font-bold">
            Request Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffProfileSheet({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const p = staffProfiles[member.id] ?? { phone: "", email: "" };
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
        <button onClick={onClose} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
          <ChevronLeft size={14} /> Roster
        </button>
        <div className="mt-3 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
            {initials(member.name)}
          </div>
          <div>
            <h3 className="text-base font-bold">{member.name}</h3>
            <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${member.badge === "owner" ? "bg-teal/15 text-teal" : "bg-muted text-muted-foreground"}`}>
              {member.role}
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <a href={`tel:${p.phone}`} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[12px]">
            <Phone size={12} className="text-teal" /> {p.phone}
          </a>
          <a href={`mailto:${p.email}`} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[12px]">
            <Mail size={12} className="text-teal" /> {p.email}
          </a>
        </div>
      </div>
    </div>
  );
}

function Roster() {
  const { teamId } = Route.useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [adding, setAdding] = useState(false);
  const [openPlayer, setOpenPlayer] = useState<RosterPlayer | null>(null);
  const [openStaff, setOpenStaff] = useState<StaffMember | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("team_players")
      .select("id,display_name,jersey_number,position")
      .eq("team_id", teamId)
      .order("display_name");
    setPlayers((data ?? []) as Player[]);
  }
  useEffect(() => {
    refresh();
  }, [teamId]);

  const totalCount =
    (players.length > 0 ? players.length : 0) +
    mockForwards.length +
    mockDefence.length +
    mockGoalies.length;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Roster · {totalCount}</h3>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
        >
          <Plus size={12} /> Add Player
        </button>
      </div>

      {/* Forwards */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Forwards
        </p>
        <div className="space-y-2">
          {players
            .filter((p) => (p.position || "").toUpperCase().startsWith("F"))
            .map((p) => (
              <PlayerRow
                key={p.id}
                player={{
                  id: p.id,
                  name: p.display_name,
                  jersey: p.jersey_number || "—",
                  position: p.position || "F",
                }}
                onOpen={() => setOpenPlayer({ id: p.id, name: p.display_name, jersey: p.jersey_number || "—", position: p.position || "F" })}
              />
            ))}
          {mockForwards.map((p) => (
            <PlayerRow key={p.id} player={p} onOpen={() => setOpenPlayer(p)} />
          ))}
        </div>
      </div>

      {/* Defence */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Defence
        </p>
        <div className="space-y-2">
          {players
            .filter((p) => (p.position || "").toUpperCase().startsWith("D"))
            .map((p) => (
              <PlayerRow
                key={p.id}
                player={{
                  id: p.id,
                  name: p.display_name,
                  jersey: p.jersey_number || "—",
                  position: p.position || "D",
                }}
                onOpen={() => setOpenPlayer({ id: p.id, name: p.display_name, jersey: p.jersey_number || "—", position: p.position || "D" })}
              />
            ))}
          {mockDefence.map((p) => (
            <PlayerRow key={p.id} player={p} onOpen={() => setOpenPlayer(p)} />
          ))}
        </div>
      </div>

      {/* Goalies */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Goalies
        </p>
        <div className="space-y-2">
          {players
            .filter((p) => (p.position || "").toUpperCase().startsWith("G"))
            .map((p) => (
              <PlayerRow
                key={p.id}
                player={{
                  id: p.id,
                  name: p.display_name,
                  jersey: p.jersey_number || "—",
                  position: p.position || "G",
                }}
                onOpen={() => setOpenPlayer({ id: p.id, name: p.display_name, jersey: p.jersey_number || "—", position: p.position || "G" })}
              />
            ))}
          {mockGoalies.map((p) => (
            <PlayerRow key={p.id} player={p} onOpen={() => setOpenPlayer(p)} />
          ))}
        </div>
      </div>

      {/* Coaching Staff */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Coaching Staff
        </p>
        <div className="space-y-2">
          {mockStaff.map((s) => (
            <StaffRow key={s.id} member={s} onOpen={() => setOpenStaff(s)} />
          ))}
        </div>
      </div>

      {adding && (
        <AddPlayer
          teamId={teamId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            refresh();
          }}
        />
      )}

      {openPlayer && <PlayerProfileSheet player={openPlayer} onClose={() => setOpenPlayer(null)} />}
      {openStaff && <StaffProfileSheet member={openStaff} onClose={() => setOpenStaff(null)} />}
    </div>
  );
}

function AddPlayer({
  teamId,
  onClose,
  onSaved,
}: {
  teamId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const add = useServerFn(addPlayerWithInvite);
  const [form, setForm] = useState({
    displayName: "",
    jerseyNumber: "",
    position: "",
    parentEmail: "",
    parentName: "",
  });
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"sent" | "skipped" | "failed" | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName.trim() || !form.parentEmail.trim()) return;
    setSaving(true);
    try {
      const res = await add({ data: { teamId, ...form } });
      const url = `${window.location.origin}/team-invite/${res.inviteToken}`;
      setInviteUrl(url);
      setEmailStatus(res.emailStatus ?? "skipped");
      setEmailError(res.emailError ?? null);
    } catch (err: any) {
      alert(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-[480px] rounded-t-3xl border-t border-border bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{inviteUrl ? "Invite ready" : "Add player"}</h3>
          <button onClick={inviteUrl ? onSaved : onClose}>
            <X size={16} />
          </button>
        </div>
        {inviteUrl ? (
          <div className="mt-4 space-y-3">
            {emailStatus === "sent" && (
              <div className="rounded-xl border border-teal/40 bg-teal/10 p-3 text-sm">
                <p className="font-semibold text-teal">Invite email sent ✓</p>
                <p className="mt-1 text-muted-foreground">
                  We emailed the signup link to{" "}
                  <span className="font-semibold text-foreground">{form.parentEmail}</span>.
                </p>
              </div>
            )}
            {emailStatus === "failed" && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <p className="font-semibold text-destructive">Email failed to send</p>
                <p className="mt-1 text-muted-foreground">Share the link below instead.</p>
                {emailError && (
                  <p className="mt-1 text-[10px] text-muted-foreground">{emailError}</p>
                )}
              </div>
            )}
            {emailStatus === "skipped" && (
              <p className="text-sm text-muted-foreground">
                Share this link with{" "}
                <span className="font-semibold text-foreground">{form.parentEmail}</span>.
              </p>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
              <code className="flex-1 truncate text-[11px]">{inviteUrl}</code>
              <button
                onClick={copyLink}
                className="grid h-8 w-8 place-items-center rounded-lg bg-teal text-background"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={onSaved}
              className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-3 space-y-3">
            <label className="block">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                PLAYER NAME
              </span>
              <input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                required
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                  JERSEY #
                </span>
                <input
                  value={form.jerseyNumber}
                  onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                  POSITION
                </span>
                <input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="F / D / G"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                PARENT NAME (OPTIONAL)
              </span>
              <input
                value={form.parentName}
                onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                PARENT EMAIL
              </span>
              <input
                type="email"
                required
                value={form.parentEmail}
                onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                placeholder="parent@example.com"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-[10px] text-muted-foreground">
                Parent receives a link to complete athlete profile, phone, and emergency
                contacts.
              </span>
            </label>
            <button
              disabled={saving}
              className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Sending…" : "Add and Invite"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
