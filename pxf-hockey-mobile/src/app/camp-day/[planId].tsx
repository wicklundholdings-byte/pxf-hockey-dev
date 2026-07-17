import { useEffect, useState, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Keyboard,
  TouchableWithoutFeedback, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { InstructorPicker } from '@/components/instructor-picker';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const RED    = '#EF4444';
const ORANGE = '#F59E0B';
const PURPLE = '#7C3AED';
const BLUE   = '#4F8EF7';

// ── Calendar constants ────────────────────────────────────────────────────────
const DAY_START_H = 7;
const DAY_END_H   = 21;
const PX_PER_MIN  = 1.5;          // 90 px / hour — slightly larger for better touch targets
const HOUR_H      = 60 * PX_PER_MIN;
const TIME_COL_W  = 58;
const BLOCK_RIGHT = 12;
const TOTAL_CAL_H = (DAY_END_H - DAY_START_H) * HOUR_H;
const SNAP_MINS   = 15;
const MIN_DUR_MINS = 15;
const MIN_BLOCK_H  = MIN_DUR_MINS * PX_PER_MIN;
const HOURS = Array.from({ length: DAY_END_H - DAY_START_H + 1 }, (_, i) => DAY_START_H + i);

// Both use the SAME formula — this guarantees alignment
function timeToY(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return ((h - DAY_START_H) * 60 + m) * PX_PER_MIN;
}
function yToTimeStr(y: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_CAL_H - MIN_DUR_MINS * PX_PER_MIN, y));
  const snapped = Math.round(clamped / PX_PER_MIN / SNAP_MINS) * SNAP_MINS;
  const h = DAY_START_H + Math.floor(snapped / 60);
  const m = snapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}
