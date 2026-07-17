import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const ORANGE = '#F59E0B';
const PURPLE = '#7C3AED';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

// ── Types ────────────────────────────────────────────────────

type Stage = 'lead' | 'enrolled' | 'alumni';
type HockeyLevel = 'AAA' | 'AA' | 'A' | 'House';

interface Child {
  id: string;
  name: string;
  birthdate: string | null;
  position: string | null;
  skill_level_parent: string | null;
}

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  stage: Stage;
  source: string;
  skill_level_coach: HockeyLevel | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  children: Child[];
  camp_count: number;
  camp_ids: string[];
  team_ids: string[];
}

// ── Constants ────────────────────────────────────────────────

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'lead',     label: 'Lead',     color: MUTED   },
  { key: 'enrolled', label: 'Enrolled', color: TEAL    },
  { key: 'alumni',   label: 'Alumni',   color: PURPLE  },
];

const HOCKEY_LEVELS: HockeyLevel[] = ['AAA', 'AA', 'A', 'House'];
const AGES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // 18 = 18+
const POSITIONS = ['Forward', 'Defense', 'Goalie'];

function stageColor(s: Stage): string {
  return STAGES.find(x => x.key === s)?.color ?? MUTED;
}

function stageLabel(s: Stage): string {
  return STAGES.find(x => x.key === s)?.label ?? s;
}

function childAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const diff = Date.now() - new Date(birthdate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Main screen ──────────────────────────────────────────────

export default function ContactsScreen() {
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');

  // Advanced filters
  const [filterAges, setFilterAges]     = useState<number[]>([]);
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [filterTeam, setFilterTeam]   = useState<string | null>(null);
  const [filterCamp, setFilterCamp]   = useState<string | null>(null);
  const [showFilter, setShowFilter]   = useState(false);
  const [teams, setTeams]             = useState<{ id: string; name: string }[]>([]);
  const [allCamps, setAllCamps]       = useState<{ id: string; name: string }[]>([]);

  // Add contact modal
  const [showAdd, setShowAdd]     = useState(false);
  const [addName, setAddName]     = useState('');
  const [addEmail, setAddEmail]   = useState('');
  const [addPhone, setAddPhone]   = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Detail sheet
  const [detail, setDetail]             = useState<Contact | null>(null);
  const [detailNotes, setDetailNotes]   = useState('');
  const [detailSkill, setDetailSkill]   = useState<HockeyLevel | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);

  // Add child inline in detail
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName]       = useState('');
  const [childBirth, setChildBirth]     = useState('');
  const [childPos, setChildPos]         = useState('');
  const [childSkill, setChildSkill]     = useState('');

  const activeFilterCount = [filterAges.length > 0, filterSkills.length > 0, !!filterTeam, !!filterCamp].filter(Boolean).length;

  // ── Data ─────────────────────────────────────────────────

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Load teams
    const { data: teamRows } = await supabase
      .from('teams')
      .select('id, name')
      .eq('coach_id', user.id)
      .order('name');
    const teamList = teamRows ?? [];
    setTeams(teamList);

    // Load camps (most recent 30)
    const { data: campRows } = await supabase
      .from('camps')
      .select('id, name')
      .eq('coach_id', user.id)
      .order('start_date', { ascending: false })
      .limit(30);
    setAllCamps(campRows ?? []);

    // Load players for team matching
    const playerTeamMap: Record<string, string> = {};
    if (teamList.length > 0) {
      const { data: playerRows } = await supabase
        .from('players')
        .select('name, team_id')
        .in('team_id', teamList.map(t => t.id));
      for (const p of (playerRows ?? [])) {
        playerTeamMap[p.name.toLowerCase()] = p.team_id;
      }
    }

    // Load contacts with children
    const { data: rows } = await supabase
      .from('contacts')
      .select(`
        id, full_name, email, phone, stage, source,
        skill_level_coach, notes, tags, created_at,
        contact_children(id, name, birthdate, position, skill_level_parent)
      `)
      .eq('coach_id', user.id)
      .order('full_name');

    if (!rows) { setLoading(false); return; }

    // Camp registrations: count + camp_ids per email
    const emails = rows.map(r => r.email).filter(Boolean) as string[];
    const campCounts: Record<string, number> = {};
    const campIdsByEmail: Record<string, string[]> = {};

    if (emails.length > 0) {
      const { data: regs } = await supabase
        .from('camp_registrations')
        .select('parent_email, camp_id')
        .in('parent_email', emails)
        .in('status', ['confirmed', 'paid']);
      for (const r of (regs ?? [])) {
        if (!r.parent_email) continue;
        const key = r.parent_email.toLowerCase();
        campCounts[key] = (campCounts[key] ?? 0) + 1;
        if (!campIdsByEmail[key]) campIdsByEmail[key] = [];
        if (r.camp_id && !campIdsByEmail[key].includes(r.camp_id)) {
          campIdsByEmail[key].push(r.camp_id);
        }
      }
    }

    setContacts(rows.map(r => {
      const emailKey = (r.email ?? '').toLowerCase();
      const children = (r.contact_children ?? []) as Child[];
      const teamIds = new Set<string>();
      for (const ch of children) {
        const tid = playerTeamMap[ch.name.toLowerCase()];
        if (tid) teamIds.add(tid);
      }
      return {
        ...r,
        stage: (r.stage ?? 'lead') as Stage,
        skill_level_coach: r.skill_level_coach as HockeyLevel | null,
        tags: r.tags ?? [],
        children,
        camp_count: campCounts[emailKey] ?? 0,
        camp_ids: campIdsByEmail[emailKey] ?? [],
        team_ids: [...teamIds],
      };
    }));

    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadContacts(); }, [loadContacts]));

  // ── Filtering ─────────────────────────────────────────────

  const filtered = contacts.filter(c => {
    if (search && !c.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !(c.email ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (stageFilter !== 'all' && c.stage !== stageFilter) return false;
    if (filterCamp && !c.camp_ids.includes(filterCamp)) return false;
    if (filterTeam && !c.team_ids.includes(filterTeam)) return false;
    if (filterAges.length > 0) {
      const hasKid = c.children.some(ch => {
        const age = childAge(ch.birthdate);
        if (age === null) return false;
        return filterAges.some(fa => fa === 18 ? age >= 18 : age === fa);
      });
      if (!hasKid) return false;
    }
    if (filterSkills.length > 0) {
      const hasKid = c.children.some(ch => filterSkills.includes(ch.skill_level_parent ?? ''));
      if (!hasKid) return false;
    }
    return true;
  });

  // ── Actions ───────────────────────────────────────────────

  async function addContact() {
    if (!addName.trim()) { Alert.alert('Name required'); return; }
    setAddSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAddSaving(false); return; }
    await supabase.from('contacts').insert({
      coach_id:  user.id,
      full_name: addName.trim(),
      email:     addEmail.trim() || null,
      phone:     addPhone.trim() || null,
      stage:     'lead',
      source:    'manual',
    });
    setAddSaving(false);
    setShowAdd(false);
    setAddName(''); setAddEmail(''); setAddPhone('');
    loadContacts();
  }

  async function saveDetail() {
    if (!detail) return;
    setDetailSaving(true);
    await supabase.from('contacts').update({
      notes:             detailNotes || null,
      skill_level_coach: detailSkill,
    }).eq('id', detail.id);
    setDetailSaving(false);
    loadContacts();
  }

  async function updateStage(contact: Contact, stage: Stage) {
    await supabase.from('contacts').update({ stage }).eq('id', contact.id);
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, stage } : c));
    if (detail?.id === contact.id) setDetail(d => d ? { ...d, stage } : d);
  }

  async function deleteContact(id: string) {
    Alert.alert('Delete Contact', 'Remove this contact from your CRM?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('contacts').delete().eq('id', id);
        setDetail(null);
        loadContacts();
      }},
    ]);
  }

  async function addChild() {
    if (!childName.trim() || !detail) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('contact_children').insert({
      contact_id:         detail.id,
      coach_id:           user.id,
      name:               childName.trim(),
      birthdate:          childBirth || null,
      position:           childPos || null,
      skill_level_parent: childSkill || null,
    }).select().single();
    if (data) {
      setDetail(d => d ? { ...d, children: [...d.children, data as Child] } : d);
    }
    setChildName(''); setChildBirth(''); setChildPos(''); setChildSkill('');
    setShowAddChild(false);
  }

  async function removeChild(childId: string) {
    await supabase.from('contact_children').delete().eq('id', childId);
    setDetail(d => d ? { ...d, children: d.children.filter(c => c.id !== childId) } : d);
  }

  function openDetail(c: Contact) {
    setDetail(c);
    setDetailNotes(c.notes ?? '');
    setDetailSkill(c.skill_level_coach);
    setShowAddChild(false);
  }

  function clearFilters() {
    setFilterAges([]);
    setFilterSkills([]);
    setFilterTeam(null);
    setFilterCamp(null);
  }

  // ── Stats ─────────────────────────────────────────────────

  const totalCount    = contacts.length;
  const enrolledCount = contacts.filter(c => c.stage === 'enrolled').length;
  const alumniCount   = contacts.filter(c => c.stage === 'alumni').length;

  // ── Render ────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <ThemedText style={s.headerLabel}>CRM</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ThemedText style={s.headerTitle}>Contacts</ThemedText>
              <ThemedText style={s.headerCount}>{totalCount}</ThemedText>
            </View>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
            <Ionicons name="person-add-outline" size={18} color={BG} />
            <ThemedText style={s.addBtnText}>Add</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        {totalCount > 0 && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <ThemedText style={s.statNum}>{totalCount}</ThemedText>
              <ThemedText style={s.statLabel}>TOTAL</ThemedText>
            </View>
            <View style={s.statCard}>
              <ThemedText style={[s.statNum, { color: TEAL }]}>{enrolledCount}</ThemedText>
              <ThemedText style={s.statLabel}>ENROLLED</ThemedText>
            </View>
            <View style={s.statCard}>
              <ThemedText style={[s.statNum, { color: PURPLE }]}>{alumniCount}</ThemedText>
              <ThemedText style={s.statLabel}>ALUMNI</ThemedText>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            style={s.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stage chips + Filter button + active filter pills */}
        <View style={s.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center', flexGrow: 1 }}
        >
          {(['all', ...STAGES.map(st => st.key)] as const).map(key => {
            const active = stageFilter === key;
            const label  = key === 'all' ? 'All' : stageLabel(key as Stage);
            return (
              <TouchableOpacity
                key={key}
                style={[s.chip, active && { backgroundColor: '#0D2A24', borderColor: TEAL }]}
                onPress={() => setStageFilter(key as Stage | 'all')}
              >
                <ThemedText style={[s.chipText, active && { color: TEAL }]}>{label}</ThemedText>
              </TouchableOpacity>
            );
          })}

          {/* Filter button — inline after stage chips */}
          <TouchableOpacity
            style={[s.chip, activeFilterCount > 0 && { backgroundColor: '#0D2A24', borderColor: TEAL }]}
            onPress={() => setShowFilter(true)}
          >
            <ThemedText style={[s.chipText, activeFilterCount > 0 && { color: TEAL }]}>
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
            </ThemedText>
          </TouchableOpacity>

          {/* Active filter pills — tap to remove */}
          {filterAges.length > 0 && (
            <TouchableOpacity style={s.activePill} onPress={() => setFilterAges([])}>
              <ThemedText style={s.activePillText}>
                {filterAges.length === 1
                  ? `Age ${filterAges[0] === 18 ? '18+' : filterAges[0]}`
                  : `Ages: ${filterAges.map(a => a === 18 ? '18+' : a).join(', ')}`}
              </ThemedText>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
          {filterSkills.length > 0 && (
            <TouchableOpacity style={s.activePill} onPress={() => setFilterSkills([])}>
              <ThemedText style={s.activePillText}>{filterSkills.join(', ')}</ThemedText>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
          {filterTeam && (
            <TouchableOpacity style={s.activePill} onPress={() => setFilterTeam(null)}>
              <ThemedText style={s.activePillText}>{teams.find(t => t.id === filterTeam)?.name ?? 'Team'}</ThemedText>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
          {filterCamp && (
            <TouchableOpacity style={s.activePill} onPress={() => setFilterCamp(null)}>
              <ThemedText style={s.activePillText}>{allCamps.find(c => c.id === filterCamp)?.name ?? 'Camp'}</ThemedText>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
        </ScrollView>
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="people-outline" size={44} color={MUTED} />
                <ThemedText style={s.emptyTitle}>
                  {contacts.length === 0 ? 'No contacts yet' : 'No matches'}
                </ThemedText>
                <ThemedText style={s.emptyDesc}>
                  {contacts.length === 0
                    ? 'Parents auto-appear when they register for a camp. You can also add manually.'
                    : 'Try adjusting your filters.'}
                </ThemedText>
                {contacts.length === 0 && (
                  <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
                    <ThemedText style={s.emptyBtnText}>Add Contact</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filtered.map(c => <ContactCard key={c.id} contact={c} onPress={() => openDetail(c)} />)
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      {/* ── Filter Sheet ──────────────────────────────────── */}
      <Modal visible={showFilter} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalRoot}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={clearFilters}>
                <ThemedText style={[s.modalCancel, activeFilterCount > 0 && { color: RED }]}>
                  {activeFilterCount > 0 ? 'Reset' : 'Cancel'}
                </ThemedText>
              </TouchableOpacity>
              <ThemedText style={s.modalTitle}>Filter Contacts</ThemedText>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <ThemedText style={s.modalSave}>Done</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>

              {/* Age */}
              <ThemedText style={s.sectionLabel}>AGE</ThemedText>
              <View style={s.chipGrid}>
                {AGES.map(age => {
                  const active = filterAges.includes(age);
                  return (
                    <TouchableOpacity
                      key={age}
                      style={[s.chip, active && { backgroundColor: '#0D2A24', borderColor: TEAL }]}
                      onPress={() => setFilterAges(prev =>
                        active ? prev.filter(a => a !== age) : [...prev, age]
                      )}
                    >
                      <ThemedText style={[s.chipText, active && { color: TEAL }]}>
                        {age === 18 ? '18+' : String(age)}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Skill */}
              <ThemedText style={[s.sectionLabel, { marginTop: 24 }]}>SKILL LEVEL</ThemedText>
              <View style={s.chipGrid}>
                {HOCKEY_LEVELS.map(level => {
                  const active = filterSkills.includes(level);
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[s.chip, active && { backgroundColor: '#0D2A24', borderColor: TEAL }]}
                      onPress={() => setFilterSkills(prev =>
                        active ? prev.filter(s => s !== level) : [...prev, level]
                      )}
                    >
                      <ThemedText style={[s.chipText, active && { color: TEAL }]}>{level}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Teams */}
              {teams.length > 0 && (
                <>
                  <ThemedText style={[s.sectionLabel, { marginTop: 24 }]}>TEAM</ThemedText>
                  <View style={s.chipGrid}>
                    {teams.map(team => {
                      const active = filterTeam === team.id;
                      return (
                        <TouchableOpacity
                          key={team.id}
                          style={[s.chip, active && { backgroundColor: '#0D2A24', borderColor: TEAL }]}
                          onPress={() => setFilterTeam(active ? null : team.id)}
                        >
                          <ThemedText style={[s.chipText, active && { color: TEAL }]}>{team.name}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Camps */}
              {allCamps.length > 0 && (
                <>
                  <ThemedText style={[s.sectionLabel, { marginTop: 24 }]}>CURRENT CAMPS</ThemedText>
                  <View style={s.chipGrid}>
                    {allCamps.map(camp => {
                      const active = filterCamp === camp.id;
                      return (
                        <TouchableOpacity
                          key={camp.id}
                          style={[s.chip, active && { backgroundColor: '#0D2A24', borderColor: TEAL }]}
                          onPress={() => setFilterCamp(active ? null : camp.id)}
                        >
                          <ThemedText style={[s.chipText, active && { color: TEAL }]}>{camp.name}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Add Contact Modal ──────────────────────────────── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <ThemedText style={s.modalCancel}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={s.modalTitle}>New Contact</ThemedText>
              <TouchableOpacity onPress={addContact} disabled={addSaving}>
                {addSaving ? <ActivityIndicator color={TEAL} size="small" /> :
                  <ThemedText style={s.modalSave}>Save</ThemedText>}
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
              <ThemedText style={s.fieldLabel}>Name *</ThemedText>
              <TextInput
                style={s.input}
                placeholder="Parent's full name"
                placeholderTextColor={MUTED}
                value={addName}
                onChangeText={setAddName}
              />
              <ThemedText style={s.fieldLabel}>Email</ThemedText>
              <TextInput
                style={s.input}
                placeholder="email@example.com"
                placeholderTextColor={MUTED}
                value={addEmail}
                onChangeText={setAddEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <ThemedText style={s.fieldLabel}>Phone</ThemedText>
              <TextInput
                style={s.input}
                placeholder="(555) 000-0000"
                placeholderTextColor={MUTED}
                value={addPhone}
                onChangeText={setAddPhone}
                keyboardType="phone-pad"
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Contact Detail Sheet ───────────────────────────── */}
      <Modal visible={detail !== null} animationType="slide" presentationStyle="pageSheet">
        {detail && (
          <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => { saveDetail(); setDetail(null); }}>
                  <ThemedText style={s.modalCancel}>Done</ThemedText>
                </TouchableOpacity>
                <ThemedText style={s.modalTitle}>{detail.full_name}</ThemedText>
                <TouchableOpacity onPress={() => deleteContact(detail.id)}>
                  <Ionicons name="trash-outline" size={18} color={RED} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">

                {/* Status row */}
                <View style={s.detailStageRow}>
                  {STAGES.map(st => {
                    const active = detail.stage === st.key;
                    return (
                      <TouchableOpacity
                        key={st.key}
                        style={[s.stageBtn, active && { backgroundColor: `${st.color}18`, borderColor: `${st.color}50` }]}
                        onPress={() => updateStage(detail, st.key)}
                      >
                        {active && <View style={[s.stageDot, { backgroundColor: st.color }]} />}
                        <ThemedText style={[s.stageBtnText, active && { color: st.color }]}>{st.label}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Contact info */}
                <ThemedText style={s.sectionLabel}>CONTACT INFO</ThemedText>
                <View style={s.infoCard}>
                  {detail.email && (
                    <View style={s.infoRow}>
                      <Ionicons name="mail-outline" size={15} color={MUTED} />
                      <ThemedText style={s.infoText}>{detail.email}</ThemedText>
                    </View>
                  )}
                  {detail.phone && (
                    <View style={s.infoRow}>
                      <Ionicons name="call-outline" size={15} color={MUTED} />
                      <ThemedText style={s.infoText}>{detail.phone}</ThemedText>
                    </View>
                  )}
                  <View style={s.infoRow}>
                    <Ionicons name="layers-outline" size={15} color={MUTED} />
                    <ThemedText style={s.infoText}>
                      Source: {detail.source === 'camp_registration' ? 'Camp registration' : 'Added manually'}
                    </ThemedText>
                  </View>
                  {detail.camp_count > 0 && (
                    <View style={s.infoRow}>
                      <Ionicons name="snow-outline" size={15} color={TEAL} />
                      <ThemedText style={[s.infoText, { color: TEAL }]}>
                        {detail.camp_count} camp{detail.camp_count !== 1 ? 's' : ''} attended
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Athletes */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
                  <ThemedText style={s.sectionLabel}>ATHLETES</ThemedText>
                  <TouchableOpacity onPress={() => setShowAddChild(!showAddChild)}>
                    <Ionicons name={showAddChild ? 'chevron-up' : 'add-circle-outline'} size={20} color={TEAL} />
                  </TouchableOpacity>
                </View>

                {detail.children.map(ch => {
                  const age = childAge(ch.birthdate);
                  return (
                    <View key={ch.id} style={s.childCard}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={s.childName}>{ch.name}</ThemedText>
                        <ThemedText style={s.childMeta}>
                          {[
                            age !== null ? `Age ${age}` : null,
                            ch.position,
                            ch.skill_level_parent,
                          ].filter(Boolean).join(' · ')}
                        </ThemedText>
                      </View>
                      <TouchableOpacity onPress={() => removeChild(ch.id)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={16} color={MUTED} />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {detail.children.length === 0 && !showAddChild && (
                  <View style={s.emptySection}>
                    <ThemedText style={s.emptySectionText}>No athletes added yet</ThemedText>
                  </View>
                )}

                {showAddChild && (
                  <View style={s.addChildCard}>
                    <TextInput
                      style={s.inputSm}
                      placeholder="Athlete name"
                      placeholderTextColor={MUTED}
                      value={childName}
                      onChangeText={setChildName}
                    />
                    <TextInput
                      style={s.inputSm}
                      placeholder="Birthdate (YYYY-MM-DD)"
                      placeholderTextColor={MUTED}
                      value={childBirth}
                      onChangeText={setChildBirth}
                    />
                    <ThemedText style={[s.fieldLabel, { marginBottom: 6 }]}>Position</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                      {POSITIONS.map(p => (
                        <TouchableOpacity
                          key={p}
                          style={[s.chip, { paddingVertical: 5 }, childPos === p && { backgroundColor: '#0D2A24', borderColor: TEAL }]}
                          onPress={() => setChildPos(childPos === p ? '' : p)}
                        >
                          <ThemedText style={[s.chipText, { fontSize: 12 }, childPos === p && { color: TEAL }]}>{p}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <ThemedText style={[s.fieldLabel, { marginBottom: 6 }]}>Skill Level</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                      {HOCKEY_LEVELS.map(level => (
                        <TouchableOpacity
                          key={level}
                          style={[s.chip, { paddingVertical: 5 }, childSkill === level && { backgroundColor: '#0D2A24', borderColor: TEAL }]}
                          onPress={() => setChildSkill(childSkill === level ? '' : level)}
                        >
                          <ThemedText style={[s.chipText, { fontSize: 12 }, childSkill === level && { color: TEAL }]}>{level}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={s.addChildBtn} onPress={addChild}>
                      <ThemedText style={s.addChildBtnText}>Add Athlete</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Coach-private assessment */}
                <ThemedText style={[s.sectionLabel, { marginTop: 20 }]}>COACH ASSESSMENT</ThemedText>
                <View style={[s.infoCard, { gap: 12 }]}>
                  <ThemedText style={s.privateNote}>🔒 Private — parents never see this</ThemedText>
                  <ThemedText style={[s.fieldLabel, { marginBottom: 4 }]}>Skill Level</ThemedText>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {HOCKEY_LEVELS.map(level => {
                      const active = detailSkill === level;
                      return (
                        <TouchableOpacity
                          key={level}
                          style={[s.skillChip, active && { backgroundColor: 'rgba(0,196,180,0.15)', borderColor: TEAL }]}
                          onPress={() => setDetailSkill(active ? null : level)}
                        >
                          <ThemedText style={[s.skillChipText, active && { color: TEAL }]}>{level}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <ThemedText style={[s.fieldLabel, { marginBottom: 4, marginTop: 4 }]}>Notes</ThemedText>
                  <TextInput
                    style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                    placeholder="Private notes about this family..."
                    placeholderTextColor={MUTED}
                    value={detailNotes}
                    onChangeText={setDetailNotes}
                    multiline
                  />
                  <TouchableOpacity
                    style={s.saveNoteBtn}
                    onPress={saveDetail}
                    disabled={detailSaving}
                  >
                    {detailSaving
                      ? <ActivityIndicator color={BG} size="small" />
                      : <ThemedText style={s.saveNoteBtnText}>Save Assessment</ThemedText>}
                  </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

// ── Contact Card ─────────────────────────────────────────────

function ContactCard({ contact, onPress }: { contact: Contact; onPress: () => void }) {
  const color = stageColor(contact.stage);
  const skills = [...new Set(contact.children.map(ch => ch.skill_level_parent).filter(Boolean))];

  return (
    <TouchableOpacity style={s.contactCard} activeOpacity={0.75} onPress={onPress}>
      <View style={[s.avatar, { backgroundColor: `${color}18`, borderColor: `${color}35` }]}>
        <ThemedText style={[s.avatarText, { color }]}>{getInitials(contact.full_name)}</ThemedText>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <ThemedText style={s.contactName}>{contact.full_name}</ThemedText>
        <ThemedText style={s.contactSub}>
          {contact.children.length > 0
            ? `${contact.children.length} athlete${contact.children.length > 1 ? 's' : ''}${skills.length > 0 ? ' · ' + skills.join(', ') : ''}`
            : contact.email ?? 'No email'}
        </ThemedText>
        {contact.camp_count > 0 && (
          <ThemedText style={[s.contactSub, { color: TEAL }]}>
            {contact.camp_count} camp{contact.camp_count !== 1 ? 's' : ''}
          </ThemedText>
        )}
      </View>

      <View style={[s.stagePill, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
        <ThemedText style={[s.stagePillText, { color }]}>{stageLabel(contact.stage)}</ThemedText>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  headerLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: TEXT, lineHeight: 38 },
  headerCount: { fontSize: 20, fontWeight: '300', color: MUTED, lineHeight: 38 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: TEAL, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: BG },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 10, alignItems: 'center',
  },
  statNum:   { fontSize: 18, fontWeight: '800', color: TEXT },
  statLabel: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: TEXT },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  filterBtnActive: { borderColor: TEAL, backgroundColor: '#0D2A24' },
  filterBadge: {
    backgroundColor: TEAL, borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: BG },

  filterRow: { height: 36, marginBottom: 8, overflow: 'hidden' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
    borderColor: BORDER, backgroundColor: CARD,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: MUTED },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
    borderColor: ORANGE, backgroundColor: 'rgba(245,158,11,0.1)',
  },
  activePillText: { fontSize: 12, fontWeight: '600', color: ORANGE },

  list: { paddingHorizontal: 16 },

  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1,
    borderColor: BORDER, padding: 14, marginBottom: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { fontSize: 15, fontWeight: '800' },
  contactName:  { fontSize: 15, fontWeight: '700', color: TEXT },
  contactSub:   { fontSize: 12, color: MUTED },
  stagePill: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  stagePillText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  emptyDesc:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  emptyBtn: {
    marginTop: 8, backgroundColor: TEAL, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: BG },
  emptySection: {
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1,
    borderColor: BORDER, padding: 12, alignItems: 'center', marginBottom: 8,
  },
  emptySectionText: { fontSize: 12, color: MUTED },

  modalRoot: { flex: 1, backgroundColor: BG },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: TEXT },
  modalCancel:  { fontSize: 15, color: MUTED },
  modalSave:    { fontSize: 15, fontWeight: '700', color: TEAL },
  modalContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, marginBottom: 10 },
  fieldLabel:   { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },

  input: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: TEXT, marginBottom: 14,
  },
  inputSm: {
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: TEXT, marginBottom: 8,
  },

  detailStageRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 20 },
  stageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingVertical: 10, backgroundColor: CARD,
  },
  stageDot:     { width: 6, height: 6, borderRadius: 3 },
  stageBtnText: { fontSize: 13, fontWeight: '700', color: MUTED },

  infoCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1,
    borderColor: BORDER, padding: 14, gap: 10,
  },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 13, color: TEXT, flex: 1 },

  childCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1,
    borderColor: BORDER, padding: 12, marginBottom: 8,
  },
  childName: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  childMeta: { fontSize: 12, color: MUTED },

  addChildCard: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1,
    borderColor: BORDER, padding: 14, marginBottom: 8,
  },
  addChildBtn: {
    backgroundColor: TEAL, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  addChildBtnText: { fontSize: 14, fontWeight: '700', color: BG },

  privateNote: { fontSize: 11, color: ORANGE },
  skillChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: BG,
  },
  skillChipText: { fontSize: 13, fontWeight: '700', color: MUTED },

  saveNoteBtn: {
    backgroundColor: TEAL, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  saveNoteBtnText: { fontSize: 14, fontWeight: '700', color: BG },
});
