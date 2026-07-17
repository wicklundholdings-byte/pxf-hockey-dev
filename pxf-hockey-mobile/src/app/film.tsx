import React, { useRef, useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, StatusBar, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#000000';
const CARD   = '#111111';
const TEAL   = '#00C4B4';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const RED    = '#EF4444';
const BORDER = '#1C1C1C';

const CATEGORIES = ['General', 'Skills', 'Game', 'Edge Work', 'Shooting', 'Defense', 'Goalie'] as const;
type Category = typeof CATEGORIES[number];

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FilmScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  // Permissions
  const [camPerm,  requestCamPerm]  = useCameraPermissions();
  const [micPerm,  requestMicPerm]  = useMicrophonePermissions();

  // Camera state
  const [facing,    setFacing]    = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [selectedCat, setSelectedCat] = useState<Category>('General');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Post-recording / save modal
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedSec, setRecordedSec] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [clipTitle,     setClipTitle]     = useState('');
  const [uploading,     setUploading]     = useState(false);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (!camPerm?.granted)  await requestCamPerm();
      if (!micPerm?.granted)  await requestMicPerm();
    })();
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  async function handleRecord() {
    if (!cameraRef.current) return;

    if (isRecording) {
      // Stop: setIsRecording false first so timer stops, then stop camera
      setIsRecording(false);
      cameraRef.current.stopRecording();
      return;
    }

    setIsRecording(true);
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 300 });
      if (result?.uri) {
        setRecordedSec(elapsed);
        setRecordedUri(result.uri);
        setClipTitle('');
        setShowSaveModal(true);
      }
    } catch {
      // Recording was cancelled or failed silently
    } finally {
      setIsRecording(false);
    }
  }

  async function handleSave() {
    if (!recordedUri) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Build a filename scoped to this coach
      const fileName = `${user.id}/${Date.now()}.mp4`;

      // Read the local video file as a Blob and upload to Supabase Storage
      const fileResponse = await fetch(recordedUri);
      const blob = await fileResponse.blob();

      const { error: uploadErr } = await supabase.storage
        .from('game_film')
        .upload(fileName, blob, { contentType: 'video/mp4', upsert: false });

      if (uploadErr) throw uploadErr;

      // Derive the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('game_film')
        .getPublicUrl(fileName);

      // Save metadata row
      const { error: insertErr } = await supabase.from('game_film').insert({
        coach_id:     user.id,
        title:        clipTitle.trim() || `${selectedCat} Clip`,
        category:     selectedCat,
        duration_sec: recordedSec,
        video_url:    publicUrl,
      });

      if (insertErr) throw insertErr;

      setShowSaveModal(false);
      setRecordedUri(null);
      router.push('/film-library' as any);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleDiscard() {
    setShowSaveModal(false);
    setRecordedUri(null);
    setElapsed(0);
  }

  // ── Permission gate ────────────────────────────────────────────────────────
  if (!camPerm) {
    return <View style={s.root} />;
  }

  if (!camPerm.granted) {
    return (
      <View style={[s.root, s.permCenter]}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="camera-outline" size={52} color={MUTED} />
        <ThemedText style={s.permTitle}>Camera access required</ThemedText>
        <ThemedText style={s.permSub}>
          PXF Hockey needs camera and microphone access to record film.
        </ThemedText>
        <TouchableOpacity
          style={s.permBtn}
          onPress={async () => { await requestCamPerm(); await requestMicPerm(); }}
          activeOpacity={0.85}
        >
          <ThemedText style={s.permBtnText}>Allow Access</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
          <ThemedText style={{ fontSize: 14, color: MUTED }}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main camera UI ─────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={s.safe}>

        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color={TEXT} />
          </TouchableOpacity>
          <ThemedText style={s.filmLabel}>FILM</ThemedText>
          <TouchableOpacity
            style={s.topIcon}
            onPress={() => setFlashMode(f => f === 'off' ? 'on' : 'off')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={flashMode === 'on' ? 'flash' : 'flash-off-outline'}
              size={22}
              color={flashMode === 'on' ? TEAL : TEXT}
            />
          </TouchableOpacity>
        </View>

        {/* Camera viewfinder */}
        <View style={s.viewfinderWrap}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            flash={flashMode}
            mode="video"
          />

          {/* Corner guides */}
          <View style={[s.corner, s.cornerTL]} />
          <View style={[s.corner, s.cornerTR]} />
          <View style={[s.corner, s.cornerBL]} />
          <View style={[s.corner, s.cornerBR]} />

          {/* REC indicator */}
          {isRecording && (
            <View style={s.recIndicator}>
              <View style={s.recDot} />
              <ThemedText style={s.recText}>REC</ThemedText>
            </View>
          )}

          {/* Duration */}
          {isRecording && (
            <View style={s.durationBadge}>
              <ThemedText style={s.durationText}>{fmtTime(elapsed)}</ThemedText>
            </View>
          )}

          {/* Category badge — hidden while recording */}
          {!isRecording && (
            <View style={s.catOverlay}>
              <View style={s.catBadge}>
                <ThemedText style={s.catBadgeText}>{selectedCat}</ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Bottom controls */}
        <View style={s.bottomBar}>
          {/* Flip */}
          <TouchableOpacity
            style={s.sideBtn}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse-outline" size={28} color={TEXT} />
          </TouchableOpacity>

          {/* Record button */}
          <TouchableOpacity
            style={[s.recordOuter, isRecording && s.recordOuterActive]}
            onPress={handleRecord}
            activeOpacity={0.85}
          >
            <View style={[s.recordInner, isRecording && s.recordInnerActive]} />
          </TouchableOpacity>

          {/* Library */}
          <TouchableOpacity
            style={s.sideBtn}
            onPress={() => router.push('/film-library' as any)}
            activeOpacity={0.8}
          >
            <View style={s.galleryThumb}>
              <Ionicons name="images-outline" size={22} color={TEXT} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Category pills */}
        <View style={s.categoryWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catPill, selectedCat === cat && s.catPillActive]}
                onPress={() => setSelectedCat(cat)}
                activeOpacity={0.8}
              >
                <ThemedText style={[s.catText, selectedCat === cat && s.catTextActive]}>
                  {cat}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      </SafeAreaView>

      {/* ── Save / upload modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="slide"
        onRequestClose={handleDiscard}
      >
        <View style={s.modalBackdrop}>
          <SafeAreaView edges={['bottom']} style={s.modalSheet}>
            <View style={s.modalHandle} />

            <ThemedText style={s.modalTitle}>Save Clip</ThemedText>
            <ThemedText style={s.modalMeta}>
              {selectedCat} · {fmtTime(recordedSec)}
            </ThemedText>

            <TextInput
              style={s.titleInput}
              placeholder="Add a title (optional)"
              placeholderTextColor={MUTED}
              value={clipTitle}
              onChangeText={setClipTitle}
              maxLength={80}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[s.saveBtn, uploading && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={uploading}
              activeOpacity={0.85}
            >
              {uploading
                ? <ActivityIndicator color="#000" />
                : <ThemedText style={s.saveBtnText}>Upload to Library</ThemedText>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.discardBtn} onPress={handleDiscard} activeOpacity={0.8}>
              <ThemedText style={s.discardText}>Discard</ThemedText>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  // Permission gate
  permCenter: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  permTitle: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center', lineHeight: 26 },
  permSub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: TEAL, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  permBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  filmLabel: { fontSize: 16, fontWeight: '800', color: TEAL, letterSpacing: 2 },
  topIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Viewfinder
  viewfinderWrap: { flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', position: 'relative' },

  // Corner guides
  corner: { position: 'absolute', width: 20, height: 20, borderColor: TEAL, borderWidth: 2 },
  cornerTL: { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Recording overlays
  recIndicator: { position: 'absolute', top: 20, left: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },
  recText: { fontSize: 12, fontWeight: '800', color: TEXT, letterSpacing: 1 },
  durationBadge: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  durationText: { fontSize: 14, fontWeight: '700', color: TEXT, fontVariant: ['tabular-nums'] },

  catOverlay: { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' },
  catBadge: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  catBadgeText: { fontSize: 13, fontWeight: '700', color: TEXT },

  // Bottom controls
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, paddingVertical: 20 },
  sideBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  galleryThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  recordOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: TEXT, alignItems: 'center', justifyContent: 'center' },
  recordOuterActive: { borderColor: RED },
  recordInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: RED },
  recordInnerActive: { width: 30, height: 30, borderRadius: 6 },

  // Category pills
  categoryWrap: { height: 52 },
  categoryRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  catPill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' },
  catPillActive: { backgroundColor: TEAL, borderColor: TEAL },
  catText: { fontSize: 13, color: MUTED, fontWeight: '600' },
  catTextActive: { color: '#000' },

  // Save modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 },
  modalMeta: { fontSize: 14, color: MUTED, marginTop: -6 },
  titleInput: { backgroundColor: '#1A1A1A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: TEXT, borderWidth: 1, borderColor: BORDER },
  saveBtn: { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  discardBtn: { alignItems: 'center', paddingVertical: 6 },
  discardText: { fontSize: 15, color: MUTED, fontWeight: '600' },
});
