import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

const BG = '#0D1117';
const CARD = '#161B22';
const CARD2 = '#0F2318';
const GREEN = '#3DFF8F';
const TEAL = '#00C4B4';
const GREEN_DIM = '#1A3D28';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';

const QUICK_ACTIONS = [
  { icon: '＋', label: 'Build Session', soon: false },
  { icon: '◎', label: 'GameIQ', soon: true },
  { icon: '☰', label: 'Programs', soon: false },
  { icon: '♡', label: 'Favorites', soon: false },
];

const CATEGORIES = [
  { name: 'Slip Circuits', icon: '⬡', soon: false },
  { name: 'Dryland Skills', icon: '◉', soon: false },
  { name: 'Game IQ Circuits', icon: '◎', soon: true },
];

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.logoText}>PXF</ThemedText>
              <ThemedText style={styles.logoSub}>HOCKEY</ThemedText>
            </View>
          </View>

          {/* Welcome */}
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeLeft}>
              <ThemedText style={styles.welcomeLabel}>WELCOME BACK</ThemedText>
              <ThemedText style={styles.welcomeName}>Athlete</ThemedText>
              <ThemedText style={styles.welcomeTagline}>Train the game. Today's the day.</ThemedText>
            </View>
            <View style={styles.streakBadge}>
              <ThemedText style={styles.streakNumber}>0</ThemedText>
              <ThemedText style={styles.streakLabel}>DAY STREAK</ThemedText>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity key={action.label} style={styles.quickAction}>
                <ThemedText style={styles.quickActionIcon}>{action.icon}</ThemedText>
                <ThemedText style={styles.quickActionLabel}>{action.label}</ThemedText>
                {action.soon && <ThemedText style={styles.quickActionSoon}>Coming Soon</ThemedText>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Training Categories */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>TRAINING CATEGORIES</ThemedText>
            <TouchableOpacity><ThemedText style={styles.seeAll}>See all ›</ThemedText></TouchableOpacity>
          </View>

          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.name} style={styles.categoryCard}>
                <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
                <ThemedText style={styles.categoryName}>{cat.name}</ThemedText>
                {cat.soon && (
                  <View style={styles.soonBadge}>
                    <ThemedText style={styles.soonText}>SOON</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Continue Training */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>CONTINUE TRAINING</ThemedText>
            <TouchableOpacity><ThemedText style={styles.seeAll}>See all ›</ThemedText></TouchableOpacity>
          </View>

          <View style={styles.continueCard}>
            <View style={styles.inProgressBadge}>
              <ThemedText style={styles.inProgressText}>IN PROGRESS</ThemedText>
            </View>
            <View style={styles.continueRow}>
              <ThemedText style={styles.continueTitle}>Slip Circuits · Flow 1</ThemedText>
              <ThemedText style={styles.continuePercent}>0%</ThemedText>
            </View>
            <ThemedText style={styles.continueMeta}>0 of 6 drills  ·  Start today</ThemedText>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '0%' }]} />
            </View>
            <TouchableOpacity style={styles.resumeButton}>
              <ThemedText style={styles.resumeText}>START →</ThemedText>
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
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  logoText: { fontSize: 28, fontWeight: '900', color: TEAL, letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 5, lineHeight: 18 },

  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 24 },
  welcomeLeft: { flex: 1 },
  welcomeLabel: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 4 },
  welcomeName: { fontSize: 28, fontWeight: '800', color: GREEN, marginBottom: 4 },
  welcomeTagline: { fontSize: 14, color: TEXT_MUTED },
  streakBadge: { backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: GREEN_DIM },
  streakNumber: { fontSize: 24, fontWeight: '800', color: GREEN },
  streakLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },

  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 28 },
  quickAction: { flex: 1, backgroundColor: CARD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#21262D' },
  quickActionIcon: { fontSize: 20, color: TEAL },
  quickActionLabel: { fontSize: 10, fontWeight: '600', color: TEXT_MUTED, textAlign: 'center' },
  quickActionSoon: { fontSize: 8, fontWeight: '600', color: '#F4A261', textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2 },
  seeAll: { fontSize: 13, color: GREEN, fontWeight: '600' },

  categoryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 28 },
  categoryCard: { flex: 1, aspectRatio: 1, backgroundColor: CARD2, borderRadius: 14, padding: 12, justifyContent: 'flex-end', borderWidth: 1, borderColor: '#1B3A2A', position: 'relative' },
  categoryIcon: { fontSize: 20, color: TEAL, marginBottom: 6 },
  categoryName: { fontSize: 12, fontWeight: '700', color: TEXT },
  soonBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#F4A261', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soonText: { fontSize: 9, fontWeight: '800', color: '#000' },

  continueCard: { marginHorizontal: 20, marginBottom: 28, backgroundColor: CARD, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#21262D' },
  inProgressBadge: { alignSelf: 'flex-start', backgroundColor: GREEN_DIM, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 12 },
  inProgressText: { fontSize: 10, fontWeight: '800', color: GREEN, letterSpacing: 1 },
  continueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  continueTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  continuePercent: { fontSize: 22, fontWeight: '800', color: GREEN },
  continueMeta: { fontSize: 12, color: TEXT_MUTED, marginBottom: 14 },
  progressBar: { height: 6, backgroundColor: '#21262D', borderRadius: 3, marginBottom: 16 },
  progressFill: { height: 6, backgroundColor: GREEN, borderRadius: 3 },
  resumeButton: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  resumeText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 1 },
});
