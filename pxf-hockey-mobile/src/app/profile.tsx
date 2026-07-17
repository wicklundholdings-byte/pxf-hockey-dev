import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const GREEN  = '#3DFF8F';
const TEAL   = '#00C4B4';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const RED    = '#EF4444';

type Role = 'elite' | 'team' | 'parent' | null;

const ROLE_LABEL: Record<string, string> = {
  elite:  'ELITE COACH',
  team:   'TEAM COACH',
  parent: 'PARENT',
};
const ROLE_COLOR: Record<string, string> = {
  elite:  TEAL,
  team:   GREEN,
  parent: ORANGE,
};

function buildMenuItems(role: Role): Array<{ icon: string; label: string; route?: string }> {
  const base = [
    { icon: 'card-outline',          label: 'Membership',        route: '/settings' },
    { icon: 'settings-outline',      label: 'Settings',          route: '/settings' },
    { icon: 'notifications-outline', label: 'Notifications' },
    { icon: 'shield-outline',        label: 'Privacy & Data' },
    { icon: 'help-circle-outline',   label: 'Help & Support' },
  ];

  if (role === 'elite' || role === 'team') {
    base.splice(1, 0,
      { icon: 'bookmark-outline', label: 'Saved Sessions', route: '/sessions' },
      { icon: 'heart-outline',    label: 'Favourite Drills', route: '/drills' },
    );
  }

  return base;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();

  const [role,          setRole]          = useState<Role>(null);
  const [displayName,   setDisplayName]   = useState('');
  const [email,         setEmail]         = useState('');
  const [isFoundingMember, setIsFoundingMember] = useState(false);

  // Stats
  const [teamCount,    setTeamCount]    = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [athleteCount, setAthleteCount] = useState<number | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? '');

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, is_founding_member')
      .eq('id', user.id)
      .maybeSingle();

    const name = profile?.full_name || user.email?.split('@')[0] || 'Coach';
    setDisplayName(name);
    setRole((profile?.role as Role) ?? null);
    setIsFoundingMember(!!profile?.is_founding_member);

    // Stats
    const [teams, sessions] = await Promise.all([
      supabase
        .from('teams')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', user.id),
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', user.id),
    ]);
    setTeamCount(teams.count ?? 0);
    setSessionCount(sessions.count ?? 0);

    if (teams.count && teams.count > 0) {
      const { data: teamRows } = await supabase
        .from('teams')
        .select('id')
        .eq('coach_id', user.id);
      const teamIds = (teamRows ?? []).map((t: any) => t.id);
      const { count: players } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .in('team_id', teamIds);
      setAthleteCount(players ?? 0);
    } else {
      setAthleteCount(0);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/auth/sign-in');
        },
      },
    ]);
  }

  const initials = displayName
    .split(/[\s._@]/)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const roleLabel = role ? ROLE_LABEL[role] ?? role.toUpperCase() : 'COACH';
  const roleColor = role ? ROLE_COLOR[role] ?? TEAL : TEAL;
  const menuItems = buildMenuItems(role);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <ThemedText style={s.logoPXF}>PXF</ThemedText>
            <ThemedText style={s.logoHockey}>HOCKEY</ThemedText>
          </View>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={22} color={MUTED} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Profile Card */}
          <View style={[s.profileCard, isFoundingMember && { borderColor: ORANGE }]}>

            {/* Founding member ribbon */}
            {isFoundingMember && (
              <View style={s.foundingBadge}>
                <Ionicons name="flame" size={11} color={ORANGE} />
                <ThemedText style={s.foundingText}>FOUNDING MEMBER</ThemedText>
              </View>
            )}

            <View style={s.profileTop}>
              {/* Avatar */}
              <View style={s.avatarWrap}>
                <LinearGradient colors={[TEAL, GREEN]} style={s.avatarGrad}>
                  <ThemedText style={s.avatarText}>{initials}</ThemedText>
                </LinearGradient>
              </View>

              {/* Info */}
              <View style={s.profileInfo}>
                <View style={s.badgeRow}>
                  <View style={[s.roleBadge, { borderColor: roleColor, backgroundColor: `${roleColor}1A` }]}>
                    <ThemedText style={[s.roleBadgeText, { color: roleColor }]}>{roleLabel}</ThemedText>
                  </View>
                </View>
                <ThemedText style={s.nameText}>{displayName}</ThemedText>
                <ThemedText style={s.emailText}>{email}</ThemedText>
              </View>

              {/* Edit */}
              <TouchableOpacity style={s.editBtn} onPress={() => router.push('/settings' as any)}>
                <Ionicons name="pencil-outline" size={16} color={MUTED} />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            {(role === 'elite' || role === 'team') && (
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <ThemedText style={s.statNum}>{teamCount ?? '—'}</ThemedText>
                  <ThemedText style={s.statLabel}>TEAMS</ThemedText>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <ThemedText style={s.statNum}>{sessionCount ?? '—'}</ThemedText>
                  <ThemedText style={s.statLabel}>SESSIONS</ThemedText>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <ThemedText style={s.statNum}>{athleteCount ?? '—'}</ThemedText>
                  <ThemedText style={s.statLabel}>ATHLETES</ThemedText>
                </View>
              </View>
            )}
          </View>

          {/* Account Menu */}
          <ThemedText style={s.sectionLabel}>ACCOUNT</ThemedText>
          <View style={s.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[s.menuRow, i < menuItems.length - 1 && s.menuRowBorder]}
                onPress={() => {
                  if (item.route) router.push(item.route as any);
                  else Alert.alert(item.label, 'Coming soon!');
                }}
              >
                <View style={s.menuLeft}>
                  <Ionicons name={item.icon as any} size={18} color={TEAL} style={s.menuIcon} />
                  <ThemedText style={s.menuLabel}>{item.label}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <View style={s.signOutInner}>
              <Ionicons name="log-out-outline" size={16} color={RED} style={{ marginRight: 8 }} />
              <ThemedText style={s.signOutText}>SIGN OUT</ThemedText>
            </View>
          </TouchableOpacity>

          <View style={s.taglineRow}>
            <ThemedText style={s.tagline}>POWER. FLOW. PERFORMANCE.</ThemedText>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  logoRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  logoPXF:    { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  logoHockey: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 3 },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // ── Profile Card ─────────────────────────────────────────────────────────────
  profileCard: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 24,
  },
  foundingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', marginBottom: 12,
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  foundingText: { fontSize: 9, fontWeight: '800', color: ORANGE, letterSpacing: 1.5 },

  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  avatarWrap: { marginRight: 14 },
  avatarGrad: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#000' },
  profileInfo: { flex: 1 },
  badgeRow:   { flexDirection: 'row', marginBottom: 4 },
  roleBadge: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  roleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  nameText:  { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  emailText: { fontSize: 12, color: MUTED },
  editBtn:   { padding: 6 },

  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER,
    paddingTop: 14, marginTop: 14,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 2 },
  statLabel:   { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: BORDER, marginVertical: 4 },

  // ── Menu ─────────────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 2,
    marginBottom: 10, marginLeft: 2,
  },
  menuCard: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  menuLeft:  { flexDirection: 'row', alignItems: 'center' },
  menuIcon:  { marginRight: 12 },
  menuLabel: { fontSize: 15, color: TEXT },

  // ── Sign Out ──────────────────────────────────────────────────────────────────
  signOutBtn: {
    borderRadius: 14, borderWidth: 1, borderColor: RED,
    marginBottom: 32, overflow: 'hidden',
  },
  signOutInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, backgroundColor: 'rgba(239,68,68,0.06)',
  },
  signOutText: { fontSize: 14, fontWeight: '800', color: RED, letterSpacing: 1 },

  // ── Tagline ───────────────────────────────────────────────────────────────────
  taglineRow: { alignItems: 'center', paddingBottom: 8 },
  tagline:    { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 3 },
});
