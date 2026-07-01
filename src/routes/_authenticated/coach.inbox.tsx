import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Send, ArrowLeft, Users, Plus, Pin, X, Megaphone, User, BarChart3, CalendarClock, CheckCircle2, ChevronUp, MessageCircle } from "lucide-react";
import { listTeamMessageableContacts, type TeamContact } from "@/lib/messaging.functions";

export const Route = createFileRoute("/_authenticated/coach/inbox")({
  component: InboxPage,
});

type Convo = {
  id: string;
  type: "dm" | "camp_group" | "team_group";
  camp_id: string | null;
  team_id: string | null;
  created_by: string;
  created_at: string;
  camps?: { name: string | null } | null;
  teams?: { name: string | null } | null;
  last?: { body: string | null; created_at: string } | null;
};
type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
  kind?: "text" | "poll" | "rsvp";
  metadata?: any;
  scheduled_for?: string | null;
  parent_message_id?: string | null;
};
type PollVote = { message_id: string; user_id: string; option_index: number };
type Camp = { id: string; name: string };
type Team = { id: string; name: string };

function InboxPage() {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [tab, setTab] = useState<"channels" | "dms">("channels");

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id,type,camp_id,team_id,created_by,created_at, camps(name), teams(name)")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as unknown as Convo[];
    // fetch last message for each (one query)
    const ids = list.map((c) => c.id);
    if (ids.length > 0) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("conversation_id,body,created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });
      const lastByConv: Record<string, { body: string | null; created_at: string }> = {};
      (msgs ?? []).forEach((m) => {
        if (!lastByConv[m.conversation_id]) {
          lastByConv[m.conversation_id] = { body: m.body, created_at: m.created_at };
        }
      });
      list.forEach((c) => (c.last = lastByConv[c.id] ?? null));
    }
    setConvos(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  const active = convos.find((c) => c.id === activeId) ?? null;

  if (active) {
    return <Thread convo={active} currentUserId={user!.id} onBack={() => { setActiveId(null); load(); }} />;
  }

  const filtered = convos.filter((c) =>
    tab === "channels" ? c.type !== "dm" : c.type === "dm",
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inbox</p>
          <h2 className="font-display text-lg font-bold text-foreground">Conversations</h2>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold text-amber-400"
          >
            <Megaphone size={12} /> Broadcast
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            <Plus size={12} /> New
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1">
        <button
          onClick={() => setTab("channels")}
          className={"rounded-lg py-1.5 text-[11px] font-bold " + (tab === "channels" ? "bg-background text-foreground shadow" : "text-muted-foreground")}
        >
          Channels
        </button>
        <button
          onClick={() => setTab("dms")}
          className={"rounded-lg py-1.5 text-[11px] font-bold " + (tab === "dms" ? "bg-background text-foreground shadow" : "text-muted-foreground")}
        >
          Direct messages
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <MessageSquare size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            {tab === "channels" ? "No team channels yet." : "No direct messages yet."}
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-3 rounded-full bg-gradient-brand px-4 py-1.5 text-[11px] font-bold text-primary-foreground"
          >
            Start one
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const title =
              c.type === "team_group"
                ? (c.teams?.name ?? "Team")
                : c.type === "camp_group"
                  ? (c.camps?.name ?? "Camp group")
                  : "Direct message";
            const initials = (title).split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
                >
                  <div className={
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold " +
                    (c.type === "camp_group"
                      ? "bg-amber-400/15 text-amber-400"
                      : c.type === "team_group"
                        ? "bg-teal/15 text-teal"
                        : "bg-teal/15 text-teal")
                  }>
                    {c.type === "camp_group" || c.type === "team_group" ? <Users size={16} /> : initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                      {c.last && (
                        <span className="shrink-0 text-[9px] text-muted-foreground">
                          {timeAgo(c.last.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.last?.body ?? "No messages yet"}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showNew && <NewConvoSheet onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); load(); setActiveId(id); }} />}
      {showBroadcast && <BroadcastSheet onClose={() => setShowBroadcast(false)} />}
    </div>
  );
}

function Thread({ convo, currentUserId, onBack }: { convo: Convo; currentUserId: string; onBack: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [showRich, setShowRich] = useState<null | "poll" | "rsvp" | "schedule">(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()},sender_id.eq.${currentUserId}`)
      .order("created_at");
    setMessages((data ?? []) as Msg[]);
    const pollIds = (data ?? []).filter((m: any) => m.kind === "poll").map((m: any) => m.id);
    if (pollIds.length > 0) {
      const { data: v } = await supabase
        .from("message_poll_votes")
        .select("message_id,user_id,option_index")
        .in("message_id", pollIds);
      setVotes((v ?? []) as PollVote[]);
    } else {
      setVotes([]);
    }
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`conv:${convo.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convo.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Msg]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_poll_votes" }, (payload) => {
        const row = (payload.new ?? payload.old) as PollVote;
        if (!row) return;
        setVotes((prev) => {
          const others = prev.filter((v) => !(v.message_id === row.message_id && v.user_id === row.user_id));
          return payload.eventType === "DELETE" ? others : [...others, payload.new as PollVote];
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [convo.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setBody("");
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: currentUserId,
      body: text,
      kind: "text",
    }).select("*").single();
    setSending(false);
    if (error) {
      setBody(text);
      alert(error.message);
      return;
    }
    if (data) {
      setMessages((prev) => (prev.some((m) => m.id === (data as Msg).id) ? prev : [...prev, data as Msg]));
    }
  }

  async function togglePin(m: Msg) {
    await supabase.from("messages").update({ pinned: !m.pinned }).eq("id", m.id);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)));
  }

  async function vote(m: Msg, optionIndex: number) {
    const existing = votes.find((v) => v.message_id === m.id && v.user_id === currentUserId);
    if (existing) {
      await supabase.from("message_poll_votes").update({ option_index: optionIndex }).eq("message_id", m.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("message_poll_votes").insert({ message_id: m.id, user_id: currentUserId, option_index: optionIndex });
    }
    setVotes((prev) => {
      const others = prev.filter((v) => !(v.message_id === m.id && v.user_id === currentUserId));
      return [...others, { message_id: m.id, user_id: currentUserId, option_index: optionIndex }];
    });
  }

  async function respondRsvp(m: Msg, response: "yes" | "no" | "maybe") {
    const existing = votes.find((v) => v.message_id === m.id && v.user_id === currentUserId);
    const idx = response === "yes" ? 0 : response === "no" ? 1 : 2;
    if (existing) {
      await supabase.from("message_poll_votes").update({ option_index: idx }).eq("message_id", m.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("message_poll_votes").insert({ message_id: m.id, user_id: currentUserId, option_index: idx });
    }
    setVotes((prev) => {
      const others = prev.filter((v) => !(v.message_id === m.id && v.user_id === currentUserId));
      return [...others, { message_id: m.id, user_id: currentUserId, option_index: idx }];
    });
  }

  async function createRich(kind: "poll" | "rsvp", metadata: any, when: string | null) {
    const insertBody: any = {
      conversation_id: convo.id,
      sender_id: currentUserId,
      body: metadata.question ?? metadata.title ?? null,
      kind,
      metadata,
    };
    if (when) insertBody.scheduled_for = when;
    const { data, error } = await supabase.from("messages").insert(insertBody).select("*").single();
    if (error) { alert(error.message); return; }
    if (data) setMessages((prev) => (prev.some((m) => m.id === (data as Msg).id) ? prev : [...prev, data as Msg]));
  }

  async function scheduleText(text: string, when: string) {
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: currentUserId,
      body: text,
      kind: "text",
      scheduled_for: when,
    }).select("*").single();
    if (error) { alert(error.message); return; }
    if (data) setMessages((prev) => (prev.some((m) => m.id === (data as Msg).id) ? prev : [...prev, data as Msg]));
  }

  const title =
    convo.type === "team_group"
      ? (convo.teams?.name ?? "Team")
      : convo.type === "camp_group"
        ? (convo.camps?.name ?? "Camp group")
        : "Direct message";
  const pinned = messages.filter((m) => m.pinned);

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button onClick={onBack} className="rounded-full bg-surface p-1.5 text-muted-foreground">
          <ArrowLeft size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{messages.length} message{messages.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Pinned</p>
          {pinned.map((m) => (
            <p key={m.id} className="mt-1 text-[11px] text-foreground">📌 {m.body}</p>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto py-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No messages yet. Say hi.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            const isScheduledPending = m.scheduled_for && new Date(m.scheduled_for) > new Date();
            const pollVotes = (m.kind === "poll" || m.kind === "rsvp") ? votes.filter((v) => v.message_id === m.id) : [];
            const myVote = pollVotes.find((v) => v.user_id === currentUserId);
            return (
              <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                <div className="group flex max-w-[80%] items-end gap-1">
                  <div className={
                    "rounded-2xl px-3 py-2 text-sm w-full " +
                    (mine ? "rounded-br-sm bg-gradient-brand text-primary-foreground" : "rounded-bl-sm bg-card text-foreground border border-border")
                  }>
                    {isScheduledPending && (
                      <p className={"mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider " + (mine ? "text-black/70" : "text-amber-500")}>
                        <CalendarClock size={10} /> Scheduled · {new Date(m.scheduled_for!).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {m.kind === "poll" && m.metadata?.options ? (
                      <div>
                        <p className="mb-2 font-semibold">📊 {m.metadata.question}</p>
                        <div className="space-y-1.5">
                          {(m.metadata.options as string[]).map((opt, i) => {
                            const count = pollVotes.filter((v) => v.option_index === i).length;
                            const total = pollVotes.length || 1;
                            const pct = Math.round((count / total) * 100);
                            const selected = myVote?.option_index === i;
                            return (
                              <button
                                key={i}
                                onClick={() => vote(m, i)}
                                className={"relative w-full overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-[12px] " + (mine ? "border-black/20 bg-black/10" : "border-border bg-surface")}
                              >
                                <div className={"absolute inset-y-0 left-0 " + (selected ? "bg-teal/40" : "bg-teal/15")} style={{ width: `${pct}%` }} />
                                <div className="relative flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-1.5">
                                    {selected && <CheckCircle2 size={11} />} {opt}
                                  </span>
                                  <span className="text-[10px] opacity-70">{count} · {pct}%</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <p className={"mt-1.5 text-[9px] " + (mine ? "text-black/60" : "text-muted-foreground")}>{pollVotes.length} vote{pollVotes.length === 1 ? "" : "s"}</p>
                      </div>
                    ) : m.kind === "rsvp" ? (
                      <div>
                        <p className="mb-2 font-semibold">🗓 {m.metadata?.title ?? "RSVP"}</p>
                        {m.metadata?.when && <p className={"mb-2 text-[11px] " + (mine ? "text-black/70" : "text-muted-foreground")}>{m.metadata.when}</p>}
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["yes", "no", "maybe"] as const).map((r, i) => {
                            const count = pollVotes.filter((v) => v.option_index === i).length;
                            const selected = myVote?.option_index === i;
                            return (
                              <button
                                key={r}
                                onClick={() => respondRsvp(m, r)}
                                className={"rounded-lg border py-1.5 text-[11px] font-bold uppercase " + (selected ? "border-teal bg-teal/20 text-teal" : mine ? "border-black/20 bg-black/10" : "border-border bg-surface text-muted-foreground")}
                              >
                                {r} · {count}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    )}
                    <p className={"mt-0.5 text-[9px] " + (mine ? "text-black/60" : "text-muted-foreground")}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => togglePin(m)}
                    className={"opacity-0 group-hover:opacity-100 " + (m.pinned ? "text-amber-400 opacity-100" : "text-muted-foreground")}
                  >
                    <Pin size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-2">
        <div className="relative">
          <button
            onClick={() => setShowRich(showRich ? null : "poll")}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted-foreground"
            title="Poll · RSVP · Schedule"
          >
            <Plus size={16} className={showRich ? "rotate-45 transition" : "transition"} />
          </button>
          {showRich && (
            <div className="absolute bottom-12 left-0 z-20 flex w-52 flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl">
              <button onClick={() => setShowRich("poll")} className={"flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold " + (showRich === "poll" ? "bg-teal/10 text-teal" : "hover:bg-surface")}>
                <BarChart3 size={13} /> Poll
              </button>
              <button onClick={() => setShowRich("rsvp")} className={"flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold " + (showRich === "rsvp" ? "bg-teal/10 text-teal" : "hover:bg-surface")}>
                <CheckCircle2 size={13} /> RSVP request
              </button>
              <button onClick={() => setShowRich("schedule")} className={"flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold " + (showRich === "schedule" ? "bg-teal/10 text-teal" : "hover:bg-surface")}>
                <CalendarClock size={13} /> Scheduled message
              </button>
              <button onClick={() => setShowRich(null)} className="mt-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[10px] text-muted-foreground hover:bg-surface">
                <ChevronUp size={11} /> Close
              </button>
            </div>
          )}
        </div>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-primary-foreground disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>

      {showRich === "poll" && (
        <PollComposer
          onCancel={() => setShowRich(null)}
          onSubmit={(q, opts) => { createRich("poll", { question: q, options: opts }, null); setShowRich(null); }}
        />
      )}
      {showRich === "rsvp" && (
        <RsvpComposer
          onCancel={() => setShowRich(null)}
          onSubmit={(title, when) => { createRich("rsvp", { title, when }, null); setShowRich(null); }}
        />
      )}
      {showRich === "schedule" && (
        <ScheduleComposer
          onCancel={() => setShowRich(null)}
          onSubmit={(text, when) => { scheduleText(text, when); setShowRich(null); }}
        />
      )}
    </div>
  );
}

function SheetShell({ title, children, onCancel }: { title: string; children: React.ReactNode; onCancel: () => void }) {
  return (
    <div onClick={onCancel} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onCancel} className="rounded-full bg-surface p-1.5 text-muted-foreground"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PollComposer({ onSubmit, onCancel }: { onSubmit: (q: string, opts: string[]) => void; onCancel: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const clean = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = question.trim().length > 0 && clean.length >= 2;
  return (
    <SheetShell title="New poll" onCancel={onCancel}>
      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Question</label>
      <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What time works best?" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Options</label>
      <div className="mt-1 space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={o} onChange={(e) => setOptions(options.map((x, j) => (i === j ? e.target.value : x)))} placeholder={`Option ${i + 1}`} className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
            {options.length > 2 && (
              <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="rounded-full bg-surface p-1.5 text-muted-foreground"><X size={12} /></button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button onClick={() => setOptions([...options, ""])} className="text-[11px] font-semibold text-teal">+ Add option</button>
        )}
      </div>
      <button disabled={!canSubmit} onClick={() => onSubmit(question.trim(), clean)} className="mt-5 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">Post poll</button>
    </SheetShell>
  );
}

function RsvpComposer({ onSubmit, onCancel }: { onSubmit: (title: string, when: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  return (
    <SheetShell title="Request RSVP" onCancel={onCancel}>
      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What are you asking about?</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday scrimmage" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">When (optional)</label>
      <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Sat Jul 12 · 2:00 PM · Rink A" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
      <p className="mt-2 text-[10px] text-muted-foreground">Members reply Yes · No · Maybe. Live count updates instantly.</p>
      <button disabled={!title.trim()} onClick={() => onSubmit(title.trim(), when.trim())} className="mt-5 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">Post RSVP</button>
    </SheetShell>
  );
}

function ScheduleComposer({ onSubmit, onCancel }: { onSubmit: (text: string, when: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const defaultWhen = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
  const [when, setWhen] = useState(defaultWhen);
  const iso = when ? new Date(when).toISOString() : "";
  const valid = text.trim().length > 0 && iso && new Date(iso) > new Date();
  return (
    <SheetShell title="Schedule message" onCancel={onCancel}>
      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Message</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Reminder: pre-game meal at 5pm." className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Send at</label>
      <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground" />
      <p className="mt-2 text-[10px] text-muted-foreground">Message becomes visible to the group at that time.</p>
      <button disabled={!valid} onClick={() => onSubmit(text.trim(), iso)} className="mt-5 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">Schedule</button>
    </SheetShell>
  );
}

function NewConvoSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"team" | "dm">("team");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>("");
  const [audience, setAudience] = useState<"all" | "staff">("all");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dmTeamId, setDmTeamId] = useState<string>("");
  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactId, setContactId] = useState<string>("");
  const [contactSearch, setContactSearch] = useState("");

  useEffect(() => {
    supabase.from("teams").select("id,name").order("created_at", { ascending: false }).then(({ data }) => {
      setTeams((data ?? []) as Team[]);
    });
  }, []);

  useEffect(() => {
    if (mode !== "dm" || !dmTeamId) {
      setContacts([]);
      setContactId("");
      return;
    }
    setContactsLoading(true);
    setContactId("");
    listTeamMessageableContacts({ data: { teamId: dmTeamId } })
      .then((rows) => setContacts(rows))
      .catch((e) => setError(e.message ?? "Failed to load contacts"))
      .finally(() => setContactsLoading(false));
  }, [mode, dmTeamId]);

  async function createGroup() {
    if (!user || !teamId) return;
    setCreating(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("conversations")
      .insert({ type: "team_group", team_id: teamId, created_by: user.id })
      .select("id")
      .single();
    if (err) { setError(err.message); setCreating(false); return; }
    await supabase.from("conversation_members").insert({ conversation_id: data.id, user_id: user.id });
    setCreating(false);
    onCreated(data.id);
  }

  async function createDm() {
    if (!user || !contactId) return;
    setCreating(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("conversations")
      .insert({ type: "dm", created_by: user.id })
      .select("id")
      .single();
    if (err) { setError(err.message); setCreating(false); return; }
    await supabase.from("conversation_members").insert({ conversation_id: data.id, user_id: user.id });
    setCreating(false);
    onCreated(data.id);
  }

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.player_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">New conversation</h2>
          <button onClick={onClose} className="rounded-full bg-surface p-1.5 text-muted-foreground"><X size={14} /></button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setMode("team")} className={"flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold " + (mode === "team" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>
            <Users size={12} /> Team
          </button>
          <button onClick={() => setMode("dm")} className={"flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold " + (mode === "dm" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>
            <User size={12} /> Direct message
          </button>
        </div>

        {mode === "team" ? (
          <>
            <p className="mt-3 text-[11px] text-muted-foreground">Start a group chat tied to one of your teams.</p>
            <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Team</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
            >
              <option value="">Select a team…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {teamId && (
              <>
                <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recipients</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudience("all")}
                    className={"rounded-xl border py-2 text-xs font-bold " + (audience === "all" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudience("staff")}
                    className={"rounded-xl border py-2 text-xs font-bold " + (audience === "staff" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}
                  >
                    Managers / Coaches
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {audience === "all"
                    ? "Everyone on the team — parents, coaches, and managers."
                    : "Only team coaches and managers (staff-only chat)."}
                </p>
              </>
            )}
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <button
              disabled={!teamId || creating}
              onClick={createGroup}
              className="mt-5 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create group"}
            </button>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Invite parents from the team roster once they have an account.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Pick a team, then choose a parent or athlete to message.
            </p>
            <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Team</label>
            <select
              value={dmTeamId}
              onChange={(e) => setDmTeamId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
            >
              <option value="">Select a team…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {dmTeamId && (
            <input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search parents or athletes…"
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60"
            />
            )}
            {dmTeamId && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface">
              {contactsLoading ? (
                <p className="p-4 text-center text-xs text-muted-foreground">Loading contacts…</p>
              ) : filteredContacts.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  {contacts.length === 0 ? "No parents or athletes on this team yet." : "No matches."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredContacts.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => setContactId(c.id)}
                        className={"flex w-full items-center gap-2 px-3 py-2 text-left " + (contactId === c.id ? "bg-teal/10" : "")}
                      >
                        <div className={"grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold " + (c.kind === "athlete" ? "bg-amber-400/15 text-amber-400" : "bg-teal/15 text-teal")}>
                          {(c.name || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{c.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {c.kind === "parent"
                              ? `Parent${c.player_name ? ` · ${c.player_name}` : ""}${c.email ? ` · ${c.email}` : ""}`
                              : `Athlete${c.player_name && c.player_name !== c.name ? ` · ${c.player_name}` : ""}`}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            )}
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <button
              disabled={!contactId || creating}
              onClick={createDm}
              className="mt-4 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {creating ? "Starting…" : "Start direct message"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function BroadcastSheet({ onClose }: { onClose: () => void }) {
  const [target, setTarget] = useState<"all" | "camp">("all");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-background p-6 text-center">
          <Megaphone size={36} className="mx-auto text-emerald-400" />
          <h2 className="mt-2 font-display text-lg font-bold text-foreground">Broadcast sent</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">Recipients can read but cannot reply.</p>
          <button onClick={onClose} className="mt-4 w-full rounded-full bg-gradient-brand py-2.5 text-sm font-bold text-primary-foreground">Done</button>
        </div>
      </div>
    );
  }
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Megaphone size={16} className="text-amber-400" /> Broadcast
          </h2>
          <button onClick={onClose} className="rounded-full bg-surface p-1.5 text-muted-foreground"><X size={14} /></button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">One-way announcement. Recipients receive it but cannot reply.</p>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Audience</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button onClick={() => setTarget("all")} className={"rounded-xl border py-2 text-xs font-bold " + (target === "all" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>All members</button>
          <button onClick={() => setTarget("camp")} className={"rounded-xl border py-2 text-xs font-bold " + (target === "camp" ? "border-teal bg-teal/10 text-teal" : "border-border bg-surface text-muted-foreground")}>Specific camps</button>
        </div>
        {target === "camp" && (
          <div className="mt-2 space-y-1.5 rounded-xl border border-border bg-surface p-2">
            {["Summer Skills Camp", "Goalie Intensive", "Game IQ Weekend"].map((c) => (
              <label key={c} className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" className="h-3.5 w-3.5" /> {c}
              </label>
            ))}
          </div>
        )}

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Message</label>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={5}
          placeholder="Write your announcement…"
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
        />

        <button
          disabled={!msg.trim()}
          onClick={() => setSent(true)}
          className="mt-4 w-full rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          Send broadcast
        </button>
      </div>
    </div>
  );
}