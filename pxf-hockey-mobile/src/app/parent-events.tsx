import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ParentTabBar } from '@/components/parent-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const RED    = '#EF4444';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type RsvpStatus = 'yes' | 'no' | 'maybe' | 'none';

type Event = {
  id: string;
  title: string;
  teamName: string;
  date: string;
  time: string | null;
  type: 'PRACTICE' | 'GAME';
  location: string | null;
};

function fmtDate(dateStr: string, time: string | null): string {
  const d       = new Date(dateStr + 'T12:00:00');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month   = d.toLocaleDateString('en-US', { month: 'short' });
  const day     = d.getDate();
  const timePart = time ? ` · ${time.slice(0, 5)}` : '';
  return `${weekday}, ${month} ${day}${timePart}`;
}

const RSVP_CONFIG: Record<Exclude<RsvpStatus, 'none'>, { label: string; color: string; bg: string; icon: string }> = {
  yes:   { label: 'Going',   color: TEAL,   bg: 'rgba(0,196,180,0.15)',  icon: 'checkmark-circle' },
  maybe: { label: 'Maybe',   color: ORANGE, bg: 'rgba(245,158,11,0.15)', icon: 'help-circle' },
  no:    { label: "Can't Go",color: RED,    bg: 'rgba(239,68,68,0.15)',  icon: 'close-circle' },
};