function fmtHour(h: number): string { return `${h % 12 || 12}${h >= 12 ? 'p' : 'a'}`; }
function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function parseTime(input: string): string | null {
  if (!input.trim()) return null;
  const match = input.match(/(\d+):?(\d*)\s*(AM|PM|am|pm)?/);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = match[2] ? parseInt(match[2]) : 0;
  const ap = (match[3] ?? '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}
// ─────────────────────────────────────────────────────────────────────────────

type ActivityType = 'checkin' | 'ice' | 'dryland' | 'classroom' | 'meal' | 'break' | 'checkout' | 'custom';

const ACTIVITY_CONFIG: Record<ActivityType, { label: string; icon: string; color: string; defaultTitle: string }> = {
  checkin:   { label: 'Check-in',  icon: 'log-in-outline',              color: TEAL,   defaultTitle: 'Check-in' },
  ice:       { label: 'Ice',       icon: 'snow-outline',                color: BLUE,   defaultTitle: 'Ice Session' },
  dryland:   { label: 'Dryland',   icon: 'barbell-outline',             color: ORANGE, defaultTitle: 'Dryland' },
  classroom: { label: 'Classroom', icon: 'book-outline',                color: PURPLE, defaultTitle: 'Classroom' },
  meal:      { label: 'Meal',      icon: 'restaurant-outline',          color: GREEN,  defaultTitle: 'Lunch' },
  break:     { label: 'Break',     icon: 'cafe-outline',                color: MUTED,  defaultTitle: 'Break' },
  checkout:  { label: 'Pick-up',   icon: 'log-out-outline',             color: TEAL,   defaultTitle: 'Pick-up' },
  custom:    { label: 'Custom',    icon: 'ellipsis-horizontal-outline', color: MUTED,  defaultTitle: '' },
};

type CampDayActivity = {
  id: string; camp_day_plan_id: string; start_time: string | null;
  duration_minutes: number | null; activity_type: ActivityType; title: string;
  session_id: string | null; notes: string | null; sort_order: number;
  session?: { id: string; title: string; total_duration_minutes: number | null } | null;
};
type Session = { id: string; title: string; total_duration_minutes: number | null };
type DayPlan = { id: string; day_number: number; date: string; camp_id: string };
type ResizeInfo = { actId: string; type: 'top' | 'bottom'; dy: number } | null;

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function CampDayScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();

  const [dayPlan,    setDayPlan]    = useState<DayPlan | null>(null);
  const [activities, setActivities] = useState<CampDayActivity[]>([]);
  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editMode,   setEditMode]   = useState(false);

  // Modal
  const [showModal,         setShowModal]         = useState(false);
  const [editingId,         setEditingId]         = useState<string | null>(null);
  const [actType,           setActType]           = useState<ActivityType>('ice');
  const [actTitle,          setActTitle]          = useState('');
  const [actTime,           setActTime]           = useState('');
  const [actDuration,       setActDuration]       = useState('');
  const [actNotes,          setActNotes]          = useState('');
  const [actSessionId,      setActSessionId]      = useState<string | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [saving,            setSaving]            = useState(false);

  // Drag (move whole block)
  const [draggingActId, setDraggingActId] = useState<string | null>(null);
  const [liveTime,      setLiveTime]      = useState('');
  const draggingActIdRef = useRef<string | null>(null);
  const activitiesRef    = useRef<CampDayActivity[]>([]);
  const initialBlockYRef = useRef(0);
  const dragBlockY       = useRef(new Animated.Value(0)).current;
  const panRefs          = useRef<Record<string, any>>({});

  // Resize (top = start time, bottom = duration)
  const [resizeInfo, setResizeInfo] = useState<ResizeInfo>(null);
  const resizeInfoRef  = useRef<ResizeInfo>(null);
  const resizeInitRef  = useRef<{ startY: number; durationH: number } | null>(null);
  const topResizePans  = useRef<Record<string, any>>({});
  const bottomResizePans = useRef<Record<string, any>>({});

  useEffect(() => { activitiesRef.current = activities; }, [activities]);
  useEffect(() => { if (planId) loadAll(); }, [planId]);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: planData }, { data: actsData }, { data: sessData }] = await Promise.all([
      supabase.from('camp_day_plans').select('id, day_number, date, camp_id').eq('id', planId).maybeSingle(),
      supabase.from('camp_day_activities')
        .select('id, camp_day_plan_id, start_time, duration_minutes, activity_type, title, session_id, notes, sort_order, session:sessions(id, title, total_duration_minutes)')
        .eq('camp_day_plan_id', planId).order('start_time').order('sort_order'),
      supabase.from('sessions').select('id, title, total_duration_minutes')
        .eq('coach_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    setDayPlan(planData); setActivities(actsData ?? []); setSessions(sessData ?? []); setLoading(false);
  }

  // ── Geometry: effective top + height (accounting for live resize) ─────────
  function getBlockGeom(act: CampDayActivity): { top: number; height: number } {
    const baseTop = act.start_time ? timeToY(act.start_time) : 0;
    const baseDurH = Math.max((act.duration_minutes ?? 30) * PX_PER_MIN, MIN_BLOCK_H);
    if (!resizeInfo || resizeInfo.actId !== act.id || !resizeInitRef.current) {
      return { top: baseTop, height: baseDurH };
    }
    const init = resizeInitRef.current;
    const { type, dy } = resizeInfo;
    if (type === 'top') {
      const maxDy   = init.durationH - MIN_BLOCK_H;
      const clipped = Math.max(-init.startY, Math.min(maxDy, dy));
      return { top: init.startY + clipped, height: init.durationH - clipped };
    } else {
      return { top: init.startY, height: Math.max(MIN_BLOCK_H, init.durationH + dy) };
    }
  }

  function clearAllPanRefs() {
    panRefs.current = {}; topResizePans.current = {}; bottomResizePans.current = {};
  }

  // ── Move (drag whole block) ───────────────────────────────────────────────
  function getMovePan(id: string) {
    if (!panRefs.current[id]) {
      panRefs.current[id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 4,
        onPanResponderGrant: () => {
          const act = activitiesRef.current.find(a => a.id === id);
          if (!act?.start_time) return;
          initialBlockYRef.current = timeToY(act.start_time);
          dragBlockY.setValue(initialBlockYRef.current);
          draggingActIdRef.current = id;
          clearAllPanRefs();
          setDraggingActId(id); setExpandedId(null);
          setLiveTime(fmtTime(act.start_time) ?? '');
        },
        onPanResponderMove: (_, gs) => {
          const newY = initialBlockYRef.current + gs.dy;
          dragBlockY.setValue(newY);
          setLiveTime(fmtTime(yToTimeStr(newY)) ?? '');
        },
        onPanResponderRelease: (_, gs) => {
          const actId   = draggingActIdRef.current;
          const newTime = yToTimeStr(initialBlockYRef.current + gs.dy);
          draggingActIdRef.current = null;
          setDraggingActId(null); setLiveTime('');
          if (actId) {
            setActivities(prev => prev.map(a => a.id === actId ? { ...a, start_time: newTime } : a));
            supabase.from('camp_day_activities').update({ start_time: newTime }).eq('id', actId);
          }
        },
        onPanResponderTerminate: () => { draggingActIdRef.current = null; setDraggingActId(null); setLiveTime(''); },
      });
    }
    return panRefs.current[id];
  }

  // ── Top resize (changes start_time + keeps end_time fixed) ───────────────
  function getTopResizePan(id: string) {
    if (!topResizePans.current[id]) {
      topResizePans.current[id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 2,
        onPanResponderGrant: () => {
          const act = activitiesRef.current.find(a => a.id === id);
          if (!act?.start_time) return;
          resizeInitRef.current = {
            startY:    timeToY(act.start_time),
            durationH: Math.max((act.duration_minutes ?? 30) * PX_PER_MIN, MIN_BLOCK_H),
          };
          clearAllPanRefs();
          const info: ResizeInfo = { actId: id, type: 'top', dy: 0 };
          resizeInfoRef.current = info; setResizeInfo(info); setExpandedId(null);
        },
        onPanResponderMove: (_, gs) => {
          const info: ResizeInfo = { actId: id, type: 'top', dy: gs.dy };
          resizeInfoRef.current = info; setResizeInfo(info);
        },
        onPanResponderRelease: (_, gs) => {
          if (!resizeInitRef.current) return;
          const init    = resizeInitRef.current;
          const maxDy   = init.durationH - MIN_BLOCK_H;
          const clipped = Math.max(-init.startY, Math.min(maxDy, gs.dy));
          const newTop  = init.startY + clipped;
          const newDurH = init.durationH - clipped;
          const newStartTime = yToTimeStr(newTop);
          const newDuration  = Math.max(MIN_DUR_MINS, Math.round((newDurH / PX_PER_MIN) / SNAP_MINS) * SNAP_MINS);
          resizeInfoRef.current = null; resizeInitRef.current = null; setResizeInfo(null);
          setActivities(prev => prev.map(a => a.id === id
            ? { ...a, start_time: newStartTime, duration_minutes: newDuration } : a));
          supabase.from('camp_day_activities')
            .update({ start_time: newStartTime, duration_minutes: newDuration }).eq('id', id);
        },
        onPanResponderTerminate: () => { resizeInfoRef.current = null; setResizeInfo(null); },
      });
    }
    return topResizePans.current[id];
  }

  // ── Bottom resize (changes duration only) ─────────────────────────────────
  function getBottomResizePan(id: string) {
    if (!bottomResizePans.current[id]) {
      bottomResizePans.current[id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 2,
        onPanResponderGrant: () => {
          const act = activitiesRef.current.find(a => a.id === id);
          if (!act?.start_time) return;
          resizeInitRef.current = {
            startY:    timeToY(act.start_time),
            durationH: Math.max((act.duration_minutes ?? 30) * PX_PER_MIN, MIN_BLOCK_H),
          };
          clearAllPanRefs();
          const info: ResizeInfo = { actId: id, type: 'bottom', dy: 0 };
          resizeInfoRef.current = info; setResizeInfo(info); setExpandedId(null);
        },
        onPanResponderMove: (_, gs) => {
          const info: ResizeInfo = { actId: id, type: 'bottom', dy: gs.dy };
          resizeInfoRef.current = info; setResizeInfo(info);
        },
        onPanResponderRelease: (_, gs) => {
          if (!resizeInitRef.current) return;
          const init       = resizeInitRef.current;
          const newDurH    = Math.max(MIN_BLOCK_H, init.durationH + gs.dy);
          const newDuration = Math.max(MIN_DUR_MINS, Math.round((newDurH / PX_PER_MIN) / SNAP_MINS) * SNAP_MINS);
          resizeInfoRef.current = null; resizeInitRef.current = null; setResizeInfo(null);
          setActivities(prev => prev.map(a => a.id === id ? { ...a, duration_minutes: newDuration } : a));
          supabase.from('camp_day_activities').update({ duration_minutes: newDuration }).eq('id', id);
        },
        onPanResponderTerminate: () => { resizeInfoRef.current = null; setResizeInfo(null); },
      });
    }
    return bottomResizePans.current[id];
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function calcNextTime(): string {
    const withTimes = activities
      .filter(a => a.start_time && a.duration_minutes)
      .sort((a, b) => a.start_time!.localeCompare(b.start_time!));
    if (!withTimes.length) return '9:00 AM';
    const last = withTimes[withTimes.length - 1];
    const [h, m] = last.start_time!.split(':').map(Number);
    const total = h * 60 + m + (last.duration_minutes ?? 60);
    const nh = Math.floor(total / 60) % 24, nm = total % 60;
    return `${nh % 12 || 12}:${String(nm).padStart(2, '0')} ${nh >= 12 ? 'PM' : 'AM'}`;
  }
  function openAdd() {
    setEditingId(null); setActType('ice'); setActTitle('Ice Session');
    setActTime(calcNextTime()); setActDuration('60'); setActNotes(''); setActSessionId(null);
    setShowModal(true);
  }
  function openEdit(act: CampDayActivity) {
    setEditingId(act.id); setActType(act.activity_type); setActTitle(act.title);
    setActTime(fmtTime(act.start_time) ?? '');
    setActDuration(act.duration_minutes ? String(act.duration_minutes) : '');
    setActNotes(act.notes ?? ''); setActSessionId(act.session_id); setShowModal(true);
  }
  async function saveActivity() {
    if (!actTitle.trim()) { Alert.alert('Required', 'Enter a title.'); return; }
    setSaving(true);
    const payload: any = {
      camp_day_plan_id: planId, activity_type: actType, title: actTitle.trim(),
      start_time: parseTime(actTime), duration_minutes: actDuration ? parseInt(actDuration, 10) : null,
      notes: actNotes.trim() || null,
      session_id: (actType === 'ice' || actType === 'dryland') ? actSessionId : null,
      sort_order: editingId ? (activities.find(a => a.id === editingId)?.sort_order ?? activities.length) : activities.length,
    };
    const { error } = editingId
      ? await supabase.from('camp_day_activities').update(payload).eq('id', editingId)
      : await supabase.from('camp_day_activities').insert(payload);
    if (error) { Alert.alert('Error', error.message); setSaving(false); return; }
    setSaving(false); setShowModal(false); loadAll();
  }
  async function deleteActivity(id: string) {
    Alert.alert('Remove Activity', 'Remove this block from the day?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('camp_day_activities').delete().eq('id', id);
        setActivities(prev => prev.filter(a => a.id !== id)); setExpandedId(null);
      }},
    ]);
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={TEAL} />
    </View>
  );
  if (!dayPlan) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText style={{ color: MUTED }}>Day not found.</ThemedText>
    </View>
  );

  const selectedSession = sessions.find(s => s.id === actSessionId);
  const scheduledActs   = activities.filter(a => a.start_time);
  const unscheduledActs = activities.filter(a => !a.start_time);
  const totalMins       = activities.reduce((s, a) => s + (a.duration_minutes ?? 0), 0);
  const totalHours      = totalMins > 0
    ? `${Math.floor(totalMins / 60)}h ${totalMins % 60 > 0 ? `${totalMins % 60}m` : ''}`.trim() : null;
  const isDragging     = draggingActId !== null;
  const isResizing     = resizeInfo !== null;
  const dragAct        = draggingActId ? activities.find(a => a.id === draggingActId) : null;
  const resizingAct    = resizeInfo   ? activities.find(a => a.id === resizeInfo.actId) : null;

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isDragging && !isResizing}
          contentContainerStyle={s.content}
        >
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => dayPlan?.camp_id ? router.push(`/camp/${dayPlan.camp_id}` as any) : router.back()}>
              <Ionicons name="chevron-back" size={20} color={TEXT} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <ThemedText style={s.title}>Day {dayPlan.day_number}</ThemedText>
              <ThemedText style={s.subtitle}>
                {fmt(dayPlan.date)}{totalHours ? ` · ${totalHours}` : ''}
              </ThemedText>
            </View>
            {activities.length > 0 && (
              <TouchableOpacity
                style={[s.editBtn, editMode && s.editBtnActive]}
                onPress={() => { setEditMode(e => !e); setExpandedId(null); clearAllPanRefs(); }}
                activeOpacity={0.8}
              >
                <ThemedText style={[s.editBtnText, editMode && s.editBtnTextActive]}>
                  {editMode ? 'Done' : 'Edit'}
                </ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={TEAL} />
              <ThemedText style={s.addBtnText}>Add</ThemedText>
            </TouchableOpacity>
          </View>

          {editMode && (
            <View style={s.editHint}>
              <Ionicons name="information-circle-outline" size={13} color={TEAL} />
              <ThemedText style={s.editHintText}>
                Drag ≡ to move · Drag top/bottom edge to resize
              </ThemedText>
            </View>
          )}

          {/* ── Calendar Grid ─────────────────────────────────────────── */}
          <View style={{ position: 'relative', height: TOTAL_CAL_H + 24, marginBottom: 8 }}>

            {/* Hour lines — INDEPENDENTLY positioned so line Y = block Y exactly */}
            {HOURS.map(h => {
              const y = (h - DAY_START_H) * HOUR_H;
              return (
                <View key={h}>
                  {/* The line at exactly y */}
                  <View style={[s.hourLine, { top: y }]} />
                  {/* The label centered on the line: top = y - half label height (~7px) */}
                  <ThemedText style={[s.hourLabel, { top: y - 7 }]}>{fmtHour(h)}</ThemedText>
                </View>
              );
            })}

            {/* Half-hour tick lines */}
            {HOURS.slice(0, -1).map(h => (
              <View key={`hh${h}`} style={[s.halfHourLine, { top: (h - DAY_START_H) * HOUR_H + HOUR_H / 2 }]} />
            ))}

            {/* Activity-specific time labels (teal, locked to block top) */}
            {scheduledActs.map(act => {
              if (!act.start_time) return null;
              const t = fmtTime(act.start_time);
              if (!t) return null;
              const [timePart, ampm] = t.split(' ');
              const geom = getBlockGeom(act);
              return (
                <View key={`tl-${act.id}`} style={[s.actTimeLabel, { top: geom.top }]}>
                  <ThemedText style={s.actTimeLabelHr}>{timePart}</ThemedText>
                  <ThemedText style={s.actTimeLabelAP}>{ampm}</ThemedText>
                </View>
              );
            })}

            {/* Live time bubble during MOVE drag */}
            {isDragging && liveTime && (() => {
              const [tp, ap] = liveTime.split(' ');
              return (
                <Animated.View style={[s.liveTimeBubble, { top: Animated.subtract(dragBlockY as any, 14) }]}>
                  <ThemedText style={s.liveTimeText}>{tp}</ThemedText>
                  <ThemedText style={[s.liveTimeText, { fontSize: 8 }]}>{ap}</ThemedText>
                </Animated.View>
              );
            })()}

            {/* Live time bubble during RESIZE */}
            {isResizing && resizingAct && (() => {
              const geom  = getBlockGeom(resizingAct);
              const y     = resizeInfo!.type === 'top' ? geom.top : geom.top + geom.height;
              const tStr  = fmtTime(resizeInfo!.type === 'top'
                ? yToTimeStr(geom.top)
                : yToTimeStr(geom.top + geom.height));
              if (!tStr) return null;
              const [tp, ap] = tStr.split(' ');
              return (
                <View style={[s.liveTimeBubble2, { top: y - 14 }]}>
                  <ThemedText style={s.liveTimeText}>{tp}</ThemedText>
                  <ThemedText style={[s.liveTimeText, { fontSize: 8 }]}>{ap}</ThemedText>
                </View>
              );
            })()}

            {/* Activity blocks */}
            {scheduledActs.map(act => {
              const isDraggingThis = draggingActId === act.id;
              const isResizingThis = resizeInfo?.actId === act.id;
              const isExpanded     = expandedId === act.id && !isDraggingThis && !isResizingThis;
              const cfg            = ACTIVITY_CONFIG[act.activity_type] ?? ACTIVITY_CONFIG.custom;
              const geom           = getBlockGeom(act);
              const showSession    = act.activity_type === 'ice' || act.activity_type === 'dryland';
              const liveDuration   = isResizingThis
                ? Math.round(geom.height / PX_PER_MIN) : null;

              return (
                <View key={act.id}>
                  {/* Main block */}
                  <View
                    style={[s.calBlock, {
                      top:    geom.top,
                      height: geom.height,
                      borderColor:             isExpanded ? cfg.color : ((isDraggingThis || isResizingThis) ? TEAL : BORDER),
                      borderBottomColor:        isExpanded ? 'transparent' : undefined,
                      borderBottomLeftRadius:   isExpanded ? 0 : 10,
                      borderBottomRightRadius:  isExpanded ? 0 : 10,
                      zIndex: isDraggingThis ? 1 : (isResizingThis ? 15 : (isExpanded ? 12 : 2)),
                      opacity: isDraggingThis ? 0.15 : 1,
                    }]}
                  >
                    {/* ── Top resize handle (edit mode only) ── */}
                    {editMode && (
                      <View
                        {...getTopResizePan(act.id).panHandlers}
                        style={s.topResizeHandle}
                      >
                        <View style={s.resizeGrip} />
                      </View>
                    )}

                    {/* ── Middle row: content + drag handle ── */}
                    <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => !isDragging && !isResizing && !editMode
                          && setExpandedId(prev => prev === act.id ? null : act.id)}
                        activeOpacity={editMode ? 1 : 0.75}
                      >
                        <View style={s.blockHeader}>
                          <View style={[s.blockIcon, { backgroundColor: `${cfg.color}22` }]}>
                            <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <ThemedText style={s.blockTitle} numberOfLines={1}>{act.title}</ThemedText>
                            {/* Duration: show live value during resize, otherwise stored value */}
                            <ThemedText style={[s.blockMeta, liveDuration !== null && { color: TEAL }]}>
                              {liveDuration !== null ? `${liveDuration} min` : act.duration_minutes ? `${act.duration_minutes} min` : ''}
                            </ThemedText>
                            {!isExpanded && showSession && act.session && (
                              <ThemedText style={s.sessionMini} numberOfLines={1}>{act.session.title}</ThemedText>
                            )}
                          </View>
                          {!editMode && (
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={MUTED} />
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* ≡ Move handle */}
                      {editMode && (
                        <View
                          {...getMovePan(act.id).panHandlers}
                          style={s.blockDragHandle}
                          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                        >
                          <Ionicons name="reorder-three" size={20} color={TEAL} />
                        </View>
                      )}
                    </View>

                    {/* ── Bottom resize handle (edit mode only) ── */}
                    {editMode && (
                      <View
                        {...getBottomResizePan(act.id).panHandlers}
                        style={s.bottomResizeHandle}
                      >
                        <View style={s.resizeGrip} />
                      </View>
                    )}
                  </View>

                  {/* Expanded panel (separate abs element below block) */}
                  {isExpanded && (
                    <View
                      style={[s.expandPanel, {
                        top:         geom.top + geom.height - 1,
                        borderColor: cfg.color,
                        zIndex:      12,
                      }]}
                    >
                      {showSession && (
                        act.session ? (
                          <TouchableOpacity
                            style={s.sessionRow}
                            onPress={() => router.push(`/session/${act.session!.id}` as any)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="document-text-outline" size={14} color={TEAL} />
                            <ThemedText style={s.sessionRowText} numberOfLines={1}>{act.session.title}</ThemedText>
                            <View style={s.viewSessionBadge}>
                              <ThemedText style={s.viewSessionText}>View</ThemedText>
                              <Ionicons name="chevron-forward" size={11} color={TEAL} />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={s.linkSessionRow}
                            onPress={() => { setExpandedId(null); openEdit(act); }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="play-circle-outline" size={14} color={ORANGE} />
                            <ThemedText style={s.linkSessionText}>Link a session plan</ThemedText>
                          </TouchableOpacity>
                        )
                      )}
                      {/* Per-activity instructor */}
                      <View style={[s.expandRow, { marginTop: 6 }]}>
                        <InstructorPicker
                          entityType="camp_day_activity"
                          entityId={act.id}
                          compact
                        />
                      </View>

                      {act.notes && (
                        <View style={s.expandRow}>
                          <Ionicons name="create-outline" size={12} color={MUTED} />
                          <ThemedText style={s.expandNote} numberOfLines={3}>{act.notes}</ThemedText>
                        </View>
                      )}
                      <View style={s.expandActions}>
                        <TouchableOpacity style={s.expandActionBtn} onPress={() => { setExpandedId(null); openEdit(act); }}>
                          <Ionicons name="pencil-outline" size={12} color={TEAL} />
                          <ThemedText style={[s.expandActionText, { color: TEAL }]}>Edit</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.expandActionBtn} onPress={() => deleteActivity(act.id)}>
                          <Ionicons name="trash-outline" size={12} color={RED} />
                          <ThemedText style={[s.expandActionText, { color: RED }]}>Delete</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Floating move-drag preview */}
            {isDragging && dragAct && (() => {
              const cfg    = ACTIVITY_CONFIG[dragAct.activity_type] ?? ACTIVITY_CONFIG.custom;
              const height = Math.max((dragAct.duration_minutes ?? 30) * PX_PER_MIN, MIN_BLOCK_H);
              return (
                <Animated.View
                  pointerEvents="none"
                  style={[s.calBlock, {
                    top: dragBlockY, height,
                    borderColor: TEAL, borderWidth: 1.5,
                    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
                    zIndex: 20,
                    shadowColor: TEAL, shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.5, shadowRadius: 14, elevation: 14,
                  }]}
                >
                  <View style={{ flex: 1, flexDirection: 'row' }}>
                    <View style={[s.blockHeader, { flex: 1 }]}>
                      <View style={[s.blockIcon, { backgroundColor: `${cfg.color}22` }]}>
                        <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={s.blockTitle}>{dragAct.title}</ThemedText>
                        <ThemedText style={[s.blockMeta, { color: TEAL }]}>{liveTime}</ThemedText>
                      </View>
                    </View>
                    <View style={s.blockDragHandle}><Ionicons name="reorder-three" size={20} color={TEAL} /></View>
                  </View>
                </Animated.View>
              );
            })()}

            {scheduledActs.length === 0 && (
              <View style={s.calEmptyHint}>
                <Ionicons name="time-outline" size={30} color={MUTED} />
                <ThemedText style={[s.blockMeta, { marginTop: 6 }]}>Tap + Add to place activities</ThemedText>
              </View>
            )}
          </View>

          {/* Unscheduled */}
          {unscheduledActs.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <ThemedText style={s.sectionLabel}>UNSCHEDULED</ThemedText>
              {unscheduledActs.map(act => {
                const cfg = ACTIVITY_CONFIG[act.activity_type] ?? ACTIVITY_CONFIG.custom;
                return (
                  <View key={act.id} style={s.unscheduledCard}>
                    <View style={[s.blockIcon, { backgroundColor: `${cfg.color}22` }]}>
                      <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.blockTitle}>{act.title}</ThemedText>
                      {act.duration_minutes ? <ThemedText style={s.blockMeta}>{act.duration_minutes} min</ThemedText> : null}
                    </View>
                    <TouchableOpacity onPress={() => openEdit(act)} style={s.setTimeBtn}>
                      <ThemedText style={s.setTimeBtnText}>Set Time</ThemedText>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {activities.length > 0 && (
            <TouchableOpacity style={s.addMoreBtn} onPress={openAdd} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={17} color={TEAL} />
              <ThemedText style={s.addMoreText}>Add Activity</ThemedText>
            </TouchableOpacity>
          )}
          {activities.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="calendar-outline" size={44} color={MUTED} />
              <ThemedText style={s.emptyTitle}>No activities yet</ThemedText>
              <ThemedText style={s.emptySub}>Build this day's schedule block by block</ThemedText>
              <TouchableOpacity style={s.emptyPrimaryBtn} onPress={openAdd} activeOpacity={0.8}>
                <ThemedText style={s.emptyPrimaryBtnText}>+ Add First Activity</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* EDIT MODAL */}
      <Modal visible={showModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <ThemedText style={s.sheetTitle}>{editingId ? 'Edit Activity' : 'Add Activity'}</ThemedText>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
              <ThemedText style={s.fieldLabel}>TYPE</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {(Object.keys(ACTIVITY_CONFIG) as ActivityType[]).map(type => {
                  const cfg = ACTIVITY_CONFIG[type]; const active = actType === type;
                  return (
                    <TouchableOpacity key={type}
                      style={[s.chip, active && { borderColor: cfg.color, backgroundColor: `${cfg.color}18` }]}
                      onPress={() => { setActType(type); if (!actTitle || actTitle === ACTIVITY_CONFIG[actType].defaultTitle) setActTitle(cfg.defaultTitle); }}
                    >
                      <Ionicons name={cfg.icon as any} size={13} color={active ? cfg.color : MUTED} />
                      <ThemedText style={[s.chipText, active && { color: cfg.color }]}>{cfg.label}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <ThemedText style={s.fieldLabel}>TITLE</ThemedText>
              <TextInput style={s.input} value={actTitle} onChangeText={setActTitle}
                placeholder="e.g. Ice Session, Dryland, Lunch…" placeholderTextColor={MUTED}
                returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss} />
              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[s.fieldLabel, { paddingHorizontal: 0 }]}>START TIME</ThemedText>
                  <TextInput style={[s.input, { marginHorizontal: 0 }]} value={actTime} onChangeText={setActTime}
                    placeholder="9:30 AM" placeholderTextColor={MUTED}
                    returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[s.fieldLabel, { paddingHorizontal: 0 }]}>DURATION (MIN)</ThemedText>
                  <TextInput style={[s.input, { marginHorizontal: 0 }]} value={actDuration} onChangeText={setActDuration}
                    placeholder="60" placeholderTextColor={MUTED} keyboardType="number-pad"
                    returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss} />
                </View>
              </View>
              {(actType === 'dryland' || actType === 'classroom' || actType === 'custom' || actType === 'break') && (
                <>
                  <ThemedText style={s.fieldLabel}>DETAILS</ThemedText>
                  <TextInput style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
                    value={actNotes} onChangeText={setActNotes} multiline
                    placeholder={actType === 'dryland' ? 'e.g. Shooting, Strength training…' : actType === 'classroom' ? 'e.g. Offensive zone, Video review…' : 'Details…'}
                    placeholderTextColor={MUTED} />
                </>
              )}
              {(actType === 'ice' || actType === 'dryland') && (
                <>
                  <ThemedText style={s.fieldLabel}>LINK SESSION PLAN (optional)</ThemedText>
                  <TouchableOpacity style={s.sessionBtn} onPress={() => setShowSessionPicker(true)} activeOpacity={0.8}>
                    <Ionicons name="document-text-outline" size={16} color={selectedSession ? TEAL : MUTED} />
                    <ThemedText style={[s.sessionBtnText, selectedSession && { color: TEAL }]} numberOfLines={1}>
                      {selectedSession ? selectedSession.title : 'Choose a session plan…'}
                    </ThemedText>
                    {selectedSession
                      ? <TouchableOpacity onPress={() => setActSessionId(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={16} color={MUTED} />
                        </TouchableOpacity>
                      : <Ionicons name="chevron-forward" size={14} color={MUTED} />}
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]} onPress={saveActivity} disabled={saving}>
                <ThemedText style={s.saveBtnText}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Activity'}</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
          </TouchableWithoutFeedback>
        </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SESSION PICKER */}
      <Modal visible={showSessionPicker} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <ThemedText style={s.sheetTitle}>Choose Session Plan</ThemedText>
              <TouchableOpacity onPress={() => setShowSessionPicker(false)}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {sessions.length === 0
                ? <View style={{ alignItems: 'center', padding: 32 }}><ThemedText style={{ color: MUTED, textAlign: 'center' }}>No sessions yet. Create one in the Playbook first.</ThemedText></View>
                : sessions.map((sess, i) => (
                  <TouchableOpacity key={sess.id}
                    style={[s.sessRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDER }]}
                    onPress={() => { setActSessionId(sess.id); setShowSessionPicker(false); }} activeOpacity={0.8}
                  >
                    <View style={s.sessIcon}><Ionicons name="document-text-outline" size={17} color={TEAL} /></View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.sessTitle}>{sess.title}</ThemedText>
                      {sess.total_duration_minutes ? <ThemedText style={s.sessMeta}>{sess.total_duration_minutes} min</ThemedText> : null}
                    </View>
                    {actSessionId === sess.id && <Ionicons name="checkmark-circle" size={18} color={TEAL} />}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 16, paddingTop: 0 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  editBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  editBtnActive: { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.12)' },
  editBtnText: { fontSize: 13, fontWeight: '700', color: MUTED },
  editBtnTextActive: { color: TEAL },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  addBtnText: { fontSize: 13, fontWeight: '700', color: TEAL },

  editHint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,196,180,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)' },
  editHintText: { fontSize: 11, color: TEAL, flex: 1 },

  // ── Calendar ────────────────────────────────────────────────────────────────
  // Line and label are now SEPARATE absolute elements — line is exactly at Y, label centered on it
  hourLine:  { position: 'absolute', left: TIME_COL_W, right: 0, height: 1, backgroundColor: BORDER },
  hourLabel: { position: 'absolute', left: 0, width: TIME_COL_W - 6, textAlign: 'right', paddingRight: 6, fontSize: 9, fontWeight: '500', color: 'rgba(139,148,158,0.35)' },
  halfHourLine: { position: 'absolute', left: TIME_COL_W, right: 0, height: 1, backgroundColor: 'rgba(33,38,45,0.55)' },

  actTimeLabel: { position: 'absolute', left: 0, width: TIME_COL_W - 4, alignItems: 'flex-end', paddingRight: 6, zIndex: 5 },
  actTimeLabelHr: { fontSize: 11, fontWeight: '800', color: TEAL, lineHeight: 13 },
  actTimeLabelAP: { fontSize: 8,  fontWeight: '700', color: TEAL, lineHeight: 10 },

  liveTimeBubble: { position: 'absolute', left: 0, width: TIME_COL_W - 4, alignItems: 'flex-end', paddingRight: 4, zIndex: 30 },
  liveTimeBubble2: { position: 'absolute', left: 0, width: TIME_COL_W - 4, alignItems: 'flex-end', paddingRight: 4, zIndex: 30 },
  liveTimeText: { fontSize: 10, fontWeight: '800', color: TEAL },

  calBlock: {
    position: 'absolute', left: TIME_COL_W + 4, right: BLOCK_RIGHT,
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    flexDirection: 'column', overflow: 'hidden',
  },

  // Resize handles (top / bottom strip)
  topResizeHandle: { height: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bottomResizeHandle: { height: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resizeGrip: { width: 28, height: 3, borderRadius: 2, backgroundColor: 'rgba(0,196,180,0.5)' },

  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, minHeight: 40 },
  blockIcon:   { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  blockTitle:  { fontSize: 12, fontWeight: '700', color: TEXT },
  blockMeta:   { fontSize: 10, color: MUTED, marginTop: 1 },
  sessionMini: { fontSize: 10, color: TEAL, marginTop: 1 },
  blockDragHandle: { width: 30, alignItems: 'center', justifyContent: 'center' },

  // Expansion panel
  expandPanel: {
    position: 'absolute', left: TIME_COL_W + 4, right: BLOCK_RIGHT,
    backgroundColor: CARD, borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    padding: 10, paddingTop: 8,
  },
  sessionRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
  sessionRowText: { flex: 1, fontSize: 12, fontWeight: '600', color: TEAL },
  viewSessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewSessionText:  { fontSize: 11, fontWeight: '700', color: TEAL },
  linkSessionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
  linkSessionText:  { fontSize: 12, color: MUTED },
  expandRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4, marginBottom: 2 },
  expandNote:       { fontSize: 11, color: MUTED, flex: 1, lineHeight: 15 },
  expandActions:    { flexDirection: 'row', gap: 8, marginTop: 10 },
  expandActionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: BORDER },
  expandActionText: { fontSize: 11, fontWeight: '700' },

  calEmptyHint: { position: 'absolute', left: TIME_COL_W + 4, right: BLOCK_RIGHT, top: HOUR_H, alignItems: 'center', gap: 4, opacity: 0.45 },

  sectionLabel:    { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 10 },
  unscheduledCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 8 },
  setTimeBtn:      { backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  setTimeBtnText:  { fontSize: 12, fontWeight: '700', color: TEAL },

  addMoreBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', paddingVertical: 14, marginTop: 4 },
  addMoreText:      { fontSize: 14, fontWeight: '600', color: TEAL },
  emptyState:       { alignItems: 'center', paddingTop: 20, gap: 12 },
  emptyTitle:       { fontSize: 18, fontWeight: '700', color: MUTED },
  emptySub:         { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22 },
  emptyPrimaryBtn:  { marginTop: 8, backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', paddingHorizontal: 20, paddingVertical: 12 },
  emptyPrimaryBtnText: { fontSize: 14, fontWeight: '700', color: TEAL },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 36 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  sheetTitle:  { fontSize: 17, fontWeight: '800', color: TEXT },
  fieldLabel:  { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 8, marginTop: 16, paddingHorizontal: 20 },
  input:       { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, color: TEXT, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 20 },
  chipRow:     { marginBottom: 4 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: BG },
  chipText:    { fontSize: 12, fontWeight: '600', color: MUTED },
  sessionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 14, marginHorizontal: 20 },
  sessionBtnText:  { flex: 1, fontSize: 14, color: MUTED },
  saveBtn:         { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginHorizontal: 20, marginTop: 24, marginBottom: 8 },
  saveBtnText:     { fontSize: 15, fontWeight: '800', color: '#000' },
  sessRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  sessIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,196,180,0.12)', alignItems: 'center', justifyContent: 'center' },
  sessTitle: { fontSize: 15, fontWeight: '600', color: TEXT },
  sessMeta:  { fontSize: 12, color: MUTED, marginTop: 2 },
});
