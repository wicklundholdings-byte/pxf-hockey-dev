import React, { useState, useRef, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { TeamCoachTabBar } from '@/components/team-coach-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const BUBBLE_ME   = '#004A45';
const BUBBLE_THEM = '#1C2128';

// ─── Types ────────────────────────────────────────────────────────────────────
type ThreadKind = 'team' | 'player' | 'parent';

type ChatMessage = {
  id: string;
  body: string;
  sender_id: string;
  mine: boolean;
  created_at: string;
};

type Thread = {
  id: string;
  kind: ThreadKind;
  name: string;
  role?: string;
  playerNum?: string;
  preview: string;
  timeStr: string;
  unread: number;
};

type InboxFilter = 'all' | 'team' | 'players' | 'parents';

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Avatar ───────────────────────────────────────────────────────────────────
function ThreadAvatar({ thread, size = 46 }: { thread: Thread; size?: number }) {
  const initials =
    thread.kind === 'team'
      ? '⚡'
      : thread.name.split(' ').map(n => n[0]).slice(0, 2).join('');

  const bg =
    thread.kind === 'team'    ? 'rgba(0,196,180,0.2)'   :
    thread.kind === 'player'  ? 'rgba(61,255,143,0.15)' :
                                'rgba(245,158,11,0.15)';
  const border =
    thread.kind === 'team'    ? TEAL   :
    thread.kind === 'player'  ? GREEN  :
                                ORANGE;
  const color =
    thread.kind === 'team'    ? TEAL   :
    thread.kind === 'player'  ? GREEN  :
                                ORANGE;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <ThemedText style={{ fontSize: size * 0.3, fontWeight: '800', color }}>{initials}</ThemedText>
    </View>
  );
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
          id: m.id, body: m.body, sender_id: m.sender_id,
          mine: m.sender_id === userId, created_at: m.created_at,
        })));
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
      }
    })();

    // Real-time: append incoming messages
    const channel = supabase
      .channel(`tc-thread-${thread.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${thread.id}`,
      }, (payload) => {
        const m = payload.new as any;
        setMessages(prev => {
          if (prev.some(msg => msg.id === m.id)) return prev;
          const next = [...prev, { id: m.id, body: m.body, sender_id: m.sender_id, mine: m.sender_id === userId, created_at: m.created_at }];
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
    const now = new Date().toISOString();
    setMessages(prev => [...prev, { id: tempId, body, sender_id: userId, mine: true, created_at: now }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    const { data } = await supabase
      .from('messages')
      .insert({ thread_id: thread.id, sender_id: userId, body })
      .select('id, body, sender_id, created_at')
      .single();
    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId
        ? { id: data.id, body: data.body, sender_id: data.sender_id, mine: true, created_at: data.created_at }
        : m
      ));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={s.convHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <ThreadAvatar thread={thread} size={36} />
        <View style={{ flex: 1 }}>
          <ThemedText style={s.convTitle} numberOfLines={1}>{thread.name}</ThemedText>
          {thread.role && <ThemedText style={s.convSubtitle}>{thread.role}</ThemedText>}
        </View>
        {thread.kind === 'team' && (
          <TouchableOpacity style={s.convIcon}>
            <Ionicons name="people-outline" size={20} color={TEAL} />
          </TouchableOpacity>
        )}
      </View>
      <View style={s.divider} />

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.messagesArea}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {loading ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <ThemedText style={s.noMessages}>No messages yet. Say hi.</ThemedText>
        ) : messages.map((msg, i) => {
          const showSender = !msg.mine && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
          return (
            <View key={msg.id} style={[s.msgRow, msg.mine && s.msgRowMine]}>
              <View style={[s.bubble, msg.mine ? s.bubbleMine : s.bubbleThem]}>
                {showSender && thread.kind === 'team' && (
                  <ThemedText style={s.bubbleSender}>Participant</ThemedText>
                )}
                <ThemedText style={[s.bubbleText, msg.mine && { color: TEXT }]}>{msg.body}</ThemedText>
                <ThemedText style={s.bubbleTime}>{fmtClock(msg.created_at)}</ThemedText>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Composer */}
      <View style={s.composer}>
        <TouchableOpacity style={s.composerIconBtn}>
          <Ionicons name="attach-outline" size={20} color={MUTED} />
        </TouchableOpacity>
        <TextInput
          style={s.composerInput}
          placeholder={thread.kind === 'team' ? 'Message team...' : `Message ${thread.name.split(' ')[0]}...`}
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
type ComposePerson = { id: string; name: string; role: 'player' | 'parent'; playerId: string; parentUserId: string | null };

export default function TeamCoachInboxScreen() {
  const [filter,  setFilter]  = useState<InboxFilter>('all');
  const [active,  setActive]  = useState<Thread | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId,  setUserId]  = useState('');
  const [teamId,  setTeamId]  = useState<string | null>(null);
  const [teamName, setTeamName] = useState('MY TEAM');
  const [userInitials, setUserInitials] = useState('TC');

  // Compose modal state
  const [showCompose, setShowCompose]           = useState(false);
  const [composeSearch, setComposeSearch]       = useState('');
  const [composePeople, setComposePeople]       = useState<ComposePerson[]>([]);
  const [composeLoading, setComposeLoading]     = useState(false);
  const [creating, setCreating]                 = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      // Load user initials
      const { data: prof } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const name = prof?.full_name || '';
      setUserInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'TC');

      // Load team name + id for eyebrow and compose
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, age_group')
        .eq('coach_id', user.id)
        .limit(1)
        .single();
      if (teamData) {
        setTeamId(teamData.id);
        setTeamName(`${teamData.name}${teamData.age_group ? ` ${teamData.age_group}` : ''}`.toUpperCase());
      }

      // Load threads
      const { data } = await supabase
        .from('message_threads')
        .select('id, name, kind, updated_at')
        .eq('coach_id', user.id)
        .order('updated_at', { ascending: false });

      setThreads((data ?? []).map((t: any) => {
        // Map DB kind → UI kind
        const uiKind: ThreadKind =
          t.kind === 'team'   ? 'team'   :
          t.kind === 'parent' ? 'parent' : 'player';
        return {
          id: t.id,
          kind: uiKind,
          name: t.name ?? (t.kind === 'team' ? 'Team Chat' : 'Direct Message'),
          preview: 'No messages yet',
          timeStr: fmtRelTime(t.updated_at),
          unread: 0,
        };
      }));
      setLoading(false);
    });
  }, []);

  async function openCompose() {
    setShowCompose(true);
    setComposeSearch('');
    if (!teamId) return;
    setComposeLoading(true);
    const { data: players } = await supabase
      .from('players')
      .select('id, full_name, parent_name, parent_user_id')
      .eq('team_id', teamId)
      .order('full_name');
    const people: ComposePerson[] = [];
    for (const p of players ?? []) {
      people.push({ id: `player-${p.id}`, name: p.full_name, role: 'player', playerId: p.id, parentUserId: p.parent_user_id });
      if (p.parent_name) {
        people.push({ id: `parent-${p.id}`, name: p.parent_name, role: 'parent', playerId: p.id, parentUserId: p.parent_user_id });
      }
    }
    setComposePeople(people);
    setComposeLoading(false);
  }

  async function startThread(person: ComposePerson) {
    if (!userId || creating) return;
    setCreating(true);

    // Determine thread kind and name
    const kind = person.role === 'player' ? 'player' : 'parent';
    const name = person.name;

    // Check if a thread already exists for this coach + name
    const existing = threads.find(t => t.kind === kind && t.name === name);
    if (existing) {
      setShowCompose(false);
      setActive(existing);
      setCreating(false);
      return;
    }

    // Create new thread
    const { data: newThread } = await supabase
      .from('message_threads')
      .insert({ coach_id: userId, team_id: teamId, kind, name })
      .select('id, name, kind, updated_at')
      .single();

    if (newThread) {
      // Add coach as participant
      await supabase.from('thread_participants').insert({ thread_id: newThread.id, user_id: userId });
      // Add parent if linked
      if (person.parentUserId) {
        await supabase.from('thread_participants').insert({ thread_id: newThread.id, user_id: person.parentUserId });
      }

      const thread: Thread = {
        id: newThread.id,
        kind: kind as ThreadKind,
        name: newThread.name ?? name,
        preview: 'No messages yet',
        timeStr: 'now',
        unread: 0,
      };
      setThreads(prev => [thread, ...prev]);
      setShowCompose(false);
      setActive(thread);
    }
    setCreating(false);
  }

  async function createTeamThread() {
    if (!userId || !teamId || creating) return;
    const existing = threads.find(t => t.kind === 'team');
    if (existing) { setShowCompose(false); setActive(existing); return; }
    setCreating(true);
    const { data: team } = await supabase.from('teams').select('name').eq('id', teamId).maybeSingle();
    const { data: newThread } = await supabase
      .from('message_threads')
      .insert({ coach_id: userId, team_id: teamId, kind: 'team', name: team?.name ?? 'Team Chat' })
      .select('id, name, kind, updated_at')
      .single();
    if (newThread) {
      await supabase.from('thread_participants').insert({ thread_id: newThread.id, user_id: userId });
      const thread: Thread = { id: newThread.id, kind: 'team', name: newThread.name ?? 'Team Chat', preview: 'No messages yet', timeStr: 'now', unread: 0 };
      setThreads(prev => [thread, ...prev]);
      setShowCompose(false);
      setActive(thread);
    }
    setCreating(false);
  }

  const filteredCompose = composePeople.filter(p =>
    p.name.toLowerCase().includes(composeSearch.toLowerCase())
  );

  const displayed = threads.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'team') return t.kind === 'team';
    if (filter === 'players') return t.kind === 'player';
    if (filter === 'parents') return t.kind === 'parent';
    return true;
  });

  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0);

  // ── Conversation view ───────────────────────────────────────────────────────
  if (active) {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.safe} edges={['top']}>
          <ConversationView thread={active} userId={userId} onBack={() => setActive(null)} />
        </SafeAreaView>
      </View>
    );
  }

  // ── Thread list ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* PXF Header */}
        <View style={s.header}>
          <View>
            <GradientText style={s.logoPXF} colors={[TEAL, GREEN]}>PXF</GradientText>
            <GradientText style={s.logoHockey} colors={[TEAL, GREEN]}>HOCKEY</GradientText>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={s.profileAvatar}>
              <ThemedText style={s.profileAvatarText}>{userInitials}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View style={s.titleRow}>
          <View>
            <ThemedText style={s.eyebrow}>{teamName}</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ThemedText style={s.title}>Messages</ThemedText>
              {totalUnread > 0 && (
                <View style={s.unreadTotal}>
                  <ThemedText style={s.unreadTotalText}>{totalUnread}</ThemedText>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.newMsgBtn} onPress={openCompose} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {([
            { key: 'all',     label: 'All' },
            { key: 'team',    label: '⚡ Team Chat' },
            { key: 'players', label: 'Players' },
            { key: 'parents', label: 'Parents' },
          ] as { key: InboxFilter; label: string }[]).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, filter === f.key && s.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <ThemedText style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>
                {f.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Thread list */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
          ) : displayed.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="chatbubbles-outline" size={36} color={MUTED} />
              <ThemedText style={s.emptyText}>No messages yet</ThemedText>
              <ThemedText style={s.emptyNote}>Tap the compose button to start a conversation</ThemedText>
            </View>
          ) : displayed.map(thread => (
            <TouchableOpacity
              key={thread.id}
              style={s.threadRow}
              onPress={() => setActive(thread)}
              activeOpacity={0.82}
            >
              <ThreadAvatar thread={thread} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={s.threadTop}>
                  <ThemedText style={s.threadName} numberOfLines={1}>{thread.name}</ThemedText>
                  <ThemedText style={s.threadTime}>{thread.timeStr}</ThemedText>
                </View>
                {thread.role && <ThemedText style={s.threadRole}>{thread.role}</ThemedText>}
                <ThemedText style={s.threadPreview} numberOfLines={1}>{thread.preview}</ThemedText>
              </View>
              {thread.unread > 0 && (
                <View style={s.unreadBadge}>
                  <ThemedText style={s.unreadBadgeText}>{thread.unread}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

      </SafeAreaView>

      {/* ── Compose Modal ── */}
      <Modal visible={showCompose} animationType="slide" transparent onRequestClose={() => setShowCompose(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCompose(false)}>
          <View style={s.composeSheet}>
            {/* drag handle */}
            <View style={s.composeHandle} />
            <View style={s.composeHeaderRow}>
              <ThemedText style={s.composeTitle}>New Message</ThemedText>
              <TouchableOpacity onPress={() => setShowCompose(false)}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>

            {/* Team Chat shortcut */}
            <TouchableOpacity style={s.teamChatRow} onPress={createTeamThread} activeOpacity={0.85}>
              <View style={[s.composeAvatar, { backgroundColor: 'rgba(0,196,180,0.2)', borderColor: TEAL }]}>
                <ThemedText style={[s.composeAvatarText, { color: TEAL }]}>⚡</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.composePersonName}>Team Chat</ThemedText>
                <ThemedText style={s.composePersonSub}>Message everyone on your roster</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </TouchableOpacity>

            <View style={s.composeDivider} />
            <ThemedText style={s.composeSubhead}>DIRECT MESSAGES</ThemedText>

            {/* Search */}
            <View style={s.composeSearchRow}>
              <Ionicons name="search" size={14} color={MUTED} style={{ marginRight: 6 }} />
              <TextInput
                style={s.composeSearchInput}
                placeholder="Search players & parents..."
                placeholderTextColor={MUTED}
                value={composeSearch}
                onChangeText={setComposeSearch}
                autoCorrect={false}
              />
            </View>

            {/* Person list */}
            {composeLoading ? (
              <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
            ) : filteredCompose.length === 0 ? (
              <View style={s.composeEmpty}>
                <Ionicons name="people-outline" size={28} color={MUTED} />
                <ThemedText style={s.composeEmptyText}>
                  {composePeople.length === 0 ? 'No players on your roster yet' : 'No results'}
                </ThemedText>
              </View>
            ) : (
              <ScrollView style={s.composeList} showsVerticalScrollIndicator={false}>
                {filteredCompose.map(person => (
                  <TouchableOpacity
                    key={person.id}
                    style={s.composePersonRow}
                    onPress={() => startThread(person)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      s.composeAvatar,
                      person.role === 'parent'
                        ? { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: ORANGE }
                        : { backgroundColor: 'rgba(61,255,143,0.12)', borderColor: GREEN }
                    ]}>
                      <ThemedText style={[
                        s.composeAvatarText,
                        { color: person.role === 'parent' ? ORANGE : GREEN }
                      ]}>
                        {person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.composePersonName}>{person.name}</ThemedText>
                      <ThemedText style={s.composePersonSub}>
                        {person.role === 'parent' ? 'Parent' : 'Player'}
                        {!person.parentUserId && person.role === 'parent' ? ' · Not yet registered' : ''}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <TeamCoachTabBar active="inbox" unreadInbox={totalUnread > 0} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoPXF: { fontSize: 28, fontWeight: '800', letterSpacing: 3, lineHeight: 34 },
  logoHockey: { fontSize: 11, fontWeight: '700', letterSpacing: 5, lineHeight: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 4 },
  profileAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },

  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 34, color: TEXT },
  unreadTotal: { backgroundColor: TEAL, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 2 },
  unreadTotalText: { fontSize: 12, fontWeight: '800', color: '#000' },
  newMsgBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  filterRow: { paddingHorizontal: 16, gap: 8, marginBottom: 14, paddingRight: 24 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  filterChipActive: { borderColor: TEAL, backgroundColor: '#0D2A24' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.3 },
  filterChipTextActive: { color: TEAL },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  threadRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  threadName: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT, marginRight: 8 },
  threadTime: { fontSize: 12, color: MUTED, flexShrink: 0 },
  threadRole: { fontSize: 11, fontWeight: '600', color: MUTED, marginBottom: 2 },
  threadPreview: { fontSize: 13, color: MUTED },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexShrink: 0 },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', color: '#000' },

  emptyCard: { marginTop: 60, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: MUTED, textAlign: 'center' },
  emptyNote: { fontSize: 13, color: MUTED, opacity: 0.6, textAlign: 'center', paddingHorizontal: 32 },

  // Compose modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  composeSheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 40, maxHeight: '85%' },
  composeHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  composeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  composeTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  teamChatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  composeDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16, marginVertical: 8 },
  composeSubhead: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 },
  composeSearchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  composeSearchInput: { flex: 1, color: TEXT, fontSize: 14 },
  composeList: { maxHeight: 320, paddingHorizontal: 16 },
  composePersonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  composeAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  composeAvatarText: { fontSize: 13, fontWeight: '800' },
  composePersonName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  composePersonSub: { fontSize: 12, color: MUTED },
  composeEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  composeEmptyText: { fontSize: 14, color: MUTED },

  // Conversation view
  convHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  convTitle: { fontSize: 15, fontWeight: '700', color: TEXT, lineHeight: 20 },
  convSubtitle: { fontSize: 11, color: MUTED, marginTop: 1 },
  convIcon: { padding: 4 },
  divider: { height: 1, backgroundColor: BORDER },

  messagesArea: { paddingHorizontal: 16, paddingVertical: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  noMessages:   { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 60 },

  msgRow:    { flexDirection: 'row', justifyContent: 'flex-start' },
  msgRowMine:{ justifyContent: 'flex-end' },
  bubble:    { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem:{ backgroundColor: BUBBLE_THEM, borderBottomLeftRadius: 4 },
  bubbleMine:{ backgroundColor: BUBBLE_ME, borderBottomRightRadius: 4 },
  bubbleSender: { fontSize: 11, fontWeight: '700', color: TEAL, marginBottom: 3 },
  bubbleText:{ fontSize: 14, color: TEXT, lineHeight: 20 },
  bubbleTime:{ fontSize: 10, color: MUTED, marginTop: 4, alignSelf: 'flex-end' },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER,
  },
  composerIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  composerInput: { flex: 1, backgroundColor: BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: TEXT, fontSize: 14, borderWidth: 1, borderColor: BORDER, maxHeight: 120 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: BORDER },
});
