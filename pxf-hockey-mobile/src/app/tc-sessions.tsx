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
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type Filter = 'upcoming' | 'past';

type Session = {
  id: string; title: string; date: string;
  time: string | null; total_duration_minutes: number | null; is_complete: boolean;
};
type GameItem = {
  id: string; opponent: string; game_date: string; game_time: string | null;
  home_away: string; home_score: number | null; away_score: number | null;
};
type ScheduleEntry =
  | { kind: 'session'; sortKey: string; data: Session }
  | { kind: 'game';    sortKey: string; data: GameItem };

export default function TeamCoachSessionsScreen() {
  const router  = useRouter();
  const [filter, setFilter]     = useState<Filter>('upcoming');
  const [loading, setLoading]   = useState(true);
  const [teamName, setTeamName] = useState('');
  const [entries, setEntries]   = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // All teams for this coach
      const { data: teamsData } = await supabase
        .from('teams').select('id, name')
        .eq('coach_id', user.id).order('created_at');
      const teamList = teamsData ?? [];
      setTeamName(teamList[0]?.name ?? '');

      // All sessions
      const { data: sessData } = await supabase
        .from('sessions')
        .select('id, title, date, time, total_duration_minutes, is_complete')
        .eq('coach_id', user.id)
        .order('date', { ascending: false })
        .order('time', { nullsFirst: false });

      // All games for coach's teams
      let gameData: GameItem[] = [];
      const teamIds = teamList.map((t: any) => t.id);
      if (teamIds.length > 0) {
        const { data: gData } = await supabase
          .from('games')
          .select('id, opponent, game_date, game_time, home_away, home_score, away_score')
          .in('team_id', teamIds)
          .order('game_date', { ascending: false })
          .order('game_time', { nullsFirst: false });
        gameData = (gData ?? []) as GameItem[];
      }

      // Merge all into one list
      const merged: ScheduleEntry[] = [
        ...(sessData ?? []).map(s => ({
          kind: 'session' as const,
          sortKey: s.date + (s.time ?? '99:99'),
          data: s as Session,
        })),
        ...gameData.map(g => ({
          kind: 'game' as const,
          sortKey: g.game_date + (g.game_time ?? '99:99'),
          data: g,
        })),
      ];
      setEntries(merged);
      setLoading(false);
    }
    load();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // Filter + sort based on selected tab
  const displayed = entries
    .filter(e => {
      const dateStr = e.kind === 'session' ? e.data.date : e.data.game_date;
      return filter === 'upcoming' ? dateStr >= today : dateStr < today;
    })
    .sort((a, b) => {
      const asc = filter === 'upcoming';
      return asc ? a.sortKey.localeCompare(b.sortKey) : b.sortKey.localeCompare(a.sortKey);
    });

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
          </View>
        </View>

        {/* Title + new button */}
        <View style={s.titleRow}>
          <View>
            {teamName ? <ThemedText style={s.eyebrow}>{teamName.toUpperCase()}</ThemedText> : null}
            <ThemedText style={s.title}>Schedule</ThemedText>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={() => router.push('/sessions' as any)}>
            <Ionicons name="add" size={16} color="#000" />
            <ThemedText style={s.newBtnText}>New Session</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {(['upcoming', 'past'] as Filter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && s.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <ThemedText style={[s.filterLabel, filter === f && s.filterLabelActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {displayed.map(entry => {
            if (entry.kind === 'session') {
              const session = entry.data;
              const d = new Date(session.date + 'T00:00:00');
              const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const dur = session.total_duration_minutes;
              return (
                <TouchableOpacity key={`s-${session.id}`} style={s.card}
                  onPress={() => router.push(`/session-runner/${session.id}` as any)}
                  activeOpacity={0.85}>
                  <View style={[s.cardAccent, { backgroundColor: TEAL }]} />
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <ThemedText style={s.cardTitle}>{session.title}</ThemedText>
                      {session.is_complete ? (
                        <View style={s.doneBadge}>
                          <ThemedText style={s.doneText}>DONE</ThemedText>
                        </View>
                      ) : (
                        <View style={[s.typeBadge, { backgroundColor: 'rgba(0,196,180,0.1)', borderColor: 'rgba(0,196,180,0.3)' }]}>
                          <ThemedText style={[s.typeBadgeText, { color: TEAL }]}>PRACTICE</ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={s.cardMeta}>
                      <Ionicons name="calendar-outline" size={12} color={MUTED} />
                      <ThemedText style={s.cardMetaText}>{dateStr}{session.time ? ` · ${session.time.slice(0, 5)}` : ''}</ThemedText>
                      {dur ? (
                        <>
                          <ThemedText style={s.dot}>·</ThemedText>
                          <ThemedText style={s.cardMetaText}>{dur} min</ThemedText>
                        </>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            } else {
              const game = entry.data;
              const d = new Date(game.game_date + 'T00:00:00');
              const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const hasScore = game.home_score != null || game.away_score != null;
              const scoreStr = hasScore ? `${game.home_score ?? 0}–${game.away_score ?? 0}` : '';
              return (
                <TouchableOpacity key={`g-${game.id}`} style={s.card}
                  onPress={() => router.push(`/game/${game.id}` as any)}
                  activeOpacity={0.85}>
                  <View style={[s.cardAccent, { backgroundColor: ORANGE }]} />
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <ThemedText style={s.cardTitle}>vs {game.opponent}</ThemedText>
                      <View style={[s.typeBadge, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                        <ThemedText style={[s.typeBadgeText, { color: ORANGE }]}>GAME</ThemedText>
                      </View>
                    </View>
                    <View style={s.cardMeta}>
                      <Ionicons name="calendar-outline" size={12} color={MUTED} />
                      <ThemedText style={s.cardMetaText}>
                        {dateStr}{game.game_time ? ` · ${game.game_time.slice(0, 5)}` : ''} · {game.home_away === 'home' ? 'Home' : 'Away'}
                        {scoreStr ? ` · ${scoreStr}` : ''}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
          })}

          {displayed.length === 0 && (
            <View style={s.emptyCard}>
              <Ionicons name="calendar-outline" size={28} color={MUTED} />
              <ThemedText style={s.emptyText}>No {filter} sessions or games</ThemedText>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/sessions' as any)}>
                <ThemedText style={s.emptyBtnText}>+ Create Session</ThemedText>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
      <TeamCoachTabBar active="schedule" />
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

  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 34, color: TEXT },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  newBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  filterBtnActive: { borderColor: TEAL, backgroundColor: '#0D2A24' },
  filterLabel: { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.3 },
  filterLabelActive: { color: TEAL },

  content: { paddingHorizontal: 16, paddingBottom: 24 },

  card: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 10, overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT, marginRight: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  cardMetaText: { fontSize: 12, color: MUTED },
  dot: { fontSize: 12, color: BORDER },

  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  doneBadge: { backgroundColor: 'rgba(61,255,143,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(61,255,143,0.3)' },
  doneText: { fontSize: 10, fontWeight: '800', color: '#3DFF8F' },

  emptyCard: { backgroundColor: CARD, borderRadius: 16, padding: 32, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: MUTED },
  emptyBtn: { borderRadius: 10, borderWidth: 1, borderColor: TEAL, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: TEAL },
});
