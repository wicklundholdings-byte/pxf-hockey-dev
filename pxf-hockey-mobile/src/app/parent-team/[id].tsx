import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, FlatList, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type Tab = 'Overview' | 'Schedule' | 'Tournaments' | 'Roster' | 'Stats';
const TABS: Tab[] = ['Overview', 'Schedule', 'Tournaments', 'Roster', 'Stats'];

// ─── Overview Tab ─────────────────────────────────────────────────────────────
type UpcomingItem = { id: string; title: string; date: string; time: string | null; kind: 'session' | 'game' };

function fmtItemDate(date: string, time: string | null): string {
  const d = new Date(date + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let label = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  if (time) {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    label += ` · ${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  return label;
}

function OverviewTab({ coachId }: { coachId: string }) {
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [record,   setRecord]   = useState({ wins: 0, losses: 0, ties: 0 });
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!coachId) return;
    const today = new Date().toISOString().split('T')[0];
    void (async () => {
      const [{ data: sesRows }, { data: gameRows }] = await Promise.all([
        supabase.from('sessions')
          .select('id, title, date, time')
          .eq('coach_id', coachId).gte('date', today)
          .order('date').order('time', { nullsFirst: false }).limit(5),
        supabase.from('games')
          .select('id, opponent, game_date, game_time, home_score, away_score, status, home_away')
          .eq('coach_id', coachId)
          .order('game_date').limit(30),
      ]);

      const sessions: UpcomingItem[] = (sesRows ?? []).map((r: any) => ({
        id: r.id, title: r.title, date: r.date, time: r.time ?? null, kind: 'session',
      }));
      const upGames: UpcomingItem[] = (gameRows ?? [])
        .filter((g: any) => g.status !== 'final' && g.game_date >= today)
        .slice(0, 3)
        .map((g: any) => ({
          id: g.id, title: `vs. ${g.opponent}`, date: g.game_date, time: g.game_time ?? null, kind: 'game',
        }));

      const merged = [...sessions, ...upGames].sort((a, b) => {
        const dc = a.date.localeCompare(b.date);
        return dc !== 0 ? dc : (a.time ?? '').localeCompare(b.time ?? '');
      });
      setUpcoming(merged.slice(0, 5));

      // Compute season record from final games
      let wins = 0, losses = 0, ties = 0;
      (gameRows ?? []).filter((g: any) => g.status === 'final').forEach((g: any) => {
        if (g.home_score == null || g.away_score == null) return;
        const my    = g.home_away === 'home' ? g.home_score : g.away_score;
        const their = g.home_away === 'home' ? g.away_score : g.home_score;
        if (my > their) wins++;
        else if (my < their) losses++;
        else ties++;
      });
      setRecord({ wins, losses, ties });
      setLoading(false);
    })();
  }, [coachId]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Season Record */}
      <ThemedText style={s.subSectionLabel}>SEASON RECORD</ThemedText>
      <View style={s.recordCard}>
        <View style={s.recordItem}><ThemedText style={[s.recordNum, { color: TEAL }]}>{record.wins}</ThemedText><ThemedText style={s.recordLabel}>WINS</ThemedText></View>
        <View style={s.recordItem}><ThemedText style={[s.recordNum, { color: RED }]}>{record.losses}</ThemedText><ThemedText style={s.recordLabel}>LOSSES</ThemedText></View>
        <View style={s.recordItem}><ThemedText style={[s.recordNum, { color: MUTED }]}>{record.ties}</ThemedText><ThemedText style={s.recordLabel}>TIES</ThemedText></View>
      </View>

      {/* Upcoming */}
      <View style={s.upcomingHeader}>
        <Ionicons name="calendar-outline" size={14} color={TEAL} style={{ marginRight: 6 }} />
        <ThemedText style={[s.subSectionLabel, { marginBottom: 0, flex: 1 }]}>UPCOMING</ThemedText>
      </View>
      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 12 }} />
      ) : upcoming.length === 0 ? (
        <View style={[s.upcomingRow, { justifyContent: 'center' }]}>
          <ThemedText style={{ color: MUTED, fontSize: 14 }}>No upcoming events</ThemedText>
        </View>
      ) : upcoming.map((e) => (
        <View key={`${e.kind}-${e.id}`} style={s.upcomingRow}>
          <View style={[s.upcomingIcon, { backgroundColor: e.kind === 'game' ? 'rgba(239,68,68,0.12)' : 'rgba(0,196,180,0.12)' }]}>
            <Ionicons name={e.kind === 'game' ? 'trophy-outline' : 'fitness-outline'} size={18} color={e.kind === 'game' ? RED : TEAL} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText style={s.upcomingTitle}>{e.title}</ThemedText>
            <ThemedText style={s.upcomingMeta}>{fmtItemDate(e.date, e.time)}</ThemedText>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
type ScheduleSession = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  location: string | null;
};

function fmtSessionDate(dateStr: string, time: string | null): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let label = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  if (time) {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    label += ` · ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  return label;
}

function ScheduleTab({ coachId }: { coachId: string }) {
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!coachId) return;
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('sessions')
        .select('id, title, date, time, location')
        .eq('coach_id', coachId)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(20);
      setSessions((data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        date: r.date,
        startTime: r.time ?? null,
        location: r.location ?? null,
      })));
      setLoading(false);
    })();
  }, [coachId]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <ThemedText style={s.tabSectionTitle}>Upcoming</ThemedText>
      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : sessions.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="calendar-outline" size={28} color={MUTED} />
          <ThemedText style={s.emptyText}>No upcoming sessions</ThemedText>
        </View>
      ) : sessions.map(session => (
        <View key={session.id} style={{ marginBottom: 10 }}>
          <View style={s.schedCard}>
            <View style={s.schedBadgeRow}>
              <View style={[s.schedBadge, { backgroundColor: 'rgba(0,196,180,0.08)' }]}>
                <ThemedText style={[s.schedBadgeText, { color: TEAL }]}>PRACTICE</ThemedText>
              </View>
            </View>
            <View style={s.schedRow}>
              <View style={[s.schedIcon, { backgroundColor: 'rgba(0,196,180,0.12)' }]}>
                <Ionicons name="fitness-outline" size={18} color={TEAL} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={s.schedTitle}>{session.title}</ThemedText>
                <ThemedText style={s.schedMeta}>
                  {fmtSessionDate(session.date, session.startTime)}
                  {session.location ? ` · ${session.location}` : ''}
                </ThemedText>
              </View>
            </View>
            {session.location && (
              <TouchableOpacity
                style={s.mapsBtn}
                activeOpacity={0.8}
                onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(session.location!)}`)}
              >
                <ThemedText style={s.mapsBtnText}>Open in Google Maps</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Tournaments Tab ──────────────────────────────────────────────────────────
type PTournament = { id: string; name: string; location: string | null; start_date: string | null; end_date: string | null; status: string };

function fmtTournDates(start: string | null, end: string | null): string {
  if (!start) return '—';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', opts);
  if (!end || end === start) return s;
  const e = new Date(end + 'T12:00:00').toLocaleDateString('en-US', opts);
  return `${s}–${e}`;
}

function TournamentsTab({ teamId, onViewTournament }: { teamId: string; onViewTournament: (id: string) => void }) {
  const [tournaments, setTournaments] = useState<PTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    supabase.from('tournaments')
      .select('id, name, location, start_date, end_date, status')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTournaments((data ?? []) as PTournament[]);
        setLoading(false);
      });
  }, [teamId]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : tournaments.length === 0 ? (
        <View style={[s.emptyCard, { marginTop: 20 }]}>
          <Ionicons name="trophy-outline" size={28} color={MUTED} />
          <ThemedText style={s.emptyText}>No tournaments yet</ThemedText>
        </View>
      ) : tournaments.map(t => (
        <TouchableOpacity key={t.id} style={s.tournCard} activeOpacity={0.8} onPress={() => onViewTournament(t.id)}>
          <View style={s.tournHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText style={s.tournName}>{t.name}</ThemedText>
              <View style={s.tournMeta}>
                <Ionicons name="calendar-outline" size={12} color={MUTED} style={{ marginRight: 4 }} />
                <ThemedText style={s.tournMetaText}>{fmtTournDates(t.start_date, t.end_date)}</ThemedText>
                {t.location ? (
                  <>
                    <ThemedText style={[s.tournMetaText, { marginHorizontal: 4 }]}>·</ThemedText>
                    <Ionicons name="location-outline" size={12} color={MUTED} style={{ marginRight: 2 }} />
                    <ThemedText style={s.tournMetaText}>{t.location}</ThemedText>
                  </>
                ) : null}
              </View>
            </View>
            <View style={[s.tournBadge, t.status === 'complete' ? s.registeredBadge : s.upcomingBadge]}>
              <ThemedText style={[s.tournBadgeText, t.status === 'complete' ? s.registeredText : s.upcomingText]}>
                {t.status === 'in_progress' ? 'IN PROGRESS' : t.status === 'complete' ? 'COMPLETE' : 'UPCOMING'}
              </ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <ThemedText style={s.viewDetails}>View Details ›</ThemedText>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Roster Tab ───────────────────────────────────────────────────────────────
type RosterPlayer = {
  id: string;
  fullName: string;
  position: string | null;
  jerseyNumber: string | null;
};

function RosterTab({ teamId }: { teamId: string }) {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      const { data } = await supabase
        .from('players')
        .select('id, full_name, position, jersey_number')
        .eq('team_id', teamId)
        .order('jersey_number', { ascending: true });
      setPlayers((data ?? []).map((p: any) => ({
        id: p.id,
        fullName: p.full_name,
        position: p.position ?? null,
        jerseyNumber: p.jersey_number ?? null,
      })));
      setLoading(false);
    })();
  }, [teamId]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <ThemedText style={s.tabSectionTitle}>
        {loading ? 'Roster' : `Roster · ${players.length}`}
      </ThemedText>
      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : players.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="people-outline" size={28} color={MUTED} />
          <ThemedText style={s.emptyText}>No players on roster yet</ThemedText>
        </View>
      ) : players.map(p => (
        <View key={p.id} style={s.rosterRow}>
          <View style={s.rosterNumBox}>
            <ThemedText style={s.rosterNum}>{p.jerseyNumber ?? '—'}</ThemedText>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <ThemedText style={s.rosterName}>{p.fullName}</ThemedText>
            {p.position && <ThemedText style={s.rosterPos}>{p.position}</ThemedText>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsTab({ coachId }: { coachId: string }) {
  const [record, setRecord] = useState({ w: 0, l: 0, t: 0, gp: 0, gf: 0, ga: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    supabase.from('games')
      .select('home_score, away_score, home_away, status')
      .eq('coach_id', coachId)
      .eq('status', 'final')
      .then(({ data }) => {
        let w = 0, l = 0, t = 0, gf = 0, ga = 0;
        (data ?? []).forEach((g: any) => {
          if (g.home_score == null) return;
          const my    = g.home_away === 'home' ? g.home_score : g.away_score;
          const their = g.home_away === 'home' ? g.away_score : g.home_score;
          gf += my; ga += their;
          if (my > their) w++;
          else if (my < their) l++;
          else t++;
        });
        setRecord({ w, l, t, gp: w + l + t, gf, ga });
        setLoading(false);
      });
  }, [coachId]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <ThemedText style={s.tabSectionTitle}>Team Stats</ThemedText>
      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 20 }} />
      ) : (
        <View style={s.recordCard2}>
          <ThemedText style={s.record2Eyebrow}>SEASON RECORD</ThemedText>
          <ThemedText style={s.record2Title}>{record.w}-{record.l}-{record.t}</ThemedText>
          <ThemedText style={s.record2Sub}>
            {record.gp} GP · GF {record.gf} · GA {record.ga} · DIFF {record.gf - record.ga >= 0 ? '+' : ''}{record.gf - record.ga}
          </ThemedText>
        </View>
      )}
      <ThemedText style={s.tabSectionTitle}>Skater Stats</ThemedText>
      <View style={[s.emptyCard, { marginTop: 0 }]}>
        <Ionicons name="stats-chart-outline" size={28} color={MUTED} />
        <ThemedText style={s.emptyText}>Player stats coming soon</ThemedText>
      </View>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
function teamInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function ParentTeamScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab,    setActiveTab]    = useState<Tab>('Overview');
  const [teamName,     setTeamName]     = useState('');
  const [teamColor,    setTeamColor]    = useState(TEAL);
  const [teamSeason,   setTeamSeason]   = useState('');
  const [coachId,      setCoachId]      = useState('');
  const [headerLoading, setHeaderLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('teams')
        .select('name, color, season, coach_id')
        .eq('id', id)
        .single();
      if (data) {
        setTeamName(data.name ?? '');
        setTeamColor(data.color ?? TEAL);
        setTeamSeason(data.season ?? '');
        setCoachId(data.coach_id ?? '');
      }
      setHeaderLoading(false);
    })();
  }, [id]);

  const initials = teamName ? teamInitials(teamName) : '…';

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* Top Nav */}
        <View style={s.topNav}>
          <TouchableOpacity onPress={() => router.push('/parent-clubs' as any)} style={s.backChip} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={16} color={TEXT} />
            <ThemedText style={s.backText}>My Clubs</ThemedText>
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

        {/* Team header */}
        <View style={s.teamHeader}>
          <TouchableOpacity style={s.backBreadcrumb} onPress={() => router.push('/parent-clubs' as any)}>
            <Ionicons name="arrow-back" size={16} color={TEAL} style={{ marginRight: 4 }} />
            <ThemedText style={[s.breadcrumbText, { color: TEAL }]}>My Clubs</ThemedText>
          </TouchableOpacity>
          <View style={s.teamIdentity}>
            <View style={[s.teamAvatar, { backgroundColor: teamColor }]}>
              {headerLoading
                ? <ActivityIndicator size="small" color="#000" />
                : <ThemedText style={s.teamAvatarText}>{initials}</ThemedText>
              }
            </View>
            <View>
              <ThemedText style={s.teamName}>{teamName || '…'}</ThemedText>
              {teamSeason ? <ThemedText style={s.teamSeason}>{teamSeason}</ThemedText> : null}
            </View>
          </View>
        </View>

        {/* Tab strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 24 }}>
          {TABS.map(t => (
            <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={s.tabItem} activeOpacity={0.8}>
              <ThemedText style={[s.tabTxt, activeTab === t && s.tabTxtActive]}>{t}</ThemedText>
              {activeTab === t && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.tabContent}>
          {activeTab === 'Overview'     && <OverviewTab coachId={coachId} />}
          {activeTab === 'Schedule'     && <ScheduleTab coachId={coachId} />}
          {activeTab === 'Tournaments'  && <TournamentsTab teamId={id ?? ''} onViewTournament={(tid) => router.push(`/parent-tournament/${tid}` as any)} />}
          {activeTab === 'Roster'       && <RosterTab teamId={id ?? ''} />}
          {activeTab === 'Stats'        && <StatsTab coachId={coachId} />}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  backText: { fontSize: 13, fontWeight: '600', color: TEXT },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { padding: 4 },
  profileAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 12, fontWeight: '800', color: '#000' },

  teamHeader: { paddingHorizontal: 16, paddingBottom: 14 },
  backBreadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  breadcrumbText: { fontSize: 14, color: MUTED, fontWeight: '600' },
  teamIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  teamAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  teamAvatarText: { fontSize: 16, fontWeight: '800', color: '#000' },
  teamName: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 2 },
  teamSeason: { fontSize: 14, color: MUTED },

  tabScroll: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 0, maxHeight: 44 },
  tabItem: { paddingBottom: 12, position: 'relative' },
  tabTxt: { fontSize: 15, fontWeight: '600', color: MUTED },
  tabTxtActive: { color: TEAL, fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: TEAL, borderRadius: 1 },

  tabContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // Overview
  subSectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 10 },
  recordCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 20, justifyContent: 'space-around' },
  recordItem: { alignItems: 'center' },
  recordNum: { fontSize: 36, fontWeight: '800', fontStyle: 'normal', lineHeight: 44, marginBottom: 4 },
  recordLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  upcomingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  viewAll: { fontSize: 13, fontWeight: '700', color: TEAL },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 8 },
  upcomingIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  upcomingTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  upcomingMeta: { fontSize: 12, color: MUTED },
  statsCardRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statsColumn: { flex: 1, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 10 },
  statsColLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statsRank: { fontSize: 12, fontWeight: '700', color: MUTED, width: 20 },
  statsName: { fontSize: 12, fontWeight: '700', color: TEXT, flex: 1 },
  statsVal: { fontSize: 14, fontWeight: '800', color: TEAL },
  leaderboardCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 20 },
  leaderboardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  leaderboardTitle: { fontSize: 12, fontWeight: '800', color: TEAL, letterSpacing: 0.5 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  leaderMedalBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  athleteNumBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  athleteNum: { fontSize: 16, fontWeight: '800', color: '#000' },
  leaderName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  leaderSessions: { fontSize: 12, color: MUTED },
  flamesBadge: { backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  flamesText: { fontSize: 13, fontWeight: '700', color: ORANGE },
  viewLeaderBtn: { marginTop: 14, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDER },
  viewLeaderText: { fontSize: 14, fontWeight: '700', color: TEAL },

  // Schedule
  tabSectionTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 14 },
  schedCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 0 },
  schedBadgeRow: { marginBottom: 8 },
  schedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  schedBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  schedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  schedIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  schedTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 2 },
  schedMeta: { fontSize: 12, color: MUTED },
  mapsBtn: { backgroundColor: BG, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  mapsBtnText: { fontSize: 13, fontWeight: '600', color: TEXT },
  rsvpRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER, paddingVertical: 10, paddingHorizontal: 14 },
  rsvpName: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT },
  rsvpIcons: { flexDirection: 'row', gap: 6 },
  rsvpIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },

  // Tournaments
  tournCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 12 },
  tournHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  tournName: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 4 },
  tournMeta: { flexDirection: 'row', alignItems: 'center' },
  tournMetaText: { fontSize: 12, color: MUTED },
  tournBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  registeredBadge: { backgroundColor: 'rgba(0,196,180,0.08)', borderColor: 'rgba(0,196,180,0.3)' },
  upcomingBadge: { backgroundColor: BORDER, borderColor: BORDER },
  tournBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  registeredText: { color: TEAL },
  upcomingText: { color: MUTED },
  hotelBox: { backgroundColor: BG, borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  hotelLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 4 },
  hotelName: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  hotelRate: { fontSize: 13, color: MUTED, marginBottom: 8 },
  bookBtn: { flexDirection: 'row', alignItems: 'center' },
  bookBtnText: { fontSize: 14, fontWeight: '700', color: GREEN },
  scheduleLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  gameRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: BORDER },
  gameDay: { fontSize: 12, fontWeight: '800', color: TEAL, width: 32 },
  gameTime: { fontSize: 13, color: MUTED },
  gameOpponent: { fontSize: 13, fontWeight: '700', color: TEXT, flex: 1 },
  viewDetails: { fontSize: 14, fontWeight: '700', color: TEAL, textAlign: 'right' },

  // Empty states
  emptyCard: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center' },

  // Roster
  rosterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  rosterNumBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  rosterNum: { fontSize: 15, fontWeight: '800', color: TEXT },
  rosterName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  rosterPos: { fontSize: 12, color: MUTED },

  // Stats
  gameFilterRow: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 30, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  gameFilterBtn: { flex: 1, borderRadius: 26, paddingVertical: 10, alignItems: 'center' },
  gameFilterBtnActive: { backgroundColor: TEAL },
  gameFilterTxt: { fontSize: 13, fontWeight: '700', color: MUTED },
  gameFilterTxtActive: { color: '#000' },
  recordCard2: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 20 },
  record2Eyebrow: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6 },
  record2Title: { fontSize: 32, fontWeight: '800', fontStyle: 'normal', lineHeight: 40, color: TEXT, marginBottom: 4 },
  record2Sub: { fontSize: 13, color: MUTED },
  statsTable: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  statsTableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  statsHeaderCell: { flex: 1, fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.5 },
  statsTableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: BORDER },
  statsCell: { flex: 1, fontSize: 13, color: TEXT },
});
