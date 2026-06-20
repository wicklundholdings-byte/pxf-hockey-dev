import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Send, ArrowLeft, Users, Plus, Pin, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/inbox")({
  component: InboxPage,
});

type Convo = {
  id: string;
  type: "dm" | "camp_group";
  camp_id: string | null;
  created_by: string;
  created_at: string;
  camps?: { name: string | null } | null;
  last?: { body: string | null; created_at: string } | null;
};
type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
};
type Camp = { id: string; name: string };

function InboxPage() {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id,type,camp_id,created_by,created_at, camps(name)")
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inbox</p>
          <h2 className="font-display text-lg font-bold text-foreground">Conversations</h2>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
      ) : convos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <MessageSquare size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">No conversations yet.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-3 rounded-full bg-teal px-4 py-1.5 text-[11px] font-bold text-black"
          >
            Start one
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {convos.map((c) => {
            const title = c.type === "camp_group" ? (c.camps?.name ?? "Camp group") : "Direct message";
            const initials = (title).split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
                >
                  <div className={
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold " +
                    (c.type === "camp_group" ? "bg-amber-400/15 text-amber-400" : "bg-teal/15 text-teal")
                  }>
                    {c.type === "camp_group" ? <Users size={16} /> : initials}
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
    </div>
  );
}

function Thread({ convo, currentUserId, onBack }: { convo: Convo; currentUserId: string; onBack: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at");
    setMessages((data ?? []) as Msg[]);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`conv:${convo.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convo.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Msg]);
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
    const { error } = await supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: currentUserId,
      body: text,
    });
    setSending(false);
    if (error) {
      setBody(text);
      alert(error.message);
    }
  }

  async function togglePin(m: Msg) {
    await supabase.from("messages").update({ pinned: !m.pinned }).eq("id", m.id);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)));
  }

  const title = convo.type === "camp_group" ? (convo.camps?.name ?? "Camp group") : "Direct message";
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
            return (
              <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                <div className="group flex max-w-[80%] items-end gap-1">
                  <div className={
                    "rounded-2xl px-3 py-2 text-sm " +
                    (mine ? "rounded-br-sm bg-teal text-black" : "rounded-bl-sm bg-card text-foreground border border-border")
                  }>
                    <p className="whitespace-pre-wrap">{m.body}</p>
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
          className="grid h-10 w-10 place-items-center rounded-full bg-teal text-black disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function NewConvoSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [campId, setCampId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("camps").select("id,name").order("created_at", { ascending: false }).then(({ data }) => {
      setCamps((data ?? []) as Camp[]);
    });
  }, []);

  async function createGroup() {
    if (!user || !campId) return;
    setCreating(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("conversations")
      .insert({ type: "camp_group", camp_id: campId, created_by: user.id })
      .select("id")
      .single();
    if (err) { setError(err.message); setCreating(false); return; }
    await supabase.from("conversation_members").insert({ conversation_id: data.id, user_id: user.id });
    setCreating(false);
    onCreated(data.id);
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-t-3xl border-t border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">New conversation</h2>
          <button onClick={onClose} className="rounded-full bg-surface p-1.5 text-muted-foreground"><X size={14} /></button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Start a group chat tied to one of your camps.</p>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Camp</label>
        <select
          value={campId}
          onChange={(e) => setCampId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
        >
          <option value="">Select a camp…</option>
          {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button
          disabled={!campId || creating}
          onClick={createGroup}
          className="mt-5 w-full rounded-full bg-teal py-3 text-sm font-bold text-black disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create group"}
        </button>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Invite parents from the camp roster once they have an account.
        </p>
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