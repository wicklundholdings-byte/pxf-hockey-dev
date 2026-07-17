import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { GradientText } from '@/components/gradient-text';
import { TeamCoachTabBar } from '@/components/team-coach-tab-bar';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const PURPLE = '#8B5CF6';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type Tab         = 'library' | 'practices' | 'my-drills' | 'favorites';
type FavFilter   = 'all' | 'drills' | 'sessions';
type LibFilter   = 'all' | string;
type PracticesSection = 'individual' | 'series';

const CAT_CONFIG: Record<string, { bg: string; color: string; icon: string; label: string; secDesc: string }> = {
  skating:        { bg: 'rgba(0,196,180,0.18)',   color: TEAL,   icon: 'snow-outline',         label: 'SKATING',      secDesc: 'Edge, crossover, and stride progressions for power and control.' },
  'slip-training':{ bg: 'rgba(0,196,180,0.18)',   color: TEAL,   icon: 'flash-outline',         label: 'SLIP CIRCUITS',secDesc: 'Deceptive edge and puck-handling circuits built for game creativity.' },
  gameiq:         { bg: 'rgba(245,158,11,0.18)',  color: ORANGE, icon: 'hardware-chip-outline', label: 'GAMEIQ',       secDesc: 'Reads, positioning, and decision-making concepts for competitive play.' },
  dryland:        { bg: 'rgba(139,92,246,0.18)',  color: PURPLE, icon: 'barbell-outline',       label: 'DRYLAND',      secDesc: 'Off-ice conditioning and athletic development programs.' },
  offensive:      { bg: 'rgba(0,196,180,0.18)',   color: TEAL,   icon: 'flag-outline',          label: 'OFFENSIVE',    secDesc: '' },
  defensive:      { bg: 'rgba(0,196,180,0.18)',   color: TEAL,   icon: 'shield-outline',        label: 'DEFENSIVE',    secDesc: '' },
};

type LibDrill = { id: string; name: string; cat: string; catTitle: string; level: string; ages: string; dur: number; desc: string };
type PracSession = { id: string; name: string; date: string; dur: number; drillCount: number };

function slugify(s: string) { return s.toLowerCase().replace(/\s+/g, '-'); }

// ─── Drill Card ───────────────────────────────────────────────────────────────
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
            <ThemedText style={[s.drillTags, { color: c.color }]}>{drill.catTitle || c.label} · {drill.level}</ThemedText>
            <ThemedText style={s.drillMeta}>{drill.ages ? `Ages ${drill.ages}  ·  ` : ''}⏱ {drill.dur} min</ThemedText>
            {!!drill.desc && <ThemedText style={s.drillDesc}>{drill.desc}</ThemedText>}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.8} style={s.addBtn}>
        <LinearGradient colors={['#3DFF8F', '#2ED573']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addBtnGrad}>
          <ThemedText style={s.addBtnText}>+ Add to Session</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Library Tab ──────────────────────────────────────────────────────────────
