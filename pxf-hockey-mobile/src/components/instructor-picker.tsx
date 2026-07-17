/**
 * InstructorPicker — reusable component for assigning instructors to any entity.
 *
 * Usage:
 *   <InstructorPicker entityType="camp"              entityId={camp.id} />
 *   <InstructorPicker entityType="session"           entityId={session.id} />
 *   <InstructorPicker entityType="camp_day_activity" entityId={activity.id} compact />
 *
 * DB tables:
 *   staff_members:          id, owner_id, name, role, is_self, hourly_rate
 *   instructor_assignments: id, owner_id, entity_type, entity_id, staff_member_id,
 *                           rate_per_hour, hours
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Modal, ScrollView,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const RED    = '#EF4444';

export type EntityType = 'camp' | 'session' | 'camp_day_activity';

type StaffMember = {
  id: string;
  name: string;
  role: string;
  is_self: boolean;
  hourly_rate: number | null;
};

type Assignment = {
  id: string;
  rate_per_hour: number | null;
  hours: number;
  staff_member: StaffMember | null;
};

const ROLE_LABELS: Record<string, string> = {
  head_coach:   'Head Coach',
  assistant:    'Assistant Coach',
  trainer:      'Trainer',
  goalie_coach: 'Goalie Coach',
  skills:       'Skills Coach',
  operations:   'Operations',
  front_desk:   'Front Desk',
  marketing:    'Marketing',
  accountant:   'Accountant',
  contractor:   'Contractor',
  other:        'Staff',
};

function roleLabel(r: string) { return ROLE_LABELS[r] ?? r; }

function initials(name: string) {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

/** Effective rate for an assignment — override first, then staff default */
function effectiveRate(a: Assignment): number | null {
  return a.rate_per_hour ?? a.staff_member?.hourly_rate ?? null;
}

function fmtCost(rate: number | null, hours: number): string | null {
  if (rate === null) return null;
  const total = rate * hours;
  return `$${total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}`;
}

type Props = {
  entityType: EntityType;
  entityId: string;
  compact?: boolean;
  /** For camp assignments: number of days to multiply rate×hours by for total cost display */
  daysCount?: number;
  style?: any;
};

