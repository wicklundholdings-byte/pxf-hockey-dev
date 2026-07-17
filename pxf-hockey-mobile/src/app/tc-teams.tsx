import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { TeamCoachTabBar } from '@/components/team-coach-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const RED    = '#EF4444';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type TabKey = 'roster' | 'schedule';

type Player  = { id: string; full_name: string; jersey_number: string | null; position: string | null };
type Session = { id: string; title: string; date: string; time: string | null };
type GameItem = { id: string; opponent: string; game_date: string; game_time: string | null; home_away: string };
type ScheduleEntry =
  | { kind: 'session'; sortKey: string; data: Session }
  | { kind: 'game';    sortKey: string; data: GameItem };

function teamInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamCoachTeamsScreen() {
  const router = useRouter();
  const [tab, setTab]                   = useState<TabKey>('roster');
  const [loading, setLoading]           = useState(true);
  const [teamId, setTeamId]             = useState<string | null>(null);
  const [teamName, setTeamName]         = useState('My Team');
  const [teamAgeGroup, setTeamAgeGroup] = useState('');
  const [teamColor, setTeamColor]       = useState(TEAL);
  const [userInitials, setUserInitials] = useState('TC');
  const [players, setPlayers]           = useState<Player[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Initials from profile
      const { data: prof } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const name = prof?.full_name || user.email?.split('@')[0] || '';
      setUserInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'TC');

      // First team
      const { data: team } = await supabase
        .from('teams').select('id, name, age_group, color')
        .eq('coach_id', user.id).order('created_at').limit(1).maybeSingle();

      if (team) {
        setTeamId(team.id);
        setTeamName(team.name);
        setTeamAgeGroup(team.age_group ?? '');
        setTeamColor(team.color ?? TEAL);

        // Players
        const { data: pData } = await supabase
          .from('players')
          .select('id, full_name, jersey_number, position')
          .eq('team_id', team.id)
          .order('position').order('full_name');
        setPlayers(pData ?? []);

        const today = new Date().toISOString().split('T')[0];

        // Sessions (upcoming)
        const { data: sData } = await supabase
          .from('sessions')
          .select('id, title, date, time')
          .eq('coach_id', user.id)
          .gte('date', today)
          .order('date').order('time', { nullsFirst: false })
          .limit(30);

        // Games for this team (upcoming)
        const { data: gData } = await supabase
          .from('games')
          .select('id, opponent, game_date, game_time, home_away')
          .eq('team_id', team.id)
          .gte('game_date', today)
          .order('game_date').order('game_time', { nullsFirst: false })
          .limit(30);

        const entries: ScheduleEntry[] = [
          ...(sData ?? []).map(s => ({
            kind: 'session' as const,
            sortKey: s.date + (s.time ?? '99:99'),
            data: s as Session,
          })),
          ...(gData ?? []).map(g => ({
            kind: 'game' as const,
            sortKey: g.game_date + (g.game_time ?? '99:99'),
            data: g as GameItem,
          })),
        ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        setScheduleEntries(entries);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header */}
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

        {/* Team Banner */}
        <View style={s.teamBanner}>
          <View style={[s.teamAvatarLg, { backgroundColor: teamColor }]}>
            <ThemedText style={s.teamAvatarLgText}>{teamName ? teamInitials(teamName) : 'TM'}</ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.teamName}>{teamName}</ThemedText>
            <ThemedText style={s.teamMeta}>
              {[teamAgeGroup, `${players.length} player${players.length !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
            </ThemedText>
          </View>
          <TouchableOpacity style={s.messageTeamBtn} onPress={() => router.push('/tc-inbox' as any)}>
            <Ionicons name="chatbubble-outline" size={16} color={TEAL} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {(['roster', 'schedule'] as TabKey[]).map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
              <ThemedText style={[s.tabLabel, tab === t && s.tabLabelActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* ── Roster ── */}
          {tab === 'roster' && (
            <>
              {players.length === 0 ? (
                <View style={s.emptyCard}>
                  <Ionicons name="people-outline" size={24} color={MUTED} />
                  <ThemedText style={s.emptyText}>No players on roster yet</ThemedText>
                </View>
              ) : (
                players.map(p => (
                  <View key={p.id} style={s.playerCard}>
                    <View style={s.playerNumBadge}>
                      <ThemedText style={s.playerNumText}>{p.jersey_number ? `#${p.jersey_number}` : '—'}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.playerName}>{p.full_name}</ThemedText>
                      <ThemedText style={s.playerPos}>{p.position ?? 'No position'}</ThemedText>
                    </View>
                    <View style={s.activeBadge}>
                      <ThemedText style={s.activeText}>ACTIVE</ThemedText>
                    </View>
                    <Ionicons name="chatbubble-outline" size={16} color={MUTED} style={{ marginLeft: 10 }} />
                  </View>
                ))
              )}
              <TouchableOpacity style={s.addBtn}
                onPress={() => teamId ? router.push(`/team/${teamId}` as any) : null}>
                <Ionicons name="people-outline" size={16} color={TEAL} />
                <ThemedText style={s.addBtnText}>Manage Full Roster</ThemedText>
              </TouchableOpacity>
            </>
          )}

          {/* ── Schedule ── */}
          {tab === 'schedule' && (
            <>
              {scheduleEntries.length === 0 ? (
                <View style={s.emptyCard}>
                  <Ionicons name="calendar-outline" size={24} color={MUTED} />
                  <ThemedText style={s.emptyText}>No upcoming sessions or games</ThemedText>
                </View>
              ) : (
                scheduleEntries.map(entry => {
                  if (entry.kind === 'session') {
                    const item = entry.data;
                    const d = new Date(item.date + 'T00:00:00');
                    const day  = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <TouchableOpacity key={`s-${item.id}`} style={s.schedCard}
                        onPress={() => router.push(`/session-runner/${item.id}` as any)} activeOpacity={0.8}>
                        <View style={s.schedDate}>
                          <ThemedText style={s.schedDay}>{day}</ThemedText>
                          <ThemedText style={s.schedDateNum}>{date}</ThemedText>
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <ThemedText style={s.schedTitle}>{item.title}</ThemedText>
                          {item.time ? <ThemedText style={s.schedMeta}>{item.time.slice(0, 5)}</ThemedText> : null}
                        </View>
                        <View style={[s.typeBadge, { backgroundColor: 'rgba(0,196,180,0.1)', borderColor: 'rgba(0,196,180,0.3)' }]}>
                          <ThemedText style={[s.typeText, { color: TEAL }]}>PRACTICE</ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  } else {
                    const item = entry.data;
                    const d = new Date(item.game_date + 'T00:00:00');
                    const day  = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <TouchableOpacity key={`g-${item.id}`} style={s.schedCard}
                        onPress={() => router.push(`/game/${item.id}` as any)} activeOpacity={0.8}>
                        <View style={s.schedDate}>
                          <ThemedText style={s.schedDay}>{day}</ThemedText>
                          <ThemedText style={s.schedDateNum}>{date}</ThemedText>
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <ThemedText style={s.schedTitle}>vs {item.opponent}</ThemedText>
                          <ThemedText style={s.schedMeta}>{item.game_time ? item.game_time.slice(0, 5) + ' · ' : ''}{item.home_away === 'home' ? 'Home' : 'Away'}</ThemedText>
                        </View>
                        <View style={[s.typeBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                          <ThemedText style={[s.typeText, { color: ORANGE }]}>GAME</ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  }
                })
              )}
              <TouchableOpacity style={s.addBtn} onPress={() => router.push('/tc-sessions' as any)}>
                <Ionicons name="add" size={16} color={TEAL} />
                <ThemedText style={s.addBtnText}>Add Session</ThemedText>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </SafeAreaView>
      <TeamCoachTabBar active="teams" />
    </View>
  );
}

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

  teamBanner: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 16 },
  teamAvatarLg: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  teamAvatarLgText: { fontSize: 18, fontWeight: '800', color: '#000' },
  teamName: { fontSize: 20, fontWeight: '800', lineHeight: 26, color: TEXT, marginBottom: 2 },
  teamMeta: { fontSize: 13, color: MUTED, marginBottom: 6 },
  messageTeamBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,196,180,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', flexShrink: 0 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  tabBtnActive: { borderColor: TEAL, backgroundColor: '#0D2A24' },
  tabLabel: { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.3 },
  tabLabelActive: { color: TEAL },

  content: { paddingHorizontal: 16, paddingBottom: 24 },

  emptyCard: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 24, alignItems: 'center', gap: 8, marginBottom: 16,
  },
  emptyText: { fontSize: 14, color: MUTED },

  playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  playerNumBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,196,180,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', marginRight: 14, flexShrink: 0 },
  playerNumText: { fontSize: 13, fontWeight: '800', color: TEAL },
  playerName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  playerPos: { fontSize: 12, color: MUTED },
  activeBadge: { backgroundColor: 'rgba(61,255,143,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(61,255,143,0.3)' },
  activeText: { fontSize: 10, fontWeight: '800', color: GREEN },
  injuredBadge: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  injuredText: { fontSize: 10, fontWeight: '800', color: RED },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: TEAL, paddingVertical: 14, marginTop: 8 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: TEAL },

  schedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  schedDate: { alignItems: 'center', width: 42, flexShrink: 0 },
  schedDay: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  schedDateNum: { fontSize: 11, fontWeight: '700', color: TEXT, textAlign: 'center' },
  schedTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  schedMeta: { fontSize: 12, color: MUTED },
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, flexShrink: 0 },
  typeText: { fontSize: 10, fontWeight: '800' },
});
