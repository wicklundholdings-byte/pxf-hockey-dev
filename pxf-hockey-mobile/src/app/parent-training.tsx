import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ParentTabBar } from '@/components/parent-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type Tab = 'My Training' | 'My Videos' | 'Favorites';
const TABS: Tab[] = ['My Training', 'My Videos', 'Favorites'];

type Program = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  age_group: string;
  duration_weeks: number;
  sessions_per_week: number;
};

type Enrollment = {
  id: string;
  program_id: string;
  status: string;       // 'active' | 'paused' | 'complete'
  current_week: number;
  current_day: number;
};

type EnrolledProg = Program & { enrollment: Enrollment };

const CATEGORY_COLORS: Record<string, string> = {
  'Stick Skills':             TEAL,
  'Shooting':                 ORANGE,
  'Strength & Explosiveness': '#7C3AED',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? TEAL;
}

// ─── Enrolled Program Card ────────────────────────────────────────────────────
function ProgramCard({ prog }: { prog: EnrolledProg }) {
  const total = prog.duration_weeks * prog.sessions_per_week;
  const done  = Math.max(0, (prog.enrollment.current_week - 1) * prog.sessions_per_week + (prog.enrollment.current_day - 1));
  const pct   = total > 0 ? Math.min(done / total, 1) : 0;
  const color = categoryColor(prog.category);

  return (
    <View style={s.progCard}>
      <View style={s.progTitleRow}>
        <View style={[s.progCatDot, { backgroundColor: color }]} />
        <ThemedText style={s.progTitle}>{prog.title}</ThemedText>
      </View>
      <ThemedText style={s.progSub}>{prog.category} · {prog.level} · {prog.age_group}</ThemedText>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
      <View style={s.progProgressRow}>
        <ThemedText style={s.progComplete}>{done} of {total} sessions done</ThemedText>
        <ThemedText style={[s.progComplete, { color }]}>{Math.round(pct * 100)}%</ThemedText>
      </View>
      <TouchableOpacity style={s.nextSessionBtn} activeOpacity={0.8}>
        <View style={s.playBtn}>
          <Ionicons name="play" size={14} color={TEXT} />
        </View>
        <View>
          <ThemedText style={s.nextSessionTitle}>
            Week {prog.enrollment.current_week} · Day {prog.enrollment.current_day}
          </ThemedText>
          <ThemedText style={s.nextSessionDur}>
            {prog.sessions_per_week}x per week · {prog.duration_weeks} weeks total
          </ThemedText>
        </View>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.85}>
        <LinearGradient colors={[GREEN, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.continueGrad}>
          <ThemedText style={s.continueTxt}>Continue →</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Available Program Card ───────────────────────────────────────────────────
function AvailableCard({
  prog, enrolling, onEnroll,
}: {
  prog: Program;
  enrolling: boolean;
  onEnroll: () => void;
}) {
  const color = categoryColor(prog.category);
  return (
    <TouchableOpacity style={s.availCard} activeOpacity={0.85} onPress={onEnroll}>
      <View style={[s.availIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name="fitness-outline" size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={s.availTitle}>{prog.title}</ThemedText>
        <ThemedText style={s.availMeta}>
          {prog.duration_weeks}wk · {prog.sessions_per_week}x/wk · {prog.level} · {prog.age_group}
        </ThemedText>
        {prog.description != null && (
          <ThemedText style={s.availDesc} numberOfLines={2}>{prog.description}</ThemedText>
        )}
      </View>
      {enrolling ? (
        <ActivityIndicator size="small" color={TEAL} style={{ marginLeft: 8 }} />
      ) : (
        <View style={s.enrollBtn}>
          <ThemedText style={s.enrollTxt}>+ Enroll</ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── My Training Tab ──────────────────────────────────────────────────────────
function MyTrainingTab({
  loading, enrolledActive, enrolledComplete, available, enrolling, onEnroll,
}: {
  loading: boolean;
  enrolledActive: EnrolledProg[];
  enrolledComplete: EnrolledProg[];
  available: Program[];
  enrolling: Record<string, boolean>;
  onEnroll: (programId: string) => void;
}) {
  if (loading) {
    return <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />;
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <ThemedText style={s.tabTitle}>My Training</ThemedText>
      <ThemedText style={s.tabSub}>Programs your coach assigned or you enrolled in</ThemedText>

      {enrolledActive.length > 0 && (
        <>
          <ThemedText style={s.sectionLabel}>ACTIVE</ThemedText>
          {enrolledActive.map(p => <ProgramCard key={p.id} prog={p} />)}
        </>
      )}

      {enrolledComplete.length > 0 && (
        <>
          <View style={s.completedHeader}>
            <ThemedText style={s.sectionLabel}>COMPLETED</ThemedText>
            <ThemedText style={s.countChip}>{enrolledComplete.length}</ThemedText>
          </View>
          {enrolledComplete.map(p => <ProgramCard key={p.id} prog={p} />)}
        </>
      )}

      {enrolledActive.length === 0 && enrolledComplete.length === 0 && (
        <View style={s.emptyBox}>
          <Ionicons name="fitness-outline" size={32} color={MUTED} />
          <ThemedText style={s.emptyText}>No active programs</ThemedText>
          <ThemedText style={s.emptyNote}>Enroll in a program below to start training</ThemedText>
        </View>
      )}

      {available.length > 0 && (
        <>
          <ThemedText style={[s.sectionLabel, { marginTop: 16 }]}>PXF PROGRAMS</ThemedText>
          {available.map(p => (
            <AvailableCard
              key={p.id}
              prog={p}
              enrolling={enrolling[p.id] ?? false}
              onEnroll={() => onEnroll(p.id)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── My Videos tab ────────────────────────────────────────────────────────────
function MyVideosTab() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 40, gap: 12 }}>
      <Ionicons name="videocam-outline" size={40} color={MUTED} />
      <ThemedText style={{ fontSize: 16, fontWeight: '700', color: TEXT, textAlign: 'center' }}>Video uploads coming soon</ThemedText>
      <ThemedText style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 }}>
        Upload clips from your athlete's training for coach review. This feature will be available soon.
      </ThemedText>
    </View>
  );
}

// ─── Favorites tab ────────────────────────────────────────────────────────────
function FavoritesTab() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 40, gap: 12 }}>
      <Ionicons name="heart-outline" size={40} color={MUTED} />
      <ThemedText style={{ fontSize: 16, fontWeight: '700', color: TEXT, textAlign: 'center' }}>Favorites coming soon</ThemedText>
      <ThemedText style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 }}>
        Save your athlete's favourite drills, sessions, and programs here.
      </ThemedText>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ParentTrainingScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('My Training');

  // Data state
  const [loading,      setLoading]      = useState(true);
  const [allPrograms,  setAllPrograms]  = useState<Program[]>([]);
  const [enrollments,  setEnrollments]  = useState<Enrollment[]>([]);
  const [enrolling,    setEnrolling]    = useState<Record<string, boolean>>({});
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

      // Get first player linked to this parent
      const { data: players } = await supabase
        .from('players')
        .select('id')
        .eq('parent_email', user.email)
        .limit(1);
      const pid = players?.[0]?.id ?? null;
      setPlayerId(pid);

      // Load all published PXF programs
      const { data: programs } = await supabase
        .from('training_programs')
        .select('id, title, description, category, level, age_group, duration_weeks, sessions_per_week')
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      setAllPrograms((programs ?? []) as Program[]);

      // Load this parent's enrollments
      const { data: enrollRows } = await supabase
        .from('athlete_program_enrollments')
        .select('id, program_id, status, current_week, current_day')
        .eq('parent_user_id', user.id);

      setEnrollments((enrollRows ?? []) as Enrollment[]);
      setLoading(false);
    })();
  }, []);

  // Merge programs + enrollments
  const enrollmentMap = new Map(enrollments.map(e => [e.program_id, e]));

  const enrolledProgs: EnrolledProg[] = allPrograms
    .filter(p => enrollmentMap.has(p.id))
    .map(p => ({ ...p, enrollment: enrollmentMap.get(p.id)! }));

  const enrolledActive   = enrolledProgs.filter(p => p.enrollment.status !== 'complete');
  const enrolledComplete = enrolledProgs.filter(p => p.enrollment.status === 'complete');
  const available        = allPrograms.filter(p => !enrollmentMap.has(p.id));

  async function handleEnroll(programId: string) {
    if (!userId) return;
    setEnrolling(prev => ({ ...prev, [programId]: true }));

    const { data: inserted } = await supabase
      .from('athlete_program_enrollments')
      .insert({
        program_id:     programId,
        player_id:      playerId,
        parent_user_id: userId,
        start_date:     new Date().toISOString().slice(0, 10),
        status:         'active',
        current_week:   1,
        current_day:    1,
      })
      .select('id, program_id, status, current_week, current_day')
      .single();

    if (inserted) {
      setEnrollments(prev => [...prev, inserted as Enrollment]);
    }
    setEnrolling(prev => ({ ...prev, [programId]: false }));
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.backRow} />
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

        <View style={{ paddingHorizontal: 16, marginBottom: 2 }}>
          <ThemedText style={s.eyebrow}>PLAYBOOK</ThemedText>
        </View>

        {/* Tab strip */}
        <View style={s.tabStrip}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, activeTab === t && s.tabBtnActive]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.tabTxt, activeTab === t && s.tabTxtActive]}>{t}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {activeTab === 'My Training' && (
            <MyTrainingTab
              loading={loading}
              enrolledActive={enrolledActive}
              enrolledComplete={enrolledComplete}
              available={available}
              enrolling={enrolling}
              onEnroll={(id) => void handleEnroll(id)}
            />
          )}
          {activeTab === 'My Videos'  && <MyVideosTab />}
          {activeTab === 'Favorites'  && <FavoritesTab />}
        </View>
      </SafeAreaView>
      <ParentTabBar active="training" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backRow:           { flex: 1 },
  logoRow:           { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  logoPXF:           { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  logoHockey:        { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 3 },
  headerRight:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  headerIcon:        { padding: 4 },
  profileAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 12, fontWeight: '800', color: '#000' },

  eyebrow: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1 },

  tabStrip:   { flexDirection: 'row', marginHorizontal: 16, backgroundColor: CARD, borderRadius: 30, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  tabBtn:     { flex: 1, borderRadius: 26, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: TEAL },
  tabTxt:     { fontSize: 13, fontWeight: '700', color: MUTED },
  tabTxtActive: { color: '#000' },

  // My Training
  tabTitle:   { fontSize: 22, fontWeight: '800', lineHeight: 28, color: TEXT, marginBottom: 4, marginTop: 8 },
  tabSub:     { fontSize: 14, color: MUTED, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 12 },
  completedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  countChip: { fontSize: 11, fontWeight: '800', color: TEAL, backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },

  progCard:       { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 14 },
  progTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  progCatDot:     { width: 8, height: 8, borderRadius: 4 },
  progTitle:      { fontSize: 17, fontWeight: '800', color: TEXT, flex: 1 },
  progSub:        { fontSize: 12, color: MUTED, marginBottom: 10 },
  progressTrack:  { height: 4, backgroundColor: BORDER, borderRadius: 2, marginBottom: 6 },
  progressFill:   { height: 4, backgroundColor: TEAL, borderRadius: 2 },
  progProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progComplete:   { fontSize: 12, color: MUTED },
  nextSessionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, padding: 12, marginBottom: 14, gap: 12 },
  playBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nextSessionTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  nextSessionDur:   { fontSize: 12, color: MUTED },
  continueGrad:   { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  continueTxt:    { fontSize: 14, fontWeight: '800', color: '#000' },

  // Available programs
  availCard:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10, gap: 12 },
  availIcon:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  availTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  availMeta:  { fontSize: 12, color: MUTED, marginBottom: 4 },
  availDesc:  { fontSize: 12, color: MUTED, lineHeight: 17 },
  enrollBtn:  { backgroundColor: 'rgba(0,196,180,0.12)', borderRadius: 20, borderWidth: 1, borderColor: TEAL, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', flexShrink: 0 },
  enrollTxt:  { fontSize: 12, fontWeight: '700', color: TEAL },

  emptyBox:   { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText:  { fontSize: 16, fontWeight: '700', color: MUTED },
  emptyNote:  { fontSize: 13, color: MUTED, opacity: 0.7, textAlign: 'center', paddingHorizontal: 20 },

  // My Videos
  uploadBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 16, marginBottom: 12 },
  uploadTxt:  { fontSize: 14, fontWeight: '700', color: TEAL },
  filterScroll: { marginBottom: 14 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  filterChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  filterTxt:  { fontSize: 13, fontWeight: '600', color: MUTED },
  filterTxtActive: { color: '#000' },
  videoCard:  { flex: 1, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  videoThumb: { height: 110, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  durationBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  durationTxt: { fontSize: 11, fontWeight: '700', color: TEXT },
  videoMeta:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  videoCatBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  videoCatTxt:   { fontSize: 10, fontWeight: '800', color: '#000' },
  videoDate:  { fontSize: 11, color: MUTED },
  videoNote:  { fontSize: 12, color: MUTED, paddingHorizontal: 8, paddingBottom: 10, lineHeight: 17 },

  // Favorites
  favRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  favIcon:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,196,180,0.12)', alignItems: 'center', justifyContent: 'center' },
  favTitle:   { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  favCategory: { fontSize: 12, fontWeight: '700', color: TEAL, letterSpacing: 0.3 },
});
