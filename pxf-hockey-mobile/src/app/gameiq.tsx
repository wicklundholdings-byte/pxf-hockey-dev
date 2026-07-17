import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

// Replace with your actual GameIQ promo video URL
const PROMO_VIDEO_URL = '';

const FEATURES = [
  { icon: 'brain', label: 'AI-Powered Reads', desc: 'Real-time situational analysis trained on elite hockey IQ.' },
  { icon: 'chart-line', label: 'Decision Tracking', desc: 'Measure how fast and accurately players read the ice.' },
  { icon: 'play-network', label: 'Film Study Tools', desc: 'Break down shifts frame-by-frame with coaching overlays.' },
];

export default function GameIQScreen() {
  const router = useRouter();
  const [notified, setNotified] = useState(false);

  async function handleNotify() {
    if (notified) return;
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email ?? 'your account';
    setNotified(true);
    Alert.alert(
      "You're on the list! 🎉",
      `We'll notify ${email} the moment GameIQ launches.`,
      [{ text: 'Got it', style: 'default' }]
    );
  }

  const player = useVideoPlayer(PROMO_VIDEO_URL || null, p => {
    p.loop = true;
    if (PROMO_VIDEO_URL) p.play();
  });

  useEffect(() => {
    return () => { player.pause(); };
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Coming soon badge */}
          <View style={styles.soonBadgeRow}>
            <View style={styles.soonBadge}>
              <ThemedText style={styles.soonBadgeText}>COMING SOON</ThemedText>
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <GradientText style={styles.titleMain} colors={[TEAL, GREEN]}>Game</GradientText>
            <GradientText style={styles.titleIQ} colors={[GREEN, TEAL]}>IQ</GradientText>
          </View>
          <ThemedText style={styles.tagline}>Train the mind. Read the ice.</ThemedText>

          {/* Video area */}
          <View style={styles.videoContainer}>
            {PROMO_VIDEO_URL ? (
              <VideoView
                player={player}
                style={styles.video}
                nativeControls={false}
                contentFit="cover"
              />
            ) : (
              /* Placeholder when no video URL is set */
              <View style={styles.videoPlaceholder}>
                <LinearGradient
                  colors={['#0A1F15', '#0D2A24', '#0A1F15']}
                  style={styles.videoGradientBg}
                >
                  <View style={styles.placeholderLines}>
                    {[...Array(6)].map((_, i) => (
                      <View key={i} style={[styles.placeholderLine, { opacity: 0.3 - i * 0.04, width: `${90 - i * 8}%` as any }]} />
                    ))}
                  </View>
                  <View style={styles.placeholderPlayBtn}>
                    <Ionicons name="play" size={32} color={GREEN} />
                  </View>
                  <View style={styles.placeholderLabel}>
                    <MaterialCommunityIcons name="brain" size={16} color={TEAL} />
                    <ThemedText style={styles.placeholderLabelText}>GAMEIQ PROMO</ThemedText>
                  </View>
                </LinearGradient>
              </View>
            )}
            {/* Glow overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,196,180,0.08)', 'transparent']}
              style={styles.videoGlow}
              pointerEvents="none"
            />
          </View>

          {/* Description */}
          <View style={styles.descBlock}>
            <ThemedText style={styles.descText}>
              GameIQ is PXF Hockey's AI-powered hockey intelligence platform — built to help coaches and players develop elite decision-making on and off the ice.
            </ThemedText>
          </View>

          {/* Feature list */}
          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons name={f.icon as any} size={20} color={TEAL} />
                </View>
                <View style={styles.featureText}>
                  <ThemedText style={styles.featureLabel}>{f.label}</ThemedText>
                  <ThemedText style={styles.featureDesc}>{f.desc}</ThemedText>
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={styles.ctaBlock}>
            <ThemedText style={styles.ctaNote}>Be the first to know when GameIQ launches.</ThemedText>
            <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85} onPress={handleNotify} disabled={notified}>
              <LinearGradient
                colors={notified ? ['#1A3D2A', '#1A3D2A'] : [TEAL, GREEN]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Ionicons
                  name={notified ? 'checkmark-circle' : 'notifications-outline'}
                  size={16}
                  color={notified ? GREEN : '#000'}
                  style={{ marginRight: 6 }}
                />
                <ThemedText style={[styles.ctaBtnText, notified && styles.ctaBtnTextDone]}>
                  {notified ? "YOU'RE ON THE LIST" : 'NOTIFY ME AT LAUNCH'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  scroll: { paddingBottom: 48 },

  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  backText: { fontSize: 16, color: TEXT },

  soonBadgeRow: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  soonBadge: {
    borderWidth: 1, borderColor: '#F97316', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, backgroundColor: 'rgba(249,115,22,0.12)',
  },
  soonBadgeText: { fontSize: 11, fontWeight: '800', color: '#F97316', letterSpacing: 2 },

  titleBlock: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 8 },
  titleMain: { fontSize: 56, fontWeight: '800', letterSpacing: -1, lineHeight: 68 },
  titleIQ: { fontSize: 56, fontWeight: '800', letterSpacing: -1, lineHeight: 68 },
  tagline: { fontSize: 15, color: TEXT_MUTED, textAlign: 'center', letterSpacing: 1, marginBottom: 28 },

  videoContainer: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', height: 220, marginBottom: 28, borderWidth: 1, borderColor: BORDER, position: 'relative' },
  video: { width: '100%', height: '100%' },
  videoPlaceholder: { width: '100%', height: '100%' },
  videoGradientBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderLines: { position: 'absolute', width: '100%', padding: 20, gap: 8 },
  placeholderLine: { height: 2, backgroundColor: TEAL, borderRadius: 1 },
  placeholderPlayBtn: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(61,255,143,0.08)',
  },
  placeholderLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, position: 'absolute', bottom: 12, left: 14 },
  placeholderLabelText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 2 },
  videoGlow: { position: 'absolute', inset: 0 } as any,

  descBlock: { paddingHorizontal: 24, marginBottom: 28 },
  descText: { fontSize: 15, color: TEXT_MUTED, lineHeight: 24, textAlign: 'center' },

  features: { marginHorizontal: 20, gap: 12, marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  featureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0D2A24', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 3 },
  featureDesc: { fontSize: 12, color: TEXT_MUTED, lineHeight: 18 },

  ctaBlock: { marginHorizontal: 20, alignItems: 'center', gap: 12 },
  ctaNote: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },
  ctaBtn: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  ctaBtnText: { fontSize: 14, fontWeight: '800', color: '#000', letterSpacing: 1 },
  ctaBtnTextDone: { color: GREEN },
});
