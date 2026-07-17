import { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

const AGE_GROUPS = ['U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Junior','Senior'];
const SEASONS    = ['2025-26','2026-27','2027-28'];

type Team = {
  id: string;
  name: string;
  age_group: string | null;
  season: string | null;
  primary_color: string | null;
  logo_url: string | null;
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamsScreen() {
  const router = useRouter();

  const [teams,   setTeams]   = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [modalOpen,  setModalOpen]  = useState(false);
  const [teamName,   setTeamName]   = useState('');
  const [ageGroup,   setAgeGroup]   = useState('U14');
  const [season,     setSeason]     = useState('2026-27');
  const [saving,     setSaving]     = useState(false);

  async function loadTeams() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('teams')
      .select('id, name, age_group, season, primary_color, logo_url')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });
    setTeams(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadTeams(); }, []);

  async function handleCreateTeam() {
    if (!teamName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from('teams').insert({
      coach_id:  user.id,
      name:      teamName.trim(),
      age_group: ageGroup,
      season:    season,
      primary_color: TEAL,
    });

    setSaving(false);
    if (error) {
      Alert.alert('Error creating team', `${error.message}\n\nCode: ${error.code}`);
      return;
    }
    setTeamName('');
    setAgeGroup('U14');
    setSeason('2026-27');
    setModalOpen(false);
    loadTeams();
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header row */}
          <View style={styles.coachRow}>
            <View style={styles.coachChip}>
              <ThemedText style={styles.coachChipText}>COACH</ThemedText>
            </View>
            <View style={styles.coachIcons}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile' as any)}>
                <Ionicons name="person-circle-outline" size={22} color={MUTED} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings' as any)}>
                <Ionicons name="settings-outline" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.header}>
            <View>
              <ThemedText style={styles.sectionLabel}>TEAMS</ThemedText>
              <ThemedText style={styles.title}>Your teams</ThemedText>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setModalOpen(true)}>
              <LinearGradient
                colors={[TEAL, GREEN]}
                style={styles.newTeamBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add" size={16} color="#000" />
                <ThemedText style={styles.newTeamText}>New team</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {loading && (
            <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
          )}

          {/* Empty state */}
          {!loading && teams.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color={MUTED} />
              <ThemedText style={styles.emptyTitle}>No teams yet</ThemedText>
              <ThemedText style={styles.emptySub}>Create your first team to get started with rosters, schedules, and sessions.</ThemedText>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalOpen(true)} activeOpacity={0.8}>
                <LinearGradient colors={[TEAL, GREEN]} style={styles.emptyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="add" size={16} color="#000" />
                  <ThemedText style={styles.emptyBtnText}>Create team</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Team list */}
          {teams.map(team => (
            <TouchableOpacity
              key={team.id}
              style={styles.teamCard}
              activeOpacity={0.8}
              onPress={() => router.push(`/team/${team.id}` as any)}
            >
              {team.logo_url ? (
                <Image source={{ uri: team.logo_url }} style={styles.teamAvatar} />
              ) : (
                <View style={[styles.teamAvatar, { backgroundColor: team.primary_color ?? TEAL }]}>
                  <ThemedText style={styles.teamAvatarText}>{initials(team.name)}</ThemedText>
                </View>
              )}
              <View style={styles.teamInfo}>
                <ThemedText style={styles.teamName}>{team.name}</ThemedText>
                <ThemedText style={styles.teamMeta}>
                  {[team.age_group, team.season].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>
          ))}

        </ScrollView>
      </SafeAreaView>

      {/* ── Create Team Modal ─────────────────────────────────────────────────── */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalOpen(false)} />
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>New Team</ThemedText>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              {/* Team Name */}
              <ThemedText style={styles.fieldLabel}>TEAM NAME</ThemedText>
              <TextInput
                style={styles.textInput}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="e.g. Lightning U14"
                placeholderTextColor={MUTED}
                autoCapitalize="words"
                autoFocus
              />

              {/* Age Group */}
              <ThemedText style={styles.fieldLabel}>AGE GROUP</ThemedText>
              <View style={styles.chipWrap}>
                {AGE_GROUPS.map(ag => (
                  <TouchableOpacity
                    key={ag}
                    style={[styles.chip, ageGroup === ag && styles.chipActive]}
                    onPress={() => setAgeGroup(ag)}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[styles.chipText, ageGroup === ag && styles.chipTextActive]}>{ag}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Season */}
              <ThemedText style={styles.fieldLabel}>SEASON</ThemedText>
              <View style={styles.chipWrap}>
                {SEASONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, season === s && styles.chipActive]}
                    onPress={() => setSeason(s)}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[styles.chipText, season === s && styles.chipTextActive]}>{s}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, (!teamName.trim() || saving) && styles.saveBtnDisabled]}
                onPress={handleCreateTeam}
                disabled={!teamName.trim() || saving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[TEAL, '#00A89A']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGrad}
                >
                  {saving
                    ? <ActivityIndicator color="#000" size="small" />
                    : <ThemedText style={styles.saveBtnText}>Create Team</ThemedText>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  safe:    { flex: 1 },
  content: { paddingBottom: 40 },

  coachRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  coachChip:     { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL },
  coachChipText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  coachIcons:    { flexDirection: 'row', gap: 4 },
  iconBtn:       { padding: 6 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, marginBottom: 4 },
  title:       { fontSize: 26, fontWeight: '800', color: TEXT, lineHeight: 32 },

  newTeamBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  newTeamText: { fontSize: 14, fontWeight: '700', color: '#000' },

  // Team cards
  teamCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  teamAvatar:     { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  teamAvatarText: { fontSize: 16, fontWeight: '800', color: '#000' },
  teamInfo:       { flex: 1 },
  teamName:       { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  teamMeta:       { fontSize: 13, color: MUTED },

  // Empty state
  emptyCard:  { marginHorizontal: 16, marginTop: 20, backgroundColor: CARD, borderRadius: 20, padding: 32, borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  emptySub:   { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
  emptyBtn:       { marginTop: 8, borderRadius: 24, overflow: 'hidden' },
  emptyBtnGrad:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText:   { fontSize: 14, fontWeight: '700', color: '#000' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:   { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, maxHeight: '85%' },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle:   { fontSize: 20, fontWeight: '800', color: TEXT },
  closeBtn:     { padding: 4 },

  fieldLabel:   { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  textInput:    { backgroundColor: BG, borderRadius: 12, padding: 14, color: TEXT, fontSize: 15, borderWidth: 1, borderColor: BORDER },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  chipActive:     { backgroundColor: TEAL, borderColor: TEAL },
  chipText:       { fontSize: 13, color: MUTED, fontWeight: '600' },
  chipTextActive: { color: '#000', fontWeight: '700' },

  saveBtn:         { borderRadius: 14, overflow: 'hidden', marginTop: 28 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnGrad:     { paddingVertical: 16, alignItems: 'center' },
  saveBtnText:     { fontSize: 16, fontWeight: '800', color: '#000' },
});
