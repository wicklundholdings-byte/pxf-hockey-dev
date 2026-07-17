import { useEffect, useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Image, TextInput, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { InstructorPicker } from '@/components/instructor-picker';
import { supabase } from '@/lib/supabase';
import { TimePicker } from '@/components/time-picker';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const RED    = '#EF4444';

type Tab = 'overview' | 'schedule' | 'athletes' | 'media' | 'more';

type Camp = {
  id: string;
  name: string;
  title: string;
  type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  event_time: string | null;
  price_cents: number;
  max_spots: number | null;
  location: string | null;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  is_public: boolean;
  schedule_config: any;
  schedule_type: string | null;
};

type Registration = {
  id: string;
  status: string;
  amount_paid: number;
  confirmed_at: string | null;
  parent_user_id: string | null;
  athlete: { id: string; first_name: string; last_name: string } | null;
};

type DayPlan = {
  id: string;
  day_number: number;
  date: string;
  session_id: string | null;
  notes: string | null;
  session?: { id: string; title: string; total_duration_minutes: number | null } | null;
};

type Session = { id: string; title: string; total_duration_minutes: number | null; date: string | null };

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function CampDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [camp, setCamp]                 = useState<Camp | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [dayPlans, setDayPlans]         = useState<DayPlan[]>([]);
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<Tab>('overview');
  const [msgText, setMsgText]           = useState('');
  const [sending, setSending]           = useState(false);
  const [pickerDay, setPickerDay]       = useState<DayPlan | null>(null);
  const [showSeriesPicker, setShowSeriesPicker] = useState(false);
  // Details tab edit state
  const [editDesc,     setEditDesc]    = useState('');
  const [editSpots,    setEditSpots]   = useState('');
  const [editPublic,   setEditPublic]  = useState(true);
  const [editPrice,    setEditPrice]   = useState('');
  const [editType,     setEditType]    = useState('camp');
  const [editTime,     setEditTime]    = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [seriesList, setSeriesList]     = useState<{ id: string; name: string; day_count: number }[]>([]);
  const [applyingSeriesId, setApplyingSeriesId] = useState<string | null>(null);
  const [iceCost, setIceCost]               = useState(0);
  const [instructorCost, setInstructorCost] = useState(0);
  const [slotTimeRange, setSlotTimeRange]   = useState<{ start: string; end: string } | null>(null);

  useEffect(() => { if (id) loadAll(); }, [id]);

  // Reload whenever screen regains focus (e.g. returning from Edit Camp)
  useFocusEffect(useCallback(() => { if (id) loadAll(); }, [id]));

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [
      { data: campData, error: campErr },
      { data: regData, error: regErr },
      { data: planData, error: planErr },
      { data: sessData, error: sessErr },
      { data: slotData },
      { data: assignmentData },
    ] = await Promise.all([
      supabase.from('camps').select('*').eq('id', id).maybeSingle(),
      supabase.from('camp_registrations')
        .select('id, status, amount_paid, confirmed_at, parent_user_id, athlete:athletes(id, first_name, last_name)')
        .eq('camp_id', id).order('registered_at'),
      supabase.from('camp_day_plans')
        .select('id, day_number, date, session_id, notes, session:sessions(id, title, total_duration_minutes)')
        .eq('camp_id', id).order('day_number'),
      supabase.from('sessions')
        .select('id, title, total_duration_minutes, date')
        .eq('coach_id', user.id).order('date', { ascending: false }).limit(50),
      supabase.from('ice_slots')
        .select('cost, start_time, end_time')
        .eq('allocated_to_type', 'camp')
        .eq('allocated_to_id', id)
        .order('start_time'),
      supabase.from('instructor_assignments')
        .select('rate_per_hour, hours, staff_member:staff_members(hourly_rate)')
        .eq('entity_type', 'camp')
        .eq('entity_id', id),
    ]);

    if (campErr) console.error('[camp] error:', campErr.message);
    if (regErr)  console.error('[camp_registrations] error:', regErr.message, regErr.code);
    if (planErr) console.error('[camp_day_plans] error:', planErr.message, planErr.code);
    if (sessErr) console.error('[sessions] error:', sessErr.message);

    const totalIceCost = (slotData ?? []).reduce((sum: number, s: any) => sum + (s.cost ?? 0), 0);
    setIceCost(totalIceCost);

    // Multiply per-session rate×hours by the number of camp days
    const campDayCount = campData
      ? (campData.start_date && campData.end_date
          ? getDatesInRange(campData.start_date, campData.end_date).length
          : campData.schedule_config?.dates?.length ?? 1)
      : 1;

    const totalInstructorCost = (assignmentData ?? []).reduce((sum: number, a: any) => {
      const rate  = a.rate_per_hour ?? a.staff_member?.hourly_rate ?? 0;
      const hours = a.hours ?? 1;
      return sum + rate * hours * campDayCount;
    }, 0);
    setInstructorCost(totalInstructorCost);

    // Time range from ice slots (first slot's start → last slot's end)
    if (slotData && slotData.length > 0) {
      const sorted = [...slotData].sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
      setSlotTimeRange({ start: sorted[0].start_time, end: sorted[sorted.length - 1].end_time });
    }

    setCamp(campData);
    if (campData) {
      setEditDesc(campData.description ?? '');
      setEditSpots(campData.max_spots ? String(campData.max_spots) : '');
      setEditPublic(campData.is_public ?? true);
      setEditPrice(campData.price_cents ? String(campData.price_cents / 100) : '');
      setEditType(campData.type ?? 'camp');
      setEditTime(campData.event_time ?? null);
      setEditLocation(campData.location ?? '');
    }
    setRegistrations(regData ?? []);
    setDayPlans(planData ?? []);
    setSessions(sessData ?? []);
    setLoading(false);
  }

  async function ensureDayPlans(c: Camp) {
    if (!c.start_date || !c.end_date) return;
    const dates = getDatesInRange(c.start_date, c.end_date);
    // Insert any missing day plans
    const existing = new Set(dayPlans.map(p => p.date));
    const missing = dates
      .filter(d => !existing.has(d))
      .map((d, i) => ({ camp_id: c.id, day_number: i + 1 + dayPlans.length, date: d }));
    if (missing.length > 0) {
      await supabase.from('camp_day_plans').upsert(missing, { onConflict: 'camp_id,day_number' });
      // Reload
      const { data } = await supabase.from('camp_day_plans')
        .select('id, day_number, date, session_id, notes, session:sessions(id, title, total_duration_minutes)')
        .eq('camp_id', id).order('day_number');
      setDayPlans(data ?? []);
    }
  }

  async function assignSession(dayPlan: DayPlan, session: Session | null) {
    const { error } = await supabase.from('camp_day_plans')
      .update({ session_id: session?.id ?? null })
      .eq('id', dayPlan.id);
    if (error) { Alert.alert('Error', error.message); return; }
    setDayPlans(prev => prev.map(p =>
      p.id === dayPlan.id
        ? { ...p, session_id: session?.id ?? null, session: session ? { id: session.id, title: session.title, total_duration_minutes: session.total_duration_minutes } : null }
        : p
    ));
    setPickerDay(null);
  }

  async function removeSessionFromDay(dayPlan: DayPlan) {
    Alert.alert('Remove Session', 'Remove this session plan from the day?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => assignSession(dayPlan, null) },
    ]);
  }

  async function loadSeriesForCamp() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('session_series')
      .select('id, name, day_count')
      .eq('coach_id', user.id)
      .order('day_count');
    setSeriesList(data ?? []);
    setShowSeriesPicker(true);
  }

  async function applySeries(seriesId: string) {
    setApplyingSeriesId(seriesId);
    const { data: seriesDays } = await supabase
      .from('session_series_days')
      .select('day_number, session_id')
      .eq('series_id', seriesId)
      .order('day_number');

    if (!seriesDays || seriesDays.length === 0) {
      Alert.alert('Empty Series', 'This series has no sessions assigned yet. Build it in Playbook > Practices > Series first.');
      setApplyingSeriesId(null);
      setShowSeriesPicker(false);
      return;
    }

    // Upsert camp_day_plans for each day in the series
    for (const sd of seriesDays) {
      const existing = dayPlans.find(p => p.day_number === sd.day_number);
      if (existing?.id) {
        await supabase.from('camp_day_plans').update({ session_id: sd.session_id }).eq('id', existing.id);
      } else {
        const date = campDays[sd.day_number - 1];
        if (date) {
          await supabase.from('camp_day_plans')
            .insert({ camp_id: id, day_number: sd.day_number, date, session_id: sd.session_id });
        }
      }
    }
    // Reload
    const { data: planData } = await supabase.from('camp_day_plans')
      .select('id, day_number, date, session_id, notes, session:sessions(id, title, total_duration_minutes)')
      .eq('camp_id', id).order('day_number');
    setDayPlans(planData ?? []);
    setApplyingSeriesId(null);
    setShowSeriesPicker(false);
    Alert.alert('Series Applied!', 'Sessions have been assigned to each camp day.');
  }

  async function saveDetails() {
    if (!camp) return;
    setSavingDetails(true);
    const updates: any = {
      description: editDesc.trim() || null,
      max_spots: editSpots ? parseInt(editSpots, 10) : null,
      is_public: editPublic,
      price_cents: editPrice ? Math.round(parseFloat(editPrice) * 100) : 0,
      type: editType,
      event_time: editTime ?? null,
      location: editLocation.trim() || null,
    };
    const { error } = await supabase.from('camps').update(updates).eq('id', camp.id);
    setSavingDetails(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setCamp(prev => prev ? { ...prev, ...updates } : prev);
    Alert.alert('Saved', 'Camp details updated.');
  }

  async function publish() {
    if (!camp) return;
    Alert.alert('Publish Camp', `Make "${camp.name}" live for parents?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Publish', onPress: async () => {
        const { error } = await supabase.from('camps').update({ status: 'published' }).eq('id', camp.id);
        if (error) { Alert.alert('Error', error.message); return; }
        setCamp(prev => prev ? { ...prev, status: 'published' } : prev);
      }},
    ]);
  }

  async function sendBroadcast() {
    if (!msgText.trim()) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }
    const parentIds = registrations.map(r => r.parent_user_id).filter(Boolean);
    if (parentIds.length === 0) {
      Alert.alert('No recipients', 'No parents registered for this camp yet.');
      setSending(false); return;
    }
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id, content: msgText.trim(),
    });
    setSending(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setMsgText('');
    Alert.alert('Sent!', `Broadcast sent to ${emails.length} parent${emails.length !== 1 ? 's' : ''}.`);
  }

  async function deleteCamp() {
    if (!camp) return;
    Alert.alert('Delete Camp', `Delete "${camp.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('camps').delete().eq('id', camp.id);
        router.back();
      }},
    ]);
  }

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={TEAL} /></View>;
  }
  if (!camp) {
    return <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: MUTED }}>Camp not found.</ThemedText></View>;
  }

  const paid    = registrations.filter(r => r.status === 'confirmed').length;
  const pending = registrations.filter(r => r.status === 'pending').length;
  const revenue    = registrations.filter(r => r.confirmed_at).reduce((sum, r) => sum + (r.amount_paid ?? 0), 0);
  const totalCost  = iceCost + instructorCost;
  const profit     = revenue - totalCost;
  const total   = camp.max_spots ?? 0;
  const filled  = registrations.length;
  const progress = total > 0 ? Math.min(filled / total, 1) : 0;
  const pct     = Math.round(progress * 100);
  const isLive  = camp.status === 'published';

  // Camp days from date range
  const campDays = camp.start_date && camp.end_date
    ? getDatesInRange(camp.start_date, camp.end_date)
    : camp.schedule_config?.dates ?? [];

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview'  },
    { key: 'schedule',  label: 'Schedule'  },
    { key: 'athletes',  label: 'Athletes'  },
    { key: 'media',     label: 'Media'     },
    { key: 'more',      label: 'Details'   },
  ];

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* ── HERO ── */}
          <View style={s.hero}>
            {camp.image_url
              ? <Image source={{ uri: camp.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <LinearGradient colors={['#0D2A24', '#0D1F2A', '#0D1117']} style={StyleSheet.absoluteFill} />
            }
            {/* dark scrim at bottom */}
            <LinearGradient colors={['transparent', 'rgba(13,17,23,0.95)']} style={s.heroScrim} />

            {/* Back button */}
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={TEXT} />
            </TouchableOpacity>

            {/* LIVE / DRAFT badge — top right */}
            <View style={[s.liveBadge, isLive ? s.liveBadgeActive : s.liveBadgeDraft]}>
              <ThemedText style={[s.liveBadgeText, { color: isLive ? GREEN : ORANGE }]}>
                {isLive ? 'LIVE' : 'DRAFT'}
              </ThemedText>
            </View>

            {/* Name + location at bottom of hero */}
            <View style={s.heroInfo}>
              <ThemedText style={s.heroName}>{camp.name}</ThemedText>
              {camp.location ? (
                <View style={s.heroLoc}>
                  <Ionicons name="location-outline" size={13} color={MUTED} />
                  <ThemedText style={s.heroLocText}>{camp.location}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── TAB BAR ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarInner}>
            {TABS.map(t => (
              <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setActiveTab(t.key)} activeOpacity={0.7}>
                <ThemedText style={[s.tabLabel, activeTab === t.key && s.tabLabelActive]}>{t.label}</ThemedText>
                {activeTab === t.key && <View style={s.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <View style={s.section}>

              {/* Stats 2×2 grid */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={[s.statCard, { flex: 1 }]}>
                  <ThemedText style={[s.statNum, { color: TEAL }]}>{paid + pending}/{camp.max_spots ?? '∞'}</ThemedText>
                  <ThemedText style={s.statLabel}>REGISTERED</ThemedText>
                </View>
                <View style={[s.statCard, { flex: 1 }]}>
                  <ThemedText style={[s.statNum, { color: GREEN }]}>${revenue.toFixed(0)}</ThemedText>
                  <ThemedText style={s.statLabel}>REVENUE</ThemedText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.statCard, { flex: 1 }]}>
                  <ThemedText style={[s.statNum, { color: RED }]}>${totalCost.toFixed(0)}</ThemedText>
                  <ThemedText style={s.statLabel}>COSTS</ThemedText>
                  {(iceCost > 0 || instructorCost > 0) && (
                    <ThemedText style={s.statSub}>
                      {[
                        iceCost > 0       ? `Ice $${iceCost.toFixed(0)}`       : null,
                        instructorCost > 0 ? `Staff $${instructorCost.toFixed(0)}` : null,
                      ].filter(Boolean).join(' · ')}
                    </ThemedText>
                  )}
                </View>
                <View style={[s.statCard, { flex: 1 }]}>
                  <ThemedText style={[s.statNum, { color: profit >= 0 ? GREEN : RED }]}>
                    {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(0)}
                  </ThemedText>
                  <ThemedText style={s.statLabel}>PROFIT</ThemedText>
                </View>
              </View>

              {/* Info grid — explicit rows so columns align with stat cards above */}
              <View style={{ gap: 10, marginTop: 10 }}>
                {/* Row 1: Dates | Time */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[s.infoCell, { flex: 1 }]}>
                    <Ionicons name="calendar-outline" size={14} color={MUTED} style={{ marginBottom: 6 }} />
                    <ThemedText style={s.infoCellLabel}>DATES</ThemedText>
                    <ThemedText style={s.infoCellValue}>
                      {camp.start_date && camp.end_date
                        ? camp.start_date === camp.end_date
                          ? fmt(camp.start_date)
                          : `${fmt(camp.start_date)} → ${fmt(camp.end_date)}`
                        : '—'}
                    </ThemedText>
                  </View>
                  <View style={[s.infoCell, { flex: 1 }]}>
                    <Ionicons name="time-outline" size={14} color={MUTED} style={{ marginBottom: 6 }} />
                    <ThemedText style={s.infoCellLabel}>TIME</ThemedText>
                    <ThemedText style={s.infoCellValue}>
                      {slotTimeRange
                        ? `${fmtTime(slotTimeRange.start)} → ${fmtTime(slotTimeRange.end)}`
                        : camp.event_time ? fmtTime(camp.event_time) : '—'}
                    </ThemedText>
                  </View>
                </View>
                {/* Row 2: Price | Sessions */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[s.infoCell, { flex: 1 }]}>
                    <Ionicons name="pricetag-outline" size={14} color={MUTED} style={{ marginBottom: 6 }} />
                    <ThemedText style={s.infoCellLabel}>PRICE</ThemedText>
                    <ThemedText style={s.infoCellValue}>${(camp.price_cents / 100).toFixed(0)}</ThemedText>
                  </View>
                  <View style={[s.infoCell, { flex: 1 }]}>
                    <Ionicons name="document-text-outline" size={14} color={MUTED} style={{ marginBottom: 6 }} />
                    <ThemedText style={s.infoCellLabel}>SESSIONS</ThemedText>
                    <ThemedText style={s.infoCellValue}>{campDays.length}</ThemedText>
                  </View>
                </View>
              </View>

              {/* Instructor assignment */}
              <InstructorPicker entityType="camp" entityId={camp.id} daysCount={Math.max(campDays.length, 1)} style={{ marginBottom: 4 }} />

              {/* Progress bar */}
              {total > 0 && (
                <View style={{ gap: 6 }}>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${pct}%` as any }]} />
                  </View>
                  <ThemedText style={{ fontSize: 13, color: MUTED }}>
                    {pct}% full · {total - filled} spot{total - filled !== 1 ? 's' : ''} left
                  </ThemedText>
                </View>
              )}

              {/* Action buttons */}
              <View style={s.actionRow}>
                <TouchableOpacity style={s.bookingBtn} activeOpacity={0.85}
                  onPress={() => Alert.alert('Booking Page', 'Public booking link coming soon.')}>
                  <LinearGradient colors={[TEAL, GREEN]} style={s.bookingGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="share-social-outline" size={16} color="#000" />
                    <ThemedText style={s.bookingText}>Booking page</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={s.previewBtn} activeOpacity={0.85}
                  onPress={() => Alert.alert('Preview', 'Parent preview coming soon.')}>
                  <ThemedText style={s.previewText}>Preview as parent</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={s.actionRow}>
                <TouchableOpacity style={s.outlineBtn} activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/events', params: { showCreate: '1', editId: camp.id } } as any)}>
                  <Ionicons name="pencil-outline" size={15} color={TEXT} />
                  <ThemedText style={s.outlineText}>Edit Camp</ThemedText>
                </TouchableOpacity>
                {!isLive ? (
                  <TouchableOpacity style={[s.outlineBtn, { borderColor: GREEN }]} activeOpacity={0.85} onPress={publish}>
                    <Ionicons name="rocket-outline" size={15} color={GREEN} />
                    <ThemedText style={[s.outlineText, { color: GREEN }]}>Publish</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[s.outlineBtn, { borderColor: TEAL }]} activeOpacity={0.85}
                    onPress={() => Alert.alert('Message Group', 'Group messaging coming soon.')}>
                    <Ionicons name="chatbubble-outline" size={15} color={TEAL} />
                    <ThemedText style={[s.outlineText, { color: TEAL }]}>Message Group</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Location */}
              {camp.location && (
                <View style={s.locCard}>
                  <View style={s.locHeader}>
                    <Ionicons name="location-outline" size={16} color={TEAL} />
                    <ThemedText style={s.locName}>{camp.location}</ThemedText>
                  </View>
                  <View style={s.locDivider} />
                  <TouchableOpacity style={s.directionsBtn}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(camp.location!)}`)}>
                    <Ionicons name="navigate-outline" size={16} color={TEAL} />
                    <ThemedText style={s.directionsText}>Get Directions</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* RSVP countdown */}
              {camp.start_date && (
                <View style={s.rsvpCard}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText style={s.rsvpLabel}>TODAY'S RSVP</ThemedText>
                    <ThemedText style={s.rsvpTitle}>Camp starts {fmt(camp.start_date)}</ThemedText>
                    {(() => {
                      const days = Math.ceil((new Date(camp.start_date + 'T00:00:00').getTime() - Date.now()) / 86400000);
                      return days > 0
                        ? <ThemedText style={s.rsvpSub}>{days} day{days !== 1 ? 's' : ''} away</ThemedText>
                        : days === 0
                        ? <ThemedText style={[s.rsvpSub, { color: GREEN }]}>Starts today</ThemedText>
                        : null;
                    })()}
                  </View>
                  <Ionicons name="notifications-outline" size={20} color={MUTED} />
                </View>
              )}

              {/* Check-in */}
              <TouchableOpacity style={s.checkinBtn} activeOpacity={0.85}
                onPress={() => Alert.alert('Check-in', 'QR check-in coming in next build.')}>
                <Ionicons name="camera-outline" size={18} color={TEAL} />
                <ThemedText style={s.checkinText}>Start Check-in</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* ── SCHEDULE ── */}
          {activeTab === 'schedule' && (
            <View style={s.section}>
              <View style={s.scheduleHeader}>
                <ThemedText style={s.subLabel}>
                  {camp.type === 'full_day' ? 'DAILY ITINERARIES' : 'CAMP DAYS & SESSION PLANS'}
                </ThemedText>
                {camp.type !== 'full_day' && (
                  <TouchableOpacity onPress={loadSeriesForCamp} style={s.applySeriesBtn}>
                    <Ionicons name="layers-outline" size={13} color={TEAL} />
                    <ThemedText style={s.applySeriesText}>Apply Series</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {campDays.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="calendar-outline" size={32} color={MUTED} />
                  <ThemedText style={s.emptyText}>No dates set</ThemedText>
                  <ThemedText style={s.emptySub}>Edit the camp to add start and end dates</ThemedText>
                </View>
              ) : camp.type === 'full_day' ? (
                /* ── FULL DAY: each day card taps → day itinerary screen ── */
                campDays.map((date, i) => {
                  const dayNum = i + 1;
                  const plan = dayPlans.find(p => p.date === date);

                  async function openDayItinerary() {
                    let planId = plan?.id;
                    if (!planId) {
                      const { data } = await supabase.from('camp_day_plans')
                        .insert({ camp_id: camp!.id, day_number: dayNum, date })
                        .select('id, day_number, date, session_id, notes').single();
                      if (data) {
                        setDayPlans(prev => [...prev, { ...data, session: null }]);
                        planId = data.id;
                      }
                    }
                    if (planId) router.push(`/camp-day/${planId}` as any);
                  }

                  return (
                    <TouchableOpacity key={date} style={s.dayCard} onPress={openDayItinerary} activeOpacity={0.85}>
                      <View style={s.dayHeader}>
                        <View style={s.dayBadge}>
                          <ThemedText style={s.dayBadgeNum}>{dayNum}</ThemedText>
                          <ThemedText style={s.dayBadgeLabel}>DAY</ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={s.dayDate}>{fmt(date)}</ThemedText>
                          {camp.event_time && <ThemedText style={s.dayTime}>{fmtTime(camp.event_time)}</ThemedText>}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: TEAL }}>Build Itinerary</ThemedText>
                          <Ionicons name="chevron-forward" size={14} color={MUTED} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                /* ── REGULAR CAMP: single session per day ── */
                campDays.map((date, i) => {
                  const dayNum = i + 1;
                  const plan = dayPlans.find(p => p.date === date);
                  const sess = plan?.session as any;
                  return (
                    <View key={date} style={s.dayCard}>
                      <View style={s.dayHeader}>
                        <View style={s.dayBadge}>
                          <ThemedText style={s.dayBadgeNum}>{dayNum}</ThemedText>
                          <ThemedText style={s.dayBadgeLabel}>DAY</ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={s.dayDate}>{fmt(date)}</ThemedText>
                          {camp.event_time && <ThemedText style={s.dayTime}>{fmtTime(camp.event_time)}</ThemedText>}
                        </View>
                        {plan && sess && (
                          <TouchableOpacity onPress={() => removeSessionFromDay(plan)} style={s.dayRemoveBtn}>
                            <Ionicons name="close" size={14} color={MUTED} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {plan && sess ? (
                        <TouchableOpacity
                          style={s.sessionPlanCard}
                          onPress={() => router.push(`/session/${sess.id}` as any)}
                          activeOpacity={0.8}
                        >
                          <View style={s.sessionPlanBar} />
                          <View style={{ flex: 1 }}>
                            <ThemedText style={s.sessionPlanTitle}>{sess.title}</ThemedText>
                            {sess.total_duration_minutes && (
                              <ThemedText style={s.sessionPlanSub}>{sess.total_duration_minutes} min</ThemedText>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={MUTED} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={s.addSessionBtn}
                          onPress={() => {
                            if (!plan) {
                              supabase.from('camp_day_plans')
                                .insert({ camp_id: camp.id, day_number: dayNum, date })
                                .select('id, day_number, date, session_id, notes')
                                .single()
                                .then(({ data }) => {
                                  if (data) {
                                    setDayPlans(prev => [...prev, { ...data, session: null }]);
                                    setPickerDay({ ...data, session: null });
                                  }
                                });
                            } else {
                              setPickerDay(plan);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={16} color={TEAL} />
                          <ThemedText style={s.addSessionText}>Add Session Plan</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ── ATHLETES ── */}
          {activeTab === 'athletes' && (
            <View style={s.section}>
              {registrations.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="people-outline" size={32} color={MUTED} />
                  <ThemedText style={s.emptyText}>No registrations yet</ThemedText>
                </View>
              ) : (
                <View style={s.listCard}>
                  {registrations.map((r, i) => (
                    <View key={r.id} style={[s.regRow, i > 0 && s.borderTop]}>
                      {(() => {
                        const name = r.athlete ? `${r.athlete.first_name} ${r.athlete.last_name}` : '—';
                        const initials = name.split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
                        return (
                          <>
                            <View style={[s.regAvatar, { backgroundColor: r.status === 'confirmed' ? TEAL : ORANGE }]}>
                              <ThemedText style={s.regAvatarText}>{initials}</ThemedText>
                            </View>
                            <View style={{ flex: 1 }}>
                              <ThemedText style={s.regName}>{name}</ThemedText>
                              <ThemedText style={s.regSub}>{r.status === 'confirmed' ? 'Confirmed' : 'Pending'} · ${(r.amount_paid ?? 0).toFixed(2)}</ThemedText>
                            </View>
                          </>
                        );
                      })()}
                      <View style={[s.statusBadge, r.status === 'confirmed' ? s.statusPaid : s.statusPending]}>
                        <ThemedText style={[s.statusText, { color: r.status === 'confirmed' ? TEAL : ORANGE }]}>
                          {r.status === 'confirmed' ? 'PAID' : 'PENDING'}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Broadcast */}
              <ThemedText style={[s.subLabel, { marginTop: 8 }]}>BROADCAST MESSAGE</ThemedText>
              <View style={s.msgCard}>
                <TextInput
                  style={s.msgInput}
                  placeholder="Message all registered parents…"
                  placeholderTextColor={MUTED}
                  value={msgText}
                  onChangeText={setMsgText}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[s.sendBtn, (!msgText.trim() || sending) && { opacity: 0.4 }]}
                  onPress={sendBroadcast}
                  disabled={!msgText.trim() || sending}
                >
                  <Ionicons name="send-outline" size={15} color="#000" />
                  <ThemedText style={s.sendText}>{sending ? 'Sending…' : 'Send'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── MEDIA ── */}
          {activeTab === 'media' && (
            <View style={s.section}>
              {camp.image_url
                ? <Image source={{ uri: camp.image_url }} style={s.mediaImg} resizeMode="cover" />
                : null}
              {camp.video_url
                ? <TouchableOpacity style={s.videoCard} onPress={() => Linking.openURL(camp.video_url!)}>
                    <Ionicons name="play-circle-outline" size={40} color={TEAL} />
                    <ThemedText style={{ fontSize: 12, color: MUTED }} numberOfLines={1}>{camp.video_url}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: TEAL }}>Tap to open</ThemedText>
                  </TouchableOpacity>
                : null}
              {!camp.image_url && !camp.video_url && (
                <View style={s.emptyState}>
                  <Ionicons name="images-outline" size={32} color={MUTED} />
                  <ThemedText style={s.emptyText}>No media uploaded</ThemedText>
                  <ThemedText style={s.emptySub}>Add an image or video when editing the camp</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* ── DETAILS (editable) ── */}
          {activeTab === 'more' && (
            <View style={s.section}>

              <ThemedText style={s.subLabel}>DESCRIPTION</ThemedText>
              <TextInput
                style={s.detailsInput}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Add a description…"
                placeholderTextColor={MUTED}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <ThemedText style={s.subLabel}>LOCATION</ThemedText>
              <TextInput
                style={[s.detailsInput, { minHeight: 0, height: 44, textAlignVertical: 'center' }]}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="e.g. Surrey Sport & Leisure Complex"
                placeholderTextColor={MUTED}
              />

              <ThemedText style={s.subLabel}>SETTINGS</ThemedText>
              <View style={s.listCard}>

                {/* Visibility toggle */}
                <View style={s.settingRow}>
                  <View>
                    <ThemedText style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}>Public Registration</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Anyone can sign up</ThemedText>
                  </View>
                  <TouchableOpacity
                    style={[s.toggle, editPublic && s.toggleOn]}
                    onPress={() => setEditPublic(!editPublic)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.toggleThumb, editPublic && s.toggleThumbOn]} />
                  </TouchableOpacity>
                </View>

                {/* Max spots */}
                <View style={[s.settingRow, s.borderTop]}>
                  <View>
                    <ThemedText style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}>Max Spots</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Leave blank for unlimited</ThemedText>
                  </View>
                  <TextInput
                    style={s.settingInput}
                    value={editSpots}
                    onChangeText={setEditSpots}
                    placeholder="—"
                    placeholderTextColor={MUTED}
                    keyboardType="number-pad"
                  />
                </View>

                {/* Price */}
                <View style={[s.settingRow, s.borderTop]}>
                  <View>
                    <ThemedText style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}>Price ($)</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Per registration</ThemedText>
                  </View>
                  <TextInput
                    style={s.settingInput}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    placeholder="0"
                    placeholderTextColor={MUTED}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Daily Start Time */}
                <View style={[s.borderTop, { padding: 14, gap: 8 }]}>
                  <ThemedText style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}>Daily Start Time</ThemedText>
                  <TimePicker value={editTime} onChange={v => setEditTime(v)} />
                </View>

                {/* Type — editable */}
                <View style={[s.borderTop, { padding: 14, gap: 10 }]}>
                  <ThemedText style={{ fontSize: 14, color: MUTED }}>Camp Type</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(['camp', 'full_day', 'clinic', 'private', 'showcase', 'tryout'] as const).map(t => {
                      const labels: Record<string, string> = {
                        camp: 'Regular Camp', full_day: 'Full Day Camp', clinic: 'Clinic',
                        private: 'Private', showcase: 'Showcase', tryout: 'Tryout',
                      };
                      const active = editType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={[s.typeChip, active && s.typeChipActive]}
                          onPress={() => setEditType(t)}
                        >
                          <ThemedText style={[s.typeChipText, active && s.typeChipTextActive]}>
                            {labels[t]}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Schedule type — read only */}
                {camp.schedule_type && (
                  <View style={[s.settingRow, s.borderTop]}>
                    <ThemedText style={{ fontSize: 14, color: MUTED }}>Schedule</ThemedText>
                    <ThemedText style={{ fontSize: 14, fontWeight: '600', color: TEXT, textTransform: 'capitalize' }}>{camp.schedule_type}</ThemedText>
                  </View>
                )}
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[s.saveBtn, savingDetails && { opacity: 0.5 }]}
                onPress={saveDetails}
                disabled={savingDetails}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, GREEN]} style={s.saveGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <ThemedText style={s.saveBtnText}>{savingDetails ? 'Saving…' : 'Save Changes'}</ThemedText>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={s.deleteBtn} onPress={deleteCamp}>
                <Ionicons name="trash-outline" size={16} color={RED} />
                <ThemedText style={{ fontSize: 14, fontWeight: '700', color: RED }}>Delete Camp</ThemedText>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* ── SERIES PICKER MODAL ── */}
      <Modal visible={showSeriesPicker} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <ThemedText style={s.modalTitle}>Apply a Series</ThemedText>
              <TouchableOpacity onPress={() => setShowSeriesPicker(false)}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ThemedText style={s.modalSub}>This camp has {campDays.length} day{campDays.length !== 1 ? 's' : ''}. Only matching series are highlighted.</ThemedText>

            {seriesList.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
                <Ionicons name="layers-outline" size={32} color={MUTED} />
                <ThemedText style={{ color: MUTED, textAlign: 'center' }}>No series yet. Create one in Playbook → Practices → Series.</ThemedText>
              </View>
            ) : (
              <FlatList
                data={seriesList}
                keyExtractor={item => item.id}
                style={{ maxHeight: 400 }}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: BORDER }} />}
                renderItem={({ item }) => {
                  const matches = item.day_count === campDays.length;
                  const applying = applyingSeriesId === item.id;
                  return (
                    <TouchableOpacity
                      style={[s.sessionPickerRow, !matches && { opacity: 0.4 }]}
                      onPress={() => matches && applySeries(item.id)}
                      disabled={!matches || !!applyingSeriesId}
                      activeOpacity={0.8}
                    >
                      <View style={[s.sessionPickerIcon, matches && { backgroundColor: 'rgba(0,196,180,0.15)' }]}>
                        <ThemedText style={{ fontSize: 14, fontWeight: '800', color: matches ? TEAL : MUTED }}>{item.day_count}</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 15, fontWeight: '600', color: TEXT }}>{item.name}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: MUTED }}>{item.day_count}-day series{matches ? ' · matches this camp' : ` · needs ${item.day_count}-day camp`}</ThemedText>
                      </View>
                      {applying
                        ? <ActivityIndicator size="small" color={TEAL} />
                        : matches ? <Ionicons name="chevron-forward" size={16} color={TEAL} /> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── SESSION PICKER MODAL ── */}
      <Modal visible={!!pickerDay} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <ThemedText style={s.modalTitle}>Assign Session Plan</ThemedText>
              <TouchableOpacity onPress={() => setPickerDay(null)}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ThemedText style={s.modalSub}>Day {pickerDay?.day_number} · {fmt(pickerDay?.date ?? null)}</ThemedText>

            {sessions.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
                <Ionicons name="document-outline" size={32} color={MUTED} />
                <ThemedText style={{ color: MUTED, textAlign: 'center' }}>No sessions found. Create a session in the Playbook tab first.</ThemedText>
              </View>
            ) : (
              <FlatList
                data={sessions}
                keyExtractor={item => item.id}
                style={{ maxHeight: 400 }}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: BORDER }} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.sessionPickerRow}
                    onPress={() => pickerDay && assignSession(pickerDay, item)}
                    activeOpacity={0.8}
                  >
                    <View style={s.sessionPickerIcon}>
                      <Ionicons name="document-text-outline" size={18} color={TEAL} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 15, fontWeight: '600', color: TEXT }}>{item.title}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: MUTED }}>
                        {[item.date ? fmt(item.date) : null, item.total_duration_minutes ? `${item.total_duration_minutes} min` : null].filter(Boolean).join(' · ')}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={s.newSessionBtn}
              onPress={() => {
                setPickerDay(null);
                router.push('/sessions' as any);
              }}
            >
              <Ionicons name="add" size={16} color={TEAL} />
              <ThemedText style={{ fontSize: 14, fontWeight: '700', color: TEAL }}>Create New Session</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 40 },

  // Hero
  hero: { height: 220, position: 'relative', justifyContent: 'flex-end' },
  heroScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  backBtn: { position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  liveBadge: { position: 'absolute', top: 16, right: 16, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  liveBadgeActive: { backgroundColor: 'rgba(61,255,143,0.15)', borderWidth: 1, borderColor: 'rgba(61,255,143,0.3)' },
  liveBadgeDraft: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  liveBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heroInfo: { padding: 16 },
  heroName: { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  heroLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroLocText: { fontSize: 13, color: MUTED },

  // Tabs
  tabBar: { borderBottomWidth: 1, borderBottomColor: BORDER },
  tabBarInner: { paddingHorizontal: 8 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 14, alignItems: 'center' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: MUTED },
  tabLabelActive: { color: TEXT },
  tabUnderline: { position: 'absolute', bottom: 0, left: 6, right: 6, height: 2, borderRadius: 1, backgroundColor: TEAL },

  section: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  subLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2 },
  borderTop: { borderTopWidth: 1, borderTopColor: BORDER },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  statLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  statSub: { fontSize: 9, color: MUTED, textAlign: 'center', lineHeight: 13 },

  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCell: { width: '47%', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14 },
  infoCellLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 4 },
  infoCellValue: { fontSize: 15, fontWeight: '700', color: TEXT },

  // Progress
  progressTrack: { height: 6, backgroundColor: BORDER, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: TEAL, borderRadius: 3 },

  // Buttons
  actionRow: { flexDirection: 'row', gap: 10 },
  bookingBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  bookingGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  bookingText: { fontSize: 14, fontWeight: '700', color: '#000' },
  previewBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: TEAL, alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  previewText: { fontSize: 14, fontWeight: '700', color: TEAL },
  outlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingVertical: 14 },
  outlineText: { fontSize: 14, fontWeight: '700', color: TEXT },

  // Location
  locCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  locHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  locName: { fontSize: 14, fontWeight: '600', color: TEXT, flex: 1 },
  locDivider: { height: 1, backgroundColor: BORDER },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  directionsText: { fontSize: 14, fontWeight: '700', color: TEAL },

  // RSVP
  rsvpCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rsvpLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  rsvpTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  rsvpSub: { fontSize: 13, color: MUTED },

  // Check-in
  checkinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: TEAL, paddingVertical: 16 },
  checkinText: { fontSize: 15, fontWeight: '700', color: TEAL },

  // Schedule / Day cards
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  applySeriesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  applySeriesText: { fontSize: 12, fontWeight: '700', color: TEAL },
  dayCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  dayBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)', alignItems: 'center', justifyContent: 'center', gap: 1 },
  dayBadgeNum: { fontSize: 16, fontWeight: '800', color: TEAL, lineHeight: 18 },
  dayBadgeLabel: { fontSize: 8, fontWeight: '700', color: TEAL, letterSpacing: 1, lineHeight: 10 },
  dayDate: { fontSize: 15, fontWeight: '700', color: TEXT },
  dayTime: { fontSize: 12, color: MUTED, marginTop: 2 },
  dayRemoveBtn: { padding: 8 },
  sessionPlanCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: BORDER, padding: 14 },
  sessionPlanBar: { width: 3, height: 36, borderRadius: 2, backgroundColor: TEAL },
  sessionPlanTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  sessionPlanSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  addSessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: BORDER, padding: 14 },
  addSessionText: { fontSize: 14, fontWeight: '600', color: TEAL },

  // Athletes
  listCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  regRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  regAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  regAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },
  regName: { fontSize: 14, fontWeight: '700', color: TEXT },
  regSub: { fontSize: 12, color: MUTED },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPaid: { backgroundColor: 'rgba(0,196,180,0.12)' },
  statusPending: { backgroundColor: 'rgba(245,158,11,0.12)' },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Broadcast
  msgCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 10 },
  msgInput: { color: TEXT, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: TEAL, borderRadius: 10, paddingVertical: 12 },
  sendText: { fontSize: 14, fontWeight: '700', color: '#000' },

  // Media
  mediaImg: { width: '100%', height: 200, borderRadius: 14 },
  videoCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 24, alignItems: 'center', gap: 8 },

  // Info card
  infoCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },

  // Type chips
  typeChip: { borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: BG },
  typeChipActive: { borderColor: TEAL, backgroundColor: '#0D2A24' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: MUTED },
  typeChipTextActive: { color: TEAL },

  // Details tab
  detailsInput: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, color: TEXT, fontSize: 14, padding: 14, minHeight: 100, textAlignVertical: 'top', lineHeight: 22 },
  settingInput: { backgroundColor: BG, borderRadius: 8, borderWidth: 1, borderColor: BORDER, color: TEXT, fontSize: 15, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 8, minWidth: 80, textAlign: 'right' },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: BORDER, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: TEAL },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: MUTED },
  toggleThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveGrad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#000' },

  // Delete
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', paddingVertical: 14, marginTop: 8 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: MUTED },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },

  // Session picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  modalSub: { fontSize: 13, color: MUTED, paddingHorizontal: 20, marginBottom: 12 },
  sessionPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  sessionPickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,196,180,0.12)', alignItems: 'center', justifyContent: 'center' },
  newSessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, borderRadius: 14, borderWidth: 1, borderColor: TEAL, paddingVertical: 14 },
});
