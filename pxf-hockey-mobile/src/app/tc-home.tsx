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
const ORANGE = '#F59E0B';
const PURPLE = '#7C3AED';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function getTodayShort() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}
function teamInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

type Team = { id: string; name: string; age_group: string | null };
type SessionItem = { id: string; title: string; date: string; time: string | null; total_duration_minutes: number | null };
type GameItem    = { id: string; opponent: string; game_date: string; game_time: string | null; home_away: string; team_id: string };
type ScheduleItem =
  | { kind: 'session'; sortKey: string; data: SessionItem }
  | { kind: 'game';    sortKey: string; data: GameItem };

export default function TeamCoachHomeScreen() {
  const router = useRouter();
  const [loading,      setLoading]      = useState(true);
  const [userName,     setUserName]     = useState('Coach');
  const [userInitials, setUserInitials] = useState('TC');
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Profile
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const name = profile?.full_name || 'Coach';
      setUserName(name.split(' ')[0]);
      setUserInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'TC');

      // All teams
      const { data: teamsData } = await supabase
        .from('teams').select('id, name, age_group')
        .eq('coach_id', user.id).order('created_at');
      const teamList = (teamsData ?? []) as Team[];
      setTeams(teamList);

      // Next 7 days window
      const today = new Date().toISOString().split('T')[0];
      const in7   = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      // Sessions
      const { data: sessData } = await supabase
        .from('sessions').select('id, title, date, time, total_duration_minutes')
        .eq('coach_id', user.id)
        .gte('date', today).lte('date', in7)
        .order('date').order('time', { nullsFirst: false }).limit(10);

      // Games (all teams)
      let gameData: GameItem[] = [];
      const teamIds = teamList.map(t => t.id);
      if (teamIds.length > 0) {
        const { data: gData } = await supabase
          .from('games').select('id, opponent, game_date, game_time, home_away, team_id')
          .in('team_id', teamIds)
          .gte('game_date', today).lte('game_date', in7)
          .order('game_date').order('game_time', { nullsFirst: false }).limit(10);
        gameData = (gData ?? []) as GameItem[];
      }

      // Merge + sort
      const merged: ScheduleItem[] = [
        ...(sessData ?? []).map(s => ({
          kind: 'session' as const,
          sortKey: s.date + (s.time ?? '99:99'),
          data: s as SessionItem,
        })),
        ...gameData.map(g => ({
          kind: 'game' as const,
          sortKey: g.game_date + (g.game_time ?? '99:99'),
          data: g,
        })),
      ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

      setScheduleItems(merged);
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

  const todayStr   = new Date().toISOString().split('T')[0];
  const todayItems = scheduleItems.filter(i =>
    i.kind === 'session' ? i.data.date === todayStr : i.data.game_date === todayStr
  );
  const nextUpItems = scheduleItems.filter(i =>
    i.kind === 'session' ? i.data.date !== todayStr : i.data.game_date !== todayStr
  );

  function renderTodayItem(item: ScheduleItem) {
    if (item.kind === 'session') {
      const sess = item.data;
      return (
        <TouchableOpacity
          key={sess.id}
          style={s.todayCard}
          onPress={() => router.push(`/session-runner/${sess.id}` as any)}
          activeOpacity={0.85}
        >
          <View style={[s.todayAccent, { backgroundColor: TEAL }]} />
          <View style={s.todayBody}>
            <View style={s.todayTop}>
              <View>
                <ThemedText style={s.todayTime}>{sess.time ? sess.time.slice(0, 5) : '—'}</ThemedText>
                {sess.total_duration_minutes
                  ? <ThemedText style={s.todayTimeSub}>{sess.total_duration_minutes}{'\n'}min</ThemedText>
                  : null}
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <ThemedText style={s.todayTitle}>{sess.title}</ThemedText>
                <ThemedText style={s.todayEmptySub}>Tap to start session</ThemedText>
              </View>
              <View style={s.todayBadge}>
                <ThemedText style={s.todayBadgeText}>PRACTICE</ThemedText>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    } else {
      const game = item.data;
      const teamForGame = teams.find(t => t.id === game.team_id);
      return (
        <TouchableOpacity
          key={game.id}
          style={s.todayCard}
          onPress={() => router.push(`/game/${game.id}` as any)}
          activeOpacity={0.85}
        >
          <View style={[s.todayAccent, { backgroundColor: ORANGE }]} />
          <View style={s.todayBody}>
            <View style={s.todayTop}>
              <View>
                <ThemedText style={s.todayTime}>{game.game_time ? game.game_time.slice(0, 5) : '—'}</ThemedText>
                <ThemedText style={s.todayTimeSub}>{game.home_away === 'home' ? 'Home' : 'Away'}</ThemedText>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <ThemedText style={s.todayTitle}>vs {game.opponent}</ThemedText>
                {teamForGame && <ThemedText style={s.todayEmptySub}>{teamForGame.name}</ThemedText>}
              </View>
              <View style={[s.todayBadge, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                <ThemedText style={[s.todayBadgeText, { color: ORANGE }]}>GAME</ThemedText>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={s.headerRow}>
              <View>
                <GradientText style={s.logoPXF} colors={[TEAL, GREEN]}>PXF</GradientText>
                <GradientText style={s.logoHockey} colors={[TEAL, GREEN]}>HOCKEY</GradientText>
              </View>
              <View style={s.headerActions}>
                <TouchableOpacity style={s.iconBtn}>
                  <Ionicons name="notifications-outline" size={22} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.avatar}
                  onPress={() => router.push('/settings' as any)}
                  activeOpacity={0.8}
                >
                  <ThemedText style={s.avatarText}>{userInitials}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Greeting ── */}
          <View style={s.greetingSection}>
            <ThemedText style={s.greeting}>{getGreeting()}, {userName}</ThemedText>
            <ThemedText style={s.greetingSub}>{getTodayLabel()}</ThemedText>
          </View>

          {/* ── TODAY ── */}
          <ThemedText style={s.sectionLabel}>TODAY · {getTodayShort()}</ThemedText>
          {todayItems.length === 0 ? (
            <View style={s.todayCard}>
              <View style={s.todayAccent} />
              <View style={s.todayBody}>
                <View style={s.todayTop}>
                  <View>
                    <ThemedText style={s.todayTime}>—</ThemedText>
                    <ThemedText style={s.todayTimeSub}>Nothing{'\n'}scheduled</ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <ThemedText style={s.todayEmpty}>No sessions today</ThemedText>
                    <ThemedText style={s.todayEmptySub}>Add one in the Schedule tab</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            todayItems.map(item => renderTodayItem(item))
          )}

          {/* ── MY TEAMS ── */}
          <View style={s.sectionHeader}>
            <ThemedText style={s.sectionLabel}>MY TEAMS</ThemedText>
            <TouchableOpacity onPress={() => router.push('/tc-teams' as any)}>
              <ThemedText style={s.viewAll}>View all ›</ThemedText>
            </TouchableOpacity>
          </View>
          {teams.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={24} color={MUTED} />
              <ThemedText style={s.emptyText}>No teams yet</ThemedText>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/tc-teams' as any)}>
                <ThemedText style={s.emptyBtnText}>+ Add Team</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.listCard}>
              {teams.map((team, i) => (
                <TouchableOpacity
                  key={team.id}
                  style={[s.listRow, i < teams.length - 1 && s.listRowBorder]}
                  onPress={() => router.push(`/team/${team.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={s.teamAvatar}>
                    <ThemedText style={s.teamAvatarText}>{teamInitials(team.name)}</ThemedText>
                  </View>
                  <View style={s.listInfo}>
                    <ThemedText style={s.listTitle}>{team.name}</ThemedText>
                    {team.age_group
                      ? <ThemedText style={s.listSub}>{team.age_group}</ThemedText>
                      : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── NEXT UP ── */}
          <View style={s.sectionHeader}>
            <ThemedText style={s.sectionLabel}>NEXT UP · 7 DAYS</ThemedText>
            <TouchableOpacity onPress={() => router.push('/tc-sessions' as any)}>
              <ThemedText style={s.viewAll}>View all ›</ThemedText>
            </TouchableOpacity>
          </View>
          {nextUpItems.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="calendar-outline" size={24} color={MUTED} />
              <ThemedText style={s.emptyText}>Nothing coming up</ThemedText>
            </View>
          ) : (
            <View style={s.listCard}>
              {nextUpItems.map((item, i) => {
                const isLast = i === nextUpItems.length - 1;
                if (item.kind === 'session') {
                  const sess = item.data;
                  const dateStr = new Date(sess.date + 'T00:00:00')
                    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const meta = [dateStr, sess.time ? sess.time.slice(0, 5) : null, sess.total_duration_minutes ? `${sess.total_duration_minutes}min` : null]
                    .filter(Boolean).join(' · ');
                  return (
                    <TouchableOpacity
                      key={sess.id}
                      style={[s.listRow, !isLast && s.listRowBorder]}
                      onPress={() => router.push(`/session-runner/${sess.id}` as any)}
                      activeOpacity={0.8}
                    >
                      <View style={s.sessionDot} />
                      <View style={s.listInfo}>
                        <ThemedText style={s.listTitle}>{sess.title}</ThemedText>
                        <ThemedText style={s.listSub}>{meta}</ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={MUTED} />
                    </TouchableOpacity>
                  );
                } else {
                  const game = item.data;
                  const dateStr = new Date(game.game_date + 'T00:00:00')
                    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const meta = [dateStr, game.game_time ? game.game_time.slice(0, 5) : null, game.home_away === 'home' ? 'Home' : 'Away']
                    .filter(Boolean).join(' · ');
                  return (
                    <TouchableOpacity
                      key={game.id}
                      style={[s.listRow, !isLast && s.listRowBorder]}
                      onPress={() => router.push(`/game/${game.id}` as any)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.sessionDot, { backgroundColor: ORANGE }]} />
                      <View style={s.listInfo}>
                        <ThemedText style={s.listTitle}>vs {game.opponent}</ThemedText>
                        <ThemedText style={s.listSub}>{meta}</ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={MUTED} />
                    </TouchableOpacity>
                  );
                }
              })}
            </View>
          )}

          {/* ── Quick Actions ── */}
          <View style={s.actionsGrid}>
            <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/tc-sessions' as any)}>
              <Ionicons name="add-circle-outline" size={20} color={TEAL} />
              <ThemedText style={s.actionBtnText}>New Session</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/tc-teams' as any)}>
              <Ionicons name="people-outline" size={20} color={TEAL} />
              <ThemedText style={s.actionBtnText}>Roster</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/tc-inbox' as any)}>
              <Ionicons name="chatbubble-outline" size={20} color={TEAL} />
              <ThemedText style={s.actionBtnText}>Message Team</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/tc-drills' as any)}>
              <Ionicons name="barbell-outline" size={20} color={TEAL} />
              <ThemedText style={s.actionBtnText}>Playbook</ThemedText>
            </TouchableOpacity>
          </View>

          {/* ── Media ── */}
          <ThemedText style={s.sectionLabel}>MEDIA</ThemedText>
          <View style={s.mediaRow}>
            <TouchableOpacity style={s.mediaCard} activeOpacity={0.8} onPress={() => router.push('/film' as any)}>
              <View style={[s.mediaIcon, { backgroundColor: TEAL }]}>
                <Ionicons name="videocam" size={20} color="#000" />
              </View>
              <ThemedText style={s.mediaTitle}>Record</ThemedText>
              <ThemedText style={s.mediaSub}>Shoot & tag</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaCard} activeOpacity={0.8} onPress={() => router.push('/film-library' as any)}>
              <View style={[s.mediaIcon, { backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' }]}>
                <Ionicons name="film-outline" size={20} color={TEAL} />
              </View>
              <ThemedText style={s.mediaTitle}>Library</ThemedText>
              <ThemedText style={s.mediaSub}>Review clips</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.mediaCard} activeOpacity={0.8}>
              <View style={[s.mediaIcon, { backgroundColor: 'rgba(124,58,237,0.12)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' }]}>
                <Ionicons name="share-social-outline" size={20} color={PURPLE} />
              </View>
              <ThemedText style={s.mediaTitle}>Export</ThemedText>
              <ThemedText style={s.mediaSub}>Save & share</ThemedText>
            </TouchableOpacity>
          </View>

          {/* ── Dev Switcher ── */}
          <TouchableOpacity
            style={s.devSwitcher}
            onPress={() => router.push('/' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal-outline" size={14} color={MUTED} />
            <ThemedText style={s.devSwitcherText}>Switch to Elite Coach view</ThemedText>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
      <TeamCoachTabBar active="home" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 32 },

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  logoPXF: { fontSize: 28, fontWeight: '800', letterSpacing: 3, lineHeight: 34 },
  logoHockey: { fontSize: 11, fontWeight: '700', letterSpacing: 5, lineHeight: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#000' },

  greetingSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  greeting: { fontSize: 26, fontWeight: '800', lineHeight: 32, color: TEXT },
  greetingSub: { fontSize: 13, color: MUTED, marginTop: 3 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },
  viewAll: { fontSize: 13, color: TEAL, fontWeight: '600' },

  todayCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD, borderRadius: 16, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  todayAccent: { width: 4, backgroundColor: PURPLE },
  todayBody: { flex: 1, padding: 16 },
  todayTop: { flexDirection: 'row', alignItems: 'flex-start' },
  todayTime: { fontSize: 20, fontWeight: '800', color: TEXT },
  todayTimeSub: { fontSize: 11, color: MUTED, lineHeight: 16 },
  todayTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  todayEmpty: { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 4 },
  todayEmptySub: { fontSize: 13, color: MUTED },
  todayBadge: { backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', alignSelf: 'flex-start' },
  todayBadgeText: { fontSize: 10, fontWeight: '800', color: TEAL },

  emptyCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: MUTED },
  emptyBtn: { marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: TEAL, paddingHorizontal: 16, paddingVertical: 8 },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: TEAL },

  listCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  listSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  teamAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,196,180,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  teamAvatarText: { fontSize: 14, fontWeight: '800', color: TEAL },

  sessionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL, marginRight: 14 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginTop: 8 },
  actionBtn: { width: '47%', backgroundColor: CARD, borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: TEAL },

  mediaRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  mediaCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, alignItems: 'center', gap: 6 },
  mediaIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  mediaTitle: { fontSize: 13, fontWeight: '800', color: TEXT },
  mediaSub: { fontSize: 11, color: MUTED, textAlign: 'center' },

  devSwitcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginBottom: 8 },
  devSwitcherText: { fontSize: 12, color: MUTED, fontWeight: '500' },
});
