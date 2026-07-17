import React, { useEffect, useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ParentTabBar } from '@/components/parent-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const BUBBLE_ME   = '#004A45';
const BUBBLE_THEM = '#1C2128';

type Thread = {
  id: string;
  name: string;
  kind: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  body: string;
  mine: boolean;
  created_at: string;
};

function fmtRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Conversation View ────────────────────────────────────────────────────────
function ConversationView({ thread, userId, onBack }: { thread: Thread; userId: string; onBack: () => void }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, body, sender_id, created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        setMessages((data ?? []).map((m: any) => ({
          id: m.id, body: m.body, mine: m.sender_id === userId, created_at: m.created_at,
        })));
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
      }
    })();

    // Real-time: append incoming messages
    const channel = supabase
      .channel(`parent-thread-${thread.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${thread.id}`,
      }, (payload) => {
        const m = payload.new as any;
        setMessages(prev => {
          if (prev.some(msg => msg.id === m.id)) return prev;
          const next = [...prev, { id: m.id, body: m.body, mine: m.sender_id === userId, created_at: m.created_at }];
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
          return next;
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [thread.id]);

  async function send() {
    if (!text.trim()) return;
    const body = text.trim();
    setText('');
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, body, mine: true, created_at: new Date().toISOString() }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    const { data } = await supabase
      .from('messages')
      .insert({ thread_id: thread.id, sender_id: userId, body })
      .select('id, body, sender_id, created_at')
      .single();
    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId
        ? { id: data.id, body: data.body, mine: true, created_at: data.created_at }
        : m
      ));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={s.convHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={s.convTitle} numberOfLines={1}>{thread.name}</ThemedText>
          <ThemedText style={s.convSubtitle}>{messages.length} message{messages.length !== 1 ? 's' : ''}</ThemedText>
        </View>
      </View>
      <View style={s.divider} />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.messagesArea}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {loading ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <ThemedText style={s.noMessages}>No messages yet.</ThemedText>
        ) : messages.map(msg => (
          <View key={msg.id} style={[s.msgRow, msg.mine && s.msgRowMine]}>
            <View style={[s.bubble, msg.mine ? s.bubbleMine : s.bubbleThem]}>
              <ThemedText style={[s.bubbleText, msg.mine && { color: TEXT }]}>{msg.body}</ThemedText>
              <ThemedText style={s.bubbleTime}>{fmtClock(msg.created_at)}</ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={s.composer}>
        <TextInput
          style={s.composerInput}
          placeholder="Type a message..."
          placeholderTextColor={MUTED}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
          onPress={send}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={16} color={text.trim() ? '#000' : MUTED} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ParentInboxScreen() {
  const [threads,      setThreads]      = useState<Thread[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [active,       setActive]       = useState<Thread | null>(null);
  const [userId,       setUserId]       = useState('');
  const [userInitials, setUserInitials] = useState('P');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Load profile initials
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        setUserInitials(parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : parts[0][0].toUpperCase());
      }

      // Load threads where parent is a participant
      const { data: participations } = await supabase
        .from('thread_participants')
        .select('thread_id, message_threads(id, name, kind, updated_at)')
        .eq('user_id', user.id);

      const mapped: Thread[] = (participations ?? []).map((p: any) => {
        const t: any = Array.isArray(p.message_threads) ? p.message_threads[0] : p.message_threads;
        return {
          id: t?.id ?? p.thread_id,
          name: t?.name ?? 'Message',
          kind: t?.kind ?? 'direct',
          updated_at: t?.updated_at ?? new Date().toISOString(),
        };
      }).filter(t => t.id);

      setThreads(mapped);
      setLoading(false);
    });
  }, []);

  if (active) {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.safe} edges={['top']}>
          <ConversationView thread={active} userId={userId} onBack={() => setActive(null)} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* PXF Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <ThemedText style={s.logoPXF}>PXF</ThemedText>
            <ThemedText style={s.logoHockey}>HOCKEY</ThemedText>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerIcon}>
              <Ionicons name="notifications-outline" size={22} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={s.profileAvatar}>
              <ThemedText style={s.profileAvatarText}>{userInitials}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <ThemedText style={s.title}>Inbox</ThemedText>
          <ThemedText style={s.subtitle}>Messages from your coaches</ThemedText>

          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
          ) : threads.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="chatbubble-outline" size={36} color={MUTED} />
              <ThemedText style={s.emptyText}>No messages yet</ThemedText>
              <ThemedText style={s.emptyNote}>Messages from your coaches will appear here</ThemedText>
            </View>
          ) : threads.map(thread => (
            <TouchableOpacity
              key={thread.id}
              style={s.msgCard}
              activeOpacity={0.85}
              onPress={() => setActive(thread)}
            >
              <View style={s.threadAvatar}>
                <Ionicons name={thread.kind === 'team' ? 'people' : 'person'} size={18} color={TEAL} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={s.msgTop}>
                  <ThemedText style={s.senderName}>{thread.name}</ThemedText>
                  <ThemedText style={s.msgTime}>{fmtRelTime(thread.updated_at)}</ThemedText>
                </View>
                <ThemedText style={s.msgPreview}>Tap to open conversation</ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
      <ParentTabBar active="inbox" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  logoPXF: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  logoHockey: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { padding: 4 },
  profileAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },

  content: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 34, color: TEXT, marginTop: 4, marginBottom: 4 },
  subtitle: { fontSize: 14, color: MUTED, marginBottom: 20 },

  msgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 8 },
  threadAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,196,180,0.15)', borderWidth: 1, borderColor: TEAL, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  senderName: { fontSize: 15, fontWeight: '700', color: TEXT, flex: 1 },
  msgTime: { fontSize: 12, color: MUTED, marginLeft: 8 },
  msgPreview: { fontSize: 13, color: MUTED, lineHeight: 18 },

  emptyCard: { marginTop: 40, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: MUTED, textAlign: 'center' },
  emptyNote: { fontSize: 13, color: MUTED, opacity: 0.6, textAlign: 'center', paddingHorizontal: 32 },

  // Conversation
  convHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  convTitle: { fontSize: 16, fontWeight: '700', color: TEXT, lineHeight: 20 },
  convSubtitle: { fontSize: 12, color: MUTED },
  divider: { height: 1, backgroundColor: BORDER },

  messagesArea: { paddingHorizontal: 16, paddingVertical: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  noMessages: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 60 },

  msgRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: BUBBLE_THEM, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: BUBBLE_ME, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: TEXT, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: MUTED, marginTop: 4, alignSelf: 'flex-end' },

  composer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER,
  },
  composerInput: {
    flex: 1, backgroundColor: BG, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    color: TEXT, fontSize: 14, borderWidth: 1, borderColor: BORDER, maxHeight: 100,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: BORDER },
});
