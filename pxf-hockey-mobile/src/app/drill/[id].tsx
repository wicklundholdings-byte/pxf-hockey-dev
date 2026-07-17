import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
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

// ─── Demo data (fallback for non-DB IDs) ─────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  SKATING: TEAL,
  'SLIP CIRCUITS': TEAL,
  GAMEIQ: ORANGE,
  DRYLAND: '#8B5CF6',
  OFFENSIVE: TEAL,
  DEFENSIVE: TEAL,
};

type Progression = { title: string; desc: string };

type DrillData = {
  id: string;
  name: string;
  category: string;
  level: string;
  levelColor: string;
  ages: string;
  duration: number;
  description: string;
  progressions: Progression[];
  coachingNotes: string;
  videoUrl:   string | null;
  diagramUrl: string | null;
};

const DEMO_DRILLS: Record<string, DrillData> = {
  l1: {
    id: 'l1', name: 'Edge Mastery Series', category: 'SKATING',
    level: 'INTERMEDIATE', levelColor: GREEN, ages: '10-16', duration: 30,
    description: 'Full-ice edge work progressions building speed and agility through progressive circuit training.',
    progressions: [
      { title: 'Base', desc: '4 players start in corners. Skate to nearest blue line, tight turn, return to start. Focus on knee bend.' },
      { title: 'Add timing', desc: 'Add a timer and race to complete progressions in under 45 seconds.' },
      { title: 'Add puck', desc: 'Introduce pucks. Maintain puck control through tight turns.' },
      { title: 'Game speed', desc: 'Run at full game speed with light defensive pressure from a coach.' },
    ],
    coachingNotes: 'Watch for lazy edges on backhand side. Demand knee bend through every turn. Stop and correct before moving to progressions.',
    videoUrl: null, diagramUrl: null,
  },
  l2: {
    id: 'l2', name: 'Crossover Power Program', category: 'SKATING',
    level: 'ADVANCED', levelColor: ORANGE, ages: '13+', duration: 25,
    description: 'Build explosive crossover strength through progressive circuit work on full ice.',
    progressions: [
      { title: 'Stationary crossovers', desc: 'Perform slow crossovers around a cone. Focus on full edge engagement.' },
      { title: 'Moving crossovers', desc: 'Add forward momentum. Maintain balance and posture throughout.' },
      { title: 'Speed circuit', desc: 'Full-speed crossover circuits with directional changes on whistle.' },
    ],
    coachingNotes: 'Ensure full crossunder step — no short-cutting. Drive off the outside edge.',
    videoUrl: null, diagramUrl: null,
  },
  l3: {
    id: 'l3', name: 'Slip Deke Figure 8', category: 'SLIP CIRCUITS',
    level: 'INTERMEDIATE', levelColor: GREEN, ages: '13+', duration: 8,
    description: 'Slip-to-slip figure-8 patterns for controlled edge changes with the puck.',
    progressions: [
      { title: 'No puck walk-through', desc: 'Walk through the figure-8 pattern at low speed. Focus on footwork.' },
      { title: 'Add puck', desc: 'Introduce the puck. Maintain control through each edge change.' },
      { title: 'Game speed', desc: 'Execute at game speed with defensive shadow pressure.' },
    ],
    coachingNotes: 'Patience is key. Emphasize the "load and explode" timing on each edge transition.',
    videoUrl: null, diagramUrl: null,
  },
  l4: {
    id: 'l4', name: 'Tight Turn Slip', category: 'SLIP CIRCUITS',
    level: 'ADVANCED', levelColor: ORANGE, ages: '13+', duration: 10,
    description: 'Sharp tight-turn slip combinations for high-pressure escape moves.',
    progressions: [
      { title: 'Slow walk-through', desc: 'Map out the tight turn sequence without pressure.' },
      { title: 'Medium speed', desc: 'Add puck and increase speed. Maintain edge control.' },
      { title: 'Defender pressure', desc: 'Perform with live defender applying back-pressure.' },
    ],
    coachingNotes: 'The slip must be deceptive. Sell the fake before executing the turn.',
    videoUrl: null, diagramUrl: null,
  },
  l5: {
    id: 'l5', name: 'Slip Release Sequence', category: 'SLIP CIRCUITS',
    level: 'INTERMEDIATE', levelColor: GREEN, ages: '12+', duration: 12,
    description: 'Combine slip moves into game-speed release sequences with puck.',
    progressions: [
      { title: 'Sequence A', desc: 'Slip left, release right. Repeat 3 times.' },
      { title: 'Sequence B', desc: 'Add the crossover step between each slip.' },
      { title: 'Full combo', desc: 'String sequences A and B together at game speed.' },
      { title: 'Live pressure', desc: 'Defender applies pressure from the back. Execute on reaction.' },
    ],
    coachingNotes: 'The release timing after the slip is the key skill here. Head up throughout.',
    videoUrl: null, diagramUrl: null,
  },
  l6: {
    id: 'l6', name: 'Defensive Zone Coverage', category: 'GAMEIQ',
    level: 'INTERMEDIATE', levelColor: GREEN, ages: '12+', duration: 20,
    description: 'Read and react defensive positioning, gap control, and angling.',
    progressions: [
      { title: 'Positioning walk-through', desc: 'Walk through DZ positions — strong side, weak side, and net-front.' },
      { title: 'Read the play', desc: 'Coach calls out scenarios and players adjust positions.' },
      { title: 'Live puck', desc: 'Run 3-on-2 scenarios applying the coverage concepts.' },
      { title: 'Game situation', desc: 'Full 5-on-5 DZ coverage with coach feedback.' },
      { title: 'Film review', desc: 'Review two game clips applying the coverage concepts covered.' },
    ],
    coachingNotes: 'Angling is the #1 skill here. Body position and stick placement win races. Reinforce gap control early.',
    videoUrl: null, diagramUrl: null,
  },
};

