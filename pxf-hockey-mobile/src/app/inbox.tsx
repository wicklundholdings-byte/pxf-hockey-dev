import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Alert, Animated, PanResponder, Vibration, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG          = '#0D1117';
const CARD        = '#161B22';
const TEAL        = '#00C4B4';
const GREEN       = '#3DFF8F';
const ORANGE      = '#F59E0B';
const RED         = '#EF4444';
const TEXT        = '#FFFFFF';
const MUTED       = '#8B949E';
const BORDER      = '#21262D';
const BUBBLE_ME   = '#004A45';
const BUBBLE_THEM = '#1C2128';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];

// Avatar colors pool
const AVATAR_COLORS = [TEAL, '#7C3AED', ORANGE, '#3DFF8F', '#EC4899', '#3B82F6'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function relTime(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d`;
  return new Date(iso!).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function shouldShowTimestamp(msgs: ChatMessage[], idx: number) {
  if (idx === 0) return true;
  const prev = new Date(msgs[idx - 1].created_at).getTime();
  const curr = new Date(msgs[idx].created_at).getTime();
  return curr - prev > 5 * 60 * 1000; // 5 min gap
}

// ─── Types ────────────────────────────────────────────────────────────────────
type InboxSection = 'channels' | 'dms';

type Conversation = {
  id: string;
  name: string;
  kind: 'team' | 'dm';
  lastMessage: string;
  lastTime: string | null;
  unreadCount: number;
};

type Reaction = { emoji: string; count: number; byMe: boolean };

type ChatMessage = {
  id: string;
  body: string;
  mine: boolean;
  sender_name: string;
  created_at: string;
  read: boolean;          // ✓✓ read receipt
  reply_to_id: string | null;
  reply_preview: string | null;
  reactions: Reaction[];
  pending?: boolean;      // optimistic
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 46, isChannel = false }: { name: string; size?: number; isChannel?: boolean }) {
  const col = avatarColor(name);
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${col}22`, borderColor: col, borderWidth: 1 }]}>
      {isChannel
        ? <Ionicons name="people" size={size * 0.44} color={col} />
        : <ThemedText style={[s.avatarText, { fontSize: size * 0.3, color: col }]}>{initials(name)}</ThemedText>
      }
    </View>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  const anims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const loop = Animated.loop(Animated.stagger(150, anims.map(a =>
      Animated.sequence([
        Animated.timing(a, { toValue: -5, duration: 300, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0,  duration: 300, useNativeDriver: true }),
      ])
    )));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={s.typingWrap}>
      <View style={[s.bubble, s.bubbleThem, s.typingBubble]}>
        {anims.map((a, i) => (
          <Animated.View key={i} style={[s.typingDot, { transform: [{ translateY: a }] }]} />
        ))}
      </View>
    </View>
  );
}

// ─── Reply Quote ──────────────────────────────────────────────────────────────
function ReplyQuote({ preview, mine }: { preview: string; mine: boolean }) {
  return (
    <View style={[s.replyQuote, mine ? s.replyQuoteMine : s.replyQuoteThem]}>
      <View style={[s.replyBar, { backgroundColor: mine ? TEAL : ORANGE }]} />
      <ThemedText style={s.replyText} numberOfLines={2}>{preview}</ThemedText>
    </View>
  );
}

