import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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

type Drill = {
  id: string;
  title: string;
  full_description: string;
  short_description: string;
  difficulty_level: string;
  age_group: string;
  duration_minutes: number;
  equipment_needed: string[];
  coaching_points: string[];
  video_url: string | null;
  diagram_url: string | null;
  is_premium: boolean;
  category_id: string;
  drill_categories: { title: string } | null;
};

type RelatedDrill = {
  id: string;
  title: string;
  difficulty_level: string;
  drill_categories: { title: string } | null;
};

export default function DrillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [drill, setDrill] = useState<Drill | null>(null);
  const [related, setRelated] = useState<RelatedDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoMode, setVideoMode] = useState<'full' | 'slow'>('full');
  const [favorited, setFavorited] = useState(false);

  const player = useVideoPlayer(null);

  useEffect(() => {
    fetchDrill();
  }, [id]);

  useEffect(() => {
    if (drill?.video_url) {
      player.replace({ uri: drill.video_url });
    }
  }, [drill?.video_url]);

  async function fetchDrill() {
    const { data } = await supabase
      .from('drills')
      .select('*, drill_categories(title)')
      .eq('id', id)
      .single();
    setDrill(data);

    if (data?.category_id) {
      const { data: rel } = await supabase
        .from('drills')
        .select('id, title, difficulty_level, drill_categories(title)')
        .eq('category_id', data.category_id)
        .eq('is_published', true)
        .neq('id', id)
        .limit(3);
      setRelated((rel as any) || []);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={GREEN} />
      </View>
    );
  }

  if (!drill) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ThemedText style={{ color: TEXT_MUTED }}>Drill not found.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Logo */}
        <View style={styles.logoHeader}>
          <View>
            <GradientText style={styles.logoText} colors={[TEAL, GREEN]}>PXF</GradientText>
            <GradientText style={styles.logoSub} colors={[TEAL, GREEN]}>HOCKEY</GradientText>
          </View>
          <TouchableOpacity onPress={() => setFavorited(!favorited)}>
            <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? GREEN : TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/drills')}>
            <Ionicons name="arrow-back" size={20} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>DRILL DETAIL</ThemedText>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Video at the top */}
          {drill.video_url ? (
            <VideoView
              player={player}
              style={styles.videoPlayer}
              allowsFullscreen
              allowsPictureInPicture
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <LinearGradient
                colors={[TEAL, GREEN]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.playCircle}
              >
                <Ionicons name="play" size={22} color="#000" />
              </LinearGradient>
              <ThemedText style={styles.videoHint}>No video yet</ThemedText>
            </View>
          )}

          {/* Video tabs */}
          <View style={[styles.videoTabs, { paddingHorizontal: 20, marginBottom: 20 }]}>
            {(['full', 'slow'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.videoTab, videoMode === mode && styles.videoTabActive]}
                onPress={() => setVideoMode(mode)}
              >
                <ThemedText style={[styles.videoTabText, videoMode === mode && styles.videoTabTextActive]}>
                  {mode === 'full' ? 'FULL SPEED' : 'SLOW MOTION'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Drill Info Card */}
          <View style={styles.infoCard}>
            {drill.drill_categories && (
              <ThemedText style={styles.categoryLabel}>{drill.drill_categories.title.toUpperCase()}</ThemedText>
            )}
            <ThemedText style={styles.drillTitle}>{drill.title}</ThemedText>

            {/* Meta pills */}
            <View style={styles.metaRow}>
              {drill.difficulty_level && (
                <View style={styles.metaPill}>
                  <Ionicons name="bar-chart-outline" size={11} color={TEAL} />
                  <ThemedText style={styles.metaText}>{drill.difficulty_level}</ThemedText>
                </View>
              )}
              {drill.age_group && (
                <View style={styles.metaPill}>
                  <Ionicons name="people-outline" size={11} color={TEAL} />
                  <ThemedText style={styles.metaText}>{drill.age_group}</ThemedText>
                </View>
              )}
              {!!drill.duration_minutes && (
                <View style={styles.metaPill}>
                  <Ionicons name="time-outline" size={11} color={TEAL} />
                  <ThemedText style={styles.metaText}>{drill.duration_minutes} min</ThemedText>
                </View>
              )}
            </View>

            {/* Requires / Equipment */}
            {Array.isArray(drill.equipment_needed) && drill.equipment_needed.length > 0 && (
              <View style={styles.requiresSection}>
                <View style={styles.requiresLabel}>
                  <Ionicons name="construct-outline" size={12} color={TEAL} />
                  <ThemedText style={styles.requiresTitle}> REQUIRES</ThemedText>
                </View>
                {drill.equipment_needed.map((item, i) => (
                  <View key={i} style={styles.requiresRow}>
                    <View style={styles.requiresDot} />
                    <ThemedText style={styles.requiresText}>{item}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Overview */}
          {drill.full_description && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>OVERVIEW</ThemedText>
              <View style={styles.overviewCard}>
                <ThemedText style={styles.bodyText}>{drill.full_description}</ThemedText>
              </View>
            </View>
          )}

          {/* Drill Setup */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>DRILL SETUP</ThemedText>
            <View style={styles.rinkCard}>
              <View style={styles.rinkHeader}>
                <ThemedText style={styles.rinkTitle}>RINK SETUP</ThemedText>
                <ThemedText style={styles.rinkZoom}>↗ PINCH TO ZOOM</ThemedText>
              </View>
              {/* Rink diagram placeholder */}
              <View style={styles.rinkDiagram}>
                <View style={styles.rinkOutline}>
                  {/* Center line */}
                  <View style={styles.rinkCenterLine} />
                  {/* Center circle */}
                  <View style={styles.rinkCenterCircle} />
                  {/* Placeholder path dots */}
                  <View style={[styles.rinkDot, { left: '20%', top: '40%' }]} />
                  <View style={[styles.rinkDot, { left: '40%', top: '55%' }]} />
                  <View style={[styles.rinkDot, { left: '60%', top: '40%' }]} />
                  <View style={[styles.rinkDot, { left: '80%', top: '55%' }]} />
                  <View style={[styles.rinkPlayer, { left: '10%', top: '35%' }]} />
                </View>
              </View>
              {/* Legend */}
              <View style={styles.rinkLegend}>
                {[
                  { icon: 'ellipse', color: TEAL, label: 'Player' },
                  { icon: 'triangle', color: GREEN, label: 'Cone' },
                  { icon: 'square', color: TEXT_MUTED, label: 'Puck' },
                  { icon: 'remove', color: TEXT_MUTED, label: 'Pass' },
                ].map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <Ionicons name={item.icon as any} size={10} color={item.color} />
                    <ThemedText style={styles.legendText}>{item.label}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </View>


          {/* Coaching Points */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={TEAL} />
              <ThemedText style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 6 }]}>COACHING POINTS</ThemedText>
            </View>
            <View style={{ marginTop: 12 }}>
              {Array.isArray(drill.coaching_points) && drill.coaching_points.length > 0 ? (
                drill.coaching_points.map((point, i) => (
                  <View key={i} style={styles.pointCard}>
                    <Ionicons name="checkmark-circle" size={18} color={TEAL} />
                    <ThemedText style={styles.pointText}>{point}</ThemedText>
                  </View>
                ))
              ) : (
                <View style={styles.pointCard}>
                  <Ionicons name="checkmark-circle" size={18} color={TEAL} />
                  <ThemedText style={styles.pointText}>Keep eyes up and scan the ice.</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Common Mistakes */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="warning-outline" size={14} color="#FF6B6B" />
              <ThemedText style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 6 }]}>COMMON MISTAKES</ThemedText>
            </View>
            <View style={styles.avoidCard}>
              <View style={styles.avoidBadge}>
                <Ionicons name="warning" size={11} color="#FF6B6B" />
                <ThemedText style={styles.avoidBadgeText}>AVOID</ThemedText>
              </View>
              <View style={styles.avoidRow}>
                <Ionicons name="close" size={16} color="#FF6B6B" />
                <ThemedText style={styles.avoidText}>Rising up between reps.</ThemedText>
              </View>
              <View style={styles.avoidRow}>
                <Ionicons name="close" size={16} color="#FF6B6B" />
                <ThemedText style={styles.avoidText}>Slow first step out of the stop.</ThemedText>
              </View>
            </View>
          </View>

          {/* Related Drills */}
          {related.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>RELATED DRILLS</ThemedText>
              {related.map((rel) => (
                <TouchableOpacity
                  key={rel.id}
                  style={styles.relatedCard}
                  onPress={() => router.push(`/drill/${rel.id}`)}
                >
                  <LinearGradient
                    colors={[TEAL, GREEN]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.relatedPlay}
                  >
                    <Ionicons name="play" size={12} color="#000" />
                  </LinearGradient>
                  <View style={styles.relatedInfo}>
                    {rel.drill_categories && (
                      <ThemedText style={styles.relatedCategory}>{rel.drill_categories.title.toUpperCase()}</ThemedText>
                    )}
                    <ThemedText style={styles.relatedTitle}>{rel.title}</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          )}

        </ScrollView>

        {/* Start Drill button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.startBtn} activeOpacity={0.85}>
            <LinearGradient
              colors={[TEAL, GREEN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startGradient}
            >
              <ThemedText style={styles.startText}>START DRILL</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  logoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  logoText: { fontSize: 24, fontWeight: '900', color: TEAL, letterSpacing: 3, lineHeight: 38 },
  logoSub: { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 5, lineHeight: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 13, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2 },

  infoCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: CARD, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: BORDER,
  },
  categoryLabel: { fontSize: 11, fontWeight: '800', color: TEAL, letterSpacing: 2, marginBottom: 6 },
  drillTitle: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 14, lineHeight: 30 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0D1F18', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: TEAL,
  },
  metaText: { fontSize: 12, color: TEAL, fontWeight: '600' },

  requiresSection: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 14 },
  requiresLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  requiresTitle: { fontSize: 11, fontWeight: '800', color: TEAL, letterSpacing: 1 },
  requiresRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  requiresDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: TEAL },
  requiresText: { fontSize: 13, color: TEXT },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 12 },

  overviewCard: {
    backgroundColor: CARD, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  bodyText: { fontSize: 14, color: TEXT, lineHeight: 22 },

  rinkCard: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  rinkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  rinkTitle: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 2 },
  rinkZoom: { fontSize: 10, color: TEAL, fontWeight: '600' },
  rinkDiagram: { height: 160, backgroundColor: '#050E0A', padding: 12 },
  rinkOutline: { flex: 1, borderWidth: 1.5, borderColor: '#1A4A2A', borderRadius: 8, position: 'relative' },
  rinkCenterLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: '#1A4A2A' },
  rinkCenterCircle: { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#1A4A2A', top: '50%', left: '50%', marginTop: -25, marginLeft: -25 },
  rinkDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  rinkPlayer: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL },
  rinkLegend: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12, borderTopWidth: 1, borderTopColor: BORDER },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 10, color: TEXT_MUTED },

  videoPlayer: { width: '100%', height: 220, backgroundColor: '#000', marginBottom: 0 },
  videoPlaceholder: {
    height: 200, backgroundColor: '#0A1F15',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  playCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  videoHint: { fontSize: 13, color: TEXT_MUTED },
  videoTabs: { flexDirection: 'row', marginTop: 12, gap: 8 },
  videoTab: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER,
  },
  videoTabActive: { borderColor: TEAL, backgroundColor: '#0D1F18' },
  videoTabText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 0.5 },
  videoTabTextActive: { color: TEAL },

  pointCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: CARD, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: BORDER, gap: 12,
  },
  pointIcon: { marginTop: 1 },
  pointText: { flex: 1, fontSize: 14, color: TEXT, lineHeight: 20 },

  avoidCard: {
    marginTop: 12, backgroundColor: 'rgba(255,107,107,0.05)',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FF6B6B',
  },
  avoidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  avoidBadgeText: { fontSize: 11, fontWeight: '800', color: '#FF6B6B', letterSpacing: 1 },
  avoidRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  avoidText: { fontSize: 14, color: TEXT },

  relatedCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: BORDER, gap: 12,
  },
  relatedPlay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  relatedInfo: { flex: 1 },
  relatedCategory: { fontSize: 9, fontWeight: '800', color: TEAL, letterSpacing: 1, marginBottom: 2 },
  relatedTitle: { fontSize: 14, fontWeight: '700', color: TEXT },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER,
  },
  startBtn: { borderRadius: 14, overflow: 'hidden' },
  startGradient: { paddingVertical: 16, alignItems: 'center' },
  startText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 1 },
});