// ─── Rink Diagram (pure View) ─────────────────────────────────────────────────
function RinkDiagram() {
  return (
    <View style={s.rink}>
      {/* Center line */}
      <View style={s.rinkCenterLine} />
      {/* Center circle */}
      <View style={s.rinkCenterCircle} />
      {/* Crossing line A (top-left → bottom-right) */}
      <View style={[s.rinkXLine, { transform: [{ rotate: '35deg' }] }]} />
      {/* Crossing line B (top-right → bottom-left) */}
      <View style={[s.rinkXLine, { transform: [{ rotate: '-35deg' }] }]} />
      {/* Dotted center horizontal accent */}
      <View style={s.rinkDotLine} />
      {/* Numbered dots */}
      <View style={[s.rinkDot, { top: 14, left: 20 }]}><ThemedText style={s.rinkDotNum}>1</ThemedText></View>
      <View style={[s.rinkDot, { bottom: 14, left: 20 }]}><ThemedText style={s.rinkDotNum}>2</ThemedText></View>
      <View style={[s.rinkDot, { top: 14, right: 20 }]}><ThemedText style={s.rinkDotNum}>3</ThemedText></View>
      <View style={[s.rinkDot, { bottom: 14, right: 20 }]}><ThemedText style={s.rinkDotNum}>4</ThemedText></View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DrillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [dbDrill, setDbDrill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [uploadingDiagram, setUploadingDiagram] = useState(false);

  // Add to session modal
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [sessions, setSessions] = useState<{ id: string; title: string; date: string | null }[]>([]);
  const [addingToSession, setAddingToSession] = useState<string | null>(null);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const player = useVideoPlayer(null);

  useEffect(() => {
    fetchDrill();
  }, [id]);

  async function fetchDrill() {
    if (!id) { setLoading(false); return; }
    const { data } = await supabase
      .from('drills')
      .select('*, drill_categories(title)')
      .eq('id', id)
      .single();
    setDbDrill(data);
    if (data?.video_url) player.replace({ uri: data.video_url });
    setLoading(false);
  }

  async function uploadDiagram() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo library access to upload a diagram.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setUploadingDiagram(true);
    try {
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const fileName = `${id}_${Date.now()}.${ext}`;

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/drill-diagrams/${fileName}`;

      // Decode base64 → Uint8Array without using Blob/ArrayBuffer (RN limitation)
      const b64 = asset.base64;
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      // XHR handles binary TypedArrays natively in React Native
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token}`);
        xhr.setRequestHeader('Content-Type', mime);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(bytes);
      });

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/drill-diagrams/${fileName}`;

      const { error: updateError } = await supabase
        .from('drills')
        .update({ diagram_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      setDbDrill((prev: any) => ({ ...prev, diagram_url: publicUrl }));
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Could not upload diagram');
    } finally {
      setUploadingDiagram(false);
    }
  }

  async function loadSessions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('sessions')
      .select('id, title, date')
      .eq('coach_id', user.id)
      .order('date', { ascending: true })
      .limit(30);
    setSessions((data ?? []).map((s: any) => ({ id: s.id, title: s.title, date: s.date })));
  }

  async function addToSession(sessionId: string) {
    setAddingToSession(sessionId);
    const { error } = await supabase.from('session_drills').insert({
      session_id: sessionId,
      drill_id: id,
      sort_order: 999,
    });
    setAddingToSession(null);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowSessionPicker(false);
    Alert.alert('Added!', 'Drill added to session.');
  }

  function openEdit() {
    setEditTitle(dbDrill?.title ?? '');
    setEditDescription(dbDrill?.short_description ?? '');
    setEditNotes(Array.isArray(dbDrill?.coaching_points) ? dbDrill.coaching_points.join('\n') : '');
    setShowEdit(true);
  }

  async function saveEdit() {
    setSaving(true);
    const { error } = await supabase.from('drills').update({
      title: editTitle.trim() || dbDrill?.title,
      short_description: editDescription.trim() || null,
      coaching_points: editNotes.trim() ? editNotes.trim().split('\n').filter(Boolean) : null,
    }).eq('id', id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setDbDrill((prev: any) => ({
      ...prev,
      title: editTitle.trim() || prev.title,
      short_description: editDescription.trim() || null,
      coaching_points: editNotes.trim() ? editNotes.trim().split('\n').filter(Boolean) : null,
    }));
    setShowEdit(false);
  }

  async function openSourceUrl(url: string) {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      toolbarColor: '#0D1117',
      controlsColor: '#00C4B4',
    });
  }

  function toggleExpanded(idx: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  // ── Resolve drill data (DB first, demo fallback) ──────────────────────────
  const demo = id ? DEMO_DRILLS[id] : null;
  const drill: DrillData | null = dbDrill
    ? {
        id: dbDrill.id,
        name: dbDrill.title,
        category: (() => {
          const cat = Array.isArray(dbDrill.drill_categories) ? dbDrill.drill_categories[0] : dbDrill.drill_categories;
          return (cat?.title ?? 'Drill').toUpperCase();
        })(),
        level: (dbDrill.difficulty_level ?? '').toUpperCase(),
        levelColor: (dbDrill.difficulty_level ?? '').toLowerCase() === 'advanced' ? ORANGE : GREEN,
        ages: dbDrill.age_group ?? '',
        duration: dbDrill.duration_minutes ?? 0,
        description: (dbDrill as any).description ?? dbDrill.short_description ?? '',
        progressions: Array.isArray(dbDrill.coaching_points)
          ? dbDrill.coaching_points.map((p: string, i: number) => ({ title: `Step ${i + 1}`, desc: p }))
          : [],
        coachingNotes: '',
        videoUrl:   dbDrill.video_url   ?? null,
        diagramUrl: dbDrill.diagram_url ?? null,
      }
    : demo;

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  if (!drill) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ThemedText style={{ color: MUTED }}>Drill not found.</ThemedText>
      </View>
    );
  }

  const catColor = CAT_COLOR[drill.category] ?? TEAL;

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header row */}
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backPill}
            onPress={() => router.push('/playbook' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={14} color={TEXT} />
            <ThemedText style={s.backPillText}>Playbook</ThemedText>
          </TouchableOpacity>
          {dbDrill && (
            <TouchableOpacity style={s.editIconBtn} onPress={openEdit} activeOpacity={0.8}>
              <Ionicons name="pencil-outline" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Video area — only shown when video exists */}
          {drill.videoUrl && (
            <View style={s.videoArea}>
              <VideoView player={player} style={{ width: '100%', height: '100%' }} />
            </View>
          )}

          {/* Content */}
          <View style={s.contentPad}>
            {/* Category + Title */}
            <ThemedText style={[s.catLabel, { color: catColor }]}>{drill.category}</ThemedText>
            <ThemedText style={s.drillTitle}>{drill.name}</ThemedText>

            {/* Tag chips */}
            <View style={s.tagRow}>
              <View style={[s.tagChip, { borderColor: catColor }]}>
                <ThemedText style={[s.tagText, { color: catColor }]}>{drill.category}</ThemedText>
              </View>
              <View style={[s.tagChip, { borderColor: drill.levelColor }]}>
                <ThemedText style={[s.tagText, { color: drill.levelColor }]}>{drill.level}</ThemedText>
              </View>
              {!!drill.ages && (
                <View style={s.tagChip}>
                  <ThemedText style={s.tagText}>Ages {drill.ages}</ThemedText>
                </View>
              )}
              {!!drill.duration && (
                <View style={s.tagChip}>
                  <ThemedText style={s.tagText}>{drill.duration}m</ThemedText>
                </View>
              )}
            </View>

            {/* Description */}
            {!!drill.description && (
              <ThemedText style={s.desc}>{drill.description}</ThemedText>
            )}

            {/* IHS source link (inline) */}
            {dbDrill?.source_url && (
              <TouchableOpacity
                style={s.ihsInlineBtn}
                activeOpacity={0.8}
                onPress={() => openSourceUrl(dbDrill.source_url)}
              >
                <Ionicons name="globe-outline" size={16} color={TEAL} />
                <ThemedText style={s.ihsInlineBtnText}>View full drill on IHS</ThemedText>
                <Ionicons name="chevron-forward" size={14} color={TEAL} />
              </TouchableOpacity>
            )}

            {/* Rink Diagram */}
            <ThemedText style={s.sectionLabel}>RINK DIAGRAM</ThemedText>
            {drill.diagramUrl ? (
              <>
                <Image
                  source={{ uri: drill.diagramUrl }}
                  style={s.diagramImage}
                  contentFit="contain"
                  transition={200}
                />
                <View style={s.diagramActions}>
                  <TouchableOpacity activeOpacity={0.7} onPress={uploadDiagram} disabled={uploadingDiagram}>
                    {uploadingDiagram
                      ? <ActivityIndicator size="small" color={TEAL} />
                      : <ThemedText style={s.fullScreenText}>Change</ThemedText>
                    }
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={s.addDiagramBtn}
                activeOpacity={0.75}
                onPress={uploadDiagram}
                disabled={uploadingDiagram}
              >
                {uploadingDiagram ? (
                  <ActivityIndicator size="small" color={MUTED} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={22} color={MUTED} />
                    <ThemedText style={s.addDiagramText}>Add Diagram</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Progressions */}
            {drill.progressions.length > 0 && (
              <>
                <ThemedText style={s.sectionLabel}>PROGRESSIONS</ThemedText>
                <View style={s.progressionList}>
                  {drill.progressions.map((prog, idx) => {
                    const isExpanded = expanded.has(idx);
                    return (
                      <View key={idx} style={s.progCard}>
                        <TouchableOpacity
                          style={s.progHeader}
                          onPress={() => toggleExpanded(idx)}
                          activeOpacity={0.8}
                        >
                          <View style={s.progNum}>
                            <ThemedText style={s.progNumText}>{idx + 1}</ThemedText>
                          </View>
                          <ThemedText style={s.progTitle}>{prog.title}</ThemedText>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={MUTED}
                          />
                        </TouchableOpacity>
                        {isExpanded && (
                          <ThemedText style={s.progDesc}>{prog.desc}</ThemedText>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* Coaching Notes */}
            {!!drill.coachingNotes && (
              <>
                <View style={s.coachNotesHeader}>
                  <ThemedText style={s.sectionLabel}>COACHING NOTES</ThemedText>
                  <TouchableOpacity activeOpacity={0.7}>
                    <ThemedText style={s.editLink}>Edit</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={s.notesCard}>
                  <ThemedText style={s.notesText}>{drill.coachingNotes}</ThemedText>
                </View>
              </>
            )}

            <View style={{ height: 100 }} />
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View style={s.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={{ flex: 1 }}
            onPress={() => { loadSessions(); setShowSessionPicker(true); }}
          >
            <LinearGradient
              colors={[TEAL, GREEN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.addSessionBtn}
            >
              <ThemedText style={s.addSessionText}>+ Add to Practice Session</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* ── Session Picker Modal ── */}
      <Modal visible={showSessionPicker} transparent animationType="slide" onRequestClose={() => setShowSessionPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSessionPicker(false)} />
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <ThemedText style={s.modalTitle}>Add to Session</ThemedText>
          <ScrollView style={{ maxHeight: 340 }}>
            {sessions.length === 0 && (
              <ThemedText style={[s.modalEmpty]}>No sessions found. Create a session first.</ThemedText>
            )}
            {sessions.map(sess => (
              <TouchableOpacity
                key={sess.id}
                style={s.sessionRow}
                activeOpacity={0.8}
                onPress={() => addToSession(sess.id)}
                disabled={addingToSession === sess.id}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.sessionRowTitle}>{sess.title}</ThemedText>
                  {sess.date && <ThemedText style={s.sessionRowDate}>{sess.date}</ThemedText>}
                </View>
                {addingToSession === sess.id
                  ? <ActivityIndicator size="small" color={TEAL} />
                  : <Ionicons name="add-circle-outline" size={22} color={TEAL} />
                }
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableOpacity style={[s.modalOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]} activeOpacity={1} onPress={() => setShowEdit(false)} />
        <View style={[s.modalSheet, { paddingBottom: 40, maxHeight: '85%' }]}>
          <View style={s.modalHandle} />
          <View style={s.modalTitleRow}>
            <ThemedText style={s.modalTitle}>Edit Drill</ThemedText>
            <TouchableOpacity onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={TEAL} /> : <ThemedText style={s.saveBtn}>Save</ThemedText>}
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ThemedText style={s.editLabel}>NAME</ThemedText>
            <TextInput
              style={s.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholderTextColor={MUTED}
              placeholder="Drill name"
            />
            <ThemedText style={s.editLabel}>DESCRIPTION</ThemedText>
            <TextInput
              style={[s.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholderTextColor={MUTED}
              placeholder="What is this drill about..."
              multiline
            />
            <ThemedText style={s.editLabel}>COACHING NOTES (one per line)</ThemedText>
            <TextInput
              style={[s.editInput, { minHeight: 100, textAlignVertical: 'top' }]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholderTextColor={MUTED}
              placeholder="Key points for coaches..."
              multiline
            />
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  content: { paddingBottom: 0 },
  contentPad: { paddingHorizontal: 16 },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, marginHorizontal: 14, marginBottom: 6,
  },
  backPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  backPillText: { fontSize: 13, fontWeight: '600', color: TEXT },
  editIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 16 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalEmpty: { color: MUTED, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  saveBtn: { fontSize: 15, fontWeight: '700', color: TEAL },

  // Session picker rows
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  sessionRowTitle: { fontSize: 15, fontWeight: '600', color: TEXT },
  sessionRowDate:  { fontSize: 12, color: MUTED, marginTop: 2 },

  // Edit inputs
  editLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 6, marginTop: 14 },
  editInput: {
    backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    color: TEXT, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12,
  },

  // Video
  videoArea: {
    width: '100%', height: 220, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  noVideoText: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },

  // Add diagram placeholder
  addDiagramBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1,
    borderColor: BORDER, borderStyle: 'dashed',
    paddingVertical: 28, marginBottom: 20,
  },
  addDiagramText: { fontSize: 14, fontWeight: '600', color: MUTED },

  // IHS inline link
  ihsInlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,196,180,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 20,
  },
  ihsInlineBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: TEAL },

  // Category + title
  catLabel:  { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: 18, marginBottom: 4 },
  drillTitle:{ fontSize: 26, fontWeight: '800', color: TEXT, lineHeight: 32, marginBottom: 12 },

  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
  },
  tagText: { fontSize: 12, fontWeight: '700', color: MUTED },

  // Description
  desc: { fontSize: 14, color: '#C0C8D4', lineHeight: 21, marginBottom: 22 },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 2, marginBottom: 10, marginTop: 6,
  },

  // Diagram image (from web drill builder)
  diagramImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#000',
    marginBottom: 8,
  },

  // Rink diagram
  rink: {
    height: 180, backgroundColor: '#000',
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    position: 'relative', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  rinkCenterLine: {
    position: 'absolute', top: 0, bottom: 0,
    left: '50%', width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  rinkCenterCircle: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  rinkXLine: {
    position: 'absolute', width: '160%', height: 2,
    backgroundColor: TEAL, opacity: 0.85,
  },
  rinkDotLine: {
    position: 'absolute', width: 40, height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  rinkDot: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
    backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
  },
  rinkDotNum: { fontSize: 11, fontWeight: '800', color: '#000' },

  // Diagram actions row
  diagramActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginBottom: 20, marginTop: 4,
  },
  fullScreenLink: { alignItems: 'flex-end', marginBottom: 20 },
  fullScreenText: { fontSize: 13, fontWeight: '600', color: TEAL },

  // Progressions
  progressionList: { marginBottom: 20, gap: 8 },
  progCard: {
    backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  progHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  progNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,196,180,0.2)',
    borderWidth: 1, borderColor: TEAL,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  progNumText: { fontSize: 13, fontWeight: '800', color: TEAL },
  progTitle:   { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT },
  progDesc:    {
    fontSize: 14, color: '#C0C8D4', lineHeight: 21,
    paddingHorizontal: 14, paddingBottom: 14,
  },

  // Coaching notes
  coachNotesHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10, marginTop: 6,
  },
  editLink:  { fontSize: 13, fontWeight: '600', color: TEAL },
  notesCard: {
    backgroundColor: CARD, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: BORDER, marginBottom: 20,
  },
  notesText: { fontSize: 14, color: '#C0C8D4', lineHeight: 21 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER,
  },
  addSessionBtn:  { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  addSessionText: { fontSize: 15, fontWeight: '800', color: '#000' },
});