function EventCard({
  event, rsvp, saving, onRsvp,
}: {
  event: Event;
  rsvp: RsvpStatus;
  saving: boolean;
  onRsvp: (s: Exclude<RsvpStatus, 'none'>) => void;
}) {
  const isGame = event.type === 'GAME';
  const iconColor = isGame ? ORANGE : TEAL;
  const iconBg    = isGame ? 'rgba(245,158,11,0.12)' : 'rgba(0,196,180,0.12)';
  const iconName  = isGame ? 'trophy-outline' : 'fitness-outline';

  return (
    <View style={s.eventCard}>
      {/* Card header row */}
      <View style={s.eventRow}>
        <View style={[s.eventIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName as any} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <ThemedText style={s.eventTitle}>{event.title}</ThemedText>
          <ThemedText style={s.eventTeam}>{event.teamName}</ThemedText>
          <View style={s.eventMeta}>
            <Ionicons name="calendar-outline" size={12} color={MUTED} style={{ marginRight: 4 }} />
            <ThemedText style={s.eventMetaText}>{fmtDate(event.date, event.time)}</ThemedText>
          </View>
          {event.location != null && (
            <View style={[s.eventMeta, { marginTop: 2 }]}>
              <Ionicons name="location-outline" size={12} color={MUTED} style={{ marginRight: 4 }} />
              <ThemedText style={s.eventMetaText}>{event.location}</ThemedText>
            </View>
          )}
        </View>
        <View style={[s.typeBadge, { backgroundColor: isGame ? 'rgba(245,158,11,0.1)' : 'rgba(0,196,180,0.08)' }]}>
          <ThemedText style={[s.typeText, { color: iconColor }]}>{event.type}</ThemedText>
        </View>
      </View>

      {/* RSVP divider + buttons — practices only */}
      {!isGame && (
      <View style={s.rsvpDivider} />
      )}
      {!isGame && <View style={s.rsvpRow}>
        <ThemedText style={s.rsvpLabel}>Will your athlete attend?</ThemedText>
        {saving ? (
          <ActivityIndicator size="small" color={TEAL} />
        ) : (
          <View style={s.rsvpBtns}>
            {(['yes', 'maybe', 'no'] as Exclude<RsvpStatus, 'none'>[]).map(st => {
              const cfg      = RSVP_CONFIG[st];
              const isActive = rsvp === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[s.rsvpBtn, isActive && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                  onPress={() => onRsvp(st)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={cfg.icon as any} size={15} color={isActive ? cfg.color : MUTED} />
                  <ThemedText style={[s.rsvpBtnText, { color: isActive ? cfg.color : MUTED }]}>
                    {cfg.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>}
    </View>
  );
}

export default function ParentEventsScreen() {
  const [events,       setEvents]       = useState<Event[]>([]);
  const [rsvps,        setRsvps]        = useState<Record<string, RsvpStatus>>({});
  const [saving,       setSaving]       = useState<Record<string, boolean>>({});
  const [loading,      setLoading]      = useState(true);
  const [playerId,     setPlayerId]     = useState<string | null>(null);
  const [userId,       setUserId]       = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('P');

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Load profile initials
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        setUserInitials(parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : parts[0][0].toUpperCase());
      }

      // Load player(s) linked to this parent
      const { data: players } = await supabase
        .from('players')
        .select('id, team_id, teams(id, name, coach_id)')
        .eq('parent_email', user.email)
        .limit(3);

      if (!players || players.length === 0) { setLoading(false); return; }

      // Use first player for RSVP (single-child support; multi-child: would show per-child tabs)
      const firstPlayer = players[0];
      setPlayerId(firstPlayer.id);

      // Build coach → teamName map
      const coachTeamMap: Record<string, string> = {};
      for (const p of players) {
        const t: any = Array.isArray(p.teams) ? p.teams[0] : p.teams;
        if (t?.coach_id) coachTeamMap[t.coach_id] = t.name ?? 'Team';
      }
      const coachIds = Object.keys(coachTeamMap);
      if (coachIds.length === 0) { setLoading(false); return; }

      // Load upcoming sessions + games in parallel
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: sessions }, { data: games }] = await Promise.all([
        supabase
          .from('sessions')
          .select('id, title, date, time, location, coach_id')
          .in('coach_id', coachIds)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(30),
        supabase
          .from('games')
          .select('id, coach_id, opponent, game_date, game_time, location')
          .in('coach_id', coachIds)
          .gte('game_date', today)
          .order('game_date', { ascending: true })
          .limit(30),
      ]);

      const sessionEvents: Event[] = (sessions ?? []).map((s: any) => ({
        id:       s.id,
        title:    s.title,
        teamName: coachTeamMap[s.coach_id] ?? 'Team',
        date:     s.date,
        time:     s.time ?? null,
        location: s.location ?? null,
        type:     'PRACTICE' as const,
      }));

      const gameEvents: Event[] = (games ?? []).map((g: any) => ({
        id:       g.id,
        title:    `vs. ${g.opponent ?? 'TBD'}`,
        teamName: coachTeamMap[g.coach_id] ?? 'Team',
        date:     g.game_date,
        time:     g.game_time ?? null,
        location: g.location ?? null,
        type:     'GAME' as const,
      }));

      const loadedEvents: Event[] = [...sessionEvents, ...gameEvents].sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
      });
      setEvents(loadedEvents);

      // Load existing RSVPs for practices only
      if (sessionEvents.length > 0) {
        const sessionIds = sessionEvents.map(e => e.id);
        const { data: rsvpRows } = await supabase
          .from('event_rsvps')
          .select('session_id, status')
          .in('session_id', sessionIds)
          .eq('parent_user_id', user.id);

        const rsvpMap: Record<string, RsvpStatus> = {};
        (rsvpRows ?? []).forEach((r: { session_id: string; status: string }) => {
          rsvpMap[r.session_id] = r.status as RsvpStatus;
        });
        setRsvps(rsvpMap);
      }

      setLoading(false);
    })();
  }, []);

  async function handleRsvp(eventId: string, status: Exclude<RsvpStatus, 'none'>) {
    if (!userId || !playerId) return;

    // Optimistic update
    setRsvps(prev => ({ ...prev, [eventId]: status }));
    setSaving(prev => ({ ...prev, [eventId]: true }));

    // Upsert using the unique constraint (session_id, player_id)
    const { data: existing } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('session_id', eventId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from('event_rsvps')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('event_rsvps').insert({
        session_id:     eventId,
        player_id:      playerId,
        parent_user_id: userId,
        status,
        responded_at:   new Date().toISOString(),
      });
    }

    setSaving(prev => ({ ...prev, [eventId]: false }));
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <ThemedText style={s.logoPXF}>PXF</ThemedText>
            <ThemedText style={s.logoHockey}>HOCKEY</ThemedText>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerIcon}>
              <Ionicons name="notifications-outline" size={22} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={s.profileAvatar}>
              <ThemedText style={s.profileAvatarText}>{userInitials}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <ThemedText style={s.title}>Events</ThemedText>
          <ThemedText style={s.subtitle}>Everything your athlete is enrolled in</ThemedText>

          <ThemedText style={s.sectionLabel}>UPCOMING</ThemedText>

          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
          ) : events.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="calendar-outline" size={36} color={MUTED} />
              <ThemedText style={s.emptyText}>No upcoming events</ThemedText>
              <ThemedText style={s.emptyNote}>Events will appear once your coach schedules sessions</ThemedText>
            </View>
          ) : events.map(e => (
            <EventCard
              key={e.id}
              event={e}
              rsvp={rsvps[e.id] ?? 'none'}
              saving={saving[e.id] ?? false}
              onRsvp={(status) => void handleRsvp(e.id, status)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
      <ParentTabBar active="events" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoRow:           { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  logoPXF:           { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  logoHockey:        { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 3 },
  headerRight:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon:        { padding: 4 },
  profileAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },

  content:      { paddingHorizontal: 16, paddingBottom: 32 },
  title:        { fontSize: 28, fontWeight: '800', lineHeight: 34, color: TEXT, marginTop: 4, marginBottom: 4 },
  subtitle:     { fontSize: 14, color: MUTED, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 12 },

  eventCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 12, overflow: 'hidden' },
  eventRow:  { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  eventIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  eventTitle:    { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  eventTeam:     { fontSize: 13, color: MUTED, marginBottom: 6 },
  eventMeta:     { flexDirection: 'row', alignItems: 'center' },
  eventMetaText: { fontSize: 12, color: MUTED },
  typeBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  typeText:      { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  rsvpDivider: { height: 1, backgroundColor: BORDER },
  rsvpRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rsvpLabel:   { fontSize: 12, color: MUTED, fontWeight: '600', flexShrink: 1 },
  rsvpBtns:    { flexDirection: 'row', gap: 6 },
  rsvpBtn:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  rsvpBtnText: { fontSize: 12, fontWeight: '700' },

  emptyCard: { marginTop: 32, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: MUTED, textAlign: 'center' },
  emptyNote: { fontSize: 13, color: MUTED, opacity: 0.6, textAlign: 'center', paddingHorizontal: 24 },
});
