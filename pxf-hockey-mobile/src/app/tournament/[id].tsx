import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const PURPLE = '#8B5CF6';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'schedule' | 'roster' | 'logistics' | 'payments';
type SchedFilter = 'all' | 'games' | 'transport' | 'accommodation' | 'meals';

// ── DB-backed types ───────────────────────────────────────────────────────────
type TournamentData = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  entry_fee_cents: number;
  notes: string | null;
  team_id: string | null;
  teamName: string;
  teamInitials: string;
};

type TGame = {
  id: string;
  opponent: string;
  game_date: string | null;
  game_time: string | null;
  location: string | null;
  home_score: number | null;
  away_score: number | null;
  result: string | null;
  game_type: string;
};

type TRosterPlayer = {
  id: string;
  full_name: string;
  jersey_number: string | null;
  position: string | null;
};

type GameEvent = {
  gameId: string;
  time: string;
  title: string;
  type: string;
  sub: string;
  result: string | null;
  rawGame: TGame;
  attendance: { going: number; pending: number; out: number; unknown: number } | null;
  rsvp: string | null;
};

function fmtTournDates(start: string | null, end: string | null): string {
  if (!start) return '—';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-US', opts);
  if (!end || end === start) return s;
  const e = new Date(end   + 'T12:00:00').toLocaleDateString('en-US', opts);
  return `${s}–${e}`;
}

function fmtStatusLabel(status: string): string {
  if (status === 'in_progress') return 'IN PROGRESS';
  if (status === 'complete')    return 'COMPLETE';
  return 'UPCOMING';
}

function calcRecord(games: TGame[]): { w: number; l: number; ot: number } {
  let w = 0, l = 0, ot = 0;
  games.forEach(g => {
    if (!g.result) return;
    const up = g.result.toUpperCase();
    if (up.includes('WIN'))       w++;
    else if (up.includes('OT'))   ot++;
    else if (up.includes('LOSS')) l++;
  });
  return { w, l, ot };
}

function fmtGameTime(time: string | null): string {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

function groupGamesByDate(games: TGame[]): { label: string; events: GameEvent[] }[] {
  const map: Record<string, TGame[]> = {};
  games.forEach(g => { const k = g.game_date ?? 'TBD'; (map[k] ??= []).push(g); });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, gs]) => ({
    label: date === 'TBD' ? 'DATE TBD'
      : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase(),
    events: gs.map(g => ({
      gameId:     g.id,
      rawGame:    g,
      time:       fmtGameTime(g.game_time),
      title:      `vs. ${g.opponent}`,
      type:       g.game_type ?? 'game',
      sub:        g.location ?? '',
      result:     g.result,
      attendance: null,
      rsvp:       null,
    })),
  }));
}

// ── Local demo data (not yet in DB) ──────────────────────────────────────────

const SCHEDULE_FILTERS: { key: SchedFilter; label: string }[] = [
  { key: 'all',           label: 'All' },
  { key: 'games',         label: 'Games' },
  { key: 'transport',     label: 'Transport' },
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'meals',         label: 'Team Functi…' },
];



