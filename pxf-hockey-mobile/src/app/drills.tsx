import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const CARD = '#0F1923';
const GREEN = '#3DFF8F';
const TEAL = '#00C4B4';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';
const SEARCH_BG = '#161B22';
const BORDER = '#1A2A1E';

type Drill = {
  id: string;
  title: string;
  difficulty_level: string;
  age_group: string;
  duration_minutes: number;
  video_url: string | null;
};

type Category = {
  id: string;
  title: string;
  description: string;
  drills: Drill[];
};

export default function DrillsScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDrills();
  }, []);

  async function fetchDrills() {
    const { data: cats } = await supabase
      .from('drill_categories')
      .select('id, title, description')
      .order('sort_order');

    const { data: drills } = await supabase
      .from('drills')
      .select('id, title, difficulty_level, age_group, duration_minutes, video_url, category_id')
      .eq('is_published', true);

    if (cats && drills) {
      const grouped = cats.map((cat) => ({
        ...cat,
        drills: drills.filter((d: any) => d.category_id === cat.id),
      })).filter((cat) => cat.drills.length > 0);
      setCategories(grouped);
    }
    setLoading(false);
  }

  const filtered = search.trim()
    ? categories.map((cat) => ({
        ...cat,
        drills: cat.drills.filter((d) =>
          d.title.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.drills.length > 0)
    : categories;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Logo header */}
          <View style={styles.logoHeader}>
            <View>
              <GradientText style={styles.logoText} colors={[TEAL, GREEN]}>PXF</GradientText>
              <GradientText style={styles.logoSub} colors={[TEAL, GREEN]}>HOCKEY</GradientText>
            </View>
            <TouchableOpacity style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.header}>
            <ThemedText style={styles.headerLabel}>DRILL LIBRARY</ThemedText>
            <ThemedText style={styles.headerTitle}>Drills</ThemedText>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={TEXT_MUTED} />
              <TextInput
                placeholder="Search drills, skills, tags..."
                placeholderTextColor={TEXT_MUTED}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="options-outline" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
          ) : (
            filtered.map((section) => (
              <View key={section.id}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryHeaderLeft}>
                    <ThemedText style={styles.categoryTitle}>{section.title.toUpperCase()}</ThemedText>
                    <ThemedText style={styles.categoryDesc}>{section.description}</ThemedText>
                  </View>
                  <ThemedText style={styles.drillCount}>{section.drills.length} drills</ThemedText>
                </View>

                {section.drills.map((drill, i) => (
                  <TouchableOpacity key={drill.id} style={styles.drillCard} onPress={() => router.push(`/drill/${drill.id}`)}>
                    <View style={styles.thumbnail}>
                      <LinearGradient
                        colors={[TEAL, GREEN]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.playCircle}
                      >
                        <Ionicons name="play" size={14} color="#000" />
                      </LinearGradient>
                    </View>

                    <View style={styles.drillInfo}>
                      <ThemedText style={styles.drillCategory}>{section.title.toUpperCase()}</ThemedText>
                      <ThemedText style={styles.drillTitle}>{drill.title}</ThemedText>
                      <View style={styles.drillMeta}>
                        <Ionicons name="bar-chart-outline" size={11} color={TEXT_MUTED} />
                        <ThemedText style={styles.metaText}> {drill.difficulty_level}</ThemedText>
                        <ThemedText style={styles.metaDot}>·</ThemedText>
                        <Ionicons name="people-outline" size={11} color={TEXT_MUTED} />
                        <ThemedText style={styles.metaText}> {drill.age_group}</ThemedText>
                        {!!drill.duration_minutes && (
                          <>
                            <ThemedText style={styles.metaDot}>·</ThemedText>
                            <Ionicons name="time-outline" size={11} color={TEXT_MUTED} />
                            <ThemedText style={styles.metaText}> {drill.duration_minutes} min</ThemedText>
                          </>
                        )}
                      </View>
                    </View>

                    <View style={styles.drillActions}>
                      <TouchableOpacity style={styles.addBtn}>
                        <Ionicons name="add" size={18} color={GREEN} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.favoriteBtn}>
                        <Ionicons name="heart-outline" size={15} color={TEXT_MUTED} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  logoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  logoText: { fontSize: 28, fontWeight: '900', color: TEAL, letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 5, lineHeight: 18 },
  bellBtn: { marginTop: 8 },

  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: TEXT, lineHeight: 42 },

  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: SEARCH_BG, borderRadius: 12,
    paddingHorizontal: 14, height: 44, gap: 8,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 15 },
  filterBtn: {
    backgroundColor: SEARCH_BG, borderRadius: 12,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },

  categoryHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  categoryHeaderLeft: { flex: 1 },
  categoryTitle: { fontSize: 12, fontWeight: '800', color: TEAL, letterSpacing: 2, marginBottom: 2 },
  categoryDesc: { fontSize: 13, color: TEXT_MUTED },
  drillCount: { fontSize: 12, color: TEXT_MUTED, paddingTop: 1 },

  drillCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: CARD, borderRadius: 16,
    padding: 12, borderWidth: 1, borderColor: BORDER,
  },

  thumbnail: {
    width: 72, height: 72, backgroundColor: '#0A1F15',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, position: 'relative',
  },
  playCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  drillInfo: { flex: 1 },
  drillCategory: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1, marginBottom: 3 },
  drillTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 6 },
  drillMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: TEXT_MUTED },
  metaDot: { fontSize: 11, color: TEXT_MUTED, marginHorizontal: 4 },

  drillActions: { gap: 8, marginLeft: 8 },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  favoriteBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: '#21262D',
    alignItems: 'center', justifyContent: 'center',
  },
});