function LibraryTab({ filter, onFilter }: { filter: LibFilter; onFilter: (k: LibFilter) => void }) {
  const [drills, setDrills]         = useState<LibDrill[]>([]);
  const [categories, setCategories] = useState<{ slug: string; title: string }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('drill_categories').select('id, title').order('sort_order');
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
        return { id: d.id, name: d.title, cat: catSlug, catTitle: catT?.title ?? '', level: d.difficulty_level ?? '', ages: d.age_group ?? '', dur: d.duration_minutes ?? 0, desc: d.description ?? '' };
      }));
      setLoading(false);
    })();
  }, []);

  const chips = [{ key: 'all', label: 'All' }, ...categories.map(c => ({ key: c.slug, label: c.title }))];
  const catSlugs = filter === 'all' ? categories.map(c => c.slug) : [filter];
  const searchLower = search.toLowerCase();

  return (
    <>
      <ThemedText style={[s.secLabel, { marginTop: 14, marginBottom: 10 }]}>DRILL LIBRARY</ThemedText>
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={MUTED} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search library"
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
        <TouchableOpacity style={s.filterBtn} activeOpacity={0.8}>
          <Ionicons name="funnel-outline" size={18} color={MUTED} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow} style={{ marginBottom: 8 }}>
        {chips.map(chip => (
          <TouchableOpacity key={chip.key} onPress={() => onFilter(chip.key)} activeOpacity={0.8} style={[s.chip, filter === chip.key && s.chipActive]}>
            <ThemedText style={[s.chipText, filter === chip.key && s.chipTextActive]}>{chip.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : drills.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="football-outline" size={32} color={MUTED} />
          <ThemedText style={s.emptyTitle}>No drills in library yet</ThemedText>
        </View>
      ) : catSlugs.map(cat => {
        const catDrills = drills.filter(d => d.cat === cat && (!searchLower || d.name.toLowerCase().includes(searchLower)));
        if (!catDrills.length) return null;
        const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG['skating'];
        const catLabel = categories.find(c => c.slug === cat)?.title ?? cfg.label;
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
const PRAC_CHIPS = [{ key: 'all', label: 'All' }, { key: 'unfiled', label: 'Unfiled' }];

function PracticesTab() {
  const [section, setSection]       = useState<PracticesSection>('individual');
  const [pracFilter, setPracFilter] = useState('all');
  const [sessions, setSessions]     = useState<PracSession[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('sessions')
        .select('id, title, date, total_duration_minutes, session_drills(count)')
        .eq('coach_id', user.id)
        .order('date', { ascending: false })
        .limit(30);
      setSessions((data ?? []).map((s: any) => ({
        id: s.id, name: s.title, date: s.date,
        dur: s.total_duration_minutes ?? 0, drillCount: s.session_drills?.[0]?.count ?? 0,
      })));
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <View style={s.subToggleContainer}>
        {(['individual', 'series'] as PracticesSection[]).map(sec => (
          <TouchableOpacity key={sec} style={[s.subToggleBtn, section === sec && s.subToggleBtnActive]} onPress={() => setSection(sec)} activeOpacity={0.85}>
            <ThemedText style={[s.subToggleText, section === sec && s.subToggleTextActive]}>
              {sec === 'individual' ? 'Individual Sessions' : 'Series'}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'individual' ? (
        <>
          <View style={s.pracHeaderRow}>
            <View style={s.pracChipsWrap}>
              {PRAC_CHIPS.map(c => (
                <TouchableOpacity key={c.key} onPress={() => setPracFilter(c.key)} activeOpacity={0.8} style={[s.chip, pracFilter === c.key && s.chipActive]}>
                  <ThemedText style={[s.chipText, pracFilter === c.key && s.chipTextActive]}>{c.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.pracHeaderActions}>
              <TouchableOpacity style={s.folderBtn} activeOpacity={0.8}>
                <Ionicons name="folder-outline" size={20} color={MUTED} />
              </TouchableOpacity>
              <TouchableOpacity style={s.newPill} activeOpacity={0.8}>
                <ThemedText style={s.newPillText}>+ New</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginTop: 20 }} />
          ) : sessions.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="time-outline" size={32} color={MUTED} />
              <ThemedText style={s.emptyTitle}>No sessions yet</ThemedText>
            </View>
          ) : sessions.map(p => (
            <TouchableOpacity key={p.id} style={s.sessionCard} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.sessionName}>{p.name} — {p.date}</ThemedText>
                <ThemedText style={s.sessionMeta}>⏱ {p.dur} min · {p.drillCount} drills</ThemedText>
              </View>
              <View style={s.sessionActions}>
                <TouchableOpacity style={s.iconHitbox}><Ionicons name="heart-outline" size={20} color={MUTED} /></TouchableOpacity>
                <TouchableOpacity style={s.iconHitbox}><Ionicons name="ellipsis-vertical" size={18} color={MUTED} /></TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <View style={s.seriesHeaderRow}>
            <ThemedText style={s.seriesHeaderLabel}>SESSION SERIES</ThemedText>
            <TouchableOpacity style={s.newPill} activeOpacity={0.8}>
              <ThemedText style={s.newPillText}>+ New Series</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={s.emptyCard}>
            <Ionicons name="layers-outline" size={42} color={MUTED} style={{ marginBottom: 14 }} />
            <ThemedText style={s.emptyTitle}>No series yet</ThemedText>
            <ThemedText style={s.emptyDesc}>Group sessions into a multi-day flow (e.g. "3 Day Skating Flow").</ThemedText>
            <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 18, width: '100%' }}>
              <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyBtn}>
                <ThemedText style={s.emptyBtnText}>+ Create your first series</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  );
}

// ─── My Drills Tab ────────────────────────────────────────────────────────────
function MyDrillsTab({ onCreateDrill, onUpload }: { onCreateDrill: () => void; onUpload: () => void }) {
  return (
    <>
      <View style={s.myDrillsHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText style={s.myDrillsTitle}>MY DRILLS</ThemedText>
          <ThemedText style={s.myDrillsSub}>Your personal drill library</ThemedText>
        </View>
        <View style={s.myDrillsActions}>
          <TouchableOpacity onPress={onCreateDrill} activeOpacity={0.8} style={s.createDrillBtn}>
            <ThemedText style={s.createDrillText}>+ Create Drill</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={onUpload} activeOpacity={0.8} style={s.uploadBtn}>
            <Ionicons name="arrow-up-outline" size={13} color={TEAL} style={{ marginRight: 4 }} />
            <ThemedText style={s.uploadBtnText}>Upload</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.emptyCard}>
        <Ionicons name="football-outline" size={36} color={MUTED} />
        <ThemedText style={s.emptyTitle}>No custom drills yet</ThemedText>
        <ThemedText style={s.emptyDesc}>Use "Create Drill" to add your own drills to your personal library.</ThemedText>
      </View>
      <ThemedText style={s.myDrillsFooter}>For IHS recordings, upload directly from the web portal for best quality.</ThemedText>
    </>
  );
}

// ─── Favorites Tab ────────────────────────────────────────────────────────────
function FavoritesTab() {
  const [filter, setFilter]       = useState<FavFilter>('all');
  const [favDrills, setFavDrills] = useState<LibDrill[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: favRows } = await supabase
        .from('drill_favorites')
        .select('drill_id, drills(id, title, category_id, difficulty_level, age_group, duration_minutes, drill_categories(title))')
        .eq('user_id', user.id);
      setFavDrills(((favRows ?? []).map((f: any) => {
        const d: any = Array.isArray(f.drills) ? f.drills[0] : f.drills;
        if (!d) return null;
        const catT: any = Array.isArray(d.drill_categories) ? d.drill_categories[0] : d.drill_categories;
        return { id: d.id, name: d.title, cat: slugify(catT?.title ?? 'general'), catTitle: catT?.title ?? '', level: d.difficulty_level ?? '', ages: d.age_group ?? '', dur: d.duration_minutes ?? 0, desc: '' };
      }).filter(Boolean)) as LibDrill[]);
      setLoading(false);
    })();
  }, []);

  const FAV_CHIPS = [
    { key: 'all',      label: `All (${favDrills.length})` },
    { key: 'drills',   label: `Drills (${favDrills.length})` },
    { key: 'sessions', label: 'Sessions (0)' },
  ];

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipRow, { marginTop: 12 }]} style={{ marginBottom: 4 }}>
        {FAV_CHIPS.map(c => (
          <TouchableOpacity key={c.key} onPress={() => setFilter(c.key as FavFilter)} activeOpacity={0.8} style={[s.chip, filter === c.key && s.chipActive]}>
            <ThemedText style={[s.chipText, filter === c.key && s.chipTextActive]}>{c.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: 24 }} />
      ) : (filter === 'all' || filter === 'drills') && (
        <>
          <ThemedText style={[s.secLabel, { marginTop: 16 }]}>DRILLS</ThemedText>
          {favDrills.length === 0 ? (
            <ThemedText style={[s.emptyDesc, { marginHorizontal: 0, marginTop: 8 }]}>No favorited drills yet</ThemedText>
          ) : favDrills.map(d => {
            const cfg = CAT_CONFIG[d.cat] ?? CAT_CONFIG['skating'];
            return (
              <TouchableOpacity key={d.id} style={s.favRow} activeOpacity={0.8}>
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
    </>
  );
}

// ─── Create Drill Modal ───────────────────────────────────────────────────────
const DRILL_CATS   = ['Skating', 'Slip Training', 'Dryland', 'Offensive', 'Defensive', 'Other'];
const DRILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

function CreateDrillModal({ visible, onClose, onUpload }: { visible: boolean; onClose: () => void; onUpload: () => void }) {
  const [category, setCategory] = useState('Skating');
  const [level, setLevel]       = useState('Intermediate');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.sheetHeader}>
                <View>
                  <ThemedText style={s.sheetNewLabel}>NEW</ThemedText>
                  <ThemedText style={s.sheetTitle}>Create Drill</ThemedText>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.8}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              <ThemedText style={s.fieldLabel}>DRILL NAME</ThemedText>
              <TextInput style={s.textInput} placeholder="e.g. Tight Turn Shooter" placeholderTextColor={MUTED} />

              <ThemedText style={s.fieldLabel}>CATEGORY</ThemedText>
              <View style={s.chipWrap}>
                {DRILL_CATS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)} activeOpacity={0.8} style={[s.wrapChip, category === c && s.wrapChipActive]}>
                    <ThemedText style={[s.wrapChipText, category === c && s.wrapChipTextActive]}>{c}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={s.fieldLabel}>LEVEL</ThemedText>
              <View style={s.chipWrap}>
                {DRILL_LEVELS.map(l => (
                  <TouchableOpacity key={l} onPress={() => setLevel(l)} activeOpacity={0.8} style={[s.wrapChip, level === l && s.wrapChipActive]}>
                    <ThemedText style={[s.wrapChipText, level === l && s.wrapChipTextActive]}>{l}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.twoCol}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.fieldLabel}>AGE GROUP</ThemedText>
                  <TextInput style={s.textInput} defaultValue="U13+" placeholderTextColor={MUTED} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.fieldLabel}>DURATION (MIN)</ThemedText>
                  <TextInput style={s.textInput} defaultValue="10" keyboardType="numeric" placeholderTextColor={MUTED} />
                </View>
              </View>

              <ThemedText style={s.fieldLabel}>DESCRIPTION</ThemedText>
              <TextInput style={[s.textInput, s.textArea]} placeholder="" placeholderTextColor={MUTED} multiline numberOfLines={4} textAlignVertical="top" />

              <ThemedText style={s.fieldLabel}>COACHING NOTES</ThemedText>
              <TextInput style={[s.textInput, s.textArea]} placeholder="Private — not visible to athletes" placeholderTextColor={MUTED} multiline numberOfLines={3} textAlignVertical="top" />
              <ThemedText style={s.fieldNote}>Private — not visible to athletes.</ThemedText>

              <ThemedText style={s.fieldLabel}>VIDEO</ThemedText>
              <TouchableOpacity onPress={onUpload} style={s.mediaBtn} activeOpacity={0.8}>
                <ThemedText style={s.mediaBtnText}>⬜  Upload Video</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 24, marginBottom: 40 }}>
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
                  <ThemedText style={s.saveBtnText}>Save Drill</ThemedText>
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
  const [level, setLevel]       = useState('Intermediate');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.sheetHeader}>
                <View>
                  <ThemedText style={s.sheetNewLabel}>NEW</ThemedText>
                  <ThemedText style={s.sheetTitle}>Upload Video</ThemedText>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.8}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.cameraRollBtn} activeOpacity={0.8}>
                <ThemedText style={s.cameraRollText}>Select video from camera roll</ThemedText>
              </TouchableOpacity>

              <ThemedText style={s.fieldLabel}>DRILL NAME</ThemedText>
              <TextInput style={s.textInput} placeholder="e.g. Backhand Release" placeholderTextColor={MUTED} />

              <ThemedText style={s.fieldLabel}>CATEGORY</ThemedText>
              <View style={s.chipWrap}>
                {UPLOAD_CATS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)} activeOpacity={0.8} style={[s.wrapChip, category === c && s.wrapChipActive]}>
                    <ThemedText style={[s.wrapChipText, category === c && s.wrapChipTextActive]}>{c}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={s.fieldLabel}>LEVEL</ThemedText>
              <View style={s.chipWrap}>
                {UPLOAD_LEVELS.map(l => (
                  <TouchableOpacity key={l} onPress={() => setLevel(l)} activeOpacity={0.8} style={[s.wrapChip, level === l && s.wrapChipActive]}>
                    <ThemedText style={[s.wrapChipText, level === l && s.wrapChipTextActive]}>{l}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 28, marginBottom: 40 }}>
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
                  <ThemedText style={s.saveBtnText}>Save to My Drills</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
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

export default function TeamCoachPlaybookScreen() {
  const [tab, setTab]             = useState<Tab>('library');
  const [libFilter, setLibFilter] = useState<LibFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* PXF Logo Header */}
        <View style={s.logoHeader}>
          <View>
            <GradientText style={s.logoPXF} colors={[TEAL, GREEN]}>PXF</GradientText>
            <GradientText style={s.logoHockey} colors={[TEAL, GREEN]}>HOCKEY</GradientText>
          </View>
          <TouchableOpacity style={s.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={MUTED} />
          </TouchableOpacity>
        </View>

        {/* PLAYBOOK label */}
        <ThemedText style={s.playbookLabel}>PLAYBOOK</ThemedText>

        {/* Tab selector — matches Elite Coach exactly */}
        <View style={s.tabSelector}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} activeOpacity={0.8} style={[s.tabBtn, tab === t.key && s.tabBtnActive]}>
              <ThemedText style={[s.tabBtnText, tab === t.key && s.tabBtnTextActive]} numberOfLines={1}>{t.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          {tab === 'library'   && <LibraryTab filter={libFilter} onFilter={setLibFilter} />}
          {tab === 'practices' && <PracticesTab />}
          {tab === 'my-drills' && <MyDrillsTab onCreateDrill={() => setShowCreate(true)} onUpload={() => setShowUpload(true)} />}
          {tab === 'favorites' && <FavoritesTab />}
          <View style={{ height: 32 }} />
        </ScrollView>

      </SafeAreaView>

      <CreateDrillModal visible={showCreate} onClose={() => setShowCreate(false)} onUpload={() => { setShowCreate(false); setShowUpload(true); }} />
      <UploadVideoModal visible={showUpload} onClose={() => setShowUpload(false)} />
      <TeamCoachTabBar active="playbook" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 16 },

  // Logo header
  logoHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  logoPXF:     { fontSize: 28, fontWeight: '800', letterSpacing: 3, lineHeight: 34 },
  logoHockey:  { fontSize: 11, fontWeight: '700', letterSpacing: 5, lineHeight: 16 },
  bellBtn:     { padding: 4, marginTop: 4 },

  playbookLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 8 },

  // Tab selector — matches Elite Coach
  tabSelector:      { flexDirection: 'row', backgroundColor: CARD, borderRadius: 30, marginHorizontal: 16, padding: 4, marginBottom: 4 },
  tabBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 26 },
  tabBtnActive:     { backgroundColor: TEAL },
  tabBtnText:       { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  tabBtnTextActive: { color: '#000' },

  // Section label
  secLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 8 },

  // Search
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  searchBar:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },
  filterBtn:   { width: 42, height: 42, backgroundColor: CARD, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },

  // Filter chips — matches Elite Coach (solid TEAL active)
  chipRow:         { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  chipActive:      { backgroundColor: TEAL, borderColor: TEAL },
  chipText:        { fontSize: 13, color: MUTED, fontWeight: '600' },
  chipTextActive:  { color: '#000', fontWeight: '700' },

  // Category headers
  catTitle: { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 2 },
  catDesc:  { fontSize: 13, color: MUTED, paddingHorizontal: 16, marginBottom: 12 },

  // Drill card
  drillCard:    { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  drillTop:     { flexDirection: 'row', gap: 12, marginBottom: 12 },
  drillIcon:    { width: 60, height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  drillInfo:    { flex: 1 },
  drillName:    { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 3, lineHeight: 21 },
  drillTags:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  drillMeta:    { fontSize: 12, color: MUTED, marginBottom: 6 },
  drillDesc:    { fontSize: 13, color: '#C0C8D4', lineHeight: 18 },
  addBtn:       { overflow: 'hidden', borderRadius: 10 },
  addBtnGrad:   { paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  addBtnText:   { fontSize: 14, fontWeight: '700', color: '#000' },

  // Practices
  subToggleContainer:  { flexDirection: 'row', backgroundColor: CARD, borderRadius: 30, marginHorizontal: 16, padding: 4, marginTop: 14, marginBottom: 12 },
  subToggleBtn:        { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 26 },
  subToggleBtnActive:  { backgroundColor: GREEN },
  subToggleText:       { fontSize: 14, fontWeight: '600', color: MUTED },
  subToggleTextActive: { color: '#000', fontWeight: '700' },

  pracHeaderRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  pracChipsWrap:     { flexDirection: 'row', gap: 8, flex: 1 },
  pracHeaderActions: { flexDirection: 'row', gap: 8 },
  folderBtn:         { width: 36, height: 36, backgroundColor: CARD, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  newPill:           { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  newPillText:       { fontSize: 13, fontWeight: '700', color: '#000' },

  sessionCard:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  sessionName:    { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  sessionMeta:    { fontSize: 12, color: MUTED },
  sessionActions: { flexDirection: 'row', gap: 2 },
  iconHitbox:     { padding: 6 },

  seriesHeaderRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 14, marginBottom: 10 },
  seriesHeaderLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2 },

  // Empty state
  emptyCard:    { marginHorizontal: 16, marginTop: 4, backgroundColor: CARD, borderRadius: 14, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed' },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 8 },
  emptyDesc:    { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  emptyBtn:     { borderRadius: 12, paddingVertical: 13, alignItems: 'center', width: '100%' },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },

  // My Drills
  myDrillsHeader:  { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  myDrillsTitle:   { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 2, marginBottom: 3 },
  myDrillsSub:     { fontSize: 13, color: MUTED },
  myDrillsActions: { alignItems: 'flex-end', gap: 8 },
  createDrillBtn:  { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  createDrillText: { fontSize: 13, fontWeight: '700', color: '#000' },
  uploadBtn:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  uploadBtnText:   { fontSize: 13, fontWeight: '600', color: TEAL },
  myDrillsFooter:  { fontSize: 12, color: MUTED, textAlign: 'center', paddingHorizontal: 24, marginTop: 16 },

  // Favorites
  favRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  favName: { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 2 },
  favCat:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Modal
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#121820', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', paddingHorizontal: 20, paddingTop: 10 },
  sheetHandle:  { width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  sheetNewLabel:{ fontSize: 12, fontWeight: '700', color: GREEN, letterSpacing: 1, marginBottom: 4 },
  sheetTitle:   { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  closeBtn:     { width: 36, height: 36, backgroundColor: CARD, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  fieldLabel:  { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  fieldNote:   { fontSize: 12, color: MUTED, marginTop: 6 },
  textInput:   { backgroundColor: CARD, borderRadius: 10, padding: 12, color: TEXT, fontSize: 14, borderWidth: 1, borderColor: BORDER },
  textArea:    { minHeight: 80, paddingTop: 10 },
  twoCol:      { flexDirection: 'row', gap: 10 },

  chipWrap:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wrapChip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  wrapChipActive:     { backgroundColor: TEAL, borderColor: TEAL },
  wrapChipText:       { fontSize: 13, color: MUTED, fontWeight: '600' },
  wrapChipTextActive: { color: '#000', fontWeight: '700' },

  mediaBtn:     { backgroundColor: CARD, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  mediaBtnText: { fontSize: 14, color: MUTED },
  saveBtn:      { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText:  { fontSize: 16, fontWeight: '700', color: '#000' },

  cameraRollBtn:  { borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  cameraRollText: { fontSize: 14, color: MUTED },
});
