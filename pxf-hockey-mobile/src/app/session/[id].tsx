import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { EventVolunteers } from '@/components/event-volunteers';
import { DraggableDrillList } from '@/components/draggable-drill-list';
import { InstructorPicker } from '@/components/instructor-picker';
import { supabase } from '@/lib/supabase';
import { TimePicker } from '@/components/time-picker';
import { DatePicker } from '@/components/date-picker';

const BG = '#0D1117';
const CARD = '#161B22';
const CARD2 = '#0F1923';
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
    short_description: string | null;
    difficulty_level: string;
    age_group: string;
    duration_minutes: number;
    equipment_needed: string[] | null;
    coaching_points: string[] | null;
    video_url: string | null;
    diagram_url: string | null;
    category: { title: string } | null;
  };
};

type Session = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  age_group: string | null;
  skill_level: string | null;
  total_duration_minutes: number;
  main_focus: string[];
  notes: string | null;
  is_complete: boolean;
};

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

type ViewMode = 'summary' | 'detailed';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id, teamId } = useLocalSearchParams<{ id: string; teamId?: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [drills, setDrills] = useState<DrillInSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editAgeGroup, setEditAgeGroup] = useState('');
  const [editSkillLevel, setEditSkillLevel] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editFocus, setEditFocus] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalScrollEnabled, setModalScrollEnabled] = useState(true);

  useFocusEffect(useCallback(() => { if (id) fetchSession(); }, [id]));

  async function fetchSession() {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    const { data: drillsData } = await supabase
      .from('session_drills')
      .select(`id, sort_order, drill:drill_id(
        id, title, short_description, difficulty_level, age_group,
        duration_minutes, equipment_needed, coaching_points,
        video_url, diagram_url, category:category_id(title)
      )`)
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

  async function handleReorder(newDrills: DrillInSession[]) {
    setDrills(newDrills);
    await Promise.all(
      newDrills.map((d, i) =>
        supabase.from('session_drills').update({ sort_order: i }).eq('id', d.id)
      )
    );
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

  function openEdit() {
    if (!session) return;
    setEditTitle(session.title);
    setEditDate(session.date);
    setEditTime(session.time ?? '');
    setEditAgeGroup(session.age_group ?? '');
    setEditSkillLevel(session.skill_level ?? '');
    setEditDuration(String(session.total_duration_minutes));
    setEditFocus(session.main_focus ?? []);
    setEditNotes(session.notes ?? '');
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!editTitle.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from('sessions')
      .update({
        title: editTitle.trim(),
        date: editDate,
        time: editTime.trim() || null,
        age_group: editAgeGroup || null,
        skill_level: editSkillLevel || null,
        total_duration_minutes: parseInt(editDuration) || 0,
        main_focus: editFocus,
        notes: editNotes.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();
    setSaving(false);
    if (data) setSession(data);
    setShowEdit(false);
    router.back();
  }

  function toggleEditFocus(item: string) {
    setEditFocus(prev => prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]);
  }

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
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Ionicons name="pencil" size={14} color={TEAL} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} scrollEnabled={scrollEnabled} style={{ marginBottom: drills.length > 0 ? 80 : 0 }}>

          {/* Title + meta */}
          <View style={styles.titleSection}>
            <ThemedText style={styles.sessionTitle}>{session.title}</ThemedText>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={TEXT_MUTED} />
              <ThemedText style={styles.metaText}> {formatDate(session.date)}</ThemedText>
              {session.time && (
                <>
                  <ThemedText style={styles.metaDot}> · </ThemedText>
                  <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
                  <ThemedText style={styles.metaText}> {formatTime(session.time)}</ThemedText>
                </>
              )}
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

          {/* Instructor */}
          <InstructorPicker
            entityType="session"
            entityId={session.id}
            style={{ marginHorizontal: 16, marginBottom: 12 }}
          />

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
              <ThemedText style={styles.emptyHint}>—</ThemedText>
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

          {/* Volunteers */}
          {teamId ? (
            <EventVolunteers
              entityType="session"
              entityId={session.id}
              teamId={teamId}
            />
          ) : null}

          {/* SESSION PLAN header with view toggle */}
          <View style={styles.planHeader}>
            <ThemedText style={styles.sectionLabel}>SESSION PLAN</ThemedText>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'summary' && styles.toggleBtnActive]}
                onPress={() => setViewMode('summary')}
              >
                <Ionicons name="list-outline" size={15} color={viewMode === 'summary' ? '#000' : TEXT_MUTED} />
                <ThemedText style={[styles.toggleBtnText, viewMode === 'summary' && styles.toggleBtnTextActive]}>
                  Summary
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'detailed' && styles.toggleBtnActive]}
                onPress={() => setViewMode('detailed')}
              >
                <Ionicons name="albums-outline" size={15} color={viewMode === 'detailed' ? '#000' : TEXT_MUTED} />
                <ThemedText style={[styles.toggleBtnText, viewMode === 'detailed' && styles.toggleBtnTextActive]}>
                  Detailed
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {drills.length === 0 ? (
            <View style={styles.emptyPlan}>
              <ThemedText style={styles.emptyPlanText}>No drills yet.</ThemedText>
              <TouchableOpacity
                style={styles.addDrillBtn}
                onPress={() => router.push(`/pick-drills/${id}`)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addDrillGradient}>
                  <Ionicons name="add" size={16} color="#000" />
                  <ThemedText style={styles.addDrillText}>ADD DRILL</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : viewMode === 'summary' ? (
            <>
              <ThemedText style={styles.reorderHint}>Hold & drag ≡ to reorder · Swipe left to remove</ThemedText>
              <DraggableDrillList
                drills={drills}
                onReorder={(newDrills) => void handleReorder(newDrills as any)}
                onRemove={removeDrill}
                onScrollEnabled={setScrollEnabled}
                toArr={toArr}
              />
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={() => router.push(`/pick-drills/${id}`)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addDrillGradient}>
                  <Ionicons name="add" size={16} color="#000" />
                  <ThemedText style={styles.addDrillText}>ADD DRILL</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {drills.map((item, index) => (
                <DetailedDrillCard
                  key={item.id}
                  item={item}
                  index={index}
                  toArr={toArr}
                  onPress={() => router.push(`/drill/${item.drill?.id}`)}
                />
              ))}
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={() => router.push(`/pick-drills/${id}`)}
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
        {/* Action footer — always shown */}
        <View style={styles.startFooter}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={styles.attendBtn}
              onPress={() => router.push(`/attendance/${id}` as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={TEAL} />
              <ThemedText style={styles.attendText}>Attendance</ThemedText>
            </TouchableOpacity>
            {drills.length > 0 && (
              <TouchableOpacity
                style={[styles.startBtn, { flex: 1 }]}
                onPress={() => router.push(`/session-runner/${id}`)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGradient}>
                  <Ionicons name="play-circle" size={20} color="#000" />
                  <ThemedText style={styles.startText}>START SESSION</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </SafeAreaView>

      {/* Edit Session Modal */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          {/* Dark area above sheet — tap to close */}
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowEdit(false)} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled" bounces={false}>

                <View style={styles.modalHeader}>
                  <View>
                    <ThemedText style={styles.modalLabel}>EDITING</ThemedText>
                    <ThemedText style={styles.modalTitle}>Edit Session</ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => setShowEdit(false)}>
                    <Ionicons name="close" size={22} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.fieldLabel}>SESSION NAME</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholderTextColor={TEXT_MUTED}
                  value={editTitle}
                  onChangeText={setEditTitle}
                />

                <ThemedText style={styles.fieldLabel}>DATE</ThemedText>
                <DatePicker value={editDate || null} onChange={v => setEditDate(v)} />

                <ThemedText style={styles.fieldLabel}>TIME</ThemedText>
                <TimePicker value={editTime || null} onChange={v => setEditTime(v ?? '')} />

                <ThemedText style={styles.fieldLabel}>AGE GROUP</ThemedText>
                <View style={styles.chipRow}>
                  {['U9+', 'U11+', 'U13+', 'U15+'].map(ag => (
                    <TouchableOpacity
                      key={ag}
                      style={[styles.selectChip, editAgeGroup === ag && styles.selectChipActive]}
                      onPress={() => setEditAgeGroup(ag)}
                    >
                      <ThemedText style={[styles.selectChipText, editAgeGroup === ag && styles.selectChipTextActive]}>{ag}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={styles.fieldLabel}>SKILL LEVEL</ThemedText>
                <View style={styles.chipRow}>
                  {['Beginner', 'Intermediate', 'Advanced', 'Elite'].map(sl => (
                    <TouchableOpacity
                      key={sl}
                      style={[styles.selectChip, editSkillLevel === sl && styles.selectChipActive]}
                      onPress={() => setEditSkillLevel(sl)}
                    >
                      <ThemedText style={[styles.selectChipText, editSkillLevel === sl && styles.selectChipTextActive]}>{sl}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={styles.fieldLabel}>TOTAL DURATION (MINUTES)</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholderTextColor={TEXT_MUTED}
                  value={editDuration}
                  onChangeText={setEditDuration}
                  keyboardType="number-pad"
                />

                <ThemedText style={styles.fieldLabel}>MAIN FOCUS</ThemedText>
                <View style={styles.chipRow}>
                  {['Skating Flow','Edge Control','Puck Control','Passing','Shooting','Reaction Training','GameIQ','Circuits'].map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.selectChip, editFocus.includes(f) && styles.selectChipActive]}
                      onPress={() => toggleEditFocus(f)}
                    >
                      <ThemedText style={[styles.selectChipText, editFocus.includes(f) && styles.selectChipTextActive]}>{f}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={styles.fieldLabel}>NOTES</ThemedText>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Session intent, key cues, equipment reminders..."
                  placeholderTextColor={TEXT_MUTED}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEdit(false)}>
                    <ThemedText style={styles.cancelText}>CANCEL</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} activeOpacity={0.85} disabled={saving}>
                    <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
                      {saving
                        ? <ActivityIndicator color="#000" size="small" />
                        : <ThemedText style={styles.saveText}>SAVE CHANGES</ThemedText>
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
}

// ─── Detailed drill card ─────────────────────────────────────────────────────

type DetailedCardProps = {
  item: DrillInSession;
  index: number;
  toArr: (v: any) => string[];
  onPress: () => void;
};

function DetailedDrillCard({ item, index, toArr, onPress }: DetailedCardProps) {
  const drill = item.drill;
  const equipment = toArr(drill?.equipment_needed);
  const coachingPoints = toArr(drill?.coaching_points).slice(0, 3);
  const [playing, setPlaying] = useState(false);

  const player = useVideoPlayer(
    drill?.video_url ? { uri: drill.video_url } : null,
  );

  function togglePlay() {
    if (!drill?.video_url) return;
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  }

  return (
    <View style={styles.detailCard}>

      {/* Number badge */}
      <View style={styles.detailBadge}>
        <ThemedText style={styles.detailBadgeText}>{index + 1}</ThemedText>
      </View>

      {/* ── Video area — tapping plays inline ── */}
      <TouchableOpacity
        style={styles.detailVideoArea}
        onPress={togglePlay}
        activeOpacity={0.9}
      >
        {drill?.video_url ? (
          <>
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
            />
            {/* Play/pause overlay */}
            {!playing && (
              <View style={styles.videoOverlay}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.detailPlayBtn}>
                  <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.detailPlayGradient}>
                    <Ionicons name="play" size={24} color="#000" />
                  </LinearGradient>
                </View>
              </View>
            )}
            {playing && (
              <TouchableOpacity style={styles.pauseOverlay} onPress={togglePlay}>
                <View style={styles.pauseBtn}>
                  <Ionicons name="pause" size={22} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.detailVideoLabel}>
              <Ionicons name="videocam-outline" size={10} color={TEAL} />
              <ThemedText style={styles.detailVideoLabelText}> TAP TO PLAY</ThemedText>
            </View>
          </>
        ) : (
          <View style={styles.noVideoPlaceholder}>
            <LinearGradient colors={['#0A1510', '#070D0A']} style={StyleSheet.absoluteFill} />
            <Ionicons name="videocam-off-outline" size={32} color="#1A2A1A" />
            <ThemedText style={styles.noVideoText}>No video available</ThemedText>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Rink / Drill diagram ── */}
      <View style={styles.detailDiagramArea}>
        {drill?.diagram_url ? (
          <>
            <Image source={{ uri: drill.diagram_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.diagramLabel}>
              <Ionicons name="map-outline" size={10} color={GREEN} />
              <ThemedText style={styles.diagramLabelText}> RINK DIAGRAM</ThemedText>
            </View>
          </>
        ) : (
          /* Rink placeholder — same as drill detail screen */
          <View style={styles.rinkPlaceholder}>
            <LinearGradient colors={['#050E0A', '#070F0B']} style={StyleSheet.absoluteFill} />
            <View style={styles.rinkOutline}>
              <View style={styles.rinkCenterLine} />
              <View style={styles.rinkCenterCircle} />
              <View style={[styles.rinkDot, { left: '18%', top: '38%' }]} />
              <View style={[styles.rinkDot, { left: '38%', top: '55%' }]} />
              <View style={[styles.rinkDot, { left: '58%', top: '38%' }]} />
              <View style={[styles.rinkDot, { left: '78%', top: '55%' }]} />
              <View style={[styles.rinkPlayer, { left: '8%', top: '32%' }]} />
              <View style={[styles.rinkPlayer, { left: '88%', top: '55%' }]} />
            </View>
            <View style={styles.diagramLabel}>
              <Ionicons name="map-outline" size={10} color={TEXT_MUTED} />
              <ThemedText style={[styles.diagramLabelText, { color: TEXT_MUTED }]}> RINK SETUP</ThemedText>
            </View>
          </View>
        )}
      </View>

      {/* ── Info section — tapping navigates to drill detail ── */}
      <TouchableOpacity style={styles.detailInfo} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.detailInfoTop}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.detailCategory}>
              {drill?.category?.title?.toUpperCase() ?? 'DRILL'}
            </ThemedText>
            <ThemedText style={styles.detailTitle}>{drill?.title}</ThemedText>
          </View>
          <View style={styles.viewDrillBtn}>
            <ThemedText style={styles.viewDrillText}>VIEW</ThemedText>
            <Ionicons name="chevron-forward" size={12} color={TEAL} />
          </View>
        </View>

        {/* Meta pills */}
        <View style={styles.detailMetaRow}>
          {drill?.difficulty_level && (
            <View style={styles.detailPill}>
              <Ionicons name="bar-chart-outline" size={10} color={TEAL} />
              <ThemedText style={styles.detailPillText}> {drill.difficulty_level}</ThemedText>
            </View>
          )}
          {drill?.age_group && (
            <View style={styles.detailPill}>
              <Ionicons name="people-outline" size={10} color={TEAL} />
              <ThemedText style={styles.detailPillText}> {drill.age_group}</ThemedText>
            </View>
          )}
          {!!drill?.duration_minutes && (
            <View style={styles.detailPill}>
              <Ionicons name="time-outline" size={10} color={TEAL} />
              <ThemedText style={styles.detailPillText}> {drill.duration_minutes} min</ThemedText>
            </View>
          )}
        </View>

        {drill?.short_description && (
          <ThemedText style={styles.detailDesc} numberOfLines={2}>
            {drill.short_description}
          </ThemedText>
        )}

        {equipment.length > 0 && (
          <View style={styles.detailEquipRow}>
            <Ionicons name="construct-outline" size={11} color={TEXT_MUTED} />
            <ThemedText style={styles.detailEquipText}> {equipment.join(' · ')}</ThemedText>
          </View>
        )}

        {coachingPoints.length > 0 && (
          <View style={styles.coachingSection}>
            <ThemedText style={styles.coachingLabel}>COACHING POINTS</ThemedText>
            {coachingPoints.map((pt, i) => (
              <View key={i} style={styles.coachingRow}>
                <Ionicons name="checkmark-circle" size={13} color={TEAL} />
                <ThemedText style={styles.coachingText}>{pt}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  logoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  logoText: { fontSize: 28, fontWeight: '800', letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', letterSpacing: 5, lineHeight: 18 },

  navHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: GREEN, letterSpacing: 3, textAlign: 'center' },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0D2A24', borderWidth: 1, borderColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  titleSection: { paddingHorizontal: 20, paddingBottom: 16 },
  sessionTitle: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 8, lineHeight: 32 },
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

  // Start session footer
  startFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER,
  },
  startBtn: { borderRadius: 14, overflow: 'hidden' },
  startGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  startText:  { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 0.5 },
  attendBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1.5, borderColor: TEAL, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: 'rgba(0,196,180,0.06)' },
  attendText: { fontSize: 14, fontWeight: '700', color: TEAL },

  // Plan header + view toggle
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  viewToggle: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  toggleBtnActive: { backgroundColor: TEAL },
  toggleBtnText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED },
  toggleBtnTextActive: { color: '#000' },

  reorderHint: { fontSize: 11, color: TEXT_MUTED, paddingHorizontal: 20, marginBottom: 10 },

  emptyPlan: { marginHorizontal: 20, backgroundColor: CARD, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER, gap: 16 },
  emptyPlanText: { fontSize: 14, color: TEXT_MUTED },
  addDrillBtn: { borderRadius: 10, overflow: 'hidden' },
  addMoreBtn: { marginHorizontal: 20, marginTop: 12, borderRadius: 10, overflow: 'hidden' },
  addDrillGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 24, gap: 6 },
  addDrillText: { fontSize: 13, fontWeight: '800', color: '#000', letterSpacing: 1 },

  // ── Detailed card ──────────────────────────────────────────────────────────
  detailCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
  },
  detailBadge: {
    position: 'absolute', top: 12, left: 12, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(13,42,36,0.9)', borderWidth: 1, borderColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },
  detailBadgeText: { fontSize: 12, fontWeight: '800', color: TEAL },

  // Video
  detailVideoArea: { height: 200, width: '100%', backgroundColor: '#050E0A', overflow: 'hidden' },
  videoOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  detailPlayBtn: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  detailPlayGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pauseOverlay: { ...StyleSheet.absoluteFill, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 12 },
  pauseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  detailVideoLabel: {
    position: 'absolute', bottom: 10, right: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)',
  },
  detailVideoLabelText: { fontSize: 9, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  noVideoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noVideoText: { fontSize: 12, color: '#2A3A2A' },

  // Rink diagram
  detailDiagramArea: { height: 150, width: '100%', borderTopWidth: 1, borderTopColor: BORDER, overflow: 'hidden', position: 'relative' },
  rinkPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  rinkOutline: { width: '88%', height: '75%', borderWidth: 1.5, borderColor: '#1A4A2A', borderRadius: 8, position: 'relative' },
  rinkCenterLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: '#1A4A2A' },
  rinkCenterCircle: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#1A4A2A', top: '50%', left: '50%', marginTop: -20, marginLeft: -20 },
  rinkDot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  rinkPlayer: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: TEAL },
  diagramLabel: {
    position: 'absolute', bottom: 8, right: 10,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  diagramLabelText: { fontSize: 9, fontWeight: '700', color: GREEN, letterSpacing: 1 },

  // Info
  detailInfo: { padding: 16 },
  detailInfoTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  detailCategory: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 2, marginBottom: 4 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: TEXT, lineHeight: 24 },
  viewDrillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D2A24', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: TEAL, gap: 2, marginTop: 4 },
  viewDrillText: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 1 },

  detailMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  detailPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D2A24', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#1A4A30',
  },
  detailPillText: { fontSize: 11, color: TEAL, fontWeight: '600' },

  detailDesc: { fontSize: 13, color: TEXT_MUTED, lineHeight: 19, marginBottom: 10 },

  detailEquipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailEquipText: { fontSize: 12, color: TEXT_MUTED },

  coachingSection: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12, gap: 7 },
  coachingLabel: { fontSize: 9, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 4 },
  coachingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  coachingText: { flex: 1, fontSize: 13, color: TEXT, lineHeight: 18 },

  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalKAV: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: BORDER, maxHeight: '92%' },
  modalScroll: { padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalLabel: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 2, marginBottom: 2 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  textInput: { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, color: TEXT, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  textArea: { height: 90, paddingTop: 12 },
  modalChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
