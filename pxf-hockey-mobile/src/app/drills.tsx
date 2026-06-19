import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG = '#0D1117';
const CARD = '#0F1923';
const GREEN = '#3DFF8F';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';
const SEARCH_BG = '#161B22';

type Drill = {
  id: string;
  title: string;
  difficulty_level: string;
  age_group: string;
  duration_minutes: number;
  video_url: string | null;
  drill_categories: { title: string } | null;
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

          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerLabel}>DRILL LIBRARY</ThemedText>
            <ThemedText style={styles.headerTitle}>Drills</ThemedText>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <SymbolView name="magnifyingglass" tintColor={TEXT_MUTED} size={16} />
              <TextInput
                placeholder="Search drills, skills, tags..."
                placeholderTextColor={TEXT_MUTED}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <SymbolView name="line.3.horizontal.decrease" tintColor={TEXT_MUTED} size={18} />
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
                      <View style={styles.playCircle}>
                        <SymbolView name="play.fill" tintColor={GREEN} size={16} />
                      </View>
                      <View style={styles.levelBadge}>
                        <ThemedText style={styles.levelText}>L{i + 1}</ThemedText>
                      </View>
                    </View>

                    <View style={styles.drillInfo}>
                      <ThemedText style={styles.drillCategory}>{section.title.toUpperCase()}</ThemedText>
                      <ThemedText style={styles.drillTitle}>{drill.title}</ThemedText>
                      <View style={styles.drillMeta}>
                        <ThemedText style={styles.metaText}>{drill.difficulty_level}</ThemedText>
                        <ThemedText style={styles.metaDot}>·</ThemedText>
                        <ThemedText style={styles.metaText}>{drill.age_group}</ThemedText>
                        <ThemedText style={styles.metaDot}>·</ThemedText>
                        <ThemedText style={styles.metaText}>{drill.duration_minutes} min</ThemedText>
                      </View>
                    </View>

                    <View style={styles.drillActions}>
                      <TouchableOpacity style={styles.addBtn}>
                        <SymbolView name="plus" tintColor={GREEN} size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.favoriteBtn}>
                        <SymbolView name="heart" tintColor={TEXT_MUTED} size={16} />
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
  scrollContent: { paddingBottom: 100 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: TEXT },

  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SEARCH_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 15 },
  filterBtn: {
    backgroundColor: SEARCH_BG,
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  categoryHeaderLeft: { flex: 1 },
  categoryTitle: { fontSize: 12, fontWeight: '800', color: GREEN, letterSpacing: 2, marginBottom: 2 },
  categoryDesc: { fontSize: 13, color: TEXT_MUTED },
  drillCount: { fontSize: 12, color: TEXT_MUTED, paddingTop: 1 },

  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1A2A1E',
  },

  thumbnail: {
    width: 72,
    height: 72,
    backgroundColor: '#0A1F15',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  levelText: { fontSize: 9, fontWeight: '800', color: TEXT_MUTED },

  drillInfo: { flex: 1 },
  drillCategory: { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 1, marginBottom: 3 },
  drillTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 6 },
  drillMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: TEXT_MUTED },
  metaDot: { fontSize: 12, color: TEXT_MUTED, marginHorizontal: 4 },

  drillActions: { gap: 8, marginLeft: 8 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#21262D',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
