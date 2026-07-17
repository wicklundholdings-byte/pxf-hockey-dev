import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const VIOLET = '#A78BFA';
const BLUE   = '#38BDF8';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type AppRole = 'admin' | 'manager' | 'instructor' | 'front_desk';

interface StaffContext {
  staffMemberId: string;
  ownerId: string;
  ownerName: string;
  orgName: string | null;
  appRole: AppRole;
  staffName: string;
}

interface Assignment {
  id: string;
  entity_type: 'camp' | 'session' | 'camp_day_activity';
  entity_id: string;
  title: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
}

type TabKey = 'home' | 'schedule' | 'inbox';

const APP_ROLE_COLOR: Record<AppRole, string> = {
  admin:      ORANGE,
  manager:    GREEN,
  instructor: BLUE,
  front_desk: VIOLET,
};

const APP_ROLE_LABEL: Record<AppRole, string> = {
  admin:      'Admin',
  manager:    'Manager',
  instructor: 'Instructor',
  front_desk: 'Front Desk',
};

function fmt12h(t: string | null | undefined): string {
  if (!t) return '';
  const parts = t.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr.startsWith(today);
}

function isFuture(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr > today;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getEntityColor(type: string): string {
  switch (type) {
    case 'camp':    return ORANGE;
    case 'session': return BLUE;
    default:        return TEAL;
  }
}

function getEntityLabel(type: string): string {
  switch (type) {
    case 'camp':             return 'Camp';
    case 'session':          return 'Session';
    case 'camp_day_activity':return 'Activity';
    default:                 return type;
  }
}

export default function StaffHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [ctx, setCtx]                     = useState<StaffContext | null>(null);
  const [assignments, setAssignments]     = useState<Assignment[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState<TabKey>('home');

  // ── Load staff context + assignments ─────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // 1. Get staff context from profiles → staff_members → owner profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('staff_member_id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.staff_member_id) { setLoading(false); return; }

    const { data: sm } = await supabase
      .from('staff_members')
      .select('id, owner_id, app_role, name')
      .eq('id', profile.staff_member_id)
      .maybeSingle();

    if (!sm) { setLoading(false); return; }

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, org_name')
      .eq('id', sm.owner_id)
      .maybeSingle();

    setCtx({
      staffMemberId: sm.id,
      ownerId:       sm.owner_id,
      ownerName:     ownerProfile?.full_name ?? 'Coach',
      orgName:       ownerProfile?.org_name ?? null,
      appRole:       sm.app_role as AppRole,
      staffName:     sm.name ?? profile.full_name ?? 'Staff',
    });

    // 2. Load assignments
    const { data: iaRows } = await supabase
      .from('instructor_assignments')
      .select('id, entity_type, entity_id')
      .eq('staff_member_id', sm.id)
      .order('created_at', { ascending: false });

    if (!iaRows || iaRows.length === 0) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    // 3. Enrich each assignment with entity data
    const enriched: Assignment[] = [];

    const campIds    = iaRows.filter(r => r.entity_type === 'camp').map(r => r.entity_id);
    const sessionIds = iaRows.filter(r => r.entity_type === 'session').map(r => r.entity_id);

    // Fetch camps
    if (campIds.length > 0) {
      const { data: camps } = await supabase
        .from('camps')
        .select('id, name, start_date, start_time, end_time, location')
        .in('id', campIds);

      for (const ia of iaRows.filter(r => r.entity_type === 'camp')) {
        const camp = camps?.find(c => c.id === ia.entity_id);
        if (camp) {
          enriched.push({
            id:          ia.id,
            entity_type: 'camp',
            entity_id:   ia.entity_id,
            title:       camp.name,
            date:        camp.start_date,
            start_time:  camp.start_time ?? null,
            end_time:    camp.end_time ?? null,
            location:    camp.location ?? null,
          });
        }
      }
    }

    // Fetch sessions
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, title, date, time, location')
        .in('id', sessionIds);

      for (const ia of iaRows.filter(r => r.entity_type === 'session')) {
        const sess = sessions?.find(s => s.id === ia.entity_id);
        if (sess) {
          enriched.push({
            id:          ia.id,
            entity_type: 'session',
            entity_id:   ia.entity_id,
            title:       sess.title ?? 'Session',
            date:        sess.date,
            start_time:  sess.time ?? null,   // sessions table uses 'time' column
            end_time:    null,
            location:    sess.location ?? null,
          });
        }
      }
    }

    // Sort by date
    enriched.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    setAssignments(enriched);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ── Derived ───────────────────────────────────────────────

  const todayAssignments    = assignments.filter(a => isToday(a.date));
  const upcomingAssignments = assignments.filter(a => isFuture(a.date));
  const roleColor           = ctx ? APP_ROLE_COLOR[ctx.appRole] : TEAL;

  // ── Tab-specific content ──────────────────────────────────

  function renderHome() {
    return (
      <>
        {/* Greeting card */}
        <View style={[s.greetCard, { borderColor: `${roleColor}30` }]}>
          <View style={s.greetTop}>
            <View style={[s.avatarCircle, { backgroundColor: `${roleColor}20`, borderColor: `${roleColor}40` }]}>
              <ThemedText style={[s.avatarText, { color: roleColor }]}>
                {ctx?.staffName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={s.greetName}>{ctx?.staffName}</ThemedText>
              <ThemedText style={s.greetOrg}>
                {ctx?.orgName ?? ctx?.ownerName}
              </ThemedText>
            </View>
            <View style={[s.roleBadge, { backgroundColor: `${roleColor}18`, borderColor: `${roleColor}40` }]}>
              <ThemedText style={[s.roleBadgeText, { color: roleColor }]}>
                {ctx ? APP_ROLE_LABEL[ctx.appRole] : ''}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* TODAY */}
        <ThemedText style={s.sectionLabel}>TODAY</ThemedText>
        {todayAssignments.length === 0 ? (
          <View style={s.emptySection}>
            <ThemedText style={s.emptySectionText}>Nothing scheduled for today</ThemedText>
          </View>
        ) : (
          todayAssignments.map(a => <AssignmentCard key={a.id} a={a} onPress={() => navigateToEntity(a)} />)
        )}

        {/* UPCOMING */}
        {upcomingAssignments.length > 0 && (
          <>
            <ThemedText style={s.sectionLabel}>UPCOMING</ThemedText>
            {upcomingAssignments.map(a => <AssignmentCard key={a.id} a={a} onPress={() => navigateToEntity(a)} />)}
          </>
        )}

        {/* Empty state */}
        {assignments.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={44} color={MUTED} />
            <ThemedText style={s.emptyTitle}>No assignments yet</ThemedText>
            <ThemedText style={s.emptyDesc}>
              Your coach will assign you to camps and sessions. They'll appear here.
            </ThemedText>
          </View>
        )}
      </>
    );
  }

  function navigateToEntity(a: Assignment) {
    if (a.entity_type === 'camp') {
      router.push(`/camp/${a.entity_id}` as any);
    } else if (a.entity_type === 'session') {
      router.push(`/session/${a.entity_id}` as any);
    }
  }

  function renderSchedule() {
    return (
      <>
        <ThemedText style={s.sectionLabel}>ALL ASSIGNMENTS</ThemedText>
        {assignments.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={44} color={MUTED} />
            <ThemedText style={s.emptyTitle}>No assignments</ThemedText>
            <ThemedText style={s.emptyDesc}>Assignments from your coach will appear here.</ThemedText>
          </View>
        ) : (
          assignments.map(a => <AssignmentCard key={a.id} a={a} onPress={() => navigateToEntity(a)} showDate />)
        )}
      </>
    );
  }

  function renderInbox() {
    return (
      <View style={s.emptyState}>
        <Ionicons name="chatbubble-outline" size={44} color={MUTED} />
        <ThemedText style={s.emptyTitle}>Inbox</ThemedText>
        <ThemedText style={s.emptyDesc}>Messages from your coach will appear here.</ThemedText>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <ThemedText style={s.headerTitle}>PXF HOCKEY</ThemedText>
            <ThemedText style={s.headerSub}>Staff Portal</ThemedText>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={20} color={MUTED} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'home'     && renderHome()}
            {activeTab === 'schedule' && renderSchedule()}
            {activeTab === 'inbox'    && renderInbox()}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Tab Bar */}
      <View style={[s.tabBar, { paddingBottom: insets.bottom }]}>
        {([
          { key: 'home',     icon: 'home-outline',       activeIcon: 'home',       label: 'Home' },
          { key: 'schedule', icon: 'calendar-outline',   activeIcon: 'calendar',   label: 'Schedule' },
          { key: 'inbox',    icon: 'chatbubble-outline', activeIcon: 'chatbubble', label: 'Inbox' },
        ] as const).map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={active ? tab.activeIcon : tab.icon} size={22} color={active ? TEAL : MUTED} />
              <ThemedText style={[s.tabLabel, active && { color: TEAL }]}>{tab.label}</ThemedText>
              {active && <View style={s.tabDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Assignment Card ───────────────────────────────────────────

function AssignmentCard({
  a, onPress, showDate,
}: { a: Assignment; onPress: () => void; showDate?: boolean }) {
  const color = getEntityColor(a.entity_type);
  return (
    <TouchableOpacity style={s.assignCard} activeOpacity={0.75} onPress={onPress}>
      <View style={[s.assignType, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
        <ThemedText style={[s.assignTypeText, { color }]}>{getEntityLabel(a.entity_type)}</ThemedText>
      </View>
      <ThemedText style={s.assignTitle}>{a.title}</ThemedText>
      <View style={s.assignMeta}>
        {showDate && a.date && (
          <View style={s.assignMetaItem}>
            <Ionicons name="calendar-outline" size={13} color={MUTED} />
            <ThemedText style={s.assignMetaText}>{formatDate(a.date)}</ThemedText>
          </View>
        )}
        {(a.start_time || a.end_time) && (
          <View style={s.assignMetaItem}>
            <Ionicons name="time-outline" size={13} color={MUTED} />
            <ThemedText style={s.assignMetaText}>
              {fmt12h(a.start_time)}{a.end_time ? ` → ${fmt12h(a.end_time)}` : ''}
            </ThemedText>
          </View>
        )}
        {a.location && (
          <View style={s.assignMetaItem}>
            <Ionicons name="location-outline" size={13} color={MUTED} />
            <ThemedText style={s.assignMetaText}>{a.location}</ThemedText>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED} style={s.assignChevron} />
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: TEAL, letterSpacing: 1 },
  headerSub:   { fontSize: 11, color: MUTED, letterSpacing: 0.5 },
  iconBtn:     { padding: 6 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 2, marginBottom: 10, marginTop: 20,
  },

  // Greeting card
  greetCard: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1,
    padding: 16, marginTop: 4,
  },
  greetTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { fontSize: 16, fontWeight: '800' },
  greetName:    { fontSize: 16, fontWeight: '700', color: TEXT },
  greetOrg:     { fontSize: 12, color: MUTED, marginTop: 2 },
  roleBadge: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },

  // Assignment card
  assignCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1,
    borderColor: BORDER, padding: 14, marginBottom: 10,
  },
  assignType: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, marginBottom: 8,
  },
  assignTypeText: { fontSize: 10, fontWeight: '700' },
  assignTitle:    { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 8 },
  assignMeta:     { gap: 4 },
  assignMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignMetaText: { fontSize: 12, color: MUTED },
  assignChevron:  { position: 'absolute', right: 14, top: '50%' },

  // Empty states
  emptySection: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1,
    borderColor: BORDER, padding: 16, alignItems: 'center',
  },
  emptySectionText: { fontSize: 13, color: MUTED },
  emptyState: {
    alignItems: 'center', paddingVertical: 48, gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  inboxBtn: {
    marginTop: 8, backgroundColor: TEAL, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  inboxBtnText: { fontSize: 14, fontWeight: '700', color: BG },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  tabItem: {
    flex: 1, height: 60, alignItems: 'center',
    justifyContent: 'center', gap: 3,
  },
  tabLabel: { fontSize: 10, fontWeight: '600', color: MUTED },
  tabDot:   { height: 2, width: 20, borderRadius: 1, backgroundColor: TEAL },
});
