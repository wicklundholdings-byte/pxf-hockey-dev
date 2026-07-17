import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { supabase } from '@/lib/supabase';
import { TimePicker } from '@/components/time-picker';
import { DatePicker } from '@/components/date-picker';

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
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type Session = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  age_group: string | null;
  skill_level: string | null;
  total_duration_minutes: number;
  main_focus: string[];
  is_complete: boolean;
  drill_count: number;
};

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

type Filter = 'all' | 'upcoming' | 'past';
type ViewMode = 'list' | 'calendar';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SessionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openCreate?: string }>();
  const handledOpenCreate = useRef(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filter & view
  const [filter, setFilter] = useState<Filter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [ageGroup, setAgeGroup] = useState('U13+');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [duration, setDuration] = useState('60');
  const [time, setTime] = useState('');
  const [focus, setFocus] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalScrollEnabled, setModalScrollEnabled] = useState(true);

  useEffect(() => { fetchSessions(); }, []);

  // Auto-open create modal when navigated with openCreate=1 (once per mount)
  useFocusEffect(useCallback(() => {
    if (params.openCreate === '1' && !handledOpenCreate.current) {
      handledOpenCreate.current = true;
      setShowModal(true);
    }
  }, [params.openCreate]));

  async function fetchSessions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data } = await supabase
      .from('sessions')
      .select('*, session_drills(count)')
      .eq('coach_id', user.id)
      .order('date', { ascending: false })
      .order('time', { ascending: true, nullsFirst: false });

    if (data) {
      setSessions(data.map((s: any) => ({
        ...s,
        drill_count: s.session_drills?.[0]?.count ?? 0,
      })));
    }
    setLoading(false);
  }

  const today = todayStr();

  const filteredSessions = useMemo(() => {
    if (filter === 'upcoming') return sessions.filter(s => s.date >= today);
    if (filter === 'past') return sessions.filter(s => s.date < today);
    return sessions;
  }, [sessions, filter]);

  const upcomingCount = useMemo(() => sessions.filter(s => s.date >= today).length, [sessions]);
  const pastCount = useMemo(() => sessions.filter(s => s.date < today).length, [sessions]);

  // Dates that have sessions (for calendar dots)
  const sessionDates = useMemo(() => {
    const s = new Set<string>();
    sessions.forEach(sess => s.add(sess.date));
    return s;
  }, [sessions]);

  // Sessions to show below calendar, sorted by time within a day
  const calendarSessions = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const filtered = selectedCalDate
      ? sessions.filter(s => s.date === selectedCalDate)
      : sessions.filter(s => s.date.startsWith(monthStr));
    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }, [sessions, selectedCalDate, calMonth]);

  // Calendar grid cells (nulls = empty padding at start/end)
  const calendarGrid = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return { year, month, cells };
  }, [calMonth]);

  function prevMonth() {
    setCalMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
    setSelectedCalDate(null);
  }

  function nextMonth() {
    setCalMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
    setSelectedCalDate(null);
  }

  function resetForm() {
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setAgeGroup('U13+');
    setSkillLevel('Intermediate');
    setDuration('60');
    setTime('');
    setFocus([]);
    setNotes('');
  }

  async function saveSession() {
    if (!title.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setSaving(false);

    const { data } = await supabase.from('sessions').insert({
      coach_id: user.id,
      title: title.trim(),
      date,
      age_group: ageGroup,
      skill_level: skillLevel,
      total_duration_minutes: parseInt(duration) || 0,
      time: time.trim() || null,
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
    setFocus(prev => prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]);
  }

  const calMonthLabel = calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  function renderSessionCard(session: Session, showTimeBadge = false) {
    const isPast = session.date < today;
    return (
      <TouchableOpacity
        key={session.id}
        style={styles.sessionCard}
        onPress={() => router.push(`/session/${session.id}`)}
        activeOpacity={0.85}
      >
        {showTimeBadge && session.time && (
          <View style={styles.timeBadge}>
            <ThemedText style={styles.timeBadgeText}>{formatTime(session.time)}</ThemedText>
          </View>
        )}
        <View style={styles.sessionCardTop}>
          <ThemedText style={styles.sessionTitle}>{session.title}</ThemedText>
          {session.is_complete ? (
            <View style={styles.doneBadge}><ThemedText style={styles.doneBadgeText}>DONE</ThemedText></View>
          ) : isPast ? (
            <View style={styles.pastBadge}><ThemedText style={styles.pastBadgeText}>PAST</ThemedText></View>
          ) : (
            <View style={styles.plannedBadge}><ThemedText style={styles.plannedBadgeText}>PLANNED</ThemedText></View>
          )}
        </View>
        <View style={styles.sessionMeta}>
          <Ionicons name="calendar-outline" size={11} color={TEXT_MUTED} />
          <ThemedText style={styles.metaText}> {formatDate(session.date)}</ThemedText>
          {session.time && (
            <>
              <ThemedText style={styles.metaText}> · </ThemedText>
              <Ionicons name="time-outline" size={11} color={TEXT_MUTED} />
              <ThemedText style={styles.metaText}> {formatTime(session.time)}</ThemedText>
            </>
          )}
        </View>
        <View style={styles.sessionStats}>
          {session.age_group && <View style={styles.chip}><ThemedText style={styles.chipText}>{session.age_group}</ThemedText></View>}
          {session.skill_level && <View style={styles.chip}><ThemedText style={styles.chipText}>{session.skill_level}</ThemedText></View>}
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
              <View key={f} style={styles.focusChip}><ThemedText style={styles.focusChipText}>{f}</ThemedText></View>
            ))}
            {session.main_focus.length > 3 && <ThemedText style={styles.metaText}>+{session.main_focus.length - 3}</ThemedText>}
          </View>
        )}
      </TouchableOpacity>
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

          {/* Filter tabs + view toggle */}
          <View style={styles.controlsRow}>
            <View style={styles.filterTabs}>
              {(['all', 'upcoming', 'past'] as Filter[]).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterTab, filter === f && styles.filterTabActive]}
                  onPress={() => { setFilter(f); setViewMode('list'); }}
                >
                  <ThemedText style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                    {f === 'all' ? 'ALL' : f === 'upcoming' ? 'UPCOMING' : 'PAST'}
                  </ThemedText>
                  <View style={[styles.filterBadge, filter === f && styles.filterBadgeActive]}>
                    <ThemedText style={[styles.filterBadgeText, filter === f && styles.filterBadgeTextActive]}>
                      {f === 'all' ? sessions.length : f === 'upcoming' ? upcomingCount : pastCount}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons name="list-outline" size={17} color={viewMode === 'list' ? TEAL : TEXT_MUTED} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === 'calendar' && styles.viewBtnActive]}
                onPress={() => setViewMode('calendar')}
              >
                <Ionicons name="calendar-outline" size={17} color={viewMode === 'calendar' ? TEAL : TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
          ) : viewMode === 'calendar' ? (

            /* ── CALENDAR VIEW ── */
            <View>
              {/* Month navigator */}
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                  <Ionicons name="chevron-back" size={18} color={TEXT_MUTED} />
                </TouchableOpacity>
                <ThemedText style={styles.calMonthLabel}>{calMonthLabel}</ThemedText>
                <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                  <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>

              {/* Day-of-week headers */}
              <View style={styles.calDayHeaderRow}>
                {DAY_HEADERS.map(d => (
                  <View key={d} style={styles.calDayHeaderCell}>
                    <ThemedText style={styles.calDayHeaderText}>{d}</ThemedText>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calGrid}>
                {calendarGrid.cells.map((day, i) => {
                  if (!day) return <View key={`empty-${i}`} style={styles.calCell} />;
                  const dateStr = `${calendarGrid.year}-${String(calendarGrid.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isToday = dateStr === today;
                  const hasSession = sessionDates.has(dateStr);
                  const isSelected = selectedCalDate === dateStr;
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[
                        styles.calCell,
                        isSelected && styles.calCellSelected,
                        isToday && !isSelected && styles.calCellToday,
                      ]}
                      onPress={() => setSelectedCalDate(isSelected ? null : dateStr)}
                    >
                      <ThemedText style={[
                        styles.calDayNum,
                        isToday && !isSelected && styles.calDayNumToday,
                        isSelected && styles.calDayNumSelected,
                      ]}>
                        {day}
                      </ThemedText>
                      {hasSession && <View style={[styles.calDot, isSelected && styles.calDotSelected]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sessions label + list */}
              <View style={styles.calSessionsHeader}>
                <ThemedText style={styles.calSessionsLabel}>
                  {selectedCalDate
                    ? formatDate(selectedCalDate).toUpperCase()
                    : `${calMonth.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()} SESSIONS`}
                </ThemedText>
                {selectedCalDate && (
                  <TouchableOpacity onPress={() => setSelectedCalDate(null)}>
                    <ThemedText style={styles.calClearBtn}>CLEAR ×</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {calendarSessions.length === 0 ? (
                <View style={styles.calEmpty}>
                  <ThemedText style={styles.calEmptyText}>
                    {selectedCalDate ? 'No sessions on this day.' : 'No sessions this month.'}
                  </ThemedText>
                </View>
              ) : (
                calendarSessions.map(s => renderSessionCard(s, !!selectedCalDate))
              )}
            </View>

          ) : (

            /* ── LIST VIEW ── */
            <>
              {filteredSessions.length === 0 ? (
                sessions.length === 0 ? (
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
                  <View style={styles.filterEmpty}>
                    <Ionicons name="calendar-outline" size={24} color={TEXT_MUTED} />
                    <ThemedText style={styles.filterEmptyText}>No {filter} sessions.</ThemedText>
                  </View>
                )
              ) : (
                filteredSessions.map(s => renderSessionCard(s))
              )}
            </>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Create Session Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => { setShowModal(false); resetForm(); }} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled" bounces={false}>

                <View style={styles.modalHeader}>
                  <View>
                    <ThemedText style={styles.modalNew}>NEW</ThemedText>
                    <ThemedText style={styles.modalTitle}>Create Session</ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                    <Ionicons name="close" size={22} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.fieldLabel}>SESSION NAME</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Tuesday Practice"
                  placeholderTextColor={TEXT_MUTED}
                  value={title}
                  onChangeText={setTitle}
                />

                <ThemedText style={styles.fieldLabel}>DATE</ThemedText>
                <DatePicker value={date || null} onChange={v => setDate(v)} />

                <ThemedText style={styles.fieldLabel}>TIME</ThemedText>
                <TimePicker value={time || null} onChange={v => setTime(v ?? '')} />

                <ThemedText style={styles.fieldLabel}>AGE GROUP</ThemedText>
                <View style={styles.chipRow}>
                  {AGE_GROUPS.map(ag => (
                    <TouchableOpacity
                      key={ag}
                      style={[styles.selectChip, ageGroup === ag && styles.selectChipActive]}
                      onPress={() => setAgeGroup(ag)}
                    >
                      <ThemedText style={[styles.selectChipText, ageGroup === ag && styles.selectChipTextActive]}>{ag}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={styles.fieldLabel}>SKILL LEVEL</ThemedText>
                <View style={styles.chipRow}>
                  {SKILL_LEVELS.map(sl => (
                    <TouchableOpacity
                      key={sl}
                      style={[styles.selectChip, skillLevel === sl && styles.selectChipActive]}
                      onPress={() => setSkillLevel(sl)}
                    >
                      <ThemedText style={[styles.selectChipText, skillLevel === sl && styles.selectChipTextActive]}>{sl}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={styles.fieldLabel}>TOTAL DURATION (MINUTES)</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="60"
                  placeholderTextColor={TEXT_MUTED}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                />

                <ThemedText style={styles.fieldLabel}>MAIN FOCUS</ThemedText>
                <View style={styles.chipRow}>
                  {FOCUS_OPTIONS.map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.selectChip, focus.includes(f) && styles.selectChipActive]}
                      onPress={() => toggleFocus(f)}
                    >
                      <ThemedText style={[styles.selectChipText, focus.includes(f) && styles.selectChipTextActive]}>{f}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

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
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  logoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  logoText: { fontSize: 28, fontWeight: '800', letterSpacing: 3, lineHeight: 46 },
  logoSub: { fontSize: 11, fontWeight: '700', letterSpacing: 5, lineHeight: 18 },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: TEXT, lineHeight: 42, marginBottom: 4 },
  headerSub: { fontSize: 14, color: TEXT_MUTED },

  createBtn: { marginHorizontal: 20, borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  createBtnInner: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 16 },
  createGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  createText: { fontSize: 14, fontWeight: '800', color: '#000', letterSpacing: 1 },

  // Controls row
  controlsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 10 },
  filterTabs: { flex: 1, flexDirection: 'row', gap: 5 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  filterTabActive: { borderColor: TEAL, backgroundColor: '#0D2A24' },
  filterTabText: { fontSize: 9, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 0.5 },
  filterTabTextActive: { color: TEAL },
  filterBadge: { backgroundColor: '#1C2128', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  filterBadgeActive: { backgroundColor: '#1A3D35' },
  filterBadgeText: { fontSize: 9, fontWeight: '700', color: TEXT_MUTED },
  filterBadgeTextActive: { color: TEAL },

  viewToggle: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 8, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  viewBtn: { padding: 7 },
  viewBtnActive: { backgroundColor: '#0D2A24' },

  // Session cards
  sessionCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  timeBadge: { alignSelf: 'flex-start', backgroundColor: '#0D2A24', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#1A3D35', marginBottom: 8 },
  timeBadgeText: { fontSize: 12, fontWeight: '800', color: TEAL, letterSpacing: 0.5 },
  sessionCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sessionTitle: { fontSize: 16, fontWeight: '700', color: TEXT, flex: 1, marginRight: 8 },
  doneBadge: { backgroundColor: '#0D2A1A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: GREEN },
  doneBadgeText: { fontSize: 9, fontWeight: '700', color: GREEN, letterSpacing: 1 },
  pastBadge: { backgroundColor: '#1C1610', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#6B4C1C' },
  pastBadgeText: { fontSize: 9, fontWeight: '700', color: '#C88B3A', letterSpacing: 1 },
  plannedBadge: { backgroundColor: '#0D1A2A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#1A3557' },
  plannedBadgeText: { fontSize: 9, fontWeight: '700', color: '#4A8FC4', letterSpacing: 1 },

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

  // Empty states
  emptyCard: { marginHorizontal: 20, backgroundColor: CARD, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  emptyIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1C2128', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 8 },
  emptyText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 18, marginBottom: 4 },
  filterEmpty: { marginHorizontal: 20, alignItems: 'center', paddingVertical: 40, gap: 10 },
  filterEmptyText: { fontSize: 14, color: TEXT_MUTED },

  // Calendar
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  calNavBtn: { padding: 6 },
  calMonthLabel: { fontSize: 14, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  calDayHeaderRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
  calDayHeaderCell: { width: `${100 / 7}%` as any, alignItems: 'center', paddingVertical: 4 },
  calDayHeaderText: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 8 },
  calCell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellSelected: { backgroundColor: TEAL, borderRadius: 100 },
  calCellToday: { borderWidth: 1.5, borderColor: TEAL, borderRadius: 100 },
  calDayNum: { fontSize: 14, fontWeight: '500', color: TEXT },
  calDayNumToday: { color: TEAL, fontWeight: '800' },
  calDayNumSelected: { color: '#000', fontWeight: '800' },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: TEAL, marginTop: 1 },
  calDotSelected: { backgroundColor: '#000' },
  calSessionsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4 },
  calSessionsLabel: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2 },
  calClearBtn: { fontSize: 11, fontWeight: '700', color: TEAL },
  calEmpty: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  calEmptyText: { fontSize: 14, color: TEXT_MUTED },

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
