import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';

const BG     = '#0D1117';
const CARD   = '#161B22';
const PURPLE = '#7C3AED';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const TEXT   = '#FFFFFF';

const FEATURES = [
  {
    icon: 'play-circle-outline' as const,
    color: TEAL,
    bg: 'rgba(0,196,180,0.12)',
    title: 'Pre-Recorded Workouts',
    desc: 'On-demand video workouts your players can follow anywhere, anytime.',
  },
  {
    icon: 'radio-button-on-outline' as const,
    color: ORANGE,
    bg: 'rgba(245,158,11,0.12)',
    title: 'Shooting Series',
    desc: 'Dedicated programs focused on shot mechanics, release, and accuracy.',
  },
  {
    icon: 'disc-outline' as const,
    color: GREEN,
    bg: 'rgba(61,255,143,0.12)',
    title: 'Stick Handling Series',
    desc: 'Progressive puck skills programs from fundamentals to elite edge work.',
  },
  {
    icon: 'barbell-outline' as const,
    color: PURPLE,
    bg: 'rgba(124,58,237,0.12)',
    title: 'Strength & Conditioning',
    desc: 'Hockey-specific S&C programs built for every age group and level.',
  },
  {
    icon: 'people-outline' as const,
    color: TEAL,
    bg: 'rgba(0,196,180,0.12)',
    title: 'Assign to Your Teams',
    desc: 'Push any program directly to a team — players get notified instantly.',
  },
  {
    icon: 'checkmark-circle-outline' as const,
    color: GREEN,
    bg: 'rgba(61,255,143,0.12)',
    title: 'Completion Tracking',
    desc: 'See exactly who has completed each workout and when.',
  },
  {
    icon: 'trophy-outline' as const,
    color: ORANGE,
    bg: 'rgba(245,158,11,0.12)',
    title: 'Leaderboards',
    desc: 'Motivate players with team rankings for completion and consistency.',
  },
];

export default function DrylandScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <ThemedText style={s.headerLabel}>OFF-ICE TRAINING</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="barbell-outline" size={40} color={PURPLE} />
          </View>
          <View style={s.soonBadge}>
            <ThemedText style={s.soonText}>COMING SOON</ThemedText>
          </View>
          <ThemedText style={s.heroTitle}>Train Beyond the Ice</ThemedText>
          <ThemedText style={s.heroSub}>
            A complete off-ice training system — assign programs to your teams, track completions, and keep players developing every day of the week.
          </ThemedText>
        </View>

        {/* Divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <ThemedText style={s.dividerLabel}>WHAT'S COMING</ThemedText>
          <View style={s.dividerLine} />
        </View>

        {/* Feature list */}
        <View style={s.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={[s.featureIcon, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={20} color={f.color} />
              </View>
              <View style={s.featureText}>
                <ThemedText style={s.featureTitle}>{f.title}</ThemedText>
                <ThemedText style={s.featureDesc}>{f.desc}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 13, fontWeight: '700', color: PURPLE, letterSpacing: 2 },

  scroll: { paddingBottom: 16 },

  // Hero
  hero: {
    alignItems: 'center', paddingHorizontal: 32,
    paddingTop: 36, paddingBottom: 28,
  },
  heroIcon: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  soonBadge: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)',
    marginBottom: 14,
  },
  soonText:  { fontSize: 11, fontWeight: '800', color: PURPLE, letterSpacing: 2 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: 0.5, marginBottom: 10, textAlign: 'center', lineHeight: 26 },
  heroSub:   { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22 },

  // Divider
  dividerRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: BORDER },
  dividerLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 2, marginHorizontal: 12 },

  // Features
  featureList: { paddingHorizontal: 16, gap: 10 },
  featureRow:  {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: CARD, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: BORDER, gap: 12,
  },
  featureIcon:  {
    width: 42, height: 42, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureText:  { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 3 },
  featureDesc:  { fontSize: 13, color: MUTED, lineHeight: 19 },
});
