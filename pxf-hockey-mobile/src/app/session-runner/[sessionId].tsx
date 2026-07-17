import { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const CARD = '#161B22';
const GREEN = '#3DFF8F';
const TEAL = '#00C4B4';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';
const BORDER = '#21262D';
const RED = '#EF4444';

type DrillInSession = {
  id: string;
  sort_order: number;
  drill: {
    id: string;
    title: string;
    short_description: string | null;
    difficulty_level: string;
    age_group: string;
    duration_minutes: number;
    equipment_needed: string[] | null;
    coaching_points: string[] | null;
    video_url: string | null;
    diagram_url: string | null;
    category: { title: string } | null;
  };
};

type Session = {
  id: string;
  title: string;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function toArr(v: any): string[] {
  return Array.isArray(v) ? v : [];
}

export default function SessionRunnerScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [session, setSession] = useState<Session | null>(null);
  const [drills, setDrills] = useState<DrillInSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);

  const player = useVideoPlayer(null);

  useEffect(() => { fetchSession(); }, []);

  // Timer counts up while running
  useEffect(() => {
    if (completed) return;
    const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [completed]);

  // Load video for current drill
  useEffect(() => {
    const drill = drills[currentIndex]?.drill;
    if (drill?.video_url) {
      player.replace({ uri: drill.video_url });
    }
    player.pause();
    setPlaying(false);
  }, [currentIndex, drills]);

  async function fetchSession() {
    const { data: sessionData } = await supabase
      .from('sessions').select('id, title').eq('id', sessionId).single();

    const { data: drillsData } = await supabase
      .from('session_drills')
      .select(`id, sort_order, drill:drill_id(
        id, title, short_description, difficulty_level, age_group,
        duration_minutes, equipment_needed, coaching_points,
        video_url, diagram_url, category:category_id(title)
      )`)
      .eq('session_id', sessionId)
      .order('sort_order');

    if (sessionData) setSession(sessionData);
    if (drillsData) setDrills(drillsData as any);
    setLoading(false);
  }

  async function finishSession() {
    await supabase.from('sessions').update({ is_complete: true }).eq('id', sessionId);
    setCompleted(true);
    player.pause();
  }

  function goNext() {
    if (currentIndex >= drills.length - 1) {
      finishSession();
    } else {
      setCurrentIndex(i => i + 1);
    }
  }

  function goPrev() {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }

  function togglePlay() {
    if (playing) { player.pause(); setPlaying(false); }
    else { player.play(); setPlaying(true); }
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={GREEN} />
      </View>
    );
  }

  // ── Completion screen ──────────────────────────────────────────────────────
  if (completed) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.completionScreen}>
            <LinearGradient
              colors={['#050E0A', '#071208', '#050E0A']}
              style={StyleSheet.absoluteFill}
            />
            {/* Glow */}
            <View style={styles.completionGlow} />

            <GradientText style={styles.completionPxf} colors={[TEAL, GREEN]}>PXF HOCKEY</GradientText>

            <View style={styles.completionIconRing}>
              <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.completionIconGradient}>
                <Ionicons name="checkmark" size={40} color="#000" />
              </LinearGradient>
            </View>

            <ThemedText style={styles.completionTitle}>SESSION COMPLETE</ThemedText>
            <ThemedText style={styles.completionSession}>{session?.title}</ThemedText>

            <View style={styles.completionStats}>
              <View style={styles.completionStat}>
                <ThemedText style={styles.completionStatValue}>{drills.length}</ThemedText>
                <ThemedText style={styles.completionStatLabel}>DRILLS</ThemedText>
              </View>
              <View style={styles.completionStatDivider} />
              <View style={styles.completionStat}>
                <ThemedText style={styles.completionStatValue}>{formatTime(elapsedSeconds)}</ThemedText>
                <ThemedText style={styles.completionStatLabel}>TIME ON ICE</ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={styles.completionBtn}
              onPress={() => router.navigate(`/session/${sessionId}`)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.completionBtnGradient}>
                <ThemedText style={styles.completionBtnText}>BACK TO SESSION</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.completionHome} onPress={() => router.navigate('/sessions')}>
              <ThemedText style={styles.completionHomeText}>Go to Sessions</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Runner screen ──────────────────────────────────────────────────────────
  const current = drills[currentIndex];
  const drill = current?.drill;
  const remaining = drills.slice(currentIndex).reduce((s, d) => s + (d.drill?.duration_minutes ?? 0), 0);
  const isLast = currentIndex === drills.length - 1;
  const equipment = toArr(drill?.equipment_needed);
  const coachingPoints = toArr(drill?.coaching_points);
  const progress = (currentIndex) / drills.length;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={18} color={TEXT} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.drillCounter}>
              DRILL {currentIndex + 1} OF {drills.length}
            </ThemedText>
            <ThemedText style={styles.sessionName} numberOfLines={1}>{session?.title}</ThemedText>
          </View>
          <View style={styles.elapsedBadge}>
            <Ionicons name="timer-outline" size={11} color={TEAL} />
            <ThemedText style={styles.elapsedText}> {formatTime(elapsedSeconds)}</ThemedText>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.progressRow}>
          {drills.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                i < currentIndex && styles.progressSegmentDone,
                i === currentIndex && styles.progressSegmentActive,
              ]}
            >
              {i === currentIndex && (
                <LinearGradient
                  colors={[TEAL, GREEN]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </View>
          ))}
        </View>

        {/* ── Time remaining ── */}
        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
            <ThemedText style={styles.timeText}> ~{remaining} min remaining</ThemedText>
          </View>
          <View style={styles.timeItem}>
            <Ionicons name="layers-outline" size={12} color={TEXT_MUTED} />
            <ThemedText style={styles.timeText}> {drills.length - currentIndex} drills left</ThemedText>
          </View>
        </View>

        {/* ── Scrollable drill content ── */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Video */}
          <TouchableOpacity style={styles.videoArea} onPress={togglePlay} activeOpacity={0.9}>
            {drill?.video_url ? (
              <>
                <VideoView
                  player={player}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  nativeControls={false}
                />
                {!playing && (
                  <View style={styles.videoOverlay}>
                    <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFill} />
                    <View style={styles.playBtn}>
                      <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playGradient}>
                        <Ionicons name="play" size={28} color="#000" />
                      </LinearGradient>
                    </View>
                    <ThemedText style={styles.tapToPlay}>TAP TO PLAY</ThemedText>
                  </View>
                )}
                {playing && (
                  <TouchableOpacity style={styles.pauseCorner} onPress={togglePlay}>
                    <View style={styles.pauseBtn}>
                      <Ionicons name="pause" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.noVideo}>
                <LinearGradient colors={['#0A1510', '#070D0A']} style={StyleSheet.absoluteFill} />
                <Ionicons name="videocam-off-outline" size={36} color="#1A2A1A" />
                <ThemedText style={styles.noVideoText}>No video available</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          {/* Drill title card */}
          <View style={styles.drillCard}>
            <View style={styles.drillCardTop}>
              <ThemedText style={styles.drillCategory}>
                {drill?.category?.title?.toUpperCase() ?? 'DRILL'}
              </ThemedText>
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={11} color={TEAL} />
                <ThemedText style={styles.durationText}> {drill?.duration_minutes} min</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.drillTitle}>{drill?.title}</ThemedText>
            {drill?.short_description && (
              <ThemedText style={styles.drillDesc}>{drill.short_description}</ThemedText>
            )}
            <View style={styles.metaRow}>
              {drill?.difficulty_level && (
                <View style={styles.metaPill}>
                  <Ionicons name="bar-chart-outline" size={10} color={TEAL} />
                  <ThemedText style={styles.metaPillText}> {drill.difficulty_level}</ThemedText>
                </View>
              )}
              {drill?.age_group && (
                <View style={styles.metaPill}>
                  <Ionicons name="people-outline" size={10} color={TEAL} />
                  <ThemedText style={styles.metaPillText}> {drill.age_group}</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Equipment */}
          {equipment.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="construct-outline" size={13} color={TEAL} />
                <ThemedText style={styles.sectionTitle}> EQUIPMENT NEEDED</ThemedText>
              </View>
              <View style={styles.equipRow}>
                {equipment.map((eq, i) => (
                  <View key={i} style={styles.equipChip}>
                    <Ionicons name="checkmark-circle-outline" size={12} color={TEAL} />
                    <ThemedText style={styles.equipText}> {eq}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Coaching Points */}
          {coachingPoints.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-circle-outline" size={13} color={GREEN} />
                <ThemedText style={styles.sectionTitle}> COACHING POINTS</ThemedText>
              </View>
              {coachingPoints.map((pt, i) => (
                <View key={i} style={styles.coachRow}>
                  <View style={styles.coachDot} />
                  <ThemedText style={styles.coachText}>{pt}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Up next preview */}
          {!isLast && drills[currentIndex + 1] && (
            <View style={styles.upNext}>
              <ThemedText style={styles.upNextLabel}>UP NEXT</ThemedText>
              <View style={styles.upNextCard}>
                <View style={styles.upNextIcon}>
                  <Ionicons name="play-forward" size={14} color={TEXT_MUTED} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.upNextCategory}>
                    {drills[currentIndex + 1].drill?.category?.title?.toUpperCase()}
                  </ThemedText>
                  <ThemedText style={styles.upNextTitle}>
                    {drills[currentIndex + 1].drill?.title}
                  </ThemedText>
                </View>
                <ThemedText style={styles.upNextDuration}>
                  {drills[currentIndex + 1].drill?.duration_minutes} min
                </ThemedText>
              </View>
            </View>
          )}

        </ScrollView>

        {/* ── Footer navigation ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.prevBtn, currentIndex === 0 && styles.prevBtnDisabled]}
            onPress={goPrev}
            disabled={currentIndex === 0}
          >
            <Ionicons name="arrow-back" size={18} color={currentIndex === 0 ? '#2A3A2A' : TEXT} />
            <ThemedText style={[styles.prevText, currentIndex === 0 && { color: '#2A3A2A' }]}>PREV</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <LinearGradient
              colors={isLast ? [GREEN, TEAL] : [TEAL, GREEN]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextGradient}
            >
              {isLast ? (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#000" />
                  <ThemedText style={styles.nextText}>FINISH SESSION</ThemedText>
                </>
              ) : (
                <>
                  <ThemedText style={styles.nextText}>NEXT DRILL</ThemedText>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  drillCounter: { fontSize: 11, fontWeight: '800', color: TEAL, letterSpacing: 2 },
  sessionName: { fontSize: 13, fontWeight: '600', color: TEXT_MUTED, marginTop: 1 },
  elapsedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D2A24', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: TEAL,
  },
  elapsedText: { fontSize: 12, fontWeight: '700', color: TEAL },

  // Progress segments
  progressRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, marginBottom: 8 },
  progressSegment: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: '#1C2128', overflow: 'hidden',
  },
  progressSegmentDone: { backgroundColor: '#1A4A2A' },
  progressSegmentActive: { backgroundColor: 'transparent' },

  // Time info
  timeRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 16,
    marginBottom: 12,
  },
  timeItem: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 12, color: TEXT_MUTED },

  // Content
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Video
  videoArea: {
    height: 230, backgroundColor: '#050E0A',
    overflow: 'hidden',
  },
  videoOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12 },
  playBtn: { width: 68, height: 68, borderRadius: 34, overflow: 'hidden' },
  playGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tapToPlay: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },
  pauseCorner: { position: 'absolute', bottom: 12, right: 12 },
  pauseBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  noVideo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  noVideoText: { fontSize: 13, color: '#2A3A2A' },

  // Drill card
  drillCard: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: CARD, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: BORDER,
    marginBottom: 12,
  },
  drillCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  drillCategory: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 2 },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D2A24', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#1A4A30',
  },
  durationText: { fontSize: 11, fontWeight: '700', color: TEAL },
  drillTitle: { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28, marginBottom: 8 },
  drillDesc: { fontSize: 13, color: TEXT_MUTED, lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D1F18', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#1A3A28',
  },
  metaPillText: { fontSize: 11, color: TEAL, fontWeight: '600' },

  // Sections
  section: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: CARD, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1.5 },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D2A24', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#1A4A30',
  },
  equipText: { fontSize: 12, color: TEAL },

  coachRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  coachDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: GREEN, marginTop: 6, flexShrink: 0,
  },
  coachText: { flex: 1, fontSize: 14, color: TEXT, lineHeight: 20 },

  // Up next
  upNext: { marginHorizontal: 16, marginBottom: 12 },
  upNextLabel: { fontSize: 10, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 8 },
  upNextCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: BORDER,
  },
  upNextIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#1C2128', alignItems: 'center', justifyContent: 'center',
  },
  upNextCategory: { fontSize: 9, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1, marginBottom: 2 },
  upNextTitle: { fontSize: 13, fontWeight: '700', color: TEXT },
  upNextDuration: { fontSize: 12, color: TEXT_MUTED },

  // Footer
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER,
  },
  prevBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  prevBtnDisabled: { borderColor: '#1C2128' },
  prevText: { fontSize: 12, fontWeight: '700', color: TEXT },
  nextBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  nextGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  nextText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.5 },

  // Completion
  completionScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  completionGlow: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: TEAL, opacity: 0.06, top: '25%',
  },
  completionPxf: { fontSize: 12, fontWeight: '800', letterSpacing: 4, marginBottom: 32 },
  completionIconRing: {
    width: 100, height: 100, borderRadius: 50,
    overflow: 'hidden', marginBottom: 28,
  },
  completionIconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  completionTitle: { fontSize: 24, fontWeight: '800', color: TEXT, letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  completionSession: { fontSize: 15, color: TEXT_MUTED, marginBottom: 36, textAlign: 'center' },
  completionStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 20, paddingHorizontal: 8,
    width: '100%', marginBottom: 32,
  },
  completionStat: { flex: 1, alignItems: 'center' },
  completionStatValue: { fontSize: 24, fontWeight: '800', color: TEXT, marginBottom: 4 },
  completionStatLabel: { fontSize: 9, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1.5, textAlign: 'center' },
  completionStatDivider: { width: 1, height: 40, backgroundColor: BORDER },
  completionBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  completionBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  completionBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.5 },
  completionHome: { paddingVertical: 8 },
  completionHomeText: { fontSize: 14, color: TEXT_MUTED },
});
