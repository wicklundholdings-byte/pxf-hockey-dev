import React, { useRef, useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

const CATEGORIES = ['Skating', 'Shooting', 'Passing', 'Defense', 'Game', 'Other'] as const;
type Category = typeof CATEGORIES[number];

type Player = { id: string; full_name: string; team_name: string };

export default function RecordScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  const [camPermission,   requestCamPermission]   = useCameraPermissions();
  const [micPermission,   requestMicPermission]   = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const [facing,    setFacing]    = useState<'back' | 'front'>('back');
  const [recording, setRecording] = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [stage,     setStage]     = useState<'camera' | 'tag'>('camera');
  const [recordedUri,      setRecordedUri]      = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [saving, setSaving] = useState(false);

  // Tag form
  const [players,       setPlayers]       = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPicker,    setShowPicker]    = useState(false);
  const [playerSearch,  setPlayerSearch]  = useState('');
  const [category,      setCategory]      = useState<Category>('Other');
  const [notes,         setNotes]         = useState('');

  // Elapsed ref so async callbacks can read the current value
  const elapsedRef = useRef(0);
  useEffect(() => {
    if (!recording) return;
    elapsedRef.current = 0;
    const id = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Load players when we enter the tag stage
  useEffect(() => {
    if (stage !== 'tag') return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('coach_id', user.id);
      if (!teams?.length) return;
      const teamIds = teams.map(t => t.id);
      const { data: playerRows } = await supabase
        .from('players')
        .select('id, full_name, team_id')
        .in('team_id', teamIds)
        .order('full_name');
      if (!playerRows) return;
      const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
      setPlayers(playerRows.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        team_name: teamMap[p.team_id] ?? '',
      })));
    })();
  }, [stage]);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const allGranted =
    camPermission?.granted && micPermission?.granted && mediaPermission?.granted;

  async function requestAll() {
    if (!camPermission?.granted)   await requestCamPermission();
    if (!micPermission?.granted)   await requestMicPermission();
    if (!mediaPermission?.granted) await requestMediaPermission();
  }

  async function startRecording() {
    if (!cameraRef.current) return;
    try {
      setRecording(true);
      const result = await cameraRef.current.recordAsync({ maxDuration: 180 });
      if (result?.uri) {
        const dur = elapsedRef.current;
        setRecordedUri(result.uri);
        setRecordedDuration(dur);
        setStage('tag');
      }
    } catch (e) {
      console.error('Record error', e);
    } finally {
      setRecording(false);
      setElapsed(0);
    }
  }

  function stopRecording() {
    cameraRef.current?.stopRecording();
  }

  async function saveClip() {
    if (!recordedUri) return;
    setSaving(true);
    try {
      const asset = await MediaLibrary.createAssetAsync(recordedUri);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('clips').insert({
          coach_id:         user.id,
          player_id:        selectedPlayer?.id ?? null,
          player_name:      selectedPlayer?.full_name ?? null,
          category:         category.toLowerCase(),
          notes:            notes.trim() || null,
          duration_seconds: recordedDuration || null,
          local_asset_id:   asset.id,
        });
      }
      Alert.alert('Saved!', 'Clip saved to your library.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save clip');
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    Alert.alert('Discard clip?', 'The recording will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => {
        setRecordedUri(null);
        setRecordedDuration(0);
        setSelectedPlayer(null);
        setCategory('Other');
        setNotes('');
        setStage('camera');
      }},
    ]);
  }

  const filteredPlayers = playerSearch.trim()
    ? players.filter(p => p.full_name.toLowerCase().includes(playerSearch.toLowerCase()))
    : players;

  // ── Permissions gate ──────────────────────────────────────────────────────
  if (!allGranted) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <SafeAreaView>
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="videocam-outline" size={52} color={TEAL} style={{ marginBottom: 20 }} />
            <ThemedText style={{ fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 10, textAlign: 'center', lineHeight: 28 }}>
              Camera Access Needed
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: MUTED, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
              PXF Hockey needs camera, microphone, and photo library access to record and save clips.
            </ThemedText>
            <TouchableOpacity
              onPress={requestAll}
              style={{ backgroundColor: TEAL, borderRadius: 14, paddingHorizontal: 36, paddingVertical: 14, marginBottom: 12 }}
            >
              <ThemedText style={{ fontSize: 16, fontWeight: '800', color: '#000' }}>Grant Access</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText style={{ fontSize: 14, color: MUTED }}>Go back</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Player picker modal ────────────────────────────────────────────────────
  const PlayerPicker = (
    <Modal
      visible={showPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPicker(false)}
    >
      <View style={{ flex: 1, backgroundColor: BG }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
            <ThemedText style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Select Athlete</ThemedText>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[s.input, { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8 }]}>
            <Ionicons name="search" size={16} color={MUTED} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, color: TEXT, fontSize: 15 }}
              placeholder="Search athletes..."
              placeholderTextColor={MUTED}
              value={playerSearch}
              onChangeText={setPlayerSearch}
            />
          </View>

          {/* No team athletes option */}
          <TouchableOpacity
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER }}
            onPress={() => { setSelectedPlayer(null); setShowPicker(false); }}
          >
            <ThemedText style={{ fontSize: 15, color: MUTED, fontStyle: 'italic' }}>No athlete (untagged)</ThemedText>
          </TouchableOpacity>

          <FlatList
            data={filteredPlayers}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.playerRow, selectedPlayer?.id === item.id && s.playerRowActive]}
                onPress={() => { setSelectedPlayer(item); setShowPicker(false); }}
                activeOpacity={0.8}
              >
                <View style={s.playerAvatar}>
                  <ThemedText style={s.playerAvatarText}>
                    {item.full_name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.playerName}>{item.full_name}</ThemedText>
                  <ThemedText style={s.playerTeam}>{item.team_name}</ThemedText>
                </View>
                {selectedPlayer?.id === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color={TEAL} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ThemedText style={{ color: MUTED, fontSize: 14 }}>No athletes found</ThemedText>
              </View>
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );

  // ── Tag stage ─────────────────────────────────────────────────────────────
  if (stage === 'tag') {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        {PlayerPicker}
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity onPress={discard} style={{ marginRight: 14 }}>
                <Ionicons name="close" size={24} color={MUTED} />
              </TouchableOpacity>
              <ThemedText style={{ fontSize: 22, fontWeight: '800', color: TEXT, lineHeight: 28 }}>Tag Clip</ThemedText>
            </View>

            {/* Recorded confirmation */}
            <View style={s.previewBox}>
              <Ionicons name="checkmark-circle" size={36} color={TEAL} style={{ marginBottom: 8 }} />
              <ThemedText style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>
                Clip recorded
              </ThemedText>
              {recordedDuration > 0 && (
                <ThemedText style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
                  Duration: {fmtTime(recordedDuration)}
                </ThemedText>
              )}
            </View>

            {/* Athlete picker */}
            <ThemedText style={s.label}>ATHLETE</ThemedText>
            <TouchableOpacity
              style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
            >
              {selectedPlayer ? (
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 15, color: TEXT, fontWeight: '600' }}>
                    {selectedPlayer.full_name}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: MUTED }}>
                    {selectedPlayer.team_name}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={{ fontSize: 15, color: MUTED }}>Select athlete...</ThemedText>
              )}
              <Ionicons name="chevron-down" size={18} color={MUTED} />
            </TouchableOpacity>

            {/* Category */}
            <ThemedText style={[s.label, { marginTop: 20 }]}>CATEGORY</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[s.chip, category === cat && s.chipActive]}
                  activeOpacity={0.8}
                >
                  <ThemedText style={[s.chipText, category === cat && s.chipTextActive]}>
                    {cat}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <ThemedText style={[s.label, { marginTop: 20 }]}>NOTES (optional)</ThemedText>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Drill, situation, feedback..."
              placeholderTextColor={MUTED}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* Save */}
            <TouchableOpacity
              onPress={saveClip}
              disabled={saving}
              activeOpacity={0.85}
              style={{ marginTop: 28 }}
            >
              <LinearGradient
                colors={[TEAL, GREEN]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              >
                {saving
                  ? <ActivityIndicator color="#000" />
                  : <ThemedText style={{ fontSize: 16, fontWeight: '800', color: '#000' }}>Save to Library</ThemedText>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={discard} style={{ marginTop: 16, alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 14, color: RED }}>Discard clip</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Camera stage ──────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mode="video"
      />

      {/* Top overlay */}
      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View style={s.camTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.camCircleBtn}>
            <Ionicons name="close" size={22} color={TEXT} />
          </TouchableOpacity>

          {recording && (
            <View style={s.timerPill}>
              <View style={s.recDot} />
              <ThemedText style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>
                {fmtTime(elapsed)}
              </ThemedText>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
            style={s.camCircleBtn}
          >
            <Ionicons name="camera-reverse-outline" size={22} color={TEXT} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom overlay */}
      <View style={s.camBottomRow}>
        {recording ? (
          <TouchableOpacity onPress={stopRecording} style={s.stopBtn}>
            <View style={s.stopSquare} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={startRecording} style={s.recordBtn}>
            <View style={s.recordInner} />
          </TouchableOpacity>
        )}
        <ThemedText style={s.camHint}>
          {recording ? 'tap to stop' : 'tap to record'}
        </ThemedText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Tag stage
  previewBox: {
    width: '100%', height: 150,
    backgroundColor: CARD, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: BORDER,
  },
  label: {
    fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 15,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  chipActive:     { backgroundColor: '#0D2A24', borderColor: TEAL },
  chipText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  chipTextActive: { color: TEAL, fontWeight: '700' },

  // Player picker
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  playerRowActive: { backgroundColor: 'rgba(0,196,180,0.06)' },
  playerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,196,180,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)',
  },
  playerAvatarText: { fontSize: 16, fontWeight: '700', color: TEAL },
  playerName:  { fontSize: 15, fontWeight: '600', color: TEXT },
  playerTeam:  { fontSize: 12, color: MUTED, marginTop: 2 },

  // Camera stage
  camTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  camCircleBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },
  camBottomRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 52, alignItems: 'center',
  },
  recordBtn: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: TEXT, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)',
  },
  recordInner: { width: 26, height: 26, borderRadius: 13, backgroundColor: RED },
  stopBtn: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: TEXT,
  },
  stopSquare: { width: 26, height: 26, borderRadius: 4, backgroundColor: TEXT },
  camHint: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 12 },
});