// ─── Reaction Bar ─────────────────────────────────────────────────────────────
function ReactionBar({ reactions, onToggle }: { reactions: Reaction[]; onToggle: (emoji: string) => void }) {
  if (!reactions.length) return null;
  return (
    <View style={s.reactionRow}>
      {reactions.map(r => (
        <TouchableOpacity key={r.emoji} style={[s.reactionChip, r.byMe && s.reactionChipActive]} onPress={() => onToggle(r.emoji)} activeOpacity={0.8}>
          <ThemedText style={s.reactionEmoji}>{r.emoji}</ThemedText>
          {r.count > 1 && <ThemedText style={s.reactionCount}>{r.count}</ThemedText>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg, isFirst, isLast,
  onLongPress, onReply, onReact, onRead,
}: {
  msg: ChatMessage;
  isFirst: boolean;
  isLast: boolean;
  onLongPress: (msg: ChatMessage) => void;
  onReply: (msg: ChatMessage) => void;
  onReact: (msg: ChatMessage, emoji: string) => void;
  onRead: (msg: ChatMessage) => void;
}) {
  const swipeX = useRef(new Animated.Value(0)).current;
  const triggered = useRef(false);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => {
      if (!msg.mine && g.dx > 0) {
        swipeX.setValue(Math.min(g.dx, 60));
        if (g.dx > 50 && !triggered.current) {
          triggered.current = true;
          Vibration.vibrate(10);
        }
      }
      if (msg.mine && g.dx < 0) {
        swipeX.setValue(Math.max(g.dx, -60));
        if (g.dx < -50 && !triggered.current) {
          triggered.current = true;
          Vibration.vibrate(10);
        }
      }
    },
    onPanResponderRelease: (_, g) => {
      if ((msg.mine && g.dx < -50) || (!msg.mine && g.dx > 50)) {
        onReply(msg);
      }
      triggered.current = false;
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  useEffect(() => {
    if (!msg.mine && !msg.read) onRead(msg);
  }, []);

  return (
    <View style={[s.msgGroup, msg.mine ? s.msgGroupMine : s.msgGroupThem]}>
      {!msg.mine && isFirst && (
        <ThemedText style={s.senderName}>{msg.sender_name}</ThemedText>
      )}
      <Animated.View
        style={{ transform: [{ translateX: swipeX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableWithoutFeedback onLongPress={() => { Vibration.vibrate(20); onLongPress(msg); }}>
          <View style={[s.bubble, msg.mine ? s.bubbleMine : s.bubbleThem,
            isFirst && !msg.mine && s.bubbleFirstThem,
            isFirst && msg.mine && s.bubbleFirstMine,
          ]}>
            {msg.reply_preview && <ReplyQuote preview={msg.reply_preview} mine={msg.mine} />}
            <ThemedText style={s.bubbleText}>{msg.body}</ThemedText>
            <View style={s.bubbleMeta}>
              <ThemedText style={s.bubbleTime}>{fmtTime(msg.created_at)}</ThemedText>
              {msg.mine && (
                <View style={s.readReceipt}>
                  <Ionicons
                    name={msg.read ? 'checkmark-done' : 'checkmark'}
                    size={12}
                    color={msg.read ? TEAL : MUTED}
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
      <ReactionBar reactions={msg.reactions} onToggle={(emoji) => onReact(msg, emoji)} />
    </View>
  );
}

// ─── Long Press Menu ──────────────────────────────────────────────────────────
function LongPressMenu({
  msg,
  onClose,
  onReply,
  onReact,
  onCopy,
  onDelete,
}: {
  msg: ChatMessage | null;
  onClose: () => void;
  onReply: (msg: ChatMessage) => void;
  onReact: (msg: ChatMessage, emoji: string) => void;
  onCopy: (msg: ChatMessage) => void;
  onDelete: (msg: ChatMessage) => void;
}) {
  if (!msg) return null;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.menuOverlay}>
          <TouchableWithoutFeedback>
            <View style={s.menuSheet}>
              {/* Quick reactions */}
              <View style={s.quickReacts}>
                {QUICK_EMOJIS.map(e => (
                  <TouchableOpacity key={e} style={s.quickEmoji} onPress={() => { onReact(msg, e); onClose(); }}>
                    <ThemedText style={s.quickEmojiText}>{e}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.menuDivider} />
              {/* Actions */}
              {[
                { icon: 'arrow-undo-outline', label: 'Reply', action: () => { onReply(msg); onClose(); } },
                { icon: 'copy-outline',       label: 'Copy',  action: () => { onCopy(msg); onClose(); } },
                ...(msg.mine ? [{ icon: 'trash-outline', label: 'Delete', action: () => { onDelete(msg); onClose(); }, danger: true }] : []),
              ].map(item => (
                <TouchableOpacity key={item.label} style={s.menuItem} onPress={item.action} activeOpacity={0.8}>
                  <Ionicons name={item.icon as any} size={18} color={(item as any).danger ? RED : MUTED} />
                  <ThemedText style={[(item as any).danger ? s.menuItemDanger : s.menuItemText]}>{item.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Conversation View ────────────────────────────────────────────────────────
function ConversationView({ conv, userId, userName, onBack }: {
  conv: Conversation; userId: string; userName: string; onBack: () => void;
}) {
  const [text,       setText]       = useState('');
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [typing,     setTyping]     = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [menuMsg,    setMenuMsg]    = useState<ChatMessage | null>(null);
  const scrollRef  = useRef<ScrollView>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fetch messages with reactions
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, body, sender_id, created_at, reply_to_id, reply_preview')
        .eq('thread_id', conv.id)
        .order('created_at', { ascending: true });

      const msgIds = (msgs ?? []).map((m: any) => m.id);

      // Fetch reactions
      let reactMap: Record<string, Reaction[]> = {};
      if (msgIds.length > 0) {
        const { data: reacts } = await supabase
          .from('message_reactions')
          .select('message_id, emoji, user_id')
          .in('message_id', msgIds);
        (reacts ?? []).forEach((r: any) => {
          if (!reactMap[r.message_id]) reactMap[r.message_id] = [];
          const existing = reactMap[r.message_id].find(x => x.emoji === r.emoji);
          if (existing) { existing.count++; if (r.user_id === userId) existing.byMe = true; }
          else reactMap[r.message_id].push({ emoji: r.emoji, count: 1, byMe: r.user_id === userId });
        });
      }

      // Fetch read receipts
      let readSet = new Set<string>();
      if (msgIds.length > 0) {
        const { data: reads } = await supabase
          .from('message_reads')
          .select('message_id')
          .in('message_id', msgIds)
          .neq('user_id', userId);
        (reads ?? []).forEach((r: any) => readSet.add(r.message_id));
      }

      if (!cancelled) {
        setMessages((msgs ?? []).map((m: any) => ({
          id: m.id, body: m.body,
          mine: m.sender_id === userId,
          sender_name: 'Them', // enrich later
          created_at: m.created_at,
          read: readSet.has(m.id),
          reply_to_id: m.reply_to_id ?? null,
          reply_preview: m.reply_preview ?? null,
          reactions: reactMap[m.id] ?? [],
        })));
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
      }

      // Mark all as read
      await supabase.from('message_reads')
        .upsert(msgIds.map((mid: string) => ({ message_id: mid, user_id: userId })), { onConflict: 'message_id,user_id' });
    })();

    // Realtime: new messages
    const msgChannel = supabase.channel(`msgs-${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${conv.id}` },
        async (payload) => {
          const m = payload.new as any;
          const newMsg: ChatMessage = {
            id: m.id, body: m.body,
            mine: m.sender_id === userId,
            sender_name: 'Them',
            created_at: m.created_at,
            read: false,
            reply_to_id: m.reply_to_id ?? null,
            reply_preview: m.reply_preview ?? null,
            reactions: [],
          };
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, newMsg]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
          if (!m.mine) {
            await supabase.from('message_reads').upsert({ message_id: m.id, user_id: userId }, { onConflict: 'message_id,user_id' });
          }
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `thread_id=eq.${conv.id}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reads', filter: undefined as any },
        (payload) => {
          const r = payload.new as any;
          if (r.user_id !== userId) {
            setMessages(prev => prev.map(m => m.id === r.message_id ? { ...m, read: true } : m));
          }
        })
      .subscribe();

    // Presence: typing indicator
    const presence = supabase.channel(`typing-${conv.id}`, { config: { presence: { key: userId } } });
    presenceRef.current = presence;
    presence
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState() as any;
        const others = Object.entries(state)
          .filter(([k]) => k !== userId)
          .flatMap(([, v]: [string, any]) => (v as any[]).filter((x: any) => x.typing).map((x: any) => x.name ?? 'Someone'));
        setTyping(others);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presence);
    };
  }, [conv.id]);

  function onTyping(t: string) {
    setText(t);
    presenceRef.current?.track({ typing: !!t.trim(), name: userName });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (t.trim()) {
      typingTimer.current = setTimeout(() => presenceRef.current?.track({ typing: false, name: userName }), 3000);
    }
  }

  async function send() {
    if (!text.trim()) return;
    const body = text.trim();
    setText('');
    presenceRef.current?.track({ typing: false, name: userName });
    if (typingTimer.current) clearTimeout(typingTimer.current);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId, body, mine: true, sender_name: userName,
      created_at: new Date().toISOString(),
      read: false, reply_to_id: replyingTo?.id ?? null,
      reply_preview: replyingTo?.body.slice(0, 80) ?? null,
      reactions: [], pending: true,
    };
    setMessages(prev => [...prev, tempMsg]);
    setReplyingTo(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

    const { data } = await supabase.from('messages')
      .insert({
        thread_id: conv.id, sender_id: userId, body,
        reply_to_id: replyingTo?.id ?? null,
        reply_preview: replyingTo?.body.slice(0, 80) ?? null,
      })
      .select('id, body, sender_id, created_at, reply_to_id, reply_preview')
      .single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId
        ? { ...m, id: data.id, pending: false }
        : m
      ));
    }
  }

  async function toggleReaction(msg: ChatMessage, emoji: string) {
    const existing = msg.reactions.find(r => r.emoji === emoji && r.byMe);
    if (existing) {
      await supabase.from('message_reactions').delete().eq('message_id', msg.id).eq('user_id', userId).eq('emoji', emoji);
      setMessages(prev => prev.map(m => m.id === msg.id
        ? { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, byMe: false } : r).filter(r => r.count > 0) }
        : m
      ));
    } else {
      await supabase.from('message_reactions').upsert({ message_id: msg.id, user_id: userId, emoji }, { onConflict: 'message_id,user_id,emoji' });
      setMessages(prev => prev.map(m => m.id === msg.id
        ? { ...m, reactions: m.reactions.some(r => r.emoji === emoji)
            ? m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, byMe: true } : r)
            : [...m.reactions, { emoji, count: 1, byMe: true }]
          }
        : m
      ));
    }
  }

  async function deleteMsg(msg: ChatMessage) {
    Alert.alert('Delete message?', 'This will remove it for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('messages').delete().eq('id', msg.id);
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }},
    ]);
  }

  function copyMsg(msg: ChatMessage) {
    Clipboard.setString(msg.body);
  }

  function markRead(msg: ChatMessage) {
    supabase.from('message_reads').upsert({ message_id: msg.id, user_id: userId }, { onConflict: 'message_id,user_id' });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={s.convHeader}>
        <TouchableOpacity onPress={onBack} style={s.convBackBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <Avatar name={conv.name} size={36} isChannel={conv.kind === 'team'} />
        <View style={{ flex: 1 }}>
          <ThemedText style={s.convTitle}>{conv.name}</ThemedText>
          {typing.length > 0
            ? <ThemedText style={s.convTyping}>{typing[0]} is typing…</ThemedText>
            : <ThemedText style={s.convSubtitle}>{conv.kind === 'team' ? 'Team channel' : 'Direct message'}</ThemedText>
          }
        </View>
        <TouchableOpacity style={s.iconBtn}><Ionicons name="call-outline" size={20} color={MUTED} /></TouchableOpacity>
        <TouchableOpacity style={s.iconBtn}><Ionicons name="videocam-outline" size={20} color={MUTED} /></TouchableOpacity>
      </View>
      <View style={s.convDivider} />

      {/* Messages */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.messagesArea} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {loading
          ? <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
          : messages.length === 0
            ? <View style={s.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={48} color={MUTED} />
                <ThemedText style={s.noMessages}>No messages yet</ThemedText>
                <ThemedText style={s.noMessagesSub}>Start the conversation 👋</ThemedText>
              </View>
            : messages.map((msg, i) => {
                const isFirst = i === 0 || messages[i - 1].mine !== msg.mine;
                const isLast  = i === messages.length - 1 || messages[i + 1].mine !== msg.mine;
                return (
                  <View key={msg.id}>
                    {shouldShowTimestamp(messages, i) && (
                      <View style={s.tsRow}>
                        <View style={s.tsLine} />
                        <ThemedText style={s.tsText}>{fmtTime(msg.created_at)}</ThemedText>
                        <View style={s.tsLine} />
                      </View>
                    )}
                    <MessageBubble
                      msg={msg} isFirst={isFirst} isLast={isLast}
                      onLongPress={setMenuMsg}
                      onReply={(m) => { setReplyingTo(m); }}
                      onReact={toggleReaction}
                      onRead={markRead}
                    />
                  </View>
                );
              })
        }
        {typing.length > 0 && <TypingDots />}
      </ScrollView>

      {/* Reply bar */}
      {replyingTo && (
        <View style={s.replyBar2}>
          <View style={s.replyBarAccent} />
          <View style={{ flex: 1 }}>
            <ThemedText style={s.replyBarLabel}>Replying to</ThemedText>
            <ThemedText style={s.replyBarPreview} numberOfLines={1}>{replyingTo.body}</ThemedText>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={s.iconBtn}>
            <Ionicons name="close" size={18} color={MUTED} />
          </TouchableOpacity>
        </View>
      )}

      {/* Composer */}
      <View style={s.composer}>
        <TouchableOpacity style={s.composerIcon} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={MUTED} />
        </TouchableOpacity>
        <TouchableOpacity style={s.composerIcon} activeOpacity={0.8}>
          <Ionicons name="camera-outline" size={20} color={MUTED} />
        </TouchableOpacity>
        <TextInput
          style={s.composerInput}
          placeholder="Message..."
          placeholderTextColor={MUTED}
          value={text}
          onChangeText={onTyping}
          multiline
        />
        {text.trim()
          ? <TouchableOpacity style={s.sendBtn} onPress={send} activeOpacity={0.85}>
              <Ionicons name="send" size={16} color="#000" />
            </TouchableOpacity>
          : <TouchableOpacity style={s.composerIcon} activeOpacity={0.8}>
              <Ionicons name="mic-outline" size={20} color={MUTED} />
            </TouchableOpacity>
        }
      </View>

      <LongPressMenu
        msg={menuMsg}
        onClose={() => setMenuMsg(null)}
        onReply={(m) => { setReplyingTo(m); }}
        onReact={toggleReaction}
        onCopy={copyMsg}
        onDelete={deleteMsg}
      />
    </KeyboardAvoidingView>
  );
}

// ─── New Conversation Modal ───────────────────────────────────────────────────
type ConvKind = 'team' | 'camp' | 'staff' | 'private';

type EntityOption = { id: string; label: string; sub?: string };

const KIND_OPTIONS: { key: ConvKind; icon: string; label: string }[] = [
  { key: 'team',    icon: 'people-outline',    label: 'Team'    },
  { key: 'camp',    icon: 'flag-outline',       label: 'Camp'    },
  { key: 'staff',   icon: 'id-card-outline',   label: 'Staff'   },
  { key: 'private', icon: 'chatbubble-outline', label: 'Private' },
];

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', instructor: 'Instructor',
  front_desk: 'Front Desk', null: 'No app access',
};

function NewConvModal({ visible, userId, onClose, onCreated }: {
  visible: boolean; userId: string;
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}) {
  const [kind,        setKind]        = useState<ConvKind>('team');
  const [teams,       setTeams]       = useState<EntityOption[]>([]);
  const [camps,       setCamps]       = useState<EntityOption[]>([]);
  const [staffList,   setStaffList]   = useState<EntityOption[]>([]);
  const [selected,    setSelected]    = useState<EntityOption | null>(null);
  const [staffSel,    setStaffSel]    = useState<Set<string>>(new Set());
  const [dmName,      setDmName]      = useState('');
  const [saving,      setSaving]      = useState(false);
  const [loadingOpts, setLoadingOpts] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoadingOpts(true);
    Promise.all([
      supabase.from('teams').select('id, name, age_group, season').eq('coach_id', userId).order('name'),
      supabase.from('camps').select('id, name, start_date').eq('coach_id', userId).order('start_date', { ascending: false }).limit(20),
      supabase.from('staff_members').select('id, full_name, job_role, app_role').eq('coach_id', userId).order('full_name'),
    ]).then(([{ data: t }, { data: c }, { data: st }]) => {
      setTeams((t ?? []).map((r: any) => ({ id: r.id, label: r.name, sub: [r.age_group, r.season].filter(Boolean).join(' · ') })));
      setCamps((c ?? []).map((r: any) => ({ id: r.id, label: r.name, sub: r.start_date ? new Date(r.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined })));
      setStaffList((st ?? []).map((r: any) => ({
        id: r.id,
        label: r.full_name,
        sub: [ROLE_LABEL[r.app_role] ?? r.app_role, r.job_role].filter(Boolean).join(' · '),
      })));
      setLoadingOpts(false);
    });
  }, [visible, userId]);

  useEffect(() => { setSelected(null); setStaffSel(new Set()); setDmName(''); }, [kind]);

  function toggleStaff(id: string) {
    setStaffSel(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const singleOptions = kind === 'team' ? teams : kind === 'camp' ? camps : [];
  const canCreate =
    kind === 'private' ? dmName.trim().length > 0 :
    kind === 'staff'   ? staffSel.size > 0 :
    selected !== null;

  async function create() {
    if (!canCreate) return;
    setSaving(true);

    let name: string;
    let threadKind: string;
    if (kind === 'staff') {
      const names = staffList.filter(s => staffSel.has(s.id)).map(s => s.label);
      name = names.length === 1 ? names[0] : names.join(', ');
      threadKind = 'staff';
    } else if (kind === 'private') {
      name = dmName.trim();
      threadKind = 'dm';
    } else {
      name = selected!.label;
      threadKind = kind;
    }

    const { data, error } = await supabase
      .from('message_threads')
      .insert({ coach_id: userId, name, kind: threadKind })
      .select('id, name, kind, updated_at')
      .single();
    setSaving(false);
    if (error || !data) { Alert.alert('Error', error?.message ?? 'Could not create conversation.'); return; }
    onCreated({ id: data.id, name: data.name, kind: data.kind, lastMessage: '', lastTime: null, unreadCount: 0 });
    setSelected(null); setStaffSel(new Set()); setDmName(''); setKind('team'); onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <ThemedText style={s.modalTitle}>New Conversation</ThemedText>

          {/* Kind selector — 2x2 grid */}
          <View style={s.kindGrid}>
            {KIND_OPTIONS.map(k => (
              <TouchableOpacity key={k.key} style={[s.kindGridBtn, kind === k.key && s.kindBtnActive]} onPress={() => setKind(k.key)} activeOpacity={0.8}>
                <Ionicons name={k.icon as any} size={16} color={kind === k.key ? '#000' : MUTED} />
                <ThemedText style={[s.kindText, kind === k.key && s.kindTextActive]}>{k.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Team / Camp — single select */}
          {(kind === 'team' || kind === 'camp') && (
            <>
              <ThemedText style={s.modalLabel}>{kind === 'team' ? 'SELECT TEAM' : 'SELECT CAMP'}</ThemedText>
              {loadingOpts
                ? <ActivityIndicator color={TEAL} style={{ marginVertical: 16 }} />
                : singleOptions.length === 0
                  ? <View style={s.modalEmpty}><ThemedText style={s.modalEmptyText}>No {kind === 'team' ? 'teams' : 'camps'} found</ThemedText></View>
                  : <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                      {singleOptions.map(opt => (
                        <TouchableOpacity key={opt.id} style={[s.optionRow, selected?.id === opt.id && s.optionRowActive]} onPress={() => setSelected(opt)} activeOpacity={0.8}>
                          <View style={[s.optionDot, selected?.id === opt.id && s.optionDotActive]} />
                          <View style={{ flex: 1 }}>
                            <ThemedText style={[s.optionLabel, selected?.id === opt.id && { color: TEAL }]}>{opt.label}</ThemedText>
                            {opt.sub && <ThemedText style={s.optionSub}>{opt.sub}</ThemedText>}
                          </View>
                          {selected?.id === opt.id && <Ionicons name="checkmark" size={16} color={TEAL} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
              }
            </>
          )}

          {/* Staff — multi-select */}
          {kind === 'staff' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <ThemedText style={s.modalLabel}>SELECT STAFF</ThemedText>
                {staffSel.size > 0 && <ThemedText style={{ fontSize: 12, color: TEAL, fontWeight: '700' }}>{staffSel.size} selected</ThemedText>}
              </View>
              {loadingOpts
                ? <ActivityIndicator color={TEAL} style={{ marginVertical: 16 }} />
                : staffList.length === 0
                  ? <View style={s.modalEmpty}><ThemedText style={s.modalEmptyText}>No staff members found</ThemedText></View>
                  : <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                      {staffList.map(m => {
                        const on = staffSel.has(m.id);
                        return (
                          <TouchableOpacity key={m.id} style={[s.optionRow, on && s.optionRowActive]} onPress={() => toggleStaff(m.id)} activeOpacity={0.8}>
                            <View style={[s.staffCheck, on && s.staffCheckOn]}>
                              {on && <Ionicons name="checkmark" size={13} color="#000" />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <ThemedText style={[s.optionLabel, on && { color: TEAL }]}>{m.label}</ThemedText>
                              {m.sub && <ThemedText style={s.optionSub}>{m.sub}</ThemedText>}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
              }
            </>
          )}

          {/* Private DM */}
          {kind === 'private' && (
            <>
              <ThemedText style={s.modalLabel}>RECIPIENT NAME</ThemedText>
              <TextInput style={s.modalInput} placeholder="e.g. John Smith" placeholderTextColor={MUTED} value={dmName} onChangeText={setDmName} autoFocus />
            </>
          )}

          <TouchableOpacity style={[s.modalSaveBtn, { marginTop: 16 }, !canCreate && { opacity: 0.4 }]} onPress={create} disabled={!canCreate || saving} activeOpacity={0.85}>
            <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalSaveGrad}>
              <ThemedText style={s.modalSaveText}>{saving ? 'Creating…' : 'Start Conversation'}</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function InboxScreen() {
  const [section,    setSection]    = useState<InboxSection>('channels');
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [channels,   setChannels]   = useState<Conversation[]>([]);
  const [dms,        setDms]        = useState<Conversation[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [userId,     setUserId]     = useState('');
  const [userName,   setUserName]   = useState('Coach');
  const [showNew,    setShowNew]    = useState(false);

  async function loadThreads(uid: string) {
    const { data: threads } = await supabase
      .from('message_threads')
      .select('id, name, kind, updated_at')
      .eq('coach_id', uid)
      .order('updated_at', { ascending: false });

    const rows = threads ?? [];
    if (!rows.length) { setLoading(false); return; }

    const threadIds = rows.map((r: any) => r.id);

    // Last message per thread
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('thread_id, body, created_at')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false });
    const latestMap: Record<string, { body: string; created_at: string }> = {};
    (lastMsgs ?? []).forEach((m: any) => { if (!latestMap[m.thread_id]) latestMap[m.thread_id] = m; });

    // Unread counts — messages not read by me
    const { data: allMsgIds } = await supabase.from('messages').select('id, thread_id').in('thread_id', threadIds);
    const { data: myReads } = await supabase.from('message_reads').select('message_id').eq('user_id', uid);
    const readIds = new Set((myReads ?? []).map((r: any) => r.message_id));
    const unreadByThread: Record<string, number> = {};
    (allMsgIds ?? []).forEach((m: any) => {
      if (!readIds.has(m.id)) unreadByThread[m.thread_id] = (unreadByThread[m.thread_id] ?? 0) + 1;
    });

    const toConv = (r: any): Conversation => ({
      id: r.id, name: r.name ?? (r.kind === 'team' ? 'Team Channel' : 'Direct Message'),
      kind: r.kind, lastMessage: latestMap[r.id]?.body ?? '',
      lastTime: latestMap[r.id]?.created_at ?? null,
      unreadCount: unreadByThread[r.id] ?? 0,
    });

    setChannels(rows.filter((r: any) => r.kind === 'team').map(toConv));
    setDms(rows.filter((r: any) => r.kind !== 'team').map(toConv));
    setLoading(false);
  }

  useFocusEffect(useCallback(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (prof?.full_name) setUserName(prof.full_name);
      loadThreads(user.id);
    });
  }, []));

  function openConv(conv: Conversation) {
    // Mark as read locally
    const clear = (list: Conversation[]) => list.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c);
    setChannels(clear);
    setDms(clear);
    setActiveConv(conv);
  }

  function handleNewConv(conv: Conversation) {
    if (conv.kind === 'team') setChannels(p => [conv, ...p]);
    else setDms(p => [conv, ...p]);
    setSection(conv.kind === 'team' ? 'channels' : 'dms');
    setActiveConv(conv);
  }

  const list = section === 'channels' ? channels : dms;
  const totalUnread = (section === 'channels' ? dms : channels).reduce((s, c) => s + c.unreadCount, 0);

  // ── Conversation view ───────────────────────────────────────────────────────
  if (activeConv) {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.safe}>
          <ConversationView conv={activeConv} userId={userId} userName={userName} onBack={() => setActiveConv(null)} />
        </SafeAreaView>
      </View>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* COACH row */}
        <View style={s.coachRow}>
          <View style={s.coachChip}><ThemedText style={s.coachChipText}>COACH</ThemedText></View>
          <View style={s.coachIcons}>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="person-circle-outline" size={22} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="megaphone-outline" size={20} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="camera-outline" size={20} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="settings-outline" size={20} color={MUTED} /></TouchableOpacity>
          </View>
        </View>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <ThemedText style={s.inboxLabel}>INBOX</ThemedText>
            <ThemedText style={s.title}>Conversations</ThemedText>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.broadcastBtn} activeOpacity={0.8}>
              <Ionicons name="megaphone-outline" size={14} color={ORANGE} style={{ marginRight: 5 }} />
              <ThemedText style={s.broadcastText}>Broadcast</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNew(true)} activeOpacity={0.85}>
              <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.newBtn}>
                <ThemedText style={s.newBtnText}>+ New</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Toggle */}
        <View style={s.toggle}>
          {(['channels', 'dms'] as const).map(sec => {
            const count = sec === 'channels' ? channels.reduce((s, c) => s + c.unreadCount, 0) : dms.reduce((s, c) => s + c.unreadCount, 0);
            return (
              <TouchableOpacity key={sec} style={[s.toggleBtn, section === sec && s.toggleBtnActive]} onPress={() => setSection(sec)} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ThemedText style={[s.toggleText, section === sec && s.toggleTextActive]}>
                    {sec === 'channels' ? 'Channels' : 'Direct Messages'}
                  </ThemedText>
                  {count > 0 && (
                    <View style={[s.unreadBadge, section === sec && s.unreadBadgeActive]}>
                      <ThemedText style={[s.unreadBadgeText, section === sec && { color: '#000' }]}>{count}</ThemedText>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
          {loading
            ? <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
            : list.length === 0
              ? <View style={s.emptyCard}>
                  <Ionicons name={section === 'channels' ? 'people-outline' : 'chatbubble-outline'} size={36} color={MUTED} />
                  <ThemedText style={s.emptyText}>{section === 'channels' ? 'No team channels yet' : 'No direct messages yet'}</ThemedText>
                  <TouchableOpacity onPress={() => setShowNew(true)} activeOpacity={0.85} style={{ marginTop: 4 }}>
                    <ThemedText style={s.emptyAction}>+ Start a conversation</ThemedText>
                  </TouchableOpacity>
                </View>
              : list.map(conv => (
                  <TouchableOpacity key={conv.id} style={[s.convRow, conv.unreadCount > 0 && s.convRowUnread]} onPress={() => openConv(conv)} activeOpacity={0.8}>
                    <View style={{ position: 'relative' }}>
                      <Avatar name={conv.name} isChannel={conv.kind === 'team'} />
                      {conv.unreadCount > 0 && (
                        <View style={s.badgeDot}>
                          <ThemedText style={s.badgeDotText}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={s.convRowTop}>
                        <ThemedText style={[s.convRowName, conv.unreadCount > 0 && { color: TEXT, fontWeight: '800' }]} numberOfLines={1}>{conv.name}</ThemedText>
                        <ThemedText style={[s.convRowTime, conv.unreadCount > 0 && { color: TEAL }]}>{relTime(conv.lastTime)}</ThemedText>
                      </View>
                      <ThemedText style={[s.convRowSub, conv.unreadCount > 0 && { color: TEXT }]} numberOfLines={1}>
                        {conv.lastMessage || 'No messages yet'}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))
          }
        </ScrollView>
      </SafeAreaView>

      <NewConvModal visible={showNew} userId={userId} onClose={() => setShowNew(false)} onCreated={handleNewConv} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  coachRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  coachChip:     { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL },
  coachChipText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  coachIcons:    { flexDirection: 'row', gap: 4 },
  iconBtn:       { padding: 6 },

  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  inboxLabel:    { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, marginBottom: 3 },
  title:         { fontSize: 26, fontWeight: '800', color: TEXT, lineHeight: 32 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  broadcastBtn:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: ORANGE, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  broadcastText: { fontSize: 13, fontWeight: '700', color: ORANGE },
  newBtn:        { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText:    { fontSize: 13, fontWeight: '800', color: '#000' },

  toggle:           { flexDirection: 'row', backgroundColor: CARD, borderRadius: 30, marginHorizontal: 16, padding: 4, marginBottom: 14 },
  toggleBtn:        { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 26 },
  toggleBtnActive:  { backgroundColor: TEAL },
  toggleText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  toggleTextActive: { color: '#000', fontWeight: '700' },
  unreadBadge:      { backgroundColor: TEAL, borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeActive:{ backgroundColor: '#000' },
  unreadBadgeText:  { fontSize: 10, fontWeight: '800', color: '#000', lineHeight: 14 },

  listContent: { paddingBottom: 32 },
  convRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 2, paddingHorizontal: 14, paddingVertical: 12 },
  convRowUnread:{ backgroundColor: 'rgba(0,196,180,0.04)', borderRadius: 14 },
  convRowTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  convRowName:  { fontSize: 15, fontWeight: '600', color: TEXT, flex: 1, marginRight: 8 },
  convRowTime:  { fontSize: 11, color: MUTED, flexShrink: 0 },
  convRowSub:   { fontSize: 13, color: MUTED },

  avatar:     { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: '800' },

  badgeDot:     { position: 'absolute', top: -2, right: -2, backgroundColor: TEAL, borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BG },
  badgeDotText: { fontSize: 9, fontWeight: '800', color: '#000', lineHeight: 12 },

  emptyCard:   { marginHorizontal: 16, marginTop: 48, alignItems: 'center', gap: 10 },
  emptyText:   { fontSize: 15, fontWeight: '700', color: MUTED, textAlign: 'center' },
  emptyAction: { fontSize: 14, fontWeight: '700', color: TEAL },

  // Conversation view
  convHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  convBackBtn:  { padding: 4 },
  convTitle:    { fontSize: 15, fontWeight: '700', color: TEXT, lineHeight: 19 },
  convSubtitle: { fontSize: 11, color: MUTED },
  convTyping:   { fontSize: 11, color: TEAL, fontStyle: 'italic' },
  convDivider:  { height: 1, backgroundColor: BORDER },

  messagesArea: { paddingHorizontal: 12, paddingVertical: 16, gap: 2, flexGrow: 1, justifyContent: 'flex-end' },
  emptyChat:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  noMessages:   { fontSize: 16, fontWeight: '700', color: MUTED },
  noMessagesSub:{ fontSize: 13, color: MUTED, opacity: 0.7 },

  // Message groups
  msgGroup:     { maxWidth: '80%', marginBottom: 2 },
  msgGroupThem: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgGroupMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  senderName:   { fontSize: 11, fontWeight: '700', color: TEAL, marginBottom: 3, marginLeft: 4 },

  bubble:          { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 1 },
  bubbleThem:      { backgroundColor: BUBBLE_THEM },
  bubbleMine:      { backgroundColor: BUBBLE_ME },
  bubbleFirstThem: { borderBottomLeftRadius: 4 },
  bubbleFirstMine: { borderBottomRightRadius: 4 },
  bubbleText:      { fontSize: 15, color: TEXT, lineHeight: 21 },
  bubbleMeta:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 },
  bubbleTime:      { fontSize: 10, color: MUTED },
  readReceipt:     { marginLeft: 1 },

  // Reply quote inside bubble
  replyQuote:     { borderRadius: 8, padding: 8, marginBottom: 6, flexDirection: 'row', gap: 6 },
  replyQuoteMine: { backgroundColor: 'rgba(0,0,0,0.2)' },
  replyQuoteThem: { backgroundColor: 'rgba(255,255,255,0.05)' },
  replyBar:       { width: 3, borderRadius: 2 },
  replyText:      { flex: 1, fontSize: 12, color: MUTED, lineHeight: 17 },

  // Reply bar above composer
  replyBar2:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER },
  replyBarAccent: { width: 3, height: 36, backgroundColor: TEAL, borderRadius: 2 },
  replyBarLabel:  { fontSize: 11, fontWeight: '700', color: TEAL },
  replyBarPreview:{ fontSize: 13, color: MUTED },

  // Reactions
  reactionRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionChip:     { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: BORDER },
  reactionChipActive:{ borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.12)' },
  reactionEmoji:    { fontSize: 14 },
  reactionCount:    { fontSize: 11, fontWeight: '700', color: MUTED },

  // Typing
  typingWrap:  { alignSelf: 'flex-start', marginBottom: 4 },
  typingBubble:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 12 },
  typingDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: MUTED },

  // Timestamps
  tsRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  tsLine: { flex: 1, height: 1, backgroundColor: BORDER },
  tsText: { fontSize: 11, color: MUTED, flexShrink: 0 },

  // Composer
  composer:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12, backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER },
  composerIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  composerInput: { flex: 1, backgroundColor: BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: TEXT, fontSize: 15, borderWidth: 1, borderColor: BORDER, maxHeight: 120 },
  sendBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  // Long press menu
  menuOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  menuSheet:    { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  quickReacts:  { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  quickEmoji:   { width: 48, height: 48, borderRadius: 24, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  quickEmojiText:{ fontSize: 24 },
  menuDivider:  { height: 1, backgroundColor: BORDER, marginBottom: 8 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
  menuItemText: { fontSize: 15, color: TEXT, fontWeight: '500' },
  menuItemDanger:{ fontSize: 15, color: RED, fontWeight: '500' },

  // New conv modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:     { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 16 : 24 },
  modalHandle:    { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:     { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 20 },
  kindToggle:     { flexDirection: 'row', backgroundColor: BG, borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
  kindBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  kindGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  kindGridBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, minWidth: '47%', flex: 1 },
  kindBtnActive:  { backgroundColor: TEAL, borderColor: TEAL },
  kindText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  kindTextActive: { color: '#000', fontWeight: '700' },

  staffCheck:   { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  staffCheckOn: { backgroundColor: TEAL, borderColor: TEAL },
  modalLabel:     { fontSize: 12, fontWeight: '600', color: MUTED, letterSpacing: 1, marginBottom: 8 },
  modalInput:     { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 15, borderWidth: 1, borderColor: BORDER, marginBottom: 4 },
  modalSaveBtn:   { borderRadius: 14, overflow: 'hidden' },
  modalSaveGrad:  { paddingVertical: 14, alignItems: 'center' },
  modalSaveText:  { fontSize: 15, fontWeight: '800', color: '#000' },

  // Option list (teams / camps picker)
  optionRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  optionRowActive: { backgroundColor: 'rgba(0,196,180,0.06)', borderRadius: 10, borderBottomColor: 'transparent' },
  optionDot:       { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: BORDER },
  optionDotActive: { borderColor: TEAL, backgroundColor: TEAL },
  optionLabel:     { fontSize: 14, fontWeight: '600', color: TEXT },
  optionSub:       { fontSize: 12, color: MUTED, marginTop: 1 },
  modalEmpty:      { paddingVertical: 20, alignItems: 'center' },
  modalEmptyText:  { fontSize: 14, color: MUTED },

  modalEmpty:     { paddingVertical: 20, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: MUTED },

  optionRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  optionRowActive: { backgroundColor: 'rgba(0,196,180,0.05)', borderRadius: 10, borderBottomColor: 'transparent' },
  optionDot:       { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: BORDER },
  optionDotActive: { borderColor: TEAL, backgroundColor: TEAL },
  optionLabel:     { fontSize: 15, fontWeight: '600', color: TEXT },
  optionSub:       { fontSize: 12, color: MUTED, marginTop: 1 },
});
