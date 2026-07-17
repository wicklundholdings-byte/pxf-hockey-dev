import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const VIOLET = '#A78BFA';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

// ── Types ────────────────────────────────────────────────────

type AppRole = 'admin' | 'manager' | 'instructor' | 'front_desk' | null;
type StaffStatus = 'contact' | 'invited' | 'active' | 'inactive';

type JobRole =
  | 'operations'
  | 'front_desk'
  | 'marketing'
  | 'accountant'
  | 'contractor'
  | 'other';

interface StaffMember {
  id: string;
  name: string;
  role: JobRole;
  app_role: AppRole;
  status: StaffStatus;
  email: string | null;
  phone: string | null;
  hourly_rate: number | null;
  is_self: boolean;
  invited_at: string | null;
  joined_at: string | null;
}

// ── Constants ────────────────────────────────────────────────

const JOB_ROLES: { key: JobRole; label: string }[] = [
  { key: 'operations',  label: 'Operations Manager' },
  { key: 'front_desk',  label: 'Front Desk / Admin' },
  { key: 'marketing',   label: 'Marketing / Media' },
  { key: 'accountant',  label: 'Accountant / Finance' },
  { key: 'contractor',  label: 'Contractor' },
  { key: 'other',       label: 'Other' },
];

const APP_ROLES: { key: AppRole; label: string; color: string; desc: string }[] = [
  {
    key: null,
    label: 'No app access',
    color: MUTED,
    desc: 'Contact only — used for assignments, no login.',
  },
  {
    key: 'admin',
    label: 'Admin',
    color: ORANGE,
    desc: 'Full access except billing and staff management.',
  },
  {
    key: 'manager',
    label: 'Manager',
    color: GREEN,
    desc: 'Camps, schedule, ice management, teams, contacts, campaigns. No financials.',
  },
  {
    key: 'instructor',
    label: 'Instructor',
    color: '#38BDF8',
    desc: 'Own assignments only: camps, sessions, playbook, inbox.',
  },
  {
    key: 'front_desk',
    label: 'Front Desk',
    color: VIOLET,
    desc: 'Camp check-in, contacts (view only), inbox.',
  },
];

// Permission details per role — shown in the role picker
const PERMISSIONS: Record<
  string,
  { section: string; features: { name: string; access: 'full' | 'partial' | 'none' }[] }[]
