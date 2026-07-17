import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

// ─── constants ─────────────────────────────────────────────────────────────

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const PURPLE = '#7C3AED';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

const SCREEN_W   = Dimensions.get('window').width;
const TIME_COL_W = 52;
const HOUR_H     = 60;
const GRID_HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM – 10 PM
const CAL_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const WEEK_LABELS  = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── types ─────────────────────────────────────────────────────────────────

type ViewMode   = 'list' | 'day' | 'week' | 'month';
type FilterType = 'all' | 'camp' | 'private' | 'session' | 'game';

type CalEvent = {
  id: string;
  type: 'camp' | 'private' | 'session' | 'game';
  title: string;
  date: string;        // 'YYYY-MM-DD'
  time: string | null; // 'HH:MM' or 'HH:MM:SS'
  location: string | null;
  duration: number;    // minutes
  team_id: string | null;
};

// Event type color system — matches index.tsx and the rest of the app
const TYPE_COLOR = { camp: ORANGE, private: RED, session: '#4F8EF7', game: PURPLE } as const;
const TYPE_BG    = { camp: 'rgba(245,158,11,0.12)', private: 'rgba(239,68,68,0.12)', session: 'rgba(79,142,247,0.12)', game: 'rgba(124,58,237,0.12)' } as const;
const TYPE_LABEL = { camp: 'CAMP', private: 'PRIVATE', session: 'SESSION', game: 'GAME' } as const;

// ─── helpers ───────────────────────────────────────────────────────────────

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr()               { return localDateStr(new Date()); }
function dateToStr(d: Date)       { return localDateStr(d); }
function strToDate(s: string)     { return new Date(s + 'T00:00:00'); }
// Normalize any date string Supabase returns (may be "YYYY-MM-DD" or full ISO timestamp) to "YYYY-MM-DD"
function normDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return String(d).substring(0, 10);
}

