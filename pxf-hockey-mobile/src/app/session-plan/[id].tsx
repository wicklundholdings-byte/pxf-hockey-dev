import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const ORANGE = '#F59E0B';

const FOCUS_OPTIONS = [
  'PXF Slips', 'PXF Skating', 'Skating', 'Puck Skills',
  'Flow', 'Team Systems', 'Shooting', 'Small Area',
  'Puck Protection', 'Games', 'Goalie', 'GameIQ',
];

type DrillRow = {
  id: string;
  drill_id: string;
  sort_order: number;
  duration_min: number | null;
  drills: { id: string; title: string; difficulty_level: string | null; duration_minutes: number | null } | null;
};

export default function SessionPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bottom: bottomInset } = useSafeAreaInsets();

  const [plan, setPlan] = useState<any>(null);
  const [drills, setDrills] = useState<DrillRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Focus areas
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [focusDraft, setFocusDraft] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [id])
  );

  async function loadPlan() {
    if (!id) { setLoading(false); return; }

    // Fetch plan + session_drills separately to avoid join RLS issues
    const [{ data: planData }, { data: sdData, error: sdError }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', id).single(),
      supabase
        .from('session_drills')
        .select('id, drill_id, sort_order, duration_min, notes')
        .eq('session_id', id)
        .order('sort_order'),
    ]);

    if (sdError) console.error('session_drills fetch error:', sdError.message);

    // Now fetch drill details in a second query
    const drillIds = (sdData ?? []).map((sd: any) => sd.drill_id);
    let drillMap: Record<string, any> = {};
    if (drillIds.length > 0) {
      const { data: drillDetails, error: drillError } = await supabase
        .from('drills')
        .select('id, title, difficulty_level, duration_minutes')
        .in('id', drillIds);
      if (drillError) console.error('drills fetch error:', drillError.message);
      (drillDetails ?? []).forEach((d: any) => { drillMap[d.id] = d; });
    }

    const merged: DrillRow[] = (sdData ?? []).map((sd: any) => ({
      ...sd,
      drills: drillMap[sd.drill_id] ?? null,
    }));

    setPlan(planData);
    setDrills(merged);
    setLoading(false);
  }

  async function saveTitle() {
    if (!titleDraft.trim() || titleDraft === plan?.title) { setEditingTitle(false); return; }
    await supabase.from('sessions').update({ title: titleDraft.trim() }).eq('id', id);
    setPlan((p: any) => ({ ...p, title: titleDraft.trim() }));
    setEditingTitle(false);
  }

  async function saveNotes() {
    setSavingNotes(true);
    await supabase.from('sessions').update({ notes: notesDraft.trim() || null }).eq('id', id);
    setPlan((p: any) => ({ ...p, notes: notesDraft.trim() || null }));
    setSavingNotes(false);
    setShowNotesModal(false);
  }

  async function saveFocus() {
    await supabase.from('sessions').update({ main_focus: focusDraft.length ? focusDraft : null }).eq('id', id);
    setPlan((p: any) => ({ ...p, main_focus: focusDraft.length ? focusDraft : null }));
    setShowFocusModal(false);
  }

  async function removeDrill(sessionDrillId: string) {
    await supabase.from('session_drills').delete().eq('id', sessionDrillId);
    setDrills(prev => prev.filter(d => d.id !== sessionDrillId));
  }

  function totalDuration() {
    return drills.reduce((acc, d) => {
      const mins = d.duration_min ?? d.drills?.duration_minutes ?? 0;
      return acc + mins;
    }, 0);
  }

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  const focusAreas: string[] = Array.isArray(plan?.main_focus) ? plan.main_focus : [];

  const FOOTER_H = 80 + bottomInset;

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <GradientText
            colors={[TEAL, GREEN]}
            style={s.logoTop}
          >PXF</GradientText>
          <GradientText
            colors={[TEAL, GREEN]}
            style={s.logoSub}
          >HOCKEY</GradientText>
          <TouchableOpacity style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={MUTED} />
          </TouchableOpacity>
        </View>

        {/* Nav row */}
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.push('/playbook' as any)}>
            <Ionicons name="arrow-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={s.navLabel}>PRACTICE PLAN</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Title */}
          {editingTitle ? (
            <View style={s.titleEditRow}>
              <TextInput
                style={s.titleInput}
                value={titleDraft}
                onChangeText={setTitleDraft}
                autoFocus
                onBlur={saveTitle}
                onSubmitEditing={saveTitle}
                returnKeyType="done"
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setTitleDraft(plan?.title ?? ''); setEditingTitle(true); }} activeOpacity={0.8}>
              <ThemedText style={s.planTitle}>{plan?.title ?? 'Untitled Plan'}</ThemedText>
            </TouchableOpacity>
          )}

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.statChip}>
              <Ionicons name="time-outline" size={13} color={MUTED} />
              <ThemedText style={s.statText}>{totalDuration()} min</ThemedText>
            </View>
            <View style={s.statChip}>
              <Ionicons name="layers-outline" size={13} color={MUTED} />
              <ThemedText style={s.statText}>{drills.length} drills</ThemedText>
            </View>
          </View>

          {/* Focus Areas */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <ThemedText style={s.sectionLabel}>FOCUS AREAS</ThemedText>
              <TouchableOpacity onPress={() => { setFocusDraft(focusAreas); setShowFocusModal(true); }}>
                <ThemedText style={s.sectionAction}>{focusAreas.length ? 'Edit' : '+ Add'}</ThemedText>
              </TouchableOpacity>
            </View>
            {focusAreas.length > 0 ? (
              <View style={s.chipRow}>
                {focusAreas.map(f => (
                  <View key={f} style={s.focusChip}>
                    <ThemedText style={s.focusChipText}>{f}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={s.emptyHint}>No focus areas set</ThemedText>
            )}
          </View>

          {/* Drills */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <ThemedText style={s.sectionLabel}>DRILLS</ThemedText>
              <TouchableOpacity onPress={() => router.push(`/pick-drills/${id}` as any)}>
                <ThemedText style={s.sectionAction}>+ Add</ThemedText>
              </TouchableOpacity>
            </View>

            {drills.length === 0 ? (
              <TouchableOpacity
                style={s.addDrillsCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/pick-drills/${id}` as any)}
              >
                <Ionicons name="add-circle-outline" size={28} color={TEAL} />
                <ThemedText style={s.addDrillsText}>Add drills to this plan</ThemedText>
                <ThemedText style={s.addDrillsSub}>Pick from the PXF library or your own drills</ThemedText>
              </TouchableOpacity>
            ) : (
              <View style={s.drillList}>
                {drills.map((d, idx) => {
                  const mins = d.duration_min ?? d.drills?.duration_minutes ?? 0;
                  const level = d.drills?.difficulty_level;
                  return (
                    <View key={d.id} style={s.drillRow}>
                      <View style={s.drillNum}>
                        <ThemedText style={s.drillNumText}>{idx + 1}</ThemedText>
                      </View>
                      <View style={s.drillInfo}>
                        <ThemedText style={s.drillTitle} numberOfLines={1}>
                          {d.drills?.title ?? 'Drill'}
                        </ThemedText>
                        <ThemedText style={s.drillMeta}>
                          {[level ? level.charAt(0).toUpperCase() + level.slice(1) : null, mins ? `${mins} min` : null].filter(Boolean).join(' · ')}
                        </ThemedText>
                      </View>
                      <TouchableOpacity onPress={() => removeDrill(d.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle-outline" size={20} color={MUTED} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <ThemedText style={s.sectionLabel}>NOTES</ThemedText>
              <TouchableOpacity onPress={() => { setNotesDraft(plan?.notes ?? ''); setShowNotesModal(true); }}>
                <ThemedText style={s.sectionAction}>{plan?.notes ? 'Edit' : '+ Add'}</ThemedText>
              </TouchableOpacity>
            </View>
            {plan?.notes ? (
              <TouchableOpacity onPress={() => { setNotesDraft(plan.notes); setShowNotesModal(true); }} activeOpacity={0.8}>
                <View style={s.notesCard}>
                  <ThemedText style={s.notesText}>{plan.notes}</ThemedText>
                </View>
              </TouchableOpacity>
            ) : (
              <ThemedText style={s.emptyHint}>Add coaching notes or plan overview</ThemedText>
            )}
          </View>

          <View style={{ height: FOOTER_H + 8 }} />
        </ScrollView>

      </SafeAreaView>

      {/* Absolutely pinned footer — bypasses all flex/SafeAreaView ambiguity */}
      <View style={[s.footer, { bottom: bottomInset, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            Alert.alert(
              'Use This Plan',
              "This is your reusable practice plan template. When you schedule a session or camp, you'll be able to select this plan to pre-load all its drills.",
              [
                { text: 'Go to Schedule', onPress: () => router.push('/schedule' as any) },
                { text: 'Done', style: 'cancel' },
              ]
            )
          }
        >
          <LinearGradient
            colors={[TEAL, GREEN]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.useBtn}
          >
            <ThemedText style={s.useBtnText}>Use This Plan</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Focus Areas Modal */}
      <Modal visible={showFocusModal} transparent animationType="slide" onRequestClose={() => setShowFocusModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFocusModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetTitleRow}>
            <ThemedText style={s.sheetTitle}>Focus Areas</ThemedText>
            <TouchableOpacity onPress={saveFocus}>
              <ThemedText style={s.sheetSave}>Done</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={s.focusGrid}>
            {FOCUS_OPTIONS.map(f => {
              const active = focusDraft.includes(f);
              return (
                <TouchableOpacity
                  key={f}
                  style={[s.focusOption, active && s.focusOptionActive]}
                  onPress={() => setFocusDraft(prev => active ? prev.filter(x => x !== f) : [...prev, f])}
                  activeOpacity={0.8}
                >
                  <ThemedText style={[s.focusOptionText, active && s.focusOptionTextActive]}>{f}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal visible={showNotesModal} transparent animationType="slide" onRequestClose={() => setShowNotesModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowNotesModal(false)} />
        <View style={[s.sheet, { paddingBottom: 40 }]}>
          <View style={s.sheetHandle} />
          <View style={s.sheetTitleRow}>
            <ThemedText style={s.sheetTitle}>Notes</ThemedText>
            <TouchableOpacity onPress={saveNotes} disabled={savingNotes}>
              {savingNotes
                ? <ActivityIndicator size="small" color={TEAL} />
                : <ThemedText style={s.sheetSave}>Save</ThemedText>
              }
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.notesInput}
            value={notesDraft}
            onChangeText={setNotesDraft}
            multiline
            autoFocus
            placeholder="Coaching notes, plan overview, warm-up instructions..."
            placeholderTextColor={MUTED}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0 },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 8 },
  logoTop: { fontSize: 28, fontWeight: '900', lineHeight: 34 },
  logoSub: { fontSize: 11, fontWeight: '800', letterSpacing: 5, lineHeight: 16, marginBottom: 4 },
  notifBtn: { position: 'absolute', top: 8, right: 16 },

  // Nav
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  navLabel: { fontSize: 13, fontWeight: '700', color: TEAL, letterSpacing: 2 },

  // Title
  planTitle: { fontSize: 28, fontWeight: '900', color: TEXT, lineHeight: 34, marginBottom: 8 },
  titleEditRow: { marginBottom: 8 },
  titleInput: {
    fontSize: 26, fontWeight: '800', color: TEXT,
    borderBottomWidth: 2, borderBottomColor: TEAL,
    paddingVertical: 4,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: BORDER,
  },
  statText: { fontSize: 12, fontWeight: '600', color: MUTED },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2 },
  sectionAction: { fontSize: 13, fontWeight: '600', color: TEAL },
  emptyHint: { fontSize: 13, color: MUTED, fontStyle: 'italic' },

  // Focus chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  focusChip: {
    backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)',
  },
  focusChipText: { fontSize: 13, fontWeight: '600', color: TEAL },

  // Drill list
  addDrillsCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1,
    borderColor: BORDER, borderStyle: 'dashed',
    alignItems: 'center', paddingVertical: 28, gap: 8,
  },
  addDrillsText: { fontSize: 15, fontWeight: '700', color: TEXT },
  addDrillsSub:  { fontSize: 13, color: MUTED },
  drillList: { gap: 8 },
  drillRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  drillNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,196,180,0.15)', borderWidth: 1, borderColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },
  drillNumText:  { fontSize: 12, fontWeight: '800', color: TEAL },
  drillInfo:     { flex: 1 },
  drillTitle:    { fontSize: 14, fontWeight: '700', color: TEXT },
  drillMeta:     { fontSize: 12, color: MUTED, marginTop: 2 },

  // Notes
  notesCard: {
    backgroundColor: CARD, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  notesText: { fontSize: 14, color: '#C0C8D4', lineHeight: 21 },

  // Footer
  footer: {
    position: 'absolute',
    left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: BG,
  },
  useBtn:     { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  useBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  sheetSave:  { fontSize: 15, fontWeight: '700', color: TEAL },

  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  focusOption: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
  },
  focusOptionActive: { backgroundColor: 'rgba(0,196,180,0.12)', borderColor: TEAL },
  focusOptionText:   { fontSize: 13, fontWeight: '600', color: MUTED },
  focusOptionTextActive: { color: TEAL },

  notesInput: {
    backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    color: TEXT, fontSize: 15, padding: 14, minHeight: 140, textAlignVertical: 'top',
  },
});
