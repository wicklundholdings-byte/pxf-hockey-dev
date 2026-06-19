import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const CARD = '#0F1923';
const GREEN = '#3DFF8F';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';

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
  drill_categories: { title: string } | null;
};

export default function DrillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);

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

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/drills')}>
          <SymbolView name="chevron.left" tintColor={GREEN} size={18} />
          <ThemedText style={styles.backText}>Drills</ThemedText>
        </TouchableOpacity>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Video */}
          {drill.video_url ? (
            <VideoView
              player={player}
              style={styles.videoPlayer}
              allowsFullscreen
              allowsPictureInPicture
            />
          ) : (
            <View style={styles.videoArea}>
              <View style={styles.playCircle}>
                <SymbolView name="play.fill" tintColor={GREEN} size={28} />
              </View>
              <ThemedText style={styles.videoHint}>No video yet</ThemedText>
            </View>
          )}

          {/* Category + Title */}
          <View style={styles.titleSection}>
            {drill.drill_categories && (
              <ThemedText style={styles.categoryLabel}>{drill.drill_categories.title.toUpperCase()}</ThemedText>
            )}
            <ThemedText style={styles.drillTitle}>{drill.title}</ThemedText>

            {/* Meta pills */}
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <ThemedText style={styles.metaText}>{drill.difficulty_level}</ThemedText>
              </View>
              <View style={styles.metaPill}>
                <ThemedText style={styles.metaText}>{drill.age_group}</ThemedText>
              </View>
              <View style={styles.metaPill}>
                <ThemedText style={styles.metaText}>{drill.duration_minutes} min</ThemedText>
              </View>
            </View>
          </View>

          {/* Description */}
          {drill.full_description && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>OVERVIEW</ThemedText>
              <ThemedText style={styles.bodyText}>{drill.full_description}</ThemedText>
            </View>
          )}

          {/* Coaching Points */}
          {Array.isArray(drill.coaching_points) && drill.coaching_points.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>COACHING POINTS</ThemedText>
              {drill.coaching_points.map((point, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bullet} />
                  <ThemedText style={styles.bulletText}>{point}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Equipment */}
          {Array.isArray(drill.equipment_needed) && drill.equipment_needed.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>EQUIPMENT</ThemedText>
              {drill.equipment_needed.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bullet} />
                  <ThemedText style={styles.bulletText}>{item}</ThemedText>
                </View>
              ))}
            </View>
          )}

        </ScrollView>

        {/* Start button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.startBtn}>
            <ThemedText style={styles.startText}>START DRILL</ThemedText>
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

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 4,
  },
  backText: { fontSize: 16, color: GREEN, fontWeight: '600' },

  videoPlayer: {
    width: '100%',
    height: 220,
    marginBottom: 24,
    backgroundColor: '#000',
  },
  videoArea: {
    height: 220,
    backgroundColor: '#0A1F15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  videoHint: { fontSize: 13, color: TEXT_MUTED },

  titleSection: { paddingHorizontal: 20, marginBottom: 24 },
  categoryLabel: { fontSize: 11, fontWeight: '800', color: GREEN, letterSpacing: 2, marginBottom: 6 },
  drillTitle: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 14, lineHeight: 36 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: {
    backgroundColor: '#161B22',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metaText: { fontSize: 12, color: TEXT_MUTED, fontWeight: '600' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 12 },
  bodyText: { fontSize: 15, color: TEXT, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 15, color: TEXT, lineHeight: 22 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: '#161B22',
  },
  startBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 1 },
});
