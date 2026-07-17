import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const PURPLE = '#8B5CF6';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab             = 'library' | 'practices' | 'my-drills' | 'favorites';
type PracticesSection = 'individual' | 'series';
type FavFilter       = 'all' | 'drills' | 'sessions' | 'series';
type LibFilter       = string; // dynamic from drill_categories table

// ─── Category Config ──────────────────────────────────────────────────────────
const CAT_CONFIG: Record<string, {
  bg: string; color: string; icon: string;
  label: string; secTitle: string; secDesc: string;
}> = {
  'pxf-slips': {
    bg: 'rgba(0,196,180,0.18)', color: TEAL, icon: 'flash-outline',
    label: 'PXF SLIPS', secTitle: 'PXF SLIPS',
    secDesc: 'Deceptive edge and puck-handling circuits built for game creativity.',
  },
  'pxf-skating': {
    bg: 'rgba(0,196,180,0.18)', color: TEAL, icon: 'snow-outline',
    label: 'PXF SKATING', secTitle: 'PXF SKATING',
    secDesc: 'PXF signature skating progressions for power, edge, and stride.',
  },
  gameiq: {
    bg: 'rgba(245,158,11,0.18)', color: ORANGE, icon: 'hardware-chip-outline',
    label: 'GAMEIQ', secTitle: 'GAMEIQ — COMING SOON',
    secDesc: 'Reads, positioning, and decision-making concepts for competitive play.',
  },
  skating: {
    bg: 'rgba(0,196,180,0.18)', color: TEAL, icon: 'snow-outline',
    label: 'SKATING', secTitle: 'SKATING',
    secDesc: 'Edge, crossover, and stride progressions for power and control.',
  },
  'puck-skills': {
    bg: 'rgba(0,196,180,0.18)', color: TEAL, icon: 'disc-outline',
    label: 'PUCK SKILLS', secTitle: 'PUCK SKILLS',
    secDesc: 'Hands, dekes, and puck control at speed.',
  },
  flow: {
    bg: 'rgba(61,255,143,0.14)', color: GREEN, icon: 'water-outline',
    label: 'FLOW', secTitle: 'FLOW',
    secDesc: 'Creative, continuous movement drills that build game rhythm.',
  },
  'team-systems': {
    bg: 'rgba(124,58,237,0.18)', color: PURPLE, icon: 'people-outline',
    label: 'TEAM SYSTEMS', secTitle: 'TEAM SYSTEMS',
    secDesc: 'Breakouts, zone entries, forecheck, and defensive structure.',
  },
  shooting: {
    bg: 'rgba(245,158,11,0.18)', color: ORANGE, icon: 'radio-button-on-outline',
    label: 'SHOOTING', secTitle: 'SHOOTING',
    secDesc: 'Shot mechanics, release, and scoring from all zones.',
  },
  'small-area': {
    bg: 'rgba(0,196,180,0.18)', color: TEAL, icon: 'resize-outline',
    label: 'SMALL AREA', secTitle: 'SMALL AREA',
    secDesc: 'Tight-space battles, edgework, and decision-making under pressure.',
  },
  'puck-protection': {
    bg: 'rgba(245,158,11,0.18)', color: ORANGE, icon: 'shield-outline',
    label: 'PUCK PROTECTION', secTitle: 'PUCK PROTECTION',
    secDesc: 'Body position, board battles, and protecting the puck in traffic.',
  },
  games: {
    bg: 'rgba(61,255,143,0.14)', color: GREEN, icon: 'game-controller-outline',
    label: 'GAMES', secTitle: 'GAMES',
    secDesc: 'Competitive small-area games and competitive drills with scoring.',
  },
  goalie: {
    bg: 'rgba(124,58,237,0.18)', color: PURPLE, icon: 'aperture-outline',
    label: 'GOALIE', secTitle: 'GOALIE',
    secDesc: 'Position-specific tracking, positioning, and reaction drills.',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
type LibDrill = {
  id: string;
  name: string;
  cat: string;      // slug e.g. 'skating'
  catTitle: string; // display title
  level: string;
  ages: string;
  dur: number;
  desc: string;
};

type PracSession = {
  id: string;
  name: string;
  dur: number;
  drillCount: number;
  isFavorite: boolean;
};

function slugify(s: string) { return s.toLowerCase().replace(/\s+/g, '-'); }

// ─── Drill Card (Library) ─────────────────────────────────────────────────────
function DrillCard({ drill }: { drill: LibDrill }) {
  const router = useRouter();
  const c = CAT_CONFIG[drill.cat] ?? CAT_CONFIG['skating'];
  return (
    <View style={s.drillCard}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/drill/${drill.id}` as any)}>
        <View style={s.drillTop}>
          <View style={[s.drillIcon, { backgroundColor: c.bg }]}>
            <Ionicons name={c.icon as any} size={28} color={c.color} />
          </View>
          <View style={s.drillInfo}>
            <ThemedText style={s.drillName}>{drill.name}</ThemedText>
            <ThemedText style={[s.drillTags, { color: c.color }]}>
              {drill.catTitle || c.label} · {drill.level}
            </ThemedText>
            <ThemedText style={s.drillMeta}>
              {drill.ages ? `Ages ${drill.ages}  ·  ` : ''}⏱ {drill.dur} min
            </ThemedText>
            {!!drill.desc && <ThemedText style={s.drillDesc}>{drill.desc}</ThemedText>}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.8} style={s.addBtn}>
        <LinearGradient
          colors={['#3DFF8F', '#2ED573']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.addBtnGrad}
        >
          <ThemedText style={s.addBtnText}>+ Add to Session</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Library Tab ──────────────────────────────────────────────────────────────
function LibraryTab({ filter, onFilter }: { filter: LibFilter; onFilter: (k: LibFilter) => void }) {
  const [drills,     setDrills]     = useState<LibDrill[]>([]);
  const [categories, setCategories] = useState<{ slug: string; title: string }[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from('drill_categories')
        .select('id, title')
        .order('sort_order');
      const catMap: Record<string, string> = {};
      const catList = (cats ?? []).map((c: any) => {
        const slug = slugify(c.title);
        catMap[c.id] = slug;
        return { slug, title: c.title };
      });
      setCategories(catList);

      const { data: drillRows } = await supabase
        .from('drills')
        .select('id, title, category_id, difficulty_level, age_group, duration_minutes, description, drill_categories(title)')
        .order('title');
      setDrills((drillRows ?? []).map((d: any) => {
        const catT: any = Array.isArray(d.drill_categories) ? d.drill_categories[0] : d.drill_categories;
        const catSlug = catMap[d.category_id] ?? slugify(catT?.title ?? 'general');
        return {
          id: d.id, name: d.title, cat: catSlug, catTitle: catT?.title ?? '',
          level: d.difficulty_level ?? '', ages: d.age_group ?? '',
          dur: d.duration_minutes ?? 0, desc: d.description ?? '',
        };
      }));
      setLoading(false);
    })();
  }, []);

  const chips = [
    { key: 'all', label: 'All' },
    ...categories.map(c => ({ key: c.slug as LibFilter, label: c.title })),
  ];
  const catSlugs = filter === 'all' ? categories.map(c => c.slug) : [filter];

  return (
    <>
      {/* DRILL LIBRARY label */}
      <ThemedText style={[s.secLabel, { marginTop: 14, marginBottom: 10 }]}>DRILL LIBRARY</ThemedText>

      {/* Search row */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={MUTED} style={{ marginRight: 8 }} />
          <ThemedText style={s.searchPlaceholder}>Search library</ThemedText>
        </View>
        <TouchableOpacity style={s.filterBtn} activeOpacity={0.8}>
          <Ionicons name="funnel-outline" size={18} color={MUTED} />
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
        style={{ marginBottom: 8 }}
      >
        {chips.map(chip => (
          <TouchableOpacity
            key={chip.key}
            onPress={() => onFilter(chip.key as LibFilter)}
            activeOpacity={0.8}
            style={[s.chip, filter === chip.key && s.chipActive]}
          >
            <ThemedText style={[s.chipText, filter === chip.key && s.chipTextActive]}>
              {chip.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category sections */}
      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : drills.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="football-outline" size={32} color={MUTED} />
          <ThemedText style={s.emptyTitle}>No drills in library yet</ThemedText>
        </View>
      ) : catSlugs.map(cat => {
        const catDrills = drills.filter(d => d.cat === cat);
        if (!catDrills.length) return null;
        const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG['skating'];
        const catLabel = categories.find(c => c.slug === cat)?.title ?? cfg.secTitle;
        return (
          <View key={cat} style={{ marginTop: 10 }}>
            <ThemedText style={s.catTitle}>{catLabel.toUpperCase()}</ThemedText>
            {cfg.secDesc ? <ThemedText style={s.catDesc}>{cfg.secDesc}</ThemedText> : null}
            {catDrills.map(d => <DrillCard key={d.id} drill={d} />)}
          </View>
        );
      })}
    </>
  );
}

// ─── Practices Tab ────────────────────────────────────────────────────────────
const PRAC_CHIPS = [
  { key: 'all',     label: 'All'     },
  { key: 'unfiled', label: 'Unfiled' },
];

type SeriesItem = { id: string; name: string; day_count: number; description: string | null; isFavorite: boolean };

function PracticesTab() {
  const router = useRouter();
  const [section,    setSection]    = useState<PracticesSection>('individual');
  const [pracFilter, setPracFilter] = useState('all');
  const [sessions,   setSessions]   = useState<PracSession[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [showNewSeries,  setShowNewSeries]  = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newName,        setNewName]        = useState('');
  const [newDays,        setNewDays]        = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [creating,       setCreating]       = useState(false);
  const [selectMode,       setSelectMode]       = useState(false);
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [seriesSelectMode, setSeriesSelectMode] = useState(false);
  const [seriesSelectedIds,setSeriesSelectedIds]= useState<Set<string>>(new Set());

  async function deleteSession(id: string) {
    await supabase.from('session_drills').delete().eq('session_id', id);
    await supabase.from('sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  async function toggleFavorite(id: string, current: boolean) {
    const next = !current;
    await supabase.from('sessions').update({ is_favorite: next }).eq('id', id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isFavorite: next } : s));
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    Alert.alert('Delete Sessions', `Delete ${ids.length} session${ids.length > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          for (const id of ids) {
            await supabase.from('session_drills').delete().eq('session_id', id);
            await supabase.from('sessions').delete().eq('id', id);
          }
          setSessions(prev => prev.filter(s => !selectedIds.has(s.id)));
          exitSelectMode();
        },
      },
    ]);
  }

  async function bulkFavorite() {
    const ids = [...selectedIds];
    const allFav = ids.every(id => sessions.find(s => s.id === id)?.isFavorite);
    const next = !allFav;
    for (const id of ids) {
      await supabase.from('sessions').update({ is_favorite: next }).eq('id', id);
    }
    setSessions(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, isFavorite: next } : s));
    exitSelectMode();
  }

  // ── Series select mode ──
  function exitSeriesSelectMode() {
    setSeriesSelectMode(false);
    setSeriesSelectedIds(new Set());
  }

  function toggleSeriesSelect(id: string) {
    setSeriesSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function toggleSeriesFavorite(id: string, current: boolean) {
    await supabase.from('session_series').update({ is_favorite: !current }).eq('id', id);
    setSeriesList(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !current } : s));
  }

  async function seriesBulkDelete() {
    const ids = [...seriesSelectedIds];
    Alert.alert('Delete Series', `Delete ${ids.length} series?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          for (const id of ids) {
            await supabase.from('session_series').delete().eq('id', id);
          }
          setSeriesList(prev => prev.filter(s => !seriesSelectedIds.has(s.id)));
          exitSeriesSelectMode();
        },
      },
    ]);
  }

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('sessions')
      .select('id, title, total_duration_minutes, is_favorite, session_drills(count)')
      .eq('coach_id', user.id)
      .eq('is_template', true)
      .order('created_at', { ascending: false })
      .limit(30);
    setSessions((data ?? []).map((s: any) => ({
      id: s.id,
      name: s.title ?? 'Untitled',
      dur: s.total_duration_minutes ?? 0,
      drillCount: s.session_drills?.[0]?.count ?? 0,
      isFavorite: s.is_favorite ?? false,
    })));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => { loadSessions(); }, [loadSessions])
  );

  useEffect(() => {
    if (section === 'series') loadSeries();
    // reset both select modes when switching sections
    exitSelectMode();
    exitSeriesSelectMode();
  }, [section]);

  async function loadSeries() {
    setSeriesLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSeriesLoading(false); return; }
    const { data } = await supabase
      .from('session_series')
      .select('id, name, day_count, description, is_favorite')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });
    setSeriesList((data ?? []).map((s: any) => ({ ...s, isFavorite: s.is_favorite ?? false })));
    setSeriesLoading(false);
  }

  async function createSeries() {
    if (!newName.trim() || !newDays.trim()) return;
    const days = parseInt(newDays, 10);
    if (isNaN(days) || days < 1 || days > 30) {
      Alert.alert('Invalid', 'Day count must be between 1 and 30.');
      return;
    }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }
    const { data, error } = await supabase
      .from('session_series')
      .insert({ coach_id: user.id, name: newName.trim(), day_count: days })
      .select('id').single();
    setCreating(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowNewSeries(false);
    setNewName(''); setNewDays('');
    router.push(`/series/${data.id}` as any);
  }

  async function createSession() {
    if (!newSessionTitle.trim()) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }
    const { data, error } = await supabase
      .from('sessions')
      .insert({ coach_id: user.id, title: newSessionTitle.trim(), is_template: true })
      .select('id').single();
    setCreating(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowNewSession(false);
    setNewSessionTitle('');
    router.push(`/session-plan/${data.id}` as any);
  }

  return (
    <>
      {/* Individual / Series toggle */}
      <View style={s.subToggleContainer}>
        <TouchableOpacity
          style={[s.subToggleBtn, section === 'individual' && s.subToggleBtnActive]}
          onPress={() => setSection('individual')}
          activeOpacity={0.85}
        >
          <ThemedText style={[s.subToggleText, section === 'individual' && s.subToggleTextActive]}>
            Individual Sessions
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.subToggleBtn, section === 'series' && s.subToggleBtnActive]}
          onPress={() => setSection('series')}
          activeOpacity={0.85}
        >
          <ThemedText style={[s.subToggleText, section === 'series' && s.subToggleTextActive]}>
            Series
          </ThemedText>
        </TouchableOpacity>
      </View>

      {section === 'individual' ? (
        <>
          {selectMode ? (
            /* ── Bulk action bar (top) ── */
            <View style={s.bulkTopBar}>
              <TouchableOpacity onPress={exitSelectMode} activeOpacity={0.7} style={s.bulkTopCancel}>
                <ThemedText style={s.bulkTopCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={s.bulkTopCount}>
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Tap to select'}
              </ThemedText>
              <View style={s.bulkTopActions}>
                <TouchableOpacity
                  style={[s.bulkTopBtn, selectedIds.size === 0 && { opacity: 0.35 }]}
                  activeOpacity={0.7}
                  disabled={selectedIds.size === 0}
                  onPress={bulkFavorite}
                >
                  <Ionicons name="heart-outline" size={20} color={TEAL} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.bulkDeletePill, selectedIds.size === 0 && { opacity: 0.35 }]}
                  activeOpacity={0.7}
                  disabled={selectedIds.size === 0}
                  onPress={bulkDelete}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <ThemedText style={s.bulkDeletePillText}>
                    Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Normal chips + New ── */
            <View style={s.pracHeaderRow}>
              <View style={s.pracChipsWrap}>
                {PRAC_CHIPS.map(c => (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setPracFilter(c.key)}
                    activeOpacity={0.8}
                    style={[s.chip, pracFilter === c.key && s.chipActive]}
                  >
                    <ThemedText style={[s.chipText, pracFilter === c.key && s.chipTextActive]}>
                      {c.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.pracHeaderActions}>
                {sessions.length > 0 && (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectMode(true)} style={s.selectTextBtn}>
                    <ThemedText style={s.selectTextBtnLabel}>Select</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.newPill} activeOpacity={0.8} onPress={() => setShowNewSession(true)}>
                  <ThemedText style={s.newPillText}>+ New</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Session cards */}
          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 20 }} />
          ) : sessions.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="time-outline" size={32} color={MUTED} />
              <ThemedText style={s.emptyTitle}>No sessions yet</ThemedText>
            </View>
          ) : sessions.map(p => {
            const isSelected = selectedIds.has(p.id);
            const card = (
              <TouchableOpacity
                key={p.id}
                style={[s.sessionCard, isSelected && { borderColor: TEAL, backgroundColor: '#0D2A24' }]}
                activeOpacity={0.8}
                onPress={() => {
                  if (selectMode) { toggleSelect(p.id); return; }
                  router.push(`/session-plan/${p.id}` as any);
                }}
                onLongPress={() => { setSelectMode(true); toggleSelect(p.id); }}
              >
                {selectMode && (
                  <View style={s.checkbox}>
                    {isSelected
                      ? <Ionicons name="checkmark-circle" size={22} color={TEAL} />
                      : <Ionicons name="ellipse-outline" size={22} color={MUTED} />
                    }
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.sessionName}>{p.name}</ThemedText>
                  <ThemedText style={s.sessionMeta}>⏱ {p.dur} min · {p.drillCount} drills</ThemedText>
                </View>
                {!selectMode && (
                  <View style={s.sessionActions}>
                    <TouchableOpacity
                      style={s.iconHitbox}
                      activeOpacity={0.7}
                      onPress={() => toggleFavorite(p.id, p.isFavorite)}
                    >
                      <Ionicons
                        name={p.isFavorite ? 'heart' : 'heart-outline'}
                        size={20}
                        color={p.isFavorite ? '#EF4444' : MUTED}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );

            if (selectMode) return card;

            return (
              <Swipeable
                key={p.id}
                renderRightActions={() => (
                  <TouchableOpacity
                    style={s.swipeDelete}
                    onPress={() => deleteSession(p.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={22} color="#fff" />
                    <ThemedText style={s.swipeDeleteText}>Delete</ThemedText>
                  </TouchableOpacity>
                )}
              >
                {card}
              </Swipeable>
            );
          })}

        </>
      ) : (
        <>
          {/* Series header */}
          {seriesSelectMode ? (
            <View style={s.bulkTopBar}>
              <TouchableOpacity onPress={exitSeriesSelectMode} activeOpacity={0.7} style={s.bulkTopCancel}>
                <ThemedText style={s.bulkTopCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <ThemedText style={s.bulkTopCount}>
                {seriesSelectedIds.size > 0 ? `${seriesSelectedIds.size} selected` : 'Tap to select'}
              </ThemedText>
              <View style={s.bulkTopActions}>
                <TouchableOpacity
                  style={[s.bulkDeletePill, seriesSelectedIds.size === 0 && { opacity: 0.35 }]}
                  activeOpacity={0.7}
                  disabled={seriesSelectedIds.size === 0}
                  onPress={seriesBulkDelete}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <ThemedText style={s.bulkDeletePillText}>
                    Delete{seriesSelectedIds.size > 0 ? ` (${seriesSelectedIds.size})` : ''}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.pracHeaderRow}>
              <ThemedText style={[s.seriesHeaderLabel, { flex: 1 }]}>SESSION SERIES</ThemedText>
              <View style={s.pracHeaderActions}>
                {seriesList.length > 0 && (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setSeriesSelectMode(true)} style={s.selectTextBtn}>
                    <ThemedText style={s.selectTextBtnLabel}>Select</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.newPill} activeOpacity={0.8} onPress={() => setShowNewSeries(true)}>
                  <ThemedText style={s.newPillText}>+ New Series</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {seriesLoading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 20 }} />
          ) : seriesList.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="layers-outline" size={42} color={MUTED} style={{ marginBottom: 14 }} />
              <ThemedText style={s.emptyTitle}>No series yet</ThemedText>
              <ThemedText style={s.emptyDesc}>
                Group sessions into a multi-day plan (e.g. "5 Day Elite Camp").
              </ThemedText>
              <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 18, width: '100%' }} onPress={() => setShowNewSeries(true)}>
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyBtn}>
                  <ThemedText style={s.emptyBtnText}>+ Create your first series</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            seriesList.map(series => {
              const isSel = seriesSelectedIds.has(series.id);
              const card = (
                <TouchableOpacity
                  key={series.id}
                  style={[s.sessionCard, isSel && { borderColor: TEAL, backgroundColor: '#0D2A24' }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (seriesSelectMode) { toggleSeriesSelect(series.id); return; }
                    router.push(`/series/${series.id}` as any);
                  }}
                  onLongPress={() => { setSeriesSelectMode(true); toggleSeriesSelect(series.id); }}
                >
                  {seriesSelectMode && (
                    <View style={s.checkbox}>
                      {isSel
                        ? <Ionicons name="checkmark-circle" size={22} color={TEAL} />
                        : <Ionicons name="ellipse-outline" size={22} color={MUTED} />
                      }
                    </View>
                  )}
                  <View style={s.seriesDayBadge}>
                    <ThemedText style={s.seriesDayNum}>{series.day_count}</ThemedText>
                    <ThemedText style={s.seriesDayLabel}>DAYS</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.sessionName}>{series.name}</ThemedText>
                    {series.description
                      ? <ThemedText style={s.sessionMeta}>{series.description}</ThemedText>
                      : <ThemedText style={s.sessionMeta}>{series.day_count} day plan</ThemedText>}
                  </View>
                  {!seriesSelectMode && (
                    <View style={s.sessionActions}>
                      <TouchableOpacity
                        style={s.iconHitbox}
                        activeOpacity={0.7}
                        onPress={() => toggleSeriesFavorite(series.id, series.isFavorite)}
                      >
                        <Ionicons
                          name={series.isFavorite ? 'heart' : 'heart-outline'}
                          size={20}
                          color={series.isFavorite ? '#EF4444' : MUTED}
                        />
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={16} color={MUTED} />
                    </View>
                  )}
                </TouchableOpacity>
              );

              if (seriesSelectMode) return card;

              return (
                <Swipeable
                  key={series.id}
                  renderRightActions={() => (
                    <TouchableOpacity
                      style={s.swipeDelete}
                      activeOpacity={0.85}
                      onPress={async () => {
                        await supabase.from('session_series').delete().eq('id', series.id);
                        setSeriesList(prev => prev.filter(s => s.id !== series.id));
                      }}
                    >
                      <Ionicons name="trash-outline" size={22} color="#fff" />
                      <ThemedText style={s.swipeDeleteText}>Delete</ThemedText>
                    </TouchableOpacity>
                  )}
                >
                  {card}
                </Swipeable>
              );
            })
          )}

        </>
      )}

      {/* New Session Modal — outside conditional so it renders in both sections */}
      <Modal visible={showNewSession} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <ThemedText style={s.modalTitle}>New Session</ThemedText>
                <TouchableOpacity onPress={() => { setShowNewSession(false); setNewSessionTitle(''); }}>
                  <Ionicons name="close" size={22} color={MUTED} />
                </TouchableOpacity>
              </View>
              <View style={s.modalBody}>
                <ThemedText style={s.modalFieldLabel}>SESSION TITLE</ThemedText>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g. Tuesday Night Practice"
                  placeholderTextColor={MUTED}
                  value={newSessionTitle}
                  onChangeText={setNewSessionTitle}
                  autoFocus
                />
                <TouchableOpacity
                  style={[s.modalCreateBtn, (!newSessionTitle.trim() || creating) && { opacity: 0.4 }]}
                  onPress={createSession}
                  disabled={!newSessionTitle.trim() || creating}
                >
                  <ThemedText style={s.modalCreateText}>{creating ? 'Creating…' : 'Create Session'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* New Series Modal */}
      <Modal visible={showNewSeries} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <ThemedText style={s.modalTitle}>New Series</ThemedText>
                <TouchableOpacity onPress={() => { setShowNewSeries(false); setNewName(''); setNewDays(''); }}>
                  <Ionicons name="close" size={22} color={MUTED} />
                </TouchableOpacity>
              </View>
              <View style={s.modalBody}>
                <ThemedText style={s.modalFieldLabel}>SERIES NAME</ThemedText>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g. 5 Day Elite Camp Plan"
                  placeholderTextColor={MUTED}
                  value={newName}
                  onChangeText={setNewName}
                />
                <ThemedText style={[s.modalFieldLabel, { marginTop: 16 }]}>NUMBER OF DAYS</ThemedText>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g. 5"
                  placeholderTextColor={MUTED}
                  value={newDays}
                  onChangeText={setNewDays}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={[s.modalCreateBtn, (!newName.trim() || !newDays.trim() || creating) && { opacity: 0.4 }]}
                  onPress={createSeries}
                  disabled={!newName.trim() || !newDays.trim() || creating}
                >
                  <ThemedText style={s.modalCreateText}>{creating ? 'Creating…' : 'Create & Build Series'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── My Drills Tab ────────────────────────────────────────────────────────────
type MyDrill = { id: string; title: string; difficulty_level: string | null; duration_minutes: number | null; source_url: string | null; source_type: string | null; created_at: string; isFavorite: boolean };

function MyDrillsTab({
  onCreateDrill,
  refreshKey,
}: {
  onCreateDrill: () => void;
  refreshKey: number;
}) {
  const router = useRouter();
  const [drills,     setDrills]     = useState<MyDrill[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds,setSelectedIds]= useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [{ data }, { data: ihs }, { data: favRows }] = await Promise.all([
        supabase
          .from('drills')
          .select('id, title, difficulty_level, duration_minutes, source_url, source_type, created_at')
          .eq('coach_id', user.id)
          .eq('source_type', 'original')
          .order('created_at', { ascending: false }),
        supabase
          .from('drills')
          .select('id, title, difficulty_level, duration_minutes, source_url, source_type, created_at')
          .eq('coach_id', user.id)
          .neq('source_type', 'original')
          .order('created_at', { ascending: false }),
        supabase
          .from('drill_favorites')
          .select('drill_id')
          .eq('user_id', user.id),
      ]);
      const favSet = new Set((favRows ?? []).map((f: any) => f.drill_id));
      const all = [...(data ?? []), ...(ihs ?? [])];
      setDrills(all.map((d: any) => ({ ...d, isFavorite: favSet.has(d.id) })) as MyDrill[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  function exitSelect() { setSelectMode(false); setSelectedIds(new Set()); }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function toggleFavorite(id: string, current: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (current) {
      await supabase.from('drill_favorites').delete().eq('user_id', user.id).eq('drill_id', id);
    } else {
      await supabase.from('drill_favorites').insert({ user_id: user.id, drill_id: id });
    }
    setDrills(prev => prev.map(d => d.id === id ? { ...d, isFavorite: !current } : d));
  }

  function bulkDelete() {
    const ids = [...selectedIds];
    Alert.alert('Delete Drills', `Delete ${ids.length} drill${ids.length > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          for (const id of ids) {
            await supabase.from('drills').delete().eq('id', id);
          }
          setDrills(prev => prev.filter(d => !selectedIds.has(d.id)));
          exitSelect();
        },
      },
    ]);
  }

  return (
    <>
      {/* Header */}
      {selectMode ? (
        <View style={s.bulkTopBar}>
          <TouchableOpacity onPress={exitSelect} activeOpacity={0.7} style={s.bulkTopCancel}>
            <ThemedText style={s.bulkTopCancelText}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText style={s.bulkTopCount}>
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Tap to select'}
          </ThemedText>
          <View style={s.bulkTopActions}>
            <TouchableOpacity
              style={[s.bulkDeletePill, selectedIds.size === 0 && { opacity: 0.35 }]}
              activeOpacity={0.7}
              disabled={selectedIds.size === 0}
              onPress={bulkDelete}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <ThemedText style={s.bulkDeletePillText}>
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.myDrillsHeader}>
          <ThemedText style={s.myDrillsTitle}>MY DRILLS</ThemedText>
          <View style={s.myDrillsActions}>
            {drills.length > 0 && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectMode(true)} style={s.selectTextBtn}>
                <ThemedText style={s.selectTextBtnLabel}>Select</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onCreateDrill} activeOpacity={0.8} style={s.createDrillBtn}>
              <ThemedText style={s.createDrillText}>+ Create Drill</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : drills.length === 0 ? (
        <>
          <View style={s.emptyCard}>
            <Ionicons name="football-outline" size={36} color={MUTED} />
            <ThemedText style={s.emptyTitle}>No custom drills yet</ThemedText>
            <ThemedText style={s.emptyDesc}>
              Use "Create Drill" to add your own drills to your personal library.
            </ThemedText>
          </View>
          <ThemedText style={s.myDrillsFooter}>
            For IHS recordings, paste the shareable link when creating a drill.
          </ThemedText>
        </>
      ) : (
        drills.map(d => {
          const isSel = selectedIds.has(d.id);
          const card = (
            <TouchableOpacity
              key={d.id}
              style={[s.sessionCard, isSel && { borderColor: TEAL, backgroundColor: '#0D2A24' }]}
              activeOpacity={0.8}
              onPress={() => {
                if (selectMode) { toggleSelect(d.id); return; }
                router.push(`/drill/${d.id}` as any);
              }}
              onLongPress={() => { setSelectMode(true); toggleSelect(d.id); }}
            >
              {selectMode && (
                <View style={s.checkbox}>
                  {isSel
                    ? <Ionicons name="checkmark-circle" size={22} color={TEAL} />
                    : <Ionicons name="ellipse-outline" size={22} color={MUTED} />
                  }
                </View>
              )}
              <View style={{ flex: 1 }}>
                <ThemedText style={s.sessionName}>{d.title}</ThemedText>
                <ThemedText style={s.sessionMeta}>
                  {[
                    d.difficulty_level ? d.difficulty_level.charAt(0).toUpperCase() + d.difficulty_level.slice(1) : null,
                    d.duration_minutes ? `${d.duration_minutes} min` : null,
                    d.source_url ? '🔗 IHS link' : null,
                  ].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
              {!selectMode && (
                <View style={s.sessionActions}>
                  <TouchableOpacity
                    style={s.iconHitbox}
                    activeOpacity={0.7}
                    onPress={() => toggleFavorite(d.id, d.isFavorite)}
                  >
                    <Ionicons
                      name={d.isFavorite ? 'heart' : 'heart-outline'}
                      size={20}
                      color={d.isFavorite ? '#EF4444' : MUTED}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.iconHitbox}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/drill/${d.id}` as any)}
                  >
                    <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );

          if (selectMode) return card;

          return (
            <Swipeable
              key={d.id}
              renderRightActions={() => (
                <TouchableOpacity
                  style={s.swipeDelete}
                  activeOpacity={0.85}
                  onPress={async () => {
                    await supabase.from('drills').delete().eq('id', d.id);
                    setDrills(prev => prev.filter(x => x.id !== d.id));
                  }}
                >
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                  <ThemedText style={s.swipeDeleteText}>Delete</ThemedText>
                </TouchableOpacity>
              )}
            >
              {card}
            </Swipeable>
          );
        })
      )}
    </>
  );
}

// ─── Favorites Tab ────────────────────────────────────────────────────────────
function FavoritesTab() {
  const router = useRouter();
  const [filter,      setFilter]      = useState<FavFilter>('all');
  const [drillCatFilter, setDrillCatFilter] = useState<string>('all');
  const [favDrills,   setFavDrills]   = useState<LibDrill[]>([]);
  const [favSessions, setFavSessions] = useState<{ id: string; name: string; dur: number; drillCount: number }[]>([]);
  const [favSeries,   setFavSeries]   = useState<{ id: string; name: string; day_count: number }[]>([]);
  const [loading,     setLoading]     = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Split drill_favorites → drills into two queries to avoid RLS join blocking coach's own drills
        const [{ data: favRows }, { data: sesRows }, { data: seriesRows }] = await Promise.all([
          supabase.from('drill_favorites').select('drill_id').eq('user_id', user.id),
          supabase
            .from('sessions')
            .select('id, title, total_duration_minutes, session_drills(count)')
            .eq('coach_id', user.id).eq('is_template', true).eq('is_favorite', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('session_series')
            .select('id, name, day_count')
            .eq('coach_id', user.id).eq('is_favorite', true)
            .order('created_at', { ascending: false }),
        ]);

        // Fetch drills separately so coach's unpublished drills are included
        const drillIds = (favRows ?? []).map((f: any) => f.drill_id);
        let mapped: LibDrill[] = [];
        if (drillIds.length > 0) {
          const { data: drillDetails } = await supabase
            .from('drills')
            .select('id, title, category_id, difficulty_level, age_group, duration_minutes, drill_categories(title)')
            .in('id', drillIds);
          mapped = (drillDetails ?? []).map((d: any) => {
            const catT: any = Array.isArray(d.drill_categories) ? d.drill_categories[0] : d.drill_categories;
            return {
              id: d.id, name: d.title, cat: slugify(catT?.title ?? 'general'),
              catTitle: catT?.title ?? '', level: d.difficulty_level ?? '',
              ages: d.age_group ?? '', dur: d.duration_minutes ?? 0, desc: '',
            };
          });
        }

        setFavDrills(mapped);
        setFavSessions((sesRows ?? []).map((s: any) => ({
          id: s.id, name: s.title ?? 'Untitled',
          dur: s.total_duration_minutes ?? 0,
          drillCount: s.session_drills?.[0]?.count ?? 0,
        })));
        setFavSeries((seriesRows ?? []).map((s: any) => ({
          id: s.id, name: s.name, day_count: s.day_count,
        })));
        setLoading(false);
      })();
    }, [])
  );

  const showDrills   = filter === 'all' || filter === 'drills';
  const showSessions = filter === 'all' || filter === 'sessions';
  const showSeries   = filter === 'all' || filter === 'series';

  // Derive unique drill categories that actually have favorites
  const drillCats = Array.from(new Set(favDrills.map(d => d.cat)));
  const filteredDrills = drillCatFilter === 'all'
    ? favDrills
    : favDrills.filter(d => d.cat === drillCatFilter);

  const total = favDrills.length + favSessions.length + favSeries.length;
  const FAV_CHIPS = [
    { key: 'all',      label: `All (${total})`                    },
    { key: 'drills',   label: `Drills (${favDrills.length})`      },
    { key: 'sessions', label: `Sessions (${favSessions.length})`  },
    { key: 'series',   label: `Series (${favSeries.length})`      },
  ];

  return (
    <>
      {/* Top-level filter */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.chipRow, { marginTop: 12 }]}
        style={{ marginBottom: 4 }}
      >
        {FAV_CHIPS.map(c => (
          <TouchableOpacity
            key={c.key}
            onPress={() => { setFilter(c.key as FavFilter); setDrillCatFilter('all'); }}
            activeOpacity={0.8}
            style={[s.chip, filter === c.key && s.chipActive]}
          >
            <ThemedText style={[s.chipText, filter === c.key && s.chipTextActive]}>{c.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category sub-chips — only when drills are visible and there's >1 category */}
      {showDrills && drillCats.length > 1 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.chipRow, { marginTop: 4 }]}
          style={{ marginBottom: 4 }}
        >
          {['all', ...drillCats].map(cat => {
            const cfg = cat === 'all' ? null : (CAT_CONFIG[cat] ?? CAT_CONFIG['skating']);
            const label = cat === 'all' ? 'All' : (cfg?.label ?? cat.toUpperCase());
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setDrillCatFilter(cat)}
                activeOpacity={0.8}
                style={[s.chip, drillCatFilter === cat && s.chipActive]}
              >
                <ThemedText style={[s.chipText, drillCatFilter === cat && s.chipTextActive]}>{label}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : (
        <>
          {showDrills && (
            <>
              <ThemedText style={[s.secLabel, { marginTop: 16 }]}>DRILLS</ThemedText>
              {filteredDrills.length === 0 ? (
                <ThemedText style={[s.emptyDesc, { marginHorizontal: 0, marginTop: 8 }]}>No favorited drills yet</ThemedText>
              ) : filteredDrills.map(d => {
                const cfg = CAT_CONFIG[d.cat] ?? CAT_CONFIG['skating'];
                return (
                  <TouchableOpacity key={d.id} style={s.favRow} activeOpacity={0.8}
                    onPress={() => router.push(`/drill/${d.id}` as any)}>
                    <Ionicons name={cfg.icon as any} size={20} color={cfg.color} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={s.favName}>{d.name}</ThemedText>
                      <ThemedText style={[s.favCat, { color: cfg.color }]}>{d.catTitle || cfg.label}</ThemedText>
                    </View>
                    <Ionicons name="heart" size={20} color="#EF4444" />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {showSessions && (
            <>
              <ThemedText style={[s.secLabel, { marginTop: 16 }]}>SESSIONS</ThemedText>
              {favSessions.length === 0 ? (
                <ThemedText style={[s.emptyDesc, { marginHorizontal: 0, marginTop: 8 }]}>No favorited sessions yet</ThemedText>
              ) : favSessions.map(p => (
                <TouchableOpacity key={p.id} style={s.favRow} activeOpacity={0.8}
                  onPress={() => router.push(`/session-plan/${p.id}` as any)}>
                  <Ionicons name="time-outline" size={20} color={TEAL} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.favName}>{p.name}</ThemedText>
                    <ThemedText style={s.favCat}>⏱ {p.dur} min · {p.drillCount} drills</ThemedText>
                  </View>
                  <Ionicons name="heart" size={20} color="#EF4444" />
                </TouchableOpacity>
              ))}
            </>
          )}

          {showSeries && (
            <>
              <ThemedText style={[s.secLabel, { marginTop: 16 }]}>SERIES</ThemedText>
              {favSeries.length === 0 ? (
                <ThemedText style={[s.emptyDesc, { marginHorizontal: 0, marginTop: 8 }]}>No favorited series yet</ThemedText>
              ) : favSeries.map(sr => (
                <TouchableOpacity key={sr.id} style={s.favRow} activeOpacity={0.8}
                  onPress={() => router.push(`/series/${sr.id}` as any)}>
                  <Ionicons name="layers-outline" size={20} color={TEAL} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={s.favName}>{sr.name}</ThemedText>
                    <ThemedText style={s.favCat}>{sr.day_count} day plan</ThemedText>
                  </View>
                  <Ionicons name="heart" size={20} color="#EF4444" />
                </TouchableOpacity>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

// ─── Create Drill Modal ───────────────────────────────────────────────────────
const DRILL_CATS   = ['PXF Slips', 'PXF Skating', 'Skating', 'Puck Skills', 'Flow', 'Team Systems', 'Shooting', 'Small Area', 'Puck Protection', 'Games', 'Goalie'];
const DRILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

function CreateDrillModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [drillName,      setDrillName]      = useState('');
  const [category,       setCategory]       = useState('PXF Slips');
  const [level,          setLevel]          = useState('Intermediate');
  const [ageGroup,       setAgeGroup]       = useState('U13+');
  const [duration,       setDuration]       = useState('10');
  const [description,    setDescription]    = useState('');
  const [coachingNotes,  setCoachingNotes]  = useState('');
  const [drillUrl,       setDrillUrl]       = useState('');
  const [saving,         setSaving]         = useState(false);

  function reset() {
    setDrillName(''); setCategory('PXF Slips'); setLevel('Intermediate');
    setAgeGroup('U13+'); setDuration('10'); setDescription('');
    setCoachingNotes(''); setDrillUrl(''); setSaving(false);
  }

  async function handleSave() {
    if (!drillName.trim()) { Alert.alert('Drill name is required'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Look up the category_id from the selected category title
    const { data: catRow } = await supabase
      .from('drill_categories')
      .select('id')
      .eq('title', category)
      .maybeSingle();

    const { error } = await supabase.from('drills').insert({
      coach_id:         user.id,
      title:            drillName.trim(),
      category_id:      catRow?.id ?? null,
      difficulty_level: level.toLowerCase() as 'beginner' | 'intermediate' | 'advanced',
      age_group:        ageGroup,
      duration_minutes: parseInt(duration, 10) || 10,
      coaching_points:  coachingNotes.trim() ? [coachingNotes.trim()] : null,
      source_url:       drillUrl.trim() || null,
      source_type:      drillUrl.trim() ? 'ihs_import' : 'original',
    });

    setSaving(false);
    if (error) { Alert.alert('Error saving drill', error.message); return; }
    reset();
    onClose();
    onSaved?.();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}
        >
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={s.sheetHeader}>
                <View>
                  <ThemedText style={s.sheetNewLabel}>NEW</ThemedText>
                  <ThemedText style={s.sheetTitle}>Create Drill</ThemedText>
                </View>
                <TouchableOpacity onPress={() => { reset(); onClose(); }} style={s.closeBtn} activeOpacity={0.8}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              {/* Drill Name */}
              <ThemedText style={s.fieldLabel}>DRILL NAME *</ThemedText>
              <TextInput
                style={s.textInput}
                placeholder="e.g. Tight Turn Shooter"
                placeholderTextColor={MUTED}
                value={drillName}
                onChangeText={setDrillName}
                autoFocus
              />

              {/* Category */}
              <ThemedText style={s.fieldLabel}>CATEGORY</ThemedText>
              <View style={s.chipWrap}>
                {DRILL_CATS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    activeOpacity={0.8}
                    style={[s.wrapChip, category === c && s.wrapChipActive]}
                  >
                    <ThemedText style={[s.wrapChipText, category === c && s.wrapChipTextActive]}>
                      {c}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Level */}
              <ThemedText style={s.fieldLabel}>LEVEL</ThemedText>
              <View style={s.chipWrap}>
                {DRILL_LEVELS.map(l => (
                  <TouchableOpacity
                    key={l}
                    onPress={() => setLevel(l)}
                    activeOpacity={0.8}
                    style={[s.wrapChip, level === l && s.wrapChipActive]}
                  >
                    <ThemedText style={[s.wrapChipText, level === l && s.wrapChipTextActive]}>
                      {l}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Age Group + Duration */}
              <View style={s.twoCol}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.fieldLabel}>AGE GROUP</ThemedText>
                  <TextInput
                    style={s.textInput}
                    value={ageGroup}
                    onChangeText={setAgeGroup}
                    placeholderTextColor={MUTED}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.fieldLabel}>DURATION (MIN)</ThemedText>
                  <TextInput
                    style={s.textInput}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    placeholderTextColor={MUTED}
                  />
                </View>
              </View>

              {/* Description */}
              <ThemedText style={s.fieldLabel}>DESCRIPTION</ThemedText>
              <TextInput
                style={[s.textInput, s.textArea]}
                placeholder="Drill setup and instructions..."
                placeholderTextColor={MUTED}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Coaching Notes */}
              <ThemedText style={s.fieldLabel}>COACHING NOTES</ThemedText>
              <TextInput
                style={[s.textInput, s.textArea]}
                placeholder="Private — not visible to athletes"
                placeholderTextColor={MUTED}
                value={coachingNotes}
                onChangeText={setCoachingNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <ThemedText style={s.fieldNote}>Private — not visible to athletes.</ThemedText>

              {/* Drill URL */}
              <ThemedText style={s.fieldLabel}>DRILL URL / SHAREABLE LINK (OPTIONAL)</ThemedText>
              <TextInput
                style={s.textInput}
                placeholder="Paste drill URL or shareable link..."
                placeholderTextColor={MUTED}
                value={drillUrl}
                onChangeText={setDrillUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              <ThemedText style={s.fieldNote}>Athletes will be directed to this link to view the drill.</ThemedText>

              {/* Video */}
              <ThemedText style={s.fieldLabel}>VIDEO</ThemedText>
              <View style={[s.mediaBtn, { opacity: 0.4 }]}>
                <ThemedText style={s.mediaBtnText}>⬜  Add video from drill detail</ThemedText>
              </View>

              {/* Diagram */}
              <ThemedText style={s.fieldLabel}>DIAGRAM</ThemedText>
              <TouchableOpacity style={s.mediaBtn} activeOpacity={0.8}>
                <ThemedText style={s.mediaBtnText}>🎨  Add Diagram</ThemedText>
              </TouchableOpacity>

              {/* Save */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[{ marginTop: 24, marginBottom: 40 }, (!drillName.trim() || saving) && { opacity: 0.45 }]}
                onPress={handleSave}
                disabled={!drillName.trim() || saving}
              >
                <LinearGradient
                  colors={[TEAL, GREEN]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.saveBtn}
                >
                  <ThemedText style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Drill'}</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Upload Video Modal ───────────────────────────────────────────────────────
const UPLOAD_CATS   = ['Skating', 'Slip Training', 'Dryland', 'Other'];
const UPLOAD_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

function UploadVideoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [category, setCategory] = useState('Skating');
  const [level,    setLevel]    = useState('Intermediate');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}
        >
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={s.sheetHeader}>
                <View>
                  <ThemedText style={s.sheetNewLabel}>NEW</ThemedText>
                  <ThemedText style={s.sheetTitle}>Upload Video</ThemedText>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.8}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              {/* Camera roll selector */}
              <TouchableOpacity style={s.cameraRollBtn} activeOpacity={0.8}>
                <ThemedText style={s.cameraRollText}>Select video from camera roll</ThemedText>
              </TouchableOpacity>

              {/* Drill Name */}
              <ThemedText style={s.fieldLabel}>DRILL NAME</ThemedText>
              <TextInput
                style={s.textInput}
                placeholder="e.g. Backhand Release"
                placeholderTextColor={MUTED}
              />

              {/* Category */}
              <ThemedText style={s.fieldLabel}>CATEGORY</ThemedText>
              <View style={s.chipWrap}>
                {UPLOAD_CATS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    activeOpacity={0.8}
                    style={[s.wrapChip, category === c && s.wrapChipActive]}
                  >
                    <ThemedText style={[s.wrapChipText, category === c && s.wrapChipTextActive]}>
                      {c}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Level */}
              <ThemedText style={s.fieldLabel}>LEVEL</ThemedText>
              <View style={s.chipWrap}>
                {UPLOAD_LEVELS.map(l => (
                  <TouchableOpacity
                    key={l}
                    onPress={() => setLevel(l)}
                    activeOpacity={0.8}
                    style={[s.wrapChip, level === l && s.wrapChipActive]}
                  >
                    <ThemedText style={[s.wrapChipText, level === l && s.wrapChipTextActive]}>
                      {l}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Trim slider (static visual) */}
              <ThemedText style={s.fieldLabel}>TRIM · IN 0% · OUT 100%</ThemedText>
              <View style={s.trimContainer}>
                <View style={s.trimTrack}>
                  <View style={s.trimFill} />
                  <View style={[s.trimHandle, { left: -10 }]} />
                  <View style={[s.trimHandle, { right: -10 }]} />
                </View>
              </View>

              {/* Save */}
              <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 28, marginBottom: 12 }}>
                <LinearGradient
                  colors={[TEAL, GREEN]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.saveBtn}
                >
                  <ThemedText style={s.saveBtnText}>Save to My Drills</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
              <ThemedText style={[s.fieldNote, { textAlign: 'center', marginBottom: 40 }]}>
                For IHS recordings, upload directly from the web portal for best quality.
              </ThemedText>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: 'library',   label: 'Library'   },
  { key: 'practices', label: 'Practices' },
  { key: 'my-drills', label: 'My Drills' },
  { key: 'favorites', label: 'Favorites' },
];

export default function PlaybookScreen() {
  const router = useRouter();
  const [tab,          setTab]        = useState<Tab>('library');
  const [libFilter,    setLibFilter]  = useState<LibFilter>('all');
  const [showCreate,   setShowCreate] = useState(false);
  const [drillRefresh, setDrillRefresh] = useState(0);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* COACH chip row */}
        <View style={s.coachRow}>
          <View style={s.coachChip}>
            <ThemedText style={s.coachChipText}>COACH</ThemedText>
          </View>
          <View style={s.coachIcons}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/profile' as any)}>
              <Ionicons name="person-circle-outline" size={22} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/business' as any)}>
              <Ionicons name="briefcase-outline" size={20} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/record' as any)}>
              <Ionicons name="camera-outline" size={20} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/settings' as any)}>
              <Ionicons name="settings-outline" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PLAYBOOK label + Dryland pill */}
        <View style={s.playbookRow}>
          <ThemedText style={s.playbookLabel}>PLAYBOOK</ThemedText>
          <TouchableOpacity
            style={s.drylandPill}
            activeOpacity={0.8}
            onPress={() => router.push('/dryland' as any)}
          >
            <Ionicons name="barbell-outline" size={12} color={PURPLE} />
            <ThemedText style={s.drylandPillText}>OFF-ICE TRAINING</ThemedText>
            <View style={s.drylandSoonDot} />
            <ThemedText style={s.drylandPillSoon}>soon</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Tab selector */}
        <View style={s.tabSelector}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
              style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            >
              <ThemedText
                style={[s.tabBtnText, tab === t.key && s.tabBtnTextActive]}
                numberOfLines={1}
              >
                {t.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {tab === 'library'   && <LibraryTab filter={libFilter} onFilter={setLibFilter} />}
          {tab === 'practices' && <PracticesTab />}
          {tab === 'my-drills' && (
            <MyDrillsTab
              onCreateDrill={() => setShowCreate(true)}
              refreshKey={drillRefresh}
            />
          )}
          {tab === 'favorites' && <FavoritesTab />}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      <CreateDrillModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setDrillRefresh(k => k + 1); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  safe:    { flex: 1 },
  content: { paddingBottom: 16 },

  // Founding Member banner
  memberBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 12, padding: 12, gap: 8,
  },
  memberText: { fontSize: 13, color: TEXT, lineHeight: 18 },
  eliteChip:  {
    backgroundColor: TEAL, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, flexShrink: 0,
  },
  eliteText: { fontSize: 11, fontWeight: '800', color: '#000', textAlign: 'center', lineHeight: 15 },

  // COACH row
  coachRow:      {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  coachChip:     {
    backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: TEAL,
  },
  coachChipText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  coachIcons:    { flexDirection: 'row', gap: 4 },
  iconBtn:       { padding: 6 },
  iconHitbox:    { padding: 6 },

  playbookRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  playbookLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2,
  },
  drylandPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },
  drylandPillText: {
    fontSize: 10, fontWeight: '800', color: PURPLE, letterSpacing: 1,
  },
  drylandSoonDot: {
    width: 3, height: 3, borderRadius: 2, backgroundColor: MUTED,
  },
  drylandPillSoon: {
    fontSize: 10, fontWeight: '500', color: MUTED,
  },

  // Tab selector
  tabSelector:       {
    flexDirection: 'row', backgroundColor: CARD,
    borderRadius: 30, marginHorizontal: 16, padding: 4, marginBottom: 4,
  },
  tabBtn:            { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 26 },
  tabBtnActive:      { backgroundColor: TEAL },
  tabBtnText:        { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  tabBtnTextActive:  { color: '#000' },

  // Section label
  secLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 2, paddingHorizontal: 16, marginBottom: 8,
  },

  // Library - search
  searchRow:         {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 16, marginBottom: 10,
  },
  searchBar:         {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  searchPlaceholder: { color: MUTED, fontSize: 14 },
  filterBtn:         {
    width: 42, height: 42, backgroundColor: CARD, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },

  // Filter chips (horizontal scroll)
  chipRow: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },

  chip:            {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  chipActive:      { backgroundColor: TEAL, borderColor: TEAL },
  chipText:        { fontSize: 13, color: MUTED, fontWeight: '600' },
  chipTextActive:  { color: '#000', fontWeight: '700' },

  // Category section headers
  catTitle: {
    fontSize: 12, fontWeight: '700', color: MUTED,
    letterSpacing: 2, paddingHorizontal: 16, marginBottom: 2,
  },
  catDesc:  {
    fontSize: 13, color: MUTED, paddingHorizontal: 16, marginBottom: 12,
  },

  // Drill card
  drillCard: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  drillTop:  { flexDirection: 'row', gap: 12, marginBottom: 12 },
  drillIcon: {
    width: 60, height: 60, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  drillInfo: { flex: 1 },
  drillName: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 3, lineHeight: 21 },
  drillTags: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  drillMeta: { fontSize: 12, color: MUTED, marginBottom: 6 },
  drillDesc: { fontSize: 13, color: '#C0C8D4', lineHeight: 18 },

  addBtn:     { overflow: 'hidden', borderRadius: 10 },
  addBtnGrad: { paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },

  // Practices sub-toggle
  subToggleContainer: {
    flexDirection: 'row', backgroundColor: CARD, borderRadius: 30,
    marginHorizontal: 16, padding: 4, marginTop: 14, marginBottom: 12,
  },
  subToggleBtn:        { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 26 },
  subToggleBtnActive:  { backgroundColor: GREEN },
  subToggleText:       { fontSize: 14, fontWeight: '600', color: MUTED },
  subToggleTextActive: { color: '#000', fontWeight: '700' },

  // Practices individual - header row
  pracHeaderRow:    {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 10, gap: 8,
  },
  pracChipsWrap:    { flexDirection: 'row', gap: 8, flex: 1 },
  pracHeaderActions:{ flexDirection: 'row', gap: 8 },
  folderBtn:        {
    width: 36, height: 36, backgroundColor: CARD, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  newPill:          { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  newPillText:      { fontSize: 13, fontWeight: '700', color: '#000' },

  // Session card
  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  sessionName:    { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  sessionMeta:    { fontSize: 12, color: MUTED },
  sessionActions: { flexDirection: 'row', gap: 2 },
  swipeDelete: {
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
    width: 80, marginBottom: 8, borderRadius: 12, marginRight: 16, gap: 4,
  },
  swipeDeleteText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  checkbox: { marginRight: 10 },

  // Select button (text link style, no box)
  selectTextBtn:      { paddingHorizontal: 4, paddingVertical: 6 },
  selectTextBtnLabel: { fontSize: 14, color: MUTED, fontWeight: '600' },

  // Top bulk action bar (replaces chip row in select mode)
  bulkTopBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 10, height: 40,
  },
  bulkTopCancel:     { marginRight: 10 },
  bulkTopCancelText: { fontSize: 14, color: TEAL, fontWeight: '600' },
  bulkTopCount:      { flex: 1, fontSize: 14, color: MUTED, fontWeight: '500' },
  bulkTopActions:    { flexDirection: 'row', gap: 4 },
  bulkTopBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: CARD,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  bulkDeletePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 40, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: CARD, borderWidth: 1, borderColor: '#EF4444',
  },
  bulkDeletePillText: { fontSize: 13, color: '#EF4444', fontWeight: '700' },

  // Series
  seriesHeaderRow:   {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: 14, marginBottom: 10,
  },
  seriesHeaderLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2,
  },

  // Empty state
  emptyCard: {
    marginHorizontal: 16, marginTop: 4, backgroundColor: CARD,
    borderRadius: 14, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed',
  },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 8 },
  emptyDesc:    { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  emptyBtn:     { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },

  // My Drills
  myDrillsHeader:  {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
  },
  myDrillsTitle:   { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 2, flex: 1 },
  myDrillsSub:     { fontSize: 13, color: MUTED },
  myDrillsActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createDrillBtn:  { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  createDrillText: { fontSize: 13, fontWeight: '700', color: '#000' },
  uploadBtn:       {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: TEAL, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  uploadBtnText:   { fontSize: 13, fontWeight: '600', color: TEAL },

  myDrillCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD,
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER,
  },
  videoThumb: {
    width: 76, height: 66, backgroundColor: '#000', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0, position: 'relative',
  },
  ihsBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: 'rgba(0,196,180,0.2)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: TEAL,
  },
  ihsText:        { fontSize: 9, fontWeight: '700', color: TEAL },
  myDrillInfo:    { flex: 1 },
  myDrillName:    { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 3, lineHeight: 19 },
  myDrillTags:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  myDrillMeta:    { fontSize: 12, color: MUTED },
  myDrillActions: { alignItems: 'center', gap: 8, paddingLeft: 4 },
  myDrillsFooter: {
    fontSize: 12, color: MUTED, textAlign: 'center',
    paddingHorizontal: 24, marginTop: 16,
  },

  // Favorites
  favRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 6, backgroundColor: CARD,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  favName: { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 2 },
  favCat:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  favMeta: { fontSize: 12, color: MUTED },

  // Modal overlay + sheet
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#121820',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '92%', paddingHorizontal: 20, paddingTop: 10,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },

  sheetHeader:   {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 20,
  },
  sheetNewLabel: { fontSize: 12, fontWeight: '700', color: GREEN, letterSpacing: 1, marginBottom: 4 },
  sheetTitle:    { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  closeBtn:      {
    width: 36, height: 36, backgroundColor: CARD,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 1.5, marginBottom: 8, marginTop: 16,
  },
  fieldNote:  { fontSize: 12, color: MUTED, marginTop: 6 },
  textInput:  {
    backgroundColor: CARD, borderRadius: 10, padding: 12,
    color: TEXT, fontSize: 14, borderWidth: 1, borderColor: BORDER,
  },
  textArea:   { minHeight: 80, paddingTop: 10 },

  twoCol: { flexDirection: 'row', gap: 10 },

  // Wrapping chips (modal)
  chipWrap:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wrapChip:           {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  wrapChipActive:     { backgroundColor: TEAL, borderColor: TEAL },
  wrapChipText:       { fontSize: 13, color: MUTED, fontWeight: '600' },
  wrapChipTextActive: { color: '#000', fontWeight: '700' },

  mediaBtn:     {
    backgroundColor: CARD, borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  mediaBtnText: { fontSize: 14, color: MUTED },

  saveBtn:     { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },

  // Upload Video
  cameraRollBtn:  {
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed',
    borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4,
  },
  cameraRollText: { fontSize: 14, color: MUTED },

  // Trim slider
  trimContainer: { paddingVertical: 16, paddingHorizontal: 10 },
  trimTrack:     {
    height: 4, backgroundColor: BORDER, borderRadius: 2,
    position: 'relative', justifyContent: 'center',
  },
  trimFill:      {
    position: 'absolute', left: 0, right: 0,
    height: 4, backgroundColor: '#3B82F6', borderRadius: 2,
  },
  trimHandle:    {
    position: 'absolute', width: 20, height: 20,
    borderRadius: 10, backgroundColor: TEXT,
    borderWidth: 2, borderColor: '#3B82F6', top: -8,
  },

  // Series cards
  seriesCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 10,
  },
  seriesDayBadge: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  seriesDayNum:   { fontSize: 18, fontWeight: '800', color: TEAL },
  seriesDayLabel: { fontSize: 8, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  seriesName:     { fontSize: 15, fontWeight: '700', color: TEXT },
  seriesDesc:     { fontSize: 12, color: MUTED, marginTop: 2 },

  // New Series modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalHandle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: TEXT },
  modalBody:       { paddingHorizontal: 20, paddingTop: 12 },
  modalFieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 8 },
  modalInput:      { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, color: TEXT, fontSize: 15 },
  modalCreateBtn:  { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  modalCreateText: { fontSize: 15, fontWeight: '800', color: '#000' },
});