// ── Shared helpers ─────────────────────────────────────────────────────────────
function GradBtn({ label, icon, small }: { label: string; icon?: string; small?: boolean }) {
  return (
    <TouchableOpacity activeOpacity={0.8}>
      <LinearGradient colors={[TEAL, GREEN]} style={[s.gradBtn, small && s.gradBtnSm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {icon && <Ionicons name={icon as any} size={small ? 14 : 16} color="#000" />}
        <ThemedText style={[s.gradBtnTxt, small && s.gradBtnTxtSm]}>{label}</ThemedText>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function OutlineBtn({ label, icon }: { label: string; icon?: string }) {
  return (
    <TouchableOpacity style={s.outlineBtn} activeOpacity={0.8}>
      {icon && <Ionicons name={icon as any} size={16} color={TEAL} />}
      <ThemedText style={s.outlineBtnTxt}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

function SectionLabel({ children, mt = 14 }: { children: React.ReactNode; mt?: number }) {
  return <ThemedText style={[s.sectionLbl, { marginTop: mt }]}>{children}</ThemedText>;
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab({ tournament, record, nextGame }: {
  tournament: TournamentData;
  record: { w: number; l: number; ot: number };
  nextGame: TGame | null;
}) {
  return (
    <>

      {/* Next Game */}
      {nextGame ? (
        <View style={s.nextGameCard}>
          <ThemedText style={s.nextGameLbl}>NEXT GAME</ThemedText>
          <ThemedText style={s.nextGameTitle}>vs. {nextGame.opponent}</ThemedText>
          <ThemedText style={s.metaTxt}>
            {nextGame.game_date ? new Date(nextGame.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            {nextGame.game_time ? ` · ${fmtGameTime(nextGame.game_time)}` : ''}
            {nextGame.location  ? ` · ${nextGame.location}` : ''}
          </ThemedText>
          <TouchableOpacity style={s.viewGameBtn}>
            <ThemedText style={s.viewGameTxt}>View Game</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[s.nextGameCard, { alignItems: 'center', paddingVertical: 20 }]}>
          <ThemedText style={[s.metaTxt, { textAlign: 'center' }]}>No upcoming games scheduled.</ThemedText>
        </View>
      )}

      {/* Tournament Record */}
      <View style={[s.card, s.recordCard]}>
        <View style={s.recordCol}>
          <ThemedText style={[s.recordNum, { color: TEAL }]}>{record.w}</ThemedText>
          <ThemedText style={s.recordLbl}>W</ThemedText>
        </View>
        <View style={s.recordCol}>
          <ThemedText style={[s.recordNum, { color: MUTED }]}>{record.l}</ThemedText>
          <ThemedText style={s.recordLbl}>L</ThemedText>
        </View>
        <View style={s.recordCol}>
          <ThemedText style={[s.recordNum, { color: MUTED }]}>{record.ot}</ThemedText>
          <ThemedText style={s.recordLbl}>OT</ThemedText>
        </View>
      </View>

      {/* Pool standings */}
      <View style={[s.card, { alignItems: 'center', paddingVertical: 18, gap: 6 }]}>
        <Ionicons name="podium-outline" size={22} color={MUTED} />
        <ThemedText style={s.metaTxt}>Pool standings coming soon</ThemedText>
      </View>

      {/* Info grid */}
      <View style={s.infoGrid}>
        {[
          { label: 'LOCATION',  value: tournament.location ?? '—' },
          { label: 'DATES',     value: fmtTournDates(tournament.start_date, tournament.end_date) },
          { label: 'ENTRY FEE', value: tournament.entry_fee_cents > 0 ? `$${(tournament.entry_fee_cents / 100).toFixed(0)}` : '—' },
          { label: 'STATUS',    value: fmtStatusLabel(tournament.status) },
        ].map(item => (
          <View key={item.label} style={s.infoCard}>
            <ThemedText style={s.infoCardLbl}>{item.label}</ThemedText>
            <ThemedText style={s.infoCardVal} numberOfLines={2}>{item.value}</ThemedText>
          </View>
        ))}
      </View>

      <OutlineBtn label="Tournament Website" icon="link-outline" />
      <View style={{ marginHorizontal: 16, marginTop: 10 }}>
        <GradBtn label="Add to Calendar" icon="calendar-outline" />
      </View>
      <View style={{ height: 24 }} />
    </>
  );
}

// ── Tab: Schedule ─────────────────────────────────────────────────────────────
const EVENT_TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  game:          { bg: 'rgba(0,196,180,0.15)',    color: TEAL,   label: 'GAME' },
  regular:       { bg: 'rgba(0,196,180,0.15)',    color: TEAL,   label: 'GAME' },
  playoff:       { bg: 'rgba(245,158,11,0.15)',   color: ORANGE, label: 'PLAYOFF' },
  championship:  { bg: 'rgba(61,255,143,0.15)',   color: GREEN,  label: 'CHAMPIONSHIP' },
  consolation:   { bg: 'rgba(139,92,246,0.15)',   color: PURPLE, label: 'CONSOLATION' },
  transport:     { bg: 'rgba(245,158,11,0.15)',   color: ORANGE, label: 'TRANSPORT' },
  meal:          { bg: 'rgba(139,92,246,0.15)',   color: PURPLE, label: 'MEAL' },
  accommodation: { bg: 'rgba(59,130,246,0.15)',   color: '#3B82F6', label: 'HOTEL' },
};

const GAME_TYPES = [
  { key: 'regular',      label: 'Regular' },
  { key: 'playoff',      label: 'Playoff' },
  { key: 'championship', label: 'Championship' },
  { key: 'consolation',  label: 'Consolation' },
];

function parseTimeInput(str: string): string | null {
  const m = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = (m[3] ?? '').toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`;
}

function fmtPickedDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Scoresheet types ──────────────────────────────────────────────────────────
type ParsedGoal = {
  period: number | null;
  time: string | null;
  player: string | null;
  team: 'home' | 'away' | null;
  assist1: string | null;
  assist2: string | null;
  goal_type: string | null;
};
type ParsedPenalty = {
  period: number | null;
  time: string | null;
  player: string | null;
  team: 'home' | 'away' | null;
  infraction: string | null;
  duration: number | null;
};
type ReviewItem = {
  id: string;
  kind: 'score' | 'goal' | 'penalty';
  label: string;
  sub: string;
  checked: boolean;
  data: any;
};

function ScheduleTab({ games, tournamentId, teamName, roster, onReload }: {
  games: TGame[];
  tournamentId: string;
  teamName: string;
  roster: TRosterPlayer[];
  onReload: () => void;
}) {
  const [filter,    setFilter]    = useState<SchedFilter>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // ── Add Game modal ──
  const [showAdd,   setShowAdd]   = useState(false);
  const [aOpponent, setAOpponent] = useState('');
  const [aDate,     setADate]     = useState('');
  const [aTime,     setATime]     = useState('');
  const [aLoc,      setALoc]      = useState('');
  const [aType,     setAType]     = useState('regular');
  const [aSaving,   setASaving]   = useState(false);
  const [aDpOpen,   setADpOpen]   = useState(false);
  const [aDpMonth,  setADpMonth]  = useState(new Date());

  // ── Edit Score modal ──
  const [editGame,   setEditGame]   = useState<TGame | null>(null);
  const [eHome,      setEHome]      = useState('');
  const [eAway,      setEAway]      = useState('');
  const [eResult,    setEResult]    = useState<'Win'|'Loss'|'OT Loss'|''>('');
  const [eSaving,    setESaving]    = useState(false);

  function openEdit(g: TGame) {
    setEditGame(g);
    setEHome(g.home_score != null ? String(g.home_score) : '');
    setEAway(g.away_score != null ? String(g.away_score) : '');
    setEResult((g.result as any) ?? '');
  }

  // ── Scoresheet modal ──
  const [sheetGame,    setSheetGame]    = useState<TGame | null>(null);
  const [sheetParsing, setSheetParsing] = useState(false);
  const [reviewItems,  setReviewItems]  = useState<ReviewItem[]>([]);
  const [sheetSaving,  setSheetSaving]  = useState(false);

  async function handleUploadScoresheet(game: TGame) {
    const ImagePicker = await import('expo-image-picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setSheetGame(game);
    setSheetParsing(true);
    setReviewItems([]);

    try {
      const asset = result.assets[0];
      const ext   = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const { data, error } = await supabase.functions.invoke('parse-scoresheet', {
        body: {
          imageBase64: asset.base64,
          mediaType,
          homeTeam: teamName,
          awayTeam: game.opponent,
          roster: roster.map(p => p.full_name),
        },
      });

      if (error || !data) throw new Error(error?.message ?? 'No response from AI');

      const items: ReviewItem[] = [];
      let uid = 0;

      // Score item
      if (data.home_score != null || data.away_score != null) {
        const hs = data.home_score ?? '?';
        const as_ = data.away_score ?? '?';
        const win = data.home_score != null && data.away_score != null
          ? (data.home_score > data.away_score ? `Win for ${teamName}` : data.home_score < data.away_score ? `Win for ${game.opponent}` : 'Tie')
          : '';
        items.push({
          id: String(uid++), kind: 'score',
          label: `${hs} – ${as_}`,
          sub: win,
          checked: true,
          data: { home_score: data.home_score, away_score: data.away_score, result: win.startsWith('Win for ' + teamName) ? 'Win' : win.startsWith('Win for') ? 'Loss' : null },
        });
      }

      // Goal items
      for (const g of (data.goals ?? []) as ParsedGoal[]) {
        const assists = [g.assist1, g.assist2].filter(Boolean).join(', ');
        const period  = g.period ? `P${g.period}` : '';
        items.push({
          id: String(uid++), kind: 'goal',
          label: `GOAL  ${g.player ?? '?'}  ${g.time ?? ''}${period ? `  (${period})` : ''}`,
          sub: [g.goal_type ?? 'ES', assists ? `Assists: ${assists}` : '', g.team === 'home' ? teamName : game.opponent].filter(Boolean).join(' · '),
          checked: true,
          data: g,
        });
      }

      // Penalty items
      for (const p of (data.penalties ?? []) as ParsedPenalty[]) {
        const period = p.period ? `P${p.period}` : '';
        items.push({
          id: String(uid++), kind: 'penalty',
          label: `PENALTY  ${p.player ?? '?'}  ${p.time ?? ''}${period ? `  (${period})` : ''}`,
          sub: [p.infraction ?? '?', p.duration ? `${p.duration} min` : '', p.team === 'home' ? teamName : game.opponent].filter(Boolean).join(' · '),
          checked: true,
          data: p,
        });
      }

      setReviewItems(items);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not parse scoresheet');
      setSheetGame(null);
    } finally {
      setSheetParsing(false);
    }
  }

  async function handleSaveScoresheet() {
    if (!sheetGame) return;
    setSheetSaving(true);

    const checkedItems = reviewItems.filter(i => i.checked);

    // Save score if checked
    const scoreItem = checkedItems.find(i => i.kind === 'score');
    if (scoreItem) {
      await supabase.from('tournament_games').update({
        home_score: scoreItem.data.home_score,
        away_score: scoreItem.data.away_score,
        result:     scoreItem.data.result,
      }).eq('id', sheetGame.id);
    }

    // Save goals
    const goals = checkedItems.filter(i => i.kind === 'goal');
    if (goals.length > 0) {
      await supabase.from('game_events').insert(
        goals.map(i => ({
          game_id:        sheetGame.id,
          event_type:     'goal',
          period:         i.data.period ?? null,
          time_in_period: i.data.time ?? null,
          player_name:    i.data.player ?? null,
          team:           i.data.team ?? null,
          goal_type:      i.data.goal_type ?? 'ES',
          assist1:        i.data.assist1 ?? null,
          assist2:        i.data.assist2 ?? null,
        }))
      );
    }

    // Save penalties
    const pens = checkedItems.filter(i => i.kind === 'penalty');
    if (pens.length > 0) {
      await supabase.from('game_events').insert(
        pens.map(i => ({
          game_id:          sheetGame.id,
          event_type:       'penalty',
          period:           i.data.period ?? null,
          time_in_period:   i.data.time ?? null,
          player_name:      i.data.player ?? null,
          team:             i.data.team ?? null,
          infraction:       i.data.infraction ?? null,
          duration_minutes: i.data.duration ?? null,
        }))
      );
    }

    setSheetSaving(false);
    setSheetGame(null);
    setReviewItems([]);
    onReload();
  }

  async function handleAddGame() {
    if (!aOpponent.trim()) return;
    setASaving(true);
    const timeStr = aTime.trim() ? parseTimeInput(aTime.trim()) : null;
    if (aTime.trim() && !timeStr) {
      Alert.alert('Invalid time', 'Use format like "10:30 AM"');
      setASaving(false); return;
    }
    const { error } = await supabase.from('tournament_games').insert({
      tournament_id: tournamentId,
      opponent:      aOpponent.trim(),
      game_date:     aDate || null,
      game_time:     timeStr,
      location:      aLoc.trim() || null,
      game_type:     aType,
    });
    setASaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setAOpponent(''); setADate(''); setATime(''); setALoc(''); setAType('regular');
    setADpOpen(false); setShowAdd(false);
    onReload();
  }

  async function handleSaveScore() {
    if (!editGame) return;
    setESaving(true);
    const { error } = await supabase.from('tournament_games').update({
      home_score: eHome !== '' ? parseInt(eHome) : null,
      away_score: eAway !== '' ? parseInt(eAway) : null,
      result:     eResult || null,
    }).eq('id', editGame.id);
    setESaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setEditGame(null);
    onReload();
  }

  async function handleDeleteGame(gameId: string) {
    Alert.alert('Delete Game', 'Remove this game from the schedule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('tournament_games').delete().eq('id', gameId);
        onReload();
      }},
    ]);
  }

  function renderAddDateCal() {
    const y = aDpMonth.getFullYear(), m = aDpMonth.getMonth();
    const daysInM = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInM }, (_, i) => i + 1)];
    return (
      <View style={s.calWrap}>
        <View style={s.calNav}>
          <TouchableOpacity onPress={() => { const d = new Date(aDpMonth); d.setMonth(d.getMonth()-1); setADpMonth(d); }} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={s.calMonth}>{aDpMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</ThemedText>
          <TouchableOpacity onPress={() => { const d = new Date(aDpMonth); d.setMonth(d.getMonth()+1); setADpMonth(d); }} style={{ padding: 6 }}>
            <Ionicons name="chevron-forward" size={18} color={TEXT} />
          </TouchableOpacity>
        </View>
        <View style={s.calDayHdrs}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <ThemedText key={d} style={s.calDayHdr}>{d}</ThemedText>)}
        </View>
        <View style={s.calGrid}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={s.calCell} />;
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isSel = aDate === dateStr;
            return (
              <TouchableOpacity key={i} style={[s.calCell, isSel && s.calCellSel]} onPress={() => { setADate(dateStr); setADpOpen(false); }} activeOpacity={0.8}>
                <ThemedText style={[s.calCellTxt, isSel && { color: '#000' }]}>{day}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  const scheduleDays = groupGamesByDate(filter === 'games' || filter === 'all' ? games : []);

  return (
    <>
      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterScrollContent}>
        {SCHEDULE_FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[s.filterChip, filter === f.key && s.filterChipOn]} onPress={() => setFilter(f.key)}>
            <ThemedText style={[s.filterChipTxt, filter === f.key && s.filterChipTxtOn]}>{f.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sub-controls */}
      <View style={s.schedControls}>
        <TouchableOpacity style={s.calBtn}>
          <Ionicons name="calendar-outline" size={14} color={TEAL} />
          <ThemedText style={s.calBtnTxt}>+ Add to Calendar</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={s.editBtn} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={14} color={TEAL} />
          <ThemedText style={s.editBtnTxt}>Add Game</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Day sections */}
      {scheduleDays.length === 0 && (
        <TouchableOpacity style={s.schedEmptyCard} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
          <Ionicons name="trophy-outline" size={28} color={MUTED} style={{ marginBottom: 8 }} />
          <ThemedText style={[s.metaTxt, { textAlign: 'center' }]}>No games scheduled yet.</ThemedText>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: TEAL, marginTop: 10 }}>+ Add First Game</ThemedText>
        </TouchableOpacity>
      )}
      {scheduleDays.map(day => {
        const isCollapsed = collapsed[day.label];
        return (
          <View key={day.label} style={s.daySection}>
            <TouchableOpacity style={s.dayHeader} onPress={() => setCollapsed(c => ({ ...c, [day.label]: !c[day.label] }))}>
              <ThemedText style={s.dayLabel}>{day.label}</ThemedText>
              <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={MUTED} />
            </TouchableOpacity>

            {!isCollapsed && day.events.map((ev, i) => {
              const tc = EVENT_TYPE_COLORS[ev.type] ?? { bg: 'rgba(255,255,255,0.05)', color: MUTED, label: (ev.type ?? 'GAME').toUpperCase() };
              const hasScore = ev.rawGame.home_score != null || ev.rawGame.away_score != null;
              return (
                <TouchableOpacity key={i} style={s.eventRow} activeOpacity={0.8} onPress={() => openEdit(ev.rawGame)}>
                  <View style={[s.eventAccent, { backgroundColor: tc.color }]} />
                  <View style={s.eventTime}>
                    <ThemedText style={s.eventTimeTxt}>{ev.time}</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.eventTitle}>{ev.title}</ThemedText>
                    <View style={[s.eventTypeBadge, { backgroundColor: tc.bg }]}>
                      <ThemedText style={[s.eventTypeTxt, { color: tc.color }]}>{tc.label}</ThemedText>
                    </View>
                    {ev.sub ? <ThemedText style={s.metaTxt}>{ev.sub}</ThemedText> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {hasScore ? (
                      <TouchableOpacity style={s.scoreBox} onPress={() => openEdit(ev.rawGame)} activeOpacity={0.8}>
                        <ThemedText style={s.scoreTxt}>{ev.rawGame.home_score ?? '—'}–{ev.rawGame.away_score ?? '—'}</ThemedText>
                        {ev.result ? <ThemedText style={[s.resultPill, { color: ev.result.includes('Win') ? '#22C55E' : ev.result.includes('OT') ? ORANGE : RED }]}>{ev.result}</ThemedText> : null}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={s.enterScoreBtn} onPress={() => openEdit(ev.rawGame)} activeOpacity={0.8}>
                        <ThemedText style={s.enterScoreTxt}>Score</ThemedText>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={s.scoresheetBtn}
                      onPress={() => handleUploadScoresheet(ev.rawGame)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera-outline" size={12} color={TEAL} />
                      <ThemedText style={s.scoresheetBtnTxt}>Scoresheet</ThemedText>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={{ padding: 6 }} onPress={() => handleDeleteGame(ev.gameId)}>
                    <Ionicons name="trash-outline" size={15} color={MUTED} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
      <View style={{ height: 24 }} />

      {/* ── Add Game Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAdd(false)}>
            <TouchableOpacity style={[s.modalSheet, { flex: 1 }]} activeOpacity={1}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <ThemedText style={s.modalTitle}>Add Game</ThemedText>
                <TouchableOpacity onPress={() => setShowAdd(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
                <ThemedText style={s.modalFieldLabel}>OPPONENT *</ThemedText>
                <TextInput
                  style={s.modalInput}
                  value={aOpponent}
                  onChangeText={setAOpponent}
                  placeholder="e.g. Burnaby Winter Club"
                  placeholderTextColor={MUTED}
                  autoCapitalize="words"
                  autoFocus
                />

                <ThemedText style={s.modalFieldLabel}>GAME TYPE</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  {GAME_TYPES.map(gt => (
                    <TouchableOpacity
                      key={gt.key}
                      style={[s.typeChip, aType === gt.key && s.typeChipOn]}
                      onPress={() => setAType(gt.key)}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={[s.typeChipTxt, aType === gt.key && s.typeChipTxtOn]}>{gt.label}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={s.modalFieldLabel}>DATE</ThemedText>
                <TouchableOpacity
                  style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => setADpOpen(!aDpOpen)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color={aDate ? TEAL : MUTED} />
                  <ThemedText style={{ color: aDate ? TEXT : MUTED, fontSize: 15, flex: 1 }}>
                    {aDate ? fmtPickedDate(aDate) : 'Select date'}
                  </ThemedText>
                  <Ionicons name={aDpOpen ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
                </TouchableOpacity>
                {aDpOpen && renderAddDateCal()}

                <ThemedText style={s.modalFieldLabel}>TIME</ThemedText>
                <TextInput
                  style={s.modalInput}
                  value={aTime}
                  onChangeText={setATime}
                  placeholder="e.g. 10:30 AM"
                  placeholderTextColor={MUTED}
                  keyboardType="numbers-and-punctuation"
                />

                <ThemedText style={s.modalFieldLabel}>RINK / LOCATION</ThemedText>
                <TextInput
                  style={s.modalInput}
                  value={aLoc}
                  onChangeText={setALoc}
                  placeholder="e.g. Semiahmoo Arena"
                  placeholderTextColor={MUTED}
                  autoCapitalize="words"
                />
              </ScrollView>

              <TouchableOpacity
                style={[s.modalSave, (!aOpponent.trim() || aSaving) && { opacity: 0.5 }]}
                onPress={() => void handleAddGame()}
                disabled={!aOpponent.trim() || aSaving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, TEAL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalSaveGrad}>
                  <ThemedText style={s.modalSaveTxt}>{aSaving ? 'Saving…' : 'Add Game'}</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Scoresheet Review Modal ───────────────────────────────────────────── */}
      <Modal visible={!!sheetGame} transparent animationType="slide" onRequestClose={() => { setSheetGame(null); setReviewItems([]); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => { setSheetGame(null); setReviewItems([]); }}>
            <TouchableOpacity style={[s.modalSheet, { flex: 1 }]} activeOpacity={1}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <View>
                  <ThemedText style={s.modalTitle}>Scoresheet</ThemedText>
                  {sheetGame && <ThemedText style={[s.metaTxt, { marginTop: 2 }]}>vs. {sheetGame.opponent}</ThemedText>}
                </View>
                <TouchableOpacity onPress={() => { setSheetGame(null); setReviewItems([]); }} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              {sheetParsing ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <ActivityIndicator size="large" color={TEAL} />
                  <ThemedText style={[s.metaTxt, { textAlign: 'center' }]}>Reading scoresheet…</ThemedText>
                  <ThemedText style={[s.metaTxt, { fontSize: 12, textAlign: 'center' }]}>AI is extracting goals, assists and penalties</ThemedText>
                </View>
              ) : reviewItems.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Ionicons name="document-outline" size={36} color={MUTED} />
                  <ThemedText style={s.metaTxt}>No items extracted</ThemedText>
                </View>
              ) : (
                <>
                  <ThemedText style={[s.metaTxt, { marginBottom: 12, fontSize: 12 }]}>
                    Tap to uncheck any items that are incorrect before saving.
                  </ThemedText>
                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {reviewItems.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[s.reviewRow, !item.checked && s.reviewRowUnchecked]}
                        onPress={() => setReviewItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))}
                        activeOpacity={0.8}
                      >
                        <View style={[s.reviewCheck, item.checked && s.reviewCheckOn]}>
                          {item.checked && <Ionicons name="checkmark" size={14} color="#000" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <View style={[s.reviewKindBadge, {
                              backgroundColor: item.kind === 'score' ? 'rgba(0,196,180,0.15)'
                                : item.kind === 'goal' ? 'rgba(61,255,143,0.15)'
                                : 'rgba(245,158,11,0.15)',
                            }]}>
                              <ThemedText style={[s.reviewKindTxt, {
                                color: item.kind === 'score' ? TEAL : item.kind === 'goal' ? GREEN : ORANGE,
                              }]}>
                                {item.kind.toUpperCase()}
                              </ThemedText>
                            </View>
                            <ThemedText style={[s.reviewLabel, !item.checked && { color: MUTED }]}>{item.label}</ThemedText>
                          </View>
                          {item.sub ? <ThemedText style={[s.metaTxt, { marginTop: 3, fontSize: 12 }]}>{item.sub}</ThemedText> : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                    <View style={{ height: 16 }} />
                  </ScrollView>

                  <TouchableOpacity
                    style={[s.modalSave, (sheetSaving || reviewItems.every(i => !i.checked)) && { opacity: 0.5 }]}
                    onPress={() => void handleSaveScoresheet()}
                    disabled={sheetSaving || reviewItems.every(i => !i.checked)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalSaveGrad}>
                      <ThemedText style={s.modalSaveTxt}>
                        {sheetSaving ? 'Saving…' : `Save ${reviewItems.filter(i => i.checked).length} Items`}
                      </ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Score Modal ───────────────────────────────────────────────────── */}
      <Modal visible={!!editGame} transparent animationType="slide" onRequestClose={() => setEditGame(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setEditGame(null)}>
            <TouchableOpacity style={s.modalSheet} activeOpacity={1}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <ThemedText style={s.modalTitle}>Enter Score</ThemedText>
                <TouchableOpacity onPress={() => setEditGame(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              <ThemedText style={[s.metaTxt, { paddingHorizontal: 4, marginBottom: 16 }]}>
                vs. {editGame?.opponent}
              </ThemedText>

              {/* Score row */}
              <View style={s.scoreRow}>
                <View style={s.scoreCol}>
                  <ThemedText style={s.scoreLbl}>US</ThemedText>
                  <TextInput
                    style={s.scoreInput}
                    value={eHome}
                    onChangeText={setEHome}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={MUTED}
                    maxLength={2}
                  />
                </View>
                <ThemedText style={[s.metaTxt, { fontSize: 28, fontWeight: '700', alignSelf: 'flex-end', paddingBottom: 8 }]}>–</ThemedText>
                <View style={s.scoreCol}>
                  <ThemedText style={s.scoreLbl}>THEM</ThemedText>
                  <TextInput
                    style={s.scoreInput}
                    value={eAway}
                    onChangeText={setEAway}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={MUTED}
                    maxLength={2}
                  />
                </View>
              </View>

              {/* Result chips */}
              <ThemedText style={[s.modalFieldLabel, { marginTop: 20 }]}>RESULT</ThemedText>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                {(['Win', 'Loss', 'OT Loss'] as const).map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[s.typeChip, eResult === r && { borderColor: r === 'Win' ? '#22C55E' : r === 'OT Loss' ? ORANGE : RED, backgroundColor: r === 'Win' ? 'rgba(34,197,94,0.15)' : r === 'OT Loss' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }]}
                    onPress={() => setEResult(r)}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[s.typeChipTxt, eResult === r && { color: r === 'Win' ? '#22C55E' : r === 'OT Loss' ? ORANGE : RED }]}>{r}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.modalSave, eSaving && { opacity: 0.5 }]}
                onPress={() => void handleSaveScore()}
                disabled={eSaving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, TEAL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalSaveGrad}>
                  <ThemedText style={s.modalSaveTxt}>{eSaving ? 'Saving…' : 'Save Score'}</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ── Tab: Roster ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  confirmed: { bg: 'rgba(0,196,180,0.15)',  color: TEAL,   label: 'CONFIRMED' },
  pending:   { bg: 'rgba(245,158,11,0.15)', color: ORANGE, label: 'PENDING'   },
  out:       { bg: 'rgba(239,68,68,0.2)',   color: RED,    label: 'OUT'       },
};

function StatusBadge({ status }: { status: 'confirmed' | 'pending' | 'out' }) {
  const st = STATUS_STYLES[status];
  return (
    <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
      <ThemedText style={[s.statusTxt, { color: st.color }]}>{st.label}</ThemedText>
    </View>
  );
}

function RosterTab({ players }: { players: TRosterPlayer[] }) {
  return (
    <>
      {players.length > 0 ? (
        <>
          <SectionLabel mt={4}>PLAYERS · {players.length}</SectionLabel>
          <View style={s.rosterCard}>
            {players.map((p, i) => (
              <View key={p.id} style={[s.rosterRow, i < players.length - 1 && s.rosterRowBorder]}>
                <View style={s.numBadge}>
                  <ThemedText style={s.numBadgeTxt}>{p.jersey_number ?? '—'}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.playerName}>{p.full_name}</ThemedText>
                  {p.position ? <ThemedText style={s.metaTxt}>{p.position}</ThemedText> : null}
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <SectionLabel mt={4}>PLAYERS</SectionLabel>
          <View style={[s.rosterCard, { alignItems: 'center', paddingVertical: 20 }]}>
            <ThemedText style={s.metaTxt}>No players on this team yet.</ThemedText>
          </View>
        </>
      )}

      <View style={s.guestHdr}>
        <ThemedText style={s.sectionLbl}>GUEST PLAYERS</ThemedText>
        <TouchableOpacity><ThemedText style={s.seeAll}>+ Add Guest Player</ThemedText></TouchableOpacity>
      </View>
      <View style={[s.rosterCard, { alignItems: 'center', paddingVertical: 14 }]}>
        <ThemedText style={s.metaTxt}>No guest players added yet.</ThemedText>
      </View>

      <SectionLabel>JERSEY COLORS</SectionLabel>
      <View style={s.rosterCard}>
        <View style={[s.rosterRow, s.rosterRowBorder]}>
          <View style={[s.jerseyDot, { backgroundColor: TEAL }]} />
          <View style={{ flex: 1 }}>
            <ThemedText style={s.playerName}>Home jersey: Dark</ThemedText>
            <ThemedText style={s.metaTxt}>Set per game in Schedule tab</ThemedText>
          </View>
        </View>
        <View style={s.rosterRow}>
          <View style={[s.jerseyDot, { backgroundColor: TEXT, borderWidth: 1, borderColor: BORDER }]} />
          <View style={{ flex: 1 }}>
            <ThemedText style={s.playerName}>Away jersey: White</ThemedText>
            <ThemedText style={s.metaTxt}>Set per game in Schedule tab</ThemedText>
          </View>
        </View>
      </View>
      <View style={{ height: 24 }} />
    </>
  );
}

// ── Tab: Logistics ────────────────────────────────────────────────────────────
function LogisticsTab({ notes }: { notes: string | null }) {
  return (
    <>
      {/* Accommodation */}
      <SectionLabel mt={4}>ACCOMMODATION</SectionLabel>
      <View style={[s.card, { alignItems: 'center', paddingVertical: 18, gap: 6 }]}>
        <Ionicons name="home-outline" size={22} color={MUTED} />
        <ThemedText style={s.metaTxt}>Accommodation details coming soon</ThemedText>
      </View>

      {/* Equipment checklist */}
      <SectionLabel>EQUIPMENT CHECKLIST</SectionLabel>
      <View style={[s.card, { alignItems: 'center', paddingVertical: 18, gap: 6 }]}>
        <Ionicons name="checkmark-circle-outline" size={22} color={MUTED} />
        <ThemedText style={s.metaTxt}>Equipment checklist coming soon</ThemedText>
      </View>

      {/* Tournament Notes */}
      <View style={s.card}>
        <ThemedText style={s.sectionLbl}>TOURNAMENT NOTES</ThemedText>
        {notes ? (
          <ThemedText style={[s.metaTxt, { lineHeight: 20, marginTop: 8 }]}>{notes}</ThemedText>
        ) : (
          <ThemedText style={[s.metaTxt, { marginTop: 8 }]}>No notes added.</ThemedText>
        )}
      </View>

      <View style={{ height: 24 }} />
    </>
  );
}

// ── Tab: Payments ─────────────────────────────────────────────────────────────
function PaymentsTab({ players }: { players: TRosterPlayer[] }) {
  return (
    <>
      {/* Roster payment list */}
      <SectionLabel mt={8}>PLAYER LIST</SectionLabel>
      {players.length === 0 ? (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 18 }]}>
          <ThemedText style={s.metaTxt}>No roster added yet</ThemedText>
        </View>
      ) : (
        <View style={s.rosterCard}>
          {players.map((p, i) => (
            <View key={p.id} style={[s.rosterRow, i < players.length - 1 && s.rosterRowBorder]}>
              <View style={s.initialsAvatar}>
                <ThemedText style={s.initialsAvatarTxt}>
                  {p.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.playerName}>{p.full_name}</ThemedText>
                {p.jersey_number != null && (
                  <ThemedText style={s.metaTxt}>#{p.jersey_number}{p.position ? ` · ${p.position}` : ''}</ThemedText>
                )}
              </View>
              <View style={[s.statusBadge, { backgroundColor: 'rgba(139,148,158,0.12)' }]}>
                <ThemedText style={[s.statusTxt, { color: MUTED }]}>—</ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Coming soon notice */}
      <View style={[s.card, { marginTop: 12, alignItems: 'center', paddingVertical: 20, gap: 6 }]}>
        <Ionicons name="card-outline" size={24} color={MUTED} />
        <ThemedText style={[s.metaTxt, { fontWeight: '700', color: TEXT }]}>Payment tracking coming soon</ThemedText>
        <ThemedText style={[s.metaTxt, { textAlign: 'center', fontSize: 12 }]}>
          Cost breakdown, per-player amounts, and expense tracker will appear here once payment tracking is available.
        </ThemedText>
      </View>

      <View style={{ height: 24 }} />
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TournamentDetailScreen() {
  const router  = useRouter();
  const params   = useLocalSearchParams<{ id: string; division?: string; teamId?: string }>();
  const id       = params.id;
  const division = params.division ?? 'AAA';
  const sourceTeamId = params.teamId;

  function goBack() {
    const tid = sourceTeamId ?? tournament?.team_id ?? null;
    if (tid) {
      router.push(`/team/${tid}?initTab=tournaments` as any);
    } else {
      router.back();
    }
  }

  const [tab,        setTab]        = useState<Tab>('overview');
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [games,      setGames]      = useState<TGame[]>([]);
  const [roster,     setRoster]     = useState<TRosterPlayer[]>([]);
  const [loading,    setLoading]    = useState(true);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview'   },
    { key: 'schedule',  label: 'Schedule'   },
    { key: 'roster',    label: 'Roster'     },
    { key: 'logistics', label: 'Logistics'  },
    { key: 'payments',  label: 'Payments'   },
  ];

  async function loadGames() {
    if (!id) return;
    const { data } = await supabase
      .from('tournament_games')
      .select('id, opponent, game_date, game_time, location, home_score, away_score, result, game_type')
      .eq('tournament_id', id)
      .order('game_date', { ascending: true });
    setGames((data ?? []) as TGame[]);
  }

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    void (async () => {
      const { data: row } = await supabase
        .from('tournaments')
        .select('id, name, location, start_date, end_date, status, entry_fee_cents, notes, team_id')
        .eq('id', id)
        .maybeSingle();
      if (!row) { setLoading(false); return; }

      let teamName     = 'My Team';
      let teamInitials = 'MT';
      if (row.team_id) {
        const { data: tr } = await supabase
          .from('teams').select('name').eq('id', row.team_id).maybeSingle();
        if (tr?.name) {
          teamName     = tr.name as string;
          teamInitials = (tr.name as string)
            .split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
        }
      }

      const { data: gameRows } = await supabase
        .from('tournament_games')
        .select('id, opponent, game_date, game_time, location, home_score, away_score, result, game_type')
        .eq('tournament_id', id)
        .order('game_date', { ascending: true });

      // Load team roster
      let rosterRows: TRosterPlayer[] = [];
      if (row.team_id) {
        const { data: rr } = await supabase
          .from('players')
          .select('id, full_name, jersey_number, position')
          .eq('team_id', row.team_id)
          .order('jersey_number', { ascending: true });
        rosterRows = (rr ?? []) as TRosterPlayer[];
      }

      setTournament({
        id:              row.id              as string,
        name:            row.name            as string,
        location:        row.location        as string | null,
        start_date:      row.start_date      as string | null,
        end_date:        row.end_date        as string | null,
        status:          (row.status         as string) ?? 'upcoming',
        entry_fee_cents: (row.entry_fee_cents as number) ?? 0,
        notes:           row.notes           as string | null,
        team_id:         row.team_id         as string | null,
        teamName,
        teamInitials,
      });
      setGames((gameRows ?? []) as TGame[]);
      setRoster(rosterRows);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <TouchableOpacity onPress={goBack} style={{ marginBottom: 16 }}>
          <ThemedText style={{ color: TEAL }}>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={{ color: MUTED }}>Tournament not found.</ThemedText>
      </View>
    );
  }

  const record  = calcRecord(games);
  const nextGame = games.find(g => !g.result) ?? null;

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Top nav */}
          <View style={s.topNav}>
            <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={16} color={TEXT} />
              <ThemedText style={s.backBtnTxt}>Tournaments</ThemedText>
            </TouchableOpacity>
            <View style={s.navRight}>
              <View style={s.coachChip}>
                <ThemedText style={s.coachChipTxt}>COACH</ThemedText>
              </View>
              <View style={s.navIcons}>
                <TouchableOpacity style={s.iconBtn}><Ionicons name="person-circle-outline" size={20} color={MUTED} /></TouchableOpacity>
                <TouchableOpacity style={s.iconBtn}><Ionicons name="megaphone-outline"     size={18} color={MUTED} /></TouchableOpacity>
                <TouchableOpacity style={s.iconBtn}><Ionicons name="camera-outline"        size={18} color={MUTED} /></TouchableOpacity>
                <TouchableOpacity style={s.iconBtn}><Ionicons name="settings-outline"      size={18} color={MUTED} /></TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Team header */}
          <View style={s.teamHdr}>
            <View style={s.teamAvatar}>
              <ThemedText style={s.teamAvatarTxt}>{tournament.teamInitials}</ThemedText>
            </View>
            <View>
              <ThemedText style={s.teamName}>{tournament.teamName}</ThemedText>
              <ThemedText style={s.teamSub}>{division}</ThemedText>
            </View>
          </View>

          {/* Tournament breadcrumb */}
          <TouchableOpacity style={s.breadcrumb} onPress={goBack}>
            <Ionicons name="chevron-back" size={14} color={TEAL} />
            <ThemedText style={s.breadcrumbTxt}>Tournaments</ThemedText>
          </TouchableOpacity>

          {/* Tournament title */}
          <View style={s.tournHdr}>
            <ThemedText style={s.tournTitle}>{tournament.name}</ThemedText>
            <View style={s.inProgressBadge}>
              <ThemedText style={s.inProgressTxt}>{fmtStatusLabel(tournament.status)}</ThemedText>
            </View>
          </View>
          <ThemedText style={[s.metaTxt, { paddingHorizontal: 16, marginBottom: 12 }]}>
            {fmtTournDates(tournament.start_date, tournament.end_date)}
            {tournament.location ? ` · ${tournament.location}` : ''}
          </ThemedText>

          {/* Tab bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
            {TABS.map(t => (
              <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
                <ThemedText style={[s.tabLbl, tab === t.key && s.tabLblOn]}>{t.label}</ThemedText>
                {tab === t.key && <View style={s.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.tabDivider} />

          {/* Tab content */}
          {tab === 'overview'  && <OverviewTab tournament={tournament} record={record} nextGame={nextGame} />}
          {tab === 'schedule'  && <ScheduleTab games={games} tournamentId={id ?? ''} teamName={tournament.teamName} roster={roster} onReload={loadGames} />}
          {tab === 'roster'    && <RosterTab players={roster} />}
          {tab === 'logistics' && <LogisticsTab notes={tournament.notes} />}
          {tab === 'payments'  && <PaymentsTab players={roster} />}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── StyleSheet ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  safe:    { flex: 1 },
  content: { paddingBottom: 32 },

  // Top nav
  topNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  backBtnTxt:   { fontSize: 14, fontWeight: '600', color: TEXT },
  navRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coachChip:    { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL },
  coachChipTxt: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  navIcons:     { flexDirection: 'row' },
  iconBtn:      { padding: 5 },

  // Team header
  teamHdr:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 10 },
  teamAvatar:    { width: 48, height: 48, borderRadius: 24, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  teamAvatarTxt: { fontSize: 16, fontWeight: '800', color: '#000' },
  teamName:      { fontSize: 18, fontWeight: '800', color: TEXT, lineHeight: 24 },
  teamSub:       { fontSize: 13, color: MUTED, marginTop: 2 },

  // Breadcrumb
  breadcrumb:    { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 16, marginBottom: 6 },
  breadcrumbTxt: { fontSize: 14, fontWeight: '600', color: TEAL },

  // Tournament header
  tournHdr:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4, gap: 10 },
  tournTitle:     { flex: 1, fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  inProgressBadge:{ backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: TEAL, alignSelf: 'flex-start', marginTop: 2 },
  inProgressTxt:  { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 0.5 },

  // Tab bar
  tabBar:        { maxHeight: 44 },
  tabBarContent: { paddingHorizontal: 10 },
  tabItem:       { paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  tabLbl:        { fontSize: 14, fontWeight: '600', color: MUTED },
  tabLblOn:      { color: TEAL },
  tabUnderline:  { height: 2, backgroundColor: TEAL, borderRadius: 1, width: '100%', marginTop: 4 },
  tabDivider:    { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  // Shared
  card:          { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  sectionLbl:    { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10 },
  metaTxt:       { fontSize: 13, color: MUTED, lineHeight: 18 },
  seeAll:        { fontSize: 13, color: TEAL, fontWeight: '600' },

  // Grad / outline buttons
  gradBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 14 },
  gradBtnSm:     { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 22 },
  gradBtnTxt:    { fontSize: 15, fontWeight: '700', color: '#000' },
  gradBtnTxtSm:  { fontSize: 13 },
  outlineBtn:    { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: TEAL, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 0 },
  outlineBtnTxt: { fontSize: 14, fontWeight: '700', color: TEAL },

  // Overview
  syncAlert:      { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  syncAlertTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  syncAlertLink:  { fontSize: 13, color: TEAL, fontWeight: '600' },
  nextGameCard:   { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(0,196,180,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: TEAL },
  nextGameLbl:    { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1.5, marginBottom: 8 },
  nextGameTitle:  { fontSize: 18, fontWeight: '800', color: TEXT, lineHeight: 24, marginBottom: 4 },
  countdownTxt:   { fontSize: 13, color: TEAL, fontWeight: '600', marginTop: 4, marginBottom: 14 },
  viewGameBtn:    { borderRadius: 12, borderWidth: 1, borderColor: TEAL, paddingVertical: 13, alignItems: 'center' },
  viewGameTxt:    { fontSize: 14, fontWeight: '700', color: TEAL },
  recordCard:     { flexDirection: 'row' },
  recordCol:      { flex: 1, alignItems: 'center', paddingVertical: 8 },
  recordNum:      { fontSize: 40, fontWeight: '800', lineHeight: 46 },
  recordLbl:      { fontSize: 13, color: MUTED, fontWeight: '600', marginTop: 2 },
  standingsHdr:   { marginBottom: 12 },
  standingsTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  standingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderRadius: 8 },
  standingRowUs:  { backgroundColor: 'rgba(0,196,180,0.08)', paddingHorizontal: 8, marginHorizontal: -8 },
  standingRank:   { fontSize: 14, color: MUTED, width: 22 },
  standingName:   { flex: 1, fontSize: 14, color: TEXT },
  standingPts:    { fontSize: 13, fontWeight: '700', color: MUTED },
  fullStandingsLink: { marginTop: 10 },
  infoGrid:       { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 8, marginBottom: 10 },
  infoCard:       { width: '47.5%', backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  infoCardLbl:    { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 6 },
  infoCardVal:    { fontSize: 14, fontWeight: '700', color: TEXT, lineHeight: 20 },

  // Schedule
  filterScroll:        { maxHeight: 52, marginBottom: 4 },
  filterScrollContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  filterChip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  filterChipOn:        { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.1)' },
  filterChipTxt:       { fontSize: 13, fontWeight: '600', color: MUTED },
  filterChipTxtOn:     { color: TEAL },
  schedControls:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  calBtn:              { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calBtnTxt:           { fontSize: 13, fontWeight: '600', color: TEAL },
  editBtn:             { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, borderWidth: 1, borderColor: TEAL, paddingHorizontal: 14, paddingVertical: 7 },
  editBtnTxt:          { fontSize: 13, fontWeight: '600', color: TEAL },
  daySection:          { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  dayHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  dayLabel:            { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  eventRow:            { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: BORDER },
  eventAccent:         { width: 3, borderRadius: 2, alignSelf: 'stretch', minHeight: 40 },
  eventTime:           { width: 54 },
  eventTimeTxt:        { fontSize: 12, fontWeight: '600', color: MUTED, marginTop: 2 },
  eventTitle:          { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  eventTypeBadge:      { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 4 },
  eventTypeTxt:        { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  attendRow:           { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  resultBadge:         { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 2 },
  resultTxt:           { fontSize: 11, fontWeight: '800' },
  rsvpChip:            { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: BORDER, alignSelf: 'flex-start', marginTop: 2 },
  rsvpTxt:             { fontSize: 11, fontWeight: '600', color: MUTED },

  // Schedule add/edit
  schedEmptyCard:  { marginHorizontal: 16, marginTop: 8, backgroundColor: CARD, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  scoreBox:        { alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  scoreTxt:        { fontSize: 16, fontWeight: '800', color: TEXT },
  resultPill:      { fontSize: 11, fontWeight: '700' },
  enterScoreBtn:   { borderRadius: 10, borderWidth: 1, borderColor: TEAL, paddingHorizontal: 10, paddingVertical: 5 },
  enterScoreTxt:   { fontSize: 12, fontWeight: '700', color: TEAL },
  scoresheetBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,196,180,0.4)', paddingHorizontal: 8, paddingVertical: 4 },
  scoresheetBtnTxt:{ fontSize: 11, fontWeight: '600', color: TEAL },
  // Review sheet
  reviewRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  reviewRowUnchecked:{ opacity: 0.4 },
  reviewCheck:       { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  reviewCheckOn:     { backgroundColor: TEAL, borderColor: TEAL },
  reviewKindBadge:   { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  reviewKindTxt:     { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  reviewLabel:       { fontSize: 13, fontWeight: '700', color: TEXT },
  scoreRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 8, paddingHorizontal: 4 },
  scoreCol:        { alignItems: 'center', gap: 8 },
  scoreLbl:        { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  scoreInput:      { width: 80, height: 72, backgroundColor: BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, color: TEXT, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  typeChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  typeChipOn:      { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.12)' },
  typeChipTxt:     { fontSize: 13, fontWeight: '600', color: MUTED },
  typeChipTxtOn:   { color: TEAL, fontWeight: '700' },

  // Shared modals
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, maxHeight: '92%' },
  modalHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle:      { fontSize: 20, fontWeight: '800', color: TEXT },
  modalFieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  modalInput:      { backgroundColor: BG, borderRadius: 12, padding: 14, color: TEXT, fontSize: 15, borderWidth: 1, borderColor: BORDER },
  modalSave:       { borderRadius: 14, overflow: 'hidden', marginTop: 16, marginHorizontal: 0 },
  modalSaveGrad:   { paddingVertical: 16, alignItems: 'center' },
  modalSaveTxt:    { fontSize: 16, fontWeight: '800', color: '#000' },

  // Calendar (for add game date picker)
  calWrap:      { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, marginTop: 8, marginBottom: 4 },
  calNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calMonth:     { fontSize: 14, fontWeight: '700', color: TEXT },
  calDayHdrs:   { flexDirection: 'row', marginBottom: 4 },
  calDayHdr:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: MUTED },
  calGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:      { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellSel:   { backgroundColor: TEAL, borderRadius: 20 },
  calCellTxt:   { fontSize: 13, color: TEXT },

  // Roster
  rosterCard:     { marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  rosterRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rosterRowBorder:{ borderBottomWidth: 1, borderBottomColor: BORDER },
  numBadge:       { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(0,196,180,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  numBadgeTxt:    { fontSize: 14, fontWeight: '700', color: TEAL },
  playerName:     { fontSize: 15, fontWeight: '700', color: TEXT },
  statusBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt:      { fontSize: 11, fontWeight: '700' },
  guestHdr:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 14 },
  jerseyDot:      { width: 14, height: 14, borderRadius: 7 },
  pendingGroup:   { flexDirection: 'row', alignItems: 'center' },
  remindBtn:      { borderRadius: 12, borderWidth: 1, borderColor: TEAL, paddingHorizontal: 12, paddingVertical: 5 },
  remindBtnTxt:   { fontSize: 12, fontWeight: '700', color: TEAL },

  // Logistics
  accomFilter:    { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  accomChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  accomChipOn:    { borderColor: TEAL, backgroundColor: TEAL },
  accomChipTxt:   { fontSize: 13, fontWeight: '600', color: MUTED },
  accomChipTxtOn: { color: '#000', fontWeight: '700' },
  hotelHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  hotelName:      { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 4 },
  hotelBtns:      { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  hotelOutBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: TEAL, paddingVertical: 10 },
  hotelOutBtnTxt: { fontSize: 13, fontWeight: '600', color: TEAL },
  roomToggle:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  toggleBox:      { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  toggleBoxOn:    { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.15)' },
  checklistRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checklistItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  checkboxEmpty:  { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: BORDER },
  notesHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  attachRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Payments
  costRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  costDivider:      { height: 1, backgroundColor: BORDER, marginVertical: 8 },
  costTotal:        { fontSize: 16, fontWeight: '800', color: TEXT },
  costPerPlayer:    { fontSize: 12, color: MUTED, marginTop: 4 },
  initialsAvatar:   { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E2A3A', alignItems: 'center', justifyContent: 'center' },
  initialsAvatarTxt:{ fontSize: 13, fontWeight: '700', color: MUTED },
  expenseHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  expenseRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  expenseBarBg:     { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 8 },
  expenseBarFill:   { height: '100%', borderRadius: 3 },
  sendRemindersBtn: { paddingVertical: 17, alignItems: 'center', borderRadius: 14 },
  sendRemindersTxt: { fontSize: 16, fontWeight: '700', color: '#000' },
});
