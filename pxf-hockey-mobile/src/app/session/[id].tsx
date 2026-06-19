import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    difficulty_level: string;
    age_group: string;
    duration_minutes: number;
    equipment_needed: string[] | null;
    category: { title: string } | null;
  };
};

type Session = {
  id: string;
  title: string;
  date: string;
  age_group: string | null;
  skill_level: string | null;
  total_duration_minutes: number;
  main_focus: string[];
  notes: string | null;
  is_complete: boolean;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [drills, setDrills] = useState<DrillInSession[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { if (id) fetchSession(); }, [id]));

  async function fetchSession() {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    const { data: drillsData } = await supabase
      .from('session_drills')
      .select('id, sort_order, drill:drill_id(id, title, difficulty_level, age_group, duration_minutes, equipment_needed, category:category_id(title))')
      .eq('session_id', id)
      .order('sort_order');

    if (sessionData) setSession(sessionData);
    if (drillsData) setDrills(drillsData as any);
    setLoading(false);
  }

  async function toggleComplete() {
    if (!session) return;
    const { data } = await supabase
      .from('sessions')
      .update({ is_complete: !session.is_complete })
      .eq('id', id)
      .select()
      .single();
    if (data) setSession(data);
  }

  async function removeDrill(sessionDrillId: string) {
    await supabase.from('session_drills').delete().eq('id', sessionDrillId);
    setDrills(prev => prev.filter(d => d.id !== sessionDrillId));
  }

  async function deleteSession() {
    Alert.alert('Delete Session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('sessions').delete().eq('id', id);
          router.navigate('/sessions');
        },
      },
    ]);
  }

  // Derived stats
  const totalTime = drills.reduce((sum, d) => sum + (d.drill?.duration_minutes ?? 0), 0);
  const focusAreas = session?.main_focus ?? [];
  const toArr = (v: any): string[] => Array.isArray(v) ? v : [];
  const equipment = Array.from(
    new Set(drills.flatMap(d => toArr(d.drill?.equipment_needed)))
  ).filter(Boolean);

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={GREEN} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ThemedText style={{ color: TEXT_MUTED }}>Session not found.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Logo */}
        <View style={styles.logoHeader}>
          <View>
            <GradientText style={styles.logoText} colors={[TEAL, GREEN]}>PXF</GradientText>
            <GradientText style={styles.logoSub} colors={[TEAL, GREEN]}>HOCKEY</GradientText>
          </View>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={22} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* Nav header */}
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/sessions')}>
            <Ionicons name="arrow-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={styles.navTitle}>SESSION</ThemedText>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil" size={14} color={TEAL} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Title + meta */}
          <View style={styles.titleSection}>
            <ThemedText style={styles.sessionTitle}>{session.title}</ThemedText>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={TEXT_MUTED} />
              <ThemedText style={styles.metaText}> {formatDate(session.date)}</ThemedText>
              {session.age_group && (
                <>
                  <ThemedText style={styles.metaDot}> · </ThemedText>
                  <Ionicons name="people-outline" size={12} color={TEXT_MUTED} />
                  <ThemedText style={styles.metaText}> {session.age_group}</ThemedText>
                </>
              )}
              {session.skill_level && (
                <>
                  <ThemedText style={styles.metaDot}> · </ThemedText>
                  <Ionicons name="bar-chart-outline" size={12} color={TEXT_MUTED} />
                  <ThemedText style={styles.metaText}> {session.skill_level}</ThemedText>
                </>
              )}
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
              <ThemedText style={styles.metaText}> {totalTime} min</ThemedText>
              <ThemedText style={styles.metaDot}> · </ThemedText>
              <Ionicons name="layers-outline" size={12} color={TEXT_MUTED} />
              <ThemedText style={styles.metaText}> {drills.length} drills</ThemedText>
            </View>
          </View>

          {/* Stats cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Ionicons name="time-outline" size={14} color={TEAL} />
                <ThemedText style={styles.statCardLabel}>TOTAL TIME</ThemedText>
              </View>
              <ThemedText style={styles.statCardValue}>{totalTime} min</ThemedText>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Ionicons name="layers-outline" size={14} color={GREEN} />
                <ThemedText style={styles.statCardLabel}>DRILLS</ThemedText>
              </View>
              <ThemedText style={styles.statCardValue}>{drills.length}</ThemedText>
            </View>
          </View>

          {/* Focus Areas */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>FOCUS AREAS</ThemedText>
            {focusAreas.length > 0 ? (
              <View style={styles.chipRow}>
                {focusAreas.map(f => (
                  <View key={f} style={styles.focusChip}>
                    <ThemedText style={styles.focusChipText}>{f}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.emptyHint}>No drills yet</ThemedText>
            )}
          </View>

          {/* Equipment */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>EQUIPMENT</ThemedText>
            {equipment.length > 0 ? (
              <View style={styles.chipRow}>
                {equipment.map(eq => (
                  <View key={eq} style={styles.equipChip}>
                    <Ionicons name="checkmark-circle-outline" size={12} color={TEAL} />
                    <ThemedText style={styles.equipChipText}> {eq}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.emptyHint}>—</ThemedText>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.dupBtn}>
              <Ionicons name="copy-outline" size={14} color={TEXT_MUTED} />
              <ThemedText style={styles.dupText}> DUPLICATE</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeBtn} onPress={toggleComplete} activeOpacity={0.85}>
              <LinearGradient
                colors={session.is_complete ? ['#1C2128', '#1C2128'] : [TEAL, GREEN]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.completeGradient}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={session.is_complete ? TEXT_MUTED : '#000'} />
                <ThemedText style={[styles.completeText, session.is_complete && { color: TEXT_MUTED }]}>
                  {session.is_complete ? 'COMPLETED' : 'COMPLETE'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteSession}>
              <Ionicons name="trash-outline" size={16} color={RED} />
            </TouchableOpacity>
          </View>

          {/* Session Plan */}
          <View style={styles.planHeader}>
            <ThemedText style={styles.sectionLabel}>SESSION PLAN</ThemedText>
            <ThemedText style={styles.dragHint}>Drag to reorder</ThemedText>
          </View>

          {drills.length === 0 ? (
            <View style={styles.emptyPlan}>
              <ThemedText style={styles.emptyPlanText}>No drills yet.</ThemedText>
              <TouchableOpacity
                style={styles.addDrillBtn}
                onPress={() => router.push({ pathname: '/drills', params: { pickMode: '1', sessionId: id } })}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addDrillGradient}>
                  <Ionicons name="add" size={16} color="#000" />
                  <ThemedText style={styles.addDrillText}>ADD DRILL</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {drills.map((item, index) => (
                <View key={item.id} style={styles.drillCard}>
                  <View style={styles.drillCardLeft}>
                    <View style={styles.drillNumber}>
                      <ThemedText style={styles.drillNumberText}>{index + 1}</ThemedText>
                    </View>
                    <View style={styles.drillCardInfo}>
                      <ThemedText style={styles.drillCategory}>
                        {item.drill?.category?.title?.toUpperCase() ?? 'DRILL'}
                      </ThemedText>
                      <ThemedText style={styles.drillTitle}>{item.drill?.title}</ThemedText>
                      <ThemedText style={styles.drillMeta}>
                        {item.drill?.difficulty_level} · {item.drill?.age_group} · {item.drill?.duration_minutes} min
                      </ThemedText>
                      {toArr(item.drill?.equipment_needed).length > 0 && (
                        <ThemedText style={styles.drillEquip}>
                          {toArr(item.drill?.equipment_needed).join(', ')}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <Ionicons name="menu" size={18} color={TEXT_MUTED} />
                </View>
              ))}

              {/* Add more drills */}
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={() => router.push({ pathname: '/drills', params: { pickMode: '1', sessionId: id } })}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addDrillGradient}>
                  <Ionicons name="add" size={16} color="#000" />
                  <ThemedText style={styles.addDrillText}>ADD DRILL</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </>
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

  logoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  logoText: { fontSize: 28, fontWeight: '900', letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', letterSpacing: 5, lineHeight: 18 },

  navHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: GREEN, letterSpacing: 3, textAlign: 'center' },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0D2A24', borderWidth: 1, borderColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  titleSection: { paddingHorizontal: 20, paddingBottom: 16 },
  sessionTitle: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  metaText: { fontSize: 12, color: TEXT_MUTED },
  metaDot: { fontSize: 12, color: TEXT_MUTED },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statCardLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },
  statCardValue: { fontSize: 24, fontWeight: '800', color: TEXT },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  focusChip: { backgroundColor: '#0D2A24', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#1A3D35' },
  focusChipText: { fontSize: 13, color: TEAL, fontWeight: '600' },
  equipChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: BORDER },
  equipChipText: { fontSize: 12, color: TEXT_MUTED },
  emptyHint: { fontSize: 13, color: TEXT_MUTED },

  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 28, alignItems: 'center' },
  dupBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 10 },
  dupText: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },
  completeBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  completeGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  completeText: { fontSize: 12, fontWeight: '800', color: '#000' },
  deleteBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#2A0D0D', borderWidth: 1, borderColor: '#4A1A1A', alignItems: 'center', justifyContent: 'center' },

  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  dragHint: { fontSize: 11, color: TEXT_MUTED },

  emptyPlan: { marginHorizontal: 20, backgroundColor: CARD, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER, gap: 16 },
  emptyPlanText: { fontSize: 14, color: TEXT_MUTED },
  addDrillBtn: { borderRadius: 10, overflow: 'hidden' },
  addMoreBtn: { marginHorizontal: 20, marginTop: 12, borderRadius: 10, overflow: 'hidden' },
  addDrillGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 24, gap: 6 },
  addDrillText: { fontSize: 13, fontWeight: '800', color: '#000', letterSpacing: 1 },

  drillCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  drillCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  drillNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0D2A24', borderWidth: 1, borderColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  drillNumberText: { fontSize: 12, fontWeight: '800', color: TEAL },
  drillCardInfo: { flex: 1 },
  drillCategory: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1, marginBottom: 3 },
  drillTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4 },
  drillMeta: { fontSize: 11, color: TEXT_MUTED, marginBottom: 2 },
  drillEquip: { fontSize: 11, color: TEXT_MUTED },
});
