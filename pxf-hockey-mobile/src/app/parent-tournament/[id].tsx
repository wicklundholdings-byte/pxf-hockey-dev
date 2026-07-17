import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG       = '#0D1117';
const CARD     = '#161B22';
const TEAL     = '#00C4B4';
const GREEN    = '#3DFF8F';
const ORANGE   = '#F59E0B';
const RED      = '#EF4444';
const PURPLE   = '#8B5CF6';
const TEAL_DIM = 'rgba(0,196,180,0.12)';
const TEXT     = '#FFFFFF';
const MUTED    = '#8B949E';
const BORDER   = '#21262D';

type Tab = 'Overview' | 'Schedule' | 'Roster' | 'Logistics';
const TABS: Tab[] = ['Overview', 'Schedule', 'Roster', 'Logistics'];

type TournamentData = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  team_id: string | null;
  notes: string | null;
};

type TGame = {
  id: string;
  opponent: string;
  game_date: string | null;
  game_time: string | null;
  location: string | null;
  result: string | null;
  home_score: number | null;
  away_score: number | null;
  game_type: string;
};

type Roster = {
  id: string;
  full_name: string;
  jersey_number: string | null;
  position: string | null;
};

function fmtDates(start: string | null, end: string | null): string {
  if (!start) return '';
  const s = new Date(start + 'T12:00:00');
  const e = end ? new Date(end + 'T12:00:00') : null;
  const month = s.toLocaleDateString('en-US', { month: 'short' });
  const sd = s.getDate();
  if (!e || start === end) return `${month} ${sd}`;
  const sameMonth = e.toLocaleDateString('en-US', { month: 'short' }) === month;
  return sameMonth
    ? `${month} ${sd}–${e.getDate()}`
    : `${month} ${sd} – ${e.toLocaleDateString('en-US', { month: 'short' })} ${e.getDate()}`;
}

function fmtGameTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h - 1 + 12) % 12) + 1;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtGameDate(d: string | null): string {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function statusBadgeConfig(status: string) {
  if (status === 'in_progress') return { label: 'IN PROGRESS', color: TEAL, dot: true };
  if (status === 'complete')    return { label: 'COMPLETE',    color: MUTED, dot: false };
  return                               { label: 'UPCOMING',   color: ORANGE, dot: false };
}

function playerInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ tournament, games }: { tournament: TournamentData; games: TGame[] }) {
  const nextGame = games.find(g => !g.result) ?? null;
  const wins  = games.filter(g => g.result?.includes('WIN')).length;
  const losses = games.filter(g => g.result?.includes('LOSS')).length;
  const played = games.filter(g => g.result).length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Record pills */}
      {played > 0 && (
        <View style={s.recordRow}>
          <View style={s.recordPill}>
            <ThemedText style={[s.recordNum, { color: GREEN }]}>{wins}</ThemedText>
            <ThemedText style={s.recordLbl}>WIN{wins !== 1 ? 'S' : ''}</ThemedText>
          </View>
          <View style={s.recordPill}>
            <ThemedText style={[s.recordNum, { color: RED }]}>{losses}</ThemedText>
            <ThemedText style={s.recordLbl}>LOSS{losses !== 1 ? 'ES' : ''}</ThemedText>
          </View>
          <View style={s.recordPill}>
            <ThemedText style={[s.recordNum, { color: MUTED }]}>{played}</ThemedText>
            <ThemedText style={s.recordLbl}>PLAYED</ThemedText>
          </View>
        </View>
      )}

      {/* Next game */}
      {nextGame ? (
        <View style={s.nextGameCard}>
          <ThemedText style={s.nextGameLabel}>NEXT GAME</ThemedText>
          <ThemedText style={s.nextGameTitle}>vs. {nextGame.opponent}</ThemedText>
          <ThemedText style={s.nextGameMeta}>
            {[fmtGameDate(nextGame.game_date), fmtGameTime(nextGame.game_time), nextGame.location].filter(Boolean).join(' · ')}
          </ThemedText>
          <View style={s.warmupRow}>
            <View style={s.liveDot} />
            <ThemedText style={s.warmupText}>
              {nextGame.game_type === 'final' ? 'Championship Game' :
               nextGame.game_type === 'semi'  ? 'Semi-Final' :
               nextGame.game_type === 'quarter'? 'Quarter-Final' : 'Pool Play'}
            </ThemedText>
          </View>
        </View>
      ) : games.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="trophy-outline" size={28} color={MUTED} />
          <ThemedText style={s.emptyText}>No games scheduled yet</ThemedText>
        </View>
      ) : (
        <View style={s.nextGameCard}>
          <ThemedText style={s.nextGameLabel}>TOURNAMENT COMPLETE</ThemedText>
          <ThemedText style={s.nextGameTitle}>{wins}W – {losses}L</ThemedText>
          <ThemedText style={s.nextGameMeta}>All games played</ThemedText>
        </View>
      )}

      {/* Bracket placeholder */}
      <View style={s.bracketCard}>
        <ThemedText style={s.bracketLabel}>BRACKET</ThemedText>
        <ThemedText style={s.bracketSub}>Full bracket available on the tournament website.</ThemedText>
      </View>

      {/* Notes from coach */}
      {tournament.notes ? (
        <View style={[s.bracketCard, { marginTop: 10 }]}>
          <ThemedText style={s.bracketLabel}>NOTES FROM COACH</ThemedText>
          <ThemedText style={[s.bracketSub, { color: TEXT }]}>{tournament.notes}</ThemedText>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ games }: { games: TGame[] }) {
  // Group by date
  const grouped: { date: string; items: TGame[] }[] = [];
  const seen = new Set<string>();
  for (const g of games) {
    const key = g.game_date ?? 'TBD';
    if (!seen.has(key)) {
      seen.add(key);
      grouped.push({ date: key, items: [] });
    }
    grouped[grouped.length - 1].items.push(g);
  }

  if (games.length === 0) {
    return (
      <View style={s.emptyCard}>
        <Ionicons name="calendar-outline" size={28} color={MUTED} />
        <ThemedText style={s.emptyText}>No games scheduled yet</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {grouped.map((group, gi) => (
        <View key={group.date}>
          <ThemedText style={s.dateSectionLabel}>
            {group.date === 'TBD' ? 'DATE TBD' : fmtGameDate(group.date).toUpperCase()}
          </ThemedText>
          {group.items.map((g, i) => {
            const hasResult = !!g.result;
            const isWin = g.result?.includes('WIN');
            const dotColor = hasResult ? (isWin ? GREEN : RED) : TEAL;

            return (
              <View key={g.id} style={s.timelineRow}>
                <View style={s.timelineLeft}>
                  <View style={[s.timelineDot, { backgroundColor: dotColor }]} />
                  {i < group.items.length - 1 && <View style={s.timelineLine} />}
                </View>
                <View style={[s.timelineCard, { flex: 1, marginBottom: i < group.items.length - 1 ? 0 : 12 }]}>
                  <View style={s.timelineTop}>
                    {g.game_time && <ThemedText style={s.timelineTime}>{fmtGameTime(g.game_time)}</ThemedText>}
                    <View style={[s.typeBadge, { backgroundColor: 'rgba(0,196,180,0.12)' }]}>
                      <ThemedText style={[s.typeBadgeText, { color: TEAL }]}>
                        {g.game_type === 'pool' ? 'POOL' : g.game_type.toUpperCase()}
                      </ThemedText>
                    </View>
                    {hasResult && (
                      <View style={[s.scoreBadge, { backgroundColor: isWin ? 'rgba(61,255,143,0.12)' : 'rgba(239,68,68,0.12)', borderColor: isWin ? 'rgba(61,255,143,0.3)' : 'rgba(239,68,68,0.3)' }]}>
                        <ThemedText style={[s.scoreText, { color: isWin ? GREEN : RED }]}>{g.result}</ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={s.timelineBody}>
                    <View style={[s.schedIcon, { backgroundColor: 'rgba(0,196,180,0.12)' }]}>
                      <Ionicons name="trophy-outline" size={18} color={TEAL} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <ThemedText style={s.schedTitle}>vs. {g.opponent}</ThemedText>
                      {g.location && <ThemedText style={s.schedDetail}>{g.location}</ThemedText>}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Roster Tab ───────────────────────────────────────────────────────────────
function RosterTab({ players, loading }: { players: Roster[]; loading: boolean }) {
  if (loading) return <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />;

  if (players.length === 0) {
    return (
      <View style={s.emptyCard}>
        <Ionicons name="people-outline" size={28} color={MUTED} />
        <ThemedText style={s.emptyText}>No roster available</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.rosterHeader}>
        <Ionicons name="people-outline" size={16} color={TEAL} style={{ marginRight: 8 }} />
        <ThemedText style={s.rosterHeaderLabel}>ROSTER</ThemedText>
        <ThemedText style={[s.rosterHeaderLabel, { color: TEXT, marginLeft: 'auto', fontWeight: '700', letterSpacing: 0 }]}>
          {players.length} players
        </ThemedText>
      </View>
      <View style={s.rosterList}>
        {players.map((p, i) => (
          <View key={p.id} style={[s.rosterRow, i < players.length - 1 && { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
            <View style={s.rosterAvatar}>
              <ThemedText style={s.rosterAvatarText}>{playerInitials(p.full_name)}</ThemedText>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText style={s.rosterName}>{p.full_name}</ThemedText>
              <ThemedText style={s.rosterPos}>
                {[p.jersey_number ? `#${p.jersey_number}` : null, p.position].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Logistics Tab ────────────────────────────────────────────────────────────
function LogisticsTab({ tournament }: { tournament: TournamentData }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.logisticsCard}>
        <ThemedText style={s.logisticsLabel}>LOCATION</ThemedText>
        <ThemedText style={s.logisticsTitle}>{tournament.location ?? 'TBD'}</ThemedText>
        {tournament.start_date && (
          <ThemedText style={s.logisticsSub}>{fmtDates(tournament.start_date, tournament.end_date)}</ThemedText>
        )}
      </View>
      {[
        { icon: 'time-outline',     title: 'Arrive 45 min before game time', sub: '' },
        { icon: 'call-outline',     title: 'Contact your coach for details',  sub: '' },
      ].map((item, i) => (
        <View key={i} style={s.logisticsRow}>
          <Ionicons name={item.icon as any} size={20} color={TEAL} style={{ marginRight: 14, flexShrink: 0 }} />
          <View style={{ flex: 1 }}>
            <ThemedText style={s.logisticsRowTitle}>{item.title}</ThemedText>
            {item.sub ? <ThemedText style={s.logisticsRowSub}>{item.sub}</ThemedText> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ParentTournamentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activeTab,   setActiveTab]   = useState<Tab>('Overview');
  const [loading,     setLoading]     = useState(true);
  const [rosterLoad,  setRosterLoad]  = useState(true);
  const [tournament,  setTournament]  = useState<TournamentData | null>(null);
  const [games,       setGames]       = useState<TGame[]>([]);
  const [players,     setPlayers]     = useState<Roster[]>([]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      // Load tournament
      const { data: tourn } = await supabase
        .from('tournaments')
        .select('id, name, location, start_date, end_date, status, team_id, notes')
        .eq('id', id)
        .maybeSingle();

      if (!tourn) { setLoading(false); return; }
      setTournament(tourn as TournamentData);

      // Load games
      const { data: gData } = await supabase
        .from('tournament_games')
        .select('id, opponent, game_date, game_time, location, result, home_score, away_score, game_type')
        .eq('tournament_id', id)
        .order('game_date', { ascending: true })
        .order('game_time', { ascending: true });

      setGames((gData ?? []) as TGame[]);
      setLoading(false);

      // Load roster from team
      if (tourn.team_id) {
        const { data: pData } = await supabase
          .from('players')
          .select('id, full_name, jersey_number, position')
          .eq('team_id', tourn.team_id)
          .order('full_name');
        setPlayers((pData ?? []) as Roster[]);
      }
      setRosterLoad(false);
    })();
  }, [id]);

  const cfg = statusBadgeConfig(tournament?.status ?? 'upcoming');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText style={{ color: MUTED }}>Tournament not found</ThemedText>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* Top Nav */}
        <View style={s.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backChip} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={16} color={TEXT} />
            <ThemedText style={s.backText}>Tournaments</ThemedText>
          </TouchableOpacity>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerIcon}>
              <Ionicons name="notifications-outline" size={22} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={s.profileAvatar}>
              <ThemedText style={s.profileAvatarText}>P</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tournament header card */}
        <View style={s.tournHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={s.tournName}>{tournament.name}</ThemedText>
            <View style={s.tournMeta}>
              {tournament.start_date && (
                <>
                  <Ionicons name="calendar-outline" size={12} color={MUTED} style={{ marginRight: 4 }} />
                  <ThemedText style={s.tournMetaText}>{fmtDates(tournament.start_date, tournament.end_date)}  ·  </ThemedText>
                </>
              )}
              {tournament.location && (
                <>
                  <Ionicons name="location-outline" size={12} color={MUTED} style={{ marginRight: 4 }} />
                  <ThemedText style={s.tournMetaText}>{tournament.location}</ThemedText>
                </>
              )}
            </View>
          </View>
          <View style={[s.inProgressBadge, { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}18` }]}>
            {cfg.dot && <View style={[s.liveDot, { backgroundColor: cfg.color }]} />}
            <ThemedText style={[s.inProgressText, { color: cfg.color }]}>{cfg.label}</ThemedText>
          </View>
        </View>

        {/* Tab strip */}
        <View style={s.tabStrip}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, activeTab === t && s.tabBtnActive]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.tabTxt, activeTab === t && s.tabTxtActive]}>{t}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.content}>
          {activeTab === 'Overview'  && <OverviewTab tournament={tournament} games={games} />}
          {activeTab === 'Schedule'  && <ScheduleTab games={games} />}
          {activeTab === 'Roster'    && <RosterTab players={players} loading={rosterLoad} />}
          {activeTab === 'Logistics' && <LogisticsTab tournament={tournament} />}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  topNav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backChip:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  backText:         { fontSize: 13, fontWeight: '600', color: TEXT },
  headerRight:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon:       { padding: 4 },
  profileAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText:{ fontSize: 12, fontWeight: '800', color: '#000' },

  tournHeader:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: CARD, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 14 },
  tournName:        { fontSize: 20, fontWeight: '800', lineHeight: 26, color: TEXT, marginBottom: 4 },
  tournMeta:        { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  tournMetaText:    { fontSize: 12, color: MUTED },
  inProgressBadge:  { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, gap: 6, flexShrink: 0 },
  inProgressText:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  liveDot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: TEAL },

  tabStrip:    { flexDirection: 'row', marginHorizontal: 16, backgroundColor: CARD, borderRadius: 30, padding: 4, marginBottom: 0, borderWidth: 1, borderColor: BORDER },
  tabBtn:      { flex: 1, borderRadius: 26, paddingVertical: 9, alignItems: 'center' },
  tabBtnActive:{ backgroundColor: TEAL },
  tabTxt:      { fontSize: 12, fontWeight: '700', color: MUTED },
  tabTxtActive:{ color: '#000' },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  emptyCard: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: MUTED },

  // Overview
  recordRow:   { flexDirection: 'row', gap: 10, marginBottom: 14 },
  recordPill:  { flex: 1, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 12, alignItems: 'center', gap: 2 },
  recordNum:   { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  recordLbl:   { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  nextGameCard:{ backgroundColor: TEAL_DIM, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)', padding: 16, marginBottom: 12 },
  nextGameLabel:{ fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.5, marginBottom: 6 },
  nextGameTitle:{ fontSize: 20, fontWeight: '800', lineHeight: 26, color: TEXT, marginBottom: 4 },
  nextGameMeta: { fontSize: 13, color: MUTED, marginBottom: 10 },
  warmupRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warmupText:  { fontSize: 13, fontWeight: '700', color: TEAL },
  bracketCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16 },
  bracketLabel:{ fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 4 },
  bracketSub:  { fontSize: 14, color: MUTED },

  // Schedule
  dateSectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 10, marginTop: 8 },
  timelineRow:  { flexDirection: 'row', marginBottom: 10 },
  timelineLeft: { width: 20, alignItems: 'center', marginRight: 12, paddingTop: 16 },
  timelineDot:  { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  timelineLine: { flex: 1, width: 2, backgroundColor: BORDER, marginTop: 4 },
  timelineCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14 },
  timelineTop:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  timelineTime: { fontSize: 16, fontWeight: '800', color: TEXT },
  typeBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText:{ fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  scoreBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  scoreText:    { fontSize: 11, fontWeight: '800' },
  timelineBody: { flexDirection: 'row', alignItems: 'center' },
  schedIcon:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  schedTitle:   { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  schedDetail:  { fontSize: 12, color: MUTED },

  // Roster
  rosterHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rosterHeaderLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  rosterList:        { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  rosterRow:         { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rosterAvatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rosterAvatarText:  { fontSize: 13, fontWeight: '800', color: '#000' },
  rosterName:        { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  rosterPos:         { fontSize: 12, color: MUTED },

  // Logistics
  logisticsCard:     { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 10 },
  logisticsLabel:    { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 4 },
  logisticsTitle:    { fontSize: 18, fontWeight: '800', lineHeight: 24, color: TEXT, marginBottom: 2 },
  logisticsSub:      { fontSize: 13, color: MUTED, marginBottom: 4 },
  logisticsRow:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  logisticsRowTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  logisticsRowSub:   { fontSize: 13, color: MUTED },
});