function fmtHour(h: number) {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function fmtTime(t: string | null) {
  if (!t) return null;
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (isNaN(h)) return t;
  return `${h % 12 || 12}:${String(isNaN(m) ? 0 : m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function getMonWeekStart(date: Date) {
  const d   = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function getWeekDays(start: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// ─── component ─────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const router = useRouter();

  const [viewMode, setViewMode]     = useState<ViewMode>('month');
  const [filter, setFilter]         = useState<FilterType>('all');
  const [events, setEvents]         = useState<CalEvent[]>([]);
  const [selectedDate, setSelDate]  = useState(todayStr);
  const [calMonth, setCalMonth]     = useState(() => new Date());
  const [previewEvent, setPreview]  = useState<CalEvent | null>(null);
  const [teams, setTeams]           = useState<{ id: string; name: string }[]>([]);
  const [selectedTeams, setSelTeams] = useState<Set<string>>(new Set());
  const [teamsOpen, setTeamsOpen]   = useState(false);

  const today = todayStr();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: campsData }, { data: sessData }, { data: gamesData }, { data: teamsData }] = await Promise.all([
      supabase
        .from('camps')
        .select('id, name, type, start_date, end_date, event_time, location, schedule_config')
        .eq('coach_id', user.id)
        .order('start_date', { ascending: true }),
      supabase
        .from('sessions')
        .select('id, title, date, time, total_duration_minutes, location, team_id')
        .eq('coach_id', user.id)
        .order('date', { ascending: true })
        .order('time', { ascending: true, nullsFirst: false }),
      supabase
        .from('games')
        .select('id, opponent, game_date, game_time, location, team_id')
        .eq('coach_id', user.id)
        .order('game_date', { ascending: true }),
      supabase
        .from('teams')
        .select('id, name')
        .eq('coach_id', user.id)
        .order('name', { ascending: true }),
    ]);
    setTeams(teamsData ?? []);

    // Expand each camp across all its dates
    const campEvents: CalEvent[] = [];
    for (const c of (campsData ?? [])) {
      if (!c.start_date) continue;
      const evType: CalEvent['type'] = c.type === 'private' ? 'private' : 'camp';
      const config = c.schedule_config as any;
      // Custom dates array (private sessions / custom camp schedules)
      if (config?.dates && Array.isArray(config.dates) && config.dates.length > 0) {
        for (const d of config.dates) {
          const nd = normDate(d);
          if (nd) campEvents.push({ id: c.id, type: evType, title: c.name ?? '(Unnamed)', date: nd, time: c.event_time ?? null, location: c.location ?? null, duration: 0, team_id: null });
        }
      } else {
        // Consecutive range: start_date → end_date (or just start_date)
        const startNorm = normDate(c.start_date);
        const endNorm   = normDate(c.end_date ?? c.start_date);
        if (startNorm) {
          const cursor = strToDate(startNorm);
          const end    = strToDate(endNorm ?? startNorm);
          while (cursor <= end) {
            campEvents.push({ id: c.id, type: evType, title: c.name ?? '(Unnamed)', date: localDateStr(cursor), time: c.event_time ?? null, location: c.location ?? null, duration: 0, team_id: null });
            cursor.setDate(cursor.getDate() + 1);
          }
        }
      }
    }

    const sessEvents: CalEvent[] = (sessData ?? [])
      .filter((s: any) => normDate(s.date))
      .map((s: any) => ({
        id:       s.id,
        type:     'session' as const,
        title:    s.title,
        date:     normDate(s.date)!,
        time:     s.time ?? null,
        location: s.location ?? null,
        duration: s.total_duration_minutes ?? 0,
        team_id:  s.team_id ?? null,
      }));

    const gameEvents: CalEvent[] = (gamesData ?? [])
      .filter((g: any) => normDate(g.game_date))
      .map((g: any) => ({
        id:       g.id,
        type:     'game' as const,
        title:    g.opponent ? `vs ${g.opponent}` : 'Game',
        date:     normDate(g.game_date)!,
        time:     g.game_time ?? null,
        location: g.location ?? null,
        duration: 0,
        team_id:  g.team_id ?? null,
      }));

    setEvents(
      [...campEvents, ...sessEvents, ...gameEvents].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (!a.time && !b.time) return 0;
        return (!a.time ? 1 : !b.time ? -1 : a.time.localeCompare(b.time));
      })
    );
  }

  // ── filtered + derived ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = filter === 'all' ? events : events.filter(e => e.type === filter);
    if (selectedTeams.size > 0) {
      // Events with no team_id (camps, privates) always show; team events filtered by selection
      result = result.filter(e => e.team_id == null || selectedTeams.has(e.team_id));
    }
    return result;
  }, [events, filter, selectedTeams]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    filtered.forEach(e => { const a = m.get(e.date) ?? []; a.push(e); m.set(e.date, a); });
    return m;
  }, [filtered]);

  const dotsByDate = useMemo(() => {
    const m = new Map<string, Set<CalEvent['type']>>();
    filtered.forEach(e => {
      const s = m.get(e.date) ?? new Set<CalEvent['type']>();
      s.add(e.type);
      m.set(e.date, s);
    });
    return m;
  }, [filtered]);

  // Month calendar grid — Mon-first, includes prev/next month padding
  const calGrid = useMemo(() => {
    const y  = calMonth.getFullYear();
    const mo = calMonth.getMonth();
    const firstDow    = (new Date(y, mo, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const prevDays    = new Date(y, mo, 0).getDate();

    type Cell = { day: number; isCurrentMonth: boolean; dateStr: string };
    const cells: Cell[] = [];

    for (let i = firstDow - 1; i >= 0; i--) {
      const d  = prevDays - i;
      const pm = mo === 0 ? 12 : mo;
      const py = mo === 0 ? y - 1 : y;
      cells.push({ day: d, isCurrentMonth: false, dateStr: `${py}-${String(pm).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true, dateStr: `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
    }
    const rem = (7 - cells.length % 7) % 7;
    const nm  = mo === 11 ? 1 : mo + 2;
    const ny  = mo === 11 ? y + 1 : y;
    for (let d = 1; d <= rem; d++) {
      cells.push({ day: d, isCurrentMonth: false, dateStr: `${ny}-${String(nm).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
    }
    return cells;
  }, [calMonth]);

  const weekStart = useMemo(() => getMonWeekStart(strToDate(selectedDate)), [selectedDate]);
  const weekDays  = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const dayEvents = useMemo(() => byDate.get(selectedDate) ?? [], [byDate, selectedDate]);

  // Columns for 7-day week grid (fit all 7 on screen)
  const DAY_COL_W = Math.floor((SCREEN_W - 32 - TIME_COL_W) / 7);

  // ── navigation helper ───────────────────────────────────────────────────

  function navToEvent(e: CalEvent) {
    if (e.type === 'session') router.push(`/session/${e.id}` as any);
    else if (e.type === 'game') router.push(`/game/${e.id}` as any);
    else router.push(`/camp/${e.id}` as any); // camp + private
  }

  // ── event card (list view) ──────────────────────────────────────────────

  function EventCard({ e, showDate = false }: { e: CalEvent; showDate?: boolean }) {
    const color = TYPE_COLOR[e.type];
    const meta  = [fmtTime(e.time), e.location, e.duration > 0 ? `${e.duration} min` : null].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity
        style={[s.eventCard, { borderLeftColor: color }]}
        onPress={() => setPreview(e)}
        activeOpacity={0.8}
      >
        {showDate && (
          <ThemedText style={[s.eventCardDate, { color: MUTED }]}>
            {strToDate(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </ThemedText>
        )}
        <ThemedText style={[s.eventCardType, { color }]}>{TYPE_LABEL[e.type]}</ThemedText>
        <ThemedText style={s.eventCardTitle}>{e.title}</ThemedText>
        {!!meta && <ThemedText style={s.eventCardMeta}>{meta}</ThemedText>}
      </TouchableOpacity>
    );
  }

  // ── time grid (shared day/week) ─────────────────────────────────────────

  function TimeGridSlot({ h, eventsInSlot }: { h: number; eventsInSlot: CalEvent[] }) {
    return (
      <View style={s.timeRow}>
        <View style={s.timeLabel}>
          <ThemedText style={s.timeLabelText}>{fmtHour(h)}</ThemedText>
        </View>
        <View style={[s.timeSlot, { borderBottomColor: BORDER, borderBottomWidth: 1 }]}>
          {eventsInSlot.map(e => (
            <TouchableOpacity
              key={e.id}
              style={[s.timeBlock, { backgroundColor: TYPE_BG[e.type], borderLeftColor: TYPE_COLOR[e.type] }]}
              onPress={() => setPreview(e)}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.timeBlockTitle, { color: TYPE_COLOR[e.type] }]} numberOfLines={2}>{e.title}</ThemedText>
              {e.time && <ThemedText style={s.timeBlockMeta}>{fmtTime(e.time)}</ThemedText>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={s.title}>Events</ThemedText>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/events' as any)}>
            <Ionicons name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* View mode tabs */}
        <View style={s.modeTabs}>
          {(['list','day','week','month'] as ViewMode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[s.modeTab, viewMode === m && s.modeTabActive]}
              onPress={() => setViewMode(m)}
            >
              <ThemedText style={[s.modeTabText, viewMode === m && s.modeTabTextActive]}>
                {m.toUpperCase()}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter chips */}
        <View style={s.filterRow}>
          {([
            { key: 'all',     label: 'All',      dot: null,       star: true  },
            { key: 'camp',    label: 'Camp',     dot: ORANGE,     star: false },
            { key: 'private', label: 'Privates', dot: RED,        star: false },
            { key: 'session', label: 'Sessions', dot: '#4F8EF7',  star: false },
            { key: 'game',    label: 'Games',    dot: PURPLE,     star: false },
          ] as const).map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => setFilter(f.key as FilterType)}
              >
                {f.dot  && <View style={[s.filterDot, { backgroundColor: f.dot }]} />}
                {f.star && <Ionicons name="star" size={12} color="#F59E0B" />}
                <ThemedText style={[s.filterChipText, active && s.filterChipTextActive]}>{f.label}</ThemedText>
              </TouchableOpacity>
            );
          })}

          {/* Teams filter chip */}
          <TouchableOpacity
            style={[s.filterChip, selectedTeams.size > 0 && s.filterChipActive]}
            onPress={() => setTeamsOpen(true)}
          >
            <Ionicons name="people-outline" size={12} color={selectedTeams.size > 0 ? TEAL : MUTED} />
            <ThemedText style={[s.filterChipText, selectedTeams.size > 0 && s.filterChipTextActive]}>
              {selectedTeams.size === 0 ? 'Teams' : `${selectedTeams.size} Team${selectedTeams.size > 1 ? 's' : ''}`}
            </ThemedText>
            <Ionicons name="chevron-down" size={12} color={selectedTeams.size > 0 ? TEAL : MUTED} />
          </TouchableOpacity>
        </View>

        {/* ══ LIST VIEW ══ */}
        {viewMode === 'list' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="calendar-outline" size={48} color={MUTED} />
                <ThemedText style={s.emptyTitle}>No events</ThemedText>
                <ThemedText style={s.emptySub}>Tap + to add a camp, private, or session</ThemedText>
              </View>
            ) : (() => {
              const upcoming = filtered.filter(e => e.date >= today);
              const past     = filtered.filter(e => e.date < today).reverse();
              const grouped  = new Map<string, CalEvent[]>();
              upcoming.forEach(e => { const a = grouped.get(e.date) ?? []; a.push(e); grouped.set(e.date, a); });
              return (
                <View>
                  {[...grouped.entries()].map(([ds, list]) => (
                    <View key={ds}>
                      <ThemedText style={s.listDateHeader}>
                        {strToDate(ds).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
                      </ThemedText>
                      {list.map(e => <EventCard key={e.id} e={e} />)}
                    </View>
                  ))}
                  {past.length > 0 && (
                    <>
                      <ThemedText style={[s.listDateHeader, { color: MUTED, marginTop: 20 }]}>PAST</ThemedText>
                      {past.map(e => <EventCard key={e.id} e={e} showDate />)}
                    </>
                  )}
                </View>
              );
            })()}
          </ScrollView>
        )}

        {/* ══ DAY VIEW ══ */}
        {viewMode === 'day' && (
          <View style={s.flex1}>
            {/* Day navigator */}
            <View style={s.navRow}>
              <TouchableOpacity style={s.navBtn} onPress={() => {
                const d = strToDate(selectedDate); d.setDate(d.getDate() - 1); setSelDate(dateToStr(d));
              }}>
                <Ionicons name="chevron-back" size={20} color={TEXT} />
              </TouchableOpacity>
              <ThemedText style={s.navTitle}>
                {strToDate(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </ThemedText>
              <TouchableOpacity style={s.navBtn} onPress={() => {
                const d = strToDate(selectedDate); d.setDate(d.getDate() + 1); setSelDate(dateToStr(d));
              }}>
                <Ionicons name="chevron-forward" size={20} color={TEXT} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {GRID_HOURS.map(h => {
                const inSlot   = dayEvents.filter(e => e.time && parseInt(e.time.split(':')[0]) === h);
                const allDay   = h === GRID_HOURS[0] ? dayEvents.filter(e => !e.time) : [];
                return <TimeGridSlot key={h} h={h} eventsInSlot={[...allDay, ...inSlot]} />;
              })}
            </ScrollView>
          </View>
        )}

        {/* ══ WEEK VIEW ══ */}
        {viewMode === 'week' && (
          <View style={s.flex1}>
            {/* Week navigator */}
            <View style={s.navRow}>
              <TouchableOpacity style={s.navBtn} onPress={() => {
                const d = new Date(weekStart); d.setDate(d.getDate() - 7); setSelDate(dateToStr(d));
              }}>
                <Ionicons name="chevron-back" size={20} color={TEXT} />
              </TouchableOpacity>
              <ThemedText style={s.navTitle}>
                {`${MONTH_SHORT[weekDays[0].getMonth()].toUpperCase()} ${weekDays[0].getDate()} — ${MONTH_SHORT[weekDays[6].getMonth()].toUpperCase()} ${weekDays[6].getDate()}`}
              </ThemedText>
              <TouchableOpacity style={s.navBtn} onPress={() => {
                const d = new Date(weekStart); d.setDate(d.getDate() + 7); setSelDate(dateToStr(d));
              }}>
                <Ionicons name="chevron-forward" size={20} color={TEXT} />
              </TouchableOpacity>
            </View>

            {/* Day-of-week header row */}
            <View style={s.weekDayHeaderRow}>
              <View style={{ width: TIME_COL_W }} />
              {weekDays.map((day, i) => {
                const ds      = dateToStr(day);
                const isToday = ds === today;
                return (
                  <View key={ds} style={[s.weekDayHeader, { width: DAY_COL_W }]}>
                    <ThemedText style={[s.weekDayLabel, isToday && { color: TEAL }]}>
                      {WEEK_LABELS[i]}
                    </ThemedText>
                    <View style={[s.weekDayNum, isToday && s.weekDayNumToday]}>
                      <ThemedText style={[s.weekDayNumText, isToday && { color: '#000' }]}>
                        {day.getDate()}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Time grid */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {GRID_HOURS.map(h => (
                <View key={h} style={[s.weekTimeRow, { borderBottomColor: BORDER, borderBottomWidth: 1 }]}>
                  <View style={[s.timeLabel, { width: TIME_COL_W, height: HOUR_H }]}>
                    <ThemedText style={s.timeLabelText}>{fmtHour(h)}</ThemedText>
                  </View>
                  {weekDays.map(day => {
                    const ds       = dateToStr(day);
                    const inSlot   = (byDate.get(ds) ?? []).filter(e => e.time && parseInt(e.time.split(':')[0]) === h);
                    const isToday  = ds === today;
                    return (
                      <View key={ds} style={[s.weekTimeCell, { width: DAY_COL_W, height: HOUR_H, borderLeftWidth: 1, borderLeftColor: isToday ? 'rgba(0,196,180,0.2)' : BORDER }]}>
                        {inSlot.map(e => (
                          <TouchableOpacity
                            key={e.id}
                            style={[s.weekEvent, { backgroundColor: TYPE_BG[e.type], borderLeftColor: TYPE_COLOR[e.type] }]}
                            onPress={() => setPreview(e)}
                            activeOpacity={0.8}
                          >
                            <ThemedText style={[s.weekEventText, { color: TYPE_COLOR[e.type] }]} numberOfLines={2}>{e.title}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ══ MONTH VIEW ══ */}
        {viewMode === 'month' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
            {/* Month navigator */}
            <View style={s.monthNavRow}>
              <TouchableOpacity style={s.navBtn} onPress={() => { setCalMonth(p => { const d = new Date(p); d.setMonth(d.getMonth()-1); return d; }); setSelDate(''); }}>
                <Ionicons name="chevron-back" size={20} color={TEXT} />
              </TouchableOpacity>
              <ThemedText style={s.monthNavTitle}>
                {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
              </ThemedText>
              <TouchableOpacity style={s.navBtn} onPress={() => { setCalMonth(p => { const d = new Date(p); d.setMonth(d.getMonth()+1); return d; }); setSelDate(''); }}>
                <Ionicons name="chevron-forward" size={20} color={TEXT} />
              </TouchableOpacity>
            </View>

            {/* Day header row */}
            <View style={s.calDayHeaderRow}>
              {CAL_HEADERS.map(d => (
                <View key={d} style={s.calDayHeaderCell}>
                  <ThemedText style={s.calDayHeaderText}>{d}</ThemedText>
                </View>
              ))}
            </View>

            {/* Calendar grid — card-style cells */}
            <View style={s.calGrid}>
              {calGrid.map((cell, idx) => {
                const ds      = cell.dateStr;
                const isToday = ds === today;
                const isSel   = ds === selectedDate;
                const dots    = dotsByDate.get(ds);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[s.calCell, !cell.isCurrentMonth && s.calCellFaded]}
                    onPress={() => setSelDate(isSel ? '' : ds)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.calNumWrap, isToday && s.calNumToday, isSel && s.calNumSel]}>
                      <ThemedText style={[s.calNumText, !cell.isCurrentMonth && { color: MUTED }, isToday && { color: '#000' }, isSel && { color: '#000' }]}>
                        {cell.day}
                      </ThemedText>
                    </View>
                    {dots && (
                      <View style={s.calDots}>
                        {[...dots].map(t => (
                          <View key={t} style={[s.calDot, { backgroundColor: isSel ? '#fff' : TYPE_COLOR[t] }]} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Events for selected date */}
            {selectedDate && (byDate.get(selectedDate)?.length ?? 0) > 0 && (
              <View style={s.selectedDateEvents}>
                <ThemedText style={s.listDateHeader}>
                  {strToDate(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
                </ThemedText>
                {(byDate.get(selectedDate) ?? []).map(e => <EventCard key={e.id} e={e} />)}
              </View>
            )}
          </ScrollView>
        )}

      </SafeAreaView>

      {/* ── Teams Selector Sheet ─────────────────────────────────────── */}
      <Modal
        visible={teamsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTeamsOpen(false)}
      >
        <TouchableOpacity style={s.previewOverlay} activeOpacity={1} onPress={() => setTeamsOpen(false)}>
          <TouchableOpacity style={s.previewSheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.previewHandle} />
            <ThemedText style={s.teamsTitle}>Filter by Team</ThemedText>

            {/* All Teams row */}
            <TouchableOpacity style={s.teamRow} onPress={() => setSelTeams(new Set())}>
              <ThemedText style={[s.teamRowText, selectedTeams.size === 0 && { color: TEAL }]}>All Teams</ThemedText>
              {selectedTeams.size === 0 && <Ionicons name="checkmark" size={18} color={TEAL} />}
            </TouchableOpacity>

            {/* Individual teams */}
            {teams.map(t => {
              const sel = selectedTeams.has(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={s.teamRow}
                  onPress={() => setSelTeams(prev => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                    return next;
                  })}
                >
                  <ThemedText style={[s.teamRowText, sel && { color: TEAL }]}>{t.name}</ThemedText>
                  {sel && <Ionicons name="checkmark" size={18} color={TEAL} />}
                </TouchableOpacity>
              );
            })}

            {teams.length === 0 && (
              <ThemedText style={s.teamRowEmpty}>No teams yet — add one from the Teams tab.</ThemedText>
            )}

            <TouchableOpacity
              style={[s.previewCta, { backgroundColor: TEAL, marginTop: 16 }]}
              onPress={() => setTeamsOpen(false)}
              activeOpacity={0.85}
            >
              <ThemedText style={s.previewCtaText}>
                {selectedTeams.size === 0 ? 'Show All Teams' : `Show ${selectedTeams.size} Team${selectedTeams.size > 1 ? 's' : ''}`}
              </ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Event Preview Sheet ──────────────────────────────────────── */}
      <Modal
        visible={!!previewEvent}
        transparent
        animationType="slide"
        onRequestClose={() => setPreview(null)}
      >
        <TouchableOpacity style={s.previewOverlay} activeOpacity={1} onPress={() => setPreview(null)}>
          <TouchableOpacity style={s.previewSheet} activeOpacity={1} onPress={() => {}}>
            {/* drag handle */}
            <View style={s.previewHandle} />

            {previewEvent && (() => {
              const color = TYPE_COLOR[previewEvent.type];
              const label = TYPE_LABEL[previewEvent.type];
              const dateLabel = strToDate(previewEvent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
              const timeLabel = fmtTime(previewEvent.time);
              const ctaLabel =
                previewEvent.type === 'game'    ? 'View Game Detail' :
                previewEvent.type === 'session' ? 'View Session Detail' :
                previewEvent.type === 'private' ? 'View Private Detail' :
                'View Camp Detail';
              return (
                <>
                  {/* type badge */}
                  <View style={[s.previewBadge, { backgroundColor: TYPE_BG[previewEvent.type] }]}>
                    <ThemedText style={[s.previewBadgeText, { color }]}>{label}</ThemedText>
                  </View>

                  <ThemedText style={s.previewTitle}>{previewEvent.title}</ThemedText>

                  <View style={s.previewMetaRow}>
                    <Ionicons name="calendar-outline" size={15} color={MUTED} />
                    <ThemedText style={s.previewMetaText}>{dateLabel}</ThemedText>
                  </View>
                  {timeLabel && (
                    <View style={s.previewMetaRow}>
                      <Ionicons name="time-outline" size={15} color={MUTED} />
                      <ThemedText style={s.previewMetaText}>{timeLabel}</ThemedText>
                    </View>
                  )}
                  {previewEvent.location && (
                    <View style={s.previewMetaRow}>
                      <Ionicons name="location-outline" size={15} color={MUTED} />
                      <ThemedText style={s.previewMetaText}>{previewEvent.location}</ThemedText>
                    </View>
                  )}
                  {previewEvent.duration > 0 && (
                    <View style={s.previewMetaRow}>
                      <Ionicons name="stopwatch-outline" size={15} color={MUTED} />
                      <ThemedText style={s.previewMetaText}>{previewEvent.duration} min</ThemedText>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[s.previewCta, { backgroundColor: color }]}
                    onPress={() => { setPreview(null); navToEvent(previewEvent); }}
                    activeOpacity={0.85}
                  >
                    <ThemedText style={s.previewCtaText}>{ctaLabel}</ThemedText>
                    <Ionicons name="arrow-forward" size={16} color="#000" />
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─── styles ────────────────────────────────────────────────────────────────

const CELL_W = (SCREEN_W - 32) / 7;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  flex1: { flex: 1 },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  title: { flex: 1, fontSize: 32, fontWeight: '800', color: TEXT, lineHeight: 40 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
  },

  // mode tabs
  modeTabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: CARD, borderRadius: 30, padding: 4,
  },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 26, alignItems: 'center' },
  modeTabActive: { backgroundColor: TEAL },
  modeTabText: { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  modeTabTextActive: { color: '#000' },

  // filter chips
  filterRow: {
    paddingHorizontal: 16, gap: 8, flexDirection: 'row',
    flexWrap: 'wrap', alignItems: 'center', marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  filterChipActive: { borderColor: TEAL },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterChipText: { fontSize: 13, fontWeight: '600', color: MUTED },
  filterChipTextActive: { color: TEAL },

  // list view
  listContent: { paddingBottom: 48 },
  listDateHeader: {
    fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },
  eventCard: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    borderLeftWidth: 4, padding: 14,
  },
  eventCardDate: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  eventCardType: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  eventCardTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 4 },
  eventCardMeta: { fontSize: 12, color: MUTED },

  // nav row
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { fontSize: 15, fontWeight: '700', color: TEXT, textAlign: 'center', flex: 1 },

  // day / time grid
  timeRow: { flexDirection: 'row', minHeight: HOUR_H },
  timeLabel: {
    width: TIME_COL_W, alignItems: 'flex-end', paddingRight: 8, paddingTop: 4,
  },
  timeLabelText: { fontSize: 11, color: MUTED, fontWeight: '500' },
  timeSlot: { flex: 1, paddingHorizontal: 8, paddingVertical: 4 },
  timeBlock: {
    borderRadius: 6, borderLeftWidth: 3, padding: 6, marginBottom: 4,
  },
  timeBlockTitle: { fontSize: 12, fontWeight: '700' },
  timeBlockMeta: { fontSize: 10, color: MUTED, marginTop: 2 },

  // week view
  weekDayHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  weekDayHeader: { alignItems: 'center', gap: 4 },
  weekDayLabel: { fontSize: 10, fontWeight: '600', color: MUTED },
  weekDayNum: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  weekDayNumToday: { backgroundColor: TEAL },
  weekDayNumText: { fontSize: 12, fontWeight: '700', color: TEXT },

  weekTimeRow: { flexDirection: 'row', paddingHorizontal: 16 },
  weekTimeCell: { overflow: 'hidden', paddingTop: 2 },
  weekEvent: {
    borderRadius: 4, borderLeftWidth: 2, paddingHorizontal: 3, paddingVertical: 2, marginBottom: 2,
  },
  weekEventText: { fontSize: 9, fontWeight: '700', lineHeight: 12 },

  // month view
  monthNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  monthNavTitle: { fontSize: 20, fontWeight: '700', color: TEXT },

  calDayHeaderRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  calDayHeaderCell: { width: CELL_W, alignItems: 'center' },
  calDayHeaderText: { fontSize: 11, fontWeight: '600', color: MUTED },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 3 },
  calCell: {
    width: CELL_W - 3, aspectRatio: 0.85,
    backgroundColor: CARD, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  calCellFaded: { backgroundColor: BG, borderColor: 'transparent' },
  calNumWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  calNumToday: { backgroundColor: TEAL },
  calNumSel: { backgroundColor: TEAL },
  calNumText: { fontSize: 14, fontWeight: '600', color: TEXT },
  calDots: { flexDirection: 'row', gap: 3 },
  calDot: { width: 5, height: 5, borderRadius: 3 },

  selectedDateEvents: { marginTop: 8 },

  // empty
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },

  // event preview sheet
  previewOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48,
    borderTopWidth: 1, borderColor: BORDER,
    gap: 12,
  },
  previewHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: BORDER, alignSelf: 'center', marginBottom: 8,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  previewBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  previewTitle: { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewMetaText: { fontSize: 14, color: MUTED, flex: 1 },
  previewCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  previewCtaText: { fontSize: 16, fontWeight: '800', color: '#000' },

  // teams modal
  teamsTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 4 },
  teamRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  teamRowText: { fontSize: 15, fontWeight: '600', color: TEXT },
  teamRowEmpty: { fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 20 },
});
