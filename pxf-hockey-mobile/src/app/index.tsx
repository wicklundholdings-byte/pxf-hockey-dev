import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { DatePicker } from '@/components/date-picker';
import { TimePicker } from '@/components/time-picker';

const BG      = '#0D1117';
const CARD    = '#161B22';
const TEAL    = '#00C4B4';
const TEXT    = '#FFFFFF';
const MUTED   = '#8B949E';
const BORDER  = '#21262D';

// Event type color system — used consistently across the app
const COLOR_CAMP    = '#00C4B4'; // Teal (matches session + brand)
const COLOR_PRIVATE = '#EF4444'; // Red
const COLOR_SESSION = '#4F8EF7'; // Blue
const COLOR_GAME    = '#7C3AED'; // Purple

function fmt12h(t: string | null | undefined): string | null {
  if (!t) return null;
  const parts = t.trim().split(':');
  const h = Number(parts[0]);
  const m = Number((parts[1] ?? '').replace(/\D.*/, '')); // strip any trailing "AM/PM"
  if (isNaN(h) || isNaN(m)) return t.trim(); // already formatted — return as-is
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getTodayShort() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText style={{ fontSize: size * 0.35, fontWeight: '700', color: '#000' }}>{initials}</ThemedText>
    </View>
  );
}

type Team = { id: string; name: string; age_group: string | null; color: string | null };
type UpcomingEvent = { id: string; title: string; date: string; time: string | null; total_duration_minutes?: number; type: 'session' | 'camp' | 'private' | 'game'; location?: string | null; instructorName?: string | null; team_id?: string | null };
type Camp = { id: string; name: string; start_date: string; end_date: string; status: string; max_spots: number | null; registrations: number; instructorName?: string | null };

function teamInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function DashboardScreen() {
  const router = useRouter();
  const [userName, setUserName]           = useState('');
  const [userInitials, setUserInitials]   = useState('?');
  const [isFoundingMember, setIsFoundingMember] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [teams, setTeams]                 = useState<Team[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingEvent[]>([]);
  const [camps, setCamps]                 = useState<Camp[]>([]);
  const [privates, setPrivates]           = useState<Camp[]>([]);
  const [sessionRsvpMap, setSessionRsvpMap] = useState<Record<string, { yes: number; total: number }>>({});
  const [unallocatedSlots, setUnallocatedSlots] = useState<any[]>([]);
  // Map of "eventId_date" → ice slot end_time for linked events
  const [iceEndMap, setIceEndMap] = useState<Map<string, string>>(new Map());

  // ── Book a Private modal ──
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [pvtAthlete, setPvtAthlete] = useState('');
  const [pvtDate,    setPvtDate]    = useState('');
  const [pvtTime,    setPvtTime]    = useState<string | null>(null);
  const [pvtPrice,   setPvtPrice]   = useState('');
  const [pvtLoc,     setPvtLoc]     = useState('');
  const [pvtSaving,  setPvtSaving]  = useState(false);

  function openPrivateModal() {
    setPvtAthlete(''); setPvtDate(''); setPvtTime(null);
    setPvtPrice(''); setPvtLoc('');
    setShowPrivateModal(true);
  }

  async function savePrivate() {
    if (!pvtDate) { Alert.alert('Date required', 'Please pick a date for the session.'); return; }
    setPvtSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPvtSaving(false); return; }
    const perCents = pvtPrice ? Math.round(parseFloat(pvtPrice) * 100) : 0;
    const insertData: Record<string, unknown> = {
      coach_id:    user.id,
      name:        pvtAthlete.trim() ? `Private — ${pvtAthlete.trim()}` : 'Private Session',
      title:       pvtAthlete.trim() ? `Private — ${pvtAthlete.trim()}` : 'Private Session',
      type:        'private',
      status:      'published',
      is_public:   false,
      price_cents: perCents,
      price_per_session_cents: perCents,
      max_spots:   1,
      schedule_config: { dates: [pvtDate] },
    };
    if (pvtAthlete.trim())  insertData.athlete_name = pvtAthlete.trim();
    if (pvtTime)            insertData.event_time   = pvtTime;
    if (pvtLoc.trim())      insertData.location     = pvtLoc.trim();

    const { data: campRow, error } = await supabase.from('camps').insert(insertData).select('id').single();
    setPvtSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowPrivateModal(false);
    if (campRow?.id) router.push(`/camp/${campRow.id}` as any);
  }

  useFocusEffect(useCallback(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, is_founding_member')
        .eq('id', user.id)
        .maybeSingle();

      const name = profile?.full_name || user.email?.split('@')[0] || 'Coach';
      setUserName(name);
      setUserInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?');
      if (profile?.is_founding_member) setIsFoundingMember(true);

      // Teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, age_group, color')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setTeams(teamsData ?? []);

      // Upcoming events — sessions + camps in next 7 days
      // Use local date to avoid UTC-offset mismatches (e.g. 9 PM PST = next UTC day)
      const _now  = new Date();
      const localDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const today = localDate(_now);
      const _fut  = new Date(_now); _fut.setDate(_now.getDate() + 7);
      const in7   = localDate(_fut);

      const [{ data: sessData }, { data: campEventData }, { data: gamesData }] = await Promise.all([
        supabase
          .from('sessions')
          .select('id, title, date, time, total_duration_minutes, team_id, location')
          .eq('coach_id', user.id)
          .gte('date', today)
          .lte('date', in7)
          .order('date')
          .order('time', { nullsFirst: false })
          .limit(20),
        // Fetch camps active within the 7-day window — includes multi-day camps already underway
        supabase
          .from('camps')
          .select('id, name, start_date, end_date, event_time, location, type')
          .eq('coach_id', user.id)
          .lte('start_date', in7)
          .or(`end_date.gte.${today},end_date.is.null`)
          .order('start_date')
          .limit(10),
        supabase
          .from('games')
          .select('id, opponent, game_date, game_time, location, team_id')
          .eq('coach_id', user.id)
          .gte('game_date', today)
          .lte('game_date', in7)
          .order('game_date')
          .order('game_time', { nullsFirst: false })
          .limit(20),
      ]);

      const sessEvents: UpcomingEvent[] = (sessData ?? []).map((s: any) => ({
        id: s.id, title: s.title, date: s.date, time: s.time,
        total_duration_minutes: s.total_duration_minutes, type: 'session' as const,
        team_id: s.team_id ?? null, location: s.location ?? null,
      }));
      // Expand multi-day camps into one UpcomingEvent per active day within the window.
      // e.g. Skating Flow July 13–15 becomes three separate entries (13, 14, 15).
      const campEvents: UpcomingEvent[] = [];
      for (const c of (campEventData ?? [])) {
        if (!c.start_date) continue;
        const campStart = c.start_date < today ? today : c.start_date;
        const campEnd   = c.end_date ?? campStart;
        const cursor    = new Date(campStart + 'T12:00:00');
        const endDate   = new Date(campEnd   + 'T12:00:00');
        while (cursor <= endDate) {
          const dateStr = localDate(cursor);
          if (dateStr <= in7) {
            campEvents.push({
              id: c.id,
              title: c.name ?? '(Unnamed)',
              date: dateStr,
              time: c.event_time ?? null,
              location: c.location ?? null,
              type: (c.type === 'private' ? 'private' : 'camp') as UpcomingEvent['type'],
            });
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      const gameEvents: UpcomingEvent[] = (gamesData ?? []).map((g: any) => ({
        id: g.id,
        title: `vs ${g.opponent}`,
        date: g.game_date,
        time: g.game_time ?? null,
        location: g.location ?? null,
        type: 'game' as const,
        team_id: g.team_id ?? null,
      }));

      const merged = [...sessEvents, ...campEvents, ...gameEvents].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (!a.time && !b.time) return 0;
        return !a.time ? 1 : !b.time ? -1 : a.time.localeCompare(b.time);
      });
      // (instructor names patched in below after camp instructor fetch)

      // Active camps section — non-draft, non-private, end date today or future
      const { data: campsData, error: campsError } = await supabase
        .from('camps')
        .select('id, name, start_date, end_date, status, max_spots')
        .eq('coach_id', user.id)
        .neq('status', 'draft')
        .neq('type', 'private')
        .gte('end_date', today)
        .order('start_date')
        .limit(3);
      if (campsError) console.error('camps query error:', campsError);

      // Upcoming Privates section
      const { data: privatesData } = await supabase
        .from('camps')
        .select('id, name, start_date, end_date, status, max_spots, athlete_name, event_time')
        .eq('coach_id', user.id)
        .eq('type', 'private')
        .gte('end_date', today)
        .order('start_date')
        .limit(5);

      // Fetch registration counts separately
      const campIds = (campsData ?? []).map((c: any) => c.id);
      let regCounts: Record<string, number> = {};
      if (campIds.length > 0) {
        const { data: regData, error: regError } = await supabase
          .from('camp_registrations')
          .select('camp_id')
          .in('camp_id', campIds);
        if (regError) console.error('registrations query error:', regError);
        (regData ?? []).forEach((r: any) => {
          regCounts[r.camp_id] = (regCounts[r.camp_id] ?? 0) + 1;
        });
      }

      // Fetch instructor assignments for camps (bulk)
      const campInstructorMap: Record<string, string> = {};
      if (campIds.length > 0) {
        const { data: campAsgns } = await supabase
          .from('instructor_assignments')
          .select('entity_id, staff_member:staff_members(name, is_self)')
          .eq('entity_type', 'camp')
          .in('entity_id', campIds);
        (campAsgns ?? []).forEach((a: any) => {
          if (campInstructorMap[a.entity_id]) return; // first one wins
          const sm = Array.isArray(a.staff_member) ? a.staff_member[0] : a.staff_member;
          if (sm) campInstructorMap[a.entity_id] = sm.is_self ? 'You' : sm.name;
        });
      }

      // Fetch instructor assignments for upcoming sessions/camp events
      const upcomingCampIds = campEvents.map(e => e.id);
      const upcomingSessIds = sessEvents.map(e => e.id);
      const upcomingInstructorMap: Record<string, string> = {};
      const fetchUpcomingInstructors = async () => {
        const promises = [];
        if (upcomingCampIds.length > 0) {
          promises.push(
            supabase.from('instructor_assignments')
              .select('entity_id, staff_member:staff_members(name, is_self)')
              .eq('entity_type', 'camp').in('entity_id', upcomingCampIds)
          );
        }
        if (upcomingSessIds.length > 0) {
          promises.push(
            supabase.from('instructor_assignments')
              .select('entity_id, staff_member:staff_members(name, is_self)')
              .eq('entity_type', 'session').in('entity_id', upcomingSessIds)
          );
        }
        const results = await Promise.all(promises);
        results.forEach(({ data }) => {
          (data ?? []).forEach((a: any) => {
            if (upcomingInstructorMap[a.entity_id]) return;
            const sm = Array.isArray(a.staff_member) ? a.staff_member[0] : a.staff_member;
            if (sm) upcomingInstructorMap[a.entity_id] = sm.is_self ? 'You' : sm.name;
          });
        });
      };
      await fetchUpcomingInstructors();

      const finalSessions = merged.map(ev => ({
        ...ev,
        instructorName: upcomingInstructorMap[ev.id] ?? null,
      }));
      setUpcomingSessions(finalSessions);

      // RSVP / registration counts for ALL upcoming events
      const allSessIds     = [...new Set(finalSessions.filter(s => s.type === 'session').map(s => s.id))];
      const allGameIds     = finalSessions.filter(s => s.type === 'game').map(s => s.id);
      const allCampEvtIds  = [...new Set(finalSessions.filter(s => s.type === 'camp' || s.type === 'private').map(s => s.id))];
      const allTeamIds     = [...new Set(finalSessions.map(s => s.team_id).filter(Boolean))] as string[];
      const [
        { data: sessRsvpRows },
        { data: gameRsvpRows },
        { data: playerRows },
        { data: campRegRows },
        { data: campSpotRows },
      ] = await Promise.all([
        allSessIds.length > 0
          ? supabase.from('event_rsvps').select('session_id').eq('status', 'yes').in('session_id', allSessIds)
          : Promise.resolve({ data: [] as any[] }),
        allGameIds.length > 0
          ? supabase.from('event_rsvps').select('game_id').eq('status', 'yes').in('game_id', allGameIds)
          : Promise.resolve({ data: [] as any[] }),
        allTeamIds.length > 0
          ? supabase.from('players').select('id, team_id').in('team_id', allTeamIds)
          : Promise.resolve({ data: [] as any[] }),
        allCampEvtIds.length > 0
          ? supabase.from('camp_registrations').select('camp_id').neq('status', 'cancelled').in('camp_id', allCampEvtIds)
          : Promise.resolve({ data: [] as any[] }),
        allCampEvtIds.length > 0
          ? supabase.from('camps').select('id, max_spots').in('id', allCampEvtIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const teamPlayerCount: Record<string, number> = {};
      (playerRows ?? []).forEach((p: any) => {
        teamPlayerCount[p.team_id] = (teamPlayerCount[p.team_id] ?? 0) + 1;
      });
      const sessRsvpCount: Record<string, number> = {};
      (sessRsvpRows ?? []).forEach((r: any) => {
        if (r.session_id) sessRsvpCount[r.session_id] = (sessRsvpCount[r.session_id] ?? 0) + 1;
      });
      const gameRsvpCount: Record<string, number> = {};
      (gameRsvpRows ?? []).forEach((r: any) => {
        if (r.game_id) gameRsvpCount[r.game_id] = (gameRsvpCount[r.game_id] ?? 0) + 1;
      });
      const campRegCount: Record<string, number> = {};
      (campRegRows ?? []).forEach((r: any) => {
        if (r.camp_id) campRegCount[r.camp_id] = (campRegCount[r.camp_id] ?? 0) + 1;
      });
      const campMaxSpots: Record<string, number> = {};
      (campSpotRows ?? []).forEach((c: any) => {
        campMaxSpots[c.id] = c.max_spots ?? 0;
      });
      const newRsvpMap: Record<string, { yes: number; total: number }> = {};
      allSessIds.forEach(id => {
        const ev = finalSessions.find(s => s.id === id);
        newRsvpMap[id] = { yes: sessRsvpCount[id] ?? 0, total: ev?.team_id ? (teamPlayerCount[ev.team_id] ?? 0) : 0 };
      });
      allGameIds.forEach(id => {
        const ev = finalSessions.find(g => g.id === id);
        newRsvpMap[id] = { yes: gameRsvpCount[id] ?? 0, total: ev?.team_id ? (teamPlayerCount[ev.team_id] ?? 0) : 0 };
      });
      allCampEvtIds.forEach(id => {
        newRsvpMap[id] = { yes: campRegCount[id] ?? 0, total: campMaxSpots[id] ?? 0 };
      });
      setSessionRsvpMap(newRsvpMap);

      setCamps(
        (campsData ?? []).map((c: any) => ({
          ...c,
          registrations: regCounts[c.id] ?? 0,
          instructorName: campInstructorMap[c.id] ?? null,
        }))
      );

      setPrivates(
        (privatesData ?? []).map((c: any) => ({
          ...c,
          registrations: 0,
          instructorName: null,
        }))
      );

      // Unallocated ice slots — next 30 days (wide enough to catch upcoming weeks of ice)
      const _fut30 = new Date(_now); _fut30.setDate(_now.getDate() + 30);
      const in30 = localDate(_fut30);
      const { data: iceSlotData } = await supabase
        .from('ice_slots')
        .select('id, slot_date, start_time, end_time, rink_id, location_id, coach_locations(name)')
        .eq('coach_id', user.id)
        .is('allocated_to_id', null)
        .gte('slot_date', today)
        .lte('slot_date', in30)
        .order('slot_date')
        .order('start_time')
        .limit(50);
      setUnallocatedSlots(iceSlotData ?? []);

      // Allocated ice slots (next 7 days) — for end-time lookup on linked camps/sessions
      const { data: allocSlotData } = await supabase
        .from('ice_slots')
        .select('allocated_to_id, slot_date, end_time')
        .eq('coach_id', user.id)
        .not('allocated_to_id', 'is', null)
        .gte('slot_date', today)
        .lte('slot_date', in7);
      const endMap = new Map<string, string>();
      for (const s of (allocSlotData ?? [])) {
        if (s.allocated_to_id && s.slot_date && s.end_time) {
          endMap.set(`${s.allocated_to_id}_${s.slot_date}`, s.end_time);
        }
      }
      setIceEndMap(endMap);

      setLoading(false);
    }
    loadDashboard();
  }, []));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Founding Member Banner */}
          {isFoundingMember && (
            <LinearGradient colors={['#0D2A2A', '#0D1F2A']} style={styles.foundingBanner}>
              <Ionicons name="flame" size={16} color={TEAL} />
              <ThemedText style={styles.foundingText}>Founding Member — Free until December 31, 2027</ThemedText>
              <View style={styles.eliteBadge}>
                <ThemedText style={styles.eliteBadgeText}>Elite{'\n'}Coach</ThemedText>
              </View>
            </LinearGradient>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.coachChip}>
                <ThemedText style={styles.coachChipText}>COACH</ThemedText>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity onPress={() => router.push('/profile' as any)} style={styles.iconBtn}>
                  <Ionicons name="person-circle-outline" size={22} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/business' as any)}>
                  <Ionicons name="briefcase-outline" size={20} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/film' as any)}>
                  <Ionicons name="camera-outline" size={20} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings' as any)}>
                  <Ionicons name="settings-outline" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.headerRight}>
              <ThemedText style={styles.todayDate}>{getTodayLabel()}</ThemedText>
              <TouchableOpacity style={styles.bellBtn}>
                <Ionicons name="notifications-outline" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting */}
          <View style={styles.greetingSection}>
            <ThemedText style={styles.greeting}>{getGreeting()}, {userName}</ThemedText>
          </View>

          {/* TODAY */}
          <ThemedText style={styles.sectionLabel}>TODAY</ThemedText>
          {(() => {
            const _tn = new Date();
            const todayStr = `${_tn.getFullYear()}-${String(_tn.getMonth()+1).padStart(2,'0')}-${String(_tn.getDate()).padStart(2,'0')}`;
            const todaySess = upcomingSessions.filter(s => s.date.slice(0,10) === todayStr);
            if (todaySess.length === 0) {
              return (
                <View style={styles.todayCard}>
                  <View style={styles.todayAccent} />
                  <View style={styles.todayBody}>
                    <View style={styles.todayTop}>
                      <View>
                        <ThemedText style={styles.todayTime}>—</ThemedText>
                        <ThemedText style={styles.todayTimeLabel}>Nothing{'\n'}scheduled</ThemedText>
                      </View>
                      <View style={styles.todayInfo}>
                        <ThemedText style={styles.todayEmpty}>No sessions today</ThemedText>
                        <ThemedText style={styles.todayEmptySub}>Add a session in the Sessions tab</ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }
            return (
              <>
                {todaySess.map(sess => {
                  const rsvp    = sessionRsvpMap[sess.id];
                  const startStr = fmt12h(sess.time);
                  // End time: from linked ice slot, or computed from duration
                  const iceEnd = iceEndMap.get(`${sess.id}_${sess.date}`);
                  const computedEnd = !iceEnd && sess.total_duration_minutes && sess.time
                    ? (() => { const [h,m] = sess.time.split(':').map(Number); const tot = h*60+m+sess.total_duration_minutes; return `${String(Math.floor(tot/60)%24).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`; })()
                    : null;
                  const endStr = fmt12h(iceEnd ?? computedEnd);
                  const timeStr = startStr ? (endStr ? `${startStr} – ${endStr}` : startStr) : null;
                  const meta    = [timeStr, sess.location].filter(Boolean).join(' · ');
                  return (
                    <View key={`${sess.id}-${sess.date}`} style={styles.todayCard}>
                      <View style={[styles.todayAccent, {
                        backgroundColor: sess.type === 'camp' ? COLOR_CAMP
                          : sess.type === 'game' ? COLOR_GAME
                          : sess.type === 'private' ? COLOR_PRIVATE
                          : TEAL
                      }]} />
                      {/* Row: tappable body + action button as siblings (no nesting) */}
                      <View style={styles.todayRow}>
                        <TouchableOpacity
                          style={styles.todayBody}
                          onPress={() =>
                            sess.type === 'camp' || sess.type === 'private'
                              ? router.push(`/camp/${sess.id}` as any)
                              : sess.type === 'game'
                              ? router.push(`/game/${sess.id}` as any)
                              : router.push(`/session/${sess.id}` as any)
                          }
                          activeOpacity={0.7}
                        >
                          <ThemedText style={styles.todayTitle}>{sess.title}</ThemedText>
                          {meta ? <ThemedText style={styles.todayEmptySub}>{meta}</ThemedText> : null}
                          {/* Coach */}
                          {sess.type === 'game' ? (
                            <View style={styles.todayRsvpRow}>
                              <Ionicons name="person-outline" size={11} color={MUTED} />
                              <ThemedText style={styles.todayRsvpText}>Coach — {userName}</ThemedText>
                            </View>
                          ) : sess.instructorName ? (
                            <View style={styles.todayRsvpRow}>
                              <Ionicons name="person-outline" size={11} color={MUTED} />
                              <ThemedText style={styles.todayRsvpText}>Coach — {sess.instructorName}</ThemedText>
                            </View>
                          ) : (
                            <View style={styles.todayRsvpRow}>
                              <Ionicons name="warning-outline" size={11} color="#F59E0B" />
                              <ThemedText style={[styles.todayRsvpText, { color: '#F59E0B' }]}>Coach — Not Assigned</ThemedText>
                            </View>
                          )}
                          {/* RSVP */}
                          {rsvp !== undefined && (
                            <View style={styles.todayRsvpRow}>
                              <Ionicons name="people-outline" size={11} color={MUTED} />
                              <ThemedText style={styles.todayRsvpText}>
                                {rsvp.yes}/{rsvp.total} RSVP
                              </ThemedText>
                            </View>
                          )}
                        </TouchableOpacity>
                        {/* Action button */}
                        <TouchableOpacity
                          onPress={() => {
                            if (sess.type === 'game') router.push(`/game/${sess.id}?prep=1` as any);
                            else router.push(`/session-runner/${sess.id}` as any);
                          }}
                          activeOpacity={0.85}
                        >
                          <LinearGradient
                            colors={['#00C4B4', '#3DFF8F']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startSessionBtn}
                          >
                            <Ionicons
                              name={sess.type === 'game' ? 'clipboard-outline' : 'play'}
                              size={12}
                              color="#000"
                            />
                            <ThemedText style={styles.startSessionText}>
                              {sess.type === 'game' ? 'Game Plan' : 'Start'}
                            </ThemedText>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            );
          })()}

          {/* Next 7 Days — tappable header */}
          <TouchableOpacity style={styles.sectionHeader} onPress={() => router.push('/events' as any)} activeOpacity={0.7}>
            <ThemedText style={styles.sectionLabel}>NEXT UP · 7 DAYS</ThemedText>
            <ThemedText style={styles.viewAll}>View schedule ›</ThemedText>
          </TouchableOpacity>
          {upcomingSessions.filter(s => s.date.slice(0,10) > (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })()).length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={24} color={MUTED} />
              <ThemedText style={styles.emptyText}>Nothing coming up</ThemedText>
            </View>
          ) : (
            <View style={styles.listCard}>
              {(() => {
                const _nd = new Date();
                const _todayStr = `${_nd.getFullYear()}-${String(_nd.getMonth()+1).padStart(2,'0')}-${String(_nd.getDate()).padStart(2,'0')}`;
                const nextUp = upcomingSessions.filter(s => s.date.slice(0,10) > _todayStr).slice(0, 4);
                return nextUp.map((ev, i, arr) => {
                const rawD    = ev.date?.slice(0, 10) ?? '';
                const parsedD = new Date(rawD + 'T12:00:00');
                const dateStr = rawD && !isNaN(parsedD.getTime())
                  ? parsedD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  : 'Date TBD';
                const startPart = fmt12h(ev.time);
                const iceEndNu = iceEndMap.get(`${ev.id}_${ev.date?.slice(0,10)}`);
                const compEndNu = !iceEndNu && ev.total_duration_minutes && ev.time
                  ? (() => { const [h,m] = ev.time.split(':').map(Number); const tot = h*60+m+ev.total_duration_minutes; return `${String(Math.floor(tot/60)%24).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}`; })()
                  : null;
                const endPartNu = fmt12h(iceEndNu ?? compEndNu);
                const timePart = startPart ? (endPartNu ? `${startPart} – ${endPartNu}` : startPart) : null;
                const locPart  = ev.location ?? null;
                const meta     = [dateStr, timePart, locPart].filter(Boolean).join(' · ');
                const dotColor = ev.type === 'camp' ? COLOR_CAMP
                  : ev.type === 'private' ? COLOR_PRIVATE
                  : ev.type === 'game' ? COLOR_GAME
                  : COLOR_SESSION;
                const typeLabel = ev.type === 'camp' ? 'CAMP'
                  : ev.type === 'private' ? 'PRIVATE'
                  : ev.type === 'game' ? 'GAME'
                  : null;
                return (
                  <TouchableOpacity key={`${ev.id}-${ev.date}`}
                    style={[styles.listRow, i < arr.length - 1 && styles.listRowBorder]}
                    onPress={() =>
                      ev.type === 'session' ? router.push(`/session/${ev.id}` as any)
                      : ev.type === 'game' ? router.push(`/game/${ev.id}` as any)
                      : router.push(`/camp/${ev.id}` as any)
                    }
                    activeOpacity={0.8}>
                    <View style={[styles.sessionDot, { backgroundColor: dotColor }]} />
                    <View style={styles.listInfo}>
                      {typeLabel && <ThemedText style={[styles.listTypeLabel, { color: dotColor }]}>{typeLabel}</ThemedText>}
                      <ThemedText style={styles.listTitle}>{ev.title}</ThemedText>
                      <ThemedText style={styles.listSub}>{meta}</ThemedText>
                      {/* Coach — shown for all event types */}
                      {ev.type === 'game' ? (
                        <View style={styles.coachLine}>
                          <Ionicons name="person-outline" size={10} color={MUTED} />
                          <ThemedText style={styles.coachLineText}>Coach — {userName}</ThemedText>
                        </View>
                      ) : ev.instructorName ? (
                        <View style={styles.coachLine}>
                          <Ionicons name="person-outline" size={10} color={MUTED} />
                          <ThemedText style={styles.coachLineText}>Coach — {ev.instructorName}</ThemedText>
                        </View>
                      ) : (
                        <View style={styles.coachLineWarn}>
                          <Ionicons name="warning-outline" size={10} color="#F59E0B" />
                          <ThemedText style={styles.coachLineWarnText}>Coach — Not Assigned</ThemedText>
                        </View>
                      )}
                      {/* RSVP — all event types */}
                      {sessionRsvpMap[ev.id] !== undefined && (
                        <View style={styles.coachLine}>
                          <Ionicons name="people-outline" size={10} color={MUTED} />
                          <ThemedText style={styles.coachLineText}>
                            {sessionRsvpMap[ev.id].yes}/{sessionRsvpMap[ev.id].total} RSVP
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={MUTED} />
                  </TouchableOpacity>
                );
              });
              })()}
            </View>
          )}

          {/* Active Camps */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionLabel}>ACTIVE CAMPS</ThemedText>
            <TouchableOpacity onPress={() => router.push('/camps' as any)}>
              <ThemedText style={styles.viewAll}>View all</ThemedText>
            </TouchableOpacity>
          </View>
          {camps.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="snow-outline" size={24} color={MUTED} />
              <ThemedText style={styles.emptyText}>No active camps</ThemedText>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/camps' as any)}>
                <ThemedText style={styles.emptyBtnText}>+ Create Camp</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {camps.map((camp) => {
                const sd  = new Date(camp.start_date + 'T12:00:00');
                const ed  = new Date(camp.end_date   + 'T12:00:00');
                const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const dateRange  = camp.start_date === camp.end_date ? fmt(sd) : `${fmt(sd)} – ${fmt(ed)}`;
                const filled     = camp.registrations;
                const total      = camp.max_spots ?? 0;
                const progress   = total > 0 ? Math.min(filled / total, 1) : 0;
                const spotsLabel = total > 0 ? `${filled}/${total} spots` : `${filled} registered`;
                const isFull     = total > 0 && filled >= total;
                return (
                  <TouchableOpacity
                    key={camp.id}
                    style={styles.campCard}
                    onPress={() => router.push(`/camp/${camp.id}` as any)}
                    activeOpacity={0.85}
                  >
                    {/* Orange left accent */}
                    <View style={styles.campCardBar} />
                    <View style={styles.campCardBody}>
                      {/* Top row: name + spots badge */}
                      <View style={styles.campCardTop}>
                        <ThemedText style={styles.campCardName}>{camp.name}</ThemedText>
                        <View style={[styles.spotsBadge, isFull && styles.spotsBadgeFull]}>
                          <ThemedText style={[styles.spotsText, isFull && { color: '#F59E0B' }]}>
                            {isFull ? 'FULL' : spotsLabel}
                          </ThemedText>
                        </View>
                      </View>
                      {/* Date range */}
                      <ThemedText style={styles.campCardDate}>{dateRange}</ThemedText>
                      {/* Coach line */}
                      {camp.instructorName ? (
                        <View style={styles.coachLine}>
                          <Ionicons name="person-outline" size={10} color={MUTED} />
                          <ThemedText style={styles.coachLineText}>Coach — {camp.instructorName}</ThemedText>
                        </View>
                      ) : (
                        <View style={styles.coachLineWarn}>
                          <Ionicons name="warning-outline" size={10} color="#F59E0B" />
                          <ThemedText style={styles.coachLineWarnText}>Coach — Not Assigned</ThemedText>
                        </View>
                      )}
                      {/* Progress bar */}
                      {total > 0 && (
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: isFull ? COLOR_CAMP : TEAL }]} />
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={MUTED} style={{ alignSelf: 'center', marginRight: 4 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Ice Allocation */}
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/ice-management' as any)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="snow-outline" size={13} color={TEAL} />
              <ThemedText style={styles.sectionLabel}>ICE ALLOCATION</ThemedText>
            </View>
            <ThemedText style={styles.viewAll}>Manage ›</ThemedText>
          </TouchableOpacity>
          {(() => {
            if (unallocatedSlots.length === 0) {
              return (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={TEAL} />
                  <ThemedText style={styles.emptyText}>All ice slots allocated — next 30 days</ThemedText>
                </View>
              );
            }
            // Summary count card
            const grouped: Record<string, any[]> = {};
            for (const slot of unallocatedSlots) {
              const d = slot.slot_date;
              if (!grouped[d]) grouped[d] = [];
              grouped[d].push(slot);
            }
            return (
              <>
                {/* Summary banner */}
                <TouchableOpacity
                  onPress={() => router.push('/ice-management' as any)}
                  activeOpacity={0.85}
                  style={styles.iceAllocSummary}
                >
                  <LinearGradient
                    colors={['#2A1A0D', '#1A1510']}
                    style={styles.iceAllocSummaryGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={styles.iceAllocBadge}>
                        <ThemedText style={styles.iceAllocBadgeNum}>{unallocatedSlots.length}</ThemedText>
                      </View>
                      <View>
                        <ThemedText style={styles.iceAllocBadgeLabel}>
                          Unallocated Ice {unallocatedSlots.length === 1 ? 'Slot' : 'Slots'}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, color: MUTED }}>Next 30 days · Tap to manage</ThemedText>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={TEAL} />
                  </LinearGradient>
                </TouchableOpacity>
                {/* Day groups */}
                <View style={styles.listCard}>
                  {Object.entries(grouped).map(([date, slots], gi, arr) => {
                    const d = new Date(date + 'T12:00:00');
                    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
                    return (
                      <View key={date}>
                        <View style={styles.iceDayHeader}>
                          <ThemedText style={styles.iceDayLabel}>{dayLabel}</ThemedText>
                        </View>
                        {slots.map((slot, si) => {
                          const rinkName = (Array.isArray(slot.coach_locations) ? slot.coach_locations[0]?.name : slot.coach_locations?.name) ?? 'Unknown Location';
                          const fmtT = (t: string) => {
                            const [h, m] = t.split(':').map(Number);
                            const p = h >= 12 ? 'PM' : 'AM';
                            return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`;
                          };
                          const timeRange = `${fmtT(slot.start_time)} – ${fmtT(slot.end_time)}`;
                          const isLast = gi === arr.length - 1 && si === slots.length - 1;
                          return (
                            <View
                              key={slot.id}
                              style={[styles.iceSlotRow, !isLast && styles.listRowBorder]}
                            >
                              <View style={styles.iceSlotAccent} />
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <ThemedText style={styles.iceSlotTime}>{timeRange}</ThemedText>
                                <ThemedText style={styles.iceSlotRink}>{rinkName}</ThemedText>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </>
            );
          })()}

          {/* Upcoming Privates */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionLabel}>UPCOMING PRIVATES</ThemedText>
            <TouchableOpacity onPress={() => router.push('/camps' as any)}>
              <ThemedText style={styles.viewAll}>View all ›</ThemedText>
            </TouchableOpacity>
          </View>
          {privates.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="person-outline" size={24} color={MUTED} />
              <ThemedText style={styles.emptyText}>No upcoming privates</ThemedText>
            </View>
          ) : (
            <View style={styles.listCard}>
              {privates.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.listRow}
                  onPress={() => router.push(`/camp/${p.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.listAccent, { backgroundColor: COLOR_PRIVATE }]} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.listTitle}>{p.athlete_name ? `Private — ${p.athlete_name}` : (p.name ?? 'Private Session')}</ThemedText>
                    <ThemedText style={styles.listSub}>
                      {p.start_date ? new Date(p.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      {p.event_time ? ` · ${(() => { const [h,m] = p.event_time.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`; })()}` : ''}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={MUTED} style={{ alignSelf: 'center', marginRight: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* My Teams */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionLabel}>MY TEAMS</ThemedText>
            <TouchableOpacity onPress={() => router.push('/teams' as any)}>
              <ThemedText style={styles.viewAll}>View all ›</ThemedText>
            </TouchableOpacity>
          </View>
          {teams.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={24} color={MUTED} />
              <ThemedText style={styles.emptyText}>No teams yet</ThemedText>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/teams' as any)}>
                <ThemedText style={styles.emptyBtnText}>+ Add Team</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listCard}>
              {teams.map((team, i) => (
                <TouchableOpacity key={team.id}
                  style={[styles.listRow, i < teams.length - 1 && styles.listRowBorder]}
                  onPress={() => router.push(`/team/${team.id}` as any)}
                  activeOpacity={0.8}>
                  <View style={[styles.teamAvatar, { backgroundColor: team.color ?? TEAL }]}>
                    <ThemedText style={styles.teamAvatarText}>{teamInitials(team.name)}</ThemedText>
                  </View>
                  <View style={styles.listInfo}>
                    <ThemedText style={styles.listTitle}>{team.name}</ThemedText>
                    {team.age_group ? <ThemedText style={styles.listSub}>{team.age_group}</ThemedText> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          )}


        </ScrollView>
      </SafeAreaView>

      {/* ── Book a Private Modal ── */}
      <Modal visible={showPrivateModal} animationType="slide" transparent>
        <View style={styles.pvtOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPrivateModal(false)} activeOpacity={1} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.pvtSheet}>

              {/* Header */}
              <View style={styles.pvtHeader}>
                <View>
                  <ThemedText style={styles.pvtNewLabel}>NEW</ThemedText>
                  <ThemedText style={styles.pvtTitle}>Book a Private</ThemedText>
                </View>
                <TouchableOpacity onPress={() => setShowPrivateModal(false)}>
                  <Ionicons name="close" size={22} color={MUTED} />
                </TouchableOpacity>
              </View>

              {/* Athlete Name */}
              <ThemedText style={styles.pvtLabel}>ATHLETE NAME</ThemedText>
              <TextInput
                style={styles.pvtInput}
                placeholder="e.g. Connor M."
                placeholderTextColor={MUTED}
                value={pvtAthlete}
                onChangeText={setPvtAthlete}
              />

              {/* Date */}
              <ThemedText style={styles.pvtLabel}>DATE</ThemedText>
              <DatePicker value={pvtDate || null} onChange={v => setPvtDate(v)} />

              {/* Time */}
              <ThemedText style={styles.pvtLabel}>START TIME</ThemedText>
              <TimePicker value={pvtTime || null} onChange={v => setPvtTime(v ?? '')} />

              {/* Location */}
              <ThemedText style={styles.pvtLabel}>LOCATION (optional)</ThemedText>
              <TextInput
                style={styles.pvtInput}
                placeholder="Rink / address"
                placeholderTextColor={MUTED}
                value={pvtLoc}
                onChangeText={setPvtLoc}
              />

              {/* Price */}
              <ThemedText style={styles.pvtLabel}>PRICE PER SESSION ($)</ThemedText>
              <TextInput
                style={styles.pvtInput}
                placeholder="0"
                placeholderTextColor={MUTED}
                value={pvtPrice}
                onChangeText={setPvtPrice}
                keyboardType="decimal-pad"
              />

              {/* Buttons */}
              <View style={styles.pvtBtnRow}>
                <TouchableOpacity style={styles.pvtCancelBtn} onPress={() => setShowPrivateModal(false)}>
                  <ThemedText style={styles.pvtCancelText}>CANCEL</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pvtSaveBtn, pvtSaving && { opacity: 0.5 }]} onPress={savePrivate} disabled={pvtSaving} activeOpacity={0.85}>
                  <LinearGradient colors={[TEAL, '#3DFF8F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pvtSaveGrad}>
                    {pvtSaving
                      ? <ActivityIndicator color="#000" size="small" />
                      : <ThemedText style={styles.pvtSaveText}>BOOK SESSION</ThemedText>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 32 },

  // Founding Banner
  foundingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: TEAL,
  },
  foundingText: { flex: 1, fontSize: 13, color: TEXT, fontWeight: '500' },
  eliteBadge: { backgroundColor: TEAL, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  eliteBadgeText: { fontSize: 11, fontWeight: '800', color: '#000', textAlign: 'center', lineHeight: 14 },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  coachChip: { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL },
  coachChipText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  headerIcons: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayDate: { fontSize: 14, color: MUTED },
  bellBtn: { padding: 4 },

  greetingSection: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  greeting: { fontSize: 24, fontWeight: '800', color: TEXT },

  // Section labels
  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 8 },
  viewAll: { fontSize: 13, color: TEAL, fontWeight: '600' },

  // Today card
  todayCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: CARD, borderRadius: 16,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  todayAccent: { width: 4, backgroundColor: COLOR_SESSION },
  todayRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 14, gap: 12 },
  todayBody: { flex: 1, padding: 14 },
  todayTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  todayTime: { fontSize: 20, fontWeight: '800', color: TEXT },
  todayTimeLabel: { fontSize: 11, color: MUTED, lineHeight: 16 },
  todayInfo: { flex: 1 },
  todayTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  todayEmpty: { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 4 },
  todayEmptySub: { fontSize: 12, color: MUTED },
  todayRsvpRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  todayRsvpText: { fontSize: 12, color: MUTED, fontWeight: '500' },
  startSessionBtn: {
    borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingHorizontal: 14, paddingVertical: 10,
    alignSelf: 'center', minWidth: 100,
  },
  startSessionText: { fontSize: 13, fontWeight: '800', color: '#000' },

  // Empty state
  emptyCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: CARD, borderRadius: 16,
    padding: 24, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', gap: 8,
  },
  emptyText: { fontSize: 14, color: MUTED },
  emptyBtn: { marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: TEAL, paddingHorizontal: 16, paddingVertical: 8 },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: TEAL },

  // Book Private
  bookPrivateBtn: {
    marginHorizontal: 16, marginBottom: 20,
    borderRadius: 14, borderWidth: 1, borderColor: TEAL,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  bookPrivateBtnText: { fontSize: 15, fontWeight: '700', color: TEAL },

  // Media
  mediaRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  mediaCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, alignItems: 'center', gap: 6,
  },
  mediaIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  mediaTitle: { fontSize: 13, fontWeight: '800', color: TEXT },
  mediaSub: { fontSize: 11, color: MUTED, textAlign: 'center' },

  // Shared list card (teams + sessions)
  listCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  listAccent: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 12 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  listInfo: { flex: 1 },
  listTypeLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  listTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  listSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  coachLine:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  coachLineText: { fontSize: 11, color: MUTED, fontWeight: '500' },
  coachLineWarn:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  coachLineWarnText: { fontSize: 11, color: '#F59E0B', fontWeight: '700' },

  // Team avatar
  teamAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  teamAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },

  // Session dot
  sessionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR_SESSION, marginRight: 14 },
  campRow: { borderLeftWidth: 3, borderLeftColor: COLOR_CAMP },

  // Active camp card
  campCard: {
    flexDirection: 'row', backgroundColor: CARD,
    borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    marginHorizontal: 16,
  },
  campCardBar: { width: 4, backgroundColor: COLOR_CAMP },
  campCardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  campCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  campCardName: { fontSize: 15, fontWeight: '700', color: TEXT, flex: 1, marginRight: 8 },
  campCardDate: { fontSize: 12, color: MUTED },
  spotsBadge: {
    backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)',
  },
  spotsBadgeFull: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
  spotsText: { fontSize: 11, fontWeight: '700', color: TEAL },
  progressTrack: {
    height: 4, backgroundColor: BORDER, borderRadius: 2, marginTop: 6, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  // Bottom actions
  bottomActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, backgroundColor: CARD, borderRadius: 14,
    paddingVertical: 14, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    flexDirection: 'row',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: TEAL },

  // Book a Private modal
  pvtOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  pvtSheet: {
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: BORDER,
  },
  pvtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pvtNewLabel: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 2, marginBottom: 2 },
  pvtTitle: { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  pvtLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  pvtInput: {
    backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: TEXT,
  },
  pvtBtnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  pvtCancelBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
  },
  pvtCancelText: { fontSize: 13, fontWeight: '700', color: MUTED },
  pvtSaveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  pvtSaveGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  pvtSaveText: { fontSize: 14, fontWeight: '800', color: '#000' },

  // Ice Allocation widget
  iceAllocSummary: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#F59E0B',
  },
  iceAllocSummaryGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  iceAllocBadge: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
  },
  iceAllocBadgeNum: { fontSize: 20, fontWeight: '800', color: '#F59E0B', lineHeight: 24 },
  iceAllocBadgeLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  iceDayHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 3,
  },
  iceDayLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1.5, flex: 1 },
  iceDayBadge: {
    backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)',
  },
  iceDayBadgeText: { fontSize: 10, fontWeight: '700', color: TEAL },
  iceSlotRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6,
  },
  iceSlotAccent: {
    width: 3, height: 18, borderRadius: 2,
    backgroundColor: TEAL, marginRight: 10,
  },
  iceSlotTime: { fontSize: 13, fontWeight: '600', color: TEXT },
  iceSlotRink: { fontSize: 11, color: MUTED },
  iceUnallocTag: {
    backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)',
  },
  iceUnallocTagText: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 0.5 },
});
