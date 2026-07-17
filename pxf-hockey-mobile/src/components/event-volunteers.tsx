import { useEffect, useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, TextInput, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

// ── Preset roles ─────────────────────────────────────────────────────────────
export const VOLUNTEER_PRESET_ROLES = [
  'Clock', 'Scorekeeper', 'Music', 'Bench Helper', 'On-Ice Helper', 'Custom',
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type Position = {
  id: string;
  role_name: string;
  spots_total: number;
  notes: string | null;
  signups: Signup[];
};

type Signup = {
  id: string;
  signup_name: string;
};

export interface EventVolunteersProps {
  entityType: 'session' | 'game';
  entityId: string;
  /** teamId is required to write positions. If null/undefined the section is hidden. */
  teamId: string | null | undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function EventVolunteers({ entityType, entityId, teamId }: EventVolunteersProps) {
  const [positions,  setPositions]  = useState<Position[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [selRoles,   setSelRoles]   = useState<string[]>([]);
  const [customRole, setCustomRole] = useState('');
  const [spots,      setSpots]      = useState('2');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [addingTo,   setAddingTo]   = useState<Position | null>(null);
  const [signupName, setSignupName] = useState('');

  async function load() {
    const { data: posRows } = await supabase
      .from('team_positions')
      .select('id, role_name, spots_total, notes')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });

    if (!posRows || posRows.length === 0) {
      setPositions([]);
      setLoading(false);
      return;
    }

    const posIds = posRows.map((p: any) => p.id);
    const { data: signupRows } = await supabase
      .from('position_signups')
      .select('id, position_id, signup_name')
      .in('position_id', posIds);

    const signupMap: Record<string, Signup[]> = {};
    (signupRows ?? []).forEach((s: any) => {
      if (!signupMap[s.position_id]) signupMap[s.position_id] = [];
      signupMap[s.position_id].push({ id: s.id, signup_name: s.signup_name });
    });

    setPositions((posRows as any[]).map(p => ({ ...p, signups: signupMap[p.id] ?? [] })));
    setLoading(false);
  }

  useEffect(() => {
    if (teamId && entityId) void load();
  }, [entityId, teamId]);

  function toggleRole(role: string) {
    setSelRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }

  function closeAdd() {
    setShowAdd(false);
    setSelRoles([]);
    setCustomRole('');
    setSpots('2');
    setNotes('');
  }

  async function handleSave() {
    if (!teamId) return;
    const rolesToCreate: string[] = selRoles.flatMap(r =>
      r === 'Custom' ? (customRole.trim() ? [customRole.trim()] : []) : [r]
    );
    if (rolesToCreate.length === 0) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const rows = rolesToCreate.map(r => ({
      team_id:     teamId,
      owner_id:    user.id,
      entity_type: entityType,
      entity_id:   entityId,
      role_name:   r,
      spots_total: parseInt(spots, 10) || 1,
      notes:       notes.trim() || null,
    }));

    const { error } = await supabase.from('team_positions').insert(rows);
    if (!error) {
      closeAdd();
      void load();
    }
    setSaving(false);
  }

  async function handleDelete(posId: string) {
    Alert.alert('Delete Position?', 'This will remove all signups too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('team_positions').delete().eq('id', posId);
        void load();
      }},
    ]);
  }

  async function handleAddSignup() {
    if (!addingTo || !signupName.trim() || !teamId) return;
    await supabase.from('position_signups').insert({
      position_id: addingTo.id,
      team_id:     teamId,
      signup_name: signupName.trim(),
    });
    setAddingTo(null);
    setSignupName('');
    void load();
  }

  async function handleRemoveSignup(signupId: string) {
    await supabase.from('position_signups').delete().eq('id', signupId);
    void load();
  }

  // Don't render without a team context (can't write positions)
  if (!teamId) return null;

  const hasCustom = selRoles.includes('Custom');
  const canSave   = selRoles.length > 0 && (hasCustom ? customRole.trim().length > 0 : true);

  return (
    <View style={ev.section}>
      {/* Header */}
      <View style={ev.hdr}>
        <ThemedText style={ev.hdrLabel}>VOLUNTEERS</ThemedText>
        <TouchableOpacity style={ev.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color={TEAL} />
          <ThemedText style={ev.addBtnTxt}>Add Slot</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} />
      ) : positions.length === 0 ? (
        <TouchableOpacity style={ev.empty} onPress={() => setShowAdd(true)} activeOpacity={0.8}>
          <Ionicons name="hand-left-outline" size={18} color={MUTED} />
          <ThemedText style={ev.emptyTxt}>No volunteer slots — tap to add</ThemedText>
        </TouchableOpacity>
      ) : positions.map(pos => {
        const filled = pos.signups.length;
        const open   = pos.spots_total - filled;
        const isFull = open <= 0;
        return (
          <View key={pos.id} style={ev.posCard}>
            <View style={ev.posTop}>
              <View style={{ flex: 1 }}>
                <ThemedText style={ev.posRole}>{pos.role_name}</ThemedText>
                <ThemedText style={[ev.posStatus, { color: isFull ? GREEN : ORANGE }]}>
                  {isFull
                    ? `Full · ${filled}/${pos.spots_total}`
                    : `${open} open · ${filled}/${pos.spots_total} filled`}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {!isFull && (
                  <TouchableOpacity
                    style={ev.signupBtn}
                    onPress={() => { setAddingTo(pos); setSignupName(''); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-add-outline" size={13} color={TEAL} />
                    <ThemedText style={ev.signupBtnTxt}>Add</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => void handleDelete(pos.id)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={14} color={MUTED} />
                </TouchableOpacity>
              </View>
            </View>

            {pos.notes ? (
              <ThemedText style={[ev.posStatus, { fontStyle: 'italic', marginTop: 4 }]}>{pos.notes}</ThemedText>
            ) : null}

            {pos.signups.length > 0 && (
              <View style={ev.signupList}>
                {pos.signups.map((sig, i) => (
                  <View
                    key={sig.id}
                    style={[ev.signupRow, i < pos.signups.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }]}
                  >
                    <Ionicons name="checkmark-circle" size={13} color={GREEN} />
                    <ThemedText style={ev.signupName}>{sig.signup_name}</ThemedText>
                    <TouchableOpacity onPress={() => void handleRemoveSignup(sig.id)} style={{ marginLeft: 'auto' }}>
                      <Ionicons name="close-circle-outline" size={15} color={MUTED} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* ── Add Position Modal ────────────────────────────────────────────── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={closeAdd}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={ev.overlay} activeOpacity={1} onPress={closeAdd} />
          <View style={ev.sheet}>
            <View style={ev.handle} />
            <View style={ev.sheetHdr}>
              <ThemedText style={ev.sheetTitle}>Add Volunteer Slot</ThemedText>
              <TouchableOpacity onPress={closeAdd} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <ThemedText style={ev.label}>ROLE — select all that apply</ThemedText>
              <View style={ev.chipWrap}>
                {VOLUNTEER_PRESET_ROLES.map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[ev.chip, selRoles.includes(role) && ev.chipOn]}
                    onPress={() => toggleRole(role)}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[ev.chipTxt, selRoles.includes(role) && ev.chipTxtOn]}>
                      {role}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {hasCustom && (
                <>
                  <ThemedText style={ev.label}>CUSTOM ROLE NAME</ThemedText>
                  <TextInput
                    style={ev.input}
                    value={customRole}
                    onChangeText={setCustomRole}
                    placeholder="e.g. Water Bottle Helper"
                    placeholderTextColor={MUTED}
                    autoCapitalize="words"
                  />
                </>
              )}

              <ThemedText style={ev.label}>SPOTS PER ROLE</ThemedText>
              <View style={ev.chipWrap}>
                {['1', '2', '3', '4', '5'].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[ev.chip, spots === n && ev.chipOn]}
                    onPress={() => setSpots(n)}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={[ev.chipTxt, spots === n && ev.chipTxtOn]}>{n}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={ev.label}>
                NOTES{' '}
                <ThemedText style={{ color: MUTED, fontWeight: '400', letterSpacing: 0 }}>(optional)</ThemedText>
              </ThemedText>
              <TextInput
                style={ev.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Must arrive 30 min early"
                placeholderTextColor={MUTED}
                autoCapitalize="sentences"
              />

              <TouchableOpacity
                style={[ev.saveBtn, (!canSave || saving) && { opacity: 0.4 }]}
                onPress={() => void handleSave()}
                disabled={!canSave || saving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ev.saveBtnGrad}>
                  {saving ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <ThemedText style={ev.saveBtnTxt}>
                      {selRoles.length > 1 ? `Add ${selRoles.length} Positions` : 'Add Position'}
                    </ThemedText>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Signup Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={!!addingTo}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingTo(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={ev.overlay} activeOpacity={1} onPress={() => setAddingTo(null)} />
          <View style={[ev.sheet, { maxHeight: 300 }]}>
            <View style={ev.handle} />
            <ThemedText style={[ev.sheetTitle, { marginBottom: 4 }]}>Add Volunteer</ThemedText>
            <ThemedText style={[ev.posStatus, { marginBottom: 12 }]}>for: {addingTo?.role_name}</ThemedText>
            <TextInput
              style={[ev.input, { marginBottom: 16 }]}
              value={signupName}
              onChangeText={setSignupName}
              placeholder="Parent / volunteer name"
              placeholderTextColor={MUTED}
              autoCapitalize="words"
              autoFocus
            />
            <TouchableOpacity
              style={[ev.saveBtn, !signupName.trim() && { opacity: 0.4 }]}
              onPress={() => void handleAddSignup()}
              disabled={!signupName.trim()}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ev.saveBtnGrad}>
                <ThemedText style={ev.saveBtnTxt}>Confirm</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ev = StyleSheet.create({
  section:      { marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  hdr:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hdrLabel:     { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(0,196,180,0.35)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnTxt:    { fontSize: 12, fontWeight: '700', color: TEAL },
  empty:        { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyTxt:     { fontSize: 13, color: MUTED },
  posCard:      { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 8 },
  posTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  posRole:      { fontSize: 14, fontWeight: '700', color: TEXT },
  posStatus:    { fontSize: 12, color: ORANGE, marginTop: 2, lineHeight: 16 },
  signupBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)' },
  signupBtnTxt: { fontSize: 11, fontWeight: '700', color: TEAL },
  signupList:   { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden' },
  signupRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7 },
  signupName:   { fontSize: 13, fontWeight: '600', color: TEXT, flex: 1 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:        { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, maxHeight: '85%' },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  sheetHdr:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle:   { fontSize: 20, fontWeight: '800', color: TEXT },
  label:        { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  chipOn:       { backgroundColor: '#0D2A24', borderColor: TEAL },
  chipTxt:      { fontSize: 13, color: MUTED, fontWeight: '600' },
  chipTxtOn:    { color: TEAL, fontWeight: '700' },
  input:        { backgroundColor: BG, borderRadius: 12, padding: 14, color: TEXT, fontSize: 15, borderWidth: 1, borderColor: BORDER },
  saveBtn:      { borderRadius: 14, overflow: 'hidden', marginTop: 28 },
  saveBtnGrad:  { paddingVertical: 16, alignItems: 'center' },
  saveBtnTxt:   { fontSize: 16, fontWeight: '800', color: '#000' },
});
