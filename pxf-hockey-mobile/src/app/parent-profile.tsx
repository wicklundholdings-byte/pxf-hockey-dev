import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ParentTabBar } from '@/components/parent-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type LinkedAthlete = {
  id: string;
  fullName: string;
  position: string | null;
  jerseyNumber: string | null;
  teamName: string;
  teamColor: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

export default function ParentProfileScreen() {
  const router = useRouter();
  const [loading,      setLoading]      = useState(true);
  const [fullName,     setFullName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [athletes,     setAthletes]     = useState<LinkedAthlete[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setEmail(user.email ?? '');

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      setFullName(profile?.full_name ?? '');

      // Load linked athletes
      const { data: players } = await supabase
        .from('players')
        .select('id, full_name, position, jersey_number, teams(name, color)')
        .eq('parent_email', user.email);

      setAthletes((players ?? []).map((p: any) => {
        const t: any = Array.isArray(p.teams) ? p.teams[0] ?? null : p.teams ?? null;
        return {
          id: p.id,
          fullName: p.full_name,
          position: p.position ?? null,
          jerseyNumber: p.jersey_number ?? null,
          teamName: t?.name ?? 'Unknown Team',
          teamColor: t?.color ?? null,
        };
      }));

      setLoading(false);
    })();
  }, []);

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/auth/sign-in' as any);
        },
      },
    ]);
  }

  const userInitials = fullName ? initials(fullName) : (email ? email[0].toUpperCase() : 'P');

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <ThemedText style={s.logoPXF}>PXF</ThemedText>
              <ThemedText style={s.logoHockey}>HOCKEY</ThemedText>
            </View>
            <TouchableOpacity style={s.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Avatar + name */}
              <View style={s.profileCard}>
                <View style={s.avatar}>
                  <ThemedText style={s.avatarText}>{userInitials}</ThemedText>
                </View>
                <ThemedText style={s.name}>{fullName || 'Parent'}</ThemedText>
                <ThemedText style={s.emailText}>{email}</ThemedText>
                <View style={s.planBadge}>
                  <ThemedText style={s.planText}>PARENT PLAN · $10/mo</ThemedText>
                </View>
              </View>

              {/* Linked Athletes */}
              <ThemedText style={s.sectionLabel}>LINKED ATHLETES</ThemedText>
              {athletes.length === 0 ? (
                <View style={s.emptyCard}>
                  <Ionicons name="person-outline" size={28} color={MUTED} />
                  <ThemedText style={s.emptyText}>No athletes linked yet</ThemedText>
                  <ThemedText style={s.emptyNote}>Your coach links you by your email address</ThemedText>
                </View>
              ) : athletes.map(a => (
                <View key={a.id} style={s.athleteCard}>
                  <View style={[s.athleteAvatar, { backgroundColor: a.teamColor ?? TEAL }]}>
                    <ThemedText style={s.athleteAvatarText}>
                      {a.jerseyNumber ? `#${a.jerseyNumber}` : a.fullName[0]}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <ThemedText style={s.athleteName}>{a.fullName}</ThemedText>
                    <ThemedText style={s.athleteMeta}>
                      {[a.teamName, a.position].filter(Boolean).join(' · ')}
                    </ThemedText>
                  </View>
                  {a.position && (
                    <View style={s.posBadge}>
                      <ThemedText style={s.posText}>{a.position.toUpperCase()}</ThemedText>
                    </View>
                  )}
                </View>
              ))}

              {/* Account */}
              <ThemedText style={[s.sectionLabel, { marginTop: 24 }]}>ACCOUNT</ThemedText>
              <View style={s.menuCard}>
                <TouchableOpacity style={[s.menuRow, s.menuRowBorder]} activeOpacity={0.7}>
                  <Ionicons name="person-outline" size={20} color={MUTED} style={s.menuIcon} />
                  <ThemedText style={s.menuLabel}>Edit Profile</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.menuRow, s.menuRowBorder]} activeOpacity={0.7}>
                  <Ionicons name="notifications-outline" size={20} color={MUTED} style={s.menuIcon} />
                  <ThemedText style={s.menuLabel}>Notifications</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.menuRow, s.menuRowBorder]} activeOpacity={0.7}>
                  <Ionicons name="card-outline" size={20} color={MUTED} style={s.menuIcon} />
                  <ThemedText style={s.menuLabel}>Billing</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity style={s.menuRow} activeOpacity={0.7}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={MUTED} style={s.menuIcon} />
                  <ThemedText style={s.menuLabel}>Privacy & Security</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </TouchableOpacity>
              </View>

              {/* Sign out */}
              <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={18} color={RED} />
                <ThemedText style={s.signOutText}>Sign Out</ThemedText>
              </TouchableOpacity>

              <ThemedText style={s.version}>PXF Hockey · v1.0</ThemedText>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <ParentTabBar active="home" />
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  safe:    { flex: 1 },
  content: { paddingBottom: 40 },

  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  logoPXF:   { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  logoHockey:{ fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 3 },
  notifBtn:  { padding: 4 },

  profileCard: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 8 },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText:  { fontSize: 28, fontWeight: '800', color: '#000', lineHeight: 34 },
  name:        { fontSize: 24, fontWeight: '800', color: TEXT, lineHeight: 30 },
  emailText:   { fontSize: 14, color: MUTED },
  planBadge:   { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', marginTop: 4 },
  planText:    { fontSize: 11, fontWeight: '800', color: TEAL, letterSpacing: 0.5 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10 },

  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyText: { fontSize: 15, fontWeight: '700', color: MUTED },
  emptyNote: { fontSize: 13, color: MUTED, opacity: 0.6, textAlign: 'center', paddingHorizontal: 32 },

  athleteCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginHorizontal: 16, marginBottom: 8 },
  athleteAvatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  athleteAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },
  athleteName:       { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  athleteMeta:       { fontSize: 13, color: MUTED },
  posBadge:          { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  posText:           { fontSize: 11, fontWeight: '800', color: TEAL },

  menuCard:      { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 16 },
  menuRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  menuIcon:      { marginRight: 14 },
  menuLabel:     { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT },

  signOutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  signOutText: { fontSize: 15, fontWeight: '700', color: RED },

  version: { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 20, opacity: 0.5 },
});
