import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const CARD = '#161B22';
const CARD2 = '#0F2318';
const GREEN = '#3DFF8F';
const TEAL = '#00C4B4';
const GREEN_DIM = '#1A3D28';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';
const BORDER = '#21262D';

const QUICK_ACTIONS = [
  { icon: 'add', label: 'Build Session', soon: false },
  { icon: 'analytics-outline', label: 'GameIQ', soon: true },
  { icon: 'list-outline', label: 'Programs', soon: false },
  { icon: 'heart-outline', label: 'Favorites', soon: false },
];

const CATEGORIES = [
  { name: 'Slip Circuits', icon: 'refresh-outline', soon: false },
  { name: 'Dryland Skills', icon: 'body-outline', soon: false },
  { name: 'Game IQ Circuits', icon: 'bulb-outline', soon: true },
];

type FeaturedDrill = {
  id: string;
  title: string;
  short_description: string;
  difficulty_level: string;
  drill_categories: { title: string } | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Athlete');
  const [featuredDrill, setFeaturedDrill] = useState<FeaturedDrill | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'Athlete';
      setUserName(name);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const name = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Athlete';
      setUserName(name);
    });

    // Fetch a featured drill
    supabase
      .from('drills')
      .select('id, title, short_description, difficulty_level, drill_categories(title)')
      .eq('is_published', true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setFeaturedDrill(data as any);
      });

    return () => listener.subscription.unsubscribe();
  }, []);

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
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {/* Welcome */}
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeLeft}>
              <ThemedText style={styles.welcomeLabel}>WELCOME BACK</ThemedText>
              <ThemedText style={styles.welcomeName}>{userName}</ThemedText>
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
                <Ionicons name={action.icon as any} size={22} color={TEAL} />
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
                <Ionicons name={cat.icon as any} size={22} color={TEAL} style={{ marginBottom: 8 }} />
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

          {/* Recommended Progression */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>RECOMMENDED PROGRESSION</ThemedText>
            <TouchableOpacity><ThemedText style={styles.seeAll}>See all ›</ThemedText></TouchableOpacity>
          </View>

          <View style={styles.progressionCard}>
            <View style={styles.progressionTop}>
              <View style={styles.pathwayBadge}>
                <ThemedText style={styles.pathwayText}>PATHWAY</ThemedText>
              </View>
              <View style={styles.nextUpBadge}>
                <ThemedText style={styles.nextUpText}>NEXT UP</ThemedText>
              </View>
            </View>
            <View style={styles.progressionDivider} />
            <View style={styles.progressionBottom}>
              <View style={styles.progressionInfo}>
                <ThemedText style={styles.progressionTitle}>Puck Control · Flow 3 — Deception</ThemedText>
                <ThemedText style={styles.progressionMeta}>Unlock after 2 more sessions in Flow 2.</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
            </View>
          </View>

          {/* Upcoming Session */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>UPCOMING SESSION</ThemedText>
            <TouchableOpacity><ThemedText style={styles.seeAll}>See all ›</ThemedText></TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sessionCard}>
            <View style={styles.sessionDateBox}>
              <ThemedText style={styles.sessionDay}>WED</ThemedText>
              <ThemedText style={styles.sessionDate}>18</ThemedText>
            </View>
            <View style={styles.sessionInfo}>
              <ThemedText style={styles.sessionTitle}>Slip Circuit · 5pm</ThemedText>
              <View style={styles.sessionMeta}>
                <Ionicons name="location-outline" size={12} color={TEXT_MUTED} />
                <ThemedText style={styles.sessionMetaText}>Northstar Rink  ·  45 min</ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
          </TouchableOpacity>

          {/* Featured Drill */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>FEATURED DRILL</ThemedText>
            <TouchableOpacity><ThemedText style={styles.seeAll}>See all ›</ThemedText></TouchableOpacity>
          </View>

          {featuredDrill && (
            <View style={styles.featuredCard}>
              {/* Diagram placeholder */}
              <View style={styles.featuredDiagram}>
                <View style={styles.diagramCircle} />
                <View style={[styles.diagramCircle, { position: 'absolute', right: 40, bottom: 20 }]} />
                <View style={styles.diagramDot} />
                <View style={[styles.diagramDot, { left: '60%', top: '70%' }]} />
                <View style={[styles.diagramDot, { left: '80%', top: '30%' }]} />
                <View style={styles.diagramPlayBtn}>
                  <Ionicons name="play" size={20} color={GREEN} />
                </View>
                <View style={styles.advancedBadge}>
                  <ThemedText style={styles.advancedText}>{featuredDrill.difficulty_level?.toUpperCase() || 'ADVANCED'}</ThemedText>
                </View>
              </View>

              <View style={styles.featuredBody}>
                {featuredDrill.drill_categories && (
                  <ThemedText style={styles.featuredCategory}>{featuredDrill.drill_categories.title.toUpperCase()}</ThemedText>
                )}
                <ThemedText style={styles.featuredTitle}>{featuredDrill.title}</ThemedText>
                {featuredDrill.short_description && (
                  <ThemedText style={styles.featuredDesc} numberOfLines={2}>{featuredDrill.short_description}</ThemedText>
                )}
              </View>

              <TouchableOpacity
                style={styles.viewDrillBtn}
                onPress={() => router.push(`/drill/${featuredDrill.id}`)}
              >
                <ThemedText style={styles.viewDrillText}>VIEW DRILL →</ThemedText>
              </TouchableOpacity>
            </View>
          )}

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

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  logoText: { fontSize: 28, fontWeight: '900', color: TEAL, letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 5, lineHeight: 18 },
  bellBtn: { marginTop: 8 },

  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 24 },
  welcomeLeft: { flex: 1 },
  welcomeLabel: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 4 },
  welcomeName: { fontSize: 28, fontWeight: '800', color: GREEN, marginBottom: 4, lineHeight: 38 },
  welcomeTagline: { fontSize: 14, color: TEXT_MUTED },
  streakBadge: { backgroundColor: CARD2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: GREEN_DIM },
  streakNumber: { fontSize: 24, fontWeight: '800', color: GREEN },
  streakLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },

  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 28 },
  quickAction: { flex: 1, backgroundColor: CARD, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: BORDER },
  quickActionLabel: { fontSize: 10, fontWeight: '600', color: TEXT_MUTED, textAlign: 'center' },
  quickActionSoon: { fontSize: 8, fontWeight: '600', color: '#F4A261', textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2 },
  seeAll: { fontSize: 13, color: GREEN, fontWeight: '600' },

  categoryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 28 },
  categoryCard: { flex: 1, aspectRatio: 1, backgroundColor: CARD2, borderRadius: 14, padding: 12, justifyContent: 'flex-end', borderWidth: 1, borderColor: '#1B3A2A', position: 'relative' },
  categoryName: { fontSize: 12, fontWeight: '700', color: TEXT },
  soonBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#F4A261', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soonText: { fontSize: 9, fontWeight: '800', color: '#000' },

  continueCard: { marginHorizontal: 20, marginBottom: 28, backgroundColor: CARD, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: BORDER },
  inProgressBadge: { alignSelf: 'flex-start', backgroundColor: GREEN_DIM, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 12 },
  inProgressText: { fontSize: 10, fontWeight: '800', color: GREEN, letterSpacing: 1 },
  continueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  continueTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  continuePercent: { fontSize: 22, fontWeight: '800', color: GREEN },
  continueMeta: { fontSize: 12, color: TEXT_MUTED, marginBottom: 14 },
  progressBar: { height: 6, backgroundColor: BORDER, borderRadius: 3, marginBottom: 16 },
  progressFill: { height: 6, backgroundColor: GREEN, borderRadius: 3 },
  resumeButton: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  resumeText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 1 },

  progressionCard: { marginHorizontal: 20, marginBottom: 28, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  progressionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  pathwayBadge: { backgroundColor: GREEN_DIM, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  pathwayText: { fontSize: 11, fontWeight: '800', color: GREEN, letterSpacing: 1 },
  nextUpBadge: { backgroundColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  nextUpText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },
  progressionDivider: { height: 1, backgroundColor: BORDER },
  progressionBottom: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  progressionInfo: { flex: 1 },
  progressionTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  progressionMeta: { fontSize: 12, color: TEXT_MUTED },

  sessionCard: { marginHorizontal: 20, marginBottom: 28, backgroundColor: CARD, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, gap: 14 },
  sessionDateBox: { backgroundColor: GREEN_DIM, borderRadius: 10, width: 48, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: GREEN },
  sessionDay: { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 1 },
  sessionDate: { fontSize: 22, fontWeight: '800', color: GREEN, lineHeight: 28 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionMetaText: { fontSize: 12, color: TEXT_MUTED },

  featuredCard: { marginHorizontal: 20, marginBottom: 28, backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  featuredDiagram: { height: 160, backgroundColor: '#0A1F15', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  diagramCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: GREEN, borderStyle: 'dashed', position: 'absolute', left: 30, top: 20 },
  diagramDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN, position: 'absolute', left: '30%', top: '40%' },
  diagramPlayBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  advancedBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: GREEN_DIM },
  advancedText: { fontSize: 10, fontWeight: '800', color: GREEN, letterSpacing: 1 },
  featuredBody: { padding: 16, paddingBottom: 12 },
  featuredCategory: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 2, marginBottom: 4 },
  featuredTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 6 },
  featuredDesc: { fontSize: 13, color: TEXT_MUTED, lineHeight: 18 },
  viewDrillBtn: { margin: 16, marginTop: 4, backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  viewDrillText: { fontSize: 14, fontWeight: '800', color: '#000', letterSpacing: 1 },
});
