import React, { useEffect, useState, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, StatusBar, TextInput,
  ScrollView, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

const BG     = '#000000';
const CARD   = '#111111';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const YELLOW = '#FACC15';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#1C1C1C';

type Tool = 'arrow' | 'line' | 'circle' | 'text' | 'eraser' | null;
type DrawColor = 'red' | 'yellow' | 'white' | 'teal' | 'green';

const COLORS: { id: DrawColor; hex: string }[] = [
  { id: 'red',    hex: RED    },
  { id: 'yellow', hex: YELLOW },
  { id: 'white',  hex: TEXT   },
  { id: 'teal',   hex: TEAL   },
  { id: 'green',  hex: GREEN  },
];

const SPEEDS = ['0.25×', '0.5×', '1×', '1.5×', '2×'];

function playerInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function FilmReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const filmId = params.id;

  const [athleteName,   setAthleteName]   = useState('');
  const [filmTitle,     setFilmTitle]     = useState('');
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [progress,      setProgress]      = useState(0.3);
  const [speed,         setSpeed]         = useState('1×');
  const [activeTool,    setActiveTool]    = useState<Tool>(null);
  const [activeColor,   setActiveColor]   = useState<DrawColor>('red');
  const [isRecordingVO, setIsRecordingVO] = useState(false);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [uploaded,      setUploaded]      = useState(false);
  const [showTools,     setShowTools]     = useState(true);
  const [note,          setNote]          = useState('');
  const [showNote,      setShowNote]      = useState(false);

  useEffect(() => {
    if (!filmId) return;
    (async () => {
      const { data } = await supabase
        .from('game_film')
        .select('title, uploaded_to_player, notes, players(full_name)')
        .eq('id', filmId)
        .maybeSingle();
      if (!data) return;
      const player: any = Array.isArray(data.players) ? data.players[0] ?? null : data.players ?? null;
      if (player?.full_name) setAthleteName(player.full_name);
      if (data.title) setFilmTitle(data.title);
      if (data.notes) setNote(data.notes);
      setUploaded(data.uploaded_to_player ?? false);
    })();
  }, [filmId]);

  function toggleTool(t: Tool) {
    setActiveTool(prev => prev === t ? null : t);
  }

  async function handleUpload() {
    const name = athleteName || 'athlete';
    Alert.alert(
      'Upload to Athlete',
      `Send this clip to ${name.split(' ')[0]}'s account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload', onPress: async () => {
            setUploaded(true);
            if (filmId) {
              await supabase.from('game_film').update({ uploaded_to_player: true }).eq('id', filmId);
            }
          },
        },
      ]
    );
  }

  const displayName   = athleteName || 'Untagged';
  const displayInits  = athleteName ? playerInitials(athleteName) : '—';
  const activeColorHex = COLORS.find(c => c.id === activeColor)?.hex ?? RED;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* ── Top bar ── */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.circleBtn}>
            <Ionicons name="arrow-back" size={18} color={TEXT} />
          </TouchableOpacity>

          {/* Athlete tag */}
          <View style={s.athleteTag}>
            <View style={s.athleteAvatar}>
              <ThemedText style={s.avatarInitials}>{displayInits}</ThemedText>
            </View>
            <ThemedText style={s.athleteName}>{displayName}</ThemedText>
          </View>

          {/* Upload */}
          <TouchableOpacity
            style={[s.uploadBtn, uploaded && s.uploadedBtn]}
            onPress={handleUpload}
            activeOpacity={0.8}
          >
            <Ionicons name={uploaded ? 'checkmark' : 'cloud-upload-outline'} size={14} color={uploaded ? '#000' : TEAL} />
            <ThemedText style={[s.uploadText, uploaded && s.uploadedText]}>
              {uploaded ? 'Sent' : 'Upload'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* ── Video canvas ── */}
        <TouchableOpacity
          style={s.canvas}
          activeOpacity={1}
          onPress={() => setShowTools(t => !t)}
        >
          {/* Placeholder video bg */}
          <View style={s.videoPlaceholder}>
            <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.1)" />
            <ThemedText style={s.videoPlaceholderText}>Video preview</ThemedText>
            <ThemedText style={s.videoPlaceholderSub}>Real playback connects in backend phase</ThemedText>
          </View>

          {/* Active tool indicator overlay */}
          {activeTool && (
            <View style={s.toolActiveOverlay}>
              <View style={[s.toolCursor, { borderColor: activeColorHex }]}>
                <Ionicons
                  name={
                    activeTool === 'arrow'  ? 'arrow-forward'    :
                    activeTool === 'line'   ? 'remove-outline'   :
                    activeTool === 'circle' ? 'ellipse-outline'  :
                    activeTool === 'text'   ? 'text'             :
                    'close-circle-outline'
                  }
                  size={20}
                  color={activeColorHex}
                />
              </View>
              <ThemedText style={[s.toolHint, { color: activeColorHex }]}>
                {activeTool === 'eraser' ? 'Tap to erase' : `Draw ${activeTool}`}
              </ThemedText>
            </View>
          )}

          {/* Voiceover recording indicator */}
          {isRecordingVO && (
            <View style={s.voiceIndicator}>
              <View style={s.voiceDot} />
              <ThemedText style={s.voiceText}>Recording voice over...</ThemedText>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Playback controls ── */}
        <View style={s.playbackSection}>
          {/* Scrubber */}
          <View style={s.scrubberRow}>
            <ThemedText style={s.timeText}>0:12</ThemedText>
            <View style={s.scrubberTrack}>
              <View style={[s.scrubberFill, { width: `${progress * 100}%` }]} />
              <View style={[s.scrubberThumb, { left: `${progress * 100}%` }]} />
            </View>
            <ThemedText style={s.timeText}>0:42</ThemedText>
          </View>

          {/* Transport row */}
          <View style={s.transportRow}>
            {/* Step back */}
            <TouchableOpacity style={s.transportBtn}>
              <Ionicons name="play-skip-back-outline" size={22} color={TEXT} />
            </TouchableOpacity>

            {/* Rewind 5s */}
            <TouchableOpacity style={s.transportBtn}>
              <Ionicons name="play-back-outline" size={22} color={TEXT} />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity style={s.playBtn} onPress={() => setIsPlaying(p => !p)} activeOpacity={0.85}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#000" />
            </TouchableOpacity>

            {/* Forward 5s */}
            <TouchableOpacity style={s.transportBtn}>
              <Ionicons name="play-forward-outline" size={22} color={TEXT} />
            </TouchableOpacity>

            {/* Speed */}
            <TouchableOpacity style={s.speedBtn} onPress={() => setShowSpeedPicker(p => !p)} activeOpacity={0.8}>
              <ThemedText style={s.speedText}>{speed}</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Speed picker */}
          {showSpeedPicker && (
            <View style={s.speedPicker}>
              {SPEEDS.map((sp) => (
                <TouchableOpacity
                  key={sp}
                  style={[s.speedOption, speed === sp && s.speedOptionActive]}
                  onPress={() => { setSpeed(sp); setShowSpeedPicker(false); }}
                  activeOpacity={0.8}
                >
                  <ThemedText style={[s.speedOptionText, speed === sp && s.speedOptionTextActive]}>{sp}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Annotation toolbar ── */}
        <View style={s.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.toolbarInner}>

            {/* Draw tools */}
            {([
              { id: 'arrow',  icon: 'arrow-forward-outline' },
              { id: 'line',   icon: 'remove-outline'        },
              { id: 'circle', icon: 'ellipse-outline'       },
              { id: 'text',   icon: 'text-outline'          },
              { id: 'eraser', icon: 'close-circle-outline'  },
            ] as { id: Tool; icon: string }[]).map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[s.toolBtn, activeTool === t.id && { backgroundColor: `${activeColorHex}25`, borderColor: activeColorHex }]}
                onPress={() => toggleTool(t.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon as any} size={20} color={activeTool === t.id ? activeColorHex : MUTED} />
              </TouchableOpacity>
            ))}

            <View style={s.divider} />

            {/* Color dots */}
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[s.colorDot, { backgroundColor: c.hex }, activeColor === c.id && s.colorDotActive]}
                onPress={() => setActiveColor(c.id)}
                activeOpacity={0.8}
              />
            ))}

            <View style={s.divider} />

            {/* Voiceover */}
            <TouchableOpacity
              style={[s.toolBtn, isRecordingVO && { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: RED }]}
              onPress={() => setIsRecordingVO(v => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={isRecordingVO ? 'mic' : 'mic-outline'} size={20} color={isRecordingVO ? RED : MUTED} />
            </TouchableOpacity>

            {/* Note */}
            <TouchableOpacity
              style={[s.toolBtn, showNote && { backgroundColor: 'rgba(0,196,180,0.15)', borderColor: TEAL }]}
              onPress={() => setShowNote(n => !n)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={showNote ? TEAL : MUTED} />
            </TouchableOpacity>

            {/* Clear all */}
            <TouchableOpacity style={s.toolBtn} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={20} color={MUTED} />
            </TouchableOpacity>

          </ScrollView>
        </View>

        {/* Note input */}
        {showNote && (
          <View style={s.noteRow}>
            <TextInput
              style={s.noteInput}
              placeholder="Add a coaching note..."
              placeholderTextColor={MUTED}
              value={note}
              onChangeText={setNote}
              multiline={false}
              returnKeyType="done"
              onSubmitEditing={() => setShowNote(false)}
            />
            <TouchableOpacity onPress={() => setShowNote(false)} style={s.noteSend}>
              <Ionicons name="checkmark" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  circleBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  athleteTag: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  athleteAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,196,180,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: TEAL },
  avatarInitials: { fontSize: 10, fontWeight: '800', color: TEAL },
  athleteName: { fontSize: 14, fontWeight: '700', color: TEXT },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: TEAL },
  uploadedBtn: { backgroundColor: TEAL, borderColor: TEAL },
  uploadText: { fontSize: 13, fontWeight: '700', color: TEAL },
  uploadedText: { color: '#000' },

  // Canvas
  canvas: { flex: 1, backgroundColor: '#080808', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  videoPlaceholder: { alignItems: 'center', gap: 8 },
  videoPlaceholderText: { fontSize: 14, color: 'rgba(255,255,255,0.2)', fontWeight: '600' },
  videoPlaceholderSub: { fontSize: 11, color: 'rgba(255,255,255,0.12)', textAlign: 'center', paddingHorizontal: 40 },

  toolActiveOverlay: { position: 'absolute', bottom: 20, alignItems: 'center', gap: 8 },
  toolCursor: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  toolHint: { fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },

  voiceIndicator: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: RED },
  voiceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },
  voiceText: { fontSize: 12, fontWeight: '700', color: RED },

  // Playback
  playbackSection: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  scrubberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeText: { fontSize: 11, fontWeight: '600', color: MUTED, width: 32, textAlign: 'center' },
  scrubberTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, position: 'relative' },
  scrubberFill: { height: 4, backgroundColor: TEAL, borderRadius: 2 },
  scrubberThumb: { position: 'absolute', top: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: TEXT, marginLeft: -8 },

  transportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  transportBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  speedBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: BORDER },
  speedText: { fontSize: 13, fontWeight: '800', color: TEXT },

  speedPicker: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  speedOption: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.05)' },
  speedOptionActive: { backgroundColor: TEAL, borderColor: TEAL },
  speedOptionText: { fontSize: 13, fontWeight: '700', color: MUTED },
  speedOptionTextActive: { color: '#000' },

  // Toolbar
  toolbar: { borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#0A0A0A' },
  toolbarInner: { paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexDirection: 'row', alignItems: 'center' },
  toolBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, height: 28, backgroundColor: BORDER, marginHorizontal: 4 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  colorDotActive: { borderWidth: 3, borderColor: TEXT },

  // Note
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4 },
  noteInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: TEXT, borderWidth: 1, borderColor: BORDER },
  noteSend: { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
});
