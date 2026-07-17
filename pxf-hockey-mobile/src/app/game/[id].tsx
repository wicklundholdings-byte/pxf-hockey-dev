import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert,
  TextInput, Switch, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { EventVolunteers } from '@/components/event-volunteers';
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

type GameView  = 'main' | 'prep';
type PrepTab   = 'lines' | 'plan' | 'notes' | 'publish';
type LineupType = 'even' | 'pp' | 'pk';

type GameData = {
  id: string;
  opponent: string;
  game_date: string;
  game_time: string | null;
  location: string | null;
  home_away: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  team_id: string | null;
  teamName: string;
  teamInitials: string;
  season: string;
};

type RsvpCounts = { yes: number; no: number; maybe: number; none: number };

type PlanData = {
  opponent_notes: string;
  our_game_plan: string;
  period1_notes: string;
  period2_notes: string;
  period3_notes: string;
};

function fmtGameDate(date: string | null | undefined, time: string | null): string {
  if (!date) return time ? `Date TBD · ${fmtGameTime(time)}` : 'Date TBD';
  // Supabase DATE columns may return full ISO timestamps — normalize to YYYY-MM-DD
  const dateOnly = String(date).substring(0, 10);
  const d = new Date(dateOnly + 'T12:00:00');
  if (isNaN(d.getTime())) return 'Date TBD';
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!time) return dateStr;
  const parts = time.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${dateStr} · ${h % 12 || 12}:${String(isNaN(m) ? 0 : m).padStart(2, '0')} ${ampm}`;
}

function fmtGameTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Player Picker ────────────────────────────────────────────────────────────
function PlayerPicker({ position }: { position: string }) {
  return (
    <View style={s.picker}>
      <ThemedText style={s.pickerPos}>{position}</ThemedText>
      <View style={s.pickerValue}>
        <ThemedText style={s.pickerDash}>—</ThemedText>
        <Ionicons name="swap-vertical-outline" size={16} color={MUTED} />
      </View>
    </View>
  );
}

// ─── Lines Tab ────────────────────────────────────────────────────────────────
function LinesTab() {
  const [lineupType, setLineupType] = useState<LineupType>('even');
  const lineupTypes: { key: LineupType; label: string }[] = [
    { key: 'even', label: 'Even Strength' },
    { key: 'pp',   label: 'Power Play'    },
    { key: 'pk',   label: 'Penalty Kill'  },
  ];
  const fwdLines = ['L1', 'L2', 'L3', 'L4'];
  const defPairs = ['D1', 'D2', 'D3'];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      {/* Even / PP / PK toggle */}
      <View style={s.lineupToggle}>
        {lineupTypes.map(lt => (
          <TouchableOpacity
            key={lt.key}
            style={[s.lineupToggleBtn, lineupType === lt.key && s.lineupToggleBtnActive]}
            onPress={() => setLineupType(lt.key)}
            activeOpacity={0.8}
          >
            <ThemedText style={[s.lineupToggleText, lineupType === lt.key && s.lineupToggleTextActive]}>
              {lt.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ThemedText style={s.linesLabel}>FORWARD LINES</ThemedText>
      {fwdLines.map(line => (
        <View key={line} style={s.lineCard}>
          <ThemedText style={s.lineNum}>{line}</ThemedText>
          <View style={s.lineRow}>
            <PlayerPicker position="LW" />
            <PlayerPicker position="C"  />
            <PlayerPicker position="RW" />
          </View>
        </View>
      ))}

      <ThemedText style={[s.linesLabel, { marginTop: 8 }]}>DEFENSE PAIRS</ThemedText>
      {defPairs.map(pair => (
        <View key={pair} style={s.lineCard}>
          <ThemedText style={s.lineNum}>{pair}</ThemedText>
          <View style={s.lineRow}>
            <PlayerPicker position="LD" />
            <PlayerPicker position="RD" />
            <View style={{ flex: 1 }} />
          </View>
        </View>
      ))}

      <ThemedText style={[s.linesLabel, { marginTop: 8 }]}>GOALIE</ThemedText>
      <View style={s.lineCard}>
        <View style={s.lineRow}>
          <PlayerPicker position="Starting" />
          <PlayerPicker position="Backup"   />
          <View style={{ flex: 1 }} />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Plan Tab ─────────────────────────────────────────────────────────────────
function PlanTab({ gameId }: { gameId: string }) {
  const [opponent, setOpponent]   = useState('');
  const [gamePlan, setGamePlan]   = useState('');
  const [planId,   setPlanId]     = useState<string | null>(null);
  const [saving,   setSaving]     = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('game_plans').select('id, opponent_notes, our_game_plan')
        .eq('game_id', gameId).maybeSingle();
      if (data) { setPlanId(data.id); setOpponent(data.opponent_notes ?? ''); setGamePlan(data.our_game_plan ?? ''); }
    })();
  }, [gameId]);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    if (planId) {
      await supabase.from('game_plans').update({ opponent_notes: opponent, our_game_plan: gamePlan, updated_at: new Date().toISOString() }).eq('id', planId);
    } else {
      const { data } = await supabase.from('game_plans').insert({ game_id: gameId, coach_id: user.id, opponent_notes: opponent, our_game_plan: gamePlan }).select('id').single();
      if (data) setPlanId(data.id);
    }
    setSaving(false);
  }

  const [videoClips, setVideoClips] = useState('');

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ThemedText style={s.planLabel}>OPPONENT NOTES</ThemedText>
      <TextInput
        style={s.planTextArea}
        placeholder="Tendencies, key players to watch, their power play style..."
        placeholderTextColor={MUTED}
        value={opponent}
        onChangeText={setOpponent}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <ThemedText style={s.planLabel}>OUR GAME PLAN</ThemedText>
      <TextInput
        style={s.planTextArea}
        placeholder="What we want to do well tonight, systems focus..."
        placeholderTextColor={MUTED}
        value={gamePlan}
        onChangeText={setGamePlan}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <View style={s.planSectionRow}>
        <ThemedText style={s.planLabel}>KEY MATCHUPS</ThemedText>
        <TouchableOpacity activeOpacity={0.8}>
          <ThemedText style={s.addLink}>+ Add</ThemedText>
        </TouchableOpacity>
      </View>
      <ThemedText style={s.emptyLine}>No matchups yet.</ThemedText>

      <View style={[s.planSectionRow, { marginTop: 14 }]}>
        <ThemedText style={s.planLabel}>DRILLS TO REFERENCE</ThemedText>
        <TouchableOpacity activeOpacity={0.8}>
          <ThemedText style={s.addLink}>+ Add</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedText style={[s.planLabel, { marginTop: 14 }]}>VIDEO CLIP IDS (ONE PER LINE)</ThemedText>
      <TextInput
        style={s.planTextArea}
        placeholder="Optional — paste film library IDs"
        placeholderTextColor={MUTED}
        value={videoClips}
        onChangeText={setVideoClips}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 16, marginBottom: 32 }} onPress={handleSave} disabled={saving}>
        <LinearGradient colors={saving ? [MUTED, MUTED] : [TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
          <ThemedText style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Game Plan'}</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────
function NotesTab({ gameId }: { gameId: string }) {
  const [pepTalk, setPepTalk]   = useState('');
  const [p1, setP1]             = useState('');
  const [p2, setP2]             = useState('');
  const [p3, setP3]             = useState('');
  const [postGame, setPostGame] = useState('');
  const [planId,   setPlanId]   = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('game_plans').select('id, period1_notes, period2_notes, period3_notes, postgame_notes')
        .eq('game_id', gameId).maybeSingle();
      if (data) {
        setPlanId(data.id);
        setP1(data.period1_notes ?? '');
        setP2(data.period2_notes ?? '');
        setP3(data.period3_notes ?? '');
        setPostGame(data.postgame_notes ?? '');
      }
    })();
  }, [gameId]);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = { period1_notes: p1, period2_notes: p2, period3_notes: p3, postgame_notes: postGame, updated_at: new Date().toISOString() };
    if (planId) {
      await supabase.from('game_plans').update(payload).eq('id', planId);
    } else {
      const { data } = await supabase.from('game_plans').insert({ game_id: gameId, coach_id: user.id, ...payload }).select('id').single();
      if (data) setPlanId(data.id);
    }
    setSaving(false);
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Private badge */}
      <View style={s.privateBadge}>
        <Ionicons name="lock-closed" size={13} color={ORANGE} style={{ marginRight: 6 }} />
        <ThemedText style={s.privateBadgeText}>Private — coaching staff only</ThemedText>
      </View>

      <ThemedText style={s.planLabel}>PRE-GAME PEP TALK</ThemedText>
      <TextInput
        style={s.planTextArea}
        placeholder="Speech, bullet points, themes..."
        placeholderTextColor={MUTED}
        value={pepTalk}
        onChangeText={setPepTalk}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <ThemedText style={[s.planLabel, { marginTop: 14 }]}>BETWEEN PERIODS</ThemedText>
      {[
        { label: 'PERIOD 1', val: p1, set: setP1 },
        { label: 'PERIOD 2', val: p2, set: setP2 },
        { label: 'PERIOD 3', val: p3, set: setP3 },
      ].map(({ label, val, set }) => (
        <View key={label} style={s.periodCard}>
          <ThemedText style={s.periodLabel}>{label}</ThemedText>
          <TextInput
            style={s.periodInput}
            placeholder="Adjustments and messaging..."
            placeholderTextColor={MUTED}
            value={val}
            onChangeText={set}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      ))}

      <ThemedText style={[s.planLabel, { marginTop: 14 }]}>POST-GAME NOTES</ThemedText>
      <TextInput
        style={s.planTextArea}
        placeholder="What went well, what to fix, themes for next practice..."
        placeholderTextColor={MUTED}
        value={postGame}
        onChangeText={setPostGame}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <ThemedText style={s.notesFooter}>
        These notes feed into athlete session notes for individual evaluations.
      </ThemedText>

      <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 16, marginBottom: 32 }} onPress={handleSave} disabled={saving}>
        <LinearGradient colors={saving ? [MUTED, MUTED] : [TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
          <ThemedText style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Notes'}</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Publish Tab ──────────────────────────────────────────────────────────────
function PublishTab() {
  const [shareLineup,   setShareLineup]   = useState(false);
  const [shareGamePlan, setShareGamePlan] = useState(false);
  const [shareSystems,  setShareSystems]  = useState(false);
  const [shareMessage,  setShareMessage]  = useState(false);

  const toggles = [
    { label: 'Share Lineup',       sub: 'Forward lines, defense pairs, starting goalie, PP/PK', val: shareLineup,   set: setShareLineup   },
    { label: 'Share Game Plan',    sub: 'Parent-facing version — separate from your private notes', val: shareGamePlan, set: setShareGamePlan },
    { label: 'Share Team Systems', sub: 'Forecheck, D-zone, PP, PK in your own words',          val: shareSystems,  set: setShareSystems  },
    { label: 'Share Coach Message',sub: 'A motivational note shown to parents and athletes',    val: shareMessage,  set: setShareMessage  },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Info card */}
      <View style={s.shareInfoCard}>
        <ThemedText style={s.shareInfoTitle}>Share to Parents</ThemedText>
        <ThemedText style={s.shareInfoText}>
          Toggle any section on to push it to parents' Game Day screen. Your private notes (opponent scouting, between-period adjustments) stay hidden.
        </ThemedText>
      </View>

      {toggles.map(t => (
        <View key={t.label} style={s.toggleRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <ThemedText style={s.toggleLabel}>{t.label}</ThemedText>
            <ThemedText style={s.toggleSub}>{t.sub}</ThemedText>
          </View>
          <Switch
            value={t.val}
            onValueChange={t.set}
            trackColor={{ false: BORDER, true: TEAL }}
            thumbColor={TEXT}
          />
        </View>
      ))}

      <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 20, marginBottom: 32 }}>
        <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
          <ThemedText style={s.saveBtnText}>Publish to Parents</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Game Prep View ───────────────────────────────────────────────────────────
function GamePrepView({ onBack, gameId }: { onBack: () => void; gameId: string }) {
  const [prepTab, setPrepTab] = useState<PrepTab>('lines');
  const prepTabs: { key: PrepTab; label: string; icon: string }[] = [
    { key: 'lines',   label: 'Lines',   icon: 'people-outline'       },
    { key: 'plan',    label: 'Plan',    icon: 'document-text-outline' },
    { key: 'notes',   label: 'Notes',   icon: 'create-outline'        },
    { key: 'publish', label: 'Publish', icon: 'megaphone-outline'     },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-nav row */}
      <View style={s.prepNavRow}>
        <TouchableOpacity onPress={onBack} style={s.prepBackBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={16} color={TEXT} />
          <ThemedText style={s.prepBackText}>Back</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85}>
          <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.summaryBtn}>
            <Ionicons name="document-outline" size={15} color="#000" style={{ marginRight: 5 }} />
            <ThemedText style={s.summaryBtnText}>Summary</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ThemedText style={s.prepTitle}>Game Plan</ThemedText>

      {/* Prep tab selector */}
      <View style={s.prepTabBar}>
        {prepTabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.prepTabBtn, prepTab === t.key && s.prepTabBtnActive]}
            onPress={() => setPrepTab(t.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={t.icon as any}
              size={14}
              color={prepTab === t.key ? '#000' : MUTED}
              style={{ marginRight: 4 }}
            />
            <ThemedText style={[s.prepTabText, prepTab === t.key && s.prepTabTextActive]}>
              {t.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {prepTab === 'lines'   && <LinesTab />}
        {prepTab === 'plan'    && <PlanTab gameId={gameId} />}
        {prepTab === 'notes'   && <NotesTab gameId={gameId} />}
        {prepTab === 'publish' && <PublishTab />}
      </View>
    </View>
  );
}

// ─── Main Game View ───────────────────────────────────────────────────────────
const MEDIA_FILTER = ['All', 'Photos', 'Highlights', 'Full Game', 'Tagged'] as const;
type FilmClip = { id: string; title: string | null; created_at: string | null };

type PlayerRow = { id: string; name: string };

// ── Scoresheet types ──────────────────────────────────────────────────────────
type ParsedGoal = {
  period: number | null; time: string | null; player: string | null;
  team: 'home' | 'away' | null; assist1: string | null; assist2: string | null; goal_type: string | null;
};
type ParsedPenalty = {
  period: number | null; time: string | null; player: string | null;
  team: 'home' | 'away' | null; infraction: string | null; duration: number | null;
};
type ReviewItem = {
  id: string; kind: 'score' | 'goal' | 'penalty';
  label: string; sub: string; checked: boolean; data: any;
};

function MainGameView({ onGamePrep, game, rsvp, onScoreUpdate, filmClips }: {
  onGamePrep: () => void;
  game: GameData;
  rsvp: RsvpCounts;
  onScoreUpdate: (homeScore: number, awayScore: number) => void;
  filmClips: FilmClip[];
}) {
  const [mediaFilter, setMediaFilter] = useState<string>('All');
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreHome, setScoreHome] = useState(String(game.home_score ?? ''));
  const [scoreAway, setScoreAway] = useState(String(game.away_score ?? ''));
  const [scoreSaving, setScoreSaving] = useState(false);

  // Expandable sections
  const [showAttendance, setShowAttendance] = useState(false);
  const [showStats,      setShowStats]      = useState(false);
  const [showMedia,      setShowMedia]      = useState(true);

  // Roster for attendance + stats
  const [players,    setPlayers]    = useState<PlayerRow[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!game.team_id) return;
    void (async () => {
      const { data } = await supabase
        .from('players').select('id, name')
        .eq('team_id', game.team_id).order('name');
      setPlayers((data ?? []) as PlayerRow[]);
    })();
  }, [game.team_id]);

  async function handlePickMedia(type: 'photo' | 'video') {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      Alert.alert('Selected', `${result.assets.length} file(s) selected. Media upload to storage coming soon.`);
    }
  }

  // ── Scoresheet state ───────────────────────────────────────────────────────
  const [sheetParsing, setSheetParsing] = useState(false);
  const [reviewItems,  setReviewItems]  = useState<ReviewItem[]>([]);
  const [sheetSaving,  setSheetSaving]  = useState(false);
  const [showSheet,    setShowSheet]    = useState(false);

  async function handleUploadScoresheet() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setShowSheet(true);
    setSheetParsing(true);
    setReviewItems([]);

    try {
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const homeTeam = game.home_away === 'home' ? game.teamName : game.opponent;
      const awayTeam = game.home_away === 'home' ? game.opponent : game.teamName;

      const { data, error } = await supabase.functions.invoke('parse-scoresheet', {
        body: {
          imageBase64: asset.base64,
          mediaType,
          homeTeam,
          awayTeam,
          roster: players.map(p => p.name),
        },
      });

      if (error || !data) throw new Error(error?.message ?? 'No response from AI');

      const items: ReviewItem[] = [];
      let uid = 0;

      // Score
      if (data.home_score != null || data.away_score != null) {
        const hs  = data.home_score ?? '?';
        const as_ = data.away_score ?? '?';
        const win = data.home_score != null && data.away_score != null
          ? (data.home_score > data.away_score ? `Win for ${homeTeam}` : data.home_score < data.away_score ? `Win for ${awayTeam}` : 'Tie')
          : '';
        items.push({
          id: String(uid++), kind: 'score',
          label: `${hs} – ${as_}`,
          sub: win,
          checked: true,
          data: { home_score: data.home_score, away_score: data.away_score },
        });
      }

      // Goals
      for (const g of (data.goals ?? []) as ParsedGoal[]) {
        const assists = [g.assist1, g.assist2].filter(Boolean).join(', ');
        items.push({
          id: String(uid++), kind: 'goal',
          label: `GOAL  ${g.player ?? '?'}  ${g.time ?? ''}${g.period ? `  (P${g.period})` : ''}`,
          sub: [g.goal_type ?? 'ES', assists ? `Assists: ${assists}` : '', g.team === 'home' ? homeTeam : awayTeam].filter(Boolean).join(' · '),
          checked: true,
          data: g,
        });
      }

      // Penalties
      for (const p of (data.penalties ?? []) as ParsedPenalty[]) {
        items.push({
          id: String(uid++), kind: 'penalty',
          label: `PENALTY  ${p.player ?? '?'}  ${p.time ?? ''}${p.period ? `  (P${p.period})` : ''}`,
          sub: [p.infraction ?? '?', p.duration ? `${p.duration} min` : '', p.team === 'home' ? homeTeam : awayTeam].filter(Boolean).join(' · '),
          checked: true,
          data: p,
        });
      }

      setReviewItems(items);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not parse scoresheet');
      setShowSheet(false);
    } finally {
      setSheetParsing(false);
    }
  }

  async function handleSaveScoresheet() {
    setSheetSaving(true);
    const checkedItems = reviewItems.filter(i => i.checked);

    // Save score to games table
    const scoreItem = checkedItems.find(i => i.kind === 'score');
    if (scoreItem) {
      const h = scoreItem.data.home_score;
      const a = scoreItem.data.away_score;
      if (h != null && a != null) {
        await supabase.from('games')
          .update({ home_score: h, away_score: a, status: 'final' })
          .eq('id', game.id);
        onScoreUpdate(h, a);
      }
    }

    // Save goals
    const goals = checkedItems.filter(i => i.kind === 'goal');
    if (goals.length > 0) {
      await supabase.from('game_events').insert(
        goals.map(i => ({
          regular_game_id: game.id,
          event_type:      'goal',
          period:          i.data.period ?? null,
          time_in_period:  i.data.time ?? null,
          player_name:     i.data.player ?? null,
          team:            i.data.team ?? null,
          goal_type:       i.data.goal_type ?? 'ES',
          assist1:         i.data.assist1 ?? null,
          assist2:         i.data.assist2 ?? null,
        }))
      );
    }

    // Save penalties
    const pens = checkedItems.filter(i => i.kind === 'penalty');
    if (pens.length > 0) {
      await supabase.from('game_events').insert(
        pens.map(i => ({
          regular_game_id:  game.id,
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
    setShowSheet(false);
    setReviewItems([]);
  }

  async function handleSaveScore() {
    const h = parseInt(scoreHome, 10);
    const a = parseInt(scoreAway, 10);
    if (isNaN(h) || isNaN(a)) return;
    setScoreSaving(true);
    await supabase.from('games')
      .update({ home_score: h, away_score: a, status: 'final' })
      .eq('id', game.id);
    onScoreUpdate(h, a);
    setShowScoreModal(false);
    setScoreSaving(false);
  }

  const isFinal = game.status === 'final';
  const myScore = game.home_away === 'home' ? game.home_score : game.away_score;
  const theirScore = game.home_away === 'home' ? game.away_score : game.home_score;
  const weWon = isFinal && myScore != null && theirScore != null && myScore > theirScore;
  const weLost = isFinal && myScore != null && theirScore != null && myScore < theirScore;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Game header card */}
      <View style={s.gameHeaderCard}>
        <ThemedText style={s.gameTypeLabel}>GAME</ThemedText>
        <ThemedText style={s.gameOpponent}>vs {game.opponent}</ThemedText>
        <ThemedText style={s.gameMeta}>
          {fmtGameDate(game.game_date, game.game_time)}{game.location ? ` · ${game.location}` : ''}
        </ThemedText>
      </View>

      {/* Score card */}
      <TouchableOpacity
        style={s.scoreCard}
        activeOpacity={0.85}
        onPress={() => { setScoreHome(String(game.home_score ?? '')); setScoreAway(String(game.away_score ?? '')); setShowScoreModal(true); }}
      >
        {isFinal ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <ThemedText style={s.scoreName}>{game.teamName.toUpperCase()}</ThemedText>
                <ThemedText style={[s.scoreNum, { color: weWon ? GREEN : weLost ? RED : TEXT }]}>
                  {game.home_away === 'home' ? game.home_score : game.away_score}
                </ThemedText>
              </View>
              <ThemedText style={s.scoreDash}>—</ThemedText>
              <View style={{ alignItems: 'center' }}>
                <ThemedText style={s.scoreName}>{game.opponent.toUpperCase()}</ThemedText>
                <ThemedText style={[s.scoreNum, { color: weLost ? GREEN : weWon ? RED : TEXT }]}>
                  {game.home_away === 'home' ? game.away_score : game.home_score}
                </ThemedText>
              </View>
            </View>
            <View style={[s.resultBadge, { backgroundColor: weWon ? 'rgba(61,255,143,0.15)' : weLost ? 'rgba(239,68,68,0.15)' : 'rgba(139,148,158,0.15)' }]}>
              <ThemedText style={[s.resultBadgeText, { color: weWon ? GREEN : weLost ? RED : MUTED }]}>
                {weWon ? 'WIN' : weLost ? 'LOSS' : 'TIE'} · FINAL
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Ionicons name="trophy-outline" size={22} color={MUTED} />
            <ThemedText style={{ fontSize: 13, color: MUTED, fontWeight: '600' }}>Tap to enter final score</ThemedText>
          </View>
        )}
      </TouchableOpacity>

      {/* Score entry modal */}
      <Modal visible={showScoreModal} transparent animationType="slide" onRequestClose={() => setShowScoreModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowScoreModal(false)}>
            <TouchableOpacity style={s.modalSheet} activeOpacity={1}>
              <View style={s.modalHandle} />
              <ThemedText style={s.modalTitle}>Final Score</ThemedText>
              <View style={s.scoreInputRow}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <ThemedText style={s.scoreInputLabel}>{game.teamName}</ThemedText>
                  <TextInput
                    style={s.scoreInput}
                    value={scoreHome}
                    onChangeText={setScoreHome}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={MUTED}
                    maxLength={2}
                  />
                </View>
                <ThemedText style={[s.scoreDash, { marginTop: 32 }]}>—</ThemedText>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <ThemedText style={s.scoreInputLabel}>{game.opponent}</ThemedText>
                  <TextInput
                    style={s.scoreInput}
                    value={scoreAway}
                    onChangeText={setScoreAway}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={MUTED}
                    maxLength={2}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[s.scoreSaveBtn, scoreSaving && { opacity: 0.5 }]}
                onPress={() => void handleSaveScore()}
                disabled={scoreSaving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.scoreSaveBtnGrad}>
                  <ThemedText style={s.scoreSaveBtnText}>{scoreSaving ? 'Saving…' : 'Save Score'}</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* RSVP grid */}
      <View style={s.rsvpGrid}>
        {[
          { label: 'YES',   val: rsvp.yes,   color: TEAL   },
          { label: 'NO',    val: rsvp.no,    color: RED     },
          { label: 'MAYBE', val: rsvp.maybe, color: ORANGE  },
          { label: 'NONE',  val: rsvp.none,  color: MUTED   },
        ].map(r => (
          <View key={r.label} style={s.rsvpCard}>
            <ThemedText style={[s.rsvpNum, { color: r.color }]}>{r.val}</ThemedText>
            <ThemedText style={s.rsvpLabel}>{r.label}</ThemedText>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={s.actionRow}>
        <TouchableOpacity style={{ flex: 1, marginRight: 8 }} onPress={onGamePrep} activeOpacity={0.85}>
          <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.gamePrepBtn}>
            <Ionicons name="trophy-outline" size={18} color="#000" style={{ marginRight: 6 }} />
            <ThemedText style={s.gamePrepBtnText}>Game Prep</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statsBtn, { flex: 1 }]} activeOpacity={0.8} onPress={() => setShowStats(v => !v)}>
          <Ionicons name="bar-chart-outline" size={18} color={TEAL} style={{ marginRight: 6 }} />
          <ThemedText style={s.statsBtnText}>Stats</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Scoresheet button */}
      <TouchableOpacity
        style={s.scoresheetBannerBtn}
        activeOpacity={0.85}
        onPress={() => void handleUploadScoresheet()}
      >
        <Ionicons name="camera-outline" size={17} color={TEAL} style={{ marginRight: 8 }} />
        <ThemedText style={s.scoresheetBannerTxt}>Upload Scoresheet</ThemedText>
        <View style={{ flex: 1 }} />
        <ThemedText style={{ fontSize: 11, color: MUTED }}>AI reads handwriting</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      {/* Scoresheet Review Modal */}
      <Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => { setShowSheet(false); setReviewItems([]); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => { setShowSheet(false); setReviewItems([]); }}>
            <TouchableOpacity style={[s.modalSheet, { flex: 1 }]} activeOpacity={1}>
              <View style={s.modalHandle} />
              <View style={s.sheetHeader}>
                <View>
                  <ThemedText style={s.modalTitle}>Scoresheet</ThemedText>
                  <ThemedText style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>vs {game.opponent}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => { setShowSheet(false); setReviewItems([]); }} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              {sheetParsing ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <ActivityIndicator size="large" color={TEAL} />
                  <ThemedText style={{ fontSize: 14, color: MUTED, textAlign: 'center' }}>Reading scoresheet…</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: MUTED, textAlign: 'center' }}>AI is extracting goals, assists and penalties</ThemedText>
                </View>
              ) : reviewItems.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Ionicons name="document-outline" size={36} color={MUTED} />
                  <ThemedText style={{ fontSize: 13, color: MUTED }}>No items extracted</ThemedText>
                </View>
              ) : (
                <>
                  <ThemedText style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
                    Tap to uncheck any items that look wrong before saving.
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
                          {item.sub ? <ThemedText style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{item.sub}</ThemedText> : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                    <View style={{ height: 16 }} />
                  </ScrollView>

                  <TouchableOpacity
                    style={[s.sheetSaveBtn, (sheetSaving || reviewItems.every(i => !i.checked)) && { opacity: 0.5 }]}
                    onPress={() => void handleSaveScoresheet()}
                    disabled={sheetSaving || reviewItems.every(i => !i.checked)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sheetSaveGrad}>
                      <ThemedText style={s.sheetSaveTxt}>
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

      {/* Volunteers */}
      <EventVolunteers
        entityType="game"
        entityId={game.id}
        teamId={game.team_id}
      />

      {/* Attendance */}
      <TouchableOpacity style={s.gameSection} activeOpacity={0.8} onPress={() => setShowAttendance(v => !v)}>
        <ThemedText style={s.gameSectionText}>Attendance</ThemedText>
        <Ionicons name={showAttendance ? 'chevron-up' : 'chevron-forward'} size={18} color={MUTED} />
      </TouchableOpacity>
      {showAttendance && (
        <View style={s.expandCard}>
          {players.length === 0 ? (
            <ThemedText style={s.expandEmpty}>No players on roster.</ThemedText>
          ) : (
            players.map(p => (
              <TouchableOpacity
                key={p.id}
                style={s.attendanceRow}
                activeOpacity={0.75}
                onPress={() => setAttendance(a => ({ ...a, [p.id]: !a[p.id] }))}
              >
                <Ionicons
                  name={attendance[p.id] ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={attendance[p.id] ? TEAL : MUTED}
                />
                <ThemedText style={s.attendanceName}>{p.name}</ThemedText>
                <ThemedText style={[s.attendanceStatus, { color: attendance[p.id] ? TEAL : MUTED }]}>
                  {attendance[p.id] ? 'Present' : 'Not marked'}
                </ThemedText>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Post-game stats */}
      <TouchableOpacity style={s.gameSection} activeOpacity={0.8} onPress={() => setShowStats(v => !v)}>
        <ThemedText style={s.gameSectionText}>Post-game stats</ThemedText>
        <Ionicons name={showStats ? 'chevron-up' : 'chevron-forward'} size={18} color={MUTED} />
      </TouchableOpacity>
      {showStats && (
        <View style={s.expandCard}>
          {players.length === 0 ? (
            <ThemedText style={s.expandEmpty}>No players on roster.</ThemedText>
          ) : (
            <>
              <View style={s.statsHeaderRow}>
                <ThemedText style={[s.statsColHead, { flex: 2 }]}>Player</ThemedText>
                <ThemedText style={s.statsColHead}>G</ThemedText>
                <ThemedText style={s.statsColHead}>A</ThemedText>
                <ThemedText style={s.statsColHead}>PTS</ThemedText>
                <ThemedText style={s.statsColHead}>+/-</ThemedText>
              </View>
              {players.map(p => (
                <View key={p.id} style={s.statsPlayerRow}>
                  <ThemedText style={[s.statsPlayerName, { flex: 2 }]} numberOfLines={1}>{p.name}</ThemedText>
                  <ThemedText style={s.statsCell}>0</ThemedText>
                  <ThemedText style={s.statsCell}>0</ThemedText>
                  <ThemedText style={s.statsCell}>0</ThemedText>
                  <ThemedText style={s.statsCell}>0</ThemedText>
                </View>
              ))}
              <ThemedText style={[s.expandEmpty, { marginTop: 10 }]}>Tap cells to edit · Full stats entry coming soon</ThemedText>
            </>
          )}
        </View>
      )}

      {/* Media */}
      <TouchableOpacity style={s.gameSection} activeOpacity={0.8} onPress={() => setShowMedia(v => !v)}>
        <ThemedText style={s.gameSectionText}>Media</ThemedText>
        <Ionicons name={showMedia ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
      </TouchableOpacity>

      {/* Upload media card */}
      {showMedia && (
      <View style={s.uploadCard}>
        <View style={s.uploadHeader}>
          <Ionicons name="cloud-upload-outline" size={16} color={TEXT} style={{ marginRight: 8 }} />
          <ThemedText style={s.uploadHeaderText}>Upload Media</ThemedText>
        </View>
        <View style={s.uploadBtnRow}>
          {([
            { icon: 'images-outline',   label: 'Photos', onPress: () => void handlePickMedia('photo') },
            { icon: 'videocam-outline', label: 'Videos', onPress: () => void handlePickMedia('video') },
            { icon: 'radio-button-on',  label: 'Record', onPress: () => Alert.alert('Coming Soon', 'Live recording will be available in an upcoming update.') },
          ] as const).map(btn => (
            <TouchableOpacity key={btn.label} style={s.uploadBtn} activeOpacity={0.8} onPress={btn.onPress}>
              <Ionicons name={btn.icon as any} size={22} color={TEXT} />
              <ThemedText style={s.uploadBtnText}>{btn.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      )}

      {/* Media filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {MEDIA_FILTER.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setMediaFilter(f)}
            style={[s.filterChip, mediaFilter === f && s.filterChipActive]}
            activeOpacity={0.8}
          >
            <ThemedText style={[s.filterChipText, mediaFilter === f && s.filterChipTextActive]}>
              {f}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Media grid */}
      {filmClips.length === 0 ? (
        <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, alignItems: 'center', paddingVertical: 24, gap: 6 }}>
          <Ionicons name="film-outline" size={26} color={MUTED} />
          <ThemedText style={{ fontSize: 14, color: MUTED }}>No film clips yet</ThemedText>
        </View>
      ) : (
        <View style={s.mediaGrid}>
          {filmClips.map(clip => (
            <TouchableOpacity key={clip.id} style={s.mediaCell} activeOpacity={0.8}>
              <Ionicons name="play-circle-outline" size={32} color={TEXT} style={{ opacity: 0.6 }} />
              <View style={s.mediaLabelBadge}>
                <ThemedText style={s.mediaLabelText}>{clip.title ?? 'Clip'}</ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Highlight Reels */}
      <View style={s.reelsCard}>
        <View style={s.reelsHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="film-outline" size={16} color={TEXT} />
            <ThemedText style={s.reelsTitle}>Highlight Reels</ThemedText>
          </View>
          <TouchableOpacity
            style={s.newReelBtn}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Coming Soon', 'Highlight reel creation will be available in an upcoming update.')}
          >
            <ThemedText style={s.newReelText}>+ New Reel</ThemedText>
          </TouchableOpacity>
        </View>
        <ThemedText style={s.noReelsText}>No reels yet</ThemedText>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GameScreen() {
  const router   = useRouter();
  const params   = useLocalSearchParams<{ id: string; season?: string; division?: string; prep?: string }>();
  const id       = params.id;
  const division = params.division ?? 'AAA';

  const [view,      setView]      = useState<GameView>(params.prep === '1' ? 'prep' : 'main');
  const [game,      setGame]      = useState<GameData | null>(null);
  const [rsvp,      setRsvp]      = useState<RsvpCounts>({ yes: 0, no: 0, maybe: 0, none: 0 });
  const [loading,   setLoading]   = useState(true);
  const [filmClips, setFilmClips] = useState<FilmClip[]>([]);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    void (async () => {
      const { data: row } = await supabase
        .from('games')
        .select('id, opponent, game_date, game_time, location, home_away, home_score, away_score, status, team_id')
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

      const { data: rsvpRows } = await supabase
        .from('event_rsvps').select('status').eq('game_id', id);
      const counts: RsvpCounts = { yes: 0, no: 0, maybe: 0, none: 0 };
      (rsvpRows ?? []).forEach((r: { status: string }) => {
        if (r.status === 'yes')        counts.yes++;
        else if (r.status === 'no')    counts.no++;
        else if (r.status === 'maybe') counts.maybe++;
        else                           counts.none++;
      });

      const rawDate = row.game_date as string | null;
      const yr = rawDate ? new Date(String(rawDate).substring(0, 10) + 'T12:00:00').getFullYear() : new Date().getFullYear();
      const safeYr = isNaN(yr) ? new Date().getFullYear() : yr;
      setGame({
        id:         row.id         as string,
        opponent:   row.opponent   as string,
        game_date:  row.game_date  as string,
        game_time:  row.game_time  as string | null,
        location:   row.location   as string | null,
        home_away:  (row.home_away  as string) ?? 'home',
        home_score: row.home_score as number | null,
        away_score: row.away_score as number | null,
        status:     (row.status     as string) ?? 'upcoming',
        team_id:    row.team_id    as string | null,
        teamName,
        teamInitials,
        season: `${safeYr}-${String(safeYr + 1).slice(2)}`,
      });
      setRsvp(counts);

      // Film clips for media tab (filtered by coach)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clips } = await supabase
          .from('game_film')
          .select('id, title, created_at')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8);
        setFilmClips(clips ?? []);
      }

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

  if (!game) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <ThemedText style={{ color: TEAL }}>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={{ color: MUTED }}>Game not found.</ThemedText>
      </View>
    );
  }

  // Prep view: top nav only
  if (view === 'prep') {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.safe}>
          <View style={s.topNav}>
            <TouchableOpacity
              onPress={() => game?.team_id ? router.push(`/team/${game.team_id}?initTab=schedule` as any) : router.back()}
              style={s.backBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={16} color={TEXT} />
              <ThemedText style={s.backText}>Schedule</ThemedText>
            </TouchableOpacity>
            <View style={s.topIcons}>
              <View style={s.coachChip}><ThemedText style={s.coachChipText}>COACH</ThemedText></View>
              <TouchableOpacity style={s.iconBtn}><Ionicons name="person-circle-outline" size={22} color={MUTED} /></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn}><Ionicons name="megaphone-outline"      size={20} color={MUTED} /></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn}><Ionicons name="camera-outline"          size={20} color={MUTED} /></TouchableOpacity>
              <TouchableOpacity style={s.iconBtn}><Ionicons name="settings-outline"        size={20} color={MUTED} /></TouchableOpacity>
            </View>
          </View>
          <GamePrepView onBack={() => setView('main')} gameId={id} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <View style={s.topNav}>
          <TouchableOpacity
            onPress={() => game?.team_id ? router.push(`/team/${game.team_id}?initTab=schedule` as any) : router.back()}
            style={s.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={16} color={TEXT} />
            <ThemedText style={s.backText}>Schedule</ThemedText>
          </TouchableOpacity>
          <View style={s.topIcons}>
            <View style={s.coachChip}><ThemedText style={s.coachChipText}>COACH</ThemedText></View>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="person-circle-outline" size={22} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="megaphone-outline"      size={20} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="camera-outline"          size={20} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="settings-outline"        size={20} color={MUTED} /></TouchableOpacity>
          </View>
        </View>

        <View style={s.teamHeader}>
          <View style={s.teamAvatar}>
            <ThemedText style={s.teamInitials}>{game.teamInitials}</ThemedText>
          </View>
          <View>
            <ThemedText style={s.teamName}>{game.teamName}</ThemedText>
            <ThemedText style={s.teamSeason}>{game.season} · {division}</ThemedText>
          </View>
        </View>

        <View style={{ borderBottomWidth: 1, borderBottomColor: BORDER }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.teamTabStrip}>
          {(['Overview', 'Schedule', 'Roster', 'Tournaments', 'More'] as const).map(tabLabel => {
            const tabKey = tabLabel.toLowerCase() as 'overview' | 'schedule' | 'roster' | 'tournaments' | 'more';
            const isActive = tabLabel === 'Schedule';
            return (
              <TouchableOpacity
                key={tabLabel}
                style={s.teamTab}
                onPress={() => {
                  if (game?.team_id) {
                    router.push(`/team/${game.team_id}?initTab=${tabKey}` as any);
                  } else {
                    router.back();
                  }
                }}
                activeOpacity={0.8}
              >
                <ThemedText style={[s.teamTabText, isActive && s.teamTabTextActive]}>{tabLabel}</ThemedText>
                {isActive && <View style={s.teamTabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </View>

        <MainGameView
          onGamePrep={() => setView('prep')}
          game={game}
          rsvp={rsvp}
          onScoreUpdate={(h, a) => setGame(g => g ? { ...g, home_score: h, away_score: a, status: 'final' } : g)}
          filmClips={filmClips}
        />
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  // Founding Member banner
  memberBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 12, gap: 8 },
  memberText:   { fontSize: 13, color: TEXT, lineHeight: 18, flex: 1 },
  eliteChip:    { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 0 },
  eliteText:    { fontSize: 11, fontWeight: '800', color: '#000', textAlign: 'center', lineHeight: 15 },

  // Top nav
  topNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  backText:  { fontSize: 14, fontWeight: '600', color: TEXT },
  topIcons:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coachChip: { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL, marginRight: 4 },
  coachChipText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  iconBtn:   { padding: 6 },

  // Team header
  teamHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  teamAvatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  teamInitials: { fontSize: 16, fontWeight: '800', color: '#000' },
  teamName:     { fontSize: 18, fontWeight: '800', color: TEXT, lineHeight: 22 },
  teamSeason:   { fontSize: 13, color: MUTED, marginTop: 2 },

  // Team tab strip
  teamTabStrip: { paddingHorizontal: 16, gap: 24, paddingBottom: 2 },
  teamTab:      { paddingBottom: 12, alignItems: 'center' },
  teamTabText:  { fontSize: 14, fontWeight: '600', color: MUTED },
  teamTabTextActive: { color: TEAL, fontWeight: '700' },
  teamTabUnderline:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: TEAL, borderRadius: 1 },

  // Main game view
  gameBackRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  gameBackText:  { fontSize: 14, color: MUTED, fontWeight: '600' },

  gameHeaderCard: { backgroundColor: CARD, marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: BORDER },
  gameTypeLabel:  { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 6 },
  gameOpponent:   { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28, marginBottom: 4 },
  gameMeta:       { fontSize: 14, color: MUTED },

  rsvpGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  rsvpCard: { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  rsvpNum:  { fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 4 },
  rsvpLabel:{ fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },

  actionRow:      { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
  gamePrepBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14 },
  gamePrepBtnText:{ fontSize: 15, fontWeight: '800', color: '#000' },
  statsBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.06)' },
  statsBtnText:   { fontSize: 15, fontWeight: '700', color: TEAL },

  gameSection:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  gameSectionText:{ fontSize: 15, fontWeight: '700', color: TEXT },

  uploadCard:   { backgroundColor: CARD, marginHorizontal: 16, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  uploadHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  uploadHeaderText: { fontSize: 15, fontWeight: '700', color: TEXT },
  uploadBtnRow: { flexDirection: 'row', gap: 8 },
  uploadBtn:    { flex: 1, backgroundColor: BG, borderRadius: 10, paddingVertical: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: BORDER },
  uploadBtnText:{ fontSize: 12, fontWeight: '600', color: TEXT },

  filterRow:     { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  filterChipActive:    { backgroundColor: TEAL, borderColor: TEAL },
  filterChipText:      { fontSize: 13, fontWeight: '600', color: MUTED },
  filterChipTextActive:{ color: '#000', fontWeight: '700' },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  mediaCell: {
    width: '48%', aspectRatio: 1.2,
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  mediaLabelBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  mediaLabelText:  { fontSize: 11, fontWeight: '700', color: TEXT },

  reelsCard:   { backgroundColor: CARD, marginHorizontal: 16, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER },
  reelsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  reelsTitle:  { fontSize: 15, fontWeight: '700', color: TEXT },
  newReelBtn:  { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  newReelText: { fontSize: 13, fontWeight: '700', color: '#000' },
  noReelsText: { fontSize: 14, color: MUTED },

  // Game Prep
  prepNavRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  prepBackBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prepBackText: { fontSize: 15, fontWeight: '600', color: TEXT },
  summaryBtn:   { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  summaryBtnText:{ fontSize: 14, fontWeight: '800', color: '#000' },
  prepTitle:    { fontSize: 22, fontWeight: '800', color: TEXT, paddingHorizontal: 16, marginBottom: 14, lineHeight: 28 },

  prepTabBar: { flexDirection: 'row', backgroundColor: CARD, marginHorizontal: 16, borderRadius: 30, padding: 4, marginBottom: 14 },
  prepTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 26 },
  prepTabBtnActive: { backgroundColor: GREEN },
  prepTabText: { fontSize: 12, fontWeight: '600', color: MUTED },
  prepTabTextActive: { color: '#000', fontWeight: '700' },

  // Lines
  lineupToggle: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 30, padding: 4, marginBottom: 14 },
  lineupToggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 26 },
  lineupToggleBtnActive: { backgroundColor: TEAL },
  lineupToggleText: { fontSize: 12, fontWeight: '600', color: MUTED },
  lineupToggleTextActive: { color: '#000', fontWeight: '700' },

  linesLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  lineCard:   { backgroundColor: CARD, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER, marginBottom: 8 },
  lineNum:    { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 10 },
  lineRow:    { flexDirection: 'row', gap: 8 },

  picker:      { flex: 1, backgroundColor: BG, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: BORDER },
  pickerPos:   { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6 },
  pickerValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerDash:  { fontSize: 16, color: MUTED },

  // Plan
  planLabel:      { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  planTextArea:   { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, color: TEXT, fontSize: 14, minHeight: 90, marginBottom: 14 },
  planSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addLink:        { fontSize: 14, fontWeight: '700', color: TEAL },
  emptyLine:      { fontSize: 14, color: MUTED, marginTop: 6 },

  // Notes
  privateBadge:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', marginBottom: 16 },
  privateBadgeText:{ fontSize: 13, fontWeight: '700', color: ORANGE },
  periodCard:      { backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 8 },
  periodLabel:     { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  periodInput:     { color: TEXT, fontSize: 14, minHeight: 70 },
  notesFooter:     { fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 18 },

  // Publish
  shareInfoCard:  { backgroundColor: 'rgba(0,196,180,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', padding: 16, marginBottom: 12 },
  shareInfoTitle: { fontSize: 15, fontWeight: '800', color: TEAL, marginBottom: 6 },
  shareInfoText:  { fontSize: 13, color: MUTED, lineHeight: 19 },
  toggleRow:      { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  toggleLabel:    { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  toggleSub:      { fontSize: 12, color: MUTED },

  // Shared
  saveBtn:     { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },

  // Score card
  scoreCard:        { backgroundColor: CARD, marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  scoreName:        { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 6 },
  scoreNum:         { fontSize: 40, fontWeight: '800', lineHeight: 48 },
  scoreDash:        { fontSize: 24, fontWeight: '700', color: MUTED, lineHeight: 32 },
  resultBadge:      { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },
  resultBadgeText:  { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  // Scoresheet
  scoresheetBannerBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  scoresheetBannerTxt: { fontSize: 15, fontWeight: '700', color: TEXT },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetSaveBtn:   { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  sheetSaveGrad:  { paddingVertical: 16, alignItems: 'center' },
  sheetSaveTxt:   { fontSize: 16, fontWeight: '800', color: '#000' },
  reviewRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  reviewRowUnchecked:{ opacity: 0.4 },
  reviewCheck:       { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  reviewCheckOn:     { backgroundColor: TEAL, borderColor: TEAL },
  reviewKindBadge:   { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  reviewKindTxt:     { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  reviewLabel:       { fontSize: 13, fontWeight: '700', color: TEXT },

  // Expandable sections
  expandCard:      { backgroundColor: CARD, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  expandEmpty:     { fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 8 },
  attendanceRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  attendanceName:  { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT },
  attendanceStatus:{ fontSize: 13, fontWeight: '600' },
  statsHeaderRow:  { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 4 },
  statsColHead:    { flex: 1, fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, textAlign: 'center' },
  statsPlayerRow:  { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  statsPlayerName: { fontSize: 14, fontWeight: '600', color: TEXT },
  statsCell:       { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT, textAlign: 'center' },

  // Score modal
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:       { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12 },
  modalHandle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20 },
  modalTitle:       { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 20, textAlign: 'center', lineHeight: 26 },
  scoreInputRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8, marginBottom: 24 },
  scoreInputLabel:  { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  scoreInput:       { width: 80, backgroundColor: BG, borderRadius: 14, padding: 16, fontSize: 32, fontWeight: '800', color: TEXT, textAlign: 'center', borderWidth: 1, borderColor: BORDER, lineHeight: 40 },
  scoreSaveBtn:     { borderRadius: 14, overflow: 'hidden' },
  scoreSaveBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  scoreSaveBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
});