export function InstructorPicker({ entityType, entityId, compact = false, daysCount = 1, style }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staff,       setStaff]       = useState<StaffMember[]>([]);
  const [showModal,   setShowModal]   = useState(false);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  // Confirm-assignment step (within the picker modal)
  const [confirmMember, setConfirmMember] = useState<StaffMember | null>(null);
  const [confirmRate,   setConfirmRate]   = useState('');
  const [confirmHours,  setConfirmHours]  = useState('1');

  // Edit-assignment step (for existing assigned instructors)
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [editRate,       setEditRate]       = useState('');
  const [editHours,      setEditHours]      = useState('');
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [editSaving,     setEditSaving]     = useState(false);

  const loadAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: asgns }, { data: staffData }] = await Promise.all([
      supabase
        .from('instructor_assignments')
        .select('id, rate_per_hour, hours, staff_member:staff_members(id, name, role, is_self, hourly_rate)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('owner_id', user.id),
      supabase
        .from('staff_members')
        .select('id, name, role, is_self, hourly_rate')
        .eq('owner_id', user.id)
        .order('is_self', { ascending: false })
        .order('name'),
    ]);

    setAssignments((asgns ?? []).map((a: any) => ({
      ...a,
      hours: a.hours ?? 1,
      staff_member: a.staff_member ?? null,
    })));
    setStaff(staffData ?? []);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function ensureSelfExists(uid: string): Promise<StaffMember | null> {
    const existing = staff.find(s => s.is_self);
    if (existing) return existing;

    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', uid).single();
    const name = profile?.full_name ?? 'You';

    const { data, error } = await supabase
      .from('staff_members')
      .insert({ owner_id: uid, name, role: 'head_coach', is_self: true })
      .select('id, name, role, is_self, hourly_rate')
      .single();

    if (error) return null;
    setStaff(prev => [data as StaffMember, ...prev]);
    return data as StaffMember;
  }

  async function openModal() {
    if (!userId) return;
    await ensureSelfExists(userId);
    setConfirmMember(null);
    setShowModal(true);
  }

  function selectMember(member: StaffMember) {
    setConfirmMember(member);
    setConfirmRate(member.hourly_rate != null ? String(member.hourly_rate) : '');
    setConfirmHours('1');
  }

  async function confirmAssign() {
    if (!userId || !confirmMember) return;
    setSaving(true);
    const rate  = confirmRate.trim() ? parseFloat(confirmRate) : null;
    const hours = parseFloat(confirmHours) || 1;

    const { error } = await supabase.from('instructor_assignments').insert({
      owner_id:       userId,
      entity_type:    entityType,
      entity_id:      entityId,
      staff_member_id: confirmMember.id,
      rate_per_hour:  rate,
      hours,
    });

    setSaving(false);
    if (error && !error.code?.includes('23505')) {
      Alert.alert('Error', error.message);
    }
    setConfirmMember(null);
    await loadAll();
    setShowModal(false);
  }

  async function unassign(assignmentId: string) {
    await supabase.from('instructor_assignments').delete().eq('id', assignmentId);
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  }

  function openEditAssignment(a: Assignment) {
    setEditAssignment(a);
    const rate = effectiveRate(a);
    setEditRate(rate != null ? String(rate) : '');
    setEditHours(String(a.hours ?? 1));
    setShowEditModal(true);
  }

  async function saveEditAssignment() {
    if (!editAssignment) return;
    setEditSaving(true);
    const rate  = editRate.trim() ? parseFloat(editRate) : null;
    const hours = parseFloat(editHours) || 1;
    await supabase.from('instructor_assignments')
      .update({ rate_per_hour: rate, hours })
      .eq('id', editAssignment.id);
    setEditSaving(false);
    setShowEditModal(false);
    setEditAssignment(null);
    await loadAll();
  }

  const assignedIds = new Set(assignments.map(a => a.staff_member?.id).filter(Boolean));
  const available   = staff.filter(s => !assignedIds.has(s.id));
  const hasAny      = assignments.length > 0;

  if (loading) return null;

  // ── COMPACT ──────────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <View style={[cs.root, style]}>
        <View style={cs.row}>
          <Ionicons name="person-outline" size={12} color={hasAny ? TEAL : ORANGE} />
          {hasAny
            ? assignments.map(a => {
                const cost = fmtCost(effectiveRate(a), a.hours);
                return (
                  <View key={a.id} style={cs.chip}>
                    <ThemedText style={cs.chipText}>
                      {a.staff_member?.is_self ? 'You' : a.staff_member?.name ?? '—'}
                      {cost ? ` · ${cost}` : ''}
                    </ThemedText>
                    <TouchableOpacity onPress={() => unassign(a.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="close-circle" size={13} color={MUTED} />
                    </TouchableOpacity>
                  </View>
                );
              })
            : <ThemedText style={cs.noInstructor}>No instructor assigned</ThemedText>
          }
          <TouchableOpacity onPress={openModal} style={cs.addBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="add-circle-outline" size={15} color={TEAL} />
          </TouchableOpacity>
        </View>

        {/* Picker + confirm modals */}
        <PickerModal
          visible={showModal}
          confirmMember={confirmMember}
          confirmRate={confirmRate}
          confirmHours={confirmHours}
          available={available}
          saving={saving}
          onSelectMember={selectMember}
          onConfirm={confirmAssign}
          onBack={() => setConfirmMember(null)}
          onClose={() => { setShowModal(false); setConfirmMember(null); }}
          onChangeRate={setConfirmRate}
          onChangeHours={setConfirmHours}
        />
      </View>
    );
  }

  // ── FULL ─────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, style]}>
      <View style={s.header}>
        <Ionicons name="person-circle-outline" size={16} color={TEAL} />
        <ThemedText style={s.headerLabel}>INSTRUCTORS</ThemedText>
      </View>

      {!hasAny ? (
        <TouchableOpacity style={s.warningRow} onPress={openModal} activeOpacity={0.8}>
          <View style={s.warningLeft}>
            <Ionicons name="warning-outline" size={18} color={ORANGE} />
            <ThemedText style={s.warningText}>No instructor assigned</ThemedText>
          </View>
          <View style={s.assignBtn}>
            <ThemedText style={s.assignBtnText}>Assign</ThemedText>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={s.assignedList}>
          {assignments.map(a => {
            const m    = a.staff_member;
            if (!m) return null;
            const rate      = effectiveRate(a);
            const totalCost = fmtCost(rate, a.hours * daysCount);
            const perDay    = daysCount > 1 ? fmtCost(rate, a.hours) : null;
            return (
              <View key={a.id} style={s.instructorRow}>
                <View style={s.avatar}>
                  <ThemedText style={s.avatarText}>{initials(m.name)}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.instructorName}>
                    {m.is_self ? `${m.name} (You)` : m.name}
                  </ThemedText>
                  <ThemedText style={s.instructorRole}>
                    {roleLabel(m.role)}
                    {totalCost
                      ? daysCount > 1
                        ? ` · ${totalCost} (${perDay}/session × ${daysCount})`
                        : ` · ${totalCost}${a.hours !== 1 ? ` (${a.hours}hr)` : ''}`
                      : ''}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={() => openEditAssignment(a)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginRight: 8 }}
                >
                  <Ionicons name="pencil-outline" size={16} color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => unassign(a.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="remove-circle-outline" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={s.addAnotherBtn} onPress={openModal} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={15} color={TEAL} />
            <ThemedText style={s.addAnotherText}>Add Instructor</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <PickerModal
        visible={showModal}
        confirmMember={confirmMember}
        confirmRate={confirmRate}
        confirmHours={confirmHours}
        available={available}
        saving={saving}
        onSelectMember={selectMember}
        onConfirm={confirmAssign}
        onBack={() => setConfirmMember(null)}
        onClose={() => { setShowModal(false); setConfirmMember(null); }}
        onChangeRate={setConfirmRate}
        onChangeHours={setConfirmHours}
      />

      {/* Edit assignment rate/hours modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.sheetHeader}>
              <ThemedText style={m.sheetTitle}>Edit Rate</ThemedText>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
            {editAssignment && (
              <View style={{ padding: 20, gap: 14 }}>
                <ThemedText style={m.staffName}>
                  {editAssignment.staff_member?.is_self
                    ? `${editAssignment.staff_member.name} (You)`
                    : editAssignment.staff_member?.name ?? '—'}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={m.inputLabel}>Rate ($/hr)</ThemedText>
                    <TextInput
                      style={m.rateInput}
                      value={editRate}
                      onChangeText={setEditRate}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 50"
                      placeholderTextColor={MUTED}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={m.inputLabel}>Hours</ThemedText>
                    <TextInput
                      style={m.rateInput}
                      value={editHours}
                      onChangeText={setEditHours}
                      keyboardType="decimal-pad"
                      placeholder="1"
                      placeholderTextColor={MUTED}
                    />
                  </View>
                </View>
                {editRate.trim() && (
                  <ThemedText style={m.costPreview}>
                    Total: {fmtCost(parseFloat(editRate) || 0, parseFloat(editHours) || 1)}
                  </ThemedText>
                )}
                <TouchableOpacity style={m.confirmBtn} onPress={saveEditAssignment} disabled={editSaving}>
                  {editSaving
                    ? <ActivityIndicator color={BG} size="small" />
                    : <ThemedText style={m.confirmBtnText}>Save</ThemedText>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Picker + confirm modal ────────────────────────────────────────────────────
type PickerModalProps = {
  visible: boolean;
  confirmMember: StaffMember | null;
  confirmRate: string;
  confirmHours: string;
  available: StaffMember[];
  saving: boolean;
  onSelectMember: (m: StaffMember) => void;
  onConfirm: () => void;
  onBack: () => void;
  onClose: () => void;
  onChangeRate: (v: string) => void;
  onChangeHours: (v: string) => void;
};

function PickerModal({
  visible, confirmMember, confirmRate, confirmHours,
  available, saving, onSelectMember, onConfirm, onBack, onClose,
  onChangeRate, onChangeHours,
}: PickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <View style={m.handle} />
          <View style={m.sheetHeader}>
            {confirmMember
              ? <TouchableOpacity onPress={onBack}>
                  <Ionicons name="chevron-back" size={22} color={MUTED} />
                </TouchableOpacity>
              : <View style={{ width: 22 }} />
            }
            <ThemedText style={m.sheetTitle}>
              {confirmMember ? 'Set Rate' : 'Assign Instructor'}
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          {saving ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={TEAL} />
            </View>
          ) : confirmMember ? (
            /* ── Rate / hours confirm step ── */
            <View style={{ padding: 20, gap: 14 }}>
              <View style={m.confirmWho}>
                <View style={m.staffAvatar}>
                  <ThemedText style={m.staffAvatarText}>{initials(confirmMember.name)}</ThemedText>
                </View>
                <View>
                  <ThemedText style={m.staffName}>
                    {confirmMember.is_self ? `${confirmMember.name} (You)` : confirmMember.name}
                  </ThemedText>
                  <ThemedText style={m.staffRole}>{roleLabel(confirmMember.role)}</ThemedText>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={m.inputLabel}>Rate ($/hr)</ThemedText>
                  <TextInput
                    style={m.rateInput}
                    value={confirmRate}
                    onChangeText={onChangeRate}
                    keyboardType="decimal-pad"
                    placeholder={confirmMember.hourly_rate != null ? String(confirmMember.hourly_rate) : 'e.g. 50'}
                    placeholderTextColor={MUTED}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={m.inputLabel}>Hours</ThemedText>
                  <TextInput
                    style={m.rateInput}
                    value={confirmHours}
                    onChangeText={onChangeHours}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={MUTED}
                  />
                </View>
              </View>

              {confirmRate.trim() && (
                <ThemedText style={m.costPreview}>
                  Total: {fmtCost(parseFloat(confirmRate) || 0, parseFloat(confirmHours) || 1)}
                </ThemedText>
              )}

              <ThemedText style={m.rateHint}>
                Most sessions = 1 hr. Adjust hours for longer camps.
              </ThemedText>

              <TouchableOpacity style={m.confirmBtn} onPress={onConfirm}>
                <ThemedText style={m.confirmBtnText}>Assign Instructor</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Staff list ── */
            <ScrollView style={{ maxHeight: 420 }}>
              {available.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 }}>
                  <Ionicons name="people-outline" size={32} color={MUTED} />
                  <ThemedText style={{ color: MUTED, textAlign: 'center', lineHeight: 22 }}>
                    All staff already assigned.{'\n'}Add more in Business → Staff.
                  </ThemedText>
                </View>
              ) : (
                available.map((member, i) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[m.staffRow, i > 0 && { borderTopWidth: 1, borderTopColor: BORDER }]}
                    onPress={() => onSelectMember(member)}
                    activeOpacity={0.8}
                  >
                    <View style={m.staffAvatar}>
                      <ThemedText style={m.staffAvatarText}>{initials(member.name)}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ThemedText style={m.staffName}>
                          {member.is_self ? `${member.name} (You)` : member.name}
                        </ThemedText>
                        {member.is_self && (
                          <View style={m.selfBadge}>
                            <ThemedText style={m.selfBadgeText}>YOU</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={m.staffRole}>
                        {roleLabel(member.role)}
                        {member.hourly_rate != null ? ` · $${member.hourly_rate}/hr` : ''}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={MUTED} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5 },

  warningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  warningLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningText: { fontSize: 14, color: ORANGE, fontWeight: '600' },
  assignBtn: { backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  assignBtnText: { fontSize: 12, fontWeight: '700', color: ORANGE },

  assignedList: { paddingVertical: 4 },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,196,180,0.18)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: TEAL },
  instructorName: { fontSize: 14, fontWeight: '700', color: TEXT },
  instructorRole: { fontSize: 12, color: MUTED, marginTop: 1 },
  addAnotherBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  addAnotherText: { fontSize: 13, color: TEAL, fontWeight: '600' },
});

const cs = StyleSheet.create({
  root: {},
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  chipText: { fontSize: 11, fontWeight: '700', color: TEAL },
  noInstructor: { fontSize: 11, color: ORANGE, fontWeight: '600' },
  addBtn: {},
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: TEXT },

  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  staffAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,196,180,0.15)', alignItems: 'center', justifyContent: 'center' },
  staffAvatarText: { fontSize: 15, fontWeight: '800', color: TEAL },
  staffName: { fontSize: 15, fontWeight: '700', color: TEXT },
  staffRole: { fontSize: 12, color: MUTED, marginTop: 2 },
  selfBadge: { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  selfBadgeText: { fontSize: 9, fontWeight: '900', color: TEAL, letterSpacing: 0.5 },

  confirmWho: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6 },
  rateInput: {
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 16, color: TEXT, fontWeight: '600',
  },
  costPreview: { fontSize: 14, color: TEAL, fontWeight: '700' },
  rateHint: { fontSize: 11, color: MUTED, lineHeight: 16 },
  confirmBtn: {
    backgroundColor: TEAL, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: BG },

  // Edit assignment modal reuses these
});