> = {
  admin: [
    {
      section: 'Business',
      features: [
        { name: 'Dashboard', access: 'full' },
        { name: 'Camps (create, edit, manage)', access: 'full' },
        { name: 'Schedule & events', access: 'full' },
        { name: 'Ice Management', access: 'full' },
        { name: 'Financials (P&L, revenue)', access: 'full' },
        { name: 'Contacts / CRM', access: 'full' },
        { name: 'Campaigns', access: 'full' },
      ],
    },
    {
      section: 'Coaching',
      features: [
        { name: 'Teams (roster, schedule)', access: 'full' },
        { name: 'Playbook (drills)', access: 'full' },
        { name: 'Inbox', access: 'full' },
        { name: 'Film', access: 'full' },
      ],
    },
    {
      section: 'Restricted (owner only)',
      features: [
        { name: 'Staff management', access: 'none' },
        { name: 'Billing / subscription', access: 'none' },
      ],
    },
  ],
  manager: [
    {
      section: 'Business',
      features: [
        { name: 'Dashboard (no revenue)', access: 'partial' },
        { name: 'Camps (create, edit, manage)', access: 'full' },
        { name: 'Schedule & events', access: 'full' },
        { name: 'Ice Management (full)', access: 'full' },
        { name: 'Contacts / CRM', access: 'full' },
        { name: 'Campaigns', access: 'full' },
        { name: 'Financials', access: 'none' },
      ],
    },
    {
      section: 'Coaching',
      features: [
        { name: 'Teams (roster, schedule)', access: 'full' },
        { name: 'Playbook (drills)', access: 'full' },
        { name: 'Inbox', access: 'full' },
        { name: 'Film', access: 'full' },
      ],
    },
  ],
  instructor: [
    {
      section: 'Business',
      features: [
        { name: 'Dashboard (own sessions)', access: 'partial' },
        { name: 'Camps (own assignments)', access: 'partial' },
        { name: 'Schedule (own sessions)', access: 'partial' },
        { name: 'Ice Management', access: 'none' },
        { name: 'Financials', access: 'none' },
        { name: 'Contacts', access: 'none' },
        { name: 'Campaigns', access: 'none' },
      ],
    },
    {
      section: 'Coaching',
      features: [
        { name: 'Teams (own assignments)', access: 'partial' },
        { name: 'Playbook (drills)', access: 'full' },
        { name: 'Inbox', access: 'full' },
        { name: 'Film', access: 'full' },
      ],
    },
  ],
  front_desk: [
    {
      section: 'Business',
      features: [
        { name: 'Camps (check-in, view registrations)', access: 'partial' },
        { name: 'Schedule (view only)', access: 'partial' },
        { name: 'Contacts (view only)', access: 'partial' },
        { name: 'Financials', access: 'none' },
        { name: 'Ice Management', access: 'none' },
        { name: 'Campaigns', access: 'none' },
      ],
    },
    {
      section: 'Coaching',
      features: [
        { name: 'Teams', access: 'none' },
        { name: 'Playbook', access: 'none' },
        { name: 'Inbox', access: 'full' },
        { name: 'Film', access: 'none' },
      ],
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────

function getJobRoleLabel(key: JobRole) {
  return JOB_ROLES.find(r => r.key === key)?.label ?? key;
}

function getAppRoleMeta(key: AppRole) {
  return APP_ROLES.find(r => r.key === key) ?? APP_ROLES[0];
}

function getStatusColor(status: StaffStatus) {
  switch (status) {
    case 'active':   return GREEN;
    case 'invited':  return ORANGE;
    case 'inactive': return RED;
    default:         return MUTED;
  }
}

function getStatusLabel(status: StaffStatus) {
  switch (status) {
    case 'active':   return 'Active';
    case 'invited':  return 'Invited';
    case 'inactive': return 'Inactive';
    default:         return 'Contact';
  }
}

// ── Component ────────────────────────────────────────────────

export default function StaffScreen() {
  const router = useRouter();

  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);

  // Modal fields
  const [mName,    setMName]    = useState('');
  const [mEmail,   setMEmail]   = useState('');
  const [mPhone,   setMPhone]   = useState('');
  const [mRate,    setMRate]    = useState('');
  const [mJobRole, setMJobRole] = useState<JobRole>('operations');
  const [mAppRole, setMAppRole] = useState<AppRole>(null);
  const [mSaving,  setMSaving]  = useState(false);

  // Role picker overlay
  const [showRolePicker, setShowRolePicker] = useState<'job' | 'app' | null>(null);

  // Detail/permissions view
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Data loading ─────────────────────────────────────────

  const loadStaff = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('staff_members')
      .select('id, name, role, app_role, status, email, phone, is_self, invited_at, joined_at')
      .eq('owner_id', user.id)
      .eq('is_self', false)
      .order('name');

    setStaff((data as StaffMember[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadStaff(); }, [loadStaff]));

  // ── Modal helpers ─────────────────────────────────────────

  function openAdd() {
    setEditTarget(null);
    setMName(''); setMEmail(''); setMPhone(''); setMRate('');
    setMJobRole('operations'); setMAppRole(null);
    setShowModal(true);
  }

  function openEdit(member: StaffMember) {
    setEditTarget(member);
    setMName(member.name);
    setMEmail(member.email ?? '');
    setMPhone(member.phone ?? '');
    setMRate(member.hourly_rate != null ? String(member.hourly_rate) : '');
    setMJobRole(member.role);
    setMAppRole(member.app_role);
    setShowModal(true);
  }

  async function saveStaff() {
    if (!mName.trim()) { Alert.alert('Name required'); return; }
    setMSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMSaving(false); return; }

    const hasEmail = mEmail.trim().length > 0;
    const newStatus: StaffStatus =
      editTarget
        ? editTarget.status
        : hasEmail && mAppRole ? 'invited' : 'contact';

    const payload = {
      owner_id: user.id,
      name: mName.trim(),
      role: mJobRole,
      app_role: mAppRole,
      email: mEmail.trim() || null,
      phone: mPhone.trim() || null,
      hourly_rate: mRate.trim() ? parseFloat(mRate) : null,
      status: newStatus,
      is_self: false,
      invited_at:
        !editTarget && hasEmail && mAppRole ? new Date().toISOString() : (editTarget?.invited_at ?? null),
    };

    if (editTarget) {
      await supabase.from('staff_members').update(payload).eq('id', editTarget.id);
    } else {
      // Insert and get the new ID so we can fire the invite
      const { data: newRow } = await supabase
        .from('staff_members')
        .insert(payload)
        .select('id')
        .single();

      // Send invite email if they have an email + app role
      if (newRow?.id && mEmail.trim() && mAppRole) {
        try {
          await supabase.functions.invoke('invite-staff', {
            body: { staff_member_id: newRow.id },
          });
        } catch (e) {
          console.warn('Invite send failed:', e);
          // Don't block the save — staff member is saved, invite can be resent
        }
      }
    }

    setMSaving(false);
    setShowModal(false);
    loadStaff();
  }

  async function removeStaff(member: StaffMember) {
    Alert.alert(
      'Remove Staff',
      `Remove ${member.name} from your staff?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await supabase.from('staff_members').delete().eq('id', member.id);
            loadStaff();
          },
        },
      ],
    );
  }

  // ── Stats ─────────────────────────────────────────────────

  const activeCount  = staff.filter(s => s.status === 'active').length;
  const invitedCount = staff.filter(s => s.status === 'invited').length;
  const withAccess   = staff.filter(s => s.app_role != null).length;

  // ── Render ────────────────────────────────────────────────

  const appRoleMeta = getAppRoleMeta(mAppRole);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={TEXT} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <ThemedText style={s.title}>Staff</ThemedText>
              <ThemedText style={s.subtitle}>Business employees & contractors</ThemedText>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={openAdd}>
              <Ionicons name="add" size={20} color={BG} />
              <ThemedText style={s.addBtnText}>Add</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          {staff.length > 0 && (
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <ThemedText style={s.statNum}>{staff.length}</ThemedText>
                <ThemedText style={s.statLabel}>TOTAL</ThemedText>
              </View>
              <View style={s.statCard}>
                <ThemedText style={[s.statNum, { color: GREEN }]}>{activeCount}</ThemedText>
                <ThemedText style={s.statLabel}>ACTIVE</ThemedText>
              </View>
              <View style={s.statCard}>
                <ThemedText style={[s.statNum, { color: ORANGE }]}>{invitedCount}</ThemedText>
                <ThemedText style={s.statLabel}>INVITED</ThemedText>
              </View>
              <View style={s.statCard}>
                <ThemedText style={[s.statNum, { color: VIOLET }]}>{withAccess}</ThemedText>
                <ThemedText style={s.statLabel}>APP ACCESS</ThemedText>
              </View>
            </View>
          )}

          {/* Staff list */}
          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
          ) : staff.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="people-circle-outline" size={44} color={VIOLET} />
              </View>
              <ThemedText style={s.emptyTitle}>No staff yet</ThemedText>
              <ThemedText style={s.emptyDesc}>
                Add employees and contractors. Set their app access role to invite them in.
              </ThemedText>
              <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
                <Ionicons name="add-circle-outline" size={18} color={VIOLET} />
                <ThemedText style={[s.emptyBtnText, { color: VIOLET }]}>Add First Staff Member</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ThemedText style={s.sectionLabel}>STAFF MEMBERS</ThemedText>
              {staff.map(member => {
                const roleMeta    = getAppRoleMeta(member.app_role);
                const isExpanded  = expandedId === member.id;
                const permissions = member.app_role ? PERMISSIONS[member.app_role] : null;

                return (
                  <View key={member.id} style={s.staffCard}>
                    {/* Main row */}
                    <TouchableOpacity
                      style={s.staffRow}
                      activeOpacity={0.7}
                      onPress={() => setExpandedId(isExpanded ? null : member.id)}
                    >
                      {/* Avatar */}
                      <View style={[s.avatar, { backgroundColor: `${roleMeta.color}22`, borderColor: `${roleMeta.color}44` }]}>
                        <ThemedText style={[s.avatarText, { color: roleMeta.color }]}>
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </ThemedText>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, gap: 3 }}>
                        <ThemedText style={s.staffName}>{member.name}</ThemedText>
                        <ThemedText style={s.staffJobRole}>{getJobRoleLabel(member.role)}</ThemedText>

                        {/* Badges */}
                        <View style={s.badgeRow}>
                          <View style={[s.statusBadge, { borderColor: `${getStatusColor(member.status)}44` }]}>
                            <View style={[s.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
                            <ThemedText style={[s.statusText, { color: getStatusColor(member.status) }]}>
                              {getStatusLabel(member.status)}
                            </ThemedText>
                          </View>

                          {member.app_role ? (
                            <View style={[s.roleBadge, { backgroundColor: `${roleMeta.color}18`, borderColor: `${roleMeta.color}40` }]}>
                              <ThemedText style={[s.roleBadgeText, { color: roleMeta.color }]}>
                                {roleMeta.label}
                              </ThemedText>
                            </View>
                          ) : (
                            <View style={[s.roleBadge, { backgroundColor: 'transparent', borderColor: BORDER }]}>
                              <ThemedText style={[s.roleBadgeText, { color: MUTED }]}>No app access</ThemedText>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={s.staffActions}>
                        <TouchableOpacity style={s.actionIcon} onPress={() => openEdit(member)}>
                          <Ionicons name="pencil-outline" size={16} color={MUTED} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actionIcon} onPress={() => removeStaff(member)}>
                          <Ionicons name="trash-outline" size={16} color={RED} />
                        </TouchableOpacity>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={MUTED}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Expanded permissions */}
                    {isExpanded && (
                      <View style={s.permissionsWrap}>
                        {member.email && (
                          <View style={s.permInfoRow}>
                            <Ionicons name="mail-outline" size={14} color={MUTED} />
                            <ThemedText style={s.permInfoText}>{member.email}</ThemedText>
                          </View>
                        )}
                        {member.phone && (
                          <View style={s.permInfoRow}>
                            <Ionicons name="call-outline" size={14} color={MUTED} />
                            <ThemedText style={s.permInfoText}>{member.phone}</ThemedText>
                          </View>
                        )}
                        {member.invited_at && member.status === 'invited' && (
                          <View style={s.permInfoRow}>
                            <Ionicons name="time-outline" size={14} color={ORANGE} />
                            <ThemedText style={[s.permInfoText, { color: ORANGE }]}>
                              Invited {new Date(member.invited_at).toLocaleDateString()}
                            </ThemedText>
                          </View>
                        )}

                        {permissions ? (
                          <>
                            <ThemedText style={s.permTitle}>
                              {roleMeta.label} permissions
                            </ThemedText>
                            {permissions.map(section => (
                              <View key={section.section} style={{ marginBottom: 10 }}>
                                <ThemedText style={s.permSection}>{section.section}</ThemedText>
                                {section.features.map(f => (
                                  <View key={f.name} style={s.permFeatureRow}>
                                    <Ionicons
                                      name={
                                        f.access === 'full'    ? 'checkmark-circle' :
                                        f.access === 'partial' ? 'remove-circle'    :
                                        'close-circle'
                                      }
                                      size={14}
                                      color={
                                        f.access === 'full'    ? GREEN  :
                                        f.access === 'partial' ? ORANGE :
                                        BORDER
                                      }
                                    />
                                    <ThemedText style={[
                                      s.permFeatureText,
                                      f.access === 'none' && { color: MUTED },
                                    ]}>
                                      {f.name}
                                    </ThemedText>
                                  </View>
                                ))}
                              </View>
                            ))}
                          </>
                        ) : (
                          <View style={s.noAccessNote}>
                            <Ionicons name="phone-portrait-outline" size={16} color={MUTED} />
                            <ThemedText style={s.noAccessText}>
                              This staff member is a contact only — they can be assigned to camps and sessions but don't have app access.
                              Edit their profile to grant a role.
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* Roles reference */}
          <ThemedText style={[s.sectionLabel, { marginTop: 28 }]}>APP ROLES EXPLAINED</ThemedText>
          {APP_ROLES.filter(r => r.key !== null).map(role => (
            <View key={role.key} style={s.roleRefCard}>
              <View style={[s.roleRefDot, { backgroundColor: role.color }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[s.roleRefName, { color: role.color }]}>{role.label}</ThemedText>
                <ThemedText style={s.roleRefDesc}>{role.desc}</ThemedText>
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Add / Edit Modal ─────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={s.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
            <ScrollView
              contentContainerStyle={s.modalContent}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={showRolePicker === null}
            >

              {/* Modal header */}
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <ThemedText style={s.modalCancel}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText style={s.modalTitle}>
                  {editTarget ? 'Edit Staff Member' : 'Add Staff Member'}
                </ThemedText>
                <TouchableOpacity onPress={saveStaff} disabled={mSaving}>
                  {mSaving
                    ? <ActivityIndicator color={TEAL} size="small" />
                    : <ThemedText style={s.modalSave}>Save</ThemedText>
                  }
                </TouchableOpacity>
              </View>

              {/* Name */}
              <ThemedText style={s.fieldLabel}>Name *</ThemedText>
              <TextInput
                style={s.input}
                placeholder="Full name"
                placeholderTextColor={MUTED}
                value={mName}
                onChangeText={setMName}
              />

              {/* Email */}
              <ThemedText style={s.fieldLabel}>Email</ThemedText>
              <TextInput
                style={s.input}
                placeholder="name@example.com"
                placeholderTextColor={MUTED}
                value={mEmail}
                onChangeText={setMEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Phone */}
              <ThemedText style={s.fieldLabel}>Phone</ThemedText>
              <TextInput
                style={s.input}
                placeholder="(555) 000-0000"
                placeholderTextColor={MUTED}
                value={mPhone}
                onChangeText={setMPhone}
                keyboardType="phone-pad"
              />

              {/* Session / Hourly Rate */}
              <ThemedText style={s.fieldLabel}>Session Rate ($/hr)</ThemedText>
              <TextInput
                style={s.input}
                placeholder="e.g. 50"
                placeholderTextColor={MUTED}
                value={mRate}
                onChangeText={setMRate}
                keyboardType="decimal-pad"
              />

              {/* Job Role */}
              <ThemedText style={s.fieldLabel}>Job Role</ThemedText>
              <TouchableOpacity
                style={s.picker}
                onPress={() => setShowRolePicker('job')}
              >
                <ThemedText style={s.pickerValue}>
                  {JOB_ROLES.find(r => r.key === mJobRole)?.label ?? 'Select'}
                </ThemedText>
                <Ionicons name="chevron-down" size={16} color={MUTED} />
              </TouchableOpacity>

              {/* App Role */}
              <ThemedText style={s.fieldLabel}>App Access</ThemedText>
              <TouchableOpacity
                style={[s.picker, mAppRole && { borderColor: `${appRoleMeta.color}55` }]}
                onPress={() => setShowRolePicker('app')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {mAppRole && <View style={[s.rolePickerDot, { backgroundColor: appRoleMeta.color }]} />}
                  <ThemedText style={[s.pickerValue, mAppRole && { color: appRoleMeta.color }]}>
                    {appRoleMeta.label}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-down" size={16} color={MUTED} />
              </TouchableOpacity>

              {/* Role description + invite hint */}
              {mAppRole && (
                <View style={s.roleDescCard}>
                  <ThemedText style={s.roleDescText}>{appRoleMeta.desc}</ThemedText>
                  <ThemedText style={s.roleDescHint}>
                    {mEmail.trim()
                      ? 'An invite link will be sent to their email when saved.'
                      : 'Add an email address to send them an invite.'}
                  </ThemedText>
                </View>
              )}

              {/* Permissions preview */}
              {mAppRole && PERMISSIONS[mAppRole] && (
                <>
                  <ThemedText style={[s.fieldLabel, { marginTop: 20 }]}>
                    What they'll see
                  </ThemedText>
                  {PERMISSIONS[mAppRole].map(section => (
                    <View key={section.section} style={{ marginBottom: 8 }}>
                      <ThemedText style={s.permSection}>{section.section}</ThemedText>
                      {section.features.map(f => (
                        <View key={f.name} style={[s.permFeatureRow, { paddingVertical: 4 }]}>
                          <Ionicons
                            name={
                              f.access === 'full'    ? 'checkmark-circle' :
                              f.access === 'partial' ? 'remove-circle'    :
                              'close-circle'
                            }
                            size={14}
                            color={
                              f.access === 'full'    ? GREEN  :
                              f.access === 'partial' ? ORANGE :
                              BORDER
                            }
                          />
                          <ThemedText style={[
                            s.permFeatureText,
                            f.access === 'none' && { color: MUTED },
                          ]}>
                            {f.name}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ))}
                </>
              )}

            </ScrollView>

            {/* ── Inline Role Picker Overlay ── */}
            {showRolePicker !== null && (
              <View style={s.pickerOverlay}>
                <View style={s.sheetHeader}>
                  <ThemedText style={s.sheetTitle}>
                    {showRolePicker === 'job' ? 'Job Role' : 'App Access Level'}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setShowRolePicker(null)}>
                    <Ionicons name="close" size={22} color={TEXT} />
                  </TouchableOpacity>
                </View>

                <ScrollView>
                  {showRolePicker === 'job' &&
                    JOB_ROLES.map(r => (
                      <TouchableOpacity
                        key={r.key}
                        style={[s.sheetOption, mJobRole === r.key && s.sheetOptionActive]}
                        onPress={() => { setMJobRole(r.key); setShowRolePicker(null); }}
                      >
                        <ThemedText style={[s.sheetOptionText, mJobRole === r.key && { color: TEAL }]}>
                          {r.label}
                        </ThemedText>
                        {mJobRole === r.key && <Ionicons name="checkmark" size={18} color={TEAL} />}
                      </TouchableOpacity>
                    ))
                  }

                  {showRolePicker === 'app' &&
                    APP_ROLES.map(r => (
                      <TouchableOpacity
                        key={r.key ?? '__none'}
                        style={[s.sheetOption, mAppRole === r.key && s.sheetOptionActive]}
                        onPress={() => { setMAppRole(r.key); setShowRolePicker(null); }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {r.key && <View style={[s.rolePickerDot, { backgroundColor: r.color }]} />}
                            <ThemedText style={[s.sheetOptionText, r.key && { color: r.color }]}>
                              {r.label}
                            </ThemedText>
                          </View>
                          <ThemedText style={s.sheetOptionDesc}>{r.desc}</ThemedText>
                        </View>
                        {mAppRole === r.key && <Ionicons name="checkmark" size={18} color={TEAL} />}
                      </TouchableOpacity>
                    ))
                  }
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 16, paddingBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  title:    { fontSize: 24, fontWeight: '800', color: TEXT, lineHeight: 30 },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: TEAL, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: BG },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 2, marginBottom: 12,
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    padding: 12, alignItems: 'center',
  },
  statNum:   { fontSize: 20, fontWeight: '800', color: TEXT, lineHeight: 26 },
  statLabel: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginTop: 2 },

  // Staff card
  staffCard: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, marginBottom: 10, overflow: 'hidden',
  },
  staffRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText:   { fontSize: 15, fontWeight: '800' },
  staffName:    { fontSize: 15, fontWeight: '700', color: TEXT },
  staffJobRole: { fontSize: 12, color: MUTED },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  statusDot:  { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  roleBadge: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },
  staffActions:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIcon:    { padding: 6 },

  // Expanded permissions
  permissionsWrap: {
    borderTopWidth: 1, borderTopColor: BORDER,
    padding: 14, gap: 6,
  },
  permInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  permInfoText: { fontSize: 13, color: MUTED },
  permTitle:    { fontSize: 12, fontWeight: '700', color: TEXT, marginTop: 8, marginBottom: 8 },
  permSection:  { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  permFeatureRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  permFeatureText: { fontSize: 12, color: TEXT },
  noAccessNote: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: BG, borderRadius: 10, padding: 12, marginTop: 8,
  },
  noAccessText: { fontSize: 12, color: MUTED, flex: 1, lineHeight: 18 },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(167,139,250,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700' },

  // Roles reference
  roleRefCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1,
    borderColor: BORDER, padding: 14, marginBottom: 8,
  },
  roleRefDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  roleRefName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  roleRefDesc: { fontSize: 12, color: MUTED, lineHeight: 18 },

  // Modal
  modalRoot:    { flex: 1, backgroundColor: BG },
  modalSafe:    { flex: 1 },
  modalContent: { paddingHorizontal: 20, paddingBottom: 48 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER,
    marginBottom: 24,
  },
  modalTitle:  { fontSize: 17, fontWeight: '700', color: TEXT },
  modalCancel: { fontSize: 15, color: MUTED },
  modalSave:   { fontSize: 15, fontWeight: '700', color: TEAL },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: TEXT, marginBottom: 16,
  },
  picker: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerValue:   { fontSize: 15, color: TEXT },
  rolePickerDot: { width: 8, height: 8, borderRadius: 4 },

  roleDescCard: {
    backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    padding: 14, gap: 6, marginBottom: 8,
  },
  roleDescText: { fontSize: 13, color: TEXT, lineHeight: 20 },
  roleDescHint: { fontSize: 12, color: MUTED },

  // Picker overlay (inside the modal, not a separate Modal)
  pickerOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '65%',
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  sheetTitle:      { fontSize: 17, fontWeight: '700', color: TEXT },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  sheetOptionActive: { backgroundColor: 'rgba(0,196,180,0.05)' },
  sheetOptionText:   { fontSize: 16, color: TEXT, fontWeight: '600' },
  sheetOptionDesc:   { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 18 },
});
