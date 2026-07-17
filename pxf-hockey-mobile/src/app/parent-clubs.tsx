import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ParentTabBar } from '@/components/parent-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type PlayerTeam = {
  playerId: string;
  playerName: string;
  position: string | null;
  jerseyNumber: string | null;
  teamId: string;
  teamName: string;
  teamAgeGroup: string | null;
  teamColor: string | null;
};

type CampReg = {
  id: string;
  campId: string;
  campTitle: string;
  status: string;
};

function teamInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function ParentClubsScreen() {
  const router = useRouter();
  const [playerTeams, setPlayerTeams] = useState<PlayerTeam[]>([]);
  const [campRegs,    setCampRegs]    = useState<CampReg[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [userInitials, setUserInitials] = useState('P');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      // Load profile initials
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        setUserInitials(parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : parts[0][0].toUpperCase());
      }

      // Load players linked via parent_email, join teams
      const { data: players } = await supabase
        .from('players')
        .select('id, full_name, position, jersey_number, team_id, teams(id, name, age_group, color)')
        .eq('parent_email', user.email);

      const mapped: PlayerTeam[] = (players ?? []).map((p: any) => {
        const t: any = Array.isArray(p.teams) ? p.teams[0] ?? null : p.teams ?? null;
        return {
          playerId: p.id,
          playerName: p.full_name,
          position: p.position,
          jerseyNumber: p.jersey_number,
          teamId: p.team_id,
          teamName: t?.name ?? 'Unknown Team',
          teamAgeGroup: t?.age_group ?? null,
          teamColor: t?.color ?? null,
        };
      });
      setPlayerTeams(mapped);

      // Load camp registrations by player name
      if (mapped.length > 0) {
        const playerNames = mapped.map(m => m.playerName);
        const { data: regs } = await supabase
          .from('camp_registrations')
          .select('id, status, camp:camps(id, title)')
          .in('player_name', playerNames);
        const regsMapped: CampReg[] = (regs ?? []).map((r: any) => {
          const c: any = Array.isArray(r.camp) ? r.camp[0] ?? null : r.camp ?? null;
          return { id: r.id, campId: c?.id ?? '', campTitle: c?.title ?? 'Camp', status: r.status };
        });
        setCampRegs(regsMapped);
      }

      setLoading(false);
    });
  }, []);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* PXF Header */}
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
          {/* My Teams */}
          <ThemedText style={s.eyebrow}>MY CLUBS</ThemedText>
          <View style={s.titleRow}>
            <ThemedText style={s.title}>My Teams</ThemedText>
            <TouchableOpacity style={s.leaderboardBtn} activeOpacity={0.85}>
              <Ionicons name="trophy-outline" size={14} color={TEAL} style={{ marginRight: 6 }} />
              <ThemedText style={s.leaderboardText}>Leaderboard</ThemedText>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginVertical: 24 }} />
          ) : playerTeams.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={32} color={MUTED} />
              <ThemedText style={s.emptyText}>No teams yet</ThemedText>
              <ThemedText style={s.emptyNote}>Your coach will add you via your email address</ThemedText>
            </View>
          ) : playerTeams.map(pt => (
            <TouchableOpacity
              key={pt.playerId}
              style={s.teamCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/parent-team/${pt.teamId}` as any)}
            >
              <View style={[s.teamAvatar, { backgroundColor: pt.teamColor ?? TEAL }]}>
                <ThemedText style={s.teamAvatarText}>{teamInitials(pt.teamName)}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.teamName}>{pt.teamName}</ThemedText>
                <ThemedText style={s.teamMeta}>
                  {pt.teamAgeGroup ?? ''}
                  {pt.jerseyNumber ? ` · #${pt.jerseyNumber}` : ''}
                </ThemedText>
              </View>
              {pt.position && (
                <View style={s.forwardBadge}>
                  <ThemedText style={s.forwardText}>{pt.position.toUpperCase()}</ThemedText>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={MUTED} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ))}

          {/* My Camps & Privates */}
          <ThemedText style={[s.title, { marginTop: 24, marginBottom: 12 }]}>My Camps & Privates</ThemedText>

          {!loading && campRegs.length === 0 ? (
            <View style={[s.emptyCard, { marginBottom: 8 }]}>
              <Ionicons name="calendar-outline" size={28} color={MUTED} />
              <ThemedText style={s.emptyText}>No camps registered</ThemedText>
            </View>
          ) : campRegs.map(reg => (
            <TouchableOpacity
              key={reg.id}
              style={s.campCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/enrollment/${reg.campId}` as any)}
            >
              <View style={[s.campIcon, { backgroundColor: 'rgba(0,196,180,0.12)' }]}>
                <Ionicons name="calendar-outline" size={20} color={TEAL} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <ThemedText style={s.campName}>{reg.campTitle}</ThemedText>
                <ThemedText style={s.campMeta}>{reg.status === 'confirmed' ? 'Confirmed' : reg.status}</ThemedText>
              </View>
              <View style={s.campBadge}>
                <ThemedText style={s.campBadgeText}>CAMP</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ))}

          {/* Find a Hockey School */}
          <TouchableOpacity style={s.findBtn} activeOpacity={0.85}>
            <Ionicons name="search-outline" size={18} color={TEAL} style={{ marginRight: 10 }} />
            <ThemedText style={s.findText}>Find a Hockey School</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      <ParentTabBar active="clubs" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  logoPXF: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  logoHockey: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { padding: 4 },
  profileAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 13, fontWeight: '800', color: '#000' },

  content: { paddingHorizontal: 16, paddingBottom: 40 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 6, marginTop: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32, color: TEXT },
  leaderboardBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  leaderboardText: { fontSize: 13, fontWeight: '700', color: TEAL },

  teamCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 8 },
  teamAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  teamAvatarText: { fontSize: 14, fontWeight: '800', color: '#000' },
  teamName: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  teamMeta: { fontSize: 13, color: MUTED },
  forwardBadge: { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.35)' },
  forwardText: { fontSize: 11, fontWeight: '800', color: TEAL, letterSpacing: 0.3 },

  campCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  campIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  campName: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  campMeta: { fontSize: 13, color: MUTED },
  campBadge: { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.35)' },
  campBadgeText: { fontSize: 11, fontWeight: '800', color: TEAL },

  findBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,196,180,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', paddingVertical: 16, marginTop: 16 },
  findText: { fontSize: 15, fontWeight: '700', color: TEAL },

  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  emptyText: { fontSize: 15, fontWeight: '700', color: MUTED, textAlign: 'center' },
  emptyNote: { fontSize: 13, color: MUTED, opacity: 0.6, textAlign: 'center' },
});
