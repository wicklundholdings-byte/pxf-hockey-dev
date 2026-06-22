import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Send, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/parent/conversation/$conversationId")({
  head: () => ({ meta: [{ title: "Conversation — PXF Hockey" }] }),
  component: ParentConversation,
});

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
};

function ParentConversation() {
  const { conversationId } = useParams({ from: "/parent/conversation/$conversationId" });
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [title, setTitle] = useState("Direct message");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      // Verify membership and fetch camp/coach name
      const { data: membership } = await supabase
        .from("conversation_members")
        .select("conversation_id, conversations(camp_id, camps(name, owner_id, profiles(full_name)))")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      const other = await supabase
        .from("conversation_members")
        .select("user_id, profiles(full_name)")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id)
        .maybeSingle();

      const convo = (membership as any)?.conversations;
      const campName = convo?.camps?.name;
      const otherName = (other?.data as any)?.profiles?.full_name ?? "Coach";
      setTitle(campName ? `${otherName} — ${campName}` : otherName);
      setIsMember(!!membership);

      if (membership) {
        const { data } = await supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at");
        setMessages((data ?? []) as Msg[]);
      }
      setLoading(false);
    }
    load();
  }, [conversationId, user?.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`parent-conv:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Msg]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const text = body.trim();
    if (!text || !user) return;
    setSending(true);
    setBody("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: text,
    });
    setSending(false);
    if (error) {
      setBody(text);
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Link to="/parent/inbox" className="rounded-full bg-surface p-1.5 text-muted-foreground">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{title}</h1>
          </div>
        </div>
      </header>

      <div className="px-5 pt-4">
        {loading ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Loading conversation…</p>
        ) : !isMember ? (
          <p className="py-10 text-center text-xs text-red-400">You don’t have access to this conversation.</p>
        ) : (
          <>
            <div ref={scrollRef} className="h-[calc(100vh-240px)] space-y-2 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No messages yet. Say hi to your coach.</p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                      <div
                        className={
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                          (mine
                            ? "rounded-br-sm bg-gradient-brand text-primary-foreground"
                            : "rounded-bl-sm border border-border bg-card text-foreground")
                        }
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={"mt-0.5 text-[9px] " + (mine ? "text-black/60" : "text-muted-foreground")}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="fixed bottom-20 left-0 right-0 mx-auto w-full max-w-[480px] px-5">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Type a message…"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  onClick={send}
                  disabled={sending || !body.trim()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-brand text-primary-foreground disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
