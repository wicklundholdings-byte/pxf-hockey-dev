import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
const MODAL_BG = '#0D1117';

const AGE_GROUPS = ['U9+', 'U11+', 'U13+', 'U15+'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
const FOCUS_OPTIONS = [
  'Skating Flow', 'Edge Control', 'Puck Control', 'Passing',
  'Shooting', 'Reaction Training', 'GameIQ', 'Circuits',
];

type Session = {
  id: string;
  title: string;
  date: string;
  age_group: string | null;
  skill_level: string | null;
  total_duration_minutes: number;
  main_focus: string[];
  is_complete: boolean;
  drill_count: number;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [ageGroup, setAgeGroup] = useState('U13+');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [duration, setDuration] = useState('60');
  const [focus, setFocus] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSessions(); }, []);

  async function fetchSessions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data } = await supabase
      .from('sessions')
      .select('*, session_drills(count)')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (data) {
      setSessions(data.map((s: any) => ({
        ...s,
        drill_count: s.session_drills?.[0]?.count ?? 0,
      })));
    }
    setLoading(false);
  }

  function resetForm() {
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setAgeGroup('U13+');
    setSkillLevel('Intermediate');
    setDuration('60');
    setFocus([]);
    setNotes('');
  }

  async function saveSession() {
    if (!title.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setSaving(false);

    const { data } = await supabase.from('sessions').insert({
      user_id: user.id,
      title: title.trim(),
      date,
      age_group: ageGroup,
      skill_level: skillLevel,
      total_duration_minutes: parseInt(duration) || 0,
      main_focus: focus,
      notes: notes.trim() || null,
    }).select().single();

    setSaving(false);
    if (data) {
      setShowModal(false);
      resetForm();
      fetchSessions();
      router.push(`/session/${data.id}`);
    }
  }

  function toggleFocus(item: string) {
    setFocus(prev =>
      prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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

          {/* Title */}
          <View style={styles.header}>
            <ThemedText style={styles.headerLabel}>PLAYBOOK</ThemedText>
            <ThemedText style={styles.headerTitle}>Sessions</ThemedText>
            <ThemedText style={styles.headerSub}>Plan, schedule, and run your practices.</ThemedText>
          </View>

          {/* Create Session button */}
          <TouchableOpacity style={styles.createBtn} activeOpacity={0.85} onPress={() => setShowModal(true)}>
            <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createGradient}>
              <Ionicons name="add" size={18} color="#000" />
              <ThemedText style={styles.createText}>CREATE SESSION</ThemedText>
            </LinearGradient>
          </TouchableOpacity>

          {/* Your Sessions */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>YOUR SESSIONS</ThemedText>
            <ThemedText style={styles.sessionCount}>{sessions.length} total</ThemedText>
          </View>

          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
          ) : sessions.length === 0 ? (
            /* Empty state */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="document-text-outline" size={28} color={TEAL} />
              </View>
              <ThemedText style={styles.emptyTitle}>No sessions yet</ThemedText>
              <ThemedText style={styles.emptyText}>Create your first session to start planning practices.</ThemedText>
              <TouchableOpacity style={styles.createBtnInner} activeOpacity={0.85} onPress={() => setShowModal(true)}>
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createGradient}>
                  <Ionicons name="add" size={18} color="#000" />
                  <ThemedText style={styles.createText}>CREATE SESSION</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            sessions.map(session => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() => router.push(`/session/${session.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.sessionCardTop}>
                  <ThemedText style={styles.sessionTitle}>{session.title}</ThemedText>
                  {session.is_complete && (
                    <View style={styles.completeBadge}>
                      <ThemedText style={styles.completeBadgeText}>DONE</ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.sessionMeta}>
                  <Ionicons name="calendar-outline" size={11} color={TEXT_MUTED} />
                  <ThemedText style={styles.metaText}> {formatDate(session.date)}</ThemedText>
                </View>
                <View style={styles.sessionStats}>
                  {session.age_group && (
                    <View style={styles.chip}>
                      <ThemedText style={styles.chipText}>{session.age_group}</ThemedText>
                    </View>
                  )}
                  {session.skill_level && (
                    <View style={styles.chip}>
                      <ThemedText style={styles.chipText}>{session.skill_level}</ThemedText>
                    </View>
                  )}
                  <View style={styles.statPill}>
                    <Ionicons name="time-outline" size={11} color={TEAL} />
                    <ThemedText style={styles.statPillText}> {session.total_duration_minutes} min</ThemedText>
                  </View>
                  <View style={styles.statPill}>
                    <Ionicons name="layers-outline" size={11} color={TEAL} />
                    <ThemedText style={styles.statPillText}> {session.drill_count} drills</ThemedText>
                  </View>
                </View>
                {session.main_focus.length > 0 && (
                  <View style={styles.focusRow}>
                    {session.main_focus.slice(0, 3).map(f => (
                      <View key={f} style={styles.focusChip}>
                        <ThemedText style={styles.focusChipText}>{f}</ThemedText>
                      </View>
                    ))}
                    {session.main_focus.length > 3 && (
                      <ThemedText style={styles.metaText}>+{session.main_focus.length - 3}</ThemedText>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Create Session Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => { setShowModal(false); resetForm(); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKAV}>
            <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>

                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <ThemedText style={styles.modalNew}>NEW</ThemedText>
                    <ThemedText style={styles.modalTitle}>Create Session</ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                    <Ionicons name="close" size={22} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>

                {/* Session Name */}
                <ThemedText style={styles.fieldLabel}>SESSION NAME</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Tuesday Practice"
                  placeholderTextColor={TEXT_MUTED}
                  value={title}
                  onChangeText={setTitle}
                />

                {/* Date */}
                <ThemedText style={styles.fieldLabel}>DATE</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={TEXT_MUTED}
                  value={date}
                  onChangeText={setDate}
                />

                {/* Age Group */}
                <ThemedText style={styles.fieldLabel}>AGE GROUP</ThemedText>
                <View style={styles.chipRow}>
                  {AGE_GROUPS.map(ag => (
                    <TouchableOpacity
                      key={ag}
                      style={[styles.selectChip, ageGroup === ag && styles.selectChipActive]}
                      onPress={() => setAgeGroup(ag)}
                    >
                      <ThemedText style={[styles.selectChipText, ageGroup === ag && styles.selectChipTextActive]}>
                        {ag}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Skill Level */}
                <ThemedText style={styles.fieldLabel}>SKILL LEVEL</ThemedText>
                <View style={styles.chipRow}>
                  {SKILL_LEVELS.map(sl => (
                    <TouchableOpacity
                      key={sl}
                      style={[styles.selectChip, skillLevel === sl && styles.selectChipActive]}
                      onPress={() => setSkillLevel(sl)}
                    >
                      <ThemedText style={[styles.selectChipText, skillLevel === sl && styles.selectChipTextActive]}>
                        {sl}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Duration */}
                <ThemedText style={styles.fieldLabel}>TOTAL DURATION (MINUTES)</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="60"
                  placeholderTextColor={TEXT_MUTED}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                />

                {/* Main Focus */}
                <ThemedText style={styles.fieldLabel}>MAIN FOCUS</ThemedText>
                <View style={styles.chipRow}>
                  {FOCUS_OPTIONS.map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.selectChip, focus.includes(f) && styles.selectChipActive]}
                      onPress={() => toggleFocus(f)}
                    >
                      <ThemedText style={[styles.selectChipText, focus.includes(f) && styles.selectChipTextActive]}>
                        {f}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes */}
                <ThemedText style={styles.fieldLabel}>NOTES</ThemedText>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Session intent, key cues, equipment reminders..."
                  placeholderTextColor={TEXT_MUTED}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Buttons */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setShowModal(false); resetForm(); }}
                  >
                    <ThemedText style={styles.cancelText}>CANCEL</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveSession} activeOpacity={0.85} disabled={saving}>
                    <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                      {saving
                        ? <ActivityIndicator color="#000" size="small" />
                        : <ThemedText style={styles.saveText}>SAVE SESSION</ThemedText>
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  logoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  logoText: { fontSize: 28, fontWeight: '900', letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', letterSpacing: 5, lineHeight: 18 },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: TEXT, lineHeight: 42, marginBottom: 4 },
  headerSub: { fontSize: 14, color: TEXT_MUTED },

  createBtn: { marginHorizontal: 20, borderRadius: 12, overflow: 'hidden', marginBottom: 28 },
  createBtnInner: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 16 },
  createGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  createText: { fontSize: 14, fontWeight: '800', color: '#000', letterSpacing: 1 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 2 },
  sessionCount: { fontSize: 12, color: TEXT_MUTED },

  emptyCard: { marginHorizontal: 20, backgroundColor: CARD, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  emptyIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1C2128', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 8 },
  emptyText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 18, marginBottom: 4 },

  sessionCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  sessionCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sessionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, flex: 1 },
  completeBadge: { backgroundColor: '#0D2A1A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: GREEN },
  completeBadgeText: { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 1 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  metaText: { fontSize: 11, color: TEXT_MUTED },
  sessionStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { backgroundColor: '#1C2128', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDER },
  chipText: { fontSize: 11, color: TEXT_MUTED },
  statPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D2A24', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#1A3D35' },
  statPillText: { fontSize: 11, color: TEAL },
  focusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  focusChip: { backgroundColor: '#0D2A24', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#1A3D35' },
  focusChipText: { fontSize: 11, color: TEAL },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalKAV: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: MODAL_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: BORDER, maxHeight: '92%' },
  modalScroll: { padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalNew: { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 2, marginBottom: 2 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: TEXT },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  textInput: { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, color: TEXT, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  textArea: { height: 90, paddingTop: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  selectChipActive: { borderColor: TEAL, backgroundColor: '#0D2A24' },
  selectChipText: { fontSize: 13, color: TEXT_MUTED, fontWeight: '600' },
  selectChipTextActive: { color: TEAL },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelBtn: { flex: 1, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 13, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },
  saveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 13, fontWeight: '800', color: '#000', letterSpacing: 1 },
});
