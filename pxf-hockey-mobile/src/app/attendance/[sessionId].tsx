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

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type AttStatus = 'present' | 'absent' | 'late' | 'unknown';

type Player = {
  id: string;
  full_name: string;
  jersey_number: string | null;
  position: string | null;
};

type SessionInfo = {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  team_id: string | null;
};

function fmtDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

const STATUS_CONFIG: Record<AttStatus, { label: string; color: string; bg: string; icon: string }> = {
  present: { label: 'Present', color: TEAL,   bg: 'rgba(0,196,180,0.15)',   icon: 'checkmark-circle' },
  late:    { label: 'Late',    color: ORANGE,  bg: 'rgba(245,158,11,0.15)', icon: 'time-outline' },
  absent:  { label: 'Absent',  color: RED,     bg: 'rgba(239,68,68,0.15)',  icon: 'close-circle' },
  unknown: { label: '—',       color: MUTED,   bg: 'transparent',           icon: 'help-circle-outline' },
};

export default function AttendanceScreen() {
  const router    = useRouter();
  const params    = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session,  setSession]  = useState<SessionInfo | null>(null);
  const [players,  setPlayers]  = useState<Player[]>([]);
  const [marks,    setMarks]    = useState<Record<string, AttStatus>>({});
  const [saving,   setSaving]   = useState<Record<string, boolean>>({});
  const [loading,  setLoading]  = useState(true);
  const [userId,   setUserId]   = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      // Load session info
      const { data: sessRow } = await supabase
        .from('sessions')
        .select('id, title, date, time, location, team_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (!sessRow) { setLoading(false); return; }
      setSession(sessRow as SessionInfo);

      // Load players from team, ordered by jersey number
      const { data: playerRows } = await supabase
        .from('players')
        .select('id, full_name, jersey_number, position')
        .eq('team_id', sessRow.team_id)
        .order('jersey_number', { ascending: true });

      setPlayers((playerRows ?? []) as Player[]);

      // Load any existing attendance marks for this session
      const { data: attRows } = await supabase
        .from('attendance_records')
        .select('player_id, status')
        .eq('session_id', sessionId);

      const init: Record<string, AttStatus> = {};
      (attRows ?? []).forEach((r: { player_id: string; status: string }) => {
        init[r.player_id] = r.status as AttStatus;
      });
      setMarks(init);
      setLoading(false);
    })();
  }, [sessionId]);

  async function markPlayer(playerId: string, status: AttStatus) {
    if (!userId) return;
    setMarks(prev => ({ ...prev, [playerId]: status }));
    setSaving(prev => ({ ...prev, [playerId]: true }));

    // Upsert: check if record already exists then update or insert
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from('attendance_records')
        .update({ status, marked_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('attendance_records').insert({
        coach_id:   userId,
        session_id: sessionId,
        player_id:  playerId,
        status,
        marked_at:  new Date().toISOString(),
      });
    }

    setSaving(prev => ({ ...prev, [playerId]: false }));
  }

  function markAll(status: AttStatus) {
    players.forEach(p => { void markPlayer(p.id, status); });
  }

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <ThemedText style={{ color: TEAL }}>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={{ color: MUTED }}>Session not found.</ThemedText>
      </View>
    );
  }

  const markedCount   = Object.values(marks).filter(m => m !== 'unknown').length;
  const presentCount  = Object.values(marks).filter(m => m === 'present').length;
  const lateCount     = Object.values(marks).filter(m => m === 'late').length;
  const absentCount   = Object.values(marks).filter(m => m === 'absent').length;
  const totalCount    = players.length;
  const progress      = totalCount > 0 ? (markedCount / totalCount) : 0;

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={18} color={TEXT} />
            <ThemedText style={s.backText}>Back</ThemedText>
          </TouchableOpacity>
          <View style={s.coachChip}>
            <ThemedText style={s.coachChipText}>COACH</ThemedText>
          </View>
        </View>

        {/* Title block */}
        <View style={s.titleBlock}>
          <ThemedText style={s.screenTitle}>Attendance</ThemedText>
          <ThemedText style={s.sessionName} numberOfLines={1}>{session.title}</ThemedText>
          <ThemedText style={s.sessionMeta}>
            {fmtDate(session.date)}
            {session.time ? ` · ${session.time.slice(0, 5)}` : ''}
            {session.location ? ` · ${session.location}` : ''}
          </ThemedText>
        </View>

        {/* Progress */}
        <View style={s.progressRow}>
          <View style={s.progressLabelRow}>
            <ThemedText style={s.progressText}>{markedCount} of {totalCount} marked</ThemedText>
            <ThemedText style={[s.progressText, { color: progress === 1 ? TEAL : MUTED }]}>
              {Math.round(progress * 100)}%
            </ThemedText>
          </View>
          <View style={s.progressBarBg}>
            <LinearGradient
              colors={[TEAL, GREEN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>

        {/* Quick-mark row */}
        <View style={s.quickRow}>
          <TouchableOpacity style={[s.quickBtn, { borderColor: TEAL }]} onPress={() => markAll('present')} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={16} color={TEAL} />
            <ThemedText style={[s.quickBtnText, { color: TEAL }]}>All Present</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[s.quickBtn, { borderColor: BORDER }]} onPress={() => markAll('unknown')} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={16} color={MUTED} />
            <ThemedText style={[s.quickBtnText, { color: MUTED }]}>Reset</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Player list */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {players.length === 0 && (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={36} color={MUTED} />
              <ThemedText style={s.emptyText}>No players on this team's roster yet.</ThemedText>
            </View>
          )}

          {players.map(player => {
            const status   = marks[player.id] ?? 'unknown';
            const cfg      = STATUS_CONFIG[status];
            const isSaving = saving[player.id] ?? false;

            return (
              <View
                key={player.id}
                style={[s.playerCard, { borderLeftColor: status !== 'unknown' ? cfg.color : BORDER }]}
              >
                <View style={s.playerLeft}>
                  <View style={[s.jerseyBadge, status !== 'unknown' && { borderColor: cfg.color, backgroundColor: cfg.bg }]}>
                    <ThemedText style={[s.jerseyNum, { color: status !== 'unknown' ? cfg.color : MUTED }]}>
                      {player.jersey_number != null ? `#${player.jersey_number}` : '—'}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.playerName}>{player.full_name}</ThemedText>
                    {player.position != null && (
                      <ThemedText style={s.playerPos}>{player.position}</ThemedText>
                    )}
                  </View>
                </View>

                {isSaving ? (
                  <ActivityIndicator size="small" color={TEAL} style={{ marginRight: 4 }} />
                ) : (
                  <View style={s.markBtns}>
                    {(['present', 'late', 'absent'] as AttStatus[]).map(st => {
                      const c        = STATUS_CONFIG[st];
                      const isActive = status === st;
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[s.markBtn, isActive && { backgroundColor: c.bg, borderColor: c.color }]}
                          onPress={() => void markPlayer(player.id, st)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name={c.icon as any} size={20} color={isActive ? c.color : MUTED} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Footer summary */}
        <View style={s.footer}>
          <View style={s.footerStats}>
            <View style={s.footerStat}>
              <ThemedText style={[s.footerStatNum, { color: TEAL }]}>{presentCount}</ThemedText>
              <ThemedText style={s.footerStatLabel}>PRESENT</ThemedText>
            </View>
            <View style={s.footerDivider} />
            <View style={s.footerStat}>
              <ThemedText style={[s.footerStatNum, { color: ORANGE }]}>{lateCount}</ThemedText>
              <ThemedText style={s.footerStatLabel}>LATE</ThemedText>
            </View>
            <View style={s.footerDivider} />
            <View style={s.footerStat}>
              <ThemedText style={[s.footerStatNum, { color: RED }]}>{absentCount}</ThemedText>
              <ThemedText style={s.footerStatLabel}>ABSENT</ThemedText>
            </View>
            <View style={s.footerDivider} />
            <View style={s.footerStat}>
              <ThemedText style={[s.footerStatNum, { color: MUTED }]}>{totalCount - markedCount}</ThemedText>
              <ThemedText style={s.footerStatLabel}>UNMARKED</ThemedText>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  backText: { fontSize: 14, fontWeight: '600', color: TEXT },
  coachChip: { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL },
  coachChipText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },

  titleBlock:  { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: TEXT, lineHeight: 34, marginBottom: 4 },
  sessionName: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 4 },
  sessionMeta: { fontSize: 13, color: MUTED },

  progressRow:      { paddingHorizontal: 16, marginBottom: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText:     { fontSize: 13, color: MUTED, fontWeight: '600' },
  progressBarBg:    { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressBarFill:  { height: '100%', borderRadius: 3 },

  quickRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  quickBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  quickBtnText:{ fontSize: 13, fontWeight: '700' },

  list:      { paddingHorizontal: 16, paddingTop: 4 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center' },

  playerCard: {
    backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: BORDER, borderLeftWidth: 3,
  },
  playerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  jerseyBadge: { width: 42, height: 42, borderRadius: 10, backgroundColor: 'rgba(139,148,158,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  jerseyNum:   { fontSize: 12, fontWeight: '700' },
  playerName:  { fontSize: 15, fontWeight: '700', color: TEXT },
  playerPos:   { fontSize: 12, color: MUTED, marginTop: 2 },

  markBtns: { flexDirection: 'row', gap: 6 },
  markBtn:  {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },

  footer:       { borderTopWidth: 1, borderTopColor: BORDER, paddingVertical: 16, paddingHorizontal: 24 },
  footerStats:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerStat:   { alignItems: 'center', flex: 1 },
  footerStatNum:{ fontSize: 26, fontWeight: '800', lineHeight: 32 },
  footerStatLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginTop: 2 },
  footerDivider: { width: 1, height: 40, backgroundColor: BORDER },
});
