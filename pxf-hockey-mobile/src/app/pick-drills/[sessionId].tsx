import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
const RED = '#EF4444';

type Drill = {
  id: string;
  title: string;
  difficulty_level: string;
  age_group: string;
  duration_minutes: number;
};

type Category = {
  id: string;
  title: string;
  description: string;
  drills: Drill[];
};

export default function PickDrillsScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addedDrillIds, setAddedDrillIds] = useState<string[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    fetchDrills();
    fetchAddedDrills();
    fetchFavorites();
  }, []);

  async function fetchDrills() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: cats } = await supabase
      .from('drill_categories')
      .select('id, title, description')
      .order('sort_order');
    // Show PXF library drills (is_published = true) + coach's own drills
    const { data: drills } = await supabase
      .from('drills')
      .select('id, title, difficulty_level, age_group, duration_minutes, category_id, coach_id, is_published')
      .or(`is_published.eq.true${user ? `,coach_id.eq.${user.id}` : ''}`);
    if (cats && drills) {
      // My Drills: coach's own uncategorised drills — add as synthetic category
      const myDrills = user ? drills.filter((d: any) => d.coach_id === user.id) : [];
      const libDrills = drills.filter((d: any) => d.is_published);
      const categorised = cats.map(cat => ({
        ...cat,
        drills: libDrills.filter((d: any) => d.category_id === cat.id),
      })).filter(cat => cat.drills.length > 0);
      if (myDrills.length > 0) {
        categorised.unshift({ id: 'my-drills', title: 'My Drills', description: 'Your custom drills', drills: myDrills });
      }
      setCategories(categorised);
    }
    setLoading(false);
  }

  async function fetchAddedDrills() {
    const { data } = await supabase
      .from('session_drills').select('drill_id').eq('session_id', sessionId);
    if (data) setAddedDrillIds(data.map((r: any) => r.drill_id));
  }

  async function fetchFavorites() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('drill_favorites').select('drill_id').eq('user_id', user.id);
    if (data) setFavoriteIds(data.map((r: any) => r.drill_id));
  }

  async function toggleDrill(drillId: string) {
    if (adding) return;
    if (addedDrillIds.includes(drillId)) {
      setAdding(drillId);
      await supabase.from('session_drills').delete()
        .eq('session_id', sessionId).eq('drill_id', drillId);
      setAddedDrillIds(prev => prev.filter(id => id !== drillId));
      setAdding(null);
    } else {
      setAdding(drillId);
      const { data: countData } = await supabase
        .from('session_drills').select('id').eq('session_id', sessionId);
      const { error } = await supabase.from('session_drills').insert({
        session_id: sessionId,
        drill_id: drillId,
        sort_order: countData?.length ?? 0,
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setAddedDrillIds(prev => [...prev, drillId]);
      }
      setAdding(null);
    }
  }

  const searched = search.trim()
    ? categories.map(cat => ({
        ...cat,
        drills: cat.drills.filter(d => d.title.toLowerCase().includes(search.toLowerCase())),
      })).filter(cat => cat.drills.length > 0)
    : categories;

  const filtered = showFavoritesOnly
    ? searched.map(cat => ({
        ...cat,
        drills: cat.drills.filter(d => favoriteIds.includes(d.id)),
      })).filter(cat => cat.drills.length > 0)
    : searched;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <View style={styles.logoHeader}>
            <View>
              <GradientText style={styles.logoText} colors={[TEAL, GREEN]}>PXF</GradientText>
              <GradientText style={styles.logoSub} colors={[TEAL, GREEN]}>HOCKEY</GradientText>
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.push(`/session-plan/${sessionId}` as any)}>
              <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.doneGradient}>
                <ThemedText style={styles.doneText}>
                  Done{addedDrillIds.length > 0 ? ` (${addedDrillIds.length})` : ''}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <ThemedText style={styles.headerLabel}>ADD TO SESSION</ThemedText>
            <ThemedText style={styles.headerTitle}>Pick Drills</ThemedText>
            <ThemedText style={styles.headerSub}>Tap to add · Tap again to remove</ThemedText>
          </View>

          {/* Filter tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity style={styles.filterTab} onPress={() => setShowFavoritesOnly(false)}>
              <ThemedText style={[styles.filterTabText, !showFavoritesOnly && styles.filterTabTextActive]}>ALL DRILLS</ThemedText>
              {!showFavoritesOnly && (
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.filterTabUnderline} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterTab} onPress={() => setShowFavoritesOnly(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="heart" size={12} color={showFavoritesOnly ? RED : TEXT_MUTED} />
                <ThemedText style={[styles.filterTabText, showFavoritesOnly && styles.filterTabTextFav]}> FAVORITES</ThemedText>
              </View>
              {showFavoritesOnly && (
                <LinearGradient colors={[RED, '#FF6B6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.filterTabUnderline} />
              )}
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={TEXT_MUTED} />
              <TextInput
                placeholder="Search drills..."
                placeholderTextColor={TEXT_MUTED}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name={showFavoritesOnly ? 'heart-outline' : 'search-outline'} size={32} color={TEXT_MUTED} />
              <ThemedText style={styles.emptyText}>
                {showFavoritesOnly ? 'No favorites yet' : 'No drills found'}
              </ThemedText>
            </View>
          ) : (
            filtered.map(section => (
              <View key={section.id}>
                <View style={styles.categoryHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.categoryTitle}>{section.title.toUpperCase()}</ThemedText>
                    <ThemedText style={styles.categoryDesc}>{section.description}</ThemedText>
                  </View>
                  <ThemedText style={styles.drillCount}>{section.drills.length} drills</ThemedText>
                </View>

                {section.drills.map(drill => {
                  const isAdded = addedDrillIds.includes(drill.id);
                  const isAdding = adding === drill.id;

                  return (
                    <TouchableOpacity
                      key={drill.id}
                      style={[styles.drillCard, isAdded && styles.drillCardAdded]}
                      onPress={() => toggleDrill(drill.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.thumbnail}>
                        {isAdding ? (
                          <View style={styles.addCircle}>
                            <ActivityIndicator size="small" color={TEAL} />
                          </View>
                        ) : isAdded ? (
                          <View style={styles.addedCircle}>
                            <Ionicons name="checkmark" size={18} color="#000" />
                          </View>
                        ) : (
                          <View style={styles.addCircle}>
                            <Ionicons name="add" size={22} color={TEAL} />
                          </View>
                        )}
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

                      {isAdded && <ThemedText style={styles.addedLabel}>ADDED</ThemedText>}
                    </TouchableOpacity>
                  );
                })}
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
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  logoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  logoText: { fontSize: 28, fontWeight: '800', letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', letterSpacing: 5, lineHeight: 18 },
  doneBtn: { marginTop: 8, borderRadius: 10, overflow: 'hidden' },
  doneGradient: { paddingHorizontal: 16, paddingVertical: 8 },
  doneText: { fontSize: 13, fontWeight: '800', color: '#000' },

  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: TEXT, lineHeight: 42 },
  headerSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 4 },

  filterTabs: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: BORDER },
  filterTab: { marginRight: 24, paddingBottom: 10, alignItems: 'center' },
  filterTabText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },
  filterTabTextActive: { color: TEAL },
  filterTabTextFav: { color: RED },
  filterTabUnderline: { height: 2, width: '100%', borderRadius: 1, position: 'absolute', bottom: 0 },

  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 10, marginBottom: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: SEARCH_BG, borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 8 },
  searchInput: { flex: 1, color: TEXT, fontSize: 15 },

  categoryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  categoryTitle: { fontSize: 12, fontWeight: '800', color: TEAL, letterSpacing: 2, marginBottom: 2 },
  categoryDesc: { fontSize: 13, color: TEXT_MUTED },
  drillCount: { fontSize: 12, color: TEXT_MUTED, paddingTop: 1 },

  drillCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: BORDER },
  drillCardAdded: { borderColor: TEAL, backgroundColor: '#0A1F1A' },

  thumbnail: { width: 72, height: 72, backgroundColor: '#0A1F15', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  addCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  addedCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  drillInfo: { flex: 1 },
  drillCategory: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1, marginBottom: 3 },
  drillTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 6 },
  drillMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: TEXT_MUTED },
  metaDot: { fontSize: 11, color: TEXT_MUTED, marginHorizontal: 4 },
  addedLabel: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 1, marginLeft: 8 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: TEXT_MUTED },
});
